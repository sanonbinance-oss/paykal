import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { inscription } = useAuth()
  const navigate = useNavigate()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [information, setInformation] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setErreur(null)
    setInformation(null)

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setEnCours(true)
    const message = await inscription(nom.trim(), email.trim(), motDePasse)
    setEnCours(false)

    if (message && message.startsWith('Compte créé')) {
      setInformation(message)
      return
    }
    if (message) {
      setErreur(message)
      return
    }
    navigate('/discussions', { replace: true })
  }

  return (
    <div className="page-auth">
      <form className="carte formulaire-auth" onSubmit={soumettre} noValidate>
        <h1 className="titre-auth">Créer un compte</h1>
        <p className="sous-titre">Rejoignez PayKal en quelques secondes</p>

        <label htmlFor="nom">Nom complet</label>
        <input
          id="nom"
          type="text"
          autoComplete="name"
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Votre nom"
        />

        <label htmlFor="email-inscription">Adresse e-mail</label>
        <input
          id="email-inscription"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@email.com"
        />

        <label htmlFor="mot-de-passe-inscription">Mot de passe</label>
        <input
          id="mot-de-passe-inscription"
          type="password"
          autoComplete="new-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="6 caractères minimum"
        />

        <label htmlFor="confirmation">Confirmer le mot de passe</label>
        <input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Répétez le mot de passe"
        />

        {erreur && (
          <p className="alerte erreur" role="alert">
            {erreur}
          </p>
        )}
        {information && (
          <p className="alerte info" role="status">
            {information}
          </p>
        )}

        <button type="submit" className="bouton-principal" disabled={enCours}>
          {enCours ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="pied-formulaire">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </div>
  )
}
