'use client'

import { useState, useEffect, useRef } from 'react'

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
  const [cardGerado, setCardGerado] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    setCardGerado(null)
    setErro('')
    buscarBrandKit(cliente.id)
  }

  function handleArquivos(files: FileList | null) {
    if (!files) return
    const novos = Array.from(files)
    setArquivos(prev => [...prev, ...novos])
    novos.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removerArquivo(i: number) {
    setArquivos(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function gerarConteudo() {
    if (!clienteSelecionado || !tema.trim()) return
    setCarregando(true)
    setConteudo(null)
    setCardGerado(null)
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

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
    const words = text.split(' ')
    let line = ''
    let lineCount = 0
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y)
        line = words[n] + ' '
        y += lineHeight
        lineCount++
        if (lineCount >= maxLines - 1) {
          ctx.fillText(line.trim() + '...', x, y)
          return
        }
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), x, y)
  }

  async function gerarCard() {
    if (!conteudo || !brandKit) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = 1080
    const H = 1080
    canvas.width = W
    canvas.height = H

    // Fundo com cor do brand kit
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, brandKit.cor_primaria || '#1E3A8A')
    grad.addColorStop(1, brandKit.cor_secundaria || '#0F172A')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Se tiver imagem uploaded, usa ela como fundo
    if (previews.length > 0) {
      await new Promise<void>(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Cover fit
          const scale = Math.max(W / img.width, H / img.height)
          const sw = img.width * scale
          const sh = img.height * scale
          const sx = (W - sw) / 2
          const sy = (H - sh) / 2
          ctx.drawImage(img, sx, sy, sw, sh)
          // Overlay escuro para legibilidade
          const overlay = ctx.createLinearGradient(0, H * 0.3, 0, H)
          overlay.addColorStop(0, 'rgba(0,0,0,0)')
          overlay.addColorStop(0.5, 'rgba(0,0,0,0.6)')
          overlay.addColorStop(1, 'rgba(0,0,0,0.92)')
          ctx.fillStyle = overlay
          ctx.fillRect(0, 0, W, H)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = previews[0]
      })
    } else {
      // Sem imagem: overlay decorativo
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, W, H)
      // Círculo decorativo
      ctx.beginPath()
      ctx.arc(W * 0.85, H * 0.15, 200, 0, Math.PI * 2)
      ctx.fillStyle = (brandKit.cor_acento || '#F59E0B') + '22'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(W * 0.1, H * 0.8, 150, 0, Math.PI * 2)
      ctx.fillStyle = (brandKit.cor_acento || '#F59E0B') + '15'
      ctx.fill()
    }

    // Barra de acento no topo
    ctx.fillStyle = brandKit.cor_acento || '#F59E0B'
    ctx.fillRect(0, 0, W, 8)

    // Logo/nome do cliente no topo
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px Arial'
    ctx.fillText(clienteSelecionado?.nome?.toUpperCase() || '', 60, 80)

    // Instagram handle
    if (brandKit.instagram) {
      ctx.fillStyle = brandKit.cor_acento || '#F59E0B'
      ctx.font = '28px Arial'
      ctx.fillText(brandKit.instagram, 60, 120)
    }

    // Linha separadora
    ctx.fillStyle = brandKit.cor_acento || '#F59E0B'
    ctx.fillRect(60, 140, 80, 4)

    // Legenda principal — primeiras linhas
    const legenda = conteudo.legenda.replace(/[*_~]/g, '').trim()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 52px Arial'
    wrapText(ctx, legenda, 60, H - 380, W - 120, 70, 4)

    // Hashtags
    const hashtags = conteudo.hashtags.split(' ').slice(0, 6).join(' ')
    ctx.fillStyle = brandKit.cor_acento || '#F59E0B'
    ctx.font = '30px Arial'
    wrapText(ctx, hashtags, 60, H - 160, W - 120, 40, 2)

    // Rodapé
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, H - 80, W, 80)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '26px Arial'
    ctx.fillText(brandKit.slogan || clienteSelecionado?.nome || '', 60, H - 30)

    // Barra de acento no rodapé
    ctx.fillStyle = brandKit.cor_acento || '#F59E0B'
    ctx.fillRect(0, H - 6, W, 6)

    // Exporta
    const dataUrl = canvas.toDataURL('image/png')
    setCardGerado(dataUrl)
  }

  function baixarCard() {
    if (!cardGerado) return
    const a = document.createElement('a')
    a.href = cardGerado
    a.download = `card-${clienteSelecionado?.nome?.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.png`
    a.click()
  }

  async function copiar(texto: string, chave: string) {
    await navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(null), 2000)
  }

  function baixarTexto() {
    if (!conteudo) return
    const texto = `LEGENDA:\n${conteudo.legenda}\n\nHASHTAGS:\n${conteudo.hashtags}\n\nPROMPT IMAGEM:\n${conteudo.prompt_imagem}`
    const blob = new Blob([texto], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `conteudo-${clienteSelecionado?.nome?.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.txt`
    a.click()
  }

  const tipoConfig = {
    post: { label: 'Post Feed', icon: '⬛', cor: '#1E3A8A' },
    story: { label: 'Story', icon: '📱', cor: '#7C3AED' },
    roteiro: { label: 'Roteiro Vídeo', icon: '🎬', cor: '#059669' },
    materia: { label: 'Matéria', icon: '📰', cor: '#DC2626' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: "'Montserrat', sans-serif", color: '#F8FAFC' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1E3A8A, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎯</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>Gerar Conteúdo</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Selecione o cliente e o tema</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 81px)' }}>
        {/* Clientes */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: 24, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 16, textTransform: 'uppercase' }}>Clientes ({clientes.length})</div>
          {carregandoClientes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientes.map(c => (
                <button key={c.id} onClick={() => selecionarCliente(c)} style={{ background: clienteSelecionado?.id === c.id ? 'linear-gradient(135deg, rgba(30,58,138,0.4), rgba(245,158,11,0.15))' : 'rgba(255,255,255,0.03)', border: clienteSelecionado?.id === c.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', color: '#F8FAFC' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{c.instagram || c.nicho || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Área principal */}
        <div style={{ padding: 32, overflowY: 'auto' }}>
          {!clienteSelecionado ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.4 }}>
              <div style={{ fontSize: 48 }}>👈</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um cliente</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>para começar a gerar conteúdo</div>
            </div>
          ) : (
            <div style={{ maxWidth: 720 }}>

              {/* Brand Kit */}
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
                  {brandKit.slogan && <div style={{ marginLeft: 'auto', fontSize: 11, color: '#F59E0B', fontStyle: 'italic', maxWidth: 200, textAlign: 'right' }}>"{brandKit.slogan}"</div>}
                </div>
              )}

              {/* Upload */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>📸 Sua Foto/Vídeo (base do card)</div>
                <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => handleArquivos(e.target.files)} style={{ display: 'none' }} />
                <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleArquivos(e.dataTransfer.files) }}
                  style={{ border: '2px dashed rgba(245,158,11,0.3)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(245,158,11,0.04)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>Clique ou arraste sua foto aqui</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>A legenda será sobreposta na imagem</div>
                </div>

                {previews.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                    {previews.map((p, i) => (
                      <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(245,158,11,0.4)' }}>
                        <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removerArquivo(i)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(220,38,38,0.9)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tipo */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>Tipo de Conteúdo</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(Object.entries(tipoConfig) as [typeof tipo, typeof tipoConfig[typeof tipo]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setTipo(key)} style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: tipo === key ? `2px solid ${cfg.cor}` : '2px solid rgba(255,255,255,0.06)', background: tipo === key ? `${cfg.cor}22` : 'rgba(255,255,255,0.03)', color: tipo === key ? '#F8FAFC' : '#64748B', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{cfg.icon}</div>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>Tema / Assunto</div>
                <textarea value={tema} onChange={e => setTema(e.target.value)} placeholder="Ex: Inauguração da nova sede, promoção de verão..." rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', color: '#F8FAFC', fontSize: 14, fontFamily: "'Montserrat', sans-serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TEMAS_SUGERIDOS.map(t => (
                  <button key={t} onClick={() => setTema(t)} style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#94A3B8', fontSize: 11, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>{t}</button>
                ))}
              </div>

              {/* Botão gerar texto */}
              <button onClick={gerarConteudo} disabled={carregando || !tema.trim()} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: carregando || !tema.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #1E3A8A, #2563EB)', color: carregando || !tema.trim() ? '#64748B' : '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", cursor: carregando || !tema.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {carregando ? <>⚡ Gerando com IA...</> : <>✨ Gerar Texto</>}
              </button>

              {erro && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, color: '#FCA5A5', fontSize: 13 }}>⚠️ {erro}</div>}

              {/* Resultado */}
              {conteudo && (
                <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748B', textTransform: 'uppercase' }}>Conteúdo Gerado ✅</div>
                    <button onClick={baixarTexto} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>⬇️ Baixar .txt</button>
                  </div>

                  {[
                    { chave: 'legenda', label: '📝 Legenda', texto: conteudo.legenda, cor: '#E2E8F0' },
                    { chave: 'hashtags', label: '🏷️ Hashtags', texto: conteudo.hashtags, cor: '#60A5FA' },
                    { chave: 'prompt', label: '🎨 Prompt para Imagem', texto: conteudo.prompt_imagem, cor: '#FDE68A' },
                  ].map(({ chave, label, texto, cor }) => (
                    <div key={chave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{label}</span>
                        <button onClick={() => copiar(texto, chave)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: copiado === chave ? 'rgba(5,150,105,0.2)' : 'transparent', color: copiado === chave ? '#34D399' : '#64748B', fontSize: 11, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                          {copiado === chave ? '✓ Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <div style={{ padding: '16px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: cor }}>{texto}</div>
                    </div>
                  ))}

                  {/* GERAR CARD */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>🖼️ Montar Card</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                      {previews.length > 0 ? '✅ Usa sua foto como fundo + texto gerado + cores do cliente' : '⚠️ Suba uma foto acima para usar como fundo do card'}
                    </div>

                    <button onClick={gerarCard} disabled={!brandKit} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: !brandKit ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #F59E0B, #D97706)', color: !brandKit ? '#64748B' : '#000', fontSize: 14, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", cursor: !brandKit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      🎨 Montar Card Agora
                    </button>

                    {/* Preview do card */}
                    {cardGerado && (
                      <div style={{ marginTop: 16 }}>
                        <img src={cardGerado} alt="Card gerado" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }} />
                        <button onClick={baixarCard} style={{ marginTop: 12, width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          ⬇️ Baixar Card 1080x1080 (.png)
                        </button>
                      </div>
                    )}
                  </div>

                  <button onClick={gerarConteudo} style={{ padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontSize: 13, fontWeight: 600, fontFamily: "'Montserrat', sans-serif", cursor: 'pointer' }}>
                    🔄 Gerar Outra Versão
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap'); * { box-sizing: border-box; } textarea:focus { border-color: rgba(245,158,11,0.4) !important; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }`}</style>
    </div>
  )
}