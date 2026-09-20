import React, { useState, useEffect } from 'react'
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../api'

const STATUSES = {
  planifie: { label: 'Planifié', color: '#6366f1' },
  fait: { label: 'Fait', color: '#22c55e' },
  annule: { label: 'Annulé', color: '#64748b' },
}

export default function MeetingManager() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', company: '', contact_name: '', meeting_date: '', notes: '' })

  const load = async () => {
    setLoading(true)
    const res = await getMeetings()
    setMeetings(res.meetings || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await createMeeting(form)
    setForm({ title: '', company: '', contact_name: '', meeting_date: '', notes: '' })
    setShowForm(false)
    load()
  }

  const cycleStatus = async (meeting) => {
    const order = ['planifie', 'fait', 'annule']
    const next = order[(order.indexOf(meeting.status) + 1) % order.length]
    await updateMeeting(meeting.id, { status: next })
    load()
  }

  const handleDelete = async (id) => {
    await deleteMeeting(id)
    load()
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Gestion des Réunions</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Annuler' : '+ Nouvelle réunion'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            type="text"
            placeholder="Titre *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Entreprise"
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
          <input
            type="date"
            value={form.meeting_date}
            onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
            style={styles.input}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={styles.textarea}
            rows={2}
          />
          <button type="submit" style={styles.submitBtn} disabled={!form.title.trim()}>
            Ajouter
          </button>
        </form>
      )}

      <div style={styles.list}>
        {loading && <p style={styles.empty}>Chargement...</p>}
        {!loading && meetings.length === 0 && (
          <p style={styles.empty}>Aucune réunion. Ajoutez-en une pour commencer.</p>
        )}
        {meetings.map(m => (
          <div key={m.id} style={styles.card}>
            <div style={styles.cardMain}>
              <div style={styles.cardTop}>
                <span style={styles.cardTitle}>{m.title}</span>
                <button
                  onClick={() => cycleStatus(m)}
                  style={{ ...styles.statusBadge, background: STATUSES[m.status]?.color || '#64748b' }}
                  title="Cliquer pour changer le statut"
                >
                  {STATUSES[m.status]?.label || m.status}
                </button>
              </div>
              <div style={styles.cardMeta}>
                {m.company && <span>🏢 {m.company}</span>}
                {m.contact_name && <span>👤 {m.contact_name}</span>}
                {m.meeting_date && <span>📅 {m.meeting_date}</span>}
              </div>
              {m.notes && <p style={styles.cardNotes}>{m.notes}</p>}
            </div>
            <button onClick={() => handleDelete(m.id)} style={styles.deleteBtn} title="Supprimer">
              ✕
            </button>
          </div>
        ))}
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
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { color: '#64748b', textAlign: 'center', padding: '20px 0' },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '14px 16px',
    gap: 12,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#f1f5f9' },
  statusBadge: {
    border: 'none',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  cardMeta: { display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' },
  cardNotes: { fontSize: 13, color: '#cbd5e1', marginTop: 6, marginBottom: 0 },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 6px',
  },
}
