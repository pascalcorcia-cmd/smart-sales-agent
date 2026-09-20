import React, { useState } from 'react'
import { streamMessage, createTextBatcher, exportDocx, createMeeting, updateMeeting } from '../api'

const STEPS = [
  { n: 1, label: 'Contexte' },
  { n: 2, label: 'Briefs' },
  { n: 3, label: 'Facilitation' },
  { n: 4, label: 'Compte-rendu' },
  { n: 5, label: 'Actions' },
  { n: 6, label: 'Email' },
  { n: 7, label: 'Suivi' },
]

export default function ReunionWizard({ onClose }) {
  const [step, setStep] = useState(1)
  const [meetingId, setMeetingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [subject, setSubject] = useState('')
  const [stakes, setStakes] = useState('')
  const [trigger, setTrigger] = useState('')
  const [duration, setDuration] = useState('1h')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState([])

  const [agenda, setAgenda] = useState('')
  const [briefs, setBriefs] = useState('')
  const [facilitationGuide, setFacilitationGuide] = useState('')
  const [notes, setNotes] = useState('')
  const [minutes, setMinutes] = useState('')
  const [actionPlan, setActionPlan] = useState('')
  const [statusUpdate, setStatusUpdate] = useState('')
  const [tracking, setTracking] = useState('')
  const [email, setEmail] = useState('')

  const [streamingContent, setStreamingContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateStep = async (prompt) => {
    setLoading(true)
    setError(null)
    setStreamingContent('')
    let finalContent = ''
    const batcher = createTextBatcher((content) => {
      finalContent = content
      setStreamingContent(content)
    })
    try {
      await streamMessage(prompt, null, (event) => {
        switch (event.type) {
          case 'text':
            batcher.append(event.data)
            break
          case 'done':
            batcher.flushNow()
            break
          case 'error':
            finalContent = `Erreur: ${event.data}`
            setStreamingContent(finalContent)
            break
        }
      })
    } catch (err) {
      finalContent = `Erreur: ${err.message}`
      setStreamingContent(finalContent)
    }
    setLoading(false)
    return finalContent
  }

  const addParticipant = (e) => {
    e.preventDefault()
    if (participantInput.trim()) {
      setParticipants([...participants, participantInput.trim()])
      setParticipantInput('')
    }
  }
  const removeParticipant = (i) => setParticipants(participants.filter((_, idx) => idx !== i))

  const handleGenerateAgenda = async () => {
    if (!subject.trim() || !stakes.trim() || !trigger.trim()) {
      setError('Renseigne le sujet, les enjeux et le déclencheur avant de générer.')
      return
    }
    const prompt = `Je prépare une réunion stratégique\nContexte: ${subject}\nEnjeu: ${stakes}\nDéclencheur: ${trigger}\nParticipants (${participants.length}): ${participants.join(', ')}\nDurée: ${duration}\n\nProduis un ordre du jour structuré avec pour chaque point:\n- Intitulé précis\n- Objectif (décision/validation/alignement/info)\n- Durée allouée\n- Pilote\n- Préparation attendue\n\nInclus un point d'ouverture (5mn) et clôture (10mn).\nLa somme doit égaler ${duration}.`
    setAgenda(await generateStep(prompt))
  }

  const handleGenerateBriefs = async () => {
    const prompt = `Ordre du jour: ${agenda}\nParticipants: ${participants.join(', ')}\n\nPour chaque participant, rédige un brief de 5-8 lignes avec:\n- Points de l'ordre du jour où sa contribution est attendue\n- Question clé à préparer\n- Documents à apporter\n- Livrable attendu\n\nFormat: Nom – Fonction`
    setBriefs(await generateStep(prompt))
  }

  const handleGenerateFacilitation = async () => {
    const prompt = `Ordre du jour: ${agenda}\nParticipants: ${participants.join(', ')}\n\nPour chaque point, produis:\n1) Question d'ouverture\n2) 2-3 questions de relance\n3) Question de clôture\n4) Tensions prévisibles\n5) Signal que le point dérape\n\nAjoute 3 phrases de recadrage prêtes à l'emploi.`
    setFacilitationGuide(await generateStep(prompt))
  }

  const handleGenerateMinutes = async () => {
    const prompt = `Ordre du jour: ${agenda}\nNotes de réunion: ${notes}\n\nRédige un compte-rendu structuré:\n- En-tête (date, lieu, participants, durée)\n- Pour chaque point: résumé, décision, désaccords\n- Section "prochaines étapes"\n\nTon factuel, neutre.`
    setMinutes(await generateStep(prompt))
  }

  const handleGenerateActions = async () => {
    const prompt = `Compte-rendu: ${minutes}\n\nExtrais toutes les actions en tableau:\n- Action (tâche concrète, verbe)\n- Responsable\n- Échéance\n- Livrable\n- Dépendance\n\nSi vague, reformule-la et signale l'interprétation.\nAjoute date suggérée de suivi (2-4 semaines).`
    setActionPlan(await generateStep(prompt))
  }

  const handleGenerateEmail = async () => {
    const prompt = `Compte-rendu: ${minutes}\nPlan d'action: ${actionPlan}\n\nRédige un email de synthèse (150 mots max):\n- Objet: (Réunion du JJ/MM – Décisions et actions)\n- 1 phrase de remerciement\n- 3-5 décisions principales\n- Actions prioritaires (responsable/échéance)\n- Date suivi\n- "CR complet en pièce jointe"\n\nDoit tenir sur écran téléphone.`
    setEmail(await generateStep(prompt))
  }

  const handleGenerateTracking = async () => {
    const prompt = `Plan d'action: ${actionPlan}\nÉtat des actions: ${statusUpdate}\n\nProduis suivi:\n1) Tableau synthèse (action, responsable, statut, échéance, alerte)\n2) Actions en retard/risque avec cause\n3) Relances pour actions en rouge\n4) Points à arbitrer\n\nTon factuel, orienté déblocage.`
    setTracking(await generateStep(prompt))
  }

  const handleSave = async () => {
    setSaving(true)
    const data = {
      title: subject || 'Réunion sans titre',
      contact_name: participants.join(', ') || null,
      notes: notes || null,
      agenda: agenda || null,
      briefs: briefs || null,
      facilitation_guide: facilitationGuide || null,
      minutes: minutes || null,
      action_plan: actionPlan || null,
      follow_up_email: email || null,
    }
    try {
      if (meetingId) {
        await updateMeeting(meetingId, data)
      } else {
        const created = await createMeeting(data)
        setMeetingId(created.id)
      }
    } catch (err) {
      setError('Erreur sauvegarde: ' + err.message)
    }
    setSaving(false)
  }

  const handleExport = async (stepName, content) => {
    try {
      await exportDocx(`Réunion ${subject || ''} - ${stepName}`, content)
    } catch (err) {
      setError('Erreur export Word: ' + err.message)
    }
  }

  const ResultBlock = ({ content, stepName }) => {
    if (!content) return null
    return (
      <div style={styles.resultSection}>
        <div style={styles.resultHeader}>
          <h3 style={styles.resultTitle}>Résultat</h3>
          <button onClick={() => handleExport(stepName, content)} style={styles.exportBtn}>
            📄 Exporter en Word
          </button>
        </div>
        <div style={styles.resultContent}>{content}</div>
      </div>
    )
  }

  const Nav = ({ canNext }) => (
    <div style={styles.nav}>
      {step > 1 && <button onClick={() => setStep(step - 1)} style={styles.navBtn}>← Précédent</button>}
      <div style={{ flex: 1 }} />
      <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
        {saving ? 'Sauvegarde...' : '💾 Enregistrer'}
      </button>
      {step < 7 && (
        <button onClick={() => setStep(step + 1)} disabled={!canNext} style={styles.navBtn}>
          Suivant →
        </button>
      )}
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🧭 Assistant Réunion Stratégique</h2>
        <button onClick={onClose} style={styles.closeBtn}>← Retour à la liste</button>
      </div>

      <div style={styles.stepper}>
        {STEPS.map(s => (
          <button
            key={s.n}
            onClick={() => setStep(s.n)}
            style={{ ...styles.stepDot, ...(step === s.n ? styles.stepDotActive : {}) }}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {step === 1 && (
        <div style={styles.stepBody}>
          <label style={styles.label}>Sujet de la réunion *</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Stratégie produit 2026" style={styles.input} />

          <label style={styles.label}>Enjeux *</label>
          <textarea value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="Quels sont les enjeux de cette réunion ?" style={styles.textarea} rows={2} />

          <label style={styles.label}>Déclencheur *</label>
          <textarea value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Qu'est-ce qui a déclenché cette réunion ?" style={styles.textarea} rows={2} />

          <label style={styles.label}>Durée</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} style={styles.input}>
            <option value="1h">1 heure</option>
            <option value="1h30">1 heure 30</option>
            <option value="2h">2 heures</option>
          </select>

          <label style={styles.label}>Participants</label>
          <div style={styles.participantRow}>
            <input
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addParticipant(e)}
              placeholder="Nom – Fonction"
              style={{ ...styles.input, flex: 1 }}
            />
            <button onClick={addParticipant} style={styles.addBtn}>+</button>
          </div>
          {participants.length > 0 && (
            <div style={styles.badgeRow}>
              {participants.map((p, i) => (
                <span key={i} style={styles.badge}>
                  {p} <button onClick={() => removeParticipant(i)} style={styles.badgeRemove}>×</button>
                </span>
              ))}
            </div>
          )}

          <button onClick={handleGenerateAgenda} disabled={loading} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : "🤖 Générer l'ordre du jour"}
          </button>

          <ResultBlock content={agenda || streamingContent} stepName="ordre-du-jour" />
          <Nav canNext={!!agenda} />
        </div>
      )}

      {step === 2 && (
        <div style={styles.stepBody}>
          <p style={styles.stepDesc}>Brief individuel pour chaque participant, basé sur l'ordre du jour.</p>
          <button onClick={handleGenerateBriefs} disabled={loading || !agenda} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : '📋 Générer les briefs'}
          </button>
          <ResultBlock content={briefs || streamingContent} stepName="briefs" />
          <Nav canNext={!!briefs} />
        </div>
      )}

      {step === 3 && (
        <div style={styles.stepBody}>
          <p style={styles.stepDesc}>Guide d'animation : questions, relances, gestion des tensions.</p>
          <button onClick={handleGenerateFacilitation} disabled={loading || !agenda} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : "🎤 Générer le guide d'animation"}
          </button>
          <ResultBlock content={facilitationGuide || streamingContent} stepName="facilitation" />
          <Nav canNext={!!facilitationGuide} />
        </div>
      )}

      {step === 4 && (
        <div style={styles.stepBody}>
          <label style={styles.label}>Notes de réunion (brutes)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Saisis tes notes prises pendant la réunion..." style={styles.textarea} rows={5} />
          <button onClick={handleGenerateMinutes} disabled={loading || !agenda} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : '📝 Générer le compte-rendu'}
          </button>
          <ResultBlock content={minutes || streamingContent} stepName="compte-rendu" />
          <Nav canNext={!!minutes} />
        </div>
      )}

      {step === 5 && (
        <div style={styles.stepBody}>
          <p style={styles.stepDesc}>Extraction des actions décidées en tableau de suivi.</p>
          <button onClick={handleGenerateActions} disabled={loading || !minutes} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : '✅ Extraire les actions'}
          </button>
          <ResultBlock content={actionPlan || streamingContent} stepName="actions" />
          <Nav canNext={!!actionPlan} />
        </div>
      )}

      {step === 6 && (
        <div style={styles.stepBody}>
          <p style={styles.stepDesc}>Email de synthèse court, prêt à envoyer aux participants.</p>
          <button onClick={handleGenerateEmail} disabled={loading || !actionPlan} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : "✉️ Générer l'email"}
          </button>
          <ResultBlock content={email || streamingContent} stepName="email" />
          <Nav canNext={!!email} />
        </div>
      )}

      {step === 7 && (
        <div style={styles.stepBody}>
          <label style={styles.label}>État des actions</label>
          <textarea value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)} placeholder="Décris l'avancement des actions..." style={styles.textarea} rows={3} />
          <button onClick={handleGenerateTracking} disabled={loading || !actionPlan} style={styles.generateBtn}>
            {loading ? '⏳ Génération...' : '📊 Analyser le suivi'}
          </button>
          <ResultBlock content={tracking || streamingContent} stepName="suivi" />
          <div style={styles.nav}>
            <button onClick={() => setStep(6)} style={styles.navBtn}>← Précédent</button>
            <div style={{ flex: 1 }} />
            <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? 'Sauvegarde...' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { flex: 1, overflowY: 'auto', padding: '24px 20px', maxWidth: 760, margin: '0 auto', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  closeBtn: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  stepper: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  stepDot: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  stepDotActive: { background: '#6366f1', borderColor: '#6366f1', color: '#fff' },
  errorBox: { background: '#3f1d2e', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 },
  stepBody: { display: 'flex', flexDirection: 'column', gap: 10 },
  stepDesc: { color: '#94a3b8', fontSize: 13, margin: '0 0 4px' },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  input: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  textarea: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  participantRow: { display: 'flex', gap: 8 },
  addBtn: { background: '#6366f1', border: 'none', borderRadius: 8, padding: '0 16px', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700 },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  badge: { background: '#334155', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 },
  badgeRemove: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: 0 },
  generateBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', marginTop: 8 },
  resultSection: { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 14, marginTop: 8 },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 13, fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportBtn: { background: '#334155', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  resultContent: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  nav: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  navBtn: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 16px', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  saveBtn: { background: '#22c55e', border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' },
}
