'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Cliente { id: string; nome: string }
interface Conteudo { legenda: string; hashtags: string; prompt_imagem: string }
interface Historico {
  id: string; tema: string; legenda: string; hashtags: string
  status: string; created_at: string; clients?: { nome: string }
}
interface Evento {
  id: string; titulo: string; data: string; hora: string; tipo: string; local: string; observacoes?: string
}

const AZUL = '#1E3A8A'
const AZUL_MEDIO = '#2d52b8'
const AZUL_CLARO = '#3b63d4'
const AMARELO = '#F59E0B'
const AMARELO_CLARO = '#fbbf24'
const FUNDO = '#0f1729'
const CARD = '#162040'
const CARD2 = '#1a2850'
const BORDA = '#1e3a8a33'

export default function Home() {function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [brandKits, setBrandKits] = useState<Record<string, any>>({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregarClientesPage() }, [])

  async function carregarClientesPage() {
    setCarregando(true)
    try {
      const { data } = await supabase
        .from('clients')
        .select('*, brand_kit(*), contratos(*)')
        .order('nome')
      if (data) {
        setClientes(data)
        const kits: Record<string, any> = {}
        data.forEach((c: any) => {
          if (c.brand_kit?.length > 0) kits[c.id] = c.brand_kit[0]
        })
        setBrandKits(kits)
      }
    } catch {}
    finally { setCarregando(false) }
  }

  if (carregando) return (
    <div style={{ textAlign: 'center', color: '#ffffff33', padding: 60, fontSize: 14 }}>⏳ Carregando clientes...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#162040', border: '1px solid #1e3a8a33', borderRadius: 20, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>👥 Clientes Ativos ({clientes.length})</div>
          <button style={{ background: '#F59E0B', border: 'none', borderRadius: 10, color: '#1a1a1a', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Novo Cliente</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {clientes.map((c: any) => {
            const kit = brandKits[c.id]
            const contrato = c.contratos?.[0]
            return (
              <div key={c.id} style={{ background: '#1a2850', border: '1px solid #1e3a8a33', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#F59E0B66'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#1e3a8a33'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {kit ? (
                      [kit.cor_primaria, kit.cor_secundaria, kit.cor_acento].map((cor: string, i: number) => (
                        <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: cor, border: '1px solid rgba(255,255,255,0.2)' }} />
                      ))
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏢</div>
                    )}
                  </div>
                  <span style={{ background: '#22c55e22', border: '1px solid #22c55e44', color: '#22c55e', fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>ATIVO</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf6', marginBottom: 4 }}>{c.nome}</div>
                {kit?.instagram && <div style={{ fontSize: 11, color: '#F59E0B', marginBottom: 6 }}>{kit.instagram}</div>}
                <div style={{ fontSize: 20, fontWeight: 900, color: '#F59E0B' }}>
                  R$ {(c.valor_mensal || contrato?.valor_mensal || 0).toLocaleString('pt-BR')}
                  <span style={{ fontSize: 11, color: '#ffffff33', fontWeight: 400 }}>/mês</span>
                </div>
                {kit?.tom_de_voz && <div style={{ fontSize: 11, color: '#ffffff44', marginTop: 4 }}>{kit.tom_de_voz}</div>}
                {kit?.slogan && <div style={{ fontSize: 11, color: '#ffffff33', marginTop: 2, fontStyle: 'italic' }}>"{kit.slogan}"</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
  const [pagina, setPagina] = useState('gerar')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [tema, setTema] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Conteudo | null>(null)
  const [historico, setHistorico] = useState<Historico[]>([])
  const [copiado, setCopiado] = useState('')
  const [totalGerados, setTotalGerados] = useState(0)

  // Financeiro state
  const [transacoes] = useState([
    { id: 1, tipo: 'entrada', descricao: 'Câmara Umburanas', valor: 1600, data: '2026-04-01', categoria: 'Contrato' },
    { id: 2, tipo: 'entrada', descricao: 'Prefeitura Umburanas', valor: 1000, data: '2026-04-02', categoria: 'Contrato' },
    { id: 3, tipo: 'entrada', descricao: 'CCAAU', valor: 2500, data: '2026-04-03', categoria: 'Contrato' },
    { id: 4, tipo: 'entrada', descricao: 'ADM Mármores', valor: 500, data: '2026-04-05', categoria: 'Contrato' },
    { id: 5, tipo: 'saida', descricao: 'Nycolas - Salário', valor: 300, data: '2026-04-05', categoria: 'Folha' },
    { id: 6, tipo: 'entrada', descricao: 'Ourocar', valor: 200, data: '2026-04-06', categoria: 'Contrato' },
    { id: 7, tipo: 'saida', descricao: 'Hospedagem servidor', valor: 80, data: '2026-04-07', categoria: 'Tecnologia' },
    { id: 8, tipo: 'entrada', descricao: 'Pablo', valor: 500, data: '2026-04-08', categoria: 'Contrato' },
  ])

  // Agenda state — busca do Supabase
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregandoEventos, setCarregandoEventos] = useState(true)
  const [novoEvento, setNovoEvento] = useState({ titulo: '', data: '', hora: '', local: '', tipo: 'Reunião' })
  const [salvandoEvento, setSalvandoEvento] = useState(false)
  const [modalEvento, setModalEvento] = useState(false)

  useEffect(() => {
    carregarClientes()
    carregarHistorico()
    carregarEventos()
  }, [])

  async function carregarClientes() {
    const { data } = await supabase.from('clients').select('id, nome').order('nome')
    if (data) setClientes(data)
  }

  async function carregarHistorico() {
    const { data, count } = await supabase
      .from('contents').select('*, clients(nome)', { count: 'exact' })
      .order('created_at', { ascending: false }).limit(20)
    if (data) { setHistorico(data); setTotalGerados(count ?? data.length) }
  }

  async function carregarEventos() {
    setCarregandoEventos(true)
    try {
      const res = await fetch('/api/agenda')
      const data = await res.json()
      if (data.success) setEventos(data.eventos || [])
    } catch {}
    finally { setCarregandoEventos(false) }
  }

  async function salvarEvento() {
    if (!novoEvento.titulo || !novoEvento.data) return
    setSalvandoEvento(true)
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: `${novoEvento.titulo} dia ${novoEvento.data} às ${novoEvento.hora} em ${novoEvento.local} tipo ${novoEvento.tipo}` })
      })
      const data = await res.json()
      if (data.success) {
        setModalEvento(false)
        setNovoEvento({ titulo: '', data: '', hora: '', local: '', tipo: 'Reunião' })
        carregarEventos()
      }
    } catch {}
    finally { setSalvandoEvento(false) }
  }

  async function gerar() {
    if (!clienteId || !tema) return
    setLoading(true); setResultado(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clienteId, tema })
      })
      const data = await res.json()
      if (data.success) { setResultado(data); carregarHistorico() }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function copiar(texto: string, campo: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(campo); setTimeout(() => setCopiado(''), 2000)
  }

  const totalEntradas = transacoes.filter(t => t.tipo === 'entrada').reduce((a, b) => a + b.valor, 0)
  const totalSaidas = transacoes.filter(t => t.tipo === 'saida').reduce((a, b) => a + b.valor, 0)
  const saldo = totalEntradas - totalSaidas

 
   const nav = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'gerar', icon: '⚡', label: 'Gerar Conteúdo' },
  { id: 'midia', icon: '🎯', label: 'Mídia', href: '/midia' },
  { id: 'historico', icon: '📋', label: 'Histórico' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'financeiro', icon: '💰', label: 'Financeiro' },
  { id: 'agenda', icon: '📅', label: 'Agenda' },
]
  

  const tipoEvento: Record<string, string> = {
    transmissao: AMARELO, Transmissão: AMARELO,
    gravacao: '#22c55e', Gravação: '#22c55e',
    reuniao: AZUL_CLARO, Reunião: AZUL_CLARO,
    entrega: '#a855f7', Entrega: '#a855f7',
    cobertura: '#ef4444', Cobertura: '#ef4444',
  }

  return (
    <main style={{ minHeight: '100vh', background: FUNDO, color: '#e8eaf6', fontFamily: "'Sora', 'Segoe UI', sans-serif", display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: AZUL, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20, boxShadow: '4px 0 24px #00000044' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #ffffff22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: AMARELO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 20px ${AMARELO}66` }}>📡</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '-0.3px', color: '#fff' }}>TV Sertão Livre</div>
              <div style={{ fontSize: 10, color: '#ffffff66', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Super Agente IA</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {nav.map(item => (
  item.href ? (
    <a key={item.id} href={item.href}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, marginBottom: 4, cursor: 'pointer', background: 'transparent', color: '#ffffff88', fontSize: 13, fontWeight: 400, textDecoration: 'none', transition: 'all 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff11'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff88' }}>
      <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
    </a>
  ) : (
    <div key={item.id} onClick={() => setPagina(item.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, marginBottom: 4, cursor: 'pointer', background: pagina === item.id ? AMARELO : 'transparent', color: pagina === item.id ? '#1a1a1a' : '#ffffff88', fontSize: 13, fontWeight: pagina === item.id ? 700 : 400, transition: 'all 0.2s', boxShadow: pagina === item.id ? `0 4px 16px ${AMARELO}44` : 'none' }}>
      <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
    </div>
  )
))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #ffffff22' }}>
          <div style={{ background: '#ffffff11', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#ffffff55', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Posts gerados</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: AMARELO }}>{totalGerados}</div>
            <div style={{ fontSize: 11, color: '#ffffff44' }}>total no sistema</div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div style={{ marginLeft: 240, flex: 1, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: 0, color: '#fff' }}>
              {nav.find(n => n.id === pagina)?.icon} {nav.find(n => n.id === pagina)?.label}
            </h1>
            <p style={{ color: '#ffffff44', fontSize: 12, margin: '4px 0 0' }}>TV Sertão Livre · Ourolândia, BA</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#162040', border: `1px solid ${AZUL}66`, borderRadius: 20, padding: '8px 16px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>Sistema online</span>
          </div>
        </div>

        {/* DASHBOARD */}
        {pagina === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Receita Mensal', valor: `R$ ${totalEntradas.toLocaleString('pt-BR')}`, icon: '💰', cor: '#22c55e' },
                { label: 'Despesas', valor: `R$ ${totalSaidas.toLocaleString('pt-BR')}`, icon: '📉', cor: '#ef4444' },
                { label: 'Saldo', valor: `R$ ${saldo.toLocaleString('pt-BR')}`, icon: '🏦', cor: AMARELO },
                { label: 'Posts Gerados', valor: totalGerados.toString(), icon: '⚡', cor: AZUL_CLARO },
              ].map(k => (
                <div key={k.label} style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 16, padding: '20px 22px' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: k.cor }}>{k.valor}</div>
                  <div style={{ fontSize: 11, color: '#ffffff44', marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 12, color: AMARELO, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>📅 Próximos Eventos</div>
              {carregandoEventos ? (
                <div style={{ color: '#ffffff33', fontSize: 13, padding: 8 }}>Carregando...</div>
              ) : eventos.length === 0 ? (
                <div style={{ color: '#ffffff33', fontSize: 13, padding: 8 }}>Nenhum evento cadastrado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {eventos.slice(0, 3).map(e => (
                    <div key={e.id} style={{ background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 4, height: 40, borderRadius: 4, background: tipoEvento[e.tipo] ?? AZUL_CLARO }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf6' }}>{e.titulo}</div>
                        <div style={{ fontSize: 11, color: '#ffffff44' }}>{e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} · {e.hora || '—'} · {e.local || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GERAR */}
        {pagina === 'gerar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 10, color: AMARELO, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 22 }}>⚡ Nova geração</div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10, color: '#ffffff44', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Cliente</label>
                  <select value={clienteId} onChange={e => { setClienteId(e.target.value); setClienteNome(clientes.find(c => c.id === e.target.value)?.nome ?? '') }}
                    style={{ width: '100%', background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 12, color: clienteId ? '#e8eaf6' : '#ffffff33', padding: '12px 14px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                    <option value="">Selecione um cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: 10, color: '#ffffff44', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Tema do Post</label>
                  <input type="text" value={tema} onChange={e => setTema(e.target.value)} onKeyDown={e => e.key === 'Enter' && gerar()}
                    placeholder="Ex: São João, show de forró, promoção..."
                    style={{ width: '100%', background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 12, color: '#e8eaf6', padding: '12px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={gerar} disabled={loading || !clienteId || !tema}
                  style={{ width: '100%', background: loading || !clienteId || !tema ? CARD2 : `linear-gradient(135deg, ${AZUL_MEDIO}, ${AZUL_CLARO})`, border: `1px solid ${loading || !clienteId || !tema ? BORDA : AZUL_CLARO}`, borderRadius: 12, color: loading || !clienteId || !tema ? '#ffffff33' : '#fff', padding: '14px', fontSize: 13, fontWeight: 700, cursor: loading || !clienteId || !tema ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s' }}>
                  {loading ? <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>◌</span>Gerando...</> : '⚡ Gerar Conteúdo'}
                </button>
                {clienteNome && <div style={{ marginTop: 14, background: `${AMARELO}11`, border: `1px solid ${AMARELO}33`, borderRadius: 10, padding: '9px 12px', fontSize: 11, color: AMARELO }}>🎯 Cliente: <strong>{clienteNome}</strong></div>}
              </div>
              <div style={{ background: CARD, border: `1px solid #25d36633`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#25d366', fontWeight: 700, marginBottom: 8 }}>📱 Via WhatsApp</div>
                <p style={{ fontSize: 12, color: '#ffffff55', margin: 0, lineHeight: 1.6 }}>
                  Mande áudio ou texto para o Lumi:<br />
                  <span style={{ color: '#25d366', fontWeight: 600 }}>"GERAR: tema do post"</span>
                </p>
              </div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${resultado ? `${AMARELO}44` : BORDA}`, borderRadius: 20, padding: 28, transition: 'border-color 0.4s' }}>
              {!resultado ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.3 }}>
                  <div style={{ fontSize: 48 }}>📡</div>
                  <div style={{ fontSize: 13, color: '#ffffff44', textAlign: 'center', lineHeight: 1.6 }}>Configure e clique em<br /><strong>Gerar Conteúdo</strong></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.4s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                    <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Conteúdo gerado</span>
                  </div>
                  {[
                    { label: '📝 Legenda', campo: 'legenda', texto: resultado.legenda, cor: '#e8eaf6' },
                    { label: '# Hashtags', campo: 'hashtags', texto: resultado.hashtags, cor: AMARELO_CLARO },
                    { label: '🎨 Prompt de Imagem', campo: 'prompt', texto: resultado.prompt_imagem, cor: '#a78bfa' },
                  ].map(({ label, campo, texto, cor }) => (
                    <div key={campo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: '#ffffff33', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
                        <button onClick={() => copiar(texto, campo)} style={{ background: copiado === campo ? '#22c55e22' : CARD2, border: `1px solid ${copiado === campo ? '#22c55e44' : BORDA}`, borderRadius: 6, color: copiado === campo ? '#22c55e' : '#ffffff33', padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                          {copiado === campo ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p style={{ background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 10, padding: '12px 14px', fontSize: 12, color: cor, margin: 0, lineHeight: 1.7, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap', fontStyle: campo === 'prompt' ? 'italic' : 'normal' }}>{texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {pagina === 'historico' && (
          <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 20, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: AMARELO, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>📋 Todos os conteúdos</div>
              <span style={{ fontSize: 11, color: '#ffffff33' }}>{historico.length} registros</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historico.length === 0 && <div style={{ textAlign: 'center', color: '#ffffff33', padding: 40 }}>Nenhum conteúdo ainda.</div>}
              {historico.map(h => (
                <div key={h.id} style={{ background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 14, padding: '16px 18px', display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <span style={{ background: `${AZUL}44`, border: `1px solid ${AZUL}66`, color: '#93c5fd', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                      {h.clients?.nome ?? 'Cliente'}
                    </span>
                    <div style={{ fontSize: 10, color: '#ffffff33', marginTop: 4 }}>
                      {h.created_at ? new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf6', marginBottom: 4 }}>{h.tema}</div>
                    <div style={{ fontSize: 11, color: '#ffffff33', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{h.legenda}</div>
                  </div>
                  <button onClick={() => copiar(h.legenda + '\n\n' + h.hashtags, h.id)} style={{ background: AZUL, border: 'none', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {copiado === h.id ? '✓ Copiado' : 'Copiar tudo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* CLIENTES */}
{pagina === 'clientes' && (
  <ClientesPage />
)}
        {/* FINANCEIRO */}
        {pagina === 'financeiro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Total Entradas', valor: `R$ ${totalEntradas.toLocaleString('pt-BR')}`, cor: '#22c55e', icon: '📈' },
                { label: 'Total Saídas', valor: `R$ ${totalSaidas.toLocaleString('pt-BR')}`, cor: '#ef4444', icon: '📉' },
                { label: 'Saldo do Mês', valor: `R$ ${saldo.toLocaleString('pt-BR')}`, cor: AMARELO, icon: '🏦' },
              ].map(k => (
                <div key={k.label} style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 16, padding: '22px 24px' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: k.cor }}>{k.valor}</div>
                  <div style={{ fontSize: 11, color: '#ffffff44', marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: AMARELO, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>💰 Transações — Abril 2026</div>
                <button style={{ background: AMARELO, border: 'none', borderRadius: 10, color: '#1a1a1a', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Nova</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transacoes.map(t => (
                  <div key={t.id} style={{ background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: t.tipo === 'entrada' ? '#22c55e22' : '#ef444422', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {t.tipo === 'entrada' ? '↑' : '↓'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf6' }}>{t.descricao}</div>
                      <div style={{ fontSize: 11, color: '#ffffff33' }}>{new Date(t.data).toLocaleDateString('pt-BR')} · {t.categoria}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: t.tipo === 'entrada' ? '#22c55e' : '#ef4444' }}>
                      {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AGENDA */}
        {pagina === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: AMARELO, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>📅 Agenda — Abril/Junho 2026</div>
                <button onClick={() => setModalEvento(true)} style={{ background: AMARELO, border: 'none', borderRadius: 10, color: '#1a1a1a', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Novo Evento</button>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Transmissão', cor: AMARELO },
                  { label: 'Gravação', cor: '#22c55e' },
                  { label: 'Reunião', cor: AZUL_CLARO },
                  { label: 'Entrega', cor: '#a855f7' },
                  { label: 'Cobertura', cor: '#ef4444' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ffffff55' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.cor }}></div>
                    {l.label}
                  </div>
                ))}
              </div>

              {carregandoEventos ? (
                <div style={{ textAlign: 'center', color: '#ffffff33', padding: 40, fontSize: 13 }}>⏳ Carregando eventos...</div>
              ) : eventos.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#ffffff33', padding: 40, fontSize: 13 }}>
                  Nenhum evento cadastrado ainda.<br />
                  <span style={{ fontSize: 12 }}>Use o WhatsApp: <strong style={{ color: '#25d366' }}>"AGENDA: evento dia XX/XX às XXh"</strong></span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {eventos.map(e => (
                    <div key={e.id} style={{ background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 4, height: 50, borderRadius: 4, background: tipoEvento[e.tipo] ?? AZUL_CLARO, flexShrink: 0 }}></div>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: AZUL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: AMARELO, lineHeight: 1 }}>
                          {e.data ? new Date(e.data + 'T00:00:00').getDate() : '—'}
                        </div>
                        <div style={{ fontSize: 9, color: '#ffffff66', textTransform: 'uppercase' }}>
                          {e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }) : ''}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf6', marginBottom: 4 }}>{e.titulo}</div>
                        <div style={{ fontSize: 11, color: '#ffffff44' }}>🕐 {e.hora || '—'} · 📍 {e.local || '—'} · {e.tipo}</div>
                      </div>
                      <button style={{ background: `${tipoEvento[e.tipo] ?? AZUL_CLARO}22`, border: `1px solid ${tipoEvento[e.tipo] ?? AZUL_CLARO}44`, borderRadius: 8, color: tipoEvento[e.tipo] ?? AZUL_CLARO, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        📱 Lembrete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, background: `${AZUL}22`, border: `1px solid ${AZUL}44`, borderRadius: 12, padding: '14px 18px', fontSize: 12, color: '#93c5fd' }}>
                💡 Via WhatsApp: <strong>"AGENDA: Reunião com cliente dia 20/04 às 14h em Ourolândia"</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Evento */}
      {modalEvento && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: CARD, border: `1px solid ${BORDA}`, borderRadius: 20, padding: 32, width: 440 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: AMARELO, marginBottom: 24 }}>📅 Novo Evento</div>
            {[
              { label: 'Título', key: 'titulo', placeholder: 'Ex: Reunião Prefeitura', type: 'text' },
              { label: 'Data', key: 'data', placeholder: '', type: 'date' },
              { label: 'Hora', key: 'hora', placeholder: '', type: 'time' },
              { label: 'Local', key: 'local', placeholder: 'Ex: Ourolândia', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: '#ffffff44', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={(novoEvento as any)[f.key]} onChange={e => setNovoEvento(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 10, color: '#e8eaf6', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: '#ffffff44', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>Tipo</label>
              <select value={novoEvento.tipo} onChange={e => setNovoEvento(prev => ({ ...prev, tipo: e.target.value }))}
                style={{ width: '100%', background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 10, color: '#e8eaf6', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                {['Reunião', 'Transmissão', 'Gravação', 'Entrega', 'Cobertura'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEvento(false)} style={{ flex: 1, background: CARD2, border: `1px solid ${BORDA}`, borderRadius: 10, color: '#ffffff55', padding: '12px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarEvento} disabled={salvandoEvento || !novoEvento.titulo || !novoEvento.data}
                style={{ flex: 2, background: salvandoEvento ? CARD2 : AMARELO, border: 'none', borderRadius: 10, color: '#1a1a1a', padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {salvandoEvento ? 'Salvando...' : '✅ Salvar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; }
        select option { background: #162040; }
        input::placeholder { color: #ffffff22; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${AZUL}; border-radius: 4px; }
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;900&display=swap');
      `}</style>
    </main>
  )
}
