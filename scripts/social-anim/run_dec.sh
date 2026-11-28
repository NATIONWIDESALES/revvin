# December 2026 batch: 48 kHz stereo AAC for Facebook. Usage: REVVIN_FONTS=... bash run_dec.sh
set -e
cd "$(dirname "$0")"
: "${REVVIN_FONTS:?set REVVIN_FONTS to the folder with the Barlow .woff files}"
TMP=$(mktemp -d); export REVVIN_OUT="$TMP" REVVIN_SR=48000
python3 scenes_dec.py full
python3 posts_dec.py ../../public/social/dec-2026
python3 music.py 13 106 6 0 "$TMP/m_pay.wav"
python3 music.py 13 98 7 -2 "$TMP/m_nb.wav"
python3 music.py 13 100 2 -3 "$TMP/m_how.wav"
python3 music.py 6 108 8 0 "$TMP/m_sj.wav"
OUT=../../public/social/anim
mux(){ ffmpeg -v error -y -i "$TMP/$1.mp4" -i "$TMP/$2" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -ar 48000 -ac 2 -shortest -movflags +faststart "$OUT/$1.tmp.mp4" && mv "$OUT/$1.tmp.mp4" "$OUT/$1.mp4"; }
mux reel_pay_for_jobs_v2 m_pay.wav; mux reel_neighbor_v2 m_nb.wav; mux reel_how_v2 m_how.wav; mux story_jobs_v2 m_sj.wav
