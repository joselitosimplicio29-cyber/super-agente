import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { firstMessage } = await req.json();

    if (!firstMessage) {
      return NextResponse.json({ title: "Nova conversa" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ title: "Nova conversa" });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 30,
        messages: [
          {
            role: "user",
            content: `Gere um título curto (máximo 5 palavras) em português para uma conversa que começa com a seguinte mensagem do usuário. Responda APENAS com o título, sem aspas, sem pontuação no final, sem explicação.\n\nMensagem: "${firstMessage}"\n\nTítulo:`,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Erro ao gerar título:", JSON.stringify(data));
      return NextResponse.json({ title: firstMessage.slice(0, 50) });
    }

    const title =
      data.content?.[0]?.type === "text"
        ? data.content[0].text.trim().replace(/^["']|["']$/g, "").replace(/\.+$/, "")
        : firstMessage.slice(0, 50);

    return NextResponse.json({ title });
  } catch (error: any) {
    console.error("Erro generate-title:", error.message);
    return NextResponse.json({ title: "Nova conversa" });
  }
}
