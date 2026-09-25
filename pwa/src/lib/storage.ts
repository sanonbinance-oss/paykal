import { supabase, BUCKET_PREUVES, DUREE_URL_SIGNEE } from './supabase'

/** Taille maximale acceptée pour une capture d'écran (5 Mo). */
export const TAILLE_MAX_PREUVE = 5 * 1024 * 1024

const TYPES_ACCEPTES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic']

export function validerFichierPreuve(fichier: File): string | null {
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return 'Format non pris en charge. Importez une image (PNG, JPG, WEBP).'
  }
  if (fichier.size > TAILLE_MAX_PREUVE) {
    return 'Image trop volumineuse : 5 Mo maximum.'
  }
  return null
}

/**
 * Téléverse la capture dans `preuves_paiement/<user_id>/…` et retourne le
 * chemin de l'objet, qui est stocké dans `paiements.capture_url`.
 *
 * Le bucket est privé : l'affichage passe par une URL signée à durée limitée.
 */
export async function televerserPreuve(userId: string, fichier: File): Promise<string> {
  const nomSure = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const chemin = `${userId}/${Date.now()}-${nomSure}`

  const { error } = await supabase.storage
    .from(BUCKET_PREUVES)
    .upload(chemin, fichier, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Téléversement impossible : ${error.message}`)
  return chemin
}

/** Génère une URL signée (1 h) permettant d'afficher une preuve privée. */
export async function urlSigneePreuve(chemin: string): Promise<string | null> {
  if (!chemin) return null
  const { data, error } = await supabase.storage
    .from(BUCKET_PREUVES)
    .createSignedUrl(chemin, DUREE_URL_SIGNEE)
  if (error || !data?.signedUrl) {
    console.error('[PayKal] URL signée impossible :', error?.message)
    return null
  }
  return data.signedUrl
}
