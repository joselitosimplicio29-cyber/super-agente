'use client'

import { useState } from 'react'

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!input.trim()) return

    const newMessages = [
      ...messages,
      { role: 'user', content: input }
    ]

    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // adiciona resposta vazia do assistant
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '' }
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages
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

        setMessages((prev: any) => {
          const last = prev[prev.length - 1]

          if (last?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: result }
            ]
          }

          return [...prev, { role: 'assistant', content: result }]
        })
      }

    } catch (err) {
      console.error(err)
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Chat</h1>

      <div style={{ marginBottom: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Digite sua mensagem..."
        style={{ width: '70%', marginRight: 10 }}
      />

      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </div>
  )
}