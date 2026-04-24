import { NextRequest, NextResponse } from 'next/server'

// ---------- Helpers ----------

function getSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getCalendarClient() {
  const { google } = require('googleapis')
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

const TZ = 'America/Bahia'
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!

// Monta start/end no formato do Google Calendar.
// Se não tiver hora, cria como evento de dia inteiro (campo `date` em vez de `dateTime`).
function buildEventTimes(data: string, hora: string | null) {
  if (!hora) {
    const d = new Date(data + 'T00:00:00-03:00')
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    return {
      start: { date: data },
      end: { date: next.toISOString().split('T')[0] },
    }
  }
  const startISO = `${data}T${hora}:00-03:00`
  const startDate = new Date(startISO)
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const endISO =
    `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}` +
    `T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00-03:00`
  return {
    start: { dateTime: startISO, timeZone: TZ },
    end: { dateTime: endISO, timeZone: TZ },
  }
}

// ---------- POST ----------

export async function POST(request: NextRequest) {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const supabaseAdmin = getSupabaseAdmin()
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

    // 1) Salvar no Supabase (fonte da verdade)
    const { data: evento, error } = await supabaseAdmin
      .from('agenda')
      .insert({
        titulo: dados.titulo,
        data: dados.data,
        hora: dados.hora,
        local: dados.local,
        tipo: dados.tipo,
        observacoes: dados.observacoes,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // 2) Espelhar no Google Calendar (best-effort)
    let calendarEventId: string | null = null
    let calendarError: string | null = null
    try {
      const calendar = getCalendarClient()
      const times = buildEventTimes(dados.data, dados.hora)
      const gcalRes = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: {
          summary: dados.titulo,
          location: dados.local || undefined,
          description:
            [dados.tipo && `Tipo: ${dados.tipo}`, dados.observacoes]
              .filter(Boolean)
              .join('\n\n') || undefined,
          ...times,
        },
      })
      calendarEventId = gcalRes.data.id || null

      if (calendarEventId) {
        await supabaseAdmin
          .from('agenda')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', evento.id)
      }
    } catch (e: any) {
      calendarError = e?.message || 'erro desconhecido no Google Calendar'
      console.error('[agenda] falha ao espelhar no Google Calendar:', calendarError)
    }

    const resumo =
      `✅ *Evento salvo na agenda!*\n\n📅 *${dados.titulo}*\n` +
      `🗓️ ${dados.data}${dados.hora ? ` às ${dados.hora}` : ''}` +
      (dados.local ? `\n📍 ${dados.local}` : '') +
      (calendarEventId ? '\n🔗 Sincronizado com Google Calendar' : '') +
      (calendarError ? `\n⚠️ Calendar: ${calendarError}` : '')

    return NextResponse.json({
      success: true,
      evento_id: evento.id,
      calendar_event_id: calendarEventId,
      calendar_error: calendarError,
      resumo,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ---------- GET: próximos 30 dias ----------

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const hoje = new Date()
    const em30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    const hojeStr = hoje.toISOString().split('T')[0]
    const em30Str = em30.toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('agenda')
      .select('*')
      .gte('data', hojeStr)
      .lte('data', em30Str)
      .order('data', { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, eventos: data, range: { from: hojeStr, to: em30Str } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
