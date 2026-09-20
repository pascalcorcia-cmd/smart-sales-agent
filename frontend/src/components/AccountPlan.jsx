import React, { useState, useRef } from 'react'
import { streamMessage, uploadFile, exportPptx } from '../api'
import MessageBubble from './MessageBubble'
import ToolOutput from './ToolOutput'

const MODULES = [
  { id: 'research', label: 'Recherche Entreprise', icon: '🔍', skill: 'sales-research', desc: 'Firmographics, business model, tech stack, funding' },
  { id: 'prospect', label: 'Analyse Prospect', icon: '🎯', skill: 'sales-prospect', desc: 'Audit complet avec scoring 0-100' },
  { id: 'qualify', label: 'Qualification Lead', icon: '✅', skill: 'sales-qualify', desc: 'BANT + MEDDPICC scoring' },
  { id: 'contacts', label: 'Decision Makers', icon: '👥', skill: 'sales-contacts', desc: 'Cartographie des décideurs' },
  { id: 'competitors', label: 'Veille Concurrentielle', icon: '⚔️', skill: 'sales-competitors', desc: 'Battle cards et positionnement' },
  { id: 'prep', label: 'Prép. Rendez-vous', icon: '📋', skill: 'sales-prep', desc: 'Brief complet avant meeting' },
  { id: 'outreach', label: 'Séquence Outreach', icon: '✉️', skill: 'sales-outreach', desc: 'Emails de prospection personnalisés' },
  { id: 'objections', label: 'Objections', icon: '🛡️', skill: 'sales-objections', desc: 'Playbook de réponses aux objections' },
  { id: 'proposal', label: 'Proposition Commerciale', icon: '📄', skill: 'sales-proposal', desc: 'Générer une proposition client' },
  { id: 'icp', label: 'Profil Client Idéal', icon: '🧩', skill: 'sales-icp', desc: 'Construire votre ICP' },
]

