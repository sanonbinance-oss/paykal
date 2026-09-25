import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { messageErreur } from '../lib/format'
import type { Profile } from '../types'

interface ValeurAuth {
  session: Session | null
  profil: Profile | null
  chargement: boolean
  estAdmin: boolean
  connexion: (email: string, motDePasse: string) => Promise<string | null>
  inscription: (nom: string, email: string, motDePasse: string) => Promise<string | null>
  deconnexion: () => Promise<void>
  rafraichirProfil: () => Promise<void>
}

const ContexteAuth = createContext<ValeurAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profile | null>(null)
  const [chargement, setChargement] = useState(true)

  const chargerProfil = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('[PayKal] Chargement du profil impossible :', error.message)
      setProfil(null)
      return
    }
    setProfil((data as Profile | null) ?? null)
  }, [])

  useEffect(() => {
    let actif = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!actif) return
      setSession(data.session)
      if (data.session) await chargerProfil(data.session.user.id)
      setChargement(false)
    })

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession)
      if (nouvelleSession) {
        void chargerProfil(nouvelleSession.user.id)
      } else {
        setProfil(null)
      }
    })

    return () => {
      actif = false
      abonnement.subscription.unsubscribe()
    }
  }, [chargerProfil])

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    return error ? messageErreur(error, 'Connexion impossible.') : null
  }, [])

  const inscription = useCallback(async (nom: string, email: string, motDePasse: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom } },
    })
    if (error) return messageErreur(error, 'Inscription impossible.')
    // Si la confirmation par e-mail est désactivée dans Supabase, la session
    // est créée immédiatement ; sinon l'utilisateur doit valider son e-mail.
    if (!data.session) {
      return 'Compte créé. Vérifiez votre e-mail pour confirmer votre inscription.'
    }
    return null
  }, [])

  const deconnexion = useCallback(async () => {
    await supabase.auth.signOut()
    setProfil(null)
  }, [])

  const rafraichirProfil = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) await chargerProfil(data.user.id)
  }, [chargerProfil])

  const valeur = useMemo<ValeurAuth>(
    () => ({
      session,
      profil,
      chargement,
      estAdmin: profil?.role === 'admin',
      connexion,
      inscription,
      deconnexion,
      rafraichirProfil,
    }),
    [session, profil, chargement, connexion, inscription, deconnexion, rafraichirProfil],
  )

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>
}

export function useAuth(): ValeurAuth {
  const contexte = useContext(ContexteAuth)
  if (!contexte) throw new Error('useAuth doit être utilisé dans un AuthProvider.')
  return contexte
}
