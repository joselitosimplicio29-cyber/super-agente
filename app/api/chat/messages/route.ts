import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/chat/messages
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const { conversation_id, role, content } = await req.json();

    // validação básica
    if (!conversation_id || !role || !content) {
      return NextResponse.json(
        { error: "conversation_id, role e content são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // salva mensagem (only columns that exist: conversation_id, role, content, tipo)
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id,
          role,
          content,
          tipo: "text",
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 🔥 atualiza a conversa (IMPORTANTE pra sidebar)
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        ultima_mensagem: content.slice(0, 100),
      })
      .eq("id", conversation_id);

    return NextResponse.json({ message: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}