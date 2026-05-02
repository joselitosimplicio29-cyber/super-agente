import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ============================================================
// SUPER AGENTE — /api/chat
// 🔐 Autenticação NextAuth
// 👤 Personalização por usuário e cliente
// 🌐 Web search via Serper.dev + Tool Use
// 📄 Leitura de páginas via Jina Reader
// ============================================================

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 5;

// ============================================================
// SYSTEM PROMPT (dinâmico, com contexto do usuário e cliente)
// ============================================================
function buildSystemPrompt(userName: string, userRole: string, cliente?: any): string {
  const base = `Você é o Super Agente, assistente inteligente da TV Sertão Livre, agência de comunicação regional baseada em Ourolândia, Bahia.

CONTEXTO DA AGÊNCIA:
- Atende 12 clientes fixos no sertão baiano e Chapada Diamantina
- Serviços: jornalismo, produção de vídeo, transmissões ao vivo, social media, WordPress, cobertura de eventos
- Identidade visual: azul #1E3A8A, dourado #F59E0B, fontes Montserrat + Open Sans
- Site: sertaolivre.com.br | Redes: @tvsertaolivre

USUÁRIO ATUAL:
- Nome: ${userName}
- Papel: ${userRole}`;

  const clienteBlock = cliente
    ? `

CLIENTE EM FOCO NESTA CONVERSA:
- Nome: ${cliente.nome || 'não especificado'}
${cliente.segmento ? `- Segmento: ${cliente.segmento}` : ''}
${cliente.cores ? `- Cores da marca: ${cliente.cores}` : ''}
${cliente.tom_voz ? `- Tom de voz: ${cliente.tom_voz}` : ''}
${cliente.observacoes ? `- Observações: ${cliente.observacoes}` : ''}

Adapte suas respostas ao contexto deste cliente sempre que relevante.`
    : '';

  const capabilities = `

SUAS CAPACIDADES:
- Você TEM acesso a busca no Google em tempo real (ferramenta buscar_web)
- Você TEM acesso a leitura de páginas completas (ferramenta ler_pagina)
- Use buscar_web SEMPRE que precisar de informação atual: notícias, preços, eventos, status, fatos recentes
- Use ler_pagina quando precisar do conteúdo COMPLETO de uma matéria/artigo (após buscar)
- Para notícias regionais (Bahia, sertão), prefira fontes locais quando disponíveis
- SEMPRE cite as fontes (URL) quando usar informação da web

ESTILO DE RESPOSTA:
- Português brasileiro, tom profissional e direto
- Markdown quando ajudar a leitura (listas, negrito, títulos)
- Para notícias: lead, contexto, dados, fontes
- Para tarefas: passo a passo claro
- Considere o contexto regional do sertão baiano quando relevante`;

  return base + clienteBlock + capabilities;
}

// ============================================================
// FERRAMENTAS
// ============================================================
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_web',
    description:
      'Busca informações atualizadas no Google. Use para notícias, fatos atuais, preços, cotações, eventos recentes, ou qualquer informação que possa ter mudado.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query em português brasileiro. Use 3-6 palavras-chave específicas.',
        },
        tipo: {
          type: 'string',
          enum: ['web', 'noticias'],
          description: 'Use "noticias" para sites de notícia (mais recente). Use "web" para busca geral.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ler_pagina',
    description:
      'Lê o conteúdo completo de uma URL específica. Use depois de buscar_web quando precisar do texto completo de uma matéria.',
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

// ============================================================
// EXECUÇÃO DAS FERRAMENTAS
// ============================================================

async function buscarWeb(query: string, tipo: 'web' | 'noticias' = 'web') {
  if (!process.env.SERPER_API_KEY) {
    return { erro: 'SERPER_API_KEY não configurada' };
  }

  const endpoint = tipo === 'noticias' ? 'news' : 'search';
  const url = `https://google.serper.dev/${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'br',
      hl: 'pt-br',
      num: 8,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper retornou ${response.status}`);
  }

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
  const jinaUrl = `https://r.jina.ai/${url}`;

  const response = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/plain',
      ...(process.env.JINA_API_KEY && {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      }),
    },
  });

  if (!response.ok) {
    throw new Error(`Jina retornou ${response.status}`);
  }

  let texto = await response.text();
  if (texto.length > 50000) {
    texto = texto.slice(0, 50000) + '\n\n[...conteúdo truncado...]';
  }

  return { url, conteudo: texto };
}

