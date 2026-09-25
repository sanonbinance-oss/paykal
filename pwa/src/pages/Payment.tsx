import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { messageErreur } from '../lib/format'
import { televerserPreuve, validerFichierPreuve } from '../lib/storage'
import {
  METHODES_PAIEMENT,
  NUMERO_PAIEMENT,
  type MethodePaiement,
} from '../types'

/** Montant minimum accepté par les agrégateurs Mobile Money (CinetPay : 100 XOF). */
const MONTANT_MINIMUM = 100

export default function Payment() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [montant, setMontant] = useState('')
  const [methode, setMethode] = useState<MethodePaiement>('Orange Money')
  const [fichier, setFichier] = useState<File | null>(null)
  const [apercu, setApercu] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [copie, setCopie] = useState(false)
  const champFichier = useRef<HTMLInputElement | null>(null)

  function choisirFichier(evenement: ChangeEvent<HTMLInputElement>) {
    const choisi = evenement.target.files?.[0] ?? null
    setErreur(null)
    if (!choisi) {
      setFichier(null)
      setApercu(null)
      return
    }
    const probleme = validerFichierPreuve(choisi)
    if (probleme) {
      setFichier(null)
      setApercu(null)
      setErreur(probleme)
      return
    }
    setFichier(choisi)
    setApercu(URL.createObjectURL(choisi))
  }

  async function copierNumero() {
    try {
      await navigator.clipboard.writeText(NUMERO_PAIEMENT)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch {
      setErreur(`Copie impossible. Le numéro est ${NUMERO_PAIEMENT}.`)
    }
  }

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setErreur(null)
    setSucces(null)

    const valeur = Number(montant.replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(valeur) || valeur <= 0) {
      setErreur('Veuillez saisir un montant valide.')
      return
    }
    if (valeur < MONTANT_MINIMUM) {
      setErreur(`Le montant minimum est de ${MONTANT_MINIMUM} FCFA.`)
      return
    }
    if (!fichier) {
      setErreur("Merci d'importer la capture d'écran de votre SMS de confirmation.")
      return
    }
    if (!session) {
      setErreur('Session expirée. Veuillez vous reconnecter.')
      return
    }

    setEnCours(true)
    try {
      // 1. Téléversement de la preuve dans le bucket privé
      const chemin = await televerserPreuve(session.user.id, fichier)

      // 2. Enregistrement de la demande en attente de validation
      const { error: erreurInsert } = await supabase.from('paiements').insert({
        user_id: session.user.id,
        montant: valeur,
        capture_url: chemin,
        statut: 'en_attente',
      })
      if (erreurInsert) throw new Error(erreurInsert.message)

      setSucces(
        'Votre preuve de paiement a été envoyée. Un administrateur va la vérifier : vous recevrez ' +
          'votre reçu dès validation.',
      )
      setMontant('')
      setFichier(null)
      setApercu(null)
      if (champFichier.current) champFichier.current.value = ''
      window.setTimeout(() => navigate('/mes-paiements'), 2500)
    } catch (exception) {
      setErreur(messageErreur(exception, "L'envoi de la preuve a échoué."))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="page-paiement">
      <section className="carte instructions">
        <h2>Comment payer la scolarité</h2>
        <p className="intro">
          Payez par Mobile Money, puis importez la capture d'écran de votre SMS de confirmation. Un
          administrateur vérifie et valide le transfert : votre reçu est ensuite disponible.
        </p>

        <ol className="etapes">
          <li>
            <span className="numero-etape">1</span>
            <div>
              <strong>Effectuez le transfert</strong>
              <p>
                Envoyez le montant de la scolarité par <b>Orange Money</b> ou <b>Moov Money</b> au
                numéro officiel ci-dessous.
              </p>
            </div>
          </li>
          <li>
            <span className="numero-etape">2</span>
            <div>
              <strong>Conservez le SMS de confirmation</strong>
              <p>Vous recevrez un SMS confirmant la transaction. Faites une capture d'écran.</p>
            </div>
          </li>
          <li>
            <span className="numero-etape">3</span>
            <div>
              <strong>Importez la capture d'écran</strong>
              <p>
                Renseignez le montant transféré et importez la capture dans le formulaire ci-contre.
              </p>
            </div>
          </li>
        </ol>

        <div className="bloc-numero">
          <small>Numéro officiel de réception des transferts</small>
          <div className="ligne-numero">
            <strong>{NUMERO_PAIEMENT}</strong>
            <button type="button" className="bouton-fantome" onClick={() => void copierNumero()}>
              {copie ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
          <small>Orange Money et Moov Money uniquement</small>
        </div>
      </section>

      <section className="carte formulaire-paiement">
        <h2>Déclarer un paiement</h2>
        <form onSubmit={soumettre} noValidate>
          <label htmlFor="montant">Montant transféré (FCFA)</label>
          <input
            id="montant"
            type="text"
            inputMode="numeric"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="ex. 75 000"
          />

          <label htmlFor="methode">Moyen de paiement utilisé</label>
          <select
            id="methode"
            value={methode}
            onChange={(e) => setMethode(e.target.value as MethodePaiement)}
          >
            {METHODES_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <label htmlFor="capture">Capture d'écran du SMS de confirmation</label>
          <input
            id="capture"
            ref={champFichier}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={choisirFichier}
          />
          {apercu && (
            <figure className="apercu-capture">
              <img src={apercu} alt="Aperçu de la capture d'écran importée" />
              <figcaption>Aperçu de la preuve importée</figcaption>
            </figure>
          )}

          {erreur && (
            <p className="alerte erreur" role="alert">
              {erreur}
            </p>
          )}
          {succes && (
            <p className="alerte succes" role="status">
              {succes}
            </p>
          )}

          <button type="submit" className="bouton-principal" disabled={enCours}>
            {enCours ? 'Envoi en cours…' : 'Envoyer ma preuve de paiement'}
          </button>
        </form>
      </section>
    </div>
  )
}
