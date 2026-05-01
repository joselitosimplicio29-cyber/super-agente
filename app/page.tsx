'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Message = {
  role: 'user' | 'assistant'
  content: string | any[]
  preview?: string
  fileName?: string
}

type Client = {
  id: string
  nome: string
  instagram?: string
  nicho?: string
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Client[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<{ base64: string; type: string; name: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/cadastrar-cliente')
      .then(r => r.json())
      .then(d => {
        if (d.clientes) setClientes(d.clientes)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function textoMensagem(content: string | any[]) {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content.find((item: any) => item.type === 'text')?.text || ''
    }
    return ''
  }

  function handleArquivo(file: File) {
    const reader = new FileReader()

    reader.onload = e => {
      const result = e.target?.result as string
      const base64 = result.split(',')[1]

      setArquivo({
        base64,
        type: file.type,
        name: file.name || 'imagem-colada.png'
      })

      if (file.type.startsWith('image/')) {
        setPreview(result)
      } else {
        setPreview(null)
      }
    }

    reader.readAsDataURL(file)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items)

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleArquivo(file)
        }
      }
    }
  }

  function removerArquivo() {
    setArquivo(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function montarUserContent() {
    const content: any[] = []

    if (arquivo) {
      if (arquivo.type.startsWith('image/')) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: arquivo.type,
            data: arquivo.base64
          }
        })
      }

      if (arquivo.type === 'application/pdf') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: arquivo.base64
          }
        })
      }
    }

    if (input.trim()) {
      content.push({
        type: 'text',
        text: input.trim()
      })
    } else if (arquivo?.type.startsWith('image/')) {
      content.push({
        type: 'text',
        text: 'Analise esta imagem de forma profissional.'
      })
    } else if (arquivo?.type === 'application/pdf') {
      content.push({
        type: 'text',
        text: 'Leia e resuma este documento.'
      })
    }

    return content
  }

  async function criarConversa() {
    const titulo = input.trim().slice(0, 50) || 'Nova conversa'

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteSelecionado?.id, titulo })
      })

      const data = await res.json()
      if (data.id) {
        setConversationId(data.id)
        return data.id
      }
    } catch {}

    return null
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading) return

    const userContent = montarUserContent()

    const userMsg: Message = {
      role: 'user',
      content: userContent,
      preview: preview || undefined,
      fileName: arquivo?.name
    }

    const newMessages = [...messages, userMsg]

    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setArquivo(null)
    setPreview(null)
    setLoading(true)

    if (fileRef.current) fileRef.current.value = ''

    let convId = conversationId
    if (!convId) convId = await criarConversa()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          conversation_id: convId,
          cliente: clienteSelecionado
        })
      })

      if (!response.ok || !response.body) {
        throw new Error('Não foi possível gerar resposta.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        result += chunk

        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: result }]
          }
          return prev
        })
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `Erro: ${error.message || 'não consegui responder agora.'}`
        }
      ])
    }

    setLoading(false)
  }

  const menu = [
    { icon: '💬', label: 'Chat' },
    { icon: '✨', label: 'Criar' },
    { icon: '📰', label: 'Matérias' },
    { icon: '📸', label: 'Imagens' },
    { icon: '📄', label: 'PDFs' },
    { icon: '👥', label: 'Clientes' },
    { icon: '🗂️', label: 'Histórico' }
  ]

  const atalhos = [
    {
      icon: '📰',
      title: 'Matéria jornalística',
      text: 'Escreva uma matéria jornalística sobre: '
    },
    {
      icon: '🔗',
      title: 'Ler link',
      text: 'Leia este link e transforme em uma matéria jornalística: '
    },
    {
      icon: '📱',
      title: 'Post Instagram',
      text: 'Crie uma legenda para Instagram sobre: '
    },
    {
      icon: '📸',
      title: 'Analisar imagem',
      text: 'Analise esta imagem de forma profissional.'
    }
  ]

  return (
    <div className="app">
      <style>{`
        .page-container {
          padding: 40px 24px;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 60px;
          padding-top: 40px;
        }

        .hero-title {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(to right, #F8FAFC, #10B981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }

        .hero-subtitle {
          color: #94A3B8;
          font-size: 16px;
          max-width: 500px;
          margin: 0 auto;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 40px;
        }

        .shortcut-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .shortcut-card:hover {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }

        .shortcut-icon {
          font-size: 24px;
          margin-bottom: 16px;
          display: block;
        }

        .shortcut-title {
          font-weight: 600;
          color: #F8FAFC;
          font-size: 15px;
          margin-bottom: 8px;
        }

        .shortcut-desc {
          color: #64748B;
          font-size: 12px;
          line-height: 1.5;
        }

        .chat-input-wrapper {
          position: fixed;
          bottom: 32px;
          left: 300px; /* Sidebar width + gap */
          right: 40px;
          max-width: 800px;
          margin: 0 auto;
          z-index: 40;
        }

        @media (max-width: 1024px) {
          .chat-input-wrapper {
            left: 40px;
          }
        }

        .chat-input-container {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #F8FAFC;
          padding: 12px;
          resize: none;
          font-size: 15px;
          min-height: 44px;
          max-height: 200px;
        }

        .action-btn {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: none;
          background: #10B981;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #059669;
          transform: scale(1.05);
        }

        .action-btn:disabled {
          background: #334155;
          cursor: not-allowed;
        }

        .message-row {
          display: flex;
          margin-bottom: 24px;
          padding: 0 20px;
        }
        .message-row.user { justify-content: flex-end; }
        .bubble {
          max-width: 80%;
          padding: 16px 20px;
          border-radius: 20px;
          line-height: 1.6;
          font-size: 15px;
        }
        .message-row.user .bubble {
          background: #10B981;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message-row.assistant .bubble {
          background: rgba(255,255,255,0.05);
          color: #F8FAFC;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>

    <div className="page-container">
      <div className="hero-section">
        <div className="hero-title">Super Agente</div>
        <p className="hero-subtitle">
          Sua inteligência artificial para produção de conteúdo e gestão de agência.
        </p>

        <div className="shortcut-grid">
          {atalhos.map((a, i) => (
            <div key={i} className="shortcut-card" onClick={() => setInput(a.text)}>
              <span className="shortcut-icon">{a.icon}</span>
              <div className="shortcut-title">{a.title}</div>
              <div className="shortcut-desc">{a.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="messages-list" style={{ paddingBottom: 120 }}>
        {messages.map((m, i) => (
          <div key={i} className={`message-row ${m.role}`}>
             <div className="bubble">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>
                 {textoMensagem(m.content)}
               </ReactMarkdown>
             </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleArquivo(file)
            }}
          />
          <button 
            className="action-btn" 
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
            onClick={() => fileRef.current?.click()}
          >
            📎
          </button>
          <textarea
            className="chat-textarea"
            placeholder="Como posso ajudar hoje?"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar()
              }
            }}
          />
          <button 
            className="action-btn" 
            onClick={enviar}
            disabled={loading || (!input.trim() && !arquivo)}
          >
            {loading ? '...' : '→'}
          </button>
        </div>
        {preview && (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 12 }}>
            <img src={preview} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} alt="Preview" />
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{arquivo?.name}</span>
            <button onClick={removerArquivo} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>Remover</button>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}