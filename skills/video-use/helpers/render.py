import argparse
import json
import os
import subprocess
import shutil

def run_cmd(cmd):
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)

def render_edl(edl_path, output_file, preview=False, build_subtitles=False):
    with open(edl_path, 'r', encoding='utf-8') as f:
        edl = json.load(f)
        
    edit_dir = os.path.dirname(os.path.abspath(edl_path))
    clips_graded_dir = os.path.join(edit_dir, "clips_graded")
    os.makedirs(clips_graded_dir, exist_ok=True)
    
    sources = edl.get("sources", {})
    ranges = edl.get("ranges", [])
    grade = edl.get("grade", "none")
    overlays = edl.get("overlays", [])
    subtitles = edl.get("subtitles", None)
    
    # Resolving presets for grade
    from grade import PRESETS
    filter_string = PRESETS.get(grade, "")
    
    segment_files = []
    
    # 1. Per-segment extract with grade and 30ms audio fades
    for i, r in enumerate(ranges):
        src_key = r["source"]
        src_file = sources.get(src_key)
        if not src_file or not os.path.exists(src_file):
            print(f"Error: Source {src_key} ({src_file}) not found.")
            return
            
        start = r["start"]
        end = r["end"]
        duration = end - start
        
        seg_out = os.path.join(clips_graded_dir, f"seg_{i:03d}.mp4")
        segment_files.append(seg_out)
        
        afade = f"afade=t=in:st=0:d=0.03,afade=t=out:st={duration-0.03:.2f}:d=0.03"
        
        cmd = ["ffmpeg", "-y", "-ss", str(start), "-t", str(duration), "-i", src_file]
        
        vf_chain = []
        if filter_string:
            vf_chain.append(filter_string)
        if preview:
            vf_chain.append("scale=-2:720")
            
        if vf_chain:
            cmd.extend(["-vf", ",".join(vf_chain)])
        else:
            if preview:
                cmd.extend(["-vf", "scale=-2:720"])
            else:
                pass
                
        cmd.extend(["-af", afade, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", seg_out])
        run_cmd(cmd)
        
    # 2. Lossless concat
    concat_list = os.path.join(clips_graded_dir, "concat.txt")
    with open(concat_list, "w") as f:
        for seg in segment_files:
            f.write(f"file '{os.path.abspath(seg)}'\n")
            
    base_out = os.path.join(edit_dir, "base_concat.mp4")
    run_cmd(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", base_out])
    
    # 3. Add overlays and subtitles
    final_cmd = ["ffmpeg", "-y", "-i", base_out]
    filter_complex = []
    
    # Add overlay inputs
    for i, ov in enumerate(overlays):
        ov_file = os.path.join(edit_dir, ov["file"]) if not os.path.isabs(ov["file"]) else ov["file"]
        if os.path.exists(ov_file):
            final_cmd.extend(["-i", ov_file])
            start_out = ov["start_in_output"]
            dur = ov.get("duration", 5.0)
            
            # setpts=PTS-STARTPTS+T/TB
            input_idx = i + 1
            filter_complex.append(
                f"[{input_idx}:v]setpts=PTS-STARTPTS+{start_out}/TB[ov{i}];"
                f"[0:v][ov{i}]overlay=enable='between(t,{start_out},{start_out+dur})'[v{i}]"
            )
            # Chain the overlays: [v0], [v1]...
            if i > 0:
                filter_complex[-1] = filter_complex[-1].replace("[0:v]", f"[v{i-1}]")
        
    last_v = f"[v{len(overlays)-1}]" if overlays else "[0:v]"
    
    # Add subtitles LAST
    if subtitles:
        sub_path = os.path.join(edit_dir, subtitles) if not os.path.isabs(subtitles) else subtitles
        if os.path.exists(sub_path):
            sub_filter = f"subtitles={sub_path}"
            # Windows absolute paths in ffmpeg filters need escaping: C\\:/path/to/sub.srt
            sub_path_esc = sub_path.replace('\\', '/').replace('C:/', 'C\\:/')
            sub_filter = f"subtitles='{sub_path_esc}'"
            
            if overlays:
                filter_complex.append(f"{last_v}{sub_filter}[vout]")
            else:
                filter_complex.append(f"[0:v]{sub_filter}[vout]")
            last_v = "[vout]"
            
    if filter_complex:
        final_cmd.extend(["-filter_complex", "".join(filter_complex), "-map", last_v, "-map", "0:a", "-c:v", "libx264", "-c:a", "copy", output_file])
    else:
        # No overlays or subtitles, just copy
        final_cmd.extend(["-c", "copy", output_file])
        
    run_cmd(final_cmd)
    print(f"Final render completed: {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Render a video based on EDL JSON.")
    parser.add_argument("edl", help="Path to edl.json")
    parser.add_argument("-o", "--output", required=True, help="Output video file path")
    parser.add_argument("--preview", action="store_true", help="Render fast 720p preview")
    parser.add_argument("--build-subtitles", action="store_true", help="Generate master.srt inline (Not fully implemented in stub)")
    args = parser.parse_args()
    
    render_edl(args.edl, args.output, preview=args.preview, build_subtitles=args.build_subtitles)

if __name__ == "__main__":
    main()
