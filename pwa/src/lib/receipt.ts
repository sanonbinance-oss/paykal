import { formaterDate, formaterMontant } from './format'
import { NUMERO_PAIEMENT } from '../types'
import type { Paiement } from '../types'

/**
 * Génère et télécharge le reçu PDF d'un paiement validé.
 * Le reçu est produit côté client : aucune donnée ne transite par un serveur tiers.
 *
 * `jspdf` est importé dynamiquement : cette bibliothèque pèse plusieurs centaines
 * de kilo-octets et n'est nécessaire qu'au moment du clic.
 */
export async function telechargerRecuPdf(paiement: Paiement, nomPayeur: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const bleu: [number, number, number] = [13, 71, 161]
  const gris: [number, number, number] = [110, 110, 110]

  // En-tête
  doc.setFillColor(...bleu)
  doc.rect(0, 0, 210, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('PayKal', 20, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Reçu de paiement', 20, 28)

  doc.setTextColor(...bleu)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Reçu de paiement de scolarité', 20, 52)

  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const lignes: Array<[string, string]> = [
    ['Référence', paiement.id],
    ['Payeur', nomPayeur || '—'],
    ['Montant payé', formaterMontant(paiement.montant)],
    ['Moyen de transfert', `Mobile Money — ${NUMERO_PAIEMENT}`],
    ['Date du paiement', formaterDate(paiement.created_at)],
    ['Date de validation', paiement.validated_at ? formaterDate(paiement.validated_at) : '—'],
    ['Statut', 'Validé'],
  ]

  let y = 70
  for (const [libelle, valeur] of lignes) {
    doc.setTextColor(...gris)
    doc.text(libelle, 20, y)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text(valeur, 70, y)
    doc.setFont('helvetica', 'normal')
    y += 10
  }

  doc.setDrawColor(220, 220, 220)
  doc.line(20, y + 4, 190, y + 4)
  doc.setTextColor(...gris)
  doc.setFontSize(9)
  doc.text(
    "Ce reçu est généré automatiquement par PayKal après validation manuelle du transfert.",
    20,
    y + 14,
  )
  doc.text(`Numéro de réception des transferts : ${NUMERO_PAIEMENT}`, 20, y + 20)

  doc.save(`recu-paykal-${paiement.id.slice(0, 8)}.pdf`)
}
