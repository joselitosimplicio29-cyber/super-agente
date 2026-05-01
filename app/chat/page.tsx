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

  async function executarVideoAction(actionData: any) {
    setLoading(true)
    try {
      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData)
      })
      const data = await res.json()
      
      if (data.success) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `✅ Habilidade de vídeo executada com sucesso!\n\n**Comando:** \`${data.command}\`\n\n**Saída:**\n\`\`\`\n${data.stdout}\n\`\`\`` 
          }
        ])
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Erro na habilidade de vídeo: ${error.message}` }
      ])
    } finally {
      setLoading(false)
    }
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading || gerandoImagem) return

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
              ? m.content // No history helper here for simplicity
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

      if (result.includes('VIDEO_ACTION:')) {
        const match = result.match(/VIDEO_ACTION:\s*({.+})/i)
        if (match) {
          try {
            const actionData = JSON.parse(match[1])
            await executarVideoAction(actionData)
          } catch {}
        }
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

  const modos = [
    { icon: <MessageSquare size={20} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.1)', label: 'Conversar', sub: 'Converse com IA sobre qualquer assunto.', prompt: '', acao: null },
    { icon: <Sparkles size={20} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.1)', label: 'Gerar Imagem', sub: 'Crie imagens incríveis com inteligência artificial.', prompt: 'Gera uma imagem de: ', acao: null },
    { icon: <Smartphone size={20} color="#3B82F6" />, bg: 'rgba(59, 130, 246, 0.1)', label: 'Criar Post', sub: 'Gere legendas e hashtags para suas redes sociais.', prompt: 'Cria um post para Instagram sobre: ', acao: null },
    { icon: <ImageIcon size={20} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.1)', label: 'Analisar Imagem', sub: 'Envie uma imagem e receba análises e insights.', prompt: 'Analise esta imagem.', acao: 'imagem' },
    { icon: <FileText size={20} color="#8B5CF6" />, bg: 'rgba(139, 92, 246, 0.1)', label: 'Ler PDF', sub: 'Resuma e extraia informações de documentos PDF.', prompt: 'Leia e resuma este documento.', acao: 'pdf' },
    { icon: <LayoutTemplate size={20} color="#8B5CF6" />, bg: 'rgba(139, 92, 246, 0.1)', label: 'Criar Componente', sub: 'Gere componentes React com preview em tempo real.', prompt: 'Cria um componente React de: ', acao: null }
  ]

  return (
    <div className="chat-page">
      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: var(--background);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .hero-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero-title {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(to right, #F8FAFC, #10B981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        .hero-subtitle {
          color: #94A3B8;
          font-size: 18px;
          margin-bottom: 48px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          width: 100%;
        }
        .action-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .action-card:hover {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
          transform: translateY(-4px);
        }
        .card-icon-bg {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .card-title {
          font-weight: 700;
          color: #F8FAFC;
          font-size: 16px;
          display: block;
          margin-bottom: 8px;
        }
        .card-desc {
          color: #64748B;
          font-size: 13px;
          line-height: 1.5;
        }
        .chat-input-wrapper {
          padding: 24px;
          background: linear-gradient(to top, var(--background), transparent);
          position: fixed;
          bottom: 0;
          left: 260px;
          right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 40;
        }
        .chat-input-box {
          width: 100%;
          max-width: 800px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 12px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #F8FAFC;
          padding: 8px 4px;
          resize: none;
          font-size: 15px;
          min-height: 24px;
          max-height: 200px;
          line-height: 1.5;
        }
        .message-row {
          display: flex;
          margin-bottom: 32px;
          padding: 0 24px;
          gap: 16px;
        }
        .message-row.user {
          justify-content: flex-end;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bubble {
          max-width: 80%;
          padding: 16px 20px;
          border-radius: 20px;
          line-height: 1.7;
          font-size: 15px;
        }
        .bubble.user {
          background: #10B981;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .bubble.assistant {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #F8FAFC;
          border-bottom-left-radius: 4px;
        }
        .copy-btn {
          margin-top: 12px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #94A3B8;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #F8FAFC;
        }
      `}</style>

      <div className="main-content">
        <div className="content-scroll" style={{ paddingBottom: 120 }}>
          {messages.length === 0 ? (
            <div className="hero-container">
              <Zap size={48} fill="#FACC15" color="#FACC15" style={{ marginBottom: 24 }} />
              <h1 className="hero-title">Super Agente</h1>
              <p className="hero-subtitle">Como posso ajudar você hoje?</p>
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
                    <div className="card-icon-bg" style={{ backgroundColor: m.bg }}>
                      {m.icon}
                    </div>
                    <span className="card-title">{m.label}</span>
                    <p className="card-desc">{m.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-container" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="avatar">
                      <Zap size={18} fill="white" color="white" />
                    </div>
                  )}
                  <div className={`bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                    {msg.preview && (
                      <img src={msg.preview} alt="anexo" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 12 }} />
                    )}
                    <div>
                      {msg.role === 'assistant' ? (
                        <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="copy-btn">
                        Copiar resposta
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} style={{ height: 20 }} />
            </div>
          )}
        </div>
        <div className="chat-input-wrapper">
          <div className="chat-input-box">
            <button onClick={() => fileRef.current?.click()} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 8 }}>
              <Paperclip size={20} />
            </button>
            <textarea
              className="chat-textarea"
              placeholder="Digite sua mensagem..."
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
              style={{ width: 40, height: 40, borderRadius: 12, background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={enviar}
              disabled={loading || gerandoImagem || (!input.trim() && !arquivo)}
            >
              <ArrowUp size={20} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}
