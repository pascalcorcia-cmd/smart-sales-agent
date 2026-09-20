import React, { useState } from 'react'
import { exportDocx, runStreamTurn } from '../api'
import MessageBubble from './MessageBubble'
import ToolOutput from './ToolOutput'

export default function PromptTool({ title, subtitle, fields, buildPrompt, submitLabel, model, useTools }) {
  const [values, setValues] = useState({})
  const [step, setStep] = useState('form')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const requiredFilled = fields.filter(f => f.required).every(f => (values[f.key] || '').trim())

  const run = async () => {
    setStep('running')
    setLoading(true)
    setMessages([{ role: 'assistant', content: '', toolCalls: [], streaming: true }])

    await runStreamTurn(buildPrompt(values), null, {
      model,
      useTools,
      onUpdate: (state) => setMessages(prev => {
        const updated = [...prev]
        updated[0] = { ...updated[0], ...state }
        return updated
      }),
    })

    setLoading(false)
  }

  if (step === 'form') {
    return (
      <div style={styles.container}>
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>{title}</h2>
          <p style={styles.formDesc}>{subtitle}</p>

          {fields.map(f => (
            <div key={f.key} style={styles.formGroup}>
              <label style={styles.label}>{f.label}{f.required ? '' : ' (optionnel)'}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={values[f.key] || ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={styles.textarea}
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={values[f.key] || ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={styles.input}
                />
              )}
            </div>
          ))}

          <button
            onClick={run}
            disabled={!requiredFilled}
            style={{ ...styles.launchBtn, opacity: requiredFilled ? 1 : 0.5 }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    )
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDocx(title, messages[0]?.content || '')
    } catch (err) {
      alert('Erreur export Word: ' + err.message)
    }
    setExporting(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.runningHeader}>
        <h2 style={styles.runningTitle}>{title}</h2>
        <div style={styles.runningActions}>
          {!loading && messages[0]?.content && (
            <button onClick={handleExport} disabled={exporting} style={styles.exportBtn}>
              {exporting ? 'Export...' : '📄 Exporter en Word'}
            </button>
          )}
          {!loading && (
            <button onClick={() => { setStep('form'); setMessages([]) }} style={styles.backBtn}>
              Nouvelle demande
            </button>
          )}
        </div>
      </div>
      <div style={styles.messagesArea}>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.toolCalls?.filter(tc => tc.tool === 'write_file').map((tc, j) => (
              <ToolOutput key={j} toolCall={tc} />
            ))}
            {msg.content && <MessageBubble message={msg} />}
          </div>
        ))}
        {loading && !messages[0]?.content && (
          <div style={styles.thinking}>Réflexion en cours...</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  formWrapper: {
    flex: 1,
    overflowY: 'auto',
    padding: '30px 20px',
    maxWidth: 700,
    margin: '0 auto',
    width: '100%',
  },
  formTitle: { fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  formDesc: { color: '#94a3b8', fontSize: 14, marginBottom: 28, lineHeight: 1.5 },
  formGroup: { marginBottom: 20 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  launchBtn: {
    width: '100%',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12,
    fontFamily: 'inherit',
  },
  runningHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #1e293b',
  },
  runningTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  runningActions: { display: 'flex', gap: 8 },
  exportBtn: {
    background: '#6366f1',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  backBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 16px',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
  },
  thinking: {
    color: '#6366f1',
    padding: '8px 16px',
    fontSize: 14,
    fontStyle: 'italic',
  },
}
