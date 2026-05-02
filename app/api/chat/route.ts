import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const userName = (session.user as any).name || "Usuário";
    const userRole = (session.user as any).role || "member";

    const body = await req.json();

    // The frontend sends:
    //   { messages: [...], conversation_id, cliente }
    const messages: { role: string; content: string }[] = body.messages || [];
    const singleMessage: string | undefined = body.message;

    // Build the Anthropic messages array
    let anthropicMessages: { role: string; content: string }[] = [];

    if (messages.length > 0) {
      anthropicMessages = messages
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: typeof m.content === "string" ? m.content : String(m.content),
        }));
    } else if (singleMessage) {
      anthropicMessages = [{ role: "user", content: singleMessage }];
    }

    if (anthropicMessages.length === 0) {
      return new Response("Mensagem vazia.", { status: 400 });
    }

    // Ensure the last message is from "user" (Anthropic requirement)
    const lastMsg = anthropicMessages[anthropicMessages.length - 1];
    if (lastMsg.role !== "user") {
      return new Response("A última mensagem deve ser do usuário.", { status: 400 });
    }

    // Ensure alternating roles (Anthropic requirement)
    const cleanedMessages: { role: string; content: string }[] = [];
    for (const msg of anthropicMessages) {
      if (
        cleanedMessages.length > 0 &&
        cleanedMessages[cleanedMessages.length - 1].role === msg.role
      ) {
        cleanedMessages[cleanedMessages.length - 1].content += "\n" + msg.content;
      } else {
        cleanedMessages.push({ ...msg });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response("ANTHROPIC_API_KEY não configurada.", { status: 500 });
    }

    // Build system prompt
    const systemPrompt = body.cliente
      ? `Você é o Super Agente, um assistente de IA avançado para a agência de marketing do usuário. Responda em português brasileiro, de forma profissional e útil. Você está conversando com: ${userName} (Role: ${userRole}). O cliente atual é: ${body.cliente.nome || "não especificado"}.`
      : `Você é o Super Agente, um assistente de IA avançado para a agência de marketing do usuário. Responda em português brasileiro, de forma profissional e útil. Você está conversando com: ${userName} (Role: ${userRole}).`;

    // Call Anthropic
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: cleanedMessages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error("Erro Anthropic:", JSON.stringify(data));
      return new Response(
        data.error?.message || "Erro na API da Anthropic.",
        { status: 500 }
      );
    }

    const text =
      data.content?.[0]?.type === "text"
        ? data.content[0].text
        : "Não consegui gerar uma resposta.";

    // Return response as JSON with usage info (for the frontend to save)
    return new Response(
      JSON.stringify({
        text,
        usage: data.usage || null,
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error: any) {
    console.error("Erro /api/chat:", error);
    return new Response(error.message || "Erro interno.", { status: 500 });
  }
}