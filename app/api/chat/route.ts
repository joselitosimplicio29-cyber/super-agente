import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT = `Você é o Super Agente, assistente inteligente da TV Sertão Livre, agência de comunicação regional baseada em Ourolândia, Bahia.

CONTEXTO:
- Atende 12 clientes fixos no sertão baiano e Chapada Diamantina
- Serviços: jornalismo, vídeo, transmissões ao vivo, social media, WordPress

CAPACIDADES:
- Você TEM acesso a busca no Google em tempo real (ferramenta buscar_web)
- Você TEM acesso a leitura de páginas (ferramenta ler_pagina)
- Use buscar_web SEMPRE que precisar de informação atual: notícias, preços, eventos, fatos recentes
- Use ler_pagina quando precisar do conteúdo COMPLETO de uma matéria após buscar
- SEMPRE cite as fontes (URL) quando usar informação da web

ESTILO:
- Português brasileiro, profissional e direto
- Markdown quando ajudar (listas, negrito, títulos)
- Considere o contexto regional do sertão baiano quando relevante`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_web',
    description: 'Busca informações atualizadas no Google. Use para notícias, fatos atuais, preços, eventos recentes.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query em pt-BR. 3-6 palavras-chave específicas.',
        },
        tipo: {
          type: 'string',
          enum: ['web', 'noticias'],
          description: 'Use "noticias" para sites de notícia. "web" para busca geral.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ler_pagina',
    description: 'Lê o conteúdo completo de uma URL. Use após buscar_web.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL completa começando com https://',
        },
      },
      required: ['url'],
    },
  },
];

async function buscarWeb(query: string, tipo: 'web' | 'noticias' = 'web') {
  if (!process.env.SERPER_API_KEY) {
    return { erro: 'SERPER_API_KEY não configurada' };
  }

  const endpoint = tipo === 'noticias' ? 'news' : 'search';
  const response = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 8 }),
  });

  if (!response.ok) throw new Error(`Serper retornou ${response.status}`);

  const data = await response.json();

  if (tipo === 'noticias') {
    const news = (data.news || []).slice(0, 8).map((item: any) => ({
      titulo: item.title,
      fonte: item.source,
      data: item.date,
      url: item.link,
      resumo: item.snippet,
    }));
    return { tipo: 'noticias', resultados: news };
  }

  const organic = (data.organic || []).slice(0, 8).map((item: any) => ({
    titulo: item.title,
    url: item.link,
    resumo: item.snippet,
  }));

  const resultado: any = { tipo: 'web', resultados: organic };
  if (data.answerBox?.answer || data.answerBox?.snippet) {
    resultado.resposta_direta = data.answerBox.answer || data.answerBox.snippet;
  }
  if (data.knowledgeGraph?.description) {
    resultado.contexto = data.knowledgeGraph.description;
  }
  return resultado;
}

async function lerPagina(url: string) {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: 'text/plain',
      ...(process.env.JINA_API_KEY && {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      }),
    },
  });

  if (!response.ok) throw new Error(`Jina retornou ${response.status}`);

  let texto = await response.text();
  if (texto.length > 50000) {
    texto = texto.slice(0, 50000) + '\n\n[...conteúdo truncado...]';
  }
  return { url, conteudo: texto };
}

async function executarFerramenta(name: string, input: any) {
  console.log(`[TOOL] 🔧 ${name}:`, JSON.stringify(input).slice(0, 200));
  try {
    if (name === 'buscar_web') return await buscarWeb(input.query, input.tipo || 'web');
    if (name === 'ler_pagina') return await lerPagina(input.url);
    return { erro: `Ferramenta desconhecida: ${name}` };
  } catch (error: any) {
    console.error(`[TOOL] ❌ ${name}:`, error.message);
    return { erro: error.message };
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];
    const singleMessage: string | undefined = body.message;
    const conversation_id = body.conversation_id;
    const cliente = body.cliente;

    let anthropicMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (messages.length > 0) {
      anthropicMessages = messages
        .filter((m) => m.content && m.content.trim() !== '')
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: typeof m.content === 'string' ? m.content : String(m.content),
        }));
    } else if (singleMessage) {
      anthropicMessages = [{ role: 'user', content: singleMessage }];
    }

    if (anthropicMessages.length === 0) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const lastMsg = anthropicMessages[anthropicMessages.length - 1];
    if (lastMsg.role !== 'user') {
      return NextResponse.json({ error: 'A última mensagem deve ser do usuário' }, { status: 400 });
    }

    const cleaned: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of anthropicMessages) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === msg.role) {
        cleaned[cleaned.length - 1].content += '\n' + msg.content;
      } else {
        cleaned.push({ ...msg });
      }
    }

    console.log(`[CHAT] Conversa: ${conversation_id || 'nova'} | Mensagens: ${cleaned.length}`);

    const systemPrompt = cliente
      ? `${SYSTEM_PROMPT}\n\nCLIENTE EM FOCO: ${cliente.nome || 'não especificado'}${cliente.segmento ? ` (${cliente.segmento})` : ''}`
      : SYSTEM_PROMPT;

    const apiMessages: Anthropic.MessageParam[] = cleaned.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const fontes: Array<{ titulo: string; url: string }> = [];
    const buscas: string[] = [];
    let totalIn = 0;
    let totalOut = 0;
    let respostaFinal = '';

    let iter = 0;
    while (iter < MAX_TOOL_ITERATIONS) {
      iter++;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOLS,
        messages: apiMessages,
      });

      totalIn += response.usage.input_tokens;
      totalOut += response.usage.output_tokens;

      const toolUses: Array<{ id: string; name: string; input: any }> = [];
      let textoRodada = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          textoRodada += block.text;
        } else if (block.type === 'tool_use') {
          toolUses.push({ id: block.id, name: block.name, input: block.input });
        }
      }

      if (textoRodada) {
        respostaFinal += (respostaFinal ? '\n\n' : '') + textoRodada;
      }

      if (response.stop_reason === 'end_turn' || toolUses.length === 0) break;

      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.name === 'buscar_web') buscas.push(tu.input.query);

        const resultado = await executarFerramenta(tu.name, tu.input);

        if (tu.name === 'buscar_web' && (resultado as any).resultados) {
          for (const r of (resultado as any).resultados) {
            fontes.push({ titulo: r.titulo || r.title, url: r.url });
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(resultado),
        });
      }

      apiMessages.push({ role: 'user', content: toolResults });
    }

    const fontesUnicas = Array.from(new Map(fontes.map((f) => [f.url, f])).values()).slice(0, 10);

    if (!respostaFinal) respostaFinal = 'Não consegui gerar uma resposta.';

    console.log(`[CHAT] ✅ iter=${iter} | buscas=${buscas.length} | tokens=${totalIn}+${totalOut}`);

    return NextResponse.json({
      text: respostaFinal,
      message: respostaFinal,
      sources: fontesUnicas,
      searchQueries: buscas,
      usage: {
        input_tokens: totalIn,
        output_tokens: totalOut,
        web_searches: buscas.length,
        iterations: iter,
      },
    });
  } catch (error: any) {
    console.error('[CHAT] ❌', error);

    if (error?.status === 401) {
      return NextResponse.json({ error: 'API key Anthropic inválida' }, { status: 401 });
    }
    if (error?.status === 429) {
      return NextResponse.json({ error: 'Limite de requisições atingido' }, { status: 429 });
    }
    if (error?.status === 404) {
      return NextResponse.json({ error: `Modelo ${MODEL} não disponível` }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Erro ao processar', details: error?.message || 'Desconhecido' },
      { status: 500 }
    );
  }
}