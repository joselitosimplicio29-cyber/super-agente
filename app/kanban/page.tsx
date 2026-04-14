'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Prioridade = 'baixa' | 'media' | 'alta'
type Coluna = 'todo' | 'doing' | 'done'

interface Card {
  id: string
  titulo: string
  descricao?: string
  coluna: Coluna
  cliente?: string
  prioridade: Prioridade
  data_limite?: string
  created_at: string
}

const COLUNAS: { id: Coluna; label: string; cor: string }[] = [
  { id: 'todo',  label: 'A Fazer',      cor: '#6B7280' },
  { id: 'doing', label: 'Em Andamento', cor: '#F59E0B' },
  { id: 'done',  label: 'Concluido',    cor: '#10B981' },
]

const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: '#10B981',
  media: '#F59E0B',
  alta:  '#EF4444',
}

export default function KanbanPage() {
  const supabase = createClient()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [form, setForm] = useState({
    titulo: '', descricao: '', coluna: 'todo' as Coluna,
    cliente: '', prioridade: 'media' as Prioridade, data_limite: ''
  })

  useEffect(() => { fetchCards() }, [])

  async function fetchCards() {
    const { data } = await supabase.from('kanban_cards').select('*').order('created_at', { ascending: false })
    setCards(data || [])
    setLoading(false)
  }

  async function criarCard() {
    if (!form.titulo.trim()) return
    await supabase.from('kanban_cards').insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      coluna: form.coluna,
      cliente: form.cliente || null,
      prioridade: form.prioridade,
      data_limite: form.data_limite || null,
    })
    setForm({ titulo: '', descricao: '', coluna: 'todo', cliente: '', prioridade: 'media', data_limite: '' })
    setModal(false)
    fetchCards()
  }

  async function moverCard(id: string, novaColuna: Coluna) {
    await supabase.from('kanban_cards').update({ coluna: novaColuna }).eq('id', id)
    setCards(prev => prev.map(c => c.id === id ? { ...c, coluna: novaColuna } : c))
  }

  async function deletarCard(id: string) {
    await supabase.from('kanban_cards').delete().eq('id', id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  function onDragStart(id: string) { setDragging(id) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(e: React.DragEvent, coluna: Coluna) {
    e.preventDefault()
    if (dragging) { moverCard(dragging, coluna); setDragging(null) }
  }

  const cardsPorColuna = (col: Coluna) => cards.filter(c => c.coluna === col)

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: 'Montserrat, sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ color: '#F59E0B', fontSize: 28, fontWeight: 800, margin: 0 }}>Kanban</h1>
          <p style={{ color: '#94A3B8', fontSize: 14, margin: '4px 0 0' }}>Gerencie tarefas e projetos</p>
        </div>
        <button onClick={() => setModal(true)} style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Novo Card
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', textAlign: 'center', padding: 60 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {COLUNAS.map(col => (
            <div key={col.id} onDragOver={onDragOver} onDrop={e => onDrop(e, col.id)}
              style={{ background: '#1E293B', borderRadius: 16, padding: 16, minHeight: 400, border: col.id === 'doing' ? '2px solid #F59E0B33' : '2px solid #ffffff10' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ color: col.cor, fontWeight: 700, fontSize: 15 }}>{col.label}</span>
                <span style={{ background: '#0F172A', color: '#94A3B8', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                  {cardsPorColuna(col.id).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cardsPorColuna(col.id).map(card => (
                  <div key={card.id} draggable onDragStart={() => onDragStart(card.id)}
                    style={{ background: '#0F172A', borderRadius: 12, padding: 14, border: '1px solid #ffffff15', cursor: 'grab', borderLeft: '4px solid ' + PRIORIDADE_COR[card.prioridade] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14, margin: 0, flex: 1 }}>{card.titulo}</p>
                      <button onClick={() => deletarCard(card.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px' }}>x</button>
                    </div>
                    {card.descricao && <p style={{ color: '#64748B', fontSize: 12, margin: '6px 0 0' }}>{card.descricao}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {card.cliente && <span style={{ background: '#1E3A8A33', color: '#93C5FD', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{card.cliente}</span>}
                      <span style={{ background: PRIORIDADE_COR[card.prioridade] + '22', color: PRIORIDADE_COR[card.prioridade], borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {card.prioridade.toUpperCase()}
                      </span>
                      {card.data_limite && <span style={{ background: '#ffffff10', color: '#94A3B8', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{new Date(card.data_limite).toLocaleDateString('pt-BR')}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {COLUNAS.filter(c => c.id !== col.id).map(c => (
                        <button key={c.id} onClick={() => moverCard(card.id, c.id)}
                          style={{ background: '#ffffff08', border: '1px solid #ffffff15', color: '#94A3B8', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer' }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {cardsPorColuna(col.id).length === 0 && (
                  <div style={{ color: '#334155', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>Arraste cards aqui</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1E293B', borderRadius: 20, padding: 32, width: 480, border: '1px solid #ffffff15' }}>
            <h2 style={{ color: '#F59E0B', margin: '0 0 24px', fontSize: 20, fontWeight: 800 }}>Novo Card</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input placeholder="Titulo" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} style={inputStyle} />
              <textarea placeholder="Descricao" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={3} style={{...inputStyle, resize: 'vertical'}} />
              <input placeholder="Cliente" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <select value={form.coluna} onChange={e => setForm({...form, coluna: e.target.value as Coluna})} style={inputStyle}>
                  <option value="todo">A Fazer</option>
                  <option value="doing">Em Andamento</option>
                  <option value="done">Concluido</option>
                </select>
                <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value as Prioridade})} style={inputStyle}>
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
                <input type="date" value={form.data_limite} onChange={e => setForm({...form, data_limite: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: '#0F172A', color: '#94A3B8', border: '1px solid #ffffff20', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={criarCard} style={{ flex: 2, background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Criar Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0F172A', border: '1px solid #ffffff20', borderRadius: 10,
  padding: '10px 14px', color: '#F1F5F9', fontSize: 14, width: '100%',
  outline: 'none', fontFamily: 'Montserrat, sans-serif'
}