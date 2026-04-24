import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getTextFromContent(content: any) {
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n')
  }

  return ''
}

function extractUrls(text: string) {
  const regex = /(https?:\/\/[^\s]+)/g
  return text.match(regex) || []
}

async function fetchPageText(url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!res.ok) return ''

    const html = await res.text()
    const $ = cheerio.load(html)

    $('script, style, nav, footer, header, iframe, noscript').remove()

    const title = $('title').text().trim()
    const description = $('meta[name="description"]').attr('content') || ''
    const text =
      $('article').text().trim() ||
      $('main').text().trim() ||
      $('body').text().trim()

    const cleanText = text.replace(/\s+/g, ' ').trim()

    return `
Título: ${title}

Descrição: ${description}

Conteúdo:
${cleanText.slice(0, 12000)}
`
  } catch {
    return ''
  }
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
- Ler links enviados pelo usuário e resumir notícias/matérias
- Planejar conteúdo e estratégias
- Responder dúvidas gerais

Quando o usuário enviar um link, use o conteúdo extraído como base.
Se não conseguir ler o link, peça para o usuário colar o texto da matéria.

Responda sempre em português brasileiro, de forma direta e profissional.`

    const lastUserMsg = messages[messages.length - 1]
    const lastText = getTextFromContent(lastUserMsg?.content)
    const urls = extractUrls(lastText)

    let linkContext = ''

    for (const url of urls.slice(0, 3)) {
      const pageText = await fetchPageText(url)

      if (pageText) {
        linkContext += `

--- Conteúdo extraído do link: ${url} ---
${pageText}
`
      }
    }

    const apiMessages = messages.map((m: any, index: number) => {
      const isLastMessage = index === messages.length - 1

      if (isLastMessage && linkContext) {
        if (typeof m.content === 'string') {
          return {
            role: m.role,
            content: `${m.content}

${linkContext}`
          }
        }

        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: [
              ...m.content,
              {
                type: 'text',
                text: linkContext
              }
            ]
          }
        }
      }

      return {
        role: m.role,
        content: m.content
      }
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: apiMessages
    })

    const assistantMessage =
      response.content[0].type === 'text'
        ? response.content[0].text
        : ''

    if (conversation_id) {
      const supabase = getSupabase()

      const userContent =
        typeof lastUserMsg.content === 'string'
          ? lastUserMsg.content
          : JSON.stringify(lastUserMsg.content)

      await supabase.from('messages').insert([
        { conversation_id, role: 'user', content: userContent },
        { conversation_id, role: 'assistant', content: assistantMessage }
      ])
    }

    return NextResponse.json({ success: true, message: assistantMessage })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}