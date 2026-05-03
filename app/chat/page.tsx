'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, MessageSquare, Sparkles, Smartphone,
  Image as ImageIcon, FileText, LayoutTemplate,
  ArrowUp, Paperclip
} from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };

      reader.onerror = reject;
    });
  }

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar arquivo');
      }

      console.log('UPLOAD OK:', data);

      const base64 = await fileToBase64(file);

      setInput(
        `Imagem em base64:\n${base64}\n\nAnalise esta imagem.`
      );
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setLoading(false);

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  }

  async function enviar() {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setLoading(true);

    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: text.slice(0, 50) })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const convId = data.id;

      if (!convId) {
        throw new Error('Não foi possível criar a conversa.');
      }

      // CORRIGIDO: não envia base64 pela URL
      sessionStorage.setItem(`firstMessage:${convId}`, text);
      router.push(`/chat/${convId}`);
    } catch (error: any) {
      alert('Erro ao criar conversa: ' + error.message);
      setLoading(false);
    }
  }

  const modos = [
    { icon: <MessageSquare size={20} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.1)', label: 'Conversar', sub: 'Converse com IA sobre qualquer assunto.', prompt: '' },
    { icon: <Sparkles size={20} color="#F59E0B" />, bg: 'rgba(245, 158, 11, 0.1)', label: 'Gerar Imagem', sub: 'Crie imagens incríveis com inteligência artificial.', prompt: 'Gera uma imagem de: ' },
    { icon: <Smartphone size={20} color="#3B82F6" />, bg: 'rgba(59, 130, 246, 0.1)', label: 'Criar Post', sub: 'Gere legendas e hashtags para suas redes sociais.', prompt: 'Cria um post para Instagram sobre: ' },
    { icon: <ImageIcon size={20} color="#10B981" />, bg: 'rgba(16, 185, 129, 0.1)', label: 'Analisar Imagem', sub: 'Envie uma imagem e receba análises e insights.', prompt: 'Analise esta imagem.' },
    { icon: <FileText size={20} color="#8B5CF6" />, bg: 'rgba(139, 92, 246, 0.1)', label: 'Ler PDF', sub: 'Resuma e extraia informações de documentos PDF.', prompt: 'Leia e resuma este documento.' },
    { icon: <LayoutTemplate size={20} color="#8B5CF6" />, bg: 'rgba(139, 92, 246, 0.1)', label: 'Criar Componente', sub: 'Gere componentes React com preview em tempo real.', prompt: 'Cria um componente React de: ' }
  ];

  return (
    <div className="chat-page">
      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #ffffff;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .content-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .hero-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero-title {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #111827;
          margin-bottom: 12px;
        }
        .hero-subtitle {
          color: #6B7280;
          font-size: 18px;
          margin-bottom: 48px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          width: 100%;
        }
        .action-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          text-align: left;
          transition: all 0.2s;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .action-card:hover {
          background: #F9FAFB;
          border-color: #10B981;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
        }
        .card-icon-bg {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .card-title {
          font-weight: 700;
          color: #111827;
          font-size: 16px;
          display: block;
          margin-bottom: 8px;
        }
        .card-desc {
          color: #6B7280;
          font-size: 13px;
          line-height: 1.5;
        }
        .chat-input-wrapper {
          padding: 16px 24px 24px;
          background: linear-gradient(to top, #ffffff 70%, rgba(255, 255, 255, 0));
          position: sticky;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 40;
        }
        .chat-input-box {
          width: 100%;
          max-width: 800px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 20px;
          padding: 10px 12px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .chat-input-box:focus-within {
          border-color: #10B981;
          box-shadow: 0 2px 12px rgba(16, 185, 129, 0.12);
        }
        .chat-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #111827;
          padding: 8px 4px;
          resize: none;
          font-size: 15px;
          min-height: 24px;
          max-height: 200px;
          line-height: 1.5;
        }
        .chat-textarea::placeholder {
          color: #9CA3AF;
        }
        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #F3F4F6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .icon-btn:hover {
          background: #E5E7EB;
        }
        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #10B981;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) {
          background: #059669;
          transform: scale(1.05);
        }
        .send-btn:disabled {
          background: #D1D5DB;
          cursor: not-allowed;
        }
        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(2px);
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E5E7EB;
          border-top-color: #10B981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      <div className="main-content">
        <div className="content-scroll">
          <div className="hero-container">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Zap size={32} fill="#F59E0B" color="#F59E0B" />
            </div>

            <h1 className="hero-title">Super Agente</h1>
            <p className="hero-subtitle">Como posso ajudar você hoje?</p>

            <div className="cards-grid">
              {modos.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setInput(m.prompt)}
                  className="action-card"
                >
                  <div className="card-icon-bg" style={{ backgroundColor: m.bg }}>
                    {m.icon}
                  </div>
                  <span className="card-title">{m.label}</span>
                  <p className="card-desc">{m.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-input-wrapper">
          <div className="chat-input-box">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />

            <button
              type="button"
              className="icon-btn"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <Paperclip size={18} />
            </button>

            <textarea
              className="chat-textarea"
              placeholder="Digite sua mensagem..."
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />

            <button
              className="send-btn"
              onClick={enviar}
              disabled={loading || !input.trim()}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}