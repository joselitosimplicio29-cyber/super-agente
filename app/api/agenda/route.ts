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

    const { texto } = await request.json()

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extraia os dados desse texto de agenda e retorne APENAS JSON sem markdown:
{
  "titulo": "título do evento",
  "data": "YYYY-MM-DD",
  "hora": "HH:MM",
  "local": "local do evento",
  "tipo": "Transmissão ou Gravação ou Reunião ou Entrega ou Cobertura",
  "observacoes": "detalhes extras"
}

Texto: ${texto}

Data de hoje: ${new Date().toISOString().split('T')[0]}
Se não tiver ano, assume 2026. Se não tiver hora, coloca null.`
      }]
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const dados = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const { data: evento, error } = await supabaseAdmin
      .from('agenda')
      .insert({
        titulo: dados.titulo,
        data: dados.data,
        hora: dados.hora,
        local: dados.local,
        tipo: dados.tipo,
        observacoes: dados.observacoes
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const resumo = `✅ *Evento salvo na agenda!*\n\n📅 *${dados.titulo}*\n🗓 ${dados.data} às ${dados.hora || '—'}\n📍 ${dados.local || '—'}\n🏷 ${dados.tipo}\n\n${dados.observacoes ? `📝 ${dados.observacoes}` : ''}`

    return NextResponse.json({ success: true, evento_id: evento.id, resumo })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('agenda')
      .select('*')
      .order('data', { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, eventos: data })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}