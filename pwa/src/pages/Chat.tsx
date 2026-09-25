import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formaterDate, messageErreur } from '../lib/format'
import { identifiantLocal } from '../lib/id'
import {
  ajouterEnAttente,
  lireFileAttente,
  retirerDeLaFileAttente,
  type MessageEnAttente,
} from '../lib/offlineQueue'
import Chargement from '../components/Chargement'
import type { Conversation, Message, Profile } from '../types'

interface ResumeConversation {
  conversation: Conversation
  interlocuteur: { id: string; nom: string | null; email: string | null } | null
  dernierMessage: string | null
  dernierMessageDate: string | null
}

export default function Chat() {
  const { session, profil } = useAuth()
  const utilisateurId = session?.user.id ?? ''

  const [resumes, setResumes] = useState<ResumeConversation[]>([])
  const [conversationActive, setConversationActive] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [envoisLocaux, setEnvoisLocaux] = useState<Message[]>([])
  const [texte, setTexte] = useState('')
  const [chargementListe, setChargementListe] = useState(true)
  const [chargementMessages, setChargementMessages] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Profile[]>([])
  const [panneauContacts, setPanneauContacts] = useState(false)

  const basDePage = useRef<HTMLDivElement | null>(null)

  /** Recharge la liste des conversations avec interlocuteur et dernier message. */
  const chargerConversations = useCallback(async () => {
    if (!utilisateurId) return
    const { data: participations, error: erreurParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', utilisateurId)

    if (erreurParticipations) {
      setErreur(messageErreur(erreurParticipations, 'Impossible de charger vos discussions.'))
      setChargementListe(false)
      return
    }

    const ids = (participations ?? []).map((p) => p.conversation_id)
    if (ids.length === 0) {
      setResumes([])
      setChargementListe(false)
      return
    }

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('updated_at', { ascending: false })

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', ids)

    const autresIds = [
      ...new Set(
        (participants ?? []).filter((p) => p.user_id !== utilisateurId).map((p) => p.user_id),
      ),
    ]
    const { data: profils } = await supabase.from('profiles').select('*').in('id', autresIds)

    const nouveauxResumes: ResumeConversation[] = []
    for (const conversation of conversations ?? []) {
      const autreParticipation = (participants ?? []).find(
        (p) => p.conversation_id === conversation.id && p.user_id !== utilisateurId,
      )
      const autre = (profils ?? []).find((p) => p.id === autreParticipation?.user_id) ?? null

      const { data: dernier } = await supabase
        .from('messages')
        .select('contenu, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      nouveauxResumes.push({
        conversation,
        interlocuteur: autre ? { id: autre.id, nom: autre.nom, email: autre.email } : null,
        dernierMessage: dernier?.contenu ?? null,
        dernierMessageDate: dernier?.created_at ?? null,
      })
    }

    setResumes(nouveauxResumes)
    setChargementListe(false)
  }, [utilisateurId])

  /** Charge les messages de la conversation ouverte. */
  const chargerMessages = useCallback(async (conversationId: string) => {
    setChargementMessages(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setChargementMessages(false)
    if (error) {
      setErreur(messageErreur(error, 'Impossible de charger les messages.'))
      return
    }
    setMessages((data ?? []) as Message[])
  }, [])

  /** Envoie les messages mis en file d'attente pendant la coupure réseau. */
  const synchroniserFileAttente = useCallback(async () => {
    const attente: MessageEnAttente[] = lireFileAttente()
    if (attente.length === 0) return
    for (const item of attente) {
      const { error } = await supabase.from('messages').insert({
        conversation_id: item.conversation_id,
        user_id: utilisateurId,
        contenu: item.contenu,
      })
      if (error) continue
      retirerDeLaFileAttente(item.id)
      setEnvoisLocaux((precedents) => precedents.filter((m) => m.id !== item.id))
    }
    window.dispatchEvent(new Event('paykal:outbox'))
  }, [utilisateurId])

  useEffect(() => {
    void chargerConversations()
  }, [chargerConversations])

  // Synchronisation de la file d'attente au retour du réseau
  useEffect(() => {
    const surRetourReseau = () => void synchroniserFileAttente()
    window.addEventListener('online', surRetourReseau)
    void synchroniserFileAttente()
    return () => window.removeEventListener('online', surRetourReseau)
  }, [synchroniserFileAttente])

  // Messages + temps réel de la conversation active
  useEffect(() => {
    if (!conversationActive) return
    void chargerMessages(conversationActive)

    const canal = supabase
      .channel(`messages:${conversationActive}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationActive}`,
        },
        (charge) => {
          const nouveau = charge.new as Message
          setMessages((precedents) =>
            precedents.some((m) => m.id === nouveau.id) ? precedents : [...precedents, nouveau],
          )
          void chargerConversations()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [conversationActive, chargerMessages, chargerConversations])

  // Défilement automatique vers le bas
  useEffect(() => {
    basDePage.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, envoisLocaux, conversationActive])

  const tousLesMessages = useMemo(
    () => [...messages, ...envoisLocaux].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [messages, envoisLocaux],
  )

  function ouvrirConversation(id: string) {
    setConversationActive(id)
    setEnvoisLocaux([])
    setErreur(null)
  }

  async function envoyerMessage(evenement: FormEvent) {
    evenement.preventDefault()
    const contenu = texte.trim()
    if (!contenu || !conversationActive || !utilisateurId) return
    setTexte('')

    if (!navigator.onLine) {
      const item: MessageEnAttente = {
        id: `local-${identifiantLocal()}`,
        conversation_id: conversationActive,
        contenu,
        created_at: new Date().toISOString(),
      }
      ajouterEnAttente(item)
      setEnvoisLocaux((precedents) => [...precedents, item as Message])
      window.dispatchEvent(new Event('paykal:outbox'))
      return
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationActive,
      user_id: utilisateurId,
      contenu,
    })
    if (error) {
      setErreur(messageErreur(error, "Le message n'a pas pu être envoyé."))
      setTexte(contenu)
    }
  }

  async function demarrerConversation(contactId: string) {
    const { data, error } = await supabase.rpc('get_or_create_conversation', { other_user: contactId })
    if (error) {
      setErreur(messageErreur(error, 'Impossible de créer la discussion.'))
      return
    }
    setPanneauContacts(false)
    await chargerConversations()
    if (typeof data === 'string') ouvrirConversation(data)
  }

  async function ouvrirPanneauContacts() {
    setPanneauContacts(true)
    const { data } = await supabase.from('profiles').select('*').order('nom', { ascending: true })
    setContacts(((data ?? []) as Profile[]).filter((p) => p.id !== utilisateurId))
  }

  return (
    <div className="messagerie">
      <aside className="liste-conversations">
        <div className="entete-liste">
          <h2>Discussions</h2>
          <button
            type="button"
            className="bouton-principal petit"
            onClick={() => void ouvrirPanneauContacts()}
          >
            Nouvelle
          </button>
        </div>

        {panneauContacts && (
          <div className="panneau-contacts">
            <div className="entete-panneau">
              <strong>Choisir un contact</strong>
              <button
                type="button"
                className="bouton-fantome"
                onClick={() => setPanneauContacts(false)}
              >
                Fermer
              </button>
            </div>
            {contacts.length === 0 && <p className="vide">Aucun autre utilisateur pour le moment.</p>}
            <ul>
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button type="button" onClick={() => void demarrerConversation(contact.id)}>
                    <span className="avatar">{initiales(contact.nom ?? contact.email ?? '?')}</span>
                    <span>{contact.nom ?? contact.email ?? 'Utilisateur'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {chargementListe ? (
          <Chargement texte="Chargement des discussions…" />
        ) : resumes.length === 0 ? (
          <p className="vide">
            Aucune discussion. Cliquez sur « Nouvelle » pour contacter une école ou un parent.
          </p>
        ) : (
          <ul className="conversations">
            {resumes.map(
              ({ conversation, interlocuteur, dernierMessage, dernierMessageDate }) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={conversation.id === conversationActive ? 'actif' : ''}
                    onClick={() => ouvrirConversation(conversation.id)}
                  >
                    <span className="avatar">
                      {initiales(interlocuteur?.nom ?? interlocuteur?.email ?? '?')}
                    </span>
                    <span className="resume">
                      <span className="ligne-1">
                        <strong>{interlocuteur?.nom ?? interlocuteur?.email ?? 'Discussion'}</strong>
                        {dernierMessageDate && (
                          <small>{formaterDate(dernierMessageDate).split(' ')[0]}</small>
                        )}
                      </span>
                      <span className="ligne-2">{dernierMessage ?? 'Aucun message'}</span>
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </aside>

      <section className="fil-discussion">
        {!conversationActive ? (
          <div className="vide-centre">
            <h3>Sélectionnez une discussion</h3>
            <p>Vos échanges avec les écoles et les autres parents apparaîtront ici.</p>
          </div>
        ) : (
          <>
            <div className="entete-fil">
              <h2>
                {resumes.find((r) => r.conversation.id === conversationActive)?.interlocuteur
                  ?.nom ??
                  resumes.find((r) => r.conversation.id === conversationActive)?.interlocuteur
                    ?.email ??
                  'Discussion'}
              </h2>
              {profil && <small>Connecté en tant que {profil.nom ?? profil.email}</small>}
            </div>

            <div className="messages">
              {chargementMessages && <Chargement texte="Chargement des messages…" />}
              {!chargementMessages && tousLesMessages.length === 0 && (
                <p className="vide-centre">Aucun message. Dites bonjour !</p>
              )}
              {tousLesMessages.map((message) => (
                <div
                  key={message.id}
                  className={message.user_id === utilisateurId ? 'bulle moi' : 'bulle autre'}
                >
                  <p>{message.contenu}</p>
                  <small>
                    {formaterDate(message.created_at)}
                    {message.id.startsWith('local-') && ' · en attente'}
                  </small>
                </div>
              ))}
              <div ref={basDePage} />
            </div>

            <form className="zone-saisie" onSubmit={envoyerMessage}>
              <input
                type="text"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Écrivez votre message…"
                aria-label="Votre message"
                maxLength={2000}
              />
              <button type="submit" className="bouton-principal" disabled={!texte.trim()}>
                Envoyer
              </button>
            </form>
          </>
        )}
      </section>

      {erreur && (
        <p className="alerte erreur flottant" role="alert">
          {erreur}
        </p>
      )}
    </div>
  )
}

function initiales(nom: string): string {
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('')
}
