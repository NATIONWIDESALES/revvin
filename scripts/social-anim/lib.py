"""Tiny frame renderer for Revvin animated posts. Draws with Pillow, pipes raw frames to ffmpeg."""
import math, subprocess, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
F = os.environ.get("REVVIN_FONTS", "/home/claude/ig/").rstrip("/") + "/"
FOREST = (15, 74, 42); NIGHT = (11, 58, 32); GREEN = (31, 122, 61); SIGN = (255, 201, 60)
PAPER = (241, 243, 238); INK = (18, 34, 25); LINE = (213, 219, 211); LAWN = (47, 125, 58)
WHITE = (255, 255, 255); MUTED = (79, 94, 85)

_cache = {}
def font(kind, size):
    path = {"disp": "barlow-condensed-latin-800-normal.woff", "disp7": "barlow-condensed-latin-700-normal.woff",
            "mark": "barlow-condensed-latin-800-italic.woff", "body": "barlow-latin-500-normal.woff",
            "semi": "barlow-latin-600-normal.woff", "bold": "barlow-latin-700-normal.woff"}[kind]
    k = (path, size)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(F + path, size)
    return _cache[k]

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(x):
    x = clamp(x); return 1 - (1 - x) ** 3
def ease_io(x):
    x = clamp(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def back(x):
    x = clamp(x); c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
def prog(t, start, dur): return clamp((t - start) / dur)

def wrap(text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if fnt.getlength(test) <= maxw: cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def text_layer(img, xy, text, fnt, fill, alpha=1.0, anchor="la", dy=0, spacing=1.0, maxw=None, align="left"):
    if alpha <= 0:
        lines = wrap(text, fnt, maxw) if maxw else text.split("\n")
        asc, desc = fnt.getmetrics(); return xy[1] + len(lines) * int((asc + desc) * spacing)
    lines = wrap(text, fnt, maxw) if maxw else text.split("\n")
    asc, desc = fnt.getmetrics(); lh = int((asc + desc) * spacing)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    x, y = xy
    for i, ln in enumerate(lines):
        lx = x
        if align == "center": lx = x - fnt.getlength(ln) / 2
        d.text((lx, y + dy + i * lh), ln, font=fnt, fill=fill + (int(255 * clamp(alpha)),))
    img.alpha_composite(layer)
    return y + len(lines) * lh

def rrect(img, box, r, fill, alpha=1.0, outline=None, width=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    a = int(255 * clamp(alpha))
    d.rounded_rectangle(box, r, fill=fill + (a,) if fill else None, outline=(outline + (a,)) if outline else None, width=width)
    img.alpha_composite(layer)

def circle(img, c, r, fill, alpha=1.0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), fill=fill + (int(255 * clamp(alpha)),))
    img.alpha_composite(layer)

def paste_rot(img, sub, center, angle, alpha=1.0, scale=1.0):
    if alpha <= 0 or scale <= 0: return
    s = sub
    if scale != 1.0: s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.LANCZOS)
    s = s.rotate(angle, resample=Image.BICUBIC, expand=True)
    if alpha < 1:
        a = s.split()[3].point(lambda p: int(p * alpha)); s.putalpha(a)
    img.alpha_composite(s, (int(center[0] - s.width / 2), int(center[1] - s.height / 2)))

def wordmark(img, xy, size, color, alpha=1.0, anchor_center=False):
    f = font("mark", size); txt = "REVVIN.CO"
    x, y = xy
    if anchor_center: x -= f.getlength(txt) / 2
    text_layer(img, (x, y), txt, f, color, alpha)

def yard_sign(width=760, biz="Summit Roofing", q="Know someone who needs a new roof?", sub="Send them our way. We pay you $250 when the job closes.", sticker=("$250", "per job")):
    pad = 60; Wp = width; Hp = int(width * 1.05)
    im = Image.new("RGBA", (Wp + 160, Hp + 160), (0, 0, 0, 0))
    ox, oy = 40, 100
    rrect(im, (ox + 6, oy + 14, ox + Wp + 6, oy + Hp + 14), 14, (6, 40, 22), 0.5)
    rrect(im, (ox, oy, ox + Wp, oy + Hp), 14, FOREST)
    text_layer(im, (ox + pad, oy + pad), biz, font("bold", 40), WHITE)
    yb = text_layer(im, (ox + pad, oy + pad + 70), q, font("disp", int(width * 0.137)), WHITE, maxw=Wp - 2 * pad, spacing=0.92)
    qs = int(width * 0.22)
    text_layer(im, (ox + pad, yb + 30), sub, font("body", int(width * 0.05)), WHITE, maxw=Wp - 2 * pad - qs - 20, spacing=1.15)
    qx, qy = ox + Wp - pad - qs, oy + Hp - pad - qs
    rrect(im, (qx, qy, qx + qs, qy + qs), 10, WHITE)
    d = ImageDraw.Draw(im); cell = (qs - 24) // 11
    import random; rnd = random.Random(7)
    for i in range(11):
        for j in range(11):
            corner = (i < 3 and j < 3) or (i > 7 and j < 3) or (i < 3 and j > 7)
            if corner or rnd.random() < 0.45:
                d.rectangle((qx + 12 + i * cell, qy + 12 + j * cell, qx + 12 + i * cell + cell - 2, qy + 12 + j * cell + cell - 2), fill=FOREST + (255,))
    return im, (ox + Wp, oy)

def sticker_img(big="$250", small="per job", r=150):
    im = Image.new("RGBA", (2 * r + 20, 2 * r + 20), (0, 0, 0, 0))
    circle(im, (r + 10, r + 10), r, SIGN)
    fb = font("disp", int(r * (0.78 if len(big) <= 4 else 0.58))); fs = font("bold", int(r * 0.24))
    text_layer(im, (r + 10, r + 10 - fb.getmetrics()[0] * 0.62), big, fb, FOREST, align="center")
    text_layer(im, (r + 10, r + 10 + r * 0.30), small, fs, FOREST, align="center")
    return im

class Writer:
    def __init__(self, path, w=W, h=H):
        self.tmp = path[:-4] + ".tmp.mp4"; self.path = path
        self.p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                                   "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
                                   "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
                                   "-movflags", "+faststart", self.tmp], stdin=subprocess.PIPE)
    def add(self, img): self.p.stdin.write(img.convert("RGB").tobytes())
    def close(self):
        self.p.stdin.close(); rc = self.p.wait()
        if rc == 0: os.replace(self.tmp, self.path)
        return rc

def render(path, dur, draw, preview_times=()):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if preview_times:
        for t in preview_times:
            draw(t).convert("RGB").save(path.replace(".mp4", f"_t{t:.1f}.jpg"), quality=90)
        return
    w = Writer(path); n = int(dur * FPS)
    for i in range(n): w.add(draw(i / FPS))
    return w.close()