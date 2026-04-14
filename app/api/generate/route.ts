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

    const { client_id, tema } = await request.json()

    const { data: brandKit, error: erroBrand } = await supabaseAdmin
      .from('brand_kit')
      .select('*, clients(nome)')
      .eq('client_id', client_id)
      .single()

    if (erroBrand) throw new Error('Brand kit não encontrado: ' + erroBrand.message)

    const clienteNome = (brandKit.clients as any)?.nome ?? 'Cliente'

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Você é um diretor de arte e redator sênior especializado em comunicação regional para o interior da Bahia, Brasil. Você conhece profundamente o público do sertão nordestino: comunidades locais, famílias, trabalhadores, gestores públicos e pequenos empresários.

Cliente: ${clienteNome}
Identidade visual:
- Cores: ${brandKit.cor_primaria}, ${brandKit.cor_secundaria}, ${brandKit.cor_acento}
- Tom de voz: ${brandKit.tom_de_voz}
- Slogan: ${brandKit.slogan}
- Instagram: ${brandKit.instagram}

Tipo/Tema: ${tema}

REGRAS DA LEGENDA:
1. Máximo 150 palavras
2. Começar com frase de impacto ou pergunta de identificação
3. Usar emojis com moderação (máximo 5)
4. Tom adequado: formal para governo, caloroso para cultura, direto para comércio
5. Finalizar com CTA claro (curtir, compartilhar, comentar, entrar em contato)

REGRAS DO PROMPT DE IMAGEM:
1. Sempre em inglês
2. Nunca incluir texto dentro da imagem
3. Especificar: estilo fotográfico + composição + iluminação + atmosfera + cores
4. Terminar sempre com: high quality, 4K, sharp focus, professional photography, no text
5. Ser específico para o contexto do sertão baiano quando relevante

HASHTAGS:
- 8 a 12 tags
- Misturar local (#ourolandia #bahia #sertao #chapadadiamantina) com nicho do cliente

Retorne APENAS JSON sem markdown:
{
  "legenda": "texto completo com emojis e CTA",
  "hashtags": "#tag1 #tag2 #tag3",
  "prompt_imagem": "detailed professional english prompt for AI image generation, specific lighting, composition, atmosphere, no text, high quality 4K"
}`
      }]
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const conteudo = JSON.parse(raw.replace(/```json|```/g, '').trim())

    await supabaseAdmin.from('contents').insert({
      client_id,
      legenda: conteudo.legenda,
      hashtags: conteudo.hashtags,
      prompt_imagem: conteudo.prompt_imagem,
      status: 'gerado'
    })

    return NextResponse.json({
      success: true,
      legenda: conteudo.legenda,
      hashtags: conteudo.hashtags,
      prompt_imagem: conteudo.prompt_imagem
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}