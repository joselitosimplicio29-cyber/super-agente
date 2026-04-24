'use client'

import { useEffect, useRef, useState } from 'react'

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
      .then(d => {
        if (d.clientes) setClientes(d.clientes)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

        break
      }
    }
  }

  function removerArquivo() {
    setArquivo(null)
    setPreview(null)

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  async function criarConversa() {
    const titulo = input.trim().slice(0, 50) || 'Nova conversa'

    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteSelecionado?.id,
        titulo
      })
    })

    const data = await res.json()

    if (data.id) {
      setConversationId(data.id)
      return data.id
    }

    return null
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
        text: 'Analise esta imagem.'
      })
    } else if (arquivo?.type === 'application/pdf') {
      content.push({
        type: 'text',
        text: 'Leia e resuma este documento.'
      })
    }

    return content
  }

  function textoDaMensagem(content: string | any[]) {
    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      return content.find((item: any) => item.type === 'text')?.text || ''
    }

    return ''
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

    setMessages([
      ...newMessages,
      {
        role: 'assistant',
        content: ''
      }
    ])

    setInput('')
    setArquivo(null)
    setPreview(null)
    setLoading(true)

    if (fileRef.current) {
      fileRef.current.value = ''
    }

    let convId = conversationId

    if (!convId) {
      convId = await criarConversa()
    }

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
        throw new Error('Erro ao gerar resposta.')
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
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content: result
              }
            ]
          }

          return prev
        })
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `Erro: ${error.message || 'não foi possível responder agora.'}`
        }
      ])
    }

    setLoading(false)
  }

  const modos = [
    {
      icon: '💬',
      title: 'Conversar',
      desc: 'Tire dúvidas e crie textos',
      prompt: ''
    },
    {
      icon: '📰',
      title: 'Matéria jornalística',
      desc: 'Texto profissional de notícia',
      prompt: 'Escreva uma matéria jornalística sobre: '
    },
    {
      icon: '🔗',
      title: 'Ler link',
      desc: 'Resumo de notícia ou página',
      prompt: 'Leia este link e transforme em matéria jornalística: '
    },
    {
      icon: '📸',
      title: 'Analisar imagem',
      desc: 'Envie ou cole uma foto',
      prompt: 'Analise esta imagem de forma profissional.'
    },
    {
      icon: '📄',
      title: 'Ler PDF',
      desc: 'Resumo de documento',
      prompt: 'Leia e resuma este documento.'
    },
    {
      icon: '📱',
      title: 'Post Instagram',
      desc: 'Legenda e hashtags',
      prompt: 'Crie uma legenda para Instagram sobre: '
    }
  ]

  const menu = [
    { icon: '💬', label: 'Chat' },
    { icon: '📊', label: 'Dashboard' },
    { icon: '✨', label: 'Gerar' },
    { icon: '🎬', label: 'Mídia' },
    { icon: '👥', label: 'Clientes' },
    { icon: '📅', label: 'Agenda' },
    { icon: '💰', label: 'Financeiro' },
    { icon: '🗂️', label: 'Histórico' },
    { icon: '📌', label: 'Kanban' },
    { icon: '📝', label: 'Notas' }
  ]

  return (
    <div className="appShell">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #0B1220;
        }

        .appShell {
          height: 100vh;
          width: 100%;
          display: flex;
          overflow: hidden;
          background:
            radial-gradient(circle at top right, rgba(14,165,233,.16), transparent 34%),
            linear-gradient(135deg, #08111F 0%, #0B1220 45%, #111827 100%);
          color: #E5E7EB;
          font-family: Inter, Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sidebar {
          width: 250px;
          background: rgba(15, 23, 42, .92);
          border-right: 1px solid rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(16px);
          flex-shrink: 0;
        }

        .brand {
          padding: 22px 18px 18px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .brandTitle {
          font-size: 17px;
          font-weight: 900;
          color: #F59E0B;
          letter-spacing: -.02em;
        }

        .brandSub {
          margin-top: 4px;
          font-size: 11px;
          color: #64748B;
        }

        .sidebarContent {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow: auto;
        }

        .sideLabel {
          color: #475569;
          font-size: 10px;
          letter-spacing: .16em;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .clientSelect {
          width: 100%;
          background: #111827;
          color: #E5E7EB;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          padding: 11px 12px;
          outline: none;
          font-size: 12px;
        }

        .newButton {
          width: 100%;
          border: 1px solid rgba(245,158,11,.34);
          background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.06));
          color: #FBBF24;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: all .2s ease;
        }

        .newButton:hover {
          transform: translateY(-1px);
          background: rgba(245,158,11,.22);
        }

        .menuList {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .menuItem {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 12px;
          color: #94A3B8;
          font-size: 13px;
          cursor: pointer;
          transition: all .18s ease;
          border: 1px solid transparent;
        }

        .menuItem.active {
          background: #1F2937;
          color: #F8FAFC;
          border-color: rgba(255,255,255,.08);
          box-shadow: inset 3px 0 0 #F59E0B;
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
          height: 64px;
          padding: 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(8, 17, 31, .72);
          backdrop-filter: blur(18px);
        }

        .status {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94A3B8;
          font-size: 13px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 18px rgba(16,185,129,.8);
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .clientBadge {
          background: rgba(245,158,11,.12);
          color: #FBBF24;
          border: 1px solid rgba(245,158,11,.25);
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
        }

        .messagesArea {
          flex: 1;
          overflow-y: auto;
          padding: 28px 24px 18px;
        }

        .chatWrap {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }

        .emptyState {
          margin: auto;
          width: 100%;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 0 80px;
        }

        .heroIcon {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          background: linear-gradient(135deg, #F59E0B, #F97316);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          box-shadow: 0 20px 60px rgba(245,158,11,.25);
          margin-bottom: 20px;
        }

        .heroTitle {
          font-size: 32px;
          font-weight: 950;
          letter-spacing: -.04em;
          color: #F8FAFC;
        }

        .heroText {
          color: #94A3B8;
          font-size: 15px;
          line-height: 1.6;
          max-width: 560px;
          margin-top: 10px;
        }

        .modeGrid {
          margin-top: 30px;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .modeCard {
          text-align: left;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(31, 41, 55, .72);
          color: #E5E7EB;
          border-radius: 18px;
          padding: 18px;
          cursor: pointer;
          transition: all .2s ease;
          min-height: 122px;
          box-shadow: 0 18px 50px rgba(0,0,0,.18);
        }

        .modeCard:hover {
          transform: translateY(-3px);
          border-color: rgba(245,158,11,.35);
          background: rgba(31, 41, 55, .95);
        }

        .modeIcon {
          font-size: 24px;
          margin-bottom: 12px;
        }

        .modeTitle {
          font-size: 14px;
          font-weight: 900;
          color: #F8FAFC;
        }

        .modeDesc {
          margin-top: 5px;
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.4;
        }

        .messageRow {
          display: flex;
          gap: 12px;
          margin-bottom: 22px;
          animation: fadeUp .18s ease;
        }

        .messageRow.user {
          justify-content: flex-end;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1D4ED8, #F59E0B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 10px 25px rgba(0,0,0,.25);
        }

        .bubble {
          max-width: min(760px, 78%);
          border-radius: 18px;
          padding: 16px 18px;
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .bubble.user {
          background: linear-gradient(135deg, #2563EB, #1D4ED8);
          color: #FFFFFF;
          border-bottom-right-radius: 6px;
          box-shadow: 0 14px 35px rgba(37,99,235,.22);
        }

        .bubble.assistant {
          background: rgba(31, 41, 55, .88);
          color: #E5E7EB;
          border: 1px solid rgba(255,255,255,.08);
          border-bottom-left-radius: 6px;
          box-shadow: 0 16px 50px rgba(0,0,0,.22);
        }

        .attachedImage {
          width: 100%;
          max-width: 340px;
          border-radius: 14px;
          margin-bottom: 10px;
          border: 1px solid rgba(255,255,255,.10);
          display: block;
        }

        .fileBox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.06);
          margin-bottom: 10px;
          color: #CBD5E1;
          font-size: 12px;
        }

        .copyButton {
          margin-top: 12px;
          padding: 7px 11px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          color: #94A3B8;
          cursor: pointer;
          font-size: 12px;
          transition: all .2s ease;
        }

        .copyButton:hover {
          color: #F8FAFC;
          background: rgba(255,255,255,.08);
        }

        .typing {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          color: #94A3B8;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94A3B8;
          animation: pulse 1s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: .15s;
        }

        .typing span:nth-child(3) {
          animation-delay: .3s;
        }

        .inputArea {
          padding: 16px 24px 22px;
          border-top: 1px solid rgba(255,255,255,.07);
          background: rgba(8,17,31,.74);
          backdrop-filter: blur(18px);
        }

        .inputWrap {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        .previewBox {
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(31,41,55,.9);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          padding: 10px 12px;
        }

        .previewImg {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          object-fit: cover;
        }

        .previewName {
          flex: 1;
          color: #CBD5E1;
          font-size: 13px;
        }

        .removeButton {
          border: none;
          background: rgba(239,68,68,.16);
          color: #FCA5A5;
          border-radius: 10px;
          padding: 7px 11px;
          cursor: pointer;
        }

        .composer {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: rgba(31,41,55,.96);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 24px;
          padding: 12px 14px;
          box-shadow: 0 20px 70px rgba(0,0,0,.28);
        }

        .attachButton {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: #94A3B8;
          cursor: pointer;
          font-size: 18px;
          transition: all .2s ease;
          flex-shrink: 0;
        }

        .attachButton:hover {
          color: #F8FAFC;
          background: rgba(255,255,255,.08);
        }

        .textarea {
          flex: 1;
          min-height: 38px;
          max-height: 160px;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          color: #F8FAFC;
          font-size: 14px;
          line-height: 1.6;
          font-family: inherit;
          padding: 7px 0;
        }

        .textarea::placeholder {
          color: #64748B;
        }

        .sendButton {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #F59E0B, #F97316);
          color: #111827;
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
          transition: all .2s ease;
          flex-shrink: 0;
          box-shadow: 0 10px 26px rgba(245,158,11,.24);
        }

        .sendButton:disabled {
          cursor: not-allowed;
          background: rgba(255,255,255,.08);
          color: #475569;
          box-shadow: none;
        }

        .sendButton:not(:disabled):hover {
          transform: translateY(-1px) scale(1.03);
        }

        .hint {
          margin-top: 9px;
          text-align: center;
          color: #475569;
          font-size: 11px;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
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
            transform: translateY(-3px);
          }
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,.25);
          border-radius: 999px;
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .modeGrid {
            grid-template-columns: 1fr 1fr;
          }

          .bubble {
            max-width: 88%;
          }
        }

        @media (max-width: 620px) {
          .modeGrid {
            grid-template-columns: 1fr;
          }

          .heroTitle {
            font-size: 25px;
          }

          .messagesArea {
            padding: 20px 14px;
          }

          .inputArea {
            padding: 12px;
          }

          .bubble {
            max-width: 92%;
          }
        }
      `}</style>

      {sidebarAberta && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brandTitle">Super Agente</div>
            <div className="brandSub">TV Sertão Livre</div>
          </div>

          <div className="sidebarContent">
            <div>
              <div className="sideLabel">Cliente ativo</div>
              <select
                className="clientSelect"
                value={clienteSelecionado?.id || ''}
                onChange={e => setClienteSelecionado(clientes.find(c => c.id === e.target.value) || null)}
              >
                <option value="">Sem cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="newButton"
              onClick={() => {
                setMessages([])
                setConversationId(null)
                setInput('')
                removerArquivo()
              }}
            >
              + Nova conversa
            </button>

            <nav className="menuList">
              {menu.map(item => (
                <div key={item.label} className={`menuItem ${item.label === 'Chat' ? 'active' : ''}`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <main className="main">
        <header className="topbar">
          <div className="status">
            {!sidebarAberta && (
              <button className="attachButton" onClick={() => setSidebarAberta(true)}>
                ☰
              </button>
            )}
            <span className="dot" />
            <span>Claude Sonnet</span>
          </div>

          <div className="topActions">
            {clienteSelecionado && (
              <div className="clientBadge">
                {clienteSelecionado.nome}
              </div>
            )}
          </div>
        </header>

        <section className="messagesArea">
          <div className="chatWrap">
            {messages.length === 0 && (
              <div className="emptyState">
                <div className="heroIcon">⚡</div>
                <div className="heroTitle">Super Agente</div>
                <div className="heroText">
                  Crie matérias jornalísticas, leia links, analise imagens, resuma PDFs e produza conteúdo profissional para redes sociais.
                </div>

                <div className="modeGrid">
                  {modos.map(modo => (
                    <button
                      key={modo.title}
                      className="modeCard"
                      onClick={() => {
                        setInput(modo.prompt)

                        if (modo.title === 'Analisar imagem' || modo.title === 'Ler PDF') {
                          fileRef.current?.click()
                        }
                      }}
                    >
                      <div className="modeIcon">{modo.icon}</div>
                      <div className="modeTitle">{modo.title}</div>
                      <div className="modeDesc">{modo.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              const isUser = msg.role === 'user'
              const text = textoDaMensagem(msg.content)

              return (
                <div key={index} className={`messageRow ${isUser ? 'user' : 'assistant'}`}>
                  {!isUser && <div className="avatar">S</div>}

                  <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
                    {msg.preview && (
                      <img src={msg.preview} alt="Anexo" className="attachedImage" />
                    )}

                    {msg.fileName && !msg.preview && (
                      <div className="fileBox">
                        <span>📄</span>
                        <span>{msg.fileName}</span>
                      </div>
                    )}

                    {text ? (
                      text
                    ) : !isUser && loading ? (
                      <span className="typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : null}

                    {!isUser && text && (
                      <div>
                        <button
                          className="copyButton"
                          onClick={() => navigator.clipboard.writeText(text)}
                        >
                          Copiar resposta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={bottomRef} />
          </div>
        </section>

        <footer className="inputArea">
          <div className="inputWrap">
            {(preview || arquivo) && (
              <div className="previewBox">
                {preview ? (
                  <img src={preview} alt="Preview" className="previewImg" />
                ) : (
                  <span style={{ fontSize: 28 }}>📄</span>
                )}

                <span className="previewName">{arquivo?.name}</span>

                <button className="removeButton" onClick={removerArquivo}>
                  Remover
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])}
              style={{ display: 'none' }}
            />

            <div className="composer">
              <button className="attachButton" onClick={() => fileRef.current?.click()} title="Anexar imagem ou PDF">
                📎
              </button>

              <textarea
                className="textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    enviar()
                  }
                }}
                placeholder="Mensagem, link, ou cole uma imagem..."
                rows={1}
              />

              <button
                className="sendButton"
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