'use client'

import { useState, useEffect } from 'react'

interface Client {
  id: string
  nome: string
  nicho: string
  instagram: string
}

interface BrandKit {
  cor_primaria: string
  cor_secundaria: string
  cor_acento: string
  tom_de_voz: string
  slogan: string
  instagram: string
}

interface ConteudoGerado {
  legenda: string
  hashtags: string
  prompt_imagem: string
}

const TEMAS_SUGERIDOS = [
  'Inauguração de obra', 'Evento cultural', 'Promoção especial', 'Dica do dia',
  'Bastidores', 'Resultado alcançado', 'Depoimento de cliente', 'Lançamento de produto',
  'Data comemorativa', 'Notícia local',
]

export default function MidiaPage() {
  const [clientes, setClientes] = useState<Client[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null)
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [tema, setTema] = useState('')
  const [tipo, setTipo] = useState<'post' | 'story' | 'roteiro' | 'materia'>('post')
  const [carregando, setCarregando] = useState(false)
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [conteudo, setConteudo] = useState<ConteudoGerado | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  useEffect(() => { buscarClientes() }, [])

  async function buscarClientes() {
    setCarregandoClientes(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=id,nome,nicho,instagram&order=nome`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      })
      setClientes(await res.json() || [])
    } catch { setErro('Erro ao carregar clientes.') }
    finally { setCarregandoClientes(false) }
  }

  async function buscarBrandKit(clienteId: string) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/brand_kit?client_id=eq.${clienteId}&select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      })
      const data = await res.json()
      if (data?.length > 0) setBrandKit(data[0])
    } catch {}
  }

  function selecionarCliente(cliente: Client) {
    setClienteSelecionado(cliente)
    setBrandKit(null)
    setConteudo(null)
    setErro('')
    buscarBrandKit(cliente.id)
  }

  async function gerarConteudo() {
    if (!clienteSelecionado || !tema.trim()) return
    setCarregando(true)
    setConteudo(null)
    setErro('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clienteSelecionado.id, tema: `[${tipo.toUpperCase()}] ${tema}` }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setConteudo({ legenda: data.legenda, hashtags: data.hashtags, prompt_imagem: data.prompt_imagem })
    } catch (e: any) {
      setErro(e.message || 'Erro ao gerar conteúdo.')
    } finally { setCarregando(false) }
  }

  async function copiar(texto: string, chave: string) {
    await navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(null), 2000)
  }

  const tipoConfig = {
    post:    { label: 'Post Feed',      icon: '⬛', cor: '#1E3A8A' },
    story:   { label: 'Story',          icon: '📱', cor: '#7C3AED' },
    roteiro: { label: 'Roteiro Vídeo',  icon: '🎬', cor: '#059669' },
    materia: { label: 'Matéria',        icon: '📰', cor: '#DC2626' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: "'Montserrat', sans-serif", color: '#F8FAFC' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh' }}>

        {/* Coluna esquerda — Clientes */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: 24, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 16, textTransform: 'uppercase' }}>
            Clientes ({clientes.length})
          </div>
          {carregandoClientes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 60, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientes.map(c => (
                <button key={c.id} onClick={() => selecionarCliente(c)} style={{
                  background: clienteSelecionado?.id === c.id ? 'linear-gradient(135deg, rgba(30,58,138,0.4), rgba(245,158,11,0.15))' : 'rgba(255,255,255,0.03)',
                  border: clienteSelecionado?.id === c.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', color: '#F8FAFC',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{c.instagram || c.nicho || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita — Gerador */}
        <div style={{ padding: 32, overflowY: 'auto' }}>
          {!clienteSelecionado ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.4 }}>
              <div style={{ fontSize: 48 }}>👈</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um cliente</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>para começar a gerar conteúdo</div>
            </div>
          ) : (
            <div style={{ maxWidth: 720 }}>

              {brandKit && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[brandKit.cor_primaria, brandKit.cor_secundaria, brandKit.cor_acento].map((cor, i) => (
                      <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: cor, border: '2px solid rgba(255,255,255,0.15)' }} />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{clienteSelecionado.nome}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{brandKit.tom_de_voz} · {brandKit.instagram}</div>
                  </div>
                  {brandKit.slogan && (
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#F59E0B', fontStyle: 'italic', maxWidth: 200, textAlign: 'right' }}>
                      "{brandKit.slogan}"
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>Tipo de Conteúdo</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(Object.entries(tipoConfig) as [typeof tipo, typeof tipoConfig[typeof tipo]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setTipo(key)} style={{
                      flex: 1, padding: '12px 8px', borderRadius: 10,
                      border: tipo === key ? `2px solid ${cfg.cor}` : '2px solid rgba(255,255,255,0.06)',
                      background: tipo === key ? `${cfg.cor}22` : 'rgba(255,255,255,0.03)',
                      color: tipo === key ? '#F8FAFC' : '#64748B',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.icon}</div>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>Tema / Assunto</div>
                <textarea value={tema} onChange={e => setTema(e.target.value)}
                  placeholder="Ex: Inauguração da nova sede, promoção de verão..."
                  rows={3} style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '14px 16px', color: '#F8FAFC', fontSize: 14,
                    fontFamily: "'Montserrat', sans-serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }} />
              </div>

              <div style={{ marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TEMAS_SUGERIDOS.map(t => (
                  <button key={t} onClick={() => setTema(t)} style={{
                    padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: '#94A3B8', fontSize: 11,
                    cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
                  }}>{t}</button>
                ))}
              </div>

              <button onClick={gerarConteudo} disabled={carregando || !tema.trim()} style={{
                width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                background: carregando || !tema.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                color: carregando || !tema.trim() ? '#64748B' : '#fff',
                fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                cursor: carregando || !tema.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {carregando ? <>⚡ Gerando com IA...</> : <>✨ Gerar Conteúdo</>}
              </button>

              {erro && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, color: '#FCA5A5', fontSize: 13 }}>
                  ⚠️ {erro}
                </div>
              )}

              {conteudo && (
                <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', textTransform: 'uppercase' }}>Conteúdo Gerado ✅</div>

                  {[
                    { chave: 'legenda', label: '📝 Legenda', texto: conteudo.legenda, cor: null },
                    { chave: 'hashtags', label: '🏷️ Hashtags', texto: conteudo.hashtags, cor: '#60A5FA' },
                    { chave: 'prompt', label: '🎨 Prompt para Imagem', texto: conteudo.prompt_imagem, cor: '#FDE68A' },
                  ].map(({ chave, label, texto, cor }) => (
                    <div key={chave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{label}</span>
                        <button onClick={() => copiar(texto, chave)} style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                          background: copiado === chave ? 'rgba(5,150,105,0.2)' : 'transparent',
                          color: copiado === chave ? '#34D399' : '#64748B',
                          fontSize: 11, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif",
                        }}>
                          {copiado === chave ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <div style={{ padding: '16px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: cor || '#E2E8F0' }}>
                        {texto}
                      </div>
                    </div>
                  ))}

                  <button onClick={gerarConteudo} style={{
                    padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Montserrat', sans-serif", cursor: 'pointer',
                  }}>🔄 Gerar Outra Versão</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        textarea:focus { border-color: rgba(245,158,11,0.4) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  )
}