import React, { useState } from 'react'

const TOOL_LABELS = {
  web_search: '🔍 Recherche web',
  read_file: '📄 Lecture fichier',
  write_file: '💾 Écriture fichier',
  list_files: '📁 Liste fichiers',
  call_api: '🌐 Appel API',
  execute_python: '💻 Code Python',
}

export default function ToolOutput({ toolCall }) {
  const [expanded, setExpanded] = useState(false)

  const label = TOOL_LABELS[toolCall.tool] || toolCall.tool
  const isRunning = toolCall.status === 'running'
  const downloadName = toolCall.tool === 'write_file' && toolCall.result?.status === 'success'
    ? toolCall.result.filename
    : null

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => !isRunning && setExpanded(!expanded)}>
        <span style={styles.label}>
          {label}
          {isRunning && <span style={styles.spinner}> ⏳</span>}
          {!isRunning && <span style={styles.check}> ✓</span>}
        </span>
        <span style={styles.headerRight}>
          {downloadName && (
            <a
              href={`/api/files/${encodeURIComponent(downloadName)}`}
              download={downloadName}
              onClick={(e) => e.stopPropagation()}
              style={styles.downloadLink}
            >
              ⬇ Télécharger
            </a>
          )}
          {!isRunning && (
            <span style={styles.toggle}>{expanded ? '▲' : '▼'}</span>
          )}
        </span>
      </div>
      {expanded && toolCall.result && (
        <pre style={styles.result}>
          {JSON.stringify(toolCall.result, null, 2).slice(0, 2000)}
        </pre>
      )}
    </div>
  )
}

const styles = {
  container: {
    margin: '8px 0',
    borderRadius: 8,
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    background: '#1e293b',
    cursor: 'pointer',
    fontSize: 13,
  },
  label: { fontWeight: 500, color: '#94a3b8' },
  spinner: { },
  check: { color: '#22c55e' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  downloadLink: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 600,
    textDecoration: 'none',
  },
  toggle: { color: '#64748b', fontSize: 11 },
  result: {
    padding: '10px 14px',
    background: '#0f172a',
    color: '#94a3b8',
    fontSize: 12,
    overflow: 'auto',
    maxHeight: 300,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}
