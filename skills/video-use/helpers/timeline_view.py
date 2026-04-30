import argparse
import os
import subprocess

def create_timeline_view(video, start, end):
    if not os.path.exists(video):
        print(f"Error: Video file {video} not found.")
        return

    duration = end - start
    if duration <= 0:
        print("Error: End time must be greater than start time.")
        return

    # Calculate how many frames for a reasonable filmstrip (max ~10 frames)
    fps = max(1, min(10, int(10 / duration))) if duration < 10 else (10 / duration)
    tile_width = min(10, max(1, int(duration * fps)))
    
    out_dir = os.path.dirname(os.path.abspath(video))
    base_name = os.path.splitext(os.path.basename(video))[0]
    out_img = os.path.join(out_dir, f"{base_name}_{start}_{end}_filmstrip.png")
    out_wave = os.path.join(out_dir, f"{base_name}_{start}_{end}_wave.png")

    print(f"Generating filmstrip from {start}s to {end}s...")
    
    # Generate Filmstrip
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start), "-t", str(duration), "-i", video,
        "-vf", f"fps={fps},scale=320:-1,tile={tile_width}x1",
        out_img
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print(f"Generating waveform...")
    
    # Generate Waveform
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start), "-t", str(duration), "-i", video,
        "-filter_complex", "showwavespic=s=1280x200:colors=orange",
        "-frames:v", "1",
        out_wave
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print(f"Done. Outputs saved as:\n- {out_img}\n- {out_wave}")

def main():
    parser = argparse.ArgumentParser(description="Generate filmstrip and waveform PNGs for a specific video segment.")
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("start", type=float, help="Start time in seconds")
    parser.add_argument("end", type=float, help="End time in seconds")
    args = parser.parse_args()
    
    create_timeline_view(args.video, args.start, args.end)

if __name__ == "__main__":
    main()
