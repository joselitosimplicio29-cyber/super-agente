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
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #070D18;
        }

        .app {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at 75% 10%, rgba(37, 99, 235, .16), transparent 35%),
            radial-gradient(circle at 35% 80%, rgba(245, 158, 11, .10), transparent 30%),
            linear-gradient(135deg, #070D18 0%, #0B1220 45%, #111827 100%);
          color: #E5E7EB;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sidebar {
          width: 260px;
          background: rgba(15, 23, 42, .88);
          border-right: 1px solid rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          padding: 22px 18px;
          flex-shrink: 0;
        }

        .brand {
          margin-bottom: 28px;
        }

        .brandTitle {
          color: #F59E0B;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -.04em;
        }

        .brandSub {
          color: #64748B;
          font-size: 13px;
          margin-top: 4px;
        }

        .newChat {
          border: 1px solid rgba(245,158,11,.35);
          background: rgba(245,158,11,.12);
          color: #FBBF24;
          border-radius: 14px;
          padding: 13px 14px;
          font-weight: 900;
          cursor: pointer;
          margin-bottom: 16px;
        }

        .clientLabel {
          color: #64748B;
          font-size: 11px;
          letter-spacing: .16em;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .clientSelect {
          width: 100%;
          background: #0B1220;
          color: #E5E7EB;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 14px;
          padding: 13px;
          margin-bottom: 16px;
          outline: none;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .menuItem {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 14px;
          color: #94A3B8;
          font-size: 14px;
          cursor: pointer;
        }

        .menuItem.active {
          background: rgba(31,41,55,.9);
          color: #F8FAFC;
          box-shadow: inset 4px 0 0 #F59E0B;
        }

        .menuItem:hover {
          background: rgba(255,255,255,.05);
          color: #F8FAFC;
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .topbar {
          height: 68px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 26px;
          background: rgba(7,13,24,.72);
          backdrop-filter: blur(16px);
        }

        .status {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94A3B8;
          font-size: 14px;
        }

        .dot {
          width: 9px;
          height: 9px;
          background: #10B981;
          border-radius: 999px;
          box-shadow: 0 0 18px rgba(16,185,129,.9);
        }

        .clientBadge {
          color: #FBBF24;
          background: rgba(245,158,11,.12);
          border: 1px solid rgba(245,158,11,.25);
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 34px 24px 20px;
        }

        .chatContainer {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          min-height: 100%;
        }

        .hero {
          min-height: calc(100vh - 220px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .heroLogo {
          width: 74px;
          height: 74px;
          border-radius: 26px;
          background: linear-gradient(135deg, #F59E0B, #F97316);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin-bottom: 22px;
          box-shadow: 0 24px 70px rgba(245,158,11,.25);
        }

        .heroTitle {
          font-size: 38px;
          font-weight: 950;
          letter-spacing: -.05em;
          color: #F8FAFC;
        }

        .heroText {
          margin-top: 12px;
          color: #94A3B8;
          max-width: 620px;
          line-height: 1.7;
          font-size: 16px;
        }

        .shortcutGrid {
          margin-top: 34px;
          display: grid;
          grid-template-columns: repeat(2, minmax(240px, 1fr));
          gap: 14px;
          width: 100%;
          max-width: 720px;
        }

        .shortcut {
          text-align: left;
          background: linear-gradient(145deg, rgba(31,41,55,.88), rgba(15,23,42,.95));
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          padding: 20px;
          color: #E5E7EB;
          cursor: pointer;
          box-shadow: 0 22px 70px rgba(0,0,0,.22);
          transition: all .2s ease;
        }

        .shortcut:hover {
          transform: translateY(-4px);
          border-color: rgba(245,158,11,.35);
        }

        .shortcutIcon {
          font-size: 26px;
          margin-bottom: 12px;
        }

        .shortcutTitle {
          font-weight: 900;
          color: #F8FAFC;
        }

        .shortcutDesc {
          color: #94A3B8;
          font-size: 13px;
          margin-top: 6px;
        }

        .messageRow {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          animation: fadeUp .18s ease;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: linear-gradient(135deg, #F59E0B, #2563EB);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 14px 30px rgba(0,0,0,.35);
        }

        .bubble {
          max-width: min(760px, 78%);
          border-radius: 20px;
          padding: 18px 20px;
          font-size: 15px;
          line-height: 1.9;
          word-break: break-word;
        }

        .bubble.user {
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: white;
          border-bottom-right-radius: 6px;
          box-shadow: 0 22px 55px rgba(37,99,235,.28);
        }

        .bubble.assistant {
          background: linear-gradient(135deg, rgba(30,41,59,.96), rgba(15,23,42,.96));
          border: 1px solid rgba(255,255,255,.08);
          color: #E5E7EB;
          border-bottom-left-radius: 6px;
          box-shadow: 0 24px 70px rgba(0,0,0,.32);
        }

        .markdown p {
          margin: 0 0 14px;
        }

        .markdown p:last-child {
          margin-bottom: 0;
        }

        .markdown h1,
        .markdown h2,
        .markdown h3 {
          margin: 18px 0 10px;
          color: #F8FAFC;
          line-height: 1.3;
        }

        .markdown ul,
        .markdown ol {
          padding-left: 20px;
          margin: 10px 0;
        }

        .markdown strong {
          color: #F8FAFC;
        }

        .markdown code {
          background: rgba(255,255,255,.08);
          padding: 2px 6px;
          border-radius: 6px;
        }

        .copyBtn {
          margin-top: 12px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: #94A3B8;
          padding: 7px 11px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
        }

        .copyBtn:hover {
          color: #F8FAFC;
          background: rgba(255,255,255,.08);
        }

        .typing {
          display: flex;
          gap: 5px;
        }

        .typing span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #94A3B8;
          animation: pulse 1s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: .15s;
        }

        .typing span:nth-child(3) {
          animation-delay: .3s;
        }

        .inputBar {
          border-top: 1px solid rgba(255,255,255,.07);
          padding: 18px 24px 24px;
          background: rgba(7,13,24,.78);
          backdrop-filter: blur(18px);
        }

        .inputWrap {
          max-width: 980px;
          margin: 0 auto;
        }

        .previewBox {
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(31,41,55,.95);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          padding: 10px 12px;
        }

        .previewImg {
          width: 54px;
          height: 54px;
          object-fit: cover;
          border-radius: 12px;
        }

        .previewName {
          flex: 1;
          color: #CBD5E1;
          font-size: 13px;
        }

        .removeBtn {
          border: none;
          background: rgba(239,68,68,.16);
          color: #FCA5A5;
          border-radius: 10px;
          padding: 8px 11px;
          cursor: pointer;
        }

        .composer {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: rgba(31,41,55,.96);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 26px;
          padding: 12px 14px;
          box-shadow: 0 0 34px rgba(37,99,235,.16), 0 24px 70px rgba(0,0,0,.28);
        }

        .attachBtn {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: #94A3B8;
          cursor: pointer;
          font-size: 18px;
          flex-shrink: 0;
        }

        .attachBtn:hover {
          color: #F8FAFC;
          background: rgba(255,255,255,.08);
        }

        textarea {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #F8FAFC;
          resize: none;
          min-height: 40px;
          max-height: 160px;
          padding: 9px 0;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.6;
        }

        textarea::placeholder {
          color: #64748B;
        }

        .sendBtn {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: white;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 16px 36px rgba(37,99,235,.32);
        }

        .sendBtn:disabled {
          background: rgba(255,255,255,.08);
          color: #475569;
          box-shadow: none;
          cursor: not-allowed;
        }

        .hint {
          margin-top: 9px;
          text-align: center;
          color: #475569;
          font-size: 11px;
        }

        .fileBox {
          background: rgba(255,255,255,.06);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 10px;
          color: #CBD5E1;
        }

        .attachedImage {
          max-width: 360px;
          width: 100%;
          border-radius: 14px;
          margin-bottom: 12px;
          border: 1px solid rgba(255,255,255,.10);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 80%, 100% {
            opacity: .3;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-4px);
          }
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,.22);
          border-radius: 999px;
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .shortcutGrid {
            grid-template-columns: 1fr;
          }

          .bubble {
            max-width: 90%;
          }
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          <div className="brandTitle">Super Agente</div>
          <div className="brandSub">TV Sertão Livre</div>
        </div>

        <div className="clientLabel">Cliente ativo</div>

        <select
          className="clientSelect"
          value={clienteSelecionado?.id || ''}
          onChange={e => {
            const cliente = clientes.find(c => c.id === e.target.value) || null
            setClienteSelecionado(cliente)
          }}
        >
          <option value="">Sem cliente</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <button
          className="newChat"
          onClick={() => {
            setMessages([])
            setInput('')
            setConversationId(null)
            removerArquivo()
          }}
        >
          + Nova conversa
        </button>

        <nav className="menu">
          {menu.map((item, index) => (
            <div key={item.label} className={`menuItem ${index === 0 ? 'active' : ''}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="status">
            <span className="dot" />
            <span>Claude Sonnet</span>
          </div>

          {clienteSelecionado && (
            <div className="clientBadge">
              {clienteSelecionado.nome}
            </div>
          )}
        </header>

        <section className="content">
          <div className="chatContainer">
            {messages.length === 0 ? (
              <div className="hero">
                <div className="heroLogo">⚡</div>

                <div className="heroTitle">
                  Super Agente IA
                </div>

                <div className="heroText">
                  Sua inteligência artificial para criar matérias, ler links, analisar imagens,
                  resumir PDFs e produzir conteúdo profissional para a TV Sertão Livre.
                </div>

                <div className="shortcutGrid">
                  {atalhos.map(item => (
                    <button
                      key={item.title}
                      className="shortcut"
                      onClick={() => {
                        setInput(item.text)

                        if (item.title === 'Analisar imagem') {
                          fileRef.current?.click()
                        }
                      }}
                    >
                      <div className="shortcutIcon">{item.icon}</div>
                      <div className="shortcutTitle">{item.title}</div>
                      <div className="shortcutDesc">Clique para iniciar</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user'
                const text = textoMensagem(msg.content)

                return (
                  <div key={index} className={`messageRow ${isUser ? 'user' : ''}`}>
                    {!isUser && <div className="avatar">S</div>}

                    <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
                      {msg.preview && (
                        <img src={msg.preview} className="attachedImage" alt="Anexo" />
                      )}

                      {msg.fileName && !msg.preview && (
                        <div className="fileBox">📄 {msg.fileName}</div>
                      )}

                      {text ? (
                        isUser ? (
                          text
                        ) : (
                          <div className="markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {text}
                            </ReactMarkdown>
                          </div>
                        )
                      ) : !isUser && loading ? (
                        <div className="typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}

                      {!isUser && text && (
                        <button
                          className="copyBtn"
                          onClick={() => navigator.clipboard.writeText(text)}
                        >
                          Copiar resposta
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            <div ref={bottomRef} />
          </div>
        </section>

        <footer className="inputBar">
          <div className="inputWrap">
            {(preview || arquivo) && (
              <div className="previewBox">
                {preview ? (
                  <img src={preview} className="previewImg" alt="Preview" />
                ) : (
                  <span style={{ fontSize: 28 }}>📄</span>
                )}

                <span className="previewName">{arquivo?.name}</span>

                <button className="removeBtn" onClick={removerArquivo}>
                  Remover
                </button>
              </div>
            )}

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

            <div className="composer">
              <button
                className="attachBtn"
                onClick={() => fileRef.current?.click()}
                title="Anexar imagem ou PDF"
              >
                📎
              </button>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Mensagem, link, imagem ou PDF..."
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviar()
                  }
                }}
              />

              <button
                className="sendBtn"
                disabled={loading || (!input.trim() && !arquivo)}
                onClick={enviar}
              >
                →
              </button>
            </div>

            <div className="hint">
              Enter para enviar · Shift+Enter para nova linha · Ctrl+V para colar imagem · 📎 para imagem/PDF
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}