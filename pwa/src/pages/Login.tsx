import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setErreur(null)
    setEnCours(true)
    const message = await connexion(email.trim(), motDePasse)
    setEnCours(false)
    if (message) {
      setErreur(message)
      return
    }
    navigate('/discussions', { replace: true })
  }

  return (
    <div className="page-auth">
      <form className="carte formulaire-auth" onSubmit={soumettre} noValidate>
        <h1 className="titre-auth">PayKal</h1>
        <p className="sous-titre">Payez la scolarité sans vous déplacer</p>

        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@email.com"
        />

        <label htmlFor="mot-de-passe">Mot de passe</label>
        <input
          id="mot-de-passe"
          type="password"
          autoComplete="current-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="••••••••"
        />

        {erreur && (
          <p className="alerte erreur" role="alert">
            {erreur}
          </p>
        )}

        <button type="submit" className="bouton-principal" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="pied-formulaire">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>
    </div>
  )
}
