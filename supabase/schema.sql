-- =============================================================================
--  PayKal — Schéma Supabase (messagerie + paiement manuel par capture d'écran)
-- =============================================================================
--
--  À exécuter dans le SQL Editor de votre projet Supabase
--  (https://supabase.com/dashboard → SQL Editor → New query).
--
--  PRINCIPE DE SÉCURITÉ
--  ---------------------
--  La clé "publishable" est exposée dans le client : elle ne protège RIEN.
--  Toute la sécurité repose sur ce fichier :
--
--    • un parent peut CRÉER une demande de paiement `en_attente` et LIRE
--      uniquement les siennes ;
--    • PERSONNE — pas même un parent connecté — ne peut modifier `statut`
--      ni `solde` en écriture directe : il n'existe aucune policy UPDATE ;
--    • seules les fonctions `valider_paiement` / `rejeter_paiement`,
--      marquées SECURITY DEFINER et protégées par `is_admin()`, peuvent
--      changer un statut et créditer un solde ;
--    • un utilisateur ne peut pas s'attribuer le rôle `admin`
--      (trigger `protect_profile_fields`).
--
--  Ce script est idempotent : il peut être rejoué sans casser la base.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. PROFILS
-- -----------------------------------------------------------------------------
-- Créé automatiquement à l'inscription par le trigger `on_auth_user_created`.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  nom        text,
  role       text not null default 'parent' check (role in ('parent', 'ecole', 'admin')),
  solde      numeric not null default 0 check (solde >= 0),
  created_at timestamptz not null default now()
);

comment on column public.profiles.solde is
  'Crédité uniquement par la fonction valider_paiement(). Jamais modifiable par le client.';

-- -----------------------------------------------------------------------------
-- 2. PAIEMENTS (paiement manuel par capture d'écran)
-- -----------------------------------------------------------------------------

create table if not exists public.paiements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  montant      numeric not null check (montant > 0),
  -- Chemin de l'objet dans le bucket "preuves_paiement" (ex: "<user_id>/<fichier>").
  -- Le bucket est privé : l'affichage passe par une URL signée à durée limitée.
  capture_url  text not null,
  statut       text not null default 'en_attente'
               check (statut in ('en_attente', 'valide', 'rejete')),
  created_at   timestamptz not null default now(),
  validated_at timestamptz
);

create index if not exists paiements_user_id_idx on public.paiements (user_id);
create index if not exists paiements_statut_idx on public.paiements (statut);

-- -----------------------------------------------------------------------------
-- 3. MESSAGERIE
-- -----------------------------------------------------------------------------

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  titre      text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  contenu         text not null check (char_length(contenu) between 1 and 2000),
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- 4. FONCTIONS
-- -----------------------------------------------------------------------------

-- Vrai si l'utilisateur connecté est administrateur.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Création du profil à chaque inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nom)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nom', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Empêche un utilisateur de s'attribuer le rôle admin ou de gonfler son solde.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.solde is distinct from old.solde)
     and not public.is_admin() then
    raise exception 'Modification du rôle ou du solde interdite';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Met à jour la date de la conversation à chaque nouveau message.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation on public.messages;
create trigger touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Ouvre (ou récupère) la conversation privée entre l'appelant et un autre profil.
create or replace function public.get_or_create_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation uuid;
begin
  if auth.uid() is null or auth.uid() = other_user then
    raise exception 'Utilisateur invalide';
  end if;

  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'Destinataire introuvable';
  end if;

  -- Conversation existante à exactement deux participants, incluant les deux.
  select c.id
    into v_conversation
    from public.conversations c
    join public.conversation_participants p1
      on p1.conversation_id = c.id and p1.user_id = auth.uid()
    join public.conversation_participants p2
      on p2.conversation_id = c.id and p2.user_id = other_user
   where (select count(*) from public.conversation_participants cp
           where cp.conversation_id = c.id) = 2
   limit 1;

  if v_conversation is null then
    insert into public.conversations (titre) values (null) returning id into v_conversation;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation, auth.uid()), (v_conversation, other_user);
  end if;

  return v_conversation;
end;
$$;

-- VALIDATION : réservée aux administrateurs. Crédite le solde du parent.
create or replace function public.valider_paiement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid;
  v_montant numeric;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  select user_id, montant
    into v_user, v_montant
    from public.paiements
   where id = p_id
   for update;

  if v_user is null then
    raise exception 'Paiement introuvable';
  end if;

  update public.paiements
     set statut = 'valide', validated_at = now()
   where id = p_id;

  update public.profiles
     set solde = solde + v_montant
   where id = v_user;
