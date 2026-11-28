"""December 2026 evergreen 1080x1350 posts in the nov-2026 look."""
import sys, os
from PIL import Image, ImageDraw, ImageFilter
from lib import font, wrap

PW, PH = 1080, 1350; X = 97
BG = (6, 26, 16); ACC = (74, 222, 128); YEL = (252, 205, 22); BODY = (214, 224, 216); WHITE = (255, 255, 255)
POSTS = [
    ("REFERRALS", "Your next job is", "already in your customer's phone.", ACC, "Give every customer a personal referral link."),
    ("PLUMBERS", "The leak is fixed.", "Now ask.", ACC, "Send a referral link the same day."),
    ("ELECTRICIANS", "Panel upgrade done,", "neighbor curious.", YEL, "A personal link makes the next call easy."),
    ("HOW YOU PAY", "Pay for jobs,", "not clicks.", YEL, "The reward is paid only when a referred job closes."),
    ("LANDSCAPERS", "The yard is", "the billboard.", ACC, "Give the homeowner a link to share."),
    ("FREE PLAN", "Free for up to", "500 customers.", YEL, "No trial clock. Upgrade to Pro when you outgrow it."),
]

def base():
    im = Image.new("RGB", (PW, PH), BG)
    glow = Image.new("RGB", (PW, PH), (0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((700, -400, 1500, 300), fill=(20, 80, 40)); g.ellipse((-500, 1000, 300, 1700), fill=(18, 70, 36))
    im = Image.blend(im, Image.eval(glow.filter(ImageFilter.GaussianBlur(160)), lambda v: v), 0.5)
    im = Image.fromarray(__import__("numpy").maximum(__import__("numpy").asarray(im), __import__("numpy").asarray(Image.new("RGB",(PW,PH),BG))))
    d = ImageDraw.Draw(im)
    for x in range(0, PW, 54): d.line((x, 0, x, PH), fill=(14, 38, 24))
    for y in range(0, PH, 54): d.line((0, y, PW, y), fill=(14, 38, 24))
    return im

def tracked(d, xy, s, f, fill, sp=6):
    x, y = xy
    for ch in s: d.text((x, y), ch, font=f, fill=fill); x += f.getlength(ch) + sp

def post(eb, white, accent, col, body, out):
    im = base(); d = ImageDraw.Draw(im)
    tracked(d, (X, 112), eb, font("bold", 30), col)
    hf = font("mark", 132); y = 170; lh = 132
    for txt, c in ((white, WHITE), (accent, col)):
        for ln in wrap(txt.upper(), hf, PW - 2 * X):
            d.text((X, y), ln, font=hf, fill=c); y += lh
    y += 40; bf = font("body", 40)
    for ln in wrap(body, bf, PW - 2 * X):
        d.text((X, y), ln, font=bf, fill=BODY); y += 56
    d.text((X, 1198), "REVVIN.CO", font=font("mark", 76), fill=WHITE)
    lf = font("semi", 32); d.text((PW - X - lf.getlength("Link in bio"), 1230), "Link in bio", font=lf, fill=BODY)
    im.save(out, quality=92)

if __name__ == "__main__":
    o = sys.argv[1]; os.makedirs(o, exist_ok=True)
    for i, p in enumerate(POSTS, 1): post(*p, os.path.join(o, f"revvin-dec-{i:02d}.jpg"))
