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
          background: #FAFAF7;
        }

        .app {
          min-height: 100vh;
          display: flex;
          background: #FAFAF7;
          color: #2C2C2A;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sidebar {
          width: 260px;
          background: #FFFFFF;
          border-right: 0.5px solid #E5E3DC;
          display: flex;
          flex-direction: column;
          padding: 22px 18px;
          flex-shrink: 0;
        }

        .brand {
          margin-bottom: 28px;
        }

        .brandTitle {
          color: #2C2C2A;
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -.02em;
        }

        .brandSub {
          color: #5F5E5A;
          font-size: 13px;
          margin-top: 4px;
        }

        .newChat {
          border: 0.5px solid #E5E3DC;
          background: #FFFFFF;
          color: #2C2C2A;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 400;
          cursor: pointer;
          margin-bottom: 16px;
          transition: background 0.2s;
        }
        .newChat:hover {
          background: #F1EFE8;
        }

        .clientLabel {
          color: #888780;
          font-size: 11px;
          letter-spacing: .05em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .clientSelect {
          width: 100%;
          background: #FFFFFF;
          color: #2C2C2A;
          border: 0.5px solid #E5E3DC;
          border-radius: 8px;
          padding: 10px;
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
          padding: 10px 14px;
          border-radius: 8px;
          color: #5F5E5A;
          font-size: 14px;
          cursor: pointer;
        }

        .menuItem.active {
          background: #F1EFE8;
          color: #2C2C2A;
        }

        .menuItem:hover:not(.active) {
          background: #FAFAF7;
          color: #2C2C2A;
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .topbar {
          height: 60px;
          border-bottom: 0.5px solid #E5E3DC;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: #FFFFFF;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #5F5E5A;
          font-size: 13px;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #1D9E75;
          border-radius: 999px;
        }

        .clientBadge {
          color: #BA7517;
          background: #FFFFFF;
          border: 0.5px solid #E5E3DC;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 34px 24px 20px;
        }

        .chatContainer {
          width: 100%;
          max-width: 760px;
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
          font-size: 36px;
          margin-bottom: 8px;
        }

        .heroTitle {
          font-size: 22px;
          font-weight: 500;
          color: #2C2C2A;
        }

        .heroText {
          margin-top: 4px;
          color: #5F5E5A;
          font-size: 13px;
        }

        .shortcutGrid {
          margin-top: 34px;
          display: grid;
          grid-template-columns: repeat(2, minmax(240px, 1fr));
          gap: 10px;
          width: 100%;
        }

        .shortcut {
          text-align: left;
          background: #FFFFFF;
          border: 0.5px solid #E5E3DC;
          border-radius: 12px;
          padding: 14px 10px;
          color: #2C2C2A;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .shortcut:hover {
          border-color: #B4B2A9;
        }

        .shortcutIcon {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .shortcutTitle {
          font-weight: 500;
          color: #2C2C2A;
          font-size: 13px;
        }

        .shortcutDesc {
          color: #888780;
          font-size: 11px;
          margin-top: 2px;
        }

        .messageRow {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #BA7517;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          font-size: 14px;
          flex-shrink: 0;
        }

        .bubble {
          max-width: 75%;
          font-size: 14px;
          line-height: 1.7;
          word-break: break-word;
        }

        .bubble.user {
          background: #F1EFE8;
          color: #2C2C2A;
          padding: 10px 14px;
          border-radius: 12px;
        }

        .bubble.assistant {
          background: transparent;
          border: none;
          color: #2C2C2A;
          max-width: 100%;
          padding: 0;
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
          color: #2C2C2A;
          font-weight: 500;
        }

        .markdown ul,
        .markdown ol {
          padding-left: 20px;
          margin: 10px 0;
        }

        .markdown strong {
          color: #2C2C2A;
          font-weight: 500;
        }

        .markdown code {
          background: #F1EFE8;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .copyBtn {
          margin-top: 12px;
          border: 0.5px solid #E5E3DC;
          background: #FFFFFF;
          color: #444441;
          padding: 5px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 400;
        }

        .copyBtn:hover {
          background: #F1EFE8;
        }

        .typing {
          display: flex;
          gap: 5px;
          padding: 10px 0;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #888780;
          animation: pulse 1s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: .15s;
        }

        .typing span:nth-child(3) {
          animation-delay: .3s;
        }

        .inputBar {
          border-top: 0.5px solid #E5E3DC;
          padding: 14px 20px;
          background: #FFFFFF;
        }

        .inputWrap {
          max-width: 760px;
          margin: 0 auto;
        }

        .previewBox {
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FAFAF7;
          border: 0.5px solid #E5E3DC;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .previewImg {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 6px;
        }

        .previewName {
          flex: 1;
          color: #5F5E5A;
          font-size: 12px;
        }

        .removeBtn {
          border: none;
          background: transparent;
          color: #888780;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .removeBtn:hover {
          color: #2C2C2A;
        }

        .composer {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FAFAF7;
          border: 0.5px solid #E5E3DC;
          border-radius: 12px;
          padding: 10px 14px;
        }
        .composer:focus-within {
          border-color: #B4B2A9;
        }

        .attachBtn {
          width: auto;
          height: auto;
          border: none;
          background: transparent;
          color: #888780;
          cursor: pointer;
          font-size: 18px;
          padding: 0 4px;
        }

        .attachBtn:hover {
          color: #2C2C2A;
        }

        textarea {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #2C2C2A;
          resize: none;
          min-height: 24px;
          max-height: 160px;
          padding: 0;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
        }

        textarea::placeholder {
          color: #888780;
        }

        .sendBtn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: #2C2C2A;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sendBtn:hover:not(:disabled) {
          background: #444441;
        }

        .sendBtn:disabled {
          background: #D3D1C7;
          cursor: default;
        }

        .hint {
          margin-top: 8px;
          text-align: center;
          color: #888780;
          font-size: 11px;
        }

        .fileBox {
          background: #FFFFFF;
          border: 0.5px solid #E5E3DC;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 8px;
          color: #2C2C2A;
          font-size: 12px;
        }

        .attachedImage {
          max-width: 400px;
          width: 100%;
          border-radius: 8px;
          margin-bottom: 8px;
          display: block;
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
          background: rgba(0,0,0,.15);
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
            <span>Claude Opus 4.7</span>
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