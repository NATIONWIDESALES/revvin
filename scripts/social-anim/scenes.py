import sys, os
from lib import *

M = 90

def bg(color): return Image.new("RGBA", (W, H), color + (255,))

def pop_lines(img, t, start, lines, y, fnt, color, gap=1.0, stagger=0.18, maxw=W - 2 * M, out_at=None, align="left", x=M):
    asc, desc = fnt.getmetrics(); lh = int((asc + desc) * gap)
    for i, ln in enumerate(lines):
        p = ease(prog(t, start + i * stagger, 0.45))
        a = p
        if out_at is not None: a *= 1 - ease(prog(t, out_at, 0.3))
        text_layer(img, (x, y + i * lh), ln, fnt, color, a, dy=int((1 - p) * 60), align=align)
    return y + len(lines) * lh

def cta(img, t, start, dark=True, line2="Link in bio."):
    fg = WHITE if dark else FOREST
    p = ease(prog(t, start, 0.5))
    wordmark(img, (W / 2, 760 - (1 - p) * 40), 160, SIGN if dark else FOREST, p, anchor_center=True)
    pop_lines(img, t, start + 0.25, ["Free to start."], 970, font("disp", 130), fg, align="center", x=W / 2)
    p2 = back(prog(t, start + 0.55, 0.5))
    if p2 > 0:
        bw, bh = 560, 130
        pill = Image.new("RGBA", (bw + 20, bh + 20), (0, 0, 0, 0))
        rrect(pill, (10, 10, 10 + bw, 10 + bh), 65, SIGN if dark else GREEN)
        f = font("disp", 70)
        text_layer(pill, (10 + bw / 2, 10 + bh / 2 - f.getmetrics()[0] * 0.55), line2, f, FOREST if dark else WHITE, align="center")
        paste_rot(img, pill, (W / 2, 1220), 0, clamp(p2), scale=max(0.01, p2))

def reel_never_ask(t):
    img = bg(PAPER)
    disp = font("disp", 150)
    if t < 2.4:
        pop_lines(img, t, 0.15, ["Your last", "customer loved", "the job."], 740, disp, FOREST, gap=0.95, out_at=2.1)
    elif t < 4.8:
        pop_lines(img, t, 2.45, ["Did you ask", "who else", "needs one?"], 740, disp, FOREST, gap=0.95, out_at=4.5)
    elif t < 6.9:
        y0 = 900
        f = font("disp", 175)
        p = ease(prog(t, 5.35, 0.5))
        lw = f.getlength("never ask.")
        asc, desc = f.getmetrics(); lh = int((asc + desc) * 0.95)
        if p > 0:
            rrect(img, (M - 8, y0 + 2 * lh - 70, M - 8 + (lw + 16) * p, y0 + 2 * lh - 10), 8, SIGN, 0.95 * (1 - ease(prog(t, 6.6, 0.3))))
        pop_lines(img, t, 4.85, ["Most", "owners", "never ask."], y0 - lh, f, FOREST, gap=0.95, out_at=6.6)
    elif t < 10.3:
        img = bg(FOREST)
        p = ease(prog(t, 6.9, 0.6))
        text_layer(img, (M, 330 - (1 - p) * 40), "Revvin asks for you", font("disp", 104), SIGN, p)
        text_layer(img, (M, 440 - (1 - p) * 40), "after every job.", font("disp", 104), WHITE, p)
        sign, (sx, sy) = yard_sign()
        ps = ease(prog(t, 7.2, 0.7))
        paste_rot(img, sign, (W / 2 - 40, 1060 + (1 - ps) * 500), -1.5, ps)
        pk = back(prog(t, 7.9, 0.5))
        st = sticker_img()
        paste_rot(img, st, (W / 2 + 330, 640 + (1 - ps) * 500), 12, clamp(pk), scale=max(0.01, pk))
        text_layer(img, (W / 2, 1560), "Summit Roofing is an example business.", font("body", 34), (190, 210, 196), ease(prog(t, 8.2, 0.5)), align="center")
        fade = ease(prog(t, 10.0, 0.3))
        if fade > 0: rrect(img, (0, 0, W, H), 0, FOREST, fade)
    else:
        img = bg(FOREST)
        cta(img, t, 10.3)
    return img

