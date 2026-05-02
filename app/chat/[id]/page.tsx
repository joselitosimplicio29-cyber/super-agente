'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Zap, ArrowUp, Paperclip, X, FileText, Copy, Check } from 'lucide-react'
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

  // Auto-resize textarea
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

    // Auto-generate title on first message (non-blocking)
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
    <div className="chat-conv-page">
      <style>{`
        .chat-conv-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #FAFAFA;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ═══ HEADER ═══ */
        .conv-header {
          height: 56px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          border-bottom: 1px solid #E5E7EB;
          background: #FFFFFF;
          flex-shrink: 0;
        }
        .conv-header-title {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ═══ MESSAGES SCROLL ═══ */
        .conv-scroll {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .conv-scroll::-webkit-scrollbar { width: 6px; }
        .conv-scroll::-webkit-scrollbar-track { background: transparent; }
        .conv-scroll::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }

        .messages-container {
          max-width: 768px;
          margin: 0 auto;
          padding: 24px 24px 32px;
        }

        /* ═══ USER MESSAGE ═══ */
        .msg-user-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        .msg-user-bubble {
          max-width: 70%;
          background: #111827;
          color: #FFFFFF;
          padding: 12px 18px;
          border-radius: 20px 20px 4px 20px;
          font-size: 15px;
          line-height: 1.6;
          word-wrap: break-word;
        }

        /* ═══ ASSISTANT MESSAGE ═══ */
        .msg-assistant-row {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
          align-items: flex-start;
        }
        .msg-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F97316, #EA580C);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .msg-assistant-content {
          flex: 1;
          min-width: 0;
          font-size: 15px;
          line-height: 1.7;
          color: #1F2937;
        }
        .msg-assistant-content p { margin: 0 0 12px; }
        .msg-assistant-content p:last-child { margin-bottom: 0; }
        .msg-assistant-content ul, .msg-assistant-content ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .msg-assistant-content li { margin-bottom: 4px; }
        .msg-assistant-content strong { color: #111827; }
        .msg-assistant-content code {
          background: #F3F4F6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
        .msg-assistant-content pre {
          background: #1F2937;
          color: #E5E7EB;
          padding: 16px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 12px 0;
          font-size: 13px;
        }
        .msg-assistant-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        /* ═══ ACTIONS BAR ═══ */
        .msg-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        .msg-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 12px;
          color: #9CA3AF;
          cursor: pointer;
          transition: all 0.15s;
        }
        .msg-action-btn:hover {
          background: #F3F4F6;
          color: #6B7280;
          border-color: #E5E7EB;
        }
        .msg-action-btn.copied {
          color: #10B981;
        }

        /* ═══ TYPING INDICATOR ═══ */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 0;
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #D1D5DB;
          animation: typingBounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        /* ═══ INPUT AREA ═══ */
        .conv-input-area {
          border-top: 1px solid #E5E7EB;
          background: #FFFFFF;
          padding: 16px 24px 20px;
          flex-shrink: 0;
        }
        .conv-input-inner {
          max-width: 768px;
          margin: 0 auto;
        }
        .conv-input-box {
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 16px;
          padding: 8px 12px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .conv-input-box:focus-within {
          border-color: #F97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }
        .conv-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #111827;
          padding: 6px 4px;
          resize: none;
          font-size: 15px;
          min-height: 24px;
          max-height: 200px;
          line-height: 1.5;
          font-family: inherit;
        }
        .conv-textarea::placeholder { color: #9CA3AF; }
        .attach-btn {
          background: transparent;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
        }
        .attach-btn:hover { background: #F3F4F6; color: #6B7280; }
        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #F97316;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) { background: #EA580C; }
        .send-btn:disabled { background: #E5E7EB; cursor: not-allowed; }

        /* ═══ PREVIEW BAR ═══ */
        .preview-bar {
          max-width: 768px;
          margin: 0 auto 8px;
          padding: 8px 12px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .preview-bar img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
        .preview-name { flex: 1; font-size: 13px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-remove { background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; border-radius: 6px; }
        .preview-remove:hover { color: #DC2626; }

        /* ═══ LOADING ═══ */
        .history-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 24px;
          gap: 16px;
          color: #9CA3AF;
          font-size: 14px;
        }
        .history-spinner {
          width: 28px; height: 28px;
          border: 3px solid #E5E7EB;
          border-top-color: #F97316;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* HEADER */}
      <div className="conv-header">
        <span className="conv-header-title">
          {conversationTitle || 'Nova conversa'}
        </span>
      </div>

      {/* MESSAGES */}
      <div className="conv-scroll">
        {loadingHistory ? (
          <div className="history-loading">
            <div className="history-spinner" />
            Carregando conversa...
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="msg-user-row">
                  <div className="msg-user-bubble">
                    {msg.preview && (
                      <img src={msg.preview} alt="anexo" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 8 }} />
                    )}
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="msg-assistant-row">
                  <div className="msg-avatar">
                    <Zap size={16} color="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="msg-assistant-content">
                      {msg.content ? (
                        <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                      ) : (
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      )}
                    </div>
                    {msg.content && (
                      <div className="msg-actions">
                        <button
                          className={`msg-action-btn ${copiedIdx === i ? 'copied' : ''}`}
                          onClick={() => handleCopy(msg.content, i)}
                        >
                          {copiedIdx === i ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="conv-input-area">
        <div className="conv-input-inner">
          {preview && arquivo && (
            <div className="preview-bar">
              <img src={preview} alt="preview" />
              <span className="preview-name">{arquivo.name}</span>
              <button onClick={removerArquivo} className="preview-remove"><X size={16} /></button>
            </div>
          )}
          {arquivo && !preview && (
            <div className="preview-bar">
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="#DC2626" />
              </div>
              <span className="preview-name">{arquivo.name}</span>
              <button onClick={removerArquivo} className="preview-remove"><X size={16} /></button>
            </div>
          )}
          <div className="conv-input-box">
            <button onClick={() => fileRef.current?.click()} className="attach-btn">
              <Paperclip size={20} />
            </button>
            <textarea
              ref={textareaRef}
              className="conv-textarea"
              placeholder="Digite sua mensagem..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
              }}
            />
            <button className="send-btn" onClick={enviar} disabled={loading || (!input.trim() && !arquivo)}>
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleArquivo(e.target.files[0])} style={{ display: 'none' }} />
      </div>
    </div>
  )
}