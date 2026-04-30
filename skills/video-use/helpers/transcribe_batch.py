import argparse
import glob
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

def transcribe_file(video_path, script_path):
    print(f"Starting {os.path.basename(video_path)}...")
    subprocess.run(["python", script_path, video_path], check=True)
    return video_path

def main():
    parser = argparse.ArgumentParser(description="Batch transcribe all mp4 files in a directory.")
    parser.add_argument("videos_dir", help="Directory containing video files")
    args = parser.parse_args()
    
    videos_dir = args.videos_dir
    script_path = os.path.join(os.path.dirname(__file__), "transcribe.py")
    
    videos = glob.glob(os.path.join(videos_dir, "*.mp4")) + glob.glob(os.path.join(videos_dir, "*.MP4"))
    
    if not videos:
        print("No .mp4 files found in the directory.")
        return
        
    print(f"Found {len(videos)} videos to transcribe.")
    
    # 4-worker parallel transcription
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(transcribe_file, v, script_path) for v in videos]
        for f in futures:
            try:
                completed_file = f.result()
                print(f"Completed {os.path.basename(completed_file)}")
            except Exception as e:
                print(f"Error during transcription: {e}")

if __name__ == "__main__":
    main()
