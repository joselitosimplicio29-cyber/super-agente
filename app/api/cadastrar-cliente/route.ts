import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const { nome, contrato_texto, identidade_visual_texto } = await request.json()
    let dadosContrato: any = {}
    if (contrato_texto) {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: `Analise esse contrato. Retorne APENAS JSON sem markdown: {"valor_mensal": 0, "data_inicio": "YYYY-MM-DD", "data_fim": "YYYY-MM-DD", "servicos": ["s1"], "observacoes": "texto"}\n\n${contrato_texto}` }]
      })
      const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
      dadosContrato = JSON.parse(raw.replace(/```json|```/g, '').trim())
    }
    let dadosId: any = {}
    if (identidade_visual_texto) {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: `Analise essa identidade visual. Retorne APENAS JSON sem markdown: {"cor_primaria": "#000", "cor_secundaria": "#000", "cor_acento": "#000", "fonte_titulo": "fonte", "fonte_corpo": "fonte", "tom_de_voz": "descrição", "instagram": "@handle", "slogan": "slogan"}\n\n${identidade_visual_texto}` }]
      })
      const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
      dadosId = JSON.parse(raw.replace(/```json|```/g, '').trim())
    }
    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from('clients').insert({ nome, valor_mensal: dadosContrato.valor_mensal ?? 0 }).select().single()
    if (erroCliente) throw new Error(erroCliente.message)
    await supabaseAdmin.from('brand_kit').insert({
      client_id: cliente.id, cor_primaria: dadosId.cor_primaria ?? '#1E3A8A',
      cor_secundaria: dadosId.cor_secundaria ?? '#FFFFFF', cor_acento: dadosId.cor_acento ?? '#F59E0B',
      fonte_titulo: dadosId.fonte_titulo ?? 'Montserrat Bold', fonte_corpo: dadosId.fonte_corpo ?? 'Open Sans Regular',
      tom_de_voz: dadosId.tom_de_voz ?? 'Profissional e objetivo', instagram: dadosId.instagram ?? '', slogan: dadosId.slogan ?? ''
    })
    if (dadosContrato.valor_mensal) {
      await supabaseAdmin.from('contratos').insert({
        client_id: cliente.id, valor_mensal: dadosContrato.valor_mensal,
        data_inicio: dadosContrato.data_inicio, data_fim: dadosContrato.data_fim,
        servicos: dadosContrato.servicos, observacoes: dadosContrato.observacoes
      })
    }
    const resumo = `✅ *Cliente cadastrado!*\n\n👤 *${nome}*\n💰 R$ ${dadosContrato.valor_mensal?.toLocaleString('pt-BR') ?? '—'}/mês\n📅 ${dadosContrato.data_inicio ?? '—'} até ${dadosContrato.data_fim ?? '—'}\n\n📋 *Serviços:*\n${dadosContrato.servicos?.map((s: string) => `• ${s}`).join('\n') ?? '• —'}\n\n🆔 ID: ${cliente.id}`
    return NextResponse.json({ success: true, cliente_id: cliente.id, resumo })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}