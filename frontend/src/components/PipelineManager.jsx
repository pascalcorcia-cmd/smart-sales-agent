import React, { useState, useEffect } from 'react'
import { getDeals, createDeal, updateDeal, deleteDeal } from '../api'

const STAGES = [
  { id: 'prospection', label: 'Prospection', color: '#64748b' },
  { id: 'qualification', label: 'Qualification', color: '#6366f1' },
  { id: 'proposition', label: 'Proposition', color: '#f59e0b' },
  { id: 'negociation', label: 'Négociation', color: '#f97316' },
  { id: 'gagne', label: 'Gagné', color: '#22c55e' },
  { id: 'perdu', label: 'Perdu', color: '#ef4444' },
]

const formatValue = (v) => v == null ? null : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

export default function PipelineManager() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ company: '', contact_name: '', stage: 'prospection', value: '', close_date: '', notes: '' })

  const load = async () => {
    setLoading(true)
    const res = await getDeals()
    setDeals(res.deals || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.company.trim()) return
    await createDeal({ ...form, value: form.value ? parseFloat(form.value) : null })
    setForm({ company: '', contact_name: '', stage: 'prospection', value: '', close_date: '', notes: '' })
    setShowForm(false)
    load()
  }

  const changeStage = async (deal, stage) => {
    await updateDeal(deal.id, { stage })
    load()
  }

  const handleDelete = async (id) => {
    await deleteDeal(id)
    load()
  }

  const totalValue = deals
    .filter(d => d.stage !== 'perdu')
    .reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Pipeline Commercial</h2>
          {deals.length > 0 && (
            <p style={styles.subtitle}>{deals.length} deals · {formatValue(totalValue)} en cours</p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Annuler' : '+ Nouveau deal'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            type="text"
            placeholder="Entreprise *"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Contact"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            style={styles.input}
          />
          <select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            style={styles.input}
          >
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <input
            type="number"
            placeholder="Valeur (EUR)"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            style={styles.input}
          />
          <input
            type="date"
            value={form.close_date}
            onChange={(e) => setForm({ ...form, close_date: e.target.value })}
            style={styles.input}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={styles.textarea}
            rows={2}
          />
          <button type="submit" style={styles.submitBtn} disabled={!form.company.trim()}>
            Ajouter
          </button>
        </form>
      )}

      <div style={styles.list}>
        {loading && <p style={styles.empty}>Chargement...</p>}
        {!loading && deals.length === 0 && (
          <p style={styles.empty}>Aucun deal. Ajoutez-en un pour commencer.</p>
        )}
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id)
          if (stageDeals.length === 0) return null
          return (
            <div key={stage.id}>
              <div style={styles.stageHeader}>
                <span style={{ ...styles.stageDot, background: stage.color }} />
                <span style={styles.stageLabel}>{stage.label}</span>
                <span style={styles.stageCount}>{stageDeals.length}</span>
              </div>
              {stageDeals.map(d => (
                <div key={d.id} style={styles.card}>
                  <div style={styles.cardMain}>
                    <div style={styles.cardTop}>
                      <span style={styles.cardTitle}>{d.company}</span>
                      {formatValue(d.value) && <span style={styles.cardValue}>{formatValue(d.value)}</span>}
                    </div>
                    <div style={styles.cardMeta}>
                      {d.contact_name && <span>👤 {d.contact_name}</span>}
                      {d.close_date && <span>📅 {d.close_date}</span>}
                    </div>
                    {d.notes && <p style={styles.cardNotes}>{d.notes}</p>}
                    <select
                      value={d.stage}
                      onChange={(e) => changeStage(d, e.target.value)}
                      style={styles.stageSelect}
                    >
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => handleDelete(d.id)} style={styles.deleteBtn} title="Supprimer">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    maxWidth: 700,
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle: { fontSize: 13, color: '#94a3b8', margin: '4px 0 0' },
  addBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  submitBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  empty: { color: '#64748b', textAlign: 'center', padding: '20px 0' },
  stageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '16px 0 8px',
  },
  stageDot: { width: 8, height: 8, borderRadius: '50%' },
  stageLabel: { fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  stageCount: { fontSize: 12, color: '#64748b' },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '14px 16px',
    gap: 12,
    marginBottom: 8,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  cardValue: { fontSize: 13, fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' },
  cardMeta: { display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' },
  cardNotes: { fontSize: 13, color: '#cbd5e1', marginTop: 6, marginBottom: 6 },
  stageSelect: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '4px 8px',
    color: '#e2e8f0',
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'inherit',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 6px',
  },
}