STEPS = [("Your customer gets", "a personal link."), ("They send it", "to a friend."), ("You do", "the job."), ("You pay the reward", "only when it closes.")]
def reel_how(t):
    if t >= 10.2:
        img = bg(FOREST); cta(img, t, 10.2); return img
    img = bg(PAPER)
    p = ease(prog(t, 0.1, 0.5))
    text_layer(img, (M, 340 - (1 - p) * 40), "How a referral", font("disp", 130), FOREST, p)
    text_layer(img, (M, 470 - (1 - p) * 40), "reaches you", font("disp", 130), GREEN, p)
    x0, y0, step = M + 55, 760, 225
    pt = ease_io(prog(t, 0.8, 7.0))
    d = ImageDraw.Draw(img)
    d.line((x0, y0, x0, y0 + 3 * step), fill=LINE, width=6)
    d.line((x0, y0, x0, y0 + 3 * step * pt), fill=GREEN, width=6)
    for i, (a, b) in enumerate(STEPS):
        s = 1.0 + i * 2.1
        pc = back(prog(t, s, 0.4))
        cy = y0 + i * step
        if pc > 0:
            c = Image.new("RGBA", (130, 130), (0, 0, 0, 0)); circle(c, (65, 65), 56, FOREST)
            f = font("disp", 64); text_layer(c, (65, 65 - f.getmetrics()[0] * 0.58), str(i + 1), f, WHITE, align="center")
            paste_rot(img, c, (x0, cy), 0, clamp(pc), scale=max(0.01, pc))
        pl = ease(prog(t, s + 0.15, 0.45))
        text_layer(img, (x0 + 100, cy - 70), a, font("disp", 82), FOREST, pl, dy=int((1 - pl) * 30))
        text_layer(img, (x0 + 100, cy + 6), b, font("disp", 82), INK, pl * 0.9, dy=int((1 - pl) * 30))
    pk = back(prog(t, 8.0, 0.45))
    if pk > 0:
        chip = Image.new("RGBA", (420, 160), (0, 0, 0, 0)); rrect(chip, (10, 10, 410, 150), 18, SIGN)
        f = font("disp", 92); text_layer(chip, (210, 80 - f.getmetrics()[0] * 0.58), "Paid. $250", f, FOREST, align="center")
        paste_rot(img, chip, (W - 300, y0 + 3 * step + 190), -4, clamp(pk), scale=max(0.01, pk))
    fade = ease(prog(t, 9.9, 0.3))
    if fade > 0: rrect(img, (0, 0, W, H), 0, FOREST, fade)
    return img

def price_row(img, t, start, y, old, new, per, tag):
    p = ease(prog(t, start, 0.45))
    fo = font("disp", 96); fn = font("disp", 170); fp = font("semi", 46)
    text_layer(img, (M, y - (1 - p) * 40), old, fo, (150, 180, 160), p)
    ow = fo.getlength(old)
    s = ease(prog(t, start + 0.45, 0.35))
    if s > 0:
        d = ImageDraw.Draw(img); asc = fo.getmetrics()[0]
        d.line((M - 6, y + asc * 0.62, M - 6 + (ow + 12) * s, y + asc * 0.62), fill=SIGN, width=10)
    pn = back(prog(t, start + 0.7, 0.5))
    if pn > 0:
        text_layer(img, (M, y + 100 + (1 - clamp(pn)) * 50), new, fn, WHITE, clamp(pn))
        nw = fn.getlength(new)
        text_layer(img, (M + nw + 16, y + 100 + 118), per, fp, WHITE, clamp(pn))
    pt = back(prog(t, start + 1.0, 0.45))
    if pt > 0:
        chip = Image.new("RGBA", (330, 110), (0, 0, 0, 0)); rrect(chip, (5, 5, 325, 105), 52, SIGN)
        f = font("disp", 58); text_layer(chip, (165, 55 - f.getmetrics()[0] * 0.58), tag, f, FOREST, align="center")
        paste_rot(img, chip, (W - M - 165, y + 40), 6, clamp(pt), scale=max(0.01, pt))

def reel_bf(t):
    if t >= 9.0:
        img = bg(FOREST); cta(img, t, 9.0); return img
    img = bg(FOREST)
    p = ease(prog(t, 0.1, 0.5))
    text_layer(img, (M, 330 - (1 - p) * 40), "Early Black Friday", font("disp", 115), SIGN, p)
    text_layer(img, (M, 450 - (1 - p) * 40), "Revvin Pro", font("disp", 160), WHITE, ease(prog(t, 0.35, 0.5)))
    price_row(img, t, 1.0, 700, "$97/mo", "$67.90", "/mo", "30% off")
    price_row(img, t, 2.6, 1060, "$970/yr", "$582", "/yr", "40% off")
    pl = ease(prog(t, 4.4, 0.5))
    text_layer(img, (M, 1440), "Locked in for as long as", font("semi", 56), WHITE, pl, dy=int((1 - pl) * 30))
    text_layer(img, (M, 1512), "you stay subscribed.", font("semi", 56), WHITE, pl, dy=int((1 - pl) * 30))
    pe = back(prog(t, 5.2, 0.5))
    if pe > 0:
        chip = Image.new("RGBA", (520, 130), (0, 0, 0, 0)); rrect(chip, (5, 5, 515, 125), 14, WHITE)
        f = font("disp", 80); text_layer(chip, (260, 65 - f.getmetrics()[0] * 0.58), "Ends Nov 30", f, FOREST, align="center")
        paste_rot(img, chip, (M + 260, 1660), -2, clamp(pe), scale=max(0.01, pe))
    fade = ease(prog(t, 8.7, 0.3))
    if fade > 0: rrect(img, (0, 0, W, H), 0, FOREST, fade)
    return img

