/**
 * File d'attente locale des messages écrits hors-ligne.
 *
 * L'application reste utilisable sans réseau : les messages sont conservés dans
 * le stockage local puis envoyés automatiquement dès que la connexion revient.
 */

const CLE_STOCKAGE = 'paykal.outbox.v1'

export interface MessageEnAttente {
  id: string
  conversation_id: string
  contenu: string
  created_at: string
}

function stockage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function lireFileAttente(): MessageEnAttente[] {
  const brut = stockage()?.getItem(CLE_STOCKAGE)
  if (!brut) return []
  try {
    const donnees: unknown = JSON.parse(brut)
    return Array.isArray(donnees) ? (donnees as MessageEnAttente[]) : []
  } catch {
    return []
  }
}

function ecrireFileAttente(messages: MessageEnAttente[]): void {
  stockage()?.setItem(CLE_STOCKAGE, JSON.stringify(messages))
}

export function ajouterEnAttente(message: MessageEnAttente): void {
  ecrireFileAttente([...lireFileAttente(), message])
}

export function retirerDeLaFileAttente(id: string): void {
  ecrireFileAttente(lireFileAttente().filter((m) => m.id !== id))
}

export function compterEnAttente(): number {
  return lireFileAttente().length
}
