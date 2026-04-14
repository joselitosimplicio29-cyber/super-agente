import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const { default: Anthropic } = await import('@anthropic-ai/sdk')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const body = await request.json()
    const { nome, contrato_texto, identidade_visual_texto } = body

    // 1. Extrai dados do contrato via Claude
    let dadosContrato: any = {}
    if (contrato_texto) {
      const resContrato = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analise esse contrato e extraia as informações. Retorne APENAS JSON sem markdown:
          {"valor_mensal": 0, "data_inicio": "YYYY-MM-DD", "data_fim": "YYYY-MM-DD", "servicos": ["serviço1", "serviço2"], "observacoes": "texto"}
          
          Contrato: ${contrato_texto}`
        }]
      })
      const rawContrato = resContrato.content[0].type === 'text' ? resContrato.content[0].text : '{}'
      const cleanedContrato = rawContrato.replace(/```json/g, '').replace(/```/g, '').trim()
      dadosContrato = JSON.parse(cleanedContrato)
    }

    // 2. Extrai identidade visual via Claude
    let dadosIdentidade: any = {}
    if (identidade_visual_texto) {
      const resIdentidade = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analise essa identidade visual e extraia as informações. Retorne APENAS JSON sem markdown:
          {"cor_primaria": "#000000", "cor_secundaria": "#000000", "cor_acento": "#000000", "fonte_titulo": "nome da fonte", "fonte_corpo": "nome da fonte", "tom_de_voz": "descrição do tom", "instagram": "@handle", "slogan": "slogan se houver"}
          
          Identidade visual: ${identidade_visual_texto}`
        }]
      })
      const rawIdentidade = resIdentidade.content[0].type === 'text' ? resIdentidade.content[0].text : '{}'
      const cleanedIdentidade = rawIdentidade.replace(/```json/g, '').replace(/```/g, '').trim()
      dadosIdentidade = JSON.parse(cleanedIdentidade)
    }

    // 3. Cadastra o cliente
    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from('clients')
      .insert({ nome, valor_mensal: dadosContrato.valor_mensal ?? 0 })
      .select()
      .single()

    if (erroCliente) throw new Error(erroCliente.message)

    // 4. Cadastra o brand_kit
    const { error: erroKit } = await supabaseAdmin
      .from('brand_kit')
      .insert({
        client_id: cliente.id,
        cor_primaria: dadosIdentidade.cor_primaria ?? '#1E3A8A',
        cor_secundaria: dadosIdentidade.cor_secundaria ?? '#FFFFFF',
        cor_acento: dadosIdentidade.cor_acento ?? '#F59E0B',
        fonte_titulo: dadosIdentidade.fonte_titulo ?? 'Montserrat Bold',
        fonte_corpo: dadosIdentidade.fonte_corpo ?? 'Open Sans Regular',
        tom_de_voz: dadosIdentidade.tom_de_voz ?? 'Profissional e objetivo',
        instagram: dadosIdentidade.instagram ?? '',
        slogan: dadosIdentidade.slogan ?? ''
      })

    if (erroKit) throw new Error(erroKit.message)

    // 5. Cadastra o contrato
    if (dadosContrato.valor_mensal) {
      await supabaseAdmin.from('contratos').insert({
        client_id: cliente.id,
        valor_mensal: dadosContrato.valor_mensal,
        data_inicio: dadosContrato.data_inicio,
        data_fim: dadosContrato.data_fim,
        servicos: dadosContrato.servicos,
        observacoes: dadosContrato.observacoes
      })
    }

    // 6. Resposta formatada para o WhatsApp
    const resumo = `✅ *Cliente cadastrado com sucesso!*

👤 *${nome}*
💰 Valor: R$ ${dadosContrato.valor_mensal?.toLocaleString('pt-BR') ?? '—'}/mês
📅 Início: ${dadosContrato.data_inicio ?? '—'}
📅 Fim: ${dadosContrato.data_fim ?? '—'}

🎨 *Identidade Visual:*
• Cor principal: ${dadosIdentidade.cor_primaria ?? '—'}
• Tom de voz: ${dadosIdentidade.tom_de_voz?.substring(0, 80) ?? '—'}...

📋 *Serviços:*
${dadosContrato.servicos?.map((s: string) => `• ${s}`).join('\n') ?? '• —'}

🆔 ID: ${cliente.id}`

    return NextResponse.json({ success: true, cliente_id: cliente.id, resumo })

  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
