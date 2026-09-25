import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, BUCKET_PREUVES } from '../lib/supabase'
import { messageErreur } from '../lib/format'

interface Resultat {
  nom: string
  ok: boolean
  detail: string
}

const TABLES = [
  'profiles',
  'paiements',
  'conversations',
  'conversation_participants',
  'messages',
]

/**
 * Page de diagnostic accessible publiquement (/diagnostic).
 *
 * Elle vérifie depuis le navigateur de l'utilisateur — et non depuis un serveur —
 * que Supabase est joignable, que le schéma est appliqué et que le bucket existe.
 * Utile pour savoir immédiatement quoi corriger.
 */
export default function Diagnostic() {
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [enCours, setEnCours] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'ko'; texte: string } | null>(null)

  const lancer = useCallback(async () => {
    setEnCours(true)
    setResultats([])
    const r: Resultat[] = []

    // 1. Variables d'environnement
    const url = import.meta.env.VITE_SUPABASE_URL
    const cle = import.meta.env.VITE_SUPABASE_ANON_KEY
    r.push({
      nom: 'Variables du fichier .env',
      ok: Boolean(url && cle),
      detail:
        url && cle
          ? `URL détectée : ${url}`
          : 'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY est manquant — copiez .env.example en .env',
    })

    // 2. Projet joignable
    if (url && cle) {
      try {
        const reponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: cle } })
        r.push({
          nom: 'Projet Supabase joignable',
          ok: reponse.ok,
          detail: reponse.ok
            ? 'Le projet répond correctement'
            : `Le projet a répondu HTTP ${reponse.status} — vérifiez l'URL du projet`,
        })
      } catch (exception) {
        r.push({
          nom: 'Projet Supabase joignable',
          ok: false,
          detail: messageErreur(exception, 'Connexion impossible au projet Supabase'),
        })
      }
    }

    // 3. Tables du schéma
    for (const table of TABLES) {
      const { error } = await supabase.from(table).select('*').limit(1)
      r.push({
        nom: `Table « ${table} »`,
        ok: !error,
        detail: error
          ? messageErreur(error, 'inaccessible')
          : 'accessible (le schéma est appliqué)',
      })
    }

    // 4. Bucket de stockage
    try {
      const { data, error } = await supabase.storage.listBuckets()
      const present = (data ?? []).some((bucket) => bucket.id === BUCKET_PREUVES)
      r.push({
        nom: `Bucket « ${BUCKET_PREUVES} »`,
        ok: !error && present,
        detail: error
          ? messageErreur(error, 'vérification impossible')
          : present
            ? 'présent (stockage privé des preuves)'
            : 'absent — exécutez la section 6 de supabase/schema.sql',
      })
    } catch (exception) {
      r.push({
        nom: `Bucket « ${BUCKET_PREUVES} »`,
        ok: false,
        detail: messageErreur(exception, 'vérification impossible'),
      })
    }

    setResultats(r)
    setEnCours(false)
  }, [])

  async function creerCompte(evenement: FormEvent) {
    evenement.preventDefault()
    setMessage(null)
    const { data, error } = await supabase.auth.signUp({ email, password: motDePasse })
    if (error) {
      setMessage({ type: 'ko', texte: messageErreur(error, 'Inscription impossible.') })
      return
    }
    if (data.session) {
      setMessage({
        type: 'ok',
        texte: 'Compte créé et connecté ! Rendez-vous sur /discussions pour commencer.',
      })
    } else {
      setMessage({
        type: 'ok',
        texte: 'Compte créé. La confirmation par e-mail est activée : vérifiez votre boîte mail.',
      })
    }
  }

  async function seConnecter(evenement: FormEvent) {
    evenement.preventDefault()
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) {
      setMessage({ type: 'ko', texte: messageErreur(error, 'Connexion impossible.') })
      return
    }
    setMessage({ type: 'ok', texte: 'Connexion réussie ! Rendez-vous sur /discussions.' })
  }

  const reussis = resultats.filter((r) => r.ok).length

  return (
    <div className="page-diagnostic">
      <div className="carte">
        <h2>Diagnostic de l'application</h2>
        <p className="intro">
          Cette page vérifie que votre configuration Supabase est complète. Elle interroge
          directement votre projet depuis ce navigateur.
        </p>

        <button
          type="button"
          className="bouton-principal"
          onClick={() => void lancer()}
          disabled={enCours}
        >
          {enCours ? 'Analyse en cours…' : 'Lancer le diagnostic'}
        </button>

        {resultats.length > 0 && (
          <div className="resume-diagnostic">
            <strong className={reussis === resultats.length ? 'tout-ok' : 'partiel'}>
              {reussis} / {resultats.length} vérifications réussies
            </strong>
          </div>
        )}

        {resultats.length > 0 && (
          <ul className="resultats">
            {resultats.map((resultat) => (
              <li key={resultat.nom} className={resultat.ok ? 'ok' : 'ko'}>
                <span className="icone">{resultat.ok ? '✅' : '❌'}</span>
                <span className="contenu-resultat">
                  <strong>{resultat.nom}</strong>
                  <small>{resultat.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="carte">
        <h2>Tester un compte</h2>
        <p className="intro">Créez un compte de test ou connectez-vous avec un compte existant.</p>
        <form onSubmit={creerCompte}>
          <label htmlFor="diag-email">Adresse e-mail</label>
          <input
            id="diag-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@exemple.com"
          />
          <label htmlFor="diag-mdp">Mot de passe</label>
          <input
            id="diag-mdp"
            type="password"
            required
            minLength={6}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="6 caractères minimum"
          />
          <div className="actions-diagnostic">
            <button type="submit" className="bouton-principal">
              Créer ce compte
            </button>
            <button type="button" className="bouton-secondaire" onClick={seConnecter}>
              Se connecter
            </button>
          </div>
        </form>

        {message && (
          <p className={`alerte ${message.type === 'ok' ? 'succes' : 'erreur'}`} role="status">
            {message.texte}
          </p>
        )}
      </div>

      <p className="lien-retour">
        <Link to="/connexion">← Retour à la connexion</Link>
      </p>
    </div>
  )
}
