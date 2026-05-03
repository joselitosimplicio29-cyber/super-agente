import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = `${Date.now()}-${file.name}`

    // Por enquanto só valida o upload.
    // Depois você pode salvar no Supabase aqui.
    return NextResponse.json({
      name: file.name,
      fileName,
      type: file.type,
      size: buffer.length,
      url: null,
    })
  } catch (error: any) {
    console.error('Erro no upload:', error)

    return NextResponse.json(
      { error: error.message || 'Erro ao enviar arquivo' },
      { status: 500 }
    )
  }
}