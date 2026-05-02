'use client'

import { useState } from 'react'
import { Sandpack } from '@codesandbox/sandpack-react'
import { Eye, EyeOff } from 'lucide-react'

export default function CodePreview({ code }: { code: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? '#FFFFFF' : '#F59E0B',
          color: open ? '#374151' : '#FFFFFF',
          padding: '8px 14px',
          borderRadius: 10,
          border: open ? '1px solid #D1D5DB' : '1px solid #F59E0B',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
          boxShadow: open ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.2)'
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = '#D97706'
            e.currentTarget.style.borderColor = '#D97706'
          } else {
            e.currentTarget.style.background = '#F9FAFB'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = '#F59E0B'
            e.currentTarget.style.borderColor = '#F59E0B'
          } else {
            e.currentTarget.style.background = '#FFFFFF'
          }
        }}
      >
        {open ? <EyeOff size={14} /> : <Eye size={14} />}
        {open ? 'Fechar visualização' : 'Visualizar código'}
      </button>

      {open && (
        <div
          style={{
            marginTop: 12,
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
          }}
        >
          <Sandpack
            template="react"
            files={{
              '/App.js': code
            }}
            theme={{
              colors: {
                surface1: '#FFFFFF',
                surface2: '#F9FAFB',
                surface3: '#F3F4F6',
                clickable: '#6B7280',
                base: '#0F1B33',
                disabled: '#D1D5DB',
                hover: '#0F1B33',
                accent: '#F59E0B',
                error: '#DC2626',
                errorSurface: '#FEF2F2'
              },
              syntax: {
                plain: '#0F1B33',
                comment: { color: '#6B7280', fontStyle: 'italic' },
                keyword: '#F59E0B',
                tag: '#0F1B33',
                punctuation: '#6B7280',
                definition: '#0F1B33',
                property: '#B45309',
                static: '#10B981',
                string: '#059669'
              },
              font: {
                body: '"Geist", -apple-system, sans-serif',
                mono: '"Menlo", "Monaco", "Courier New", monospace',
                size: '13px',
                lineHeight: '1.6'
              }
            }}
            options={{
              editorHeight: 420,
              showNavigator: false,
              showTabs: true,
              showLineNumbers: true,
              showInlineErrors: true,
              wrapContent: true,
              externalResources: []
            }}
          />
        </div>
      )}
    </div>
  )
}