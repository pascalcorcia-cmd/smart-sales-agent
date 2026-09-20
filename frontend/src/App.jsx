import React, { useState, useRef, useEffect } from 'react'
import { streamMessage, uploadFile } from './api'
import MessageBubble from './components/MessageBubble'
import ToolOutput from './components/ToolOutput'
import FileUpload from './components/FileUpload'
import AccountPlan from './components/AccountPlan'
import PromptTool from './components/PromptTool'
import MeetingManager from './components/MeetingManager'

const TABS = [
  { id: 'chat', label: 'Chat IA', icon: '💬' },
  { id: 'account-plan', label: 'Account Plan', icon: '📊' },
  { id: 'prep-rdv', label: 'Préparation RDV', icon: '📋' },
  { id: 'qualify', label: 'Qualification Leads', icon: '🎯' },
  { id: 'manage-meetings', label: 'Gestion Réunions', icon: '🗓️' },
  { id: 'prospecting-email', label: 'Rédiger des emails', icon: '✉️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    let assistantContent = ''
    let toolCalls = []

    setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [], streaming: true }])

    try {
      await streamMessage(userMsg, conversationId, (event) => {
        switch (event.type) {
          case 'conversation_id':
            setConversationId(event.data)
            break
          case 'text':
            assistantContent += event.data
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              updated[updated.length - 1] = { ...last, content: assistantContent }
              return updated
            })
            break
          case 'tool_start':
            toolCalls.push({ tool: event.data.tool, status: 'running' })
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              updated[updated.length - 1] = { ...last, toolCalls: [...toolCalls] }
              return updated
            })
            break
          case 'tool_result':
            toolCalls = toolCalls.map(tc =>
              tc.tool === event.data.tool && tc.status === 'running'
                ? { ...tc, status: 'done', result: event.data.result }
                : tc
            )
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              updated[updated.length - 1] = { ...last, toolCalls: [...toolCalls] }
              return updated
            })
            break
          case 'done':
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              updated[updated.length - 1] = { ...last, streaming: false }
              return updated
            })
            break
          case 'error':
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              updated[updated.length - 1] = { ...last, content: `Erreur: ${event.data}`, streaming: false }
              return updated
            })
            break
        }
      })
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Erreur: ${err.message}`,
          streaming: false
        }
        return updated
      })
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const handleFileUpload = async (file) => {
    try {
      const result = await uploadFile(file)
      setMessages(prev => [...prev, {
        role: 'system',
        content: `📎 Fichier "${result.filename}" uploadé (${result.size_kb} KB)`
      }])
      setShowUpload(false)
    } catch (err) {
      alert('Erreur upload: ' + err.message)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  return (
    <div style={styles.container}>
      {activeTab && (
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={() => setActiveTab(null)} style={styles.backBtn} title="Retour au menu">
              ← Menu
            </button>
            <h1 style={styles.title}>Smart Sales Agent</h1>
          </div>
          {activeTab === 'chat' && (
            <div style={styles.headerRight}>
              <button onClick={() => setShowUpload(!showUpload)} style={styles.iconBtn} title="Upload fichier">
                📎
              </button>
              <button onClick={handleNewChat} style={styles.iconBtn} title="Nouvelle conversation">
                ✨
              </button>
            </div>
          )}
        </header>
      )}

      {!activeTab && (
        <div style={styles.menuContainer}>
          <h1 style={styles.menuTitle}>Smart Sales Agent</h1>
          <p style={styles.menuSubtitle}>Choisissez une fonction</p>
          <div style={styles.menuGrid}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={styles.menuBtn}
              >
                <div style={styles.menuBtnIcon}>{tab.icon}</div>
                <div style={styles.menuBtnLabel}>{tab.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <>
          {showUpload && <FileUpload onUpload={handleFileUpload} onClose={() => setShowUpload(false)} />}

          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.welcome}>
                <h2 style={styles.welcomeTitle}>Bienvenue !</h2>
                <p style={styles.welcomeText}>Je suis votre assistant commercial IA. Je peux :</p>
                <div style={styles.capabilities}>
                  {[
                    ['🔍', 'Rechercher des infos sur vos prospects'],
                    ['📊', 'Analyser vos fichiers Excel/CSV'],
                    ['✉️', 'Rédiger des emails de prospection'],
                    ['🎯', 'Qualifier vos leads (BANT/MEDDPICC)'],
                    ['📋', 'Préparer vos rendez-vous commerciaux'],
                    ['💻', 'Analyser des données avec Python'],
                  ].map(([icon, text]) => (
                    <div key={text} style={styles.capItem}>
                      <span style={styles.capIcon}>{icon}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.toolCalls?.map((tc, j) => (
                  <ToolOutput key={j} toolCall={tc} />
                ))}
                {msg.content && <MessageBubble message={msg} />}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.streaming && !messages[messages.length - 1]?.content && (
              <div style={styles.thinking}>Réflexion en cours...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} style={styles.inputForm}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Recherche des infos sur Salesforce pour mon rendez-vous de demain..."
              style={styles.input}
              disabled={loading}
            />
            <button type="submit" style={styles.sendBtn} disabled={loading || !input.trim()}>
              ➤
            </button>
          </form>
        </>
      )}

      {activeTab === 'account-plan' && <AccountPlan />}

      {activeTab === 'prep-rdv' && (
        <PromptTool
          title="Préparation RDV"
          subtitle="Générez un brief complet avant votre rendez-vous commercial."
          submitLabel="Générer le brief"
          fields={[
            { key: 'companyName', label: "Nom de l'entreprise", placeholder: 'Ex: Salesforce', required: true },
            { key: 'companyUrl', label: 'URL du site web', placeholder: 'https://www.example.com', required: false },
            { key: 'context', label: 'Contexte du RDV', type: 'textarea', placeholder: 'Objectif, participants, sujets à aborder...', required: false },
          ]}
          buildPrompt={(v) => `Prépare un brief de rendez-vous complet pour ${v.companyName}${v.companyUrl ? ` (${v.companyUrl})` : ''}.${v.context ? `\nContexte fourni : ${v.context}` : ''}\nInclus : résumé entreprise, points clés à aborder, questions à poser, pièges à éviter, stratégie de négo.`}
        />
      )}

      {activeTab === 'qualify' && (
        <PromptTool
          title="Qualification Leads"
          subtitle="Qualifiez un lead avec les frameworks BANT et MEDDPICC."
          submitLabel="Qualifier le lead"
          fields={[
            { key: 'companyName', label: "Nom de l'entreprise", placeholder: 'Ex: Salesforce', required: true },
            { key: 'companyUrl', label: 'URL du site web', placeholder: 'https://www.example.com', required: false },
            { key: 'context', label: 'Informations connues', type: 'textarea', placeholder: 'Budget évoqué, délai, interlocuteurs, besoin exprimé...', required: false },
          ]}
          buildPrompt={(v) => `Qualifie le lead ${v.companyName}${v.companyUrl ? ` (${v.companyUrl})` : ''} avec les frameworks BANT et MEDDPICC.${v.context ? `\nInformations connues : ${v.context}` : ''}\nScore chaque dimension. Identifie les buying signals et red flags.`}
        />
      )}

      {activeTab === 'manage-meetings' && <MeetingManager />}

      {activeTab === 'prospecting-email' && (
        <PromptTool
          title="Rédiger des emails de prospection"
          subtitle="Générez une séquence d'emails de prospection personnalisée."
          submitLabel="Générer les emails"
          fields={[
            { key: 'companyName', label: "Nom de l'entreprise cible", placeholder: 'Ex: Salesforce', required: true },
            { key: 'contactName', label: 'Nom du contact', placeholder: 'Ex: Jean Dupont, Directeur Commercial', required: false },
            { key: 'context', label: 'Contexte / offre', type: 'textarea', placeholder: 'Votre produit, la valeur ajoutée pour ce prospect...', required: false },
          ]}
          buildPrompt={(v) => `Crée une séquence de 3 emails de prospection pour ${v.companyName}${v.contactName ? `, à destination de ${v.contactName}` : ''} : cold outreach, follow-up, break-up.${v.context ? `\nContexte : ${v.context}` : ''}\nPersonnalise avec une recherche sur l'entreprise si besoin.`}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: 900,
    margin: '0 auto',
    width: '100%',
  },
  menuContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
  },
  menuTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 12,
    color: '#f1f5f9',
  },
  menuSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 40,
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 16,
    maxWidth: 800,
    width: '100%',
  },
  menuBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    transition: 'all 0.2s',
  },
  menuBtnIcon: {
    fontSize: 32,
  },
  menuBtnLabel: {
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', gap: 8 },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 6,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  title: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  nav: {
    display: 'flex',
    gap: 4,
    background: '#1e293b',
    borderRadius: 10,
    padding: 3,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  iconBtn: {
    background: '#1e293b',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 16,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  welcome: {
    textAlign: 'center',
    padding: '60px 20px 40px',
  },
  welcomeTitle: { fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' },
  welcomeText: { color: '#94a3b8', marginBottom: 24, fontSize: 16 },
  capabilities: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
    maxWidth: 600,
    margin: '0 auto',
  },
  capItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#1e293b',
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    textAlign: 'left',
  },
  capIcon: { fontSize: 20 },
  thinking: {
    color: '#6366f1',
    padding: '8px 16px',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputForm: {
    display: 'flex',
    gap: 8,
    padding: '16px 20px',
    borderTop: '1px solid #1e293b',
  },
  input: {
    flex: 1,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 600,
  },
}
