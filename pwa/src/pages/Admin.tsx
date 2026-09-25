import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formaterDate, formaterMontant, messageErreur } from '../lib/format'
import { urlSigneePreuve } from '../lib/storage'
import Chargement from '../components/Chargement'
import { LIBELLE_STATUT, type Paiement, type StatutPaiement } from '../types'

interface PaiementAdmin extends Paiement {
  image?: string | null
  payeur?: { nom: string | null; email: string | null } | null
}

const ONGLETS: Array<{ id: StatutPaiement; libelle: string }> = [
  { id: 'en_attente', libelle: 'En attente' },
  { id: 'valide', libelle: 'Validés' },
  { id: 'rejete', libelle: 'Rejetés' },
]

export default function Admin() {
  const { rafraichirProfil } = useAuth()
  const [statutActif, setStatutActif] = useState<StatutPaiement>('en_attente')
  const [paiements, setPaiements] = useState<PaiementAdmin[]>([])
  const [compteurs, setCompteurs] = useState<Record<StatutPaiement, number>>({
    en_attente: 0,
    valide: 0,
    rejete: 0,
  })
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)

    const { data: tous, error: erreurTous } = await supabase
      .from('paiements')
      .select('*')
      .order('created_at', { ascending: false })

    if (erreurTous) {
      setErreur(messageErreur(erreurTous, 'Impossible de charger les paiements.'))
      setChargement(false)
      return
    }

    const liste = (tous ?? []) as Paiement[]

    // Noms des payeurs (la policy RLS autorise l'admin à lire tous les profils)
    const idsPayeurs = [...new Set(liste.map((p) => p.user_id))]
    const { data: profils } = await supabase.from('profiles').select('id, nom, email').in('id', idsPayeurs)

    const nouveauxCompteurs: Record<StatutPaiement, number> = {
      en_attente: 0,
      valide: 0,
      rejete: 0,
    }
    for (const paiement of liste) nouveauxCompteurs[paiement.statut] += 1

    const filtres = liste.filter((p) => p.statut === statutActif)
    const enrichis: PaiementAdmin[] = await Promise.all(
      filtres.map(async (paiement) => {
        const profil = (profils ?? []).find((p) => p.id === paiement.user_id)
        return {
          ...paiement,
          image: await urlSigneePreuve(paiement.capture_url),
          payeur: profil ? { nom: profil.nom, email: profil.email } : null,
        }
      }),
    )

    setPaiements(enrichis)
    setCompteurs(nouveauxCompteurs)
    setChargement(false)
  }, [statutActif])

  useEffect(() => {
    void charger()
  }, [charger])

  const totalEnAttente = useMemo(() => compteurs.en_attente, [compteurs])

  async function valider(id: string) {
    setActionEnCours(id)
    setErreur(null)
    setMessage(null)
    const { error } = await supabase.rpc('valider_paiement', { p_id: id })
    setActionEnCours(null)
    if (error) {
      setErreur(messageErreur(error, 'La validation a échoué.'))
      return
    }
    setMessage('Paiement validé : le solde du parent a été crédité.')
    await rafraichirProfil()
    await charger()
  }

  async function rejeter(id: string) {
    setActionEnCours(id)
    setErreur(null)
    setMessage(null)
    const { error } = await supabase.rpc('rejeter_paiement', { p_id: id })
    setActionEnCours(null)
    if (error) {
      setErreur(messageErreur(error, 'Le rejet a échoué.'))
      return
    }
    setMessage('Paiement rejeté.')
    await charger()
  }

  return (
    <div className="page-admin">
      <div className="entete-page">
        <h2>Administration des paiements</h2>
        {totalEnAttente > 0 && <span className="badge alerte-nb">{totalEnAttente} à vérifier</span>}
      </div>

      <div className="onglets" role="tablist">
        {ONGLETS.map((onglet) => (
          <button
            key={onglet.id}
            type="button"
            role="tab"
            aria-selected={statutActif === onglet.id}
            className={statutActif === onglet.id ? 'actif' : ''}
            onClick={() => setStatutActif(onglet.id)}
          >
            {onglet.libelle} ({compteurs[onglet.id]})
          </button>
        ))}
      </div>

      {erreur && (
        <p className="alerte erreur" role="alert">
          {erreur}
        </p>
      )}
      {message && (
        <p className="alerte succes" role="status">
          {message}
        </p>
      )}

      {chargement ? (
        <Chargement texte="Chargement des paiements…" />
      ) : paiements.length === 0 ? (
        <div className="carte vide-centre">
          <h3>Aucun paiement « {LIBELLE_STATUT[statutActif]} »</h3>
          <p>Les nouvelles demandes des parents apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <ul className="liste-admin">
          {paiements.map((paiement) => (
            <li key={paiement.id} className="carte ligne-admin">
              <div className="capture-admin">
                {paiement.image ? (
                  <a href={paiement.image} target="_blank" rel="noreferrer noopener">
                    <img src={paiement.image} alt={`Preuve de ${paiement.montant} FCFA`} />
                    <span>Agrandir</span>
                  </a>
                ) : (
                  <div className="vignette-capture indisponible">Preuve indisponible</div>
                )}
              </div>

              <div className="details-admin">
                <div className="ligne-montant">
                  <strong className="montant">{formaterMontant(paiement.montant)}</strong>
                  <span className={`badge statut-${paiement.statut}`}>
                    {LIBELLE_STATUT[paiement.statut]}
                  </span>
                </div>
                <p className="meta">
                  <b>{paiement.payeur?.nom ?? 'Parent'}</b>
                  {paiement.payeur?.email && ` · ${paiement.payeur.email}`}
                </p>
                <p className="meta">Déclaré le {formaterDate(paiement.created_at)}</p>
                {paiement.validated_at && (
                  <p className="meta">Traité le {formaterDate(paiement.validated_at)}</p>
                )}
                <p className="reference">Réf. {paiement.id.slice(0, 8)}</p>
              </div>

              {paiement.statut === 'en_attente' && (
                <div className="actions-admin">
                  <button
                    type="button"
                    className="bouton-valider"
                    disabled={actionEnCours === paiement.id}
                    onClick={() => void valider(paiement.id)}
                  >
                    {actionEnCours === paiement.id ? '…' : 'Valider'}
                  </button>
                  <button
                    type="button"
                    className="bouton-rejeter"
                    disabled={actionEnCours === paiement.id}
                    onClick={() => void rejeter(paiement.id)}
                  >
                    Rejeter
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
