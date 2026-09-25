const formatFcfa = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Formate un montant en francs CFA : 50000 → "50 000 FCFA". */
export function formaterMontant(montant: number): string {
  return `${formatFcfa.format(montant)} FCFA`
}

/** Formate une date ISO en date lisible française. */
export function formaterDate(dateIso: string): string {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Message d'erreur lisible, quelle que soit la forme de l'erreur Supabase. */
export function messageErreur(erreur: unknown, fallback: string): string {
  if (erreur instanceof Error && erreur.message) return erreur.message
  if (typeof erreur === 'string' && erreur) return erreur
  if (
    erreur &&
    typeof erreur === 'object' &&
    'message' in erreur &&
    typeof (erreur as { message?: unknown }).message === 'string'
  ) {
    return (erreur as { message: string }).message
  }
  return fallback
}
