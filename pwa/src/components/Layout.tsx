import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { compterEnAttente } from '../lib/offlineQueue'

export default function Layout() {
  const { profil, estAdmin, deconnexion } = useAuth()
  const navigate = useNavigate()
  const [enLigne, setEnLigne] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [enAttente, setEnAttente] = useState(0)

  useEffect(() => {
    const majEnLigne = () => setEnLigne(navigator.onLine)
    const majFile = () => setEnAttente(compterEnAttente())
    window.addEventListener('online', majEnLigne)
    window.addEventListener('offline', majEnLigne)
    window.addEventListener('paykal:outbox', majFile)
    majFile()
    return () => {
      window.removeEventListener('online', majEnLigne)
      window.removeEventListener('offline', majEnLigne)
      window.removeEventListener('paykal:outbox', majFile)
    }
  }, [])

  async function seDeconnecter() {
    await deconnexion()
    navigate('/connexion', { replace: true })
  }

  return (
    <div className="coquille">
      <header className="entete">
        <div className="marque">
          <span className="logo">P</span>
          <div>
            <strong>PayKal</strong>
            <small>Messagerie &amp; paiement</small>
          </div>
        </div>

        <nav className="navigation" aria-label="Navigation principale">
          <NavLink to="/discussions">Discussions</NavLink>
          <NavLink to="/paiement">Paiement</NavLink>
          <NavLink to="/mes-paiements">Mes paiements</NavLink>
          {estAdmin && <NavLink to="/admin">Administration</NavLink>}
        </nav>

        <div className="zone-utilisateur">
          <span className="nom-utilisateur" title={profil?.email ?? ''}>
            {profil?.nom ?? profil?.email ?? 'Mon compte'}
            {estAdmin && <em className="badge-admin">admin</em>}
          </span>
          <button type="button" className="bouton-fantome" onClick={() => void seDeconnecter()}>
            Déconnexion
          </button>
        </div>
      </header>

      {!enLigne && (
        <div className="bandeau hors-ligne" role="status">
          Vous êtes hors-ligne. Vos messages seront envoyés automatiquement dès le retour du réseau.
        </div>
      )}

      {enAttente > 0 && (
        <div className="bandeau file-attente" role="status">
          {enAttente} message{enAttente > 1 ? 's' : ''} en attente d'envoi.
        </div>
      )}

      <main className="contenu">
        <Outlet />
      </main>
    </div>
  )
}
