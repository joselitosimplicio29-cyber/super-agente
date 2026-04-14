'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Nota {
  id: string
  conteudo: string
  categoria: string
  origem: 'dashboard' | 'whatsapp'
  created_at: string
}

const CATEGORIAS = ['geral', 'ideia', 'lembrete', 'projeto', 'financeiro', 'pessoal']

const CAT_COR: Record<string, string> = {
  geral:      '#6B7280',
  ideia:      '#8B5CF6',
  lembrete:   '#F59E0B',
  projeto:    '#3B82F6',
  financeiro: '#10B981',
  pessoal:    '#EC4899',
}

export default function NotasPage() {
  const supabase = createClient()
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('geral')
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { fetchNotas() }, [])

  async function fetchNotas() {
    const { data } = await supabase.from('notas').select('*').order('created_at', { ascending: false })
    setNotas(data || [])
    setLoading(false)
  }

  async function salvarNota() {
    if (!texto.trim()) return
    setSalvando(true)
    await supabase.from('notas').insert({ conteudo: texto, categoria, origem: 'dashboard' })
    setTexto('')
    setCategoria('geral')
    setSalvando(false)
    fetchNotas()
  }

  async function deletarNota(id: string) {
    await supabase.from('notas').delete().eq('id', id)
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  const notasFiltradas = notas.filter(n => {
    const buscaOk = n.conteudo.toLowerCase().includes(busca.toLowerCase())
    const catOk = filtroCategoria === 'todas' || n.categoria === filtroCategoria
    return buscaOk && catOk
  })

  function formatarData(dt: string) {
    const d = new Date(dt)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: "'Montserrat', sans-serif", padding: '24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#F59E0B', fontSize: 28, fontWeight: 800, margin: 0 }}>Notas Rapidas</h1>
        <p style={{ color: '#94A3B8', fontSize: 14, margin: '4px 0 0' }}>
          Salve ideias e lembretes. Pela Lumi use SALVAR: texto
        </p>
      </div>

      <div style={{ background: '#1E293B', borderRadius: 16, padding: 24, marginBottom: 32, border: '1px solid #F59E0B33' }}>
        <textarea
          placeholder="Digite sua nota aqui..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') salvarNota() }}
          rows={4}
          style={{ width: '100%', background: '#0F172A', border: '1px solid #ffffff20', borderRadius: 10, padding: '12px 14px', color: '#F1F5F9', fontSize: 15, resize: 'vertical', outline: 'none', fontFamily: "'Montserrat', sans-serif", boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                style={{ background: categoria === cat ? CAT_COR[cat] + '33' : '#0F172A', color: categoria === cat ? CAT_COR[cat] : '#64748B', border: '1px solid ' + (categoria === cat ? CAT_COR[cat] : '#ffffff15'), borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: categoria === cat ? 700 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          <button onClick={salvarNota} disabled={salvando || !texto.trim()}
            style={{ background: texto.trim() ? 'linear-gradient(135deg, #1E3A8A, #2563EB)' : '#1E293B', color: texto.trim() ? '#fff' : '#475569', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: texto.trim() ? 'pointer' : 'not-allowed' }}>
            {salvando ? 'Salvando...' : 'Salvar (Ctrl+Enter)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Buscar notas..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ background: '#1E293B', border: '1px solid #ffffff20', borderRadius: 10, padding: '8px 14px', color: '#F1F5F9', fontSize: 14, outline: 'none', fontFamily: "'Montserrat', sans-serif", width: 260 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroCategoria('todas')}
            style={{ background: filtroCategoria === 'todas' ? '#F59E0B22' : '#1E293B', color: filtroCategoria === 'todas' ? '#F59E0B' : '#64748B', border: '1px solid ' + (filtroCategoria === 'todas' ? '#F59E0B' : '#ffffff15'), borderRadius: 20, padding: '4px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            Todas ({notas.length})
          </button>
          {CATEGORIAS.map(cat => {
            const count = notas.filter(n => n.categoria === cat).length
            if (count === 0) return null
            return (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                style={{ background: filtroCategoria === cat ? CAT_COR[cat] + '22' : '#1E293B', color: filtroCategoria === cat ? CAT_COR[cat] : '#64748B', border: '1px solid ' + (filtroCategoria === cat ? CAT_COR[cat] : '#ffffff15'), borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', textAlign: 'center', padding: 60 }}>Carregando...</div>
      ) : notasFiltradas.length === 0 ? (
        <div style={{ color: '#334155', textAlign: 'center', padding: 60, fontSize: 16 }}>
          {busca ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {notasFiltradas.map(nota => (
            <div key={nota.id} style={{ background: '#1E293B', borderRadius: 14, padding: 18, border: '1px solid ' + (CAT_COR[nota.categoria] || '#ffffff15') + '22', borderTop: '3px solid ' + (CAT_COR[nota.categoria] || '#6B7280') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: (CAT_COR[nota.categoria] || '#6B7280') + '22', color: CAT_COR[nota.categoria] || '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {nota.categoria}
                  </span>
                  {nota.origem === 'whatsapp' && (
                    <span style={{ background: '#10B98122', color: '#10B981', borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>WhatsApp</span>
                  )}
                </div>
                <button onClick={() => deletarNota(nota.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>x</button>
              </div>
              <p style={{ color: '#E2E8F0', fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{nota.conteudo}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: '12px 0 0' }}>{formatarData(nota.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}