'use client'
import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string | any[]
  preview?: string
  fileName?: string
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
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<{ base64: string; type: string; name: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/cadastrar-cliente')
      .then(r => r.json())
      .then(d => { if (d.clientes) setClientes(d.clientes) })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleArquivo(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const result = e.target?.result as string
      const base64 = result.split(',')[1]
      const type = file.type
      setArquivo({ base64, type, name: file.name })
      if (type.startsWith('image/')) setPreview(result)
      else setPreview(null)
    }
    reader.readAsDataURL(file)
  }

  function removerArquivo() {
    setArquivo(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function criarConversa() {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteSelecionado?.id, titulo: input.slice(0, 50) || 'Nova conversa' })
    })
    const d = await res.json()
    if (d.id) { setConversationId(d.id); return d.id }
    return null
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading) return

    // Monta content da mensagem do usuário
    let userContent: any = input.trim()
    let userPreview = preview
    let fileName = arquivo?.name

    if (arquivo) {
      const isImage = arquivo.type.startsWith('image/')
      const isPdf = arquivo.type === 'application/pdf'

      if (isImage) {
        userContent = [
          { type: 'image', source: { type: 'base64', media_type: arquivo.type, data: arquivo.base64 } },
          { type: 'text', text: input.trim() || 'Analise esta imagem.' }
        ]
      } else if (isPdf) {
        userContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: arquivo.base64 } },
          { type: 'text', text: input.trim() || 'Leia e resuma este documento.' }
        ]
      }
    }

    const userMsg: Message = { role: 'user', content: userContent, preview: userPreview || undefined, fileName }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setArquivo(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setLoading(true)

    let convId = conversationId
    if (!convId) convId = await criarConversa()

    // Monta histórico para a API — converte mensagens antigas para formato texto simples
    const apiMessages = newMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content
    }))

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, conversation_id: convId, cliente: clienteSelecionado })
    })
    const data = await res.json()
    if (data.message) setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    setLoading(false)
  }

  const modos = [
    { icon: '💬', label: 'Conversar', sub: 'Texto com IA', prompt: '' },
    { icon: '🖼️', label: 'Analisar Imagem', sub: 'Envie uma foto', prompt: 'Analise esta imagem para mim.' },
    { icon: '📄', label: 'Ler PDF', sub: 'Envie o documento', prompt: 'Leia e resuma este documento.' },
    { icon: '📅', label: 'Agendar', sub: 'Salva na agenda', prompt: 'Quero agendar: ' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: "'Montserrat', sans-serif", color: '#F8FAFC', overflow: 'hidden' }}>

      {/* Sidebar */}
      {sidebarAberta && (
        <div style={{ width: 240, background: '#1E293B', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#F59E0B', fontWeight: 800, fontSize: 15 }}>Super Agente</div>
              <div style={{ color: '#475569', fontSize: 11 }}>TV Sertão Livre</div>
            </div>
            <button onClick={() => setSidebarAberta(false)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
          </div>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>Cliente ativo</div>
            <select value={clienteSelecionado?.id || ''} onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) || null)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#F8FAFC', fontSize: 12, outline: 'none' }}>
              <option value=''>Sem cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <button onClick={() => { setMessages([]); setConversationId(null) }}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nova conversa
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {!sidebarAberta && (
            <button onClick={() => setSidebarAberta(true)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18, padding: 4 }}>→</button>
          )}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ color: '#64748B', fontSize: 13 }}>Claude Sonnet</span>
          {clienteSelecionado && (
            <><span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>{clienteSelecionado.nome}</span></>
          )}
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {messages.length === 0 && (
            <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 60 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 20 }}>Super Agente</div>
                <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Como posso ajudar hoje?</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 440 }}>
                {modos.map(m => (
                  <button key={m.label} onClick={() => {
                    setInput(m.prompt)
                    if (m.label === 'Analisar Imagem' || m.label === 'Ler PDF') fileRef.current?.click()
                  }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>S</div>
              )}
              <div style={{ maxWidth: '75%', background: msg.role === 'user' ? '#1E3A8A' : 'rgba(255,255,255,0.04)', border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', padding: '12px 16px', fontSize: 13, lineHeight: 1.7, color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                {msg.preview && <img src={msg.preview} alt="anexo" style={{ width: '100%', maxWidth: 300, borderRadius: 8, marginBottom: 8, display: 'block' }} />}
                {msg.fileName && !msg.preview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ fontSize: 12, color: '#CBD5E1' }}>{msg.fileName}</span>
                  </div>
                )}
                {typeof msg.content === 'string' ? msg.content : Array.isArray(msg.content) ? msg.content.find((c: any) => c.type === 'text')?.text || '' : ''}
                {msg.role === 'assistant' && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => navigator.clipboard.writeText(typeof msg.content === 'string' ? msg.content : '')}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748B', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>S</div>
              <div style={{ color: '#475569', fontSize: 13 }}>Pensando...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Preview do arquivo */}
          {(preview || arquivo) && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' }}>
              {preview
                ? <img src={preview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                : <span style={{ fontSize: 24 }}>📄</span>
              }
              <span style={{ fontSize: 12, color: '#94A3B8', flex: 1 }}>{arquivo?.name}</span>
              <button onClick={removerArquivo} style={{ background: 'rgba(220,38,38,0.2)', border: 'none', color: '#FCA5A5', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])} style={{ display: 'none' }} />

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }} title="Anexar imagem ou PDF">
              📎
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Mensagem, ou anexe uma imagem/PDF... (Enter para enviar)" rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F8FAFC', fontSize: 14, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }} />
            <button onClick={enviar} disabled={loading || (!input.trim() && !arquivo)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: loading || (!input.trim() && !arquivo) ? 'rgba(255,255,255,0.08)' : '#F59E0B', border: 'none', color: loading || (!input.trim() && !arquivo) ? '#475569' : '#000', fontSize: 16, cursor: loading || (!input.trim() && !arquivo) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              →
            </button>
          </div>
          <div style={{ textAlign: 'center', color: '#334155', fontSize: 10, marginTop: 8 }}>Enter para enviar · Shift+Enter para nova linha · 📎 para imagem ou PDF</div>
        </div>
      </div>
    </div>
  )
}

