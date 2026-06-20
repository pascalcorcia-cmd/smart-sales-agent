import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: 14,
        background: isUser ? '#6366f1' : isSystem ? '#1e3a5f' : '#1e293b',
        color: isSystem ? '#93c5fd' : '#e2e8f0',
        fontSize: 14,
        lineHeight: 1.6,
        borderBottomRightRadius: isUser ? 4 : 14,
        borderBottomLeftRadius: isUser ? 14 : 4,
      }}>
        {isUser || isSystem ? (
          <span>{message.content}</span>
        ) : (
          <div className="markdown-content" style={{ wordBreak: 'break-word' }}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
