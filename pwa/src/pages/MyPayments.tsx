import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formaterDate, formaterMontant, messageErreur } from '../lib/format'
import { urlSigneePreuve } from '../lib/storage'
import { telechargerRecuPdf } from '../lib/receipt'
import Chargement from '../components/Chargement'
import { LIBELLE_STATUT, type Paiement } from '../types'

interface PaiementAvecCapture extends Paiement {
  image?: string | null
}

export default function MyPayments() {
  const { session, profil } = useAuth()
  const [paiements, setPaiements] = useState<PaiementAvecCapture[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!session) return
    setChargement(true)
    const { data, error } = await supabase
      .from('paiements')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    setChargement(false)
    if (error) {
      setErreur(messageErreur(error, 'Impossible de charger vos paiements.'))
      return
    }

    const liste = (data ?? []) as Paiement[]
    const avecImages = await Promise.all(
      liste.map(async (paiement) => ({
        ...paiement,
        image: await urlSigneePreuve(paiement.capture_url),
      })),
    )
    setPaiements(avecImages)
    setErreur(null)
  }, [session])

  useEffect(() => {
    void charger()
  }, [charger])

  if (chargement) return <Chargement texte="Chargement de vos paiements…" />

  return (
    <div className="page-mes-paiements">
      <div className="entete-page">
        <h2>Mes paiements</h2>
        <Link className="bouton-principal petit" to="/paiement">
          Déclarer un paiement
        </Link>
      </div>

      {erreur && (
        <p className="alerte erreur" role="alert">
          {erreur}
        </p>
      )}

      {paiements.length === 0 ? (
        <div className="carte vide-centre">
          <h3>Aucun paiement enregistré</h3>
          <p>Déclarez votre premier paiement pour recevoir un reçu officiel.</p>
          <Link className="bouton-principal" to="/paiement">
            Déclarer un paiement
          </Link>
        </div>
      ) : (
        <ul className="liste-paiements">
          {paiements.map((paiement) => (
            <li key={paiement.id} className="carte paiement">
              <div className="infos-paiement">
                <div className="ligne-montant">
                  <strong className="montant">{formaterMontant(paiement.montant)}</strong>
                  <span className={`badge statut-${paiement.statut}`}>
                    {LIBELLE_STATUT[paiement.statut]}
                  </span>
                </div>
                <p className="meta">
                  Déclaré le {formaterDate(paiement.created_at)}
                  {paiement.validated_at && ` · validé le ${formaterDate(paiement.validated_at)}`}
                </p>

                {paiement.statut === 'valide' ? (
                  <button
                    type="button"
                    className="bouton-principal"
                    onClick={() => void telechargerRecuPdf(paiement, profil?.nom ?? profil?.email ?? '')}
                  >
                    Télécharger mon reçu (PDF)
                  </button>
                ) : paiement.statut === 'en_attente' ? (
                  <p className="note">
                    Paiement en cours de vérification par un administrateur. Le reçu sera disponible
                    dès validation.
                  </p>
                ) : (
                  <p className="note">
                    Ce paiement a été rejeté. Contactez l'école ou effectuez un nouveau transfert.
                  </p>
                )}
              </div>

              {paiement.image ? (
                <a
                  className="vignette-capture"
                  href={paiement.image}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <img src={paiement.image} alt={`Preuve du paiement de ${paiement.montant} FCFA`} />
                </a>
              ) : (
                <div className="vignette-capture indisponible">Preuve indisponible</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
