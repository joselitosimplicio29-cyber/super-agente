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
    const supabase = getSupabase()

    const systemPrompt = `Você é o Super Agente da TV Sertão Livre, uma agência de comunicação regional em Ourolândia, Bahia.

${cliente ? `Cliente ativo: ${cliente.nome}. Instagram: ${cliente.instagram || ''}. Nicho: ${cliente.nicho || ''}.` : ''}

Você ajuda com:
- Criar posts, legendas e hashtags para redes sociais
- Redigir matérias jornalísticas regionais
- Planejar conteúdo e estratégias
- Responder dúvidas gerais

Quando o usuário pedir para agendar algo, responda com JSON no formato:
{"acao":"agenda","texto":"descrição do evento"}

Quando pedir para cadastrar cliente:
{"acao":"cadastrar","dados":"informações do cliente"}

Para todo o resto, responda normalmente em português brasileiro, de forma direta e profissional.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    // Salva no Supabase se tiver conversation_id
    if (conversation_id) {
      const lastUserMsg = messages[messages.length - 1]
      await supabase.from('messages').insert([
        { conversation_id, role: 'user', content: lastUserMsg.content },
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
      .select('*, messages(count)')
      .order('criado_em', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ success: true, conversations: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
