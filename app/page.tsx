'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  Sparkles, Smartphone, Image as ImageIcon, FileText, 
  ArrowUp, Paperclip, Globe
} from 'lucide-react'

export default function HomePage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function enviar() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setLoading(true)

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: text.slice(0, 50) })
      })
      const data = await res.json()
      if (data.id) {
        window.location.href = `/chat/${data.id}?firstMessage=${encodeURIComponent(text)}`
      }
    } catch {
      setLoading(false)
    }
  }

  const atalhos = [
    { icon: <FileText size={24} color="#10B981" />, title: 'Matéria jornalística', text: 'Escreva uma matéria jornalística sobre: ', bg: '#F0FDF4' },
    { icon: <Globe size={24} color="#3B82F6" />, title: 'Ler link', text: 'Leia este link e transforme em uma matéria: ', bg: '#EFF6FF' },
    { icon: <Smartphone size={24} color="#F59E0B" />, title: 'Post Instagram', text: 'Crie uma legenda para Instagram sobre: ', bg: '#FFFBEB' },
    { icon: <ImageIcon size={24} color="#8B5CF6" />, title: 'Analisar imagem', text: 'Analise esta imagem de forma profissional.', bg: '#F5F3FF' }
  ]

  return (
    <div className="home-container">
      <style>{`
        .home-container {
          padding: 60px 40px;
          max-width: 1000px;
          margin: 0 auto;
          color: #0F172A;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 64px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F0FDF4;
          border: 1px solid #DCFCE7;
          padding: 6px 14px;
          border-radius: 20px;
          color: #10B981;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
          color: #0F172A;
        }

        .hero-subtitle {
          font-size: 18px;
          color: #64748B;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }

        .shortcut-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 32px 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        }

        .shortcut-card:hover {
          border-color: #10B981;
          transform: translateY(-6px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
        }

        .icon-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .shortcut-title {
          font-weight: 700;
          font-size: 17px;
          margin-bottom: 8px;
          color: #1E293B;
        }

        .shortcut-desc {
          font-size: 13px;
          color: #64748B;
          line-height: 1.5;
        }

        .input-area-fixed {
          position: fixed;
          bottom: 40px;
          left: 300px;
          right: 40px;
          max-width: 800px;
          margin: 0 auto;
          z-index: 50;
        }

        @media (max-width: 1024px) {
          .input-area-fixed { left: 40px; }
        }

        .input-glass-box {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        }

        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0F172A;
          padding: 12px;
          resize: none;
          font-size: 16px;
          min-height: 48px;
          max-height: 200px;
        }

        .send-btn-main {
          width: 48px;
          height: 48px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn-main:hover:not(:disabled) {
          background: #059669;
          transform: scale(1.05);
        }

        .send-btn-main:disabled {
          background: #F1F5F9;
          color: #94A3B8;
          cursor: not-allowed;
        }
      `}</style>

      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} />
          Agente Ativo
        </div>
        <h1 className="hero-title">Super Agente</h1>
        <p className="hero-subtitle">
          Sua inteligência artificial avançada para produção de conteúdo, 
          estratégia de marketing e gestão jornalística regional.
        </p>

        <div className="shortcut-grid">
          {atalhos.map((a, i) => (
            <div key={i} className="shortcut-card" onClick={() => setInput(a.text)}>
              <div className="icon-box" style={{ background: a.bg }}>
                {a.icon}
              </div>
              <div className="shortcut-title">{a.title}</div>
              <div className="shortcut-desc">{a.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="input-area-fixed">
        <div className="input-glass-box">
          <button 
            className="send-btn-main" 
            style={{ background: 'transparent', border: '1px solid #E2E8F0', color: '#94A3B8' }}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          <textarea
            className="chat-textarea"
            placeholder="Como posso ajudar você hoje?"
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
            className="send-btn-main" 
            onClick={enviar}
            disabled={loading || !input.trim()}
          >
            {loading ? '...' : <ArrowUp size={20} />}
          </button>
        </div>
      </div>
      
      <input 
        ref={fileRef}
        type="file" 
        style={{ display: 'none' }} 
      />
    </div>
  )
}