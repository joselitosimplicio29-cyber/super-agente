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

async function shouldPerformWebSearch(text: string): Promise<boolean> {
  const gatilhos = [
    'notícia', 'noticia', 'hoje', 'agora', 'essa semana',
    'busca', 'pesquisa', 'o que aconteceu', 'novidade',
    'atualidade', 'recente', 'último', 'ultimo',
    'procura', 'encontra', 'pesquise', 'busque',
    'quem é', 'quando foi', 'jornal', 'portal',
    'informação sobre', 'dados de', 'estatísticas de',
    'últimas notícias', 'tendências de mercado', 'previsão'
  ]

  const lower = text.toLowerCase()
  const hasUrl = extractUrls(text).length > 0

  if (hasUrl) return false

  const isGenericQuestion = ['o que é', 'como funciona', 'me explique'].some(g =>
    lower.startsWith(g)
  )

  if (isGenericQuestion && lower.split(' ').length < 5) return false

  return gatilhos.some(g => lower.includes(g))
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

    let historicalMessages: any[] = []

    if (conversation_id) {
      const supabase = getSupabase()

      const { data, error } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .order('criado_em', { ascending: true })

      if (!error && data) {
        historicalMessages = data
      }
    }

    const lastIncomingMessage = messages[messages.length - 1]

    const allMessages =
      historicalMessages.length > 0
        ? [...historicalMessages, lastIncomingMessage]
        : messages

    const lastUserMsg = allMessages[allMessages.length - 1]
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

    if (!linkContext && await shouldPerformWebSearch(lastText)) {
      webContext = await buscarNaWeb(lastText)
    }

    const contextoExtra = linkContext || webContext

    const apiMessages = allMessages.map((m: any, index: number) => {
      const isLastMessage = index === allMessages.length - 1

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

    const systemPrompt = `
Você é o Super Agente, o assistente de IA oficial da agência Sertão Livre LTDA, localizada em Ourolândia/BA. O proprietário da agência é Joselito.

Você é um assistente verdadeiramente inteligente, altamente estratégico, proativo e com grande conhecimento de contexto do negócio. 
Sua personalidade é profissional, dinâmica, criativa e voltada para resultados, ajudando a Sertão Livre e seus clientes a alcançarem excelência em marketing, comunicação e produção.

IDENTIDADE DA AGÊNCIA:
Sertão Livre LTDA - Agência de Comunicação e Marketing (Ourolândia/BA).
Proprietário: Joselito.

CONTEXTO DO CLIENTE ATUAL:
${cliente ? 'Você está trabalhando agora para o cliente: ' + cliente.nome + '. \nInstagram do cliente: ' + (cliente.instagram || 'Não informado') + '. \nNicho de atuação: ' + (cliente.nicho || 'Não informado') + '.\nAdapte suas ideias, estratégias e tom de voz para se adequar especificamente a este cliente.' : 'Nenhum cliente específico selecionado no momento. Você está atuando em contexto geral da agência.'}

DIRETRIZES DE COMPORTAMENTO E VISÃO DO SUPER AGENTE:
- Adapte o nível da resposta ao usuário: seja simples para pedidos simples, aprofunde-se para pedidos complexos.
- Entregue respostas práticas e diretas, decompondo tarefas complexas em etapas.
- Use um tom de voz humano, natural, confiante e colaborativo (evite respostas robóticas).
- Aja como um especialista experiente em marketing, redes sociais, jornalismo e estratégia de negócios.
- Lembre-se de que você é parte da equipe de Joselito.
- Use o histórico da conversa e o contexto web quando fornecido como base factual.
- Para código, entregue código funcional. Para estratégia, entregue plano aplicável. Para textos e matérias, escreva com qualidade profissional jornalística.
- Responda em português do Brasil.

IMAGENS:
Quando o usuário pedir para gerar, criar, fazer, desenhar ou mostrar uma imagem, foto, ilustração ou arte, responda exatamente neste formato:

GERAR_IMAGEM: [descrição detalhada em inglês da imagem a ser gerada]

Depois escreva uma frase curta em português dizendo que está gerando a imagem.

Nunca diga que não consegue gerar imagens.
`

    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 4000,
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