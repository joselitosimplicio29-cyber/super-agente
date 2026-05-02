import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TEST_USER_ID = "test-user";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("conversations")
      .select("id, titulo, cliente_id, modelo, ultima_mensagem, created_at, updated_at")
      .eq("user_id", TEST_USER_ID)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ conversations: data || [] });
  } catch (error: any) {
    console.error("GET /api/chat/conversations error:", error);

    return NextResponse.json(
      { error: error.message || "Erro interno", conversations: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cliente_id, titulo, modelo } = body;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("conversations")
      .insert([
        {
          cliente_id: cliente_id || null,
          titulo: titulo || "Nova conversa",
          modelo: modelo || "claude-sonnet-4-6",
          user_id: TEST_USER_ID,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/chat/conversations error:", error);

    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}