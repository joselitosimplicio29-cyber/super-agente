'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Zap, ArrowUp, Paperclip, X, FileText, Copy, Check, MoreHorizontal, User } from 'lucide-react'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { useChatContext } from '../ChatContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  preview?: string
  fileName?: string
  isImage?: boolean
}

export default function ChatConversationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const { triggerRefresh } = useChatContext()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [arquivo, setArquivo] = useState<{ base64: string; type: string; name: string } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [firstMessageProcessed, setFirstMessageProcessed] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [conversationTitle, setConversationTitle] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      setLoadingHistory(true)
      try {
        const res = await fetch(`/api/chat/conversations/${id}`)
        const data = await res.json()
        setConversationTitle(data.conversation?.titulo || '')
        const msgs = (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
        setMessages(msgs)
      } catch {}
      setLoadingHistory(false)
    }
    if (id) load()
  }, [id])

  useEffect(() => {
    if (firstMessageProcessed || loadingHistory) return
    const firstMessage = searchParams.get('firstMessage')
    if (firstMessage && messages.length === 0) {
      setFirstMessageProcessed(true)
      processMessage(firstMessage)
    } else {
      setFirstMessageProcessed(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory, firstMessageProcessed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

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

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items)
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { e.preventDefault(); handleArquivo(file) }
      }
    }
  }

  function removerArquivo() {
    setArquivo(null); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  async function saveMessage(role: string, content: string) {
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: id, role, content }),
      })
    } catch {}
  }

  async function processMessage(text: string) {
    const userMsg: Message = { role: 'user', content: text, preview: preview || undefined, fileName: arquivo?.name }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput(''); setArquivo(null); setPreview(null); setLoading(true)
    if (fileRef.current) fileRef.current.value = ''

    await saveMessage('user', text)

    if (messages.length === 0) {
      fetch('/api/chat/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstMessage: text }),
      })
        .then(r => r.json())
        .then(({ title }) => {
          if (title) {
            setConversationTitle(title)
            fetch(`/api/chat/conversations/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ titulo: title }),
            }).then(() => triggerRefresh())
          }
        })
        .catch(() => {})
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversation_id: id,
        }),
      })
      if (!response.ok) throw new Error('Erro')
      const data = await response.json()
      const assistantText = data.text || 'Não consegui gerar uma resposta.'
      setMessages(prev => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant')
          copy[copy.length - 1] = { role: 'assistant', content: assistantText }
        return copy
      })
      await saveMessage('assistant', assistantText)
      triggerRefresh()
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant')
          copy[copy.length - 1] = { role: 'assistant', content: '❌ Erro ao conectar.' }
        return copy
      })
    }
    setLoading(false)
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading) return
    await processMessage(input.trim())
  }

  return (
    <div className="chat-container-root">
      <style>{`
        .chat-container-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: #020617;
          color: #F8FAFC;
        }

        /* ═══ HEADER ═══ */
        .chat-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 10;
        }
        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chat-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #F8FAFC;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chat-header-badge {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        /* ═══ SCROLL AREA ═══ */
        .chat-scroll {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }

        .chat-messages-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* ═══ USER MESSAGE ═══ */
        .msg-user-box {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .msg-user-content {
          max-width: 80%;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #F8FAFC;
          padding: 14px 20px;
          border-radius: 20px 20px 4px 20px;
          font-size: 15px;
          line-height: 1.6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* ═══ ASSISTANT MESSAGE ═══ */
        .msg-assistant-box {
          display: flex;
          gap: 16px;
          margin-bottom: 40px;
        }
        .avatar-ai {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10B981, #3B82F6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .msg-assistant-body {
          flex: 1;
          min-width: 0;
        }
        .msg-assistant-text {
          font-size: 15px;
          line-height: 1.8;
          color: #E2E8F0;
        }

        /* ═══ ACTIONS ═══ */
        .msg-actions-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .action-icon-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #64748B;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #F8FAFC;
          border-color: rgba(255, 255, 255, 0.1);
        }

        /* ═══ INPUT BAR ═══ */
        .chat-footer {
          padding: 24px;
          background: linear-gradient(to top, #020617 80%, transparent);
        }
        .chat-input-wrapper-inner {
          max-width: 800px;
          margin: 0 auto;
        }
        .chat-glass-input {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 10px 14px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .chat-text-box {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #F8FAFC;
          padding: 8px 4px;
          resize: none;
          font-size: 16px;
          min-height: 24px;
          max-height: 200px;
          font-family: inherit;
        }
        .footer-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-attach {
          background: transparent;
          color: #64748B;
        }
        .btn-attach:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #94A3B8;
        }
        .btn-send {
          background: #10B981;
          color: white;
        }
        .btn-send:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-2px);
        }
        .btn-send:disabled {
          background: #1E293B;
          color: #475569;
          cursor: not-allowed;
        }

        /* ═══ PREVIEW ═══ */
        .attachment-preview {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .attachment-preview img {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-fit: cover;
        }
        .preview-info { flex: 1; min-width: 0; }
        .preview-name { font-size: 13px; font-weight: 600; color: #F8FAFC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-size { font-size: 11px; color: #64748B; }

        /* ═══ TYPING ═══ */
        .typing {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #475569;
          border-radius: 50%;
          animation: dotPulse 1.5s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* HEADER */}
      <header className="chat-header">
        <div className="chat-header-info">
          <span className="chat-header-title">{conversationTitle || 'Nova conversa'}</span>
          <span className="chat-header-badge">Claude 4.5</span>
        </div>
        <button className="action-icon-btn">
          <MoreHorizontal size={18} />
        </button>
      </header>

      {/* MESSAGES */}
      <div className="chat-scroll">
        {loadingHistory ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
             <div className="avatar-ai" style={{ width: 48, height: 48, animation: 'pulse 2s infinite' }}>
                <Zap size={24} color="#FFFFFF" />
             </div>
             <span style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>Carregando histórico...</span>
          </div>
        ) : (
          <div className="chat-messages-inner">
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="msg-user-box">
                  <div className="msg-user-content">
                    {msg.preview && (
                      <img src={msg.preview} alt="anexo" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 12, display: 'block' }} />
                    )}
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="msg-assistant-box">
                  <div className="avatar-ai">
                    <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
                  </div>
                  <div className="msg-assistant-body">
                    <div className="msg-assistant-text">
                      {msg.content ? (
                        <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                      ) : (
                        <div className="typing">
                          <div className="dot" />
                          <div className="dot" />
                          <div className="dot" />
                        </div>
                      )}
                    </div>
                    {msg.content && (
                      <div className="msg-actions-row">
                        <button
                          className="action-icon-btn"
                          onClick={() => handleCopy(msg.content, i)}
                        >
                          {copiedIdx === i ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="chat-footer">
        <div className="chat-input-wrapper-inner">
          {arquivo && (
            <div className="attachment-preview">
              {preview ? <img src={preview} alt="preview" /> : <div className="avatar-ai"><FileText size={20} color="#FFFFFF" /></div>}
              <div className="preview-info">
                <div className="preview-name">{arquivo.name}</div>
                <div className="preview-size">Pronto para enviar</div>
              </div>
              <button onClick={removerArquivo} className="action-icon-btn" style={{ padding: 6 }}><X size={16} /></button>
            </div>
          )}
          <div className="chat-glass-input">
            <button onClick={() => fileRef.current?.click()} className="footer-btn btn-attach">
              <Paperclip size={20} />
            </button>
            <textarea
              ref={textareaRef}
              className="chat-text-box"
              placeholder="Digite sua mensagem..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
              }}
            />
            <button className="footer-btn btn-send" onClick={enviar} disabled={loading || (!input.trim() && !arquivo)}>
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])} style={{ display: 'none' }} />
      </footer>
    </div>
  )
}