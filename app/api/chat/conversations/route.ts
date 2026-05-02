import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase env vars ausentes");
  }

  return createClient(url, key);
}

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { error: "Unauthorized", userId: null };
  }

  const supabase = getSupabase();

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!dbUser?.id) {
    return { error: "Usuário não encontrado no banco", userId: null };
  }

  return { error: null, userId: dbUser.id };
}

export async function GET(req: NextRequest) {
  try {
    const { error: authError, userId } = await getCurrentUserId();

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || "Unauthorized", conversations: [] },
        { status: 401 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("conversations")
      .select("id, titulo, cliente_id, modelo, ultima_mensagem, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error: any) {
    console.error("GET /api/chat/conversations error:", error);

    return NextResponse.json(
      {
        error: error.message || "Erro interno",
        conversations: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error: authError, userId } = await getCurrentUserId();

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

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
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/chat/conversations error:", error);

    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}