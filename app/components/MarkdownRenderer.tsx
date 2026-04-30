'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface MarkdownRendererProps {
  children: string
}

export default function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 style={{
              fontSize: 22,
              fontWeight: 500,
              marginTop: 16,
              marginBottom: 8,
              color: '#2C2C2A'
            }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 style={{
              fontSize: 18,
              fontWeight: 500,
              marginTop: 16,
              marginBottom: 8,
              color: '#2C2C2A'
            }} {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 style={{
              fontSize: 16,
              fontWeight: 500,
              marginTop: 14,
              marginBottom: 6,
              color: '#2C2C2A'
            }} {...props} />
          ),
          p: ({ node, ...props }) => (
            <p style={{
              fontSize: 14,
              lineHeight: 1.7,
              margin: '8px 0',
              color: '#2C2C2A'
            }} {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul style={{
              paddingLeft: 24,
              margin: '8px 0',
              listStyleType: 'disc'
            }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol style={{
              paddingLeft: 24,
              margin: '8px 0',
              listStyleType: 'decimal'
            }} {...props} />
          ),
          li: ({ node, ...props }) => (
            <li style={{
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 4,
              color: '#2C2C2A'
            }} {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong style={{
              fontWeight: 600,
              color: '#2C2C2A'
            }} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em style={{
              fontStyle: 'italic'
            }} {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#185FA5',
                textDecoration: 'underline'
              }}
              {...props}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  style={{
                    background: '#F1EFE8',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'Menlo, Monaco, monospace',
                    fontSize: 13,
                    color: '#A32D2D'
                  }}
                  {...props}
                >
                  {children}
                </code>
              )
            }
            // Bloco de código será capturado pelo CodePreview, 
            // mas caso passe direto, renderiza com estilo
            return (
              <pre style={{
                background: '#F8F7F2',
                padding: 12,
                borderRadius: 8,
                overflow: 'auto',
                fontFamily: 'Menlo, Monaco, monospace',
                fontSize: 13,
                margin: '8px 0',
                border: '0.5px solid #E5E3DC'
              }}>
                <code {...props}>{children}</code>
              </pre>
            )
          },
          blockquote: ({ node, ...props }) => (
            <blockquote style={{
              borderLeft: '3px solid #BA7517',
              paddingLeft: 14,
              margin: '12px 0',
              color: '#5F5E5A',
              fontStyle: 'italic'
            }} {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr style={{
              border: 'none',
              borderTop: '0.5px solid #E5E3DC',
              margin: '16px 0'
            }} {...props} />
          ),
          table: ({ node, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: 13,
                border: '0.5px solid #E5E3DC',
                borderRadius: 8,
                overflow: 'hidden'
              }} {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead style={{
              background: '#F8F7F2'
            }} {...props} />
          ),
          th: ({ node, ...props }) => (
            <th style={{
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: 500,
              borderBottom: '0.5px solid #E5E3DC'
            }} {...props} />
          ),
          td: ({ node, ...props }) => (
            <td style={{
              padding: '8px 12px',
              borderBottom: '0.5px solid #E5E3DC'
            }} {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
