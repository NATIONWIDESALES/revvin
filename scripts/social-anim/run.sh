set -e
cd "$(dirname "$0")"
: "${REVVIN_FONTS:?set REVVIN_FONTS to the folder with the Barlow .woff files}"
TMP=$(mktemp -d)
export REVVIN_OUT="$TMP"
python3 scenes.py full
python3 music.py 13 104 1 0 "$TMP/m_never.wav"
python3 music.py 13 100 2 -3 "$TMP/m_how.wav"
python3 music.py 12 110 3 2 "$TMP/m_bf.wav"
python3 music.py 6 108 4 0 "$TMP/m_s6.wav"
python3 music.py 5 108 5 0 "$TMP/m_s5.wav"
OUT=../../public/social/anim
mkdir -p "$OUT"
mux(){ ffmpeg -v error -y -i "$TMP/$1.mp4" -i "$TMP/$2" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$OUT/$1.tmp.mp4" && mv "$OUT/$1.tmp.mp4" "$OUT/$1.mp4"; }
mux reel_never_ask m_never.wav; mux reel_how m_how.wav; mux reel_bf m_bf.wav
mux story_bf m_s6.wav; mux story_what m_s6.wav; mux story_free m_s6.wav; mux story_cta m_s5.wav
ls -la "$OUT"