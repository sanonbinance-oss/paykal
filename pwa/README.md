# PayKal — Messagerie PWA & paiement manuel

Application web installable (PWA) permettant à un parent de **messagerie avec l'école** et de
**payer la scolarité sans se déplacer**, via un transfert Mobile Money suivi d'une validation
manuelle par capture d'écran.

- **Stack** : React 18 + Vite 5 + TypeScript + React Router
- **Backend** : Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Paiement** : manuel — le parent transfère au **074452674**, importe la capture du SMS,
  un administrateur valide, le parent télécharge son reçu PDF.

---

## 1. Prérequis

- Node.js 18+ (testé avec Node 22)
- Un projet Supabase (le projet utilisé ici est `sxtlttaswhodbtcjjdyn.supabase.co`)

## 2. Installation

```bash
cd pwa
npm install
cp .env.example .env      # le .env n'est JAMAIS commité
npm run dev               # http://localhost:5173
```

`.env` doit contenir :

```
VITE_SUPABASE_URL=https://sxtlttaswhodbtcjjdyn.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_52fS1oqVHBvScTshCyU2lQ_dWruxGkn
```

> Les variables doivent obligatoirement commencer par `VITE_` pour être exposées par Vite.
> La clé *publishable* est conçue pour être publique : **la sécurité repose entièrement sur les
> règles RLS**, pas sur la clé.

## 3. Appliquer le schéma Supabase (obligatoire)

1. Ouvrez le [SQL Editor](https://supabase.com/dashboard) de votre projet.
2. Collez **tout** le contenu de [`../supabase/schema.sql`](../supabase/schema.sql).
3. Exécutez-le.

Ce script crée :

| Objet | Rôle |
|---|---|
| `profiles` | utilisateurs (rôle `parent` / `ecole` / `admin`, solde) |
| `paiements` | demandes de paiement avec capture et statut |
| `conversations`, `conversation_participants`, `messages` | messagerie |
| bucket `preuves_paiement` | stockage **privé** des captures (5 Mo max) |
| `valider_paiement()`, `rejeter_paiement()` | fonctions **serveur** réservées aux admins |
| `get_or_create_conversation()` | ouverture d'une discussion privée |

## 4. Créer votre premier administrateur

1. Inscrivez-vous normalement dans l'application (`/inscription`).
2. Puis, dans le SQL Editor :

```sql
update public.profiles
   set role = 'admin'
 where email = 'votre.email@exemple.com';
```

3. Rechargez l'application : l'entrée **Administration** apparaît dans le menu.

## 5. Parcours complet

### Côté parent
1. **Discussions** — échange en temps réel avec l'école (les messages envoyés hors-ligne sont mis en
   file d'attente puis envoyés automatiquement au retour du réseau).
2. **Paiement** — les instructions s'affichent avec le numéro officiel **074452674**
   (bouton « Copier »). Le parent saisit le montant, choisit Orange Money ou Moov Money et importe
   la capture d'écran de son SMS.
3. **Mes paiements** — suivi des statuts. Dès qu'un paiement est **validé**, le bouton
   **« Télécharger mon reçu (PDF) »** apparaît.

### Côté administrateur (`/admin`)
- Onglets *En attente / Validés / Rejetés* avec compteurs.
- Chaque demande affiche la **capture**, le **montant**, le **nom du parent**, la **date**.
- **Valider** → statut `valide` + **crédit automatique du solde** du parent.
- **Rejeter** → statut `rejete`, aucun crédit.

---

## 6. Architecture de sécurité

La clé exposée dans le navigateur ne protège rien. Tout repose sur le schéma SQL :

| Risque | Protection |
|---|---|
| Un parent s'écrit `statut = 'valide'` | **Aucune policy UPDATE** sur `paiements` — impossible en écriture directe |
| Un parent se crédite un solde | `solde` modifiable uniquement par `valider_paiement()` (`SECURITY DEFINER`) |
| Un parent devient admin | Trigger `protect_profile_fields` bloque tout changement de `role` |
| Un non-admin valide un paiement | `valider_paiement()` / `rejeter_paiement()` lèvent une exception si `is_admin()` est faux |
| Un parent voit les preuves des autres | Bucket privé + policy limitée au dossier `<user_id>/…` |
| Un parent lit les paiements des autres | Policy `select` restreinte à `user_id = auth.uid()` |
| Un visiteur anonyme valide un paiement | `REVOKE EXECUTE … FROM public`, `GRANT … TO authenticated` |
| Un parent lit les messages d'autrui | Policies limitées aux conversations dont il est participant |

## 7. Mode hors-ligne (PWA)

- La coquille applicative (HTML/JS/CSS/icônes) est précachée par le service worker :
  l'application **s'ouvre sans connexion**.
- Les réponses Supabase déjà consultées sont mises en cache (`NetworkFirst`, 24 h) pour
  permettre la consultation hors-ligne.
- Les messages écrits sans réseau sont stockés localement (`localStorage`) et envoyés
  automatiquement au retour de la connexion — un bandeau en informe l'utilisateur.

> **Limite honnête** : Supabase est un service cloud. Une communication *strictement* locale
> (sans aucun internet, en pair-à-pair sur le réseau local) nécessiterait une autre technologie
> (WebRTC, MQTT local ou base embarquée). Ce qui est livré ici : application installable,
> consultation hors-ligne, et envoi différé automatique.

## 8. Build & déploiement

```bash
cd pwa
npm run build      # génère dist/
npm run preview    # teste le build localement
```

Déploiement sur un hébergeur statique (Netlify, Vercel, Cloudflare Pages) :

- **Répertoire publié** : `pwa/dist`
- **Commande de build** : `npm ci && npm run build` (dans `pwa`)
- **Réécritures** : toutes les routes vers `/index.html` (routage SPA), sinon `/admin`
  renverra une 404 au rechargement.

  Exemple `pwa/public/_redirects` (Netlify) :
  ```
  /*  /index.html  200
  ```

- Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables
  d'environnement de l'hébergeur.

## 9. Structure

```
pwa/
├── index.html
├── vite.config.ts          # configuration Vite + PWA (manifest, service worker, cache)
├── .env.example            # modèle de configuration (à copier en .env)
└── src/
    ├── main.tsx            # point d'entrée
    ├── App.tsx             # routes
    ├── types.ts            # modèles (Profile, Paiement, Message…)
    ├── lib/
    │   ├── supabase.ts     # client Supabase
    │   ├── storage.ts      # upload des captures + URLs signées
    │   ├── receipt.ts      # génération du reçu PDF
    │   ├── offlineQueue.ts # file d'attente des messages hors-ligne
    │   ├── format.ts       # formatage FCFA / dates
    │   └── id.ts           # identifiants (repli hors contexte sécurisé)
    ├── context/AuthContext.tsx
    ├── components/         # Layout, protection des routes, chargement
    └── pages/              # Login, Register, Chat, Payment, MyPayments, Admin
```

## 10. Dépannage

| Symptôme | Cause probable |
|---|---|
| « Identifiants Supabase absents » dans la console | `.env` manquant → `cp .env.example .env` puis relancer `npm run dev` |
| Page blanche au rechargement de `/admin` | Réécriture SPA absente sur l'hébergeur |
| « new row violates row-level security policy » | Le schéma SQL n'a pas été exécuté, ou la policy bloque l'opération |
| Capture d'image invisible | URL signée expirée (1 h) — rechargez la page |
| Impossible de valider un paiement | Votre compte n'a pas le rôle `admin` (voir §4) |
