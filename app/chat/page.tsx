'use client'

import { useState, useEffect, useRef } from 'react'
import CodePreview from '../components/CodePreview'
import MarkdownRenderer from '../components/MarkdownRenderer'

function extractCode(text: string) {
  const match = text.match(/```(?:jsx|tsx|js|javascript|react)?\n([\s\S]*?)```/)
  return match ? match[1] : null
}

// Remove o bloco de código do texto (pra não mostrar duplicado)
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
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleArquivo(file: File) {
    const reader = new FileReader()

    reader.onload = e => {
      const result = e.target?.result as string
      const base64 = result.split(',')[1]

      setArquivo({
        base64,
        type: file.type,
        name: file.name
      })

      if (file.type.startsWith('image/')) setPreview(result)
      else setPreview(null)
    }

    reader.readAsDataURL(file)
  }

  function removerArquivo() {
    setArquivo(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function criarConversa(texto: string) {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteSelecionado?.id,
        titulo: texto.slice(0, 50)
      })
    })

    const d = await res.json()

    if (d.id) {
      setConversationId(d.id)
      return d.id
    }

    return null
  }

  async function gerarImagem(prompt: string) {
    setGerandoImagem(true)

    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '🎨 Gerando imagem...' }
    ])

    try {
      const res = await fetch('/api/gerar-imagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      const data = await res.json()

      if (data.image) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: '🎨 Imagem gerada!',
            preview: data.image,
            isImage: true
          }
        ])
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: '❌ Erro ao gerar imagem.' }
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '❌ Erro ao gerar imagem.' }
      ])
    }

    setGerandoImagem(false)
  }

  async function enviar() {
    if ((!input.trim() && !arquivo) || loading) return

    let userContent: any = input.trim()

    if (arquivo) {
      if (arquivo.type.startsWith('image/')) {
        userContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: arquivo.type,
              data: arquivo.base64
            }
          },
          {
            type: 'text',
            text: input.trim() || 'Analise esta imagem.'
          }
        ]
      } else if (arquivo.type === 'application/pdf') {
        userContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: arquivo.base64
            }
          },
          {
            type: 'text',
            text: input.trim() || 'Leia e resuma este documento.'
          }
        ]
      }
    }

    const userMsg: Message = {
      role: 'user',
      content: typeof userContent === 'string'
        ? userContent
        : input.trim() || 'Arquivo enviado',
      preview: preview || undefined,
      fileName: arquivo?.name
    }

    const newMessages = [...messages, userMsg]

    setMessages(newMessages)
    setInput('')
    setArquivo(null)
    setPreview(null)

    if (fileRef.current) fileRef.current.value = ''

    setLoading(true)

    let convId = conversationId
    if (!convId) convId = await criarConversa(userMsg.content)

    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '' }
    ])

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: typeof userContent !== 'string' && m === userMsg
          ? userContent
          : m.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          conversation_id: convId,
          cliente: clienteSelecionado
        })
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        result += chunk

        setMessages(prev => {
          const last = prev[prev.length - 1]

          if (last?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: result }
            ]
          }

          return [
            ...prev,
            { role: 'assistant', content: result }
          ]
        })
      }

      if (result.includes('GERAR_IMAGEM:')) {
        const match = result.match(/GERAR_IMAGEM:\s*(.+)/i)
        if (match) await gerarImagem(match[1].trim())
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '❌ Erro ao conectar.' }
      ])
    }

    setLoading(false)
  }

  const modos = [
    { icon: '💬', label: 'Conversar', sub: 'Texto com IA', prompt: '', acao: null },
    { icon: '🎨', label: 'Gerar Imagem', sub: 'Cloudflare AI', prompt: 'Gera uma imagem de: ', acao: null },
    { icon: '📱', label: 'Criar Post', sub: 'Legenda + hashtags', prompt: 'Cria um post para Instagram sobre: ', acao: null },
    { icon: '🖼️', label: 'Analisar Imagem', sub: 'Envie uma foto', prompt: 'Analise esta imagem.', acao: 'imagem' },
    { icon: '📄', label: 'Ler PDF', sub: 'Resumo do documento', prompt: 'Leia e resuma este documento.', acao: 'pdf' },
    { icon: '⚛️', label: 'Criar Componente', sub: 'React + Preview', prompt: 'Cria um componente React de: ', acao: null }
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#FAFAF7',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#2C2C2A',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '0.5px solid #E5E3DC',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#FFFFFF',
        flexShrink: 0
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#1D9E75'
        }} />

        <span style={{ color: '#5F5E5A', fontSize: 13 }}>
          Claude Opus 4.7
        </span>

        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <select
            value={clienteSelecionado?.id || ''}
            onChange={e =>
              setClienteSelecionado(
                clientes.find(c => c.id === e.target.value) || null
              )
            }
            style={{
              background: '#FFFFFF',
              border: '0.5px solid #E5E3DC',
              borderRadius: 8,
              padding: '6px 10px',
              color: '#2C2C2A',
              fontSize: 12,
              outline: 'none'
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
            onClick={() => {
              setMessages([])
              setConversationId(null)
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '0.5px solid #E5E3DC',
              background: '#FFFFFF',
              color: '#2C2C2A',
              fontSize: 12,
              fontWeight: 400,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            + Nova
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}>
        {messages.length === 0 && (
          <div style={{
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            paddingTop: 40
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
              <div style={{ color: '#2C2C2A', fontWeight: 500, fontSize: 22 }}>
                Super Agente
              </div>
              <div style={{ color: '#5F5E5A', fontSize: 13, marginTop: 4 }}>
                Como posso ajudar hoje?
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              width: '100%',
              maxWidth: 560
            }}>
              {modos.map(m => (
                <button
                  key={m.label}
                  onClick={() => {
                    setInput(m.prompt)
                    if (m.acao === 'imagem' || m.acao === 'pdf') {
                      fileRef.current?.click()
                    }
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '0.5px solid #E5E3DC',
                    borderRadius: 12,
                    padding: '14px 10px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: 'inherit'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#B4B2A9'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#E5E3DC'}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{
                    color: '#2C2C2A',
                    fontSize: 13,
                    fontWeight: 500
                  }}>
                    {m.label}
                  </div>
                  <div style={{
                    color: '#888780',
                    fontSize: 11,
                    marginTop: 2
                  }}>
                    {m.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const code = msg.role === 'assistant' && msg.content
            ? extractCode(msg.content)
            : null

          const textWithoutCode = code ? stripCode(msg.content) : msg.content
          const hasCode = !!code

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 10,
                alignItems: 'flex-start'
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#BA7517',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 500,
                  flexShrink: 0
                }}>
                  S
                </div>
              )}

              <div style={{
                maxWidth: msg.role === 'user' ? '75%' : (hasCode ? '100%' : 'auto'),
                width: hasCode ? '100%' : 'auto',
                background: msg.role === 'user'
                  ? '#F1EFE8'
                  : (hasCode ? '#FFFFFF' : 'transparent'),
                border: (msg.role === 'assistant' && hasCode)
                  ? '0.5px solid #E5E3DC'
                  : 'none',
                borderRadius: msg.role === 'user'
                  ? '12px'
                  : (hasCode ? '8px' : '0px'),
                padding: msg.role === 'user'
                  ? '10px 14px'
                  : (hasCode ? '12px 14px' : '0'),
                fontSize: 14,
                lineHeight: 1.7,
                color: '#2C2C2A',
                whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal'
              }}>
                {msg.preview && (
                  <img
                    src={msg.preview}
                    alt="anexo"
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      borderRadius: 8,
                      marginBottom: 8,
                      display: 'block'
                    }}
                  />
                )}

                {msg.fileName && !msg.preview && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#FFFFFF',
                    border: '0.5px solid #E5E3DC',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ fontSize: 12, color: '#2C2C2A' }}>{msg.fileName}</span>
                  </div>
                )}

                {!msg.isImage && msg.role === 'assistant' && textWithoutCode && (
                  <MarkdownRenderer>{textWithoutCode}</MarkdownRenderer>
                )}
                {!msg.isImage && msg.role === 'user' && textWithoutCode}

                {msg.isImage && (
                  <div style={{ marginTop: 4 }}>
                    <a
                      href={msg.preview}
                      download={`imagem-${Date.now()}.png`}
                      style={{
                        display: 'inline-block',
                        marginTop: 8,
                        padding: '5px 10px',
                        borderRadius: 8,
                        background: '#FFFFFF',
                        border: '0.5px solid #E5E3DC',
                        color: '#444441',
                        fontSize: 12,
                        textDecoration: 'none'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#F1EFE8'}
                      onMouseOut={e => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      ⬇️ Baixar imagem
                    </a>
                  </div>
                )}

                {msg.role === 'assistant' && !msg.isImage && msg.content && (
                  <>
                    {code && <CodePreview code={code} />}

                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      style={{
                        marginTop: 12,
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: '0.5px solid #E5E3DC',
                        background: '#FFFFFF',
                        color: '#444441',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 400,
                        fontFamily: 'inherit',
                        display: 'block'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#F1EFE8'}
                      onMouseOut={e => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      Copiar resposta
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {(loading || gerandoImagem) &&
          !messages.find(m => m.role === 'assistant' && m.content === '') && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#BA7517',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 500
              }}>
                S
              </div>
              <div style={{ color: '#888780', fontSize: 14 }}>
                {gerandoImagem ? '🎨 Gerando imagem...' : 'Pensando...'}
              </div>
            </div>
          )}

        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '14px 20px',
        borderTop: '0.5px solid #E5E3DC',
        background: '#FFFFFF',
        flexShrink: 0
      }}>
        {(preview || arquivo) && (
          <div style={{
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#FAFAF7',
            border: '0.5px solid #E5E3DC',
            borderRadius: 8,
            padding: '8px 12px'
          }}>
            {preview ? (
              <img
                src={preview}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  objectFit: 'cover'
                }}
              />
            ) : (
              <span style={{ fontSize: 24 }}>📄</span>
            )}

            <span style={{
              fontSize: 12,
              color: '#5F5E5A',
              flex: 1
            }}>
              {arquivo?.name}
            </span>

            <button
              onClick={removerArquivo}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888780',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#2C2C2A'}
              onMouseOut={e => e.currentTarget.style.color = '#888780'}
            >
              ✕
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

        <div style={{
          background: '#FAFAF7',
          border: '0.5px solid #E5E3DC',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
        onFocus={e => e.currentTarget.style.borderColor = '#B4B2A9'}
        onBlur={e => e.currentTarget.style.borderColor = '#E5E3DC'}
        >
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888780',
              cursor: 'pointer',
              fontSize: 18,
              padding: '0 4px'
            }}
            title="Anexar"
          >
            📎
          </button>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar()
              }
            }}
            placeholder="Mensagem, link, ou anexe imagem/PDF..."
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#2C2C2A',
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: 1.5
            }}
          />

          <button
            onClick={enviar}
            disabled={loading || gerandoImagem || (!input.trim() && !arquivo)}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: loading || gerandoImagem || (!input.trim() && !arquivo)
                ? '#D3D1C7'
                : '#2C2C2A',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 14,
              cursor: loading || gerandoImagem || (!input.trim() && !arquivo) ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 400,
              flexShrink: 0
            }}
            onMouseOver={e => {
              if (!loading && !gerandoImagem && (input.trim() || arquivo)) {
                e.currentTarget.style.background = '#444441'
              }
            }}
            onMouseOut={e => {
              if (!loading && !gerandoImagem && (input.trim() || arquivo)) {
                e.currentTarget.style.background = '#2C2C2A'
              }
            }}
          >
            →
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          color: '#888780',
          fontSize: 11,
          marginTop: 8
        }}>
          Enter para enviar...
        </div>
      </div>
    </div>
  )
}