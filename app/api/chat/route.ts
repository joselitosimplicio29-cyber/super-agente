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

function precisaBusca(texto: string): boolean {
  const gatilhos = [
    'notícia', 'noticia', 'hoje', 'agora', 'essa semana',
    'busca', 'pesquisa', 'o que aconteceu', 'novidade',
    'atualidade', 'recente', 'último', 'ultimo',
    'procura', 'encontra', 'pesquise', 'busque',
    'quem é', 'quando foi', 'jornal', 'portal',
    'copa', 'eleição', 'eleicao'
  ]

  const lower = texto.toLowerCase()
  const temUrl = extractUrls(texto).length > 0

  return !temUrl && gatilhos.some(g => lower.includes(g))
}

async function buscarNaWeb(query: string): Promise<string> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'br',
        hl: 'pt-br',
        num: 6
      })
    })

    const data = await res.json()

    const resultados = (data.organic || [])
      .map((r: any) =>
        `Título: ${r.title}\nResumo: ${r.snippet}\nFonte: ${r.link}`
      )
      .join('\n\n')

    return resultados
      ? `\n\nContexto encontrado na web:\n\n${resultados}`
      : ''
  } catch {
    return ''
  }
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
Conteúdo extraído do link:

Título: ${title}

Descrição: ${description}

Texto:
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
Você é um assistente altamente inteligente, natural e adaptativo, equivalente ao ChatGPT.

Seu objetivo é responder de forma clara, útil e humana — como se estivesse conversando com a pessoa, não dando uma aula engessada.

COMPORTAMENTO:
- Adapte o nível da resposta ao usuário (simples ou avançado)
- Seja direto quando a pergunta for simples
- Aprofunde quando necessário
- Evite respostas muito estruturadas ou robóticas
- Use exemplos naturais
- Soe como um especialista humano, não como um manual

ESTILO:
- Conversacional e natural
- Evite excesso de listas e formatação
- Pode usar exemplos e analogias
- Evite repetir padrões fixos

REGRAS:
- Sempre em português brasileiro
- Não inventar informações
- Se não souber, diga
- Sempre pense como especialista antes de responder

IMAGENS:
Se o usuário pedir imagem:
GERAR_IMAGEM: descrição em inglês
Depois uma frase curta em português
`

    const lastUserMsg = messages[messages.length - 1]
    const lastText = getTextFromContent(lastUserMsg?.content)
    const urls = extractUrls(lastText)

    let linkContext = ''

    for (const url of urls.slice(0, 3)) {
      const pageText = await fetchPageText(url)
      if (pageText) {
        linkContext += `\n\nConteúdo extraído do link ${url}:\n\n${pageText}`
      }
    }

    let webContext = ''

    if (!linkContext && precisaBusca(lastText)) {
      webContext = await buscarNaWeb(lastText)
    }

    const contextoExtra = linkContext || webContext

    const apiMessages = messages.map((m: any, index: number) => {
      const isLastMessage = index === messages.length - 1

      if (isLastMessage && contextoExtra) {
        if (typeof m.content === 'string') {
          return {
            role: m.role,
            content: `${m.content}\n\n${contextoExtra}`
          }
        }

        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: [
              ...m.content,
              {
                type: 'text',
                text: contextoExtra
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
      max_tokens: 4000,
      temperature: 0.7,
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
              encoder.encode(`Erro ao gerar resposta: ${error.message}`)
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
      {
        status: 500
      }
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
      {
        status: 500
      }
    )
  }
}