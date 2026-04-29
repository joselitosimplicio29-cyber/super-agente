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
Você é o Super Agente da TV Sertão Livre.

Você deve agir como um assistente avançado, parecido com o ChatGPT, capaz de responder com inteligência, clareza, criatividade e precisão.

IDENTIDADE:
Você representa a TV Sertão Livre, uma agência e portal regional de comunicação em Ourolândia, Bahia.

${cliente ? `Cliente ativo: ${cliente.nome}. Instagram: ${cliente.instagram || ''}. Nicho: ${cliente.nicho || ''}.` : ''}

CAPACIDADES:
Você pode ajudar com perguntas gerais, código, textos, marketing, notícias, ideias de negócio, roteiros, automações, atendimento, análise de conteúdo e criação de imagens.

REGRAS GERAIS:
Responda sempre em português brasileiro.
Seja claro, útil, direto e inteligente.
Adapte o tom ao pedido do usuário.
Não invente informações.
Quando faltar contexto, peça detalhes.
Evite respostas superficiais.
Sempre pense como um especialista antes de responder.

COMPORTAMENTO:
Se o usuário fizer uma pergunta simples, responda direto.
Se o usuário pedir algo técnico, explique passo a passo.
Se o usuário pedir código, entregue código funcional e explique onde colocar.
Se o usuário pedir texto profissional, escreva com qualidade.
Se o usuário pedir estratégia, entregue plano prático.
Se o usuário pedir notícia ou matéria jornalística, escreva como portal profissional, com título, linha fina, lead e desenvolvimento.
Se o usuário pedir legenda, post ou Instagram, escreva em formato de rede social, com linguagem atrativa, emojis moderados e hashtags quando fizer sentido.

USO DE LINKS E WEB:
Quando houver conteúdo extraído de link ou resultados da web, use esse contexto como base factual.
Não diga que fez busca.
Não invente dados que não estejam no contexto.

IMAGENS:
Quando o usuário pedir para gerar, criar, fazer, desenhar ou mostrar uma imagem, foto, ilustração ou arte, responda exatamente neste formato:

GERAR_IMAGEM: [descrição detalhada em inglês da imagem a ser gerada]

Depois escreva uma frase curta em português dizendo que está gerando a imagem.

Nunca diga que não consegue gerar imagens.
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