end;
$$;

-- REJET : réservé aux administrateurs. Ne crédite rien.
create or replace function public.rejeter_paiement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis';
  end if;

  update public.paiements
     set statut = 'rejete', validated_at = now()
   where id = p_id
     and statut = 'en_attente';

  if not found then
    raise exception 'Paiement introuvable ou déjà traité';
  end if;
end;
$$;

-- Les fonctions sensibles ne sont pas appelables par les visiteurs anonymes.
revoke execute on function public.valider_paiement(uuid) from public;
revoke execute on function public.rejeter_paiement(uuid) from public;
revoke execute on function public.get_or_create_conversation(uuid) from public;
grant execute on function public.valider_paiement(uuid) to authenticated;
grant execute on function public.rejeter_paiement(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. SÉCURITÉ AU NIVEAU DES LIGNES (RLS)
-- -----------------------------------------------------------------------------

alter table public.profiles                 enable row level security;
alter table public.paiements                enable row level security;
alter table public.conversations            enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                 enable row level security;

-- ---- profiles ---------------------------------------------------------------

drop policy if exists "profils: lecture du sien ou admin" on public.profiles;
create policy "profils: lecture du sien ou admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Un utilisateur modifie son propre profil ; le trigger bloque rôle et solde.
drop policy if exists "profils: mise à jour du sien" on public.profiles;
create policy "profils: mise à jour du sien"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- paiements --------------------------------------------------------------
-- Aucune policy UPDATE ni DELETE : le statut ne peut être changé QUE par les
-- fonctions valider_paiement / rejeter_paiement.

drop policy if exists "paiements: créer une demande en attente" on public.paiements;
create policy "paiements: créer une demande en attente"
  on public.paiements for insert
  to authenticated
  with check (user_id = auth.uid() and statut = 'en_attente');

drop policy if exists "paiements: voir les siens ou tous si admin" on public.paiements;
create policy "paiements: voir les siens ou tous si admin"
  on public.paiements for select
  using (user_id = auth.uid() or public.is_admin());

-- ---- conversations ----------------------------------------------------------

drop policy if exists "conversations: mes conversations" on public.conversations;
create policy "conversations: mes conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
       where cp.conversation_id = conversations.id
         and cp.user_id = auth.uid()
    )
  );

-- Aucune policy INSERT : la création passe uniquement par la fonction
-- get_or_create_conversation, qui vérifie les deux participants.

-- ---- conversation_participants ---------------------------------------------

drop policy if exists "participants: voir ceux de mes conversations" on public.conversation_participants;
create policy "participants: voir ceux de mes conversations"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
       where cp.conversation_id = conversation_participants.conversation_id
         and cp.user_id = auth.uid()
    )
  );

-- Aucune policy INSERT/DELETE : géré par get_or_create_conversation.

-- ---- messages ---------------------------------------------------------------

drop policy if exists "messages: lire ceux de mes conversations" on public.messages;
create policy "messages: lire ceux de mes conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
       where cp.conversation_id = messages.conversation_id
         and cp.user_id = auth.uid()
    )
  );

drop policy if exists "messages: écrire dans mes conversations" on public.messages;
create policy "messages: écrire dans mes conversations"
  on public.messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
       where cp.conversation_id = messages.conversation_id
         and cp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 6. STOCKAGE DES PREUVES (bucket privé)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'preuves_paiement',
  'preuves_paiement',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "preuves: dépôt dans son propre dossier" on storage.objects;
create policy "preuves: dépôt dans son propre dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'preuves_paiement'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "preuves: lecture de ses preuves (ou admin)" on storage.objects;
create policy "preuves: lecture de ses preuves (ou admin)"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'preuves_paiement'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "preuves: suppression de ses preuves" on storage.objects;
create policy "preuves: suppression de ses preuves"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'preuves_paiement'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 7. TEMPS RÉEL
-- -----------------------------------------------------------------------------
-- Si la table est déjà dans la publication, cette commande renvoie une erreur
-- bénigne ("already member of publication") : vous pouvez l'ignorer.

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when invalid_parameter_value then null;
end $$;

-- =============================================================================
-- 8. CRÉER VOTRE PREMIER ADMINISTRATEUR
-- =============================================================================
-- 1. Inscrivez-vous normalement dans l'application.
-- 2. Puis exécutez (remplacez par votre e-mail) :
--
--    update public.profiles
--       set role = 'admin'
--     where email = 'votre.email@exemple.com';
--
-- =============================================================================
