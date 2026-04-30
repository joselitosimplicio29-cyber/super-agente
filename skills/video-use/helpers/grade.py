import argparse
import os
import subprocess

PRESETS = {
    "warm_cinematic": "colorbalance=rs=.05:gs=.02:bs=-.05:rm=.02:gm=0:bm=-.02,eq=saturation=0.8:contrast=1.1",
    "neutral_punch": "eq=contrast=1.1:saturation=1.1:gamma=0.9",
    "none": ""
}

def apply_grade(input_file, output_file, preset=None, raw_filter=None):
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return

    filter_string = ""
    if raw_filter:
        filter_string = raw_filter
    elif preset and preset in PRESETS and PRESETS[preset]:
        filter_string = PRESETS[preset]

    cmd = ["ffmpeg", "-y", "-i", input_file]
    
    if filter_string:
        cmd.extend(["-vf", filter_string, "-c:a", "copy"])
    else:
        cmd.extend(["-c:v", "copy", "-c:a", "copy"])
        
    cmd.append(output_file)
    
    print(f"Applying grade to {input_file} -> {output_file}")
    if filter_string:
        print(f"Filter: {filter_string}")
        
    subprocess.run(cmd, check=True)
    print("Grading complete.")

def main():
    parser = argparse.ArgumentParser(description="Apply color grading to a video segment.")
    parser.add_argument("input", help="Input video file")
    parser.add_argument("-o", "--output", required=True, help="Output video file")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), help="Preset to use")
    parser.add_argument("--filter", help="Raw FFmpeg filter string to use instead of a preset")
    parser.add_argument("--list-presets", action="store_true", help="List available presets")
    args = parser.parse_args()
    
    if args.list_presets:
        print("Available presets:")
        for k, v in PRESETS.items():
            print(f"  - {k}: {v}")
        return
        
    apply_grade(args.input, args.output, preset=args.preset, raw_filter=args.filter)

if __name__ == "__main__":
    main()
