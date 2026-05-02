'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  Zap, MessageSquare, Sparkles, Smartphone, 
  Image as ImageIcon, FileText, LayoutTemplate,
  ArrowUp, Paperclip, X, Search, Plus, Trash2, Globe, Briefcase
} from 'lucide-react'

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
      setArquivo({ base64, type: file.type, name: file.name || 'imagem-colada.png' })
      if (file.type.startsWith('image/')) setPreview(result)
      else setPreview(null)
    }
    reader.readAsDataURL(file)
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading) return
    
    // Simples redirecionamento para o chat com a mensagem inicial
    // Ou processar aqui mesmo se preferir
    const text = input.trim()
    setLoading(true)

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: text.slice(0, 50) })
      })
      const data = await res.json()
      if (data.id) {
        window.location.href = `/chat/${data.id}?firstMessage=${encodeURIComponent(text)}`
      }
    } catch {
      setLoading(false)
    }
  }

  const atalhos = [
    { icon: <FileText size={24} color="#10B981" />, title: 'Matéria jornalística', text: 'Escreva uma matéria jornalística sobre: ', bg: 'rgba(16, 185, 129, 0.1)' },
    { icon: <Globe size={24} color="#3B82F6" />, title: 'Ler link', text: 'Leia este link e transforme em uma matéria: ', bg: 'rgba(59, 130, 246, 0.1)' },
    { icon: <Smartphone size={24} color="#F59E0B" />, title: 'Post Instagram', text: 'Crie uma legenda para Instagram sobre: ', bg: 'rgba(245, 158, 11, 0.1)' },
    { icon: <ImageIcon size={24} color="#8B5CF6" />, title: 'Analisar imagem', text: 'Analise esta imagem de forma profissional.', bg: 'rgba(139, 92, 246, 0.1)' }
  ]

  return (
    <div className="home-container">
      <style>{`
        .home-container {
          padding: 60px 40px;
          max-width: 1000px;
          margin: 0 auto;
          color: #F8FAFC;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 64px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 6px 14px;
          border-radius: 20px;
          color: #10B981;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
          background: linear-gradient(to right, #F8FAFC, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 18px;
          color: #94A3B8;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }

        .shortcut-card {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 32px 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }

        .shortcut-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(16, 185, 129, 0.3);
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
        }

        .icon-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .shortcut-title {
          font-weight: 700;
          font-size: 17px;
          margin-bottom: 8px;
        }

        .shortcut-desc {
          font-size: 13px;
          color: #64748B;
          line-height: 1.5;
        }

        .input-area-fixed {
          position: fixed;
          bottom: 40px;
          left: 300px;
          right: 40px;
          max-width: 800px;
          margin: 0 auto;
          z-index: 50;
        }

        @media (max-width: 1024px) {
          .input-area-fixed { left: 40px; }
        }

        .input-glass-box {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #F8FAFC;
          padding: 12px;
          resize: none;
          font-size: 16px;
          min-height: 48px;
          max-height: 200px;
        }

        .send-btn-main {
          width: 48px;
          height: 48px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn-main:hover:not(:disabled) {
          background: #059669;
          transform: scale(1.05);
        }

        .send-btn-main:disabled {
          background: #1E293B;
          color: #475569;
          cursor: not-allowed;
        }
      `}</style>

      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} />
          Agente Ativo
        </div>
        <h1 className="hero-title">Super Agente</h1>
        <p className="hero-subtitle">
          Sua inteligência artificial avançada para produção de conteúdo, 
          estratégia de marketing e gestão jornalística regional.
        </p>

        <div className="shortcut-grid">
          {atalhos.map((a, i) => (
            <div key={i} className="shortcut-card" onClick={() => setInput(a.text)}>
              <div className="icon-box" style={{ background: a.bg }}>
                {a.icon}
              </div>
              <div className="shortcut-title">{a.title}</div>
              <div className="shortcut-desc">{a.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="input-area-fixed">
        <div className="input-glass-box">
          <button 
            className="send-btn-main" 
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          <textarea
            className="chat-textarea"
            placeholder="Como posso ajudar você hoje?"
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
            className="send-btn-main" 
            onClick={enviar}
            disabled={loading || (!input.trim() && !arquivo)}
          >
            {loading ? <div className="loading-dots">...</div> : <ArrowUp size={20} />}
          </button>
        </div>
      </div>
      
      <input 
        ref={fileRef}
        type="file" 
        style={{ display: 'none' }} 
        onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])}
      />
    </div>
  )
}