export default function AccountPlan() {
  const [step, setStep] = useState('form')
  const [companyUrl, setCompanyUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [selectedModules, setSelectedModules] = useState(['research', 'prospect', 'qualify', 'contacts', 'competitors'])
  const [currentModule, setCurrentModule] = useState(null)
  const [results, setResults] = useState({})
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    setUploading(true)
    for (const file of fileList) {
      try {
        const result = await uploadFile(file)
        setUploadedFiles(prev => [...prev, { name: result.filename, size_kb: result.size_kb }])
      } catch (err) {
        alert(`Erreur upload ${file.name}: ${err.message}`)
      }
    }
    setUploading(false)
  }

  const removeFile = (name) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name))
  }

  const toggleModule = (id) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const buildPrompt = (mod) => {
    const module = MODULES.find(m => m.id === mod)
    const baseContext = `Contexte Account Plan pour ${companyName} (${companyUrl}).`

    const filesContext = uploadedFiles.length > 0
      ? `\n\nDOCUMENTS FOURNIS — Lis chaque fichier avec l'outil read_file pour enrichir ton analyse :\n${uploadedFiles.map(f => `- "${f.name}" (${f.size_kb} KB)`).join('\n')}\nCes documents contiennent des informations internes sur le compte (présentations, rapports, historique commercial, contacts). Intègre les données extraites dans ton analyse.`
      : ''

    const previousResults = Object.entries(results)
      .map(([key, val]) => `[Résultats ${key}]: ${val.substring(0, 500)}...`)
      .join('\n')

    const prompts = {
      research: `${baseContext}${filesContext}\nFais une recherche approfondie sur l'entreprise ${companyUrl}. Commence par lire les documents fournis puis complète avec la recherche web. Couvre : overview, business model, produit/techno, leadership, funding, position marché, culture, développements récents. Donne un Company Fit Score /100.`,
      prospect: `${baseContext}${filesContext}\n${previousResults}\nFais une analyse prospect complète de ${companyUrl}. Exploite les documents fournis pour enrichir l'analyse. Donne un Prospect Score /100 avec détail par catégorie (Company Fit, Contact Access, Opportunity Quality, Competitive Position, Outreach Readiness). Identifie les 3 meilleures opportunités et les 3 risques.`,
      qualify: `${baseContext}${filesContext}\n${previousResults}\nQualifie le lead ${companyName} (${companyUrl}) avec les frameworks BANT et MEDDPICC. Utilise les documents fournis pour des données internes. Score chaque dimension. Identifie les buying signals et red flags.`,
      contacts: `${baseContext}${filesContext}\n${previousResults}\nIdentifie les décideurs clés chez ${companyName} (${companyUrl}). Cherche dans les documents fournis les noms et contacts internes. Cartographie le buying center : Economic Buyer, Champion, Technical Evaluator, End User, Blocker. Donne les top 3 contacts prioritaires avec stratégie d'approche.`,
      competitors: `${baseContext}${filesContext}\n${previousResults}\nAnalyse concurrentielle pour ${companyName} (${companyUrl}). Exploite les documents fournis pour identifier les concurrents mentionnés. Détecte les solutions actuellement utilisées, évalue les coûts de switching, crée des battle cards pour chaque concurrent détecté.`,
      prep: `${baseContext}${filesContext}\n${previousResults}\nPrépare un brief de rendez-vous complet pour ${companyName} (${companyUrl}). Intègre les données des documents fournis. Inclus : résumé entreprise, points clés à aborder, questions à poser, pièges à éviter, stratégie de négo.`,
      outreach: `${baseContext}${filesContext}\n${previousResults}\nCrée une séquence d'emails de prospection pour ${companyName}. 3 emails : cold outreach, follow-up, break-up. Personnalisés avec les données de recherche et les documents fournis.`,
      objections: `${baseContext}${filesContext}\n${previousResults}\nCrée un playbook d'objections pour la vente à ${companyName}. Utilise les documents fournis pour anticiper les objections spécifiques. Anticipe les 5-7 objections les plus probables et prépare des réponses persuasives.`,
      proposal: `${baseContext}${filesContext}\n${previousResults}\nGénère une proposition commerciale pour ${companyName}. Exploite les documents fournis. Inclus : executive summary, problèmes identifiés, solution proposée, ROI estimé, timeline, pricing, next steps.`,
      icp: `${baseContext}${filesContext}\n${previousResults}\nBasé sur l'analyse de ${companyName} et les documents fournis, construis ou affine le Profil Client Idéal (ICP). Décris le client cible idéal en termes de taille, secteur, tech stack, pain points, budget, cycle d'achat.`,
    }
    return prompts[mod] || `${baseContext}${filesContext}\nAnalyse ${module.label} pour ${companyUrl}`
  }

  const runAccountPlan = async () => {
    if (!companyUrl.trim() || !companyName.trim()) return
    setStep('running')
    setLoading(true)
    setMessages([])
    setResults({})
    setProgress(0)

    const modulesToRun = MODULES.filter(m => selectedModules.includes(m.id))

    for (let i = 0; i < modulesToRun.length; i++) {
      const mod = modulesToRun[i]
      setCurrentModule(mod)
      setProgress(Math.round((i / modulesToRun.length) * 100))

      setMessages(prev => [...prev, {
        role: 'system',
        content: `${mod.icon} Lancement : ${mod.label}...`
      }])

      const prompt = buildPrompt(mod.id)
      let assistantContent = ''
      let toolCalls = []

      setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [], streaming: true }])

      try {
        await streamMessage(prompt, conversationId, (event) => {
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

        setResults(prev => ({ ...prev, [mod.id]: assistantContent }))
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Erreur sur ${mod.label}: ${err.message}`
        }])
      }
    }

    setProgress(100)
    setCurrentModule(null)
    setLoading(false)
    setMessages(prev => [...prev, {
      role: 'system',
      content: `Account Plan terminé ! ${Object.keys(results).length + 1} modules complétés.`
    }])
  }

  const handleExportPptx = async () => {
    setExporting(true)
    try {
      const sections = MODULES
        .filter(m => results[m.id])
        .map(m => ({ title: m.label, content: results[m.id] }))
      await exportPptx(`Account Plan : ${companyName}`, sections)
    } catch (err) {
      alert('Erreur export PowerPoint: ' + err.message)
    }
    setExporting(false)
  }

  if (step === 'form') {
    return (
      <div style={styles.container}>
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Créer votre Account Plan</h2>
          <p style={styles.formDesc}>
            Générez un plan de compte stratégique complet en sélectionnant les modules d'analyse souhaités.
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nom de l'entreprise</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Salesforce, BNP Paribas..."
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>URL du site web</label>
            <input
              type="text"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://www.example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Documents de support (optionnel)</label>
            <p style={styles.filesHint}>
              Déposez vos fichiers internes : présentations, rapports, historique commercial, organigrammes, etc.
            </p>
            <div
              style={styles.dropZone}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.txt,.json,.docx,.pptx,.md"
                style={{ display: 'none' }}
                onChange={(e) => handleFiles(e.target.files)}
              />
              {uploading ? (
                <p style={styles.dropText}>Upload en cours...</p>
              ) : (
                <>
                  <p style={styles.dropText}>📎 Glissez vos fichiers ici ou cliquez pour parcourir</p>
                  <p style={styles.dropHint}>Excel, CSV, PDF, Word, PowerPoint, TXT, JSON</p>
                </>
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <div style={styles.filesList}>
                {uploadedFiles.map(f => (
                  <div key={f.name} style={styles.fileItem}>
                    <span style={styles.fileName}>📄 {f.name}</span>
                    <span style={styles.fileSize}>{f.size_kb} KB</span>
                    <button onClick={() => removeFile(f.name)} style={styles.fileRemove}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Modules d'analyse</label>
            <div style={styles.modulesGrid}>
              {MODULES.map(mod => (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    ...styles.moduleCard,
                    borderColor: selectedModules.includes(mod.id) ? '#6366f1' : '#334155',
                    background: selectedModules.includes(mod.id) ? '#1e1b4b' : '#1e293b',
                  }}
                >
                  <div style={styles.moduleHeader}>
                    <span style={styles.moduleIcon}>{mod.icon}</span>
                    <span style={styles.moduleLabel}>{mod.label}</span>
                    <span style={{
                      ...styles.moduleCheck,
                      opacity: selectedModules.includes(mod.id) ? 1 : 0.3,
                    }}>
                      {selectedModules.includes(mod.id) ? '✓' : '○'}
                    </span>
                  </div>
                  <p style={styles.moduleDesc}>{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runAccountPlan}
            disabled={!companyUrl.trim() || !companyName.trim() || selectedModules.length === 0}
            style={{
              ...styles.launchBtn,
              opacity: (!companyUrl.trim() || !companyName.trim() || selectedModules.length === 0) ? 0.5 : 1,
            }}
          >
            Lancer l'analyse ({selectedModules.length} modules)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.runningHeader}>
        <div>
          <h2 style={styles.runningTitle}>Account Plan : {companyName}</h2>
          <p style={styles.runningUrl}>{companyUrl}</p>
        </div>
        {!loading && (
          <div style={styles.runningActions}>
            {Object.keys(results).length > 0 && (
              <button onClick={handleExportPptx} disabled={exporting} style={styles.exportBtn}>
                {exporting ? 'Export...' : '📊 Exporter en PowerPoint'}
              </button>
            )}
            <button onClick={() => { setStep('form'); setMessages([]); setResults({}) }} style={styles.backBtn}>
              Nouveau plan
            </button>
          </div>
        )}
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <div style={styles.progressInfo}>
        {loading && currentModule ? (
          <span>{currentModule.icon} {currentModule.label} en cours...</span>
        ) : loading ? (
          <span>Initialisation...</span>
        ) : (
          <span>Terminé - {Object.keys(results).length} modules complétés</span>
        )}
        <span>{progress}%</span>
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
  formTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: 8,
  },
  formDesc: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: 20,
  },
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
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  moduleCard: {
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  moduleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  moduleIcon: { fontSize: 16 },
  moduleLabel: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', flex: 1 },
  moduleCheck: { fontSize: 14, color: '#6366f1' },
  moduleDesc: { fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 },
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
  runningUrl: { fontSize: 12, color: '#64748b', margin: '4px 0 0' },
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
  progressBar: {
    height: 4,
    background: '#1e293b',
    margin: '0 20px',
  },
  progressFill: {
    height: '100%',
    background: '#6366f1',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 20px',
    fontSize: 12,
    color: '#94a3b8',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
  },
  filesHint: {
    fontSize: 12,
    color: '#64748b',
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  dropZone: {
    border: '2px dashed #334155',
    borderRadius: 10,
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropText: { fontSize: 14, marginBottom: 4, color: '#e2e8f0', margin: 0 },
  dropHint: { fontSize: 11, color: '#64748b', margin: '4px 0 0' },
  filesList: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1e293b',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
  },
  fileName: { flex: 1, color: '#e2e8f0' },
  fileSize: { color: '#64748b', fontSize: 11 },
  fileRemove: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 4px',
  },
}
