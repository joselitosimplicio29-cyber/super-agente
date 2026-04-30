import argparse
import glob
import json
import os

def pack_transcripts(edit_dir):
    transcripts_dir = os.path.join(edit_dir, "transcripts")
    out_file = os.path.join(edit_dir, "takes_packed.md")
    
    json_files = glob.glob(os.path.join(transcripts_dir, "*.json"))
    if not json_files:
        print(f"No json files found in {transcripts_dir}")
        return
        
    output_lines = []
    
    for jf in sorted(json_files):
        with open(jf, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        words = data.get("words", [])
        if not words:
            continue
            
        filename = os.path.splitext(os.path.basename(jf))[0]
        duration = data.get("duration", 0.0)
        
        phrases = []
        current_phrase = []
        
        for i, w in enumerate(words):
            current_phrase.append(w)
            
            # Check for gap >= 0.5s or speaker change, or end of list
            make_break = False
            if i == len(words) - 1:
                make_break = True
            else:
                next_w = words[i+1]
                gap = next_w["start"] - w["end"]
                if gap >= 0.5 or w.get("speaker") != next_w.get("speaker"):
                    make_break = True
                    
            if make_break:
                start_t = current_phrase[0]["start"]
                end_t = current_phrase[-1]["end"]
                text = " ".join([cw["word"] for cw in current_phrase])
                speaker = current_phrase[0].get("speaker", "S0")
                phrases.append(f"  [{start_t:06.2f}-{end_t:06.2f}] {speaker} {text}")
                current_phrase = []
                
        output_lines.append(f"## {filename}  (duration: {duration:.1f}s, {len(phrases)} phrases)")
        output_lines.extend(phrases)
        output_lines.append("")
        
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
        
    print(f"Packed transcripts saved to {out_file}")

def main():
    parser = argparse.ArgumentParser(description="Pack word-level transcripts into a single phrase-level markdown file.")
    parser.add_argument("--edit-dir", required=True, help="Path to the edit directory containing the 'transcripts' folder")
    args = parser.parse_args()
    
    pack_transcripts(args.edit_dir)

if __name__ == "__main__":
    main()