def story_bf(t):
    img = bg(FOREST)
    p = ease(prog(t, 0.1, 0.5))
    text_layer(img, (M, 380 - (1 - p) * 40), "New", font("bold", 56), SIGN, p)
    pop_lines(img, t, 0.25, ["Early", "Black Friday"], 460, font("disp", 175), WHITE, gap=0.92)
    pop_lines(img, t, 1.2, ["Revvin Pro 30% off monthly.", "40% off yearly.", "Locked in."], 960, font("semi", 64), WHITE, gap=1.25)
    pe = back(prog(t, 2.4, 0.5))
    if pe > 0:
        st = sticker_img("Nov 30", "last day", 170)
        paste_rot(img, st, (W - 270, 1380), 10, clamp(pe), scale=max(0.01, pe))
    text_layer(img, (M, 1600), "Link in our bio.", font("disp", 90), SIGN, ease(prog(t, 3.0, 0.5)))
    return img

def story_what(t):
    img = bg(PAPER)
    text_layer(img, (M, 330), "What is Revvin?", font("disp", 115), GREEN, ease(prog(t, 0.1, 0.5)))
    pop_lines(img, t, 0.4, ["Every customer gets", "a personal referral link.", "You pay a reward only", "when the job closes."], 480, font("disp", 96), FOREST, gap=0.98, stagger=0.25)
    sign, _ = yard_sign(width=660)
    ps = ease(prog(t, 1.8, 0.7))
    paste_rot(img, sign, (W / 2 - 30, 1330 + (1 - ps) * 400), -1.5, ps)
    text_layer(img, (W / 2, 1760), "Example referral page", font("body", 34), MUTED, ease(prog(t, 2.4, 0.4)), align="center")
    return img

def story_free(t):
    img = bg(PAPER)
    pop_lines(img, t, 0.1, ["Free to start.", "Actually free."], 400, font("disp", 160), FOREST, gap=0.95)
    items = ["Up to 25 customers", "Your own page and QR code", "No card needed to publish"]
    for i, it in enumerate(items):
        s = 1.0 + i * 0.45; y = 820 + i * 200
        p = ease(prog(t, s, 0.4))
        rrect(img, (M, y, W - M, y + 150), 16, WHITE, p, outline=LINE, width=3)
        pc = back(prog(t, s + 0.15, 0.4))
        if pc > 0:
            c = Image.new("RGBA", (110, 110), (0, 0, 0, 0)); circle(c, (55, 55), 40, GREEN)
            d = ImageDraw.Draw(c); d.line((36, 56, 50, 70), fill=WHITE + (255,), width=9); d.line((50, 70, 76, 42), fill=WHITE + (255,), width=9)
            paste_rot(img, c, (M + 80, y + 75), 0, clamp(pc), scale=max(0.01, pc))
        text_layer(img, (M + 150, y + 45), it, font("semi", 48), INK, p, maxw=W - 2 * M - 180)
    text_layer(img, (M, 1500), "Upgrade when you outgrow it.", font("disp", 80), GREEN, ease(prog(t, 2.6, 0.5)))
    return img

def story_cta(t):
    img = bg(FOREST)
    cta(img, t, 0.2, line2="Link in bio.")
    p = ease(prog(t, 1.3, 0.5))
    text_layer(img, (W / 2, 1460), "Tap our profile, then the link.", font("semi", 50), WHITE, p, align="center")
    b = abs(math.sin(t * 3.2)) * 26
    a = ease(prog(t, 1.5, 0.4))
    if a > 0:
        d = Image.new("RGBA", (200, 220), (0, 0, 0, 0)); dd = ImageDraw.Draw(d)
        dd.polygon([(100, 10), (180, 110), (130, 110), (130, 210), (70, 210), (70, 110), (20, 110)], fill=SIGN + (255,))
        paste_rot(img, d, (W / 2, 420 - b), 0, a)
    return img

SCENES = {
    "reel_never_ask": (reel_never_ask, 13.0, [1.2, 5.9, 8.8, 12.0]),
    "reel_how": (reel_how, 13.0, [3.0, 9.0, 12.0]),
    "reel_bf": (reel_bf, 12.0, [2.0, 6.0, 11.0]),
    "story_bf": (story_bf, 6.0, [5.0]),
    "story_what": (story_what, 6.0, [5.0]),
    "story_free": (story_free, 6.0, [5.0]),
    "story_cta": (story_cta, 5.0, [4.0]),
}

if __name__ == "__main__":
    mode = sys.argv[1]; names = sys.argv[2:] or list(SCENES)
    for n in names:
        fn, dur, pv = SCENES[n]
        out = os.path.join(os.environ.get("REVVIN_OUT", "/home/claude/ig/anim/out"), f"{n}.mp4")
        if mode == "preview": render(out, dur, fn, pv)
        else: print(n, render(out, dur, fn))