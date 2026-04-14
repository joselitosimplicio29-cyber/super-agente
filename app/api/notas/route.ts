import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { conteudo, categoria } = await req.json()

    if (!conteudo?.trim()) {
      return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase.from('notas').insert({
      conteudo: conteudo.trim(),
      categoria: categoria || 'geral',
      origem: 'whatsapp'
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, nota: data })
  } catch (err) {
    console.error('Erro ao salvar nota:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}