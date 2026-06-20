import React, { useState, useRef, useEffect } from 'react'
import { streamMessage, uploadFile } from './api'
import MessageBubble from './components/MessageBubble'
import ToolOutput from './components/ToolOutput'
import FileUpload from './components/FileUpload'
import AccountPlan from './components/AccountPlan'

const TABS = [
  { id: 'chat', label: 'Chat IA', icon: '💬' },
  { id: 'account-plan', label: 'Account Plan', icon: '📊' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('chat')
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
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Smart Sales Agent</h1>
          <nav style={styles.nav}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.navBtn,
                  background: activeTab === tab.id ? '#6366f1' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#94a3b8',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', gap: 8 },
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
