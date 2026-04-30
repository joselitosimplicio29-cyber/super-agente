'use client'

import { useState } from 'react'
import { Sandpack } from '@codesandbox/sandpack-react'

export default function CodePreview({ code }: { code: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: '#2563eb',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {open ? 'Fechar visualização' : 'Visualizar código'}
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <Sandpack
            template="react"
            files={{
              '/App.js': code
            }}
            options={{
              editorHeight: 400
            }}
          />
        </div>
      )}
    </div>
  )
}