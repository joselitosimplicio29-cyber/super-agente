import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/chat/conversations
// Lista todas as conversas do usuário logado, ordenadas pela mais recente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('conversations')
      .select('id, titulo, cliente_id, modelo, ultima_mensagem, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({ conversations: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, conversations: [] },
      { status: 500 }
    )
  }
}

// POST /api/chat/conversations
// Cria uma nova conversa para o usuário logado
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    const userId = (session.user as any).id;

    const { cliente_id, titulo, modelo } = await req.json()
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        cliente_id: cliente_id || null,
        titulo: titulo || 'Nova conversa',
        modelo: modelo || 'claude-sonnet-4-20250514',
        user_id: userId
      }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}