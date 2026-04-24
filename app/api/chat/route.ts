import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

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
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
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

   const systemPrompt = `
Você é um jornalista profissional da TV Sertão Livre.

Escreva como um portal de notícias real (estilo G1, UOL, CNN Brasil).

REGRAS OBRIGATÓRIAS:
- NÃO use markdown (sem ###, **, listas, etc)
- NÃO explique, apenas escreva a matéria
- Texto fluido, natural e profissional
- Linguagem jornalística brasileira
- Parágrafos bem organizados

ESTRUTURA:

TÍTULO (curto e impactante)

LINHA FINA (opcional, 1 frase explicando)

PARÁGRAFO 1 (lead - resumo da notícia com o mais importante)

PARÁGRAFOS seguintes:
- desenvolvimento da notícia
- contexto
- dados relevantes
- consequências

PARÁGRAFO FINAL:
- fechamento ou próximos desdobramentos

Se houver link ou conteúdo enviado pelo usuário:
- use como base da matéria

Nunca responda em formato de lista.
Nunca use símbolos como # ou *.
`
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

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: apiMessages
    })

    const encoder = new TextEncoder()

    return new Response(
      new ReadableStream({
        async start(controller) {
          let fullText = ''

          try {
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta') {
                const delta = chunk.delta

                if (delta.type === 'text_delta') {
                  const text = delta.text
                  fullText += text
                  controller.enqueue(encoder.encode(text))
                }
              }
            }

            if (conversation_id) {
              const supabase = getSupabase()

              const userContent =
                typeof lastUserMsg.content === 'string'
                  ? lastUserMsg.content
                  : JSON.stringify(lastUserMsg.content)

              await supabase.from('messages').insert([
                {
                  conversation_id,
                  role: 'user',
                  content: userContent
                },
                {
                  conversation_id,
                  role: 'assistant',
                  content: fullText
                }
              ])
            }

            controller.close()
          } catch (error: any) {
            controller.enqueue(
              encoder.encode(`\n\nErro ao gerar resposta: ${error.message}`)
            )
            controller.close()
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
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

    return NextResponse.json({
      success: true,
      conversations: data
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}