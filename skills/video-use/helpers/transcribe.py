import argparse
import json
import os
import random

def mock_transcribe(video_path):
    """
    Gera um JSON estruturado para simular a resposta de um serviço de transcrição.
    Na versão de produção, isso deveria chamar a Whisper API ou Scribe.
    """
    filename = os.path.basename(video_path)
    
    # Mock de algumas palavras para simulação
    words = [
        {"word": "Olá,", "start": 0.5, "end": 1.0, "speaker": "S0"},
        {"word": "esse", "start": 1.1, "end": 1.4, "speaker": "S0"},
        {"word": "é", "start": 1.4, "end": 1.6, "speaker": "S0"},
        {"word": "um", "start": 1.6, "end": 1.8, "speaker": "S0"},
        {"word": "teste.", "start": 1.8, "end": 2.5, "speaker": "S0"},
        
        # Pausa longa
        {"word": "Hoje", "start": 3.5, "end": 4.0, "speaker": "S0"},
        {"word": "vamos", "start": 4.0, "end": 4.5, "speaker": "S0"},
        {"word": "testar", "start": 4.5, "end": 5.0, "speaker": "S0"},
        {"word": "o", "start": 5.0, "end": 5.2, "speaker": "S0"},
        {"word": "vídeo.", "start": 5.2, "end": 6.0, "speaker": "S0"},
    ]
    
    return {
        "file": filename,
        "duration": random.uniform(10.0, 30.0),
        "words": words
    }

def main():
    parser = argparse.ArgumentParser(description="Transcribe a video to word-level JSON.")
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("--num-speakers", type=int, default=1, help="Number of speakers expected")
    args = parser.parse_args()
    
    video_path = args.video
    if not os.path.exists(video_path):
        print(f"Error: File {video_path} not found.")
        return
        
    edit_dir = os.path.join(os.path.dirname(video_path), "edit")
    transcripts_dir = os.path.join(edit_dir, "transcripts")
    os.makedirs(transcripts_dir, exist_ok=True)
    
    # Executa a transcrição (Mock)
    print(f"Transcribing {video_path} (Mock Scribe)...")
    data = mock_transcribe(video_path)
    
    out_name = os.path.splitext(os.path.basename(video_path))[0] + ".json"
    out_path = os.path.join(transcripts_dir, out_name)
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Transcription saved to {out_path}")

if __name__ == "__main__":
    main()
