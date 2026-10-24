#!/usr/bin/env bash
# make-plates.sh — turn scene clips into scroll-scrub "plates" (WebP frame sequences).
#
# Input : design-refs/video/sNN-<name>.mp4   (NN = 01..99; files starting with "_" are ignored)
# Output: public/assets/plates/sNN/f_001.webp ... + poster.webp + last.webp + manifest.json
#
# Usage : bash design-refs/scripts/make-plates.sh [WIDTH] [FPS] [QUALITY]
#         defaults: WIDTH=1600  FPS=12  QUALITY=72
# Needs : ffmpeg + ffprobe (with libwebp). Windows: run in Git Bash or WSL.
set -euo pipefail

cd "$(dirname "$0")/.."            # -> design-refs/
W="${1:-1600}"; FPS="${2:-12}"; Q="${3:-72}"
OUT="../public/assets/plates"

command -v ffmpeg  >/dev/null || { echo "ffmpeg not found";  exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe not found"; exit 1; }

shopt -s nullglob
files=(video/s[0-9][0-9]-*.mp4)
[ ${#files[@]} -gt 0 ] || { echo "No clips named video/sNN-*.mp4 found."; exit 1; }
mkdir -p "$OUT"

total=0
for f in "${files[@]}"; do
  id="$(basename "$f" | cut -d- -f1)"
  d="$OUT/$id"; rm -rf "$d"; mkdir -p "$d"
  vf="scale=${W}:-2:flags=lanczos"

  # 1) frame sequence (audio dropped)
  ffmpeg -v error -y -i "$f" -an -vf "fps=${FPS},${vf}" -c:v libwebp -quality "$Q" "$d/f_%03d.webp"
  # 2) poster = first frame, last = final frame (used as the static / reduced-motion image)
  ffmpeg -v error -y -i "$f" -an -vf "$vf" -frames:v 1 -c:v libwebp -quality 80 "$d/poster.webp"
  ffmpeg -v error -y -sseof -0.2 -i "$f" -an -vf "$vf" -update 1 -frames:v 1 -c:v libwebp -quality 80 "$d/last.webp"

  n=$(ls "$d"/f_*.webp | wc -l | tr -d ' ')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  wh=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$d/poster.webp")
  printf '{ "id": "%s", "source": "%s", "frames": %s, "fps": %s, "width": %s, "height": %s, "duration_s": %s, "pattern": "f_%%03d.webp" }\n' \
    "$id" "$(basename "$f")" "$n" "$FPS" "${wh%,*}" "${wh#*,}" "$dur" > "$d/manifest.json"

  sz=$(du -sk "$d" | cut -f1); total=$((total + sz))
  echo "$id  frames=$n  ${wh/,/x}  ${sz} KB"
done
echo "TOTAL plates: $((total / 1024)) MB   (budget guide: first scene ideally < 6 MB, all scenes ideally < 30 MB)"
