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
    'notícia', 'noticia', 'hoje', 'agora', 'essa semana', 'busca', 'pesquisa',
    'o que aconteceu', 'novidade', 'atualidade', 'recente', 'último', 'ultimo',
    'procura', 'encontra', 'pesquise', 'busque', 'me fala sobre', 'o que é',
    'quem é', 'quando foi', 'jornal', 'portal', 'copa', 'eleição', 'eleicao'
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
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 6 })
    })
    const data = await res.json()
    const resultados = (data.organic || []).map((r: any) =>
      `• ${r.title}\n  ${r.snippet}\n  Fonte: ${r.link}`
    ).join('\n\n')

    return resultados
      ? `\n\nResultados encontrados na web (use como base para responder):\n\n${resultados}`
      : ''
  } catch {
    return ''
  }
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
Você é o Super Agente da TV Sertão Livre, uma agência de comunicação regional em Ourolândia, Bahia.
${cliente ? `Cliente ativo: ${cliente.nome}. Instagram: ${cliente.instagram || ''}. Nicho: ${cliente.nicho || ''}.` : ''}

Você é jornalista profissional E também possui capacidade de gerar imagens via Cloudflare AI.
Escreva como um portal de notícias real, com estilo semelhante a G1, UOL, CNN Brasil.

REGRAS OBRIGATÓRIAS DE TEXTO:
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
Depois escreva uma linha fina com uma frase resumindo o fato principal.
Em seguida escreva o lead respondendo: quem, o quê, quando, onde e por quê.
Desenvolva a matéria em parágrafos naturais com contexto e detalhes.
Finalize com próximos passos ou situação atual.

QUANDO O USUÁRIO ENVIAR LINK:
Use o conteúdo extraído do link como base principal.
Não invente informações que não estejam no conteúdo.

QUANDO O USUÁRIO PEDIR POST, LEGENDA OU INSTAGRAM:
Escreva em formato de rede social, com legenda atrativa, emojis moderados e hashtags ao final.

QUANDO O USUÁRIO ENVIAR IMAGEM OU PDF:
Analise o conteúdo enviado e responda de forma clara, objetiva e profissional.

QUANDO HOUVER RESULTADOS DA WEB:
Use as informações encontradas como base factual.
Não mencione que fez uma busca — apenas use os dados naturalmente.

GERAÇÃO DE IMAGEM — REGRA ABSOLUTA E OBRIGATÓRIA:
Quando o usuário pedir para "gerar", "criar", "fazer", "desenhar" ou "mostrar" uma imagem, foto, ilustração ou arte, você DEVE OBRIGATORIAMENTE responder EXATAMENTE assim:

GERAR_IMAGEM: [descrição detalhada em inglês da imagem a ser gerada]

Seguido de uma frase curta em português dizendo que está gerando a imagem.

NUNCA diga que não consegue gerar imagens. NUNCA sugira outras ferramentas. SEMPRE use o comando GERAR_IMAGEM quando solicitado.

Exemplos de quando usar:
- "gera uma imagem de..." → GERAR_IMAGEM: ...
- "cria uma foto de..." → GERAR_IMAGEM: ...
- "faz uma ilustração de..." → GERAR_IMAGEM: ...
- "quero ver uma imagem de..." → GERAR_IMAGEM: ...
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
              { type: 'text', text: contextoExtra }
            ]
          }
        }
      }

      return { role: m.role, content: m.content }
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