async function executarFerramenta(name: string, input: any) {
  console.log(`[TOOL] 🔧 ${name}:`, JSON.stringify(input).slice(0, 200));

  try {
    if (name === 'buscar_web') {
      return await buscarWeb(input.query, input.tipo || 'web');
    }
    if (name === 'ler_pagina') {
      return await lerPagina(input.url);
    }
    return { erro: `Ferramenta desconhecida: ${name}` };
  } catch (error: any) {
    console.error(`[TOOL] ❌ ${name}:`, error.message);
    return { erro: error.message };
  }
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userName = (session.user as any).name || 'Usuário';
    const userRole = (session.user as any).role || 'member';

    // Validações
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages || [];
    const singleMessage: string | undefined = body.message;
    const cliente = body.cliente;
    const conversation_id = body.conversation_id;

    // ============================================================
    // PREPARAÇÃO DAS MENSAGENS (lógica preservada do código original)
    // ============================================================
    let anthropicMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (messages.length > 0) {
      anthropicMessages = messages
        .filter((m) => m.content && m.content.trim() !== '')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: typeof m.content === 'string' ? m.content : String(m.content),
        })) as { role: 'user' | 'assistant'; content: string }[];
    } else if (singleMessage) {
      anthropicMessages = [{ role: 'user', content: singleMessage }];
    }

    if (anthropicMessages.length === 0) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    // Última mensagem deve ser do usuário (requisito Anthropic)
    const lastMsg = anthropicMessages[anthropicMessages.length - 1];
    if (lastMsg.role !== 'user') {
      return NextResponse.json(
        { error: 'A última mensagem deve ser do usuário' },
        { status: 400 }
      );
    }

    // Garante alternância de roles (mescla mensagens consecutivas do mesmo role)
    const cleanedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of anthropicMessages) {
      if (
        cleanedMessages.length > 0 &&
        cleanedMessages[cleanedMessages.length - 1].role === msg.role
      ) {
        cleanedMessages[cleanedMessages.length - 1].content += '\n' + msg.content;
      } else {
        cleanedMessages.push({ ...msg });
      }
    }

    console.log(
      `[CHAT] User: ${userName} | Conversa: ${conversation_id || 'nova'} | Cliente: ${cliente?.nome || 'nenhum'} | Mensagens: ${cleanedMessages.length}`
    );

    const systemPrompt = buildSystemPrompt(userName, userRole, cliente);

    // ============================================================
    // LOOP DE AGENTE (com tool use)
    // ============================================================
    const apiMessages: Anthropic.MessageParam[] = cleanedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const fontes: Array<{ titulo: string; url: string }> = [];
    const buscasRealizadas: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let respostaFinal = '';

    let iteracoes = 0;

    while (iteracoes < MAX_TOOL_ITERATIONS) {
      iteracoes++;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOLS,
        messages: apiMessages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      const toolUses: Array<{ id: string; name: string; input: any }> = [];
      let textoNessaRodada = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          textoNessaRodada += block.text;
        } else if (block.type === 'tool_use') {
          toolUses.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      if (textoNessaRodada) {
        respostaFinal += (respostaFinal ? '\n\n' : '') + textoNessaRodada;
      }

      if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
        break;
      }

      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        if (tu.name === 'buscar_web') {
          buscasRealizadas.push(tu.input.query);
        }

        const resultado = await executarFerramenta(tu.name, tu.input);

        if (tu.name === 'buscar_web' && (resultado as any).resultados) {
          for (const r of (resultado as any).resultados) {
            fontes.push({
              titulo: r.titulo || r.title,
              url: r.url,
            });
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

    const fontesUnicas = Array.from(
      new Map(fontes.map((f) => [f.url, f])).values()
    ).slice(0, 10);

    console.log(
      `[CHAT] ✅ Concluído | iterações: ${iteracoes} | buscas: ${buscasRealizadas.length} | tokens: ${totalInputTokens}+${totalOutputTokens}`
    );

    if (!respostaFinal) {
      respostaFinal = 'Não consegui gerar uma resposta.';
    }

    // ⚠️ RETORNA `text` (compatível com seu frontend) e `message` (futuro)
    return NextResponse.json({
      text: respostaFinal,
      message: respostaFinal,
      sources: fontesUnicas,
      searchQueries: buscasRealizadas,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        web_searches: buscasRealizadas.length,
        iterations: iteracoes,
      },
    });
  } catch (error: any) {
    console.error('[CHAT] ❌ Erro:', error);

    if (error?.status === 401) {
      return NextResponse.json({ error: 'API key Anthropic inválida' }, { status: 401 });
    }
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }
    if (error?.status === 404) {
      return NextResponse.json(
        { error: `Modelo ${MODEL} não disponível na sua conta` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Erro ao processar mensagem',
        details: error?.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}