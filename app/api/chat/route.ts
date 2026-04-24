import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversation_id, cliente } = await req.json()

    const systemPrompt = `Você é o Super Agente da TV Sertão Livre, uma agência de comunicação regional em Ourolândia, Bahia.
${cliente ? `Cliente ativo: ${cliente.nome}. Instagram: ${cliente.instagram || ''}. Nicho: ${cliente.nicho || ''}` : ''}

Você ajuda com:
- Criar posts, legendas e hashtags para redes sociais
- Redigir matérias jornalísticas regionais
- Analisar imagens e documentos PDF enviados
- Planejar conteúdo e estratégias
- Responder dúvidas gerais

Responda sempre em português brasileiro, de forma direta e profissional.`

    // Monta mensagens para a API — aceita string ou array (imagem/PDF)
    const apiMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: apiMessages
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Salva no Supabase — serializa content array como JSON string
    if (conversation_id) {
      const supabase = getSupabase()
      const lastUserMsg = messages[messages.length - 1]
      const userContent = typeof lastUserMsg.content === 'string'
        ? lastUserMsg.content
        : JSON.stringify(lastUserMsg.content)

      await supabase.from('messages').insert([
        { conversation_id, role: 'user', content: userContent },
        { conversation_id, role: 'assistant', content: assistantMessage }
      ])
    }

    return NextResponse.json({ success: true, message: assistantMessage })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ success: true, conversations: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
// trigger deploy
