'use client'

import { useState, useEffect, useRef } from 'react'
import CodePreview from '../components/CodePreview'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { 
  Zap, Home, MessageSquare, Folder, Image as ImageIcon, 
  FileText, Smartphone, LayoutTemplate, 
  ChevronDown, User, Plus, Globe, Mic, ArrowUp, Lock, Sparkles, 
  ArrowRight, X, Paperclip 
} from 'lucide-react'

function extractCode(text: string) {
  const match = text.match(/```(?:jsx|tsx|js|javascript|react)?\n([\s\S]*?)```/)
  return match ? match[1] : null
}

function stripCode(text: string) {
  return text.replace(/```(?:jsx|tsx|js|javascript|react)?\n[\s\S]*?```/g, '').trim()
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  preview?: string
  fileName?: string
  isImage?: boolean
}

interface Client {
  id: string
  nome: string
  instagram?: string
  nicho?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Client[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<{ base64: string; type: string; name: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [gerandoImagem, setGerandoImagem] = useState(false)
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
  }, [messages, loading, gerandoImagem])

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

  async function gerarImagem(prompt: string) {
    setGerandoImagem(true)
    
    try {
      const res = await fetch('/api/gerar-imagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      const data = await res.json()
      
      if (data.success && data.imageUrl) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `Aqui está a imagem gerada para: "${prompt}"`,
            preview: data.imageUrl,
            isImage: true
          }
        ])
      } else {
        throw new Error(data.error || 'Erro desconhecido ao gerar imagem')
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Erro ao gerar imagem: ${error.message}` }
      ])
    } finally {
      setGerandoImagem(false)
    }
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading || gerandoImagem) return

    const isImageGenerationRequest = input.trim().toLowerCase().startsWith('gera uma imagem')

    const userContent = montarUserContent()

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
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
            content: m.preview && !m.isImage 
              ? montarUserContentForHistory(m) 
              : m.content
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
          const newM = [...prev]
          const last = newM[newM.length - 1]
          
          if (last && last.role === 'assistant') {
            newM.pop()
          }
          
          return [
            ...newM,
            { role: 'assistant', content: result }
          ]
        })
      }

      if (result.includes('GERAR_IMAGEM:')) {
        const match = result.match(/GERAR_IMAGEM:\s*(.+)/i)
        if (match) await gerarImagem(match[1].trim())
      }
    } catch {
      setMessages(prev => {
        const newM = [...prev]
        const last = newM[newM.length - 1]
        
        if (last && last.role === 'assistant') {
          newM.pop()
        }
        
        return [
          ...newM,
          { role: 'assistant', content: '❌ Erro ao conectar.' }
        ]
      })
    }

    setLoading(false)
  }

  function montarUserContentForHistory(msg: Message) {
     return msg.content; // Simplificado para evitar problemas
  }

  const modos = [
    { icon: <MessageSquare size={20} color="#10B981" />, bg: '#D1FAE5', label: 'Conversar', sub: 'Converse com IA sobre qualquer assunto.', prompt: '', acao: null },
    { icon: <Sparkles size={20} color="#F59E0B" />, bg: '#FEF3C7', label: 'Gerar Imagem', sub: 'Crie imagens incríveis com inteligência artificial.', prompt: 'Gera uma imagem de: ', acao: null },
    { icon: <Smartphone size={20} color="#3B82F6" />, bg: '#DBEAFE', label: 'Criar Post', sub: 'Gere legendas e hashtags para suas redes sociais.', prompt: 'Cria um post para Instagram sobre: ', acao: null },
    { icon: <ImageIcon size={20} color="#10B981" />, bg: '#D1FAE5', label: 'Analisar Imagem', sub: 'Envie uma imagem e receba análises e insights.', prompt: 'Analise esta imagem.', acao: 'imagem' },
    { icon: <FileText size={20} color="#8B5CF6" />, bg: '#EDE9FE', label: 'Ler PDF', sub: 'Resuma e extraia informações de documentos PDF.', prompt: 'Leia e resuma este documento.', acao: 'pdf' },
    { icon: <LayoutTemplate size={20} color="#8B5CF6" />, bg: '#EDE9FE', label: 'Criar Componente', sub: 'Gere componentes React com preview em tempo real.', prompt: 'Cria um componente React de: ', acao: null }
  ]

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          margin: 0;
          background: #FAFAF7;
        }

        .app {
          display: flex;
          height: 100vh;
          background: #FAFAF7;
          color: #2C2C2A;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }

        /* Sidebar Styles */
        .sidebar {
          width: 260px;
          background: #FFFFFF;
          border-right: 1px solid #E5E3DC;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-title {
          font-weight: 600;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .nav-menu {
          flex: 1;
          overflow-y: auto;
          padding: 0 16px;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #5F5E5A;
          transition: all 0.2s;
        }

        .nav-item.active {
          background: #F1EFE8;
          color: #2C2C2A;
        }

        .nav-item:hover:not(.active) {
          background: #FAFAF7;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: #888780;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 24px 0 12px 12px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #E5E3DC;
        }

        .plan-card {
          background: #FAFAF7;
          border: 1px solid #E5E3DC;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .plan-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .plan-label {
          font-size: 12px;
          font-weight: 500;
          color: #5F5E5A;
        }

        .plan-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .plan-desc {
          font-size: 12px;
          color: #888780;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .plan-btn {
          width: 100%;
          padding: 8px;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #2C2C2A;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .plan-btn:hover {
          border-color: #B4B2A9;
        }

        .client-select-wrapper {
          position: relative;
        }

        .client-select {
          width: 100%;
          appearance: none;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 12px;
          padding: 12px 36px 12px 12px;
          font-size: 14px;
          font-weight: 500;
          color: #2C2C2A;
          cursor: pointer;
          outline: none;
        }

        .client-select:hover {
          background: #FAFAF7;
        }

        /* Main Area Styles */
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          min-width: 0;
        }

        .topbar-btn {
          position: absolute;
          top: 16px;
          right: 24px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #2C2C2A;
          cursor: pointer;
        }

        .topbar-btn:hover {
          background: #F1EFE8;
        }

        .content-scroll {
          flex: 1;
          overflow-y: auto;
          position: relative;
          width: 100%;
        }

        /* Hero State */
        .hero-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 120px 24px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-icon {
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .hero-subtitle {
          font-size: 15px;
          color: #5F5E5A;
          margin-bottom: 48px;
        }

        /* Input Box */
        .input-container {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 24px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          padding: 8px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s;
          margin-bottom: 32px;
        }

        .input-container:focus-within {
          border-color: #B4B2A9;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .main-textarea {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          font-family: inherit;
          font-size: 15px;
          color: #2C2C2A;
          padding: 16px;
          min-height: 60px;
          max-height: 200px;
          line-height: 1.5;
        }

        .main-textarea::placeholder {
          color: #888780;
        }

        .input-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px 8px;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #5F5E5A;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .icon-btn:hover {
          background: #F1EFE8;
          color: #2C2C2A;
        }

        .chip-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid #E5E3DC;
          background: transparent;
          color: #5F5E5A;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .chip-btn:hover {
          background: #F1EFE8;
        }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #2C2C2A;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #000000;
        }

        .send-btn:disabled {
          background: #D3D1C7;
          cursor: default;
        }

        /* Action Cards */
        .cards-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .action-card {
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 16px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
        }

        .action-card:hover {
          border-color: #B4B2A9;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-icon-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .card-icon-bg {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-title {
          font-weight: 600;
          font-size: 14px;
        }

        .card-arrow {
          color: #888780;
          transition: transform 0.2s;
        }

        .action-card:hover .card-arrow {
          color: #2C2C2A;
          transform: translateX(2px);
        }

        .card-desc {
          font-size: 12px;
          color: #888780;
          line-height: 1.5;
        }

        .footer-text {
          margin-top: 48px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #888780;
        }

        /* Chat Mode Styles */
        .chat-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .message-row {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #FACC15;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .bubble {
          max-width: 85%;
          font-size: 15px;
          line-height: 1.6;
        }

        .bubble.user {
          background: #F1EFE8;
          padding: 12px 20px;
          border-radius: 20px;
          border-top-right-radius: 4px;
          white-space: pre-wrap;
        }

        .preview-img {
          max-width: 300px;
          width: 100%;
          border-radius: 12px;
          margin-bottom: 12px;
          object-fit: cover;
        }

        .file-attachment {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .copy-btn {
          margin-top: 12px;
          padding: 6px 12px;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #5F5E5A;
          cursor: pointer;
        }

        .copy-btn:hover {
          background: #F1EFE8;
        }

        /* Sticky Input Box */
        .sticky-input {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, #FAFAF7 80%, transparent);
          padding: 40px 24px 24px;
          pointer-events: none;
        }
        
        .sticky-input > div {
          pointer-events: auto;
          max-width: 800px;
          margin: 0 auto;
        }

        .chat-input-container {
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          border-radius: 24px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          padding: 8px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          transition: all 0.2s;
        }

        .chat-input-container:focus-within {
          border-color: #B4B2A9;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .chat-textarea {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          font-family: inherit;
          font-size: 15px;
          color: #2C2C2A;
          padding: 8px 4px;
          min-height: 40px;
          max-height: 150px;
          line-height: 1.5;
        }
        
        .attachment-preview {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FAFAF7;
          border: 1px solid #E5E3DC;
          border-radius: 12px;
          padding: 8px;
          width: max-content;
        }

        .attachment-thumb {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          object-fit: cover;
        }

        .attachment-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #FFFFFF;
          border: 1px solid #E5E3DC;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Animations */
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-header">
          <Zap size={24} fill="#FACC15" color="#FACC15" />
          <span className="brand-title">Super Agente</span>
        </div>

        <nav className="nav-menu">
          <div style={{ marginBottom: 32 }}>
            <button className="nav-item active">
              <Home size={18} />
              <span>Início</span>
            </button>
            <button className="nav-item">
              <MessageSquare size={18} />
              <span>Conversas</span>
            </button>
            <button className="nav-item">
              <Folder size={18} />
              <span>Projetos</span>
            </button>
          </div>

          <div className="section-title">Ferramentas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button className="nav-item" onClick={() => setInput('Gera uma imagem de: ')}>
              <Sparkles size={16} />
              <span>Gerar Imagem</span>
            </button>
            <button className="nav-item" onClick={() => fileRef.current?.click()}>
              <ImageIcon size={16} />
              <span>Analisar Imagem</span>
            </button>
            <button className="nav-item" onClick={() => fileRef.current?.click()}>
              <FileText size={16} />
              <span>Ler PDF</span>
            </button>
            <button className="nav-item" onClick={() => setInput('Cria um post para Instagram sobre: ')}>
              <Smartphone size={16} />
              <span>Criar Post</span>
            </button>
            <button className="nav-item" onClick={() => setInput('Cria um componente React de: ')}>
              <LayoutTemplate size={16} />
              <span>Criar Componente</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="plan-card">
            <div className="plan-header">
              <Sparkles size={16} color="#8B5CF6" />
              <span className="plan-label">Plano</span>
            </div>
            <div className="plan-name">Sem cliente</div>
            <div className="plan-desc">Atualize para desbloquear recursos avançados.</div>
            <button className="plan-btn">Ver planos</button>
          </div>

          <div className="client-select-wrapper">
            <select
              value={clienteSelecionado?.id || ''}
              onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) || null)}
              className="client-select"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232C2C2A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px top 50%', backgroundSize: '10px auto' }}
            >
              <option value="">SA Sem cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        <button 
          className="topbar-btn"
          onClick={() => {
            setMessages([])
            setConversationId(null)
          }}
        >
          <User size={16} color="#5F5E5A" />
          Sem cliente
          <ChevronDown size={14} color="#888780" />
        </button>

        <div className="content-scroll pb-32">
          {messages.length === 0 ? (
            <div className="hero-container">
              <Zap size={48} fill="#FACC15" color="#FACC15" className="hero-icon" />
              <h1 className="hero-title">Super Agente</h1>
              <p className="hero-subtitle">Como posso ajudar você hoje?</p>

              <div className="input-container">
                {(preview || arquivo) && (
                  <div className="attachment-preview" style={{ marginLeft: 16, marginTop: 8 }}>
                    {preview ? (
                      <img src={preview} alt="preview" className="attachment-thumb" />
                    ) : (
                      <div className="attachment-icon">
                        <FileText size={16} color="#5F5E5A" />
                      </div>
                    )}
                    <span style={{ fontSize: 13, color: '#5F5E5A', fontWeight: 500, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {arquivo?.name}
                    </span>
                    <button onClick={removerArquivo} className="icon-btn" style={{ width: 24, height: 24 }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      enviar()
                    }
                  }}
                  placeholder="Pergunte qualquer coisa..."
                  className="main-textarea"
                />
                
                <div className="input-toolbar">
                  <div className="toolbar-group">
                    <button onClick={() => fileRef.current?.click()} className="icon-btn">
                      <Plus size={20} />
                    </button>
                    <button className="chip-btn">
                      <Globe size={16} />
                      Buscar
                    </button>
                  </div>
                  <div className="toolbar-group">
                    <button className="icon-btn">
                      <Mic size={20} />
                    </button>
                    <button 
                      onClick={enviar}
                      disabled={loading || gerandoImagem || (!input.trim() && !arquivo)}
                      className="send-btn"
                    >
                      <ArrowUp size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])} style={{ display: 'none' }} />
              </div>

              <div className="cards-grid">
                {modos.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(m.prompt)
                      if (m.acao === 'imagem' || m.acao === 'pdf') {
                        fileRef.current?.click()
                      }
                    }}
                    className="action-card"
                  >
                    <div className="card-header">
                      <div className="card-icon-wrap">
                        <div className="card-icon-bg" style={{ backgroundColor: m.bg }}>
                          {m.icon}
                        </div>
                        <span className="card-title">{m.label}</span>
                      </div>
                      <ArrowRight size={16} className="card-arrow" />
                    </div>
                    <p className="card-desc">{m.sub}</p>
                  </button>
                ))}
              </div>

              <div className="footer-text">
                <Lock size={12} />
                Seguro, privado e feito para te ajudar.
              </div>
            </div>
          ) : (
            <div className="chat-container">
              {messages.map((msg, i) => {
                const code = msg.role === 'assistant' && msg.content ? extractCode(msg.content) : null
                const textWithoutCode = code ? stripCode(msg.content) : msg.content
                const hasCode = !!code

                return (
                  <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="avatar">
                        <Zap size={18} fill="white" color="white" />
                      </div>
                    )}
                    <div className={`bubble ${msg.role === 'user' ? 'user' : ''}`}>
                      
                      {msg.preview && (
                        <img src={msg.preview} alt="anexo" className="preview-img" />
                      )}

                      {msg.fileName && !msg.preview && (
                        <div className="file-attachment">
                          <FileText size={20} color="#8B5CF6" />
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{msg.fileName}</span>
                        </div>
                      )}

                      <div>
                        {!msg.isImage && msg.role === 'assistant' && textWithoutCode && (
                          <MarkdownRenderer>{textWithoutCode}</MarkdownRenderer>
                        )}
                        {!msg.isImage && msg.role === 'user' && textWithoutCode}
                      </div>

                      {msg.isImage && (
                        <a href={msg.preview} download={`imagem-${Date.now()}.png`} className="copy-btn" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}>
                          ⬇️ Baixar imagem
                        </a>
                      )}

                      {msg.role === 'assistant' && !msg.isImage && msg.content && (
                        <div style={{ marginTop: 16 }}>
                          {code && <CodePreview code={code} />}
                          <button onClick={() => navigator.clipboard.writeText(msg.content)} className="copy-btn">
                            Copiar resposta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {(loading || gerandoImagem) && !messages.find(m => m.role === 'assistant' && m.content === '') && (
                <div className="message-row">
                  <div className="avatar">
                    <Zap size={18} fill="white" color="white" />
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B4B2A9', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B4B2A9', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.15s' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#B4B2A9', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} style={{ height: 16 }} />
            </div>
          )}
        </div>

        {/* Sticky Input for Chat Mode */}
        {messages.length > 0 && (
          <div className="sticky-input">
            <div>
              <div className="chat-input-container">
                <button onClick={() => fileRef.current?.click()} className="icon-btn" style={{ marginBottom: 4 }}>
                  <Paperclip size={20} />
                </button>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {(preview || arquivo) && (
                    <div className="attachment-preview">
                      {preview ? (
                        <img src={preview} alt="preview" className="attachment-thumb" />
                      ) : (
                        <div className="attachment-icon">
                          <FileText size={16} color="#5F5E5A" />
                        </div>
                      )}
                      <span style={{ fontSize: 12, color: '#5F5E5A', fontWeight: 500, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {arquivo?.name}
                      </span>
                      <button onClick={removerArquivo} className="icon-btn" style={{ width: 20, height: 20 }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        enviar()
                      }
                    }}
                    placeholder="Mensagem para Super Agente..."
                    className="chat-textarea"
                  />
                </div>
                
                <button 
                  onClick={enviar}
                  disabled={loading || gerandoImagem || (!input.trim() && !arquivo)}
                  className="send-btn"
                  style={{ marginBottom: 4 }}
                >
                  <ArrowUp size={20} strokeWidth={3} />
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#888780' }}>
                O Super Agente pode cometer erros. Considere verificar informações importantes.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
