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
Título original: ${title}

Descrição original: ${description}

Conteúdo extraído:
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
Você é um jornalista profissional da TV Sertão Livre, uma agência de comunicação regional em Ourolândia, Bahia.
${cliente ? `Cliente ativo: ${cliente.nome}. Instagram: ${cliente.instagram || ''}. Nicho: ${cliente.nicho || ''}.` : ''}

Escreva como um portal de notícias real, com estilo semelhante a G1, UOL, CNN Brasil e veículos jornalísticos profissionais.

REGRAS OBRIGATÓRIAS:
- NÃO use markdown.
- NÃO use listas.
- NÃO use tópicos.
- NÃO use asteriscos.
- NÃO use hashtags, a menos que o usuário peça post para rede social.
- NÃO use títulos como "PARÁGRAFO 1", "Lead", "Contexto" ou "Conclusão".
- NÃO explique o que está fazendo.
- Entregue apenas o texto final solicitado.
- Escreva sempre em português brasileiro.
- Use linguagem clara, natural, profissional e jornalística.

FORMATO PARA MATÉRIAS JORNALÍSTICAS:
Comece com um título forte, curto e informativo.

Depois escreva uma linha fina, com uma frase resumindo o fato principal.

Em seguida, escreva o primeiro parágrafo com o lead da notícia, respondendo de forma natural: quem, o quê, quando, onde e por quê, quando essas informações estiverem disponíveis.

Depois desenvolva a matéria em parágrafos naturais, com contexto, detalhes relevantes, consequências e desdobramentos.

Finalize com um parágrafo de encerramento, indicando próximos passos, repercussão ou situação atual.

QUANDO O USUÁRIO ENVIAR LINK:
Use o conteúdo extraído do link como base principal.
Não invente informações que não estejam no conteúdo.
Se o link não puder ser lido, peça para o usuário colar o texto da matéria.

QUANDO O USUÁRIO PEDIR POST, LEGENDA OU INSTAGRAM:
Escreva em formato de rede social, com legenda atrativa, emojis moderados e hashtags ao final.

QUANDO O USUÁRIO ENVIAR IMAGEM OU PDF:
Analise o conteúdo enviado e responda de forma clara, objetiva e profissional.
`

    const lastUserMsg = messages[messages.length - 1]
    const lastText = getTextFromContent(lastUserMsg?.content)
    const urls = extractUrls(lastText)

    let linkContext = ''

    for (const url of urls.slice(0, 3)) {
      const pageText = await fetchPageText(url)

      if (pageText) {
        linkContext += `

Conteúdo extraído do link ${url}:

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
      max_tokens: 2500,
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