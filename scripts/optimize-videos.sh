#!/usr/bin/env bash
# Re-encode the oversized orb videos for web delivery.
#
# Today these files are tracked in the repo at production-blocking sizes:
#   public/orb/vikings.mp4     → 220 MB  (festival highlight reel)
#   public/orb/logo-intro.mp4  →  87 MB  (boot animation on /)
#
# Mobile users on cellular will time out before either finishes downloading.
# This script produces web-sized H.264 + WebM siblings and prints the new
# file sizes so you can sanity-check before committing.
#
# Prereqs:
#   brew install ffmpeg                # macOS
#   sudo apt-get install ffmpeg        # Linux
#
# Usage:
#   bash scripts/optimize-videos.sh
#
# After running, review the optimized files, then either:
#   1. Replace the source files in public/orb/ (and `git add` them), OR
#   2. Move the heavy originals to an external CDN (Cloudflare Stream /
#      Mux / Vimeo) and update the <video src=…> references in
#      src/pages/OrbHomePage.tsx accordingly.

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is not installed. brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)." >&2
  exit 1
fi

OUT_DIR="public/orb/optimized"
mkdir -p "$OUT_DIR"

# vikings.mp4 → 720p H.264, ~5 Mbps cap, faststart so first byte plays fast.
echo "→ Encoding vikings.mp4 (target ≤8 MB)…"
ffmpeg -y -i public/orb/vikings.mp4 \
  -vf "scale='min(1280,iw)':'-2'" \
  -c:v libx264 -preset slow -crf 28 \
  -maxrate 4500k -bufsize 9000k \
  -movflags +faststart \
  -c:a aac -b:a 96k -ac 2 \
  "$OUT_DIR/vikings.mp4"

# WebM (VP9) sibling — modern browsers fall back to MP4 if missing.
ffmpeg -y -i public/orb/vikings.mp4 \
  -vf "scale='min(1280,iw)':'-2'" \
  -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 \
  -c:a libopus -b:a 96k \
  "$OUT_DIR/vikings.webm"

# logo-intro.mp4 → 720p, slightly looser CRF (it's a short intro).
echo "→ Encoding logo-intro.mp4 (target ≤2 MB)…"
ffmpeg -y -i public/orb/logo-intro.mp4 \
  -vf "scale='min(1280,iw)':'-2'" \
  -c:v libx264 -preset slow -crf 30 \
  -maxrate 3000k -bufsize 6000k \
  -movflags +faststart \
  -c:a aac -b:a 64k -ac 2 \
  "$OUT_DIR/logo-intro.mp4"

ffmpeg -y -i public/orb/logo-intro.mp4 \
  -vf "scale='min(1280,iw)':'-2'" \
  -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 \
  -c:a libopus -b:a 64k \
  "$OUT_DIR/logo-intro.webm"

echo
echo "Output sizes:"
ls -lh "$OUT_DIR"
echo
echo "Originals:"
ls -lh public/orb/vikings.mp4 public/orb/logo-intro.mp4
echo
echo "If sizes look acceptable, replace the originals:"
echo "  mv $OUT_DIR/vikings.mp4 public/orb/vikings.mp4"
echo "  mv $OUT_DIR/logo-intro.mp4 public/orb/logo-intro.mp4"
