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
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 8,
              color: '#0F1B33',
              letterSpacing: '-0.02em'
            }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              marginTop: 16,
              marginBottom: 8,
              color: '#0F1B33',
              letterSpacing: '-0.01em'
            }} {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              marginTop: 14,
              marginBottom: 6,
              color: '#0F1B33'
            }} {...props} />
          ),
          p: ({ node, ...props }) => (
            <p style={{
              fontSize: 15,
              lineHeight: 1.7,
              margin: '8px 0',
              color: '#374151'
            }} {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul style={{
              paddingLeft: 24,
              margin: '8px 0',
              listStyleType: 'disc',
              color: '#374151'
            }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol style={{
              paddingLeft: 24,
              margin: '8px 0',
              listStyleType: 'decimal',
              color: '#374151'
            }} {...props} />
          ),
          li: ({ node, ...props }) => (
            <li style={{
              fontSize: 15,
              lineHeight: 1.7,
              marginBottom: 4,
              color: '#374151'
            }} {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong style={{
              fontWeight: 700,
              color: '#0F1B33'
            }} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em style={{
              fontStyle: 'italic',
              color: '#4B5563'
            }} {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#F59E0B',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                fontWeight: 500
              }}
              {...props}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  style={{
                    background: '#FEF3C7',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 13,
                    color: '#B45309',
                    fontWeight: 500
                  }}
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre style={{
                background: '#F9FAFB',
                padding: 14,
                borderRadius: 10,
                overflow: 'auto',
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 13,
                margin: '12px 0',
                border: '1px solid #E5E7EB',
                color: '#0F1B33',
                lineHeight: 1.6
              }}>
                <code {...props}>{children}</code>
              </pre>
            )
          },
          blockquote: ({ node, ...props }) => (
            <blockquote style={{
              borderLeft: '3px solid #F59E0B',
              paddingLeft: 14,
              margin: '12px 0',
              color: '#6B7280',
              fontStyle: 'italic',
              background: '#FFFBEB',
              padding: '10px 14px',
              borderRadius: '0 8px 8px 0'
            }} {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr style={{
              border: 'none',
              borderTop: '1px solid #E5E7EB',
              margin: '16px 0'
            }} {...props} />
          ),
          table: ({ node, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: 13,
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                overflow: 'hidden'
              }} {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead style={{
              background: '#F9FAFB'
            }} {...props} />
          ),
          th: ({ node, ...props }) => (
            <th style={{
              padding: '10px 14px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#0F1B33',
              borderBottom: '1px solid #E5E7EB'
            }} {...props} />
          ),
          td: ({ node, ...props }) => (
            <td style={{
              padding: '10px 14px',
              borderBottom: '1px solid #F3F4F6',
              color: '#374151'
            }} {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}