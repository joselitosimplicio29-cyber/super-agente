import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, videoPath, edlPath, outputPath } = body

    const skillsDir = path.join(process.cwd(), 'skills', 'video-use')
    const helpersDir = path.join(skillsDir, 'helpers')
    
    let command = ''

    switch (action) {
      case 'transcribe':
        if (!videoPath) throw new Error('Caminho do vídeo é obrigatório')
        command = `python "${path.join(helpersDir, 'transcribe.py')}" "${videoPath}"`
        break
      
      case 'render':
        if (!edlPath || !outputPath) throw new Error('EDL e Output são obrigatórios')
        command = `python "${path.join(helpersDir, 'render.py')}" "${edlPath}" -o "${outputPath}"`
        break
      
      case 'pack':
        command = `python "${path.join(helpersDir, 'pack_transcripts.py')}" --edit-dir "${skillsDir}"`
        break

      default:
        throw new Error('Ação inválida')
    }

    // Executa o script Python
    const { stdout, stderr } = await execPromise(command)

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
      command
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
