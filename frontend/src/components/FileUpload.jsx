import React, { useRef, useState } from 'react'

export default function FileUpload({ onUpload, onClose }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div style={styles.overlay}>
      <div
        style={{ ...styles.dropZone, borderColor: dragging ? '#6366f1' : '#334155' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          accept=".xlsx,.xls,.csv,.pdf,.txt,.json"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <p>Upload en cours...</p>
        ) : (
          <>
            <p style={styles.dropText}>📎 Glissez un fichier ici ou cliquez</p>
            <p style={styles.dropHint}>Excel, CSV, PDF, TXT, JSON</p>
          </>
        )}
      </div>
      <button onClick={onClose} style={styles.closeBtn}>Fermer</button>
    </div>
  )
}

const styles = {
  overlay: {
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
  },
  dropZone: {
    border: '2px dashed #334155',
    borderRadius: 12,
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dropText: { fontSize: 15, marginBottom: 4, color: '#e2e8f0' },
  dropHint: { fontSize: 12, color: '#64748b' },
  closeBtn: {
    marginTop: 8,
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 13,
  },
}
