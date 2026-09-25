import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    '[PayKal] Identifiants Supabase absents. Copiez ".env.example" en ".env" à la racine du dossier pwa/ puis relancez "npm run dev".',
  )
}

/**
 * Client Supabase unique de l'application.
 *
 * Seule la clé *publishable* est utilisée côté client : toutes les données sont
 * protégées par les politiques RLS de ../supabase/schema.sql. Aucune donnée
 * sensible ne doit transiter par ce client sans passer par une policy.
 *
 * NOTE — le client est volontairement non générique (`Database`) : les types
 * écrits à la main sont fragiles d'une version de supabase-js à l'autre.
 * Le typage fort des résultats est assuré par les interfaces de `src/types.ts`
 * (Paiement, Message, Profile, …) appliquées à la lecture des réponses.
 *
 * Pour régénérer un typage strict officiel :
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * puis `createClient<Database>(...)`.
 */
export const supabase = createClient(
  url ?? 'http://127.0.0.1:54321',
  anonKey ?? 'cle-manquante',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'paykal-auth',
    },
  },
)

export const BUCKET_PREUVES = 'preuves_paiement'

/** Durée de validité des URLs signées générées pour afficher une capture. */
export const DUREE_URL_SIGNEE = 60 * 60
