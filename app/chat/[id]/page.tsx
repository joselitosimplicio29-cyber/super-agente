'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Zap, ArrowUp, Paperclip, Copy, Check, MoreHorizontal } from 'lucide-react'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { useChatContext } from '../ChatContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UploadedFile {
  name: string
  type: string
  base64: string
  preview: string
}

export default function ChatConversationPage() {
  const params = useParams()
  const id = params.id as string
  const { triggerRefresh } = useChatContext()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [firstMessageProcessed, setFirstMessageProcessed] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [conversationTitle, setConversationTitle] = useState('')
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }

      reader.onerror = reject
    })
  }

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
      } catch (err) {
        console.error(err)
      }

      setLoadingHistory(false)
    }

    if (id) load()
  }, [id])

  useEffect(() => {
    if (firstMessageProcessed || loadingHistory) return

    const firstMessage = sessionStorage.getItem(`firstMessage:${id}`)
    sessionStorage.removeItem(`firstMessage:${id}`)

    if (firstMessage && messages.length === 0) {
      setFirstMessageProcessed(true)
      processMessage(firstMessage)
    } else {
      setFirstMessageProcessed(true)
    }
  }, [loadingHistory, firstMessageProcessed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Por enquanto o preview/análise está configurado para imagens.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar arquivo')
      }

      const base64 = await fileToBase64(file)

      setUploadedFile({
        name: data.name || file.name,
        type: file.type,
        base64,
        preview: `data:${file.type};base64,${base64}`,
      })

      setInput(`Analise esta imagem: ${data.name || file.name}`)
    } catch (error: any) {
      alert('Erro no upload: ' + error.message)
    } finally {
      setLoading(false)

      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  function removeUploadedFile() {
    setUploadedFile(null)
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
    } catch (err) {
      console.error(err)
    }
  }

  async function processMessage(text: string) {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]

    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    await saveMessage('user', text)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          conversation_id: id,
          arquivo: uploadedFile,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Erro')
      }

      const data = await response.json()
      const assistantText = data.text || 'Não consegui gerar uma resposta.'

      setMessages(prev => {
        const copy = [...prev]

        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: assistantText,
          }
        }

        return copy
      })

      await saveMessage('assistant', assistantText)
      setUploadedFile(null)
      triggerRefresh()
    } catch (err) {
      console.error(err)

      setMessages(prev => {
        const copy = [...prev]

        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
          copy[copy.length - 1] = {
            role: 'assistant',
            content: '❌ Erro ao conectar.',
          }
        }

        return copy
      })
    }

    setLoading(false)
  }

  async function enviar() {
    if (!input.trim() || loading) return
    await processMessage(input.trim())
  }

  return (
    <div className="chat-root-light">
      <style>{`
        .chat-root-light {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: #FFFFFF;
          color: #0F172A;
        }

        .chat-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: #FFFFFF;
          border-bottom: 1px solid #F1F5F9;
          z-index: 10;
        }

        .chat-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #1E293B;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chat-scroll {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        .chat-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        .msg-user-box {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }

        .msg-user-content {
          max-width: 80%;
          background: #111827;
          color: #FFFFFF;
          padding: 14px 20px;
          border-radius: 20px 20px 4px 20px;
          font-size: 15px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

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
        }

        .msg-text {
          font-size: 15px;
          line-height: 1.8;
          color: #334155;
        }

        .actions-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .action-btn {
          background: transparent;
          border: 1px solid #E2E8F0;
          color: #64748B;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .chat-footer {
          padding: 16px 24px 24px;
          background: #FFFFFF;
          border-top: 1px solid #F1F5F9;
        }

        .input-box-wrapper {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .attachment-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 8px;
          width: fit-content;
          max-width: 280px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        }

        .attachment-image {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          flex-shrink: 0;
        }

        .attachment-info {
          flex: 1;
          min-width: 0;
        }

        .attachment-name {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 150px;
        }

        .attachment-type {
          font-size: 11px;
          color: #64748B;
          margin-top: 2px;
        }

        .attachment-remove {
          border: none;
          background: #F1F5F9;
          color: #334155;
          border-radius: 999px;
          width: 22px;
          height: 22px;
          cursor: pointer;
          font-size: 16px;
          line-height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .attachment-remove:hover {
          background: #E2E8F0;
        }

        .input-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          padding: 10px 14px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }

        .textarea-main {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0F172A;
          padding: 8px 4px;
          resize: none;
          font-size: 16px;
          min-height: 24px;
          max-height: 160px;
          font-family: inherit;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          background: transparent;
          flex-shrink: 0;
        }

        .btn-send {
          background: #10B981;
          color: white;
        }

        .btn-send:hover:not(:disabled) {
          background: #059669;
        }

        .btn-send:disabled {
          background: #E2E8F0;
          color: #94A3B8;
          cursor: not-allowed;
        }
      `}</style>

      <header className="chat-header">
        <span className="chat-header-title">
          {conversationTitle || 'Nova conversa'}
        </span>

        <button className="action-btn">
          <MoreHorizontal size={18} />
        </button>
      </header>

      <div className="chat-scroll">
        {loadingHistory ? (
          <div style={{ padding: 100, textAlign: 'center', color: '#94A3B8' }}>
            Carregando...
          </div>
        ) : (
          <div className="chat-inner">
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="msg-user-box">
                  <div className="msg-user-content">{msg.content}</div>
                </div>
              ) : (
                <div key={i} className="msg-assistant-box">
                  <div className="avatar-ai">
                    <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="msg-text">
                      {msg.content ? (
                        <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                      ) : (
                        '...'
                      )}
                    </div>

                    {msg.content && (
                      <div className="actions-row">
                        <button
                          className="action-btn"
                          onClick={() => handleCopy(msg.content, i)}
                        >
                          {copiedIdx === i ? (
                            <>
                              <Check size={14} /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Copiar
                            </>
                          )}
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

      <footer className="chat-footer">
        <div className="input-box-wrapper">
          {uploadedFile && (
            <div className="attachment-preview">
              <img
                src={uploadedFile.preview}
                alt={uploadedFile.name}
                className="attachment-image"
              />

              <div className="attachment-info">
                <div className="attachment-name">{uploadedFile.name}</div>
                <div className="attachment-type">Imagem anexada</div>
              </div>

              <button
                type="button"
                className="attachment-remove"
                onClick={removeUploadedFile}
                aria-label="Remover imagem"
                disabled={loading}
              >
                ×
              </button>
            </div>
          )}

          <div className="input-box">
            <button
              type="button"
              className="icon-btn"
              style={{ color: '#94A3B8' }}
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <Paperclip size={20} />
            </button>

            <textarea
              ref={textareaRef}
              className="textarea-main"
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
              className="icon-btn btn-send"
              onClick={enviar}
              disabled={loading || !input.trim()}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
      </footer>
    </div>
  )
}