import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('Supabase env vars faltando');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('conversations')
      .select('id, titulo, cliente_id, modelo, ultima_mensagem, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[CONVERSATIONS GET] Supabase error:', error);
      return NextResponse.json({ error: error.message, conversations: [] }, { status: 500 });
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error: any) {
    console.error('[CONVERSATIONS GET] Erro:', error);
    return NextResponse.json({ error: error.message, conversations: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cliente_id, titulo, modelo } = body;

    const supabase = getSupabase();

    console.log('[CONVERSATIONS POST] Inserindo conversa:', { titulo });

    const { data, error } = await supabase
      .from('conversations')
      .insert([
        {
          cliente_id: cliente_id || null,
          titulo: titulo || 'Nova conversa',
          modelo: modelo || 'claude-sonnet-4-6',
          ultima_mensagem: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[CONVERSATIONS POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[CONVERSATIONS POST] Conversa criada:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[CONVERSATIONS POST] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}