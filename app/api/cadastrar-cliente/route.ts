import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 🔹 GET → buscar clientes
export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      clientes: data || []
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

// 🔹 POST → cadastrar cliente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { nome, instagram, nicho } = body

    // validação básica
    if (!nome) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nome é obrigatório'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          nome,
          instagram: instagram || null,
          nicho: nicho || null
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      cliente: data
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}