import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(request: NextRequest) {
  const { client_id, tema } = await request.json()

  // Busca o brand kit do cliente
  const { data: brandKit } = await supabaseAdmin
    .from('brand_kit')
    .select('*')
    .eq('client_id', client_id)
    .single()

  const { data: cliente } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', client_id)
    .single()

  // Gera o conteúdo com Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Você é o criador de conteúdo da marca "${cliente.nome}".
Nicho: ${cliente.nicho}
Cores: primária ${brandKit.cor_primaria}, secundária ${brandKit.cor_secundaria}
Tom de voz: ${brandKit.tom_de_voz}
Descrição: ${brandKit.descricao}

Crie um post para Instagram sobre: ${tema}

Retorne APENAS um JSON com:
{
  "legenda": "texto do post com emojis",
  "hashtags": "#tag1 #tag2 #tag3",
  "prompt_imagem": "descrição em inglês para gerar a imagem"
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Resposta inválida')
  
  const resultado = JSON.parse(content.text)

  // Salva no banco
  const { data: post } = await supabaseAdmin
    .from('contents')
    .insert({
      client_id,
      tema,
      legenda: resultado.legenda,
      hashtags: resultado.hashtags,
      prompt_imagem: resultado.prompt_imagem,
      status: 'gerado'
    })
    .select()
    .single()

  return NextResponse.json({ success: true, post })
}
