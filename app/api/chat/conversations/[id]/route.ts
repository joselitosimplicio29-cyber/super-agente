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

// GET /api/chat/conversations/[id]
// Returns the conversation and its messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "ID inválido", conversation: null, messages: [] },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const supabase = getSupabase();

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (convError) throw convError;

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada", conversation: null, messages: [] },
        { status: 404 }
      );
    }

    if (conversation.user_id && conversation.user_id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Fetch messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("criado_em", { ascending: true });

    if (msgError) throw msgError;

    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, messages: [] },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/conversations/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const supabase = getSupabase();

    // Verify ownership
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_id")
      .eq("id", id)
      .single();

    if (conv?.user_id && conv.user_id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Delete messages first (foreign key)
    await supabase.from("messages").delete().eq("conversation_id", id);

    // Delete conversation
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/chat/conversations/[id]
// Update conversation title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { titulo } = await req.json();
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const supabase = getSupabase();

    // Verify ownership
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_id")
      .eq("id", id)
      .single();

    if (conv?.user_id && conv.user_id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({ titulo, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
