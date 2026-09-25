export type Role = 'parent' | 'ecole' | 'admin'

export type StatutPaiement = 'en_attente' | 'valide' | 'rejete'

export type MethodePaiement = 'Orange Money' | 'Moov Money'

/** Profil public, alimenté automatiquement à l'inscription par un trigger SQL. */
export interface Profile {
  id: string
  email: string | null
  nom: string | null
  role: Role
  /** Crédité uniquement par la fonction serveur `valider_paiement`. */
  solde: number
  created_at: string
}

export interface Paiement {
  id: string
  user_id: string
  montant: number
  /** Chemin de l'objet dans le bucket `preuves_paiement` (ex: "<user_id>/<fichier>"). */
  capture_url: string
  statut: StatutPaiement
  created_at: string
  validated_at: string | null
  /** Jointure optionnelle vers le profil du payeur (côté administration). */
  profiles?: { nom: string | null; email: string | null } | null
}

export interface Conversation {
  id: string
  titre: string | null
  updated_at: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  contenu: string
  created_at: string
  profiles?: { nom: string | null } | null
}

export const NUMERO_PAIEMENT = '07452674'

export const METHODES_PAIEMENT: MethodePaiement[] = ['Orange Money', 'Moov Money']

export const LIBELLE_STATUT: Record<StatutPaiement, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
}
