"""December 2026 evergreen reels and story (no prices, no sale copy)."""
import sys, os
from scenes import *

def card_steps(img, t, start, items, y0=820, gap=210):
    for i, it in enumerate(items):
        s = start + i * 0.55; y = y0 + i * gap
        p = ease(prog(t, s, 0.4))
        rrect(img, (M, y, W - M, y + 160), 16, WHITE, p, outline=LINE, width=3)
        pc = back(prog(t, s + 0.15, 0.4))
        if pc > 0:
            c = Image.new("RGBA", (120, 120), (0, 0, 0, 0)); circle(c, (60, 60), 44, FOREST)
            f = font("disp", 56); text_layer(c, (60, 60 - f.getmetrics()[0] * 0.58), str(i + 1), f, WHITE, align="center")
            paste_rot(img, c, (M + 85, y + 80), 0, clamp(pc), scale=max(0.01, pc))
        text_layer(img, (M + 160, y + 50), it, font("semi", 48), INK, p, maxw=W - 2 * M - 190)

def fade_to(img, t, at, color=FOREST):
    f = ease(prog(t, at, 0.3))
    if f > 0: rrect(img, (0, 0, W, H), 0, color, f)

def reel_pay_for_jobs(t):
    if t >= 10.4:
        img = bg(FOREST); cta(img, t, 10.4); return img
    if t < 3.2:
        img = bg(FOREST)
        pop_lines(img, t, 0.15, ["Tired of", "paying for", "clicks?"], 640, font("disp", 170), WHITE, gap=0.95, out_at=2.9)
        return img
    if t < 6.0:
        img = bg(PAPER)
        f = font("disp", 190); asc, desc = f.getmetrics(); lh = int((asc + desc) * 0.95)
        p = ease(prog(t, 3.9, 0.5))
        if p > 0:
            rrect(img, (M - 8, 760 + lh - 10, M - 8 + (f.getlength("not clicks.") + 16) * p, 760 + 2 * lh - 30), 8, SIGN, 0.95)
        pop_lines(img, t, 3.25, ["Pay for jobs,", "not clicks."], 760, f, FOREST, gap=0.95)
        fade_to(img, t, 5.7, PAPER)
        return img
    img = bg(PAPER)
    p = ease(prog(t, 6.05, 0.5))
    text_layer(img, (M, 380 - (1 - p) * 40), "With Revvin", font("disp", 130), GREEN, p)
    text_layer(img, (M, 510 - (1 - p) * 40), "you pay when", font("disp", 130), FOREST, p)
    text_layer(img, (M, 640 - (1 - p) * 40), "a job closes.", font("disp", 130), FOREST, p)
    card_steps(img, t, 6.6, ["Your customer shares their link.", "A friend books the job.", "The job closes. You pay."], y0=900)
    fade_to(img, t, 10.1)
    return img

def reel_neighbor(t):
    if t >= 10.6:
        img = bg(FOREST); cta(img, t, 10.6); return img
    disp = font("disp", 165)
    if t < 2.6:
        img = bg(PAPER)
        pop_lines(img, t, 0.15, ["The job", "is done."], 760, disp, FOREST, gap=0.95, out_at=2.3)
        return img
    if t < 5.4:
        img = bg(PAPER)
        pop_lines(img, t, 2.65, ["The neighbor", "is already", "curious."], 700, disp, GREEN, gap=0.95, out_at=5.1)
        return img
    img = bg(FOREST)
    p = ease(prog(t, 5.4, 0.6))
    text_layer(img, (M, 300 - (1 - p) * 40), "Give your customer", font("disp", 100), WHITE, p)
    text_layer(img, (M, 410 - (1 - p) * 40), "a link to share.", font("disp", 100), SIGN, p)
    sign, _ = yard_sign(biz="Northside Electric", q="Know someone who needs an electrician?", sub="Send them our way. We thank you with a reward when the job closes.")
    ps = ease(prog(t, 5.8, 0.7))
    paste_rot(img, sign, (W / 2 - 40, 1080 + (1 - ps) * 500), -1.5, ps)
    text_layer(img, (W / 2, 1600), "Northside Electric is an example business.", font("body", 34), (190, 210, 196), ease(prog(t, 6.6, 0.5)), align="center")
    fade_to(img, t, 10.3)
    return img

def story_jobs(t):
    img = bg(FOREST)
    text_layer(img, (M, 360), "Your next jobs", font("bold", 56), SIGN, ease(prog(t, 0.1, 0.5)))
    pop_lines(img, t, 0.25, ["Already", "know you."], 450, font("disp", 190), WHITE, gap=0.92)
    pop_lines(img, t, 1.3, ["Give every customer", "a personal referral link.", "They share it. You get the call."], 960, font("semi", 62), WHITE, gap=1.3, stagger=0.25)
    pw = ease(prog(t, 2.6, 0.5))
    wordmark(img, (M, 1560 - (1 - pw) * 30), 140, SIGN, pw)
    text_layer(img, (M, 1730), "Link in our bio.", font("semi", 50), WHITE, ease(prog(t, 3.0, 0.5)))
    return img

DEC = {
    "reel_pay_for_jobs_v2": (reel_pay_for_jobs, 13.0, [1.5, 4.8, 9.5, 12.0]),
    "reel_neighbor_v2": (reel_neighbor, 13.0, [1.5, 4.0, 8.5, 12.0]),
    "story_jobs_v2": (story_jobs, 6.0, [5.0]),
    "reel_how_v2": (reel_how, 13.0, [9.0]),
}

if __name__ == "__main__":
    mode = sys.argv[1]; names = sys.argv[2:] or list(DEC)
    for n in names:
        fn, dur, pv = DEC[n]
        out = os.path.join(os.environ["REVVIN_OUT"], f"{n}.mp4")
        if mode == "preview": render(out, dur, fn, pv)
        else: print(n, render(out, dur, fn))
