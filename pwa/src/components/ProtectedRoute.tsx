import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Chargement from './Chargement'

/** Exige une session ouverte. Redirige vers /connexion en conservant la destination. */
export default function ProtectedRoute() {
  const { session, chargement } = useAuth()
  const emplacement = useLocation()

  if (chargement) return <Chargement texte="Vérification de votre session…" />

  if (!session) {
    return <Navigate to="/connexion" replace state={{ depuis: emplacement.pathname }} />
  }

  return <Outlet />
}

/** Exige le rôle administrateur. La porte dérobée est fermée côté serveur (RLS). */
export function AdminRoute() {
  const { session, chargement, estAdmin } = useAuth()

  if (chargement) return <Chargement texte="Vérification de vos droits…" />

  if (!session) return <Navigate to="/connexion" replace />

  if (!estAdmin) {
    return (
      <div className="carte acces-refuse">
        <h2>Accès refusé</h2>
        <p>
          Cette page est réservée aux administrateurs. Votre compte ne dispose pas des droits
          nécessaires.
        </p>
      </div>
    )
  }

  return <Outlet />
}
