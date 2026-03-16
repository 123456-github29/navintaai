#!/usr/bin/env python3
"""
Navinta AI Social Media Post Generator
Generates Instagram, Twitter/X, and iMessage-style posts
matching the Navinta AI brand design system.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(SCRIPT_DIR, "fonts")
LOGO_PATH = "/home/user/navintaai/client/public/navinta-logo.png"
OUTPUT_DIR = "/home/user/navintaai/instagram-posts"

# ─── Canvas Sizes ─────────────────────────────────────────────────────────────
IG_W, IG_H = 1080, 1350
TW_W, TW_H = 1200, 675
IM_W, IM_H = 1080, 1350  # iMessage as IG-sized post

# ─── Brand Colors ─────────────────────────────────────────────────────────────
BG         = (0, 0, 0)
BG_DARK    = (5, 5, 5)
BG_CARD    = (17, 20, 26)
BG_CARD2   = (13, 13, 13)
BLUE       = (59, 130, 246)
INDIGO     = (99, 102, 241)
PURPLE     = (168, 85, 247)
WHITE      = (255, 255, 255)
MUTED      = (153, 153, 153)     # white/60
DIM        = (102, 102, 102)     # white/40
SUBTLE     = (40, 40, 40)        # white/16
EMERALD    = (52, 211, 153)
RED        = (239, 68, 68)
AMBER      = (251, 191, 36)
IOS_BLUE   = (10, 132, 255)
IOS_GRAY   = (44, 44, 46)

GRAD = [(96, 165, 250), (129, 140, 248), (167, 139, 250)]  # blue→indigo→purple
GRAD_R = [(239, 68, 68), (219, 39, 119)]                   # red gradient
GRAD_G = [(52, 211, 153), (16, 185, 129)]                  # green gradient


# ─── Font Loader ──────────────────────────────────────────────────────────────
_font_cache = {}

def font(name, size):
    key = (name, size)
    if key not in _font_cache:
        path = os.path.join(FONTS_DIR, name)
        try:
            _font_cache[key] = ImageFont.truetype(path, size)
        except Exception:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


# ─── Drawing Utilities ────────────────────────────────────────────────────────

def h_gradient(width, height, colors):
    """Return an RGB image with a horizontal gradient across the given colors."""
    img = Image.new("RGB", (max(width, 1), max(height, 1)))
    n = len(colors) - 1
    for x in range(img.width):
        t = x / max(img.width - 1, 1)
        seg = min(int(t * n), n - 1)
        lt = (t * n) - seg
        c1, c2 = colors[seg], colors[seg + 1]
        r = int(c1[0] + (c2[0] - c1[0]) * lt)
        g = int(c1[1] + (c2[1] - c1[1]) * lt)
        b = int(c1[2] + (c2[2] - c1[2]) * lt)
        for y in range(img.height):
            img.putpixel((x, y), (r, g, b))
    return img


def v_gradient(width, height, top_color, bottom_color):
    img = Image.new("RGB", (max(width, 1), max(height, 1)))
    for y in range(img.height):
        t = y / max(img.height - 1, 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        for x in range(img.width):
            img.putpixel((x, y), (r, g, b))
    return img


def text_size(txt, fnt):
    bb = fnt.getbbox(txt)
    return bb[2] - bb[0], bb[3] - bb[1]


def wrap(txt, fnt, max_w):
    words = txt.split(" ")
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip() if cur else w
        tw, _ = text_size(test, fnt)
        if tw <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def line_height(fnt, spacing=10):
    _, h = text_size("Ag", fnt)
    return h + spacing


# ─── NavintaCanvas ────────────────────────────────────────────────────────────

class NavintaCanvas:
    def __init__(self, w=IG_W, h=IG_H):
        self.w = w
        self.h = h
        self.img = Image.new("RGBA", (w, h), BG + (255,))
        self.draw = ImageDraw.Draw(self.img)

        # ── Load logo ──
        try:
            self.logo = Image.open(LOGO_PATH).convert("RGBA")
        except Exception:
            self.logo = None

    def _refresh_draw(self):
        self.draw = ImageDraw.Draw(self.img)

    # ── Background helpers ──────────────────────────────────────────────────

    def dot_grid(self, spacing=40, dot_r=1, alpha=12):
        ov = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for x in range(0, self.w + spacing, spacing):
            for y in range(0, self.h + spacing, spacing):
                d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r],
                          fill=(255, 255, 255, alpha))
        self.img = Image.alpha_composite(self.img, ov)
        self._refresh_draw()

    def glow_orb(self, cx, cy, radius, color_rgb, alpha=30):
        ov = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                  fill=color_rgb + (alpha,))
        ov = ov.filter(ImageFilter.GaussianBlur(radius // 3))
        self.img = Image.alpha_composite(self.img, ov)
        self._refresh_draw()

    def standard_bg(self):
        self.dot_grid()
        self.glow_orb(-80, -100, 520, INDIGO, 28)
        self.glow_orb(self.w + 80, -60, 420, PURPLE, 22)
        self.glow_orb(-60, self.h + 80, 480, BLUE, 18)

    # ── Shape helpers ───────────────────────────────────────────────────────

    def rounded_rect(self, xy, radius=16, fill=None, outline=None, width=1):
        ov = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
        self.img = Image.alpha_composite(self.img, ov)
        self._refresh_draw()

    def h_line(self, y, x0=None, x1=None, alpha=18):
        if x0 is None: x0 = 60
        if x1 is None: x1 = self.w - 60
        self.draw.line([(x0, y), (x1, y)], fill=WHITE + (alpha,), width=1)

    def v_accent_bar(self, x, y0, y1, color=INDIGO, width=3):
        self.rounded_rect([x, y0, x + width, y1], radius=2, fill=color + (255,))

    # ── Text helpers ────────────────────────────────────────────────────────

    def gradient_text(self, txt, fnt, cx, y, colors=None, anchor="mt"):
        if colors is None:
            colors = GRAD
        bb = fnt.getbbox(txt)
        tw = bb[2] - bb[0]
        th = bb[3] - bb[1]
        pad = 4
        ax = cx - tw // 2 if anchor in ("mt", "mm") else cx

        mask = Image.new("L", (tw + pad * 2, th + pad * 2), 0)
        ImageDraw.Draw(mask).text((pad - bb[0], pad - bb[1]), txt, fill=255, font=fnt)

        grad_img = h_gradient(tw + pad * 2, th + pad * 2, colors)
        self.img.paste(grad_img, (ax - pad, y - bb[1] - pad), mask=mask)
        self._refresh_draw()
        return th + 4

    def gradient_text_block(self, txt, fnt, cx, y, max_w, colors=None, spacing=10):
        lines = wrap(txt, fnt, max_w)
        lh = line_height(fnt, spacing)
        for i, ln in enumerate(lines):
            self.gradient_text(ln, fnt, cx, y + i * lh, colors)
        return y + len(lines) * lh

    def white_text(self, txt, fnt, cx, y, max_w, color=None, spacing=8, align="center"):
        if color is None:
            color = WHITE
        lines = wrap(txt, fnt, max_w)
        lh = line_height(fnt, spacing)
        for i, ln in enumerate(lines):
            tw, _ = text_size(ln, fnt)
            if align == "center":
                lx = cx - tw // 2
            elif align == "left":
                lx = cx
            else:
                lx = cx - tw
            bb = fnt.getbbox(ln)
            self.draw.text((lx - bb[0], y + i * lh - bb[1]), ln, fill=color, font=fnt)
        return y + len(lines) * lh

    def pill(self, txt, fnt, cx, y, fill=(99, 102, 241, 28), border=(99, 102, 241, 80), text_color=None):
        if text_color is None:
            text_color = (160, 165, 250)
        tw, th = text_size(txt, fnt)
        pw, ph = 24, 10
        pw2, ph2 = tw + pw * 2, th + ph * 2
        px = cx - pw2 // 2
        self.rounded_rect([px, y, px + pw2, y + ph2], radius=ph2 // 2,
                          fill=fill, outline=border, width=1)
        bb = fnt.getbbox(txt)
        self.draw.text((px + pw - bb[0], y + ph - bb[1]), txt, fill=text_color, font=fnt)
        return y + ph2

    def logo_bottom(self, y=None, size=36):
        if y is None:
            y = self.h - 76
        if not self.logo:
            return
        lh = size
        ratio = lh / self.logo.height
        lw = int(self.logo.width * ratio)
        logo_r = self.logo.resize((lw, lh), Image.LANCZOS)

        fnt = font("Inter-SemiBold.ttf", 26)
        word = "Navinta AI"
        tw, th = text_size(word, fnt)
        gap = 10
        total = lw + gap + tw
        lx = (self.w - total) // 2

        self.img.paste(logo_r, (lx, y), logo_r)
        bb = fnt.getbbox(word)
        self.draw.text((lx + lw + gap - bb[0], y + (lh - th) // 2 - bb[1]),
                       word, fill=MUTED, font=fnt)

    def finalize(self):
        rgb = Image.new("RGB", (self.w, self.h), BG)
        rgb.paste(self.img.convert("RGB"), mask=self.img.split()[3])
        return rgb

    def save(self, path):
        self.finalize().save(path, "PNG", optimize=True)
        print(f"  ✓ {os.path.basename(path)}")


# ─── Instagram Templates ──────────────────────────────────────────────────────

def ig_hero(headline, subtext, badge=None, pill_color=None, cta=None, filename=None):
    """Template A — Full dark hero with gradient headline."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2
    y = 180

    if badge:
        fnt_b = font("Inter-SemiBold.ttf", 22)
        y = c.pill(badge, fnt_b, cx, y,
                   fill=pill_color or (99, 102, 241, 28),
                   border=(99, 102, 241, 80)) + 44

    fnt_h = font("Inter-Bold.ttf", 80)
    y = c.gradient_text_block(headline, fnt_h, cx, y, IG_W - 140, spacing=14) + 44

    if subtext:
        fnt_s = font("Inter-Regular.ttf", 34)
        y = c.white_text(subtext, fnt_s, cx, y, IG_W - 160, color=MUTED, spacing=10) + 30

    if cta:
        fnt_c = font("Inter-SemiBold.ttf", 26)
        y = c.white_text(cta, fnt_c, cx, y, IG_W - 160, color=DIM)

    c.logo_bottom()
    c.save(filename)


def ig_list(headline, items, badge=None, cta=None, filename=None):
    """Template B — Headline + bullet list."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2
    pad = 90
    y = 140

    if badge:
        fnt_b = font("Inter-SemiBold.ttf", 22)
        y = c.pill(badge, fnt_b, cx, y) + 40

    fnt_h = font("Inter-Bold.ttf", 64)
    y = c.gradient_text_block(headline, fnt_h, cx, y, IG_W - 140, spacing=12) + 50

    c.h_line(y)
    y += 36

    fnt_item = font("Inter-SemiBold.ttf", 30)
    fnt_sub = font("Inter-Regular.ttf", 26)
    dot_r = 5

    for item in items:
        if isinstance(item, tuple):
            label, detail = item
        else:
            label, detail = item, None

        # Bullet dot
        c.rounded_rect([pad, y + 10, pad + dot_r * 2, y + 10 + dot_r * 2],
                       radius=dot_r, fill=INDIGO + (255,))
        # Label
        lx = pad + dot_r * 2 + 18
        lb = fnt_item.getbbox(label)
        c.draw.text((lx - lb[0], y - lb[1]), label, fill=WHITE, font=fnt_item)
        _, lh = text_size(label, fnt_item)
        y += lh + 8

        if detail:
            db = fnt_sub.getbbox(detail)
            c.draw.text((lx - db[0], y - db[1]), detail, fill=MUTED, font=fnt_sub)
            _, dh = text_size(detail, fnt_sub)
            y += dh + 6

        y += 20

    if cta:
        y += 10
        c.h_line(y)
        y += 30
        fnt_c = font("Inter-SemiBold.ttf", 26)
        c.white_text(cta, fnt_c, cx, y, IG_W - 160, color=DIM)

    c.logo_bottom()
    c.save(filename)


def ig_split(headline, left_title, left_items, right_title, right_items,
             left_color=RED, right_color=EMERALD, filename=None):
    """Template C — Split before/after layout."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2
    y = 110

    fnt_h = font("Inter-Bold.ttf", 58)
    y = c.gradient_text_block(headline, fnt_h, cx, y, IG_W - 120, spacing=10) + 40

    col_w = IG_W // 2 - 70
    lcx = IG_W // 4
    rcx = IG_W * 3 // 4
    card_top = y

    # Left card
    c.rounded_rect([40, card_top, IG_W // 2 - 20, IG_H - 160],
                   radius=24, fill=BG_CARD + (200,), outline=left_color + (40,), width=1)
    # Right card
    c.rounded_rect([IG_W // 2 + 20, card_top, IG_W - 40, IG_H - 160],
                   radius=24, fill=BG_CARD + (200,), outline=right_color + (40,), width=1)

    y += 30
    fnt_title = font("Inter-Bold.ttf", 28)
    fnt_item = font("Inter-Regular.ttf", 26)

    # Left title
    c.white_text(left_title, fnt_title, lcx, y, col_w, color=left_color + (200,))
    # Right title
    c.white_text(right_title, fnt_title, rcx, y, col_w, color=right_color + (200,))

    y += 44
    lh = line_height(fnt_item, 6)

    for i, (li, ri) in enumerate(zip(left_items, right_items)):
        ly = y + i * (lh + 14)
        # Left item
        c.white_text("✗  " + li, fnt_item, lcx, ly, col_w, color=MUTED)
        # Right item
        c.white_text("✓  " + ri, fnt_item, rcx, ly, col_w, color=WHITE)

    c.logo_bottom()
    c.save(filename)


def ig_quote(quote_text, attribution, filename=None):
    """Template D — Quote card."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2
    pad = 110

    # Open-quote mark
    fnt_q = font("PlayfairDisplay-Bold.ttf", 140)
    c.draw.text((pad - 20, 140), "\u201c", fill=(99, 102, 241, 60), font=fnt_q)

    # Quote text
    fnt_qt = font("PlayfairDisplay-Italic.ttf", 50)
    y = c.white_text(quote_text, fnt_qt, cx, 280, IG_W - pad * 2,
                     color=WHITE, spacing=14) + 50

    # Accent bar
    bar_w = 60
    c.rounded_rect([cx - bar_w // 2, y, cx + bar_w // 2, y + 3],
                   radius=2, fill=INDIGO + (200,))
    y += 36

    # Attribution
    fnt_attr = font("Inter-SemiBold.ttf", 28)
    c.white_text(attribution, fnt_attr, cx, y, IG_W - pad * 2, color=MUTED)

    c.logo_bottom()
    c.save(filename)


def ig_stat(stat_text, label, sub=None, filename=None):
    """Template E — Big stat."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2

    fnt_stat = font("Inter-Bold.ttf", 110)
    _, sh = text_size(stat_text, fnt_stat)
    y_stat = (IG_H - sh) // 2 - 80

    c.gradient_text_block(stat_text, fnt_stat, cx, y_stat, IG_W - 100)

    fnt_lbl = font("Inter-SemiBold.ttf", 38)
    y_lbl = y_stat + sh + 26
    c.white_text(label, fnt_lbl, cx, y_lbl, IG_W - 140, color=WHITE)

    if sub:
        fnt_sub = font("Inter-Regular.ttf", 30)
        c.white_text(sub, fnt_sub, cx, y_lbl + 56, IG_W - 160, color=MUTED)

    c.logo_bottom()
    c.save(filename)


def ig_carousel_slide(slide_num, total_slides, headline, body=None,
                      is_cover=False, colors=None, filename=None):
    """Template F — Carousel slide."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    if colors is None:
        colors = GRAD

    cx = IG_W // 2
    pad = 90

    # Progress dots top right
    dot_d = 10
    dot_gap = 6
    total_w = total_slides * (dot_d + dot_gap) - dot_gap
    dx = IG_W - pad - total_w
    dy = 70
    for i in range(total_slides):
        filled = i < slide_num
        x0 = dx + i * (dot_d + dot_gap)
        c.rounded_rect([x0, dy, x0 + dot_d, dy + dot_d],
                       radius=dot_d // 2,
                       fill=INDIGO + (255,) if filled else (60, 60, 60, 255))

    # Slide number tag
    fnt_tag = font("Inter-SemiBold.ttf", 22)
    tag_text = f"{slide_num}/{total_slides}"
    c.pill(tag_text, fnt_tag, pad + 40, 54,
           fill=(99, 102, 241, 25), border=(99, 102, 241, 60))

    y = 180
    if is_cover:
        fnt_h = font("Inter-Bold.ttf", 72)
        y = c.gradient_text_block(headline, fnt_h, cx, y, IG_W - 140, colors, spacing=12) + 40
        if body:
            fnt_b = font("Inter-Regular.ttf", 32)
            c.white_text(body, fnt_b, cx, y, IG_W - 160, color=MUTED)
    else:
        fnt_h = font("Inter-SemiBold.ttf", 52)
        y = c.white_text(headline, fnt_h, cx, y, IG_W - 140, color=WHITE, spacing=12) + 36
        if body:
            fnt_b = font("Inter-Regular.ttf", 32)
            c.white_text(body, fnt_b, cx, y, IG_W - 160, color=MUTED)

    # Swipe hint on non-last slides
    if slide_num < total_slides:
        fnt_sw = font("Inter-Regular.ttf", 22)
        c.white_text("Swipe →", fnt_sw, cx, IG_H - 130, IG_W - 200, color=DIM)

    c.logo_bottom()
    c.save(filename)


def ig_meme(headline, subtext=None, badge=None, filename=None):
    """Template G — Meme / humor post."""
    c = NavintaCanvas(IG_W, IG_H)
    c.standard_bg()

    cx = IG_W // 2
    y = 200

    if badge:
        fnt_b = font("Inter-SemiBold.ttf", 24)
        y = c.pill(badge, fnt_b, cx, y) + 50

    fnt_h = font("Inter-Bold.ttf", 76)
    y = c.gradient_text_block(headline, fnt_h, cx, y, IG_W - 120, spacing=14) + 50

    if subtext:
        fnt_s = font("Inter-Regular.ttf", 32)
        c.white_text(subtext, fnt_s, cx, y, IG_W - 160, color=MUTED)

    c.logo_bottom()
    c.save(filename)


# ─── Twitter/X Template ───────────────────────────────────────────────────────

def twitter_post(tweet_text, handle="@NavintaAI", likes="2.4K",
                 retweets="847", replies="312", views="48K", filename=None):
    c = NavintaCanvas(TW_W, TW_H)
    c.standard_bg()

    # Card background
    card_m = 48
    card = [card_m, card_m, TW_W - card_m, TW_H - card_m]
    c.rounded_rect(card, radius=20,
                   fill=BG_CARD + (230,),
                   outline=(255, 255, 255, 14), width=1)

    # Left gradient strip
    c.rounded_rect([card_m, card_m, card_m + 4, TW_H - card_m],
                   radius=2, fill=None)
    strip_grad = h_gradient(4, TW_H - card_m * 2, [(99, 102, 241), (168, 85, 247)])
    c.img.paste(strip_grad, (card_m, card_m))
    c._refresh_draw()

    # Avatar circle
    av_x, av_y, av_r = card_m + 36, card_m + 36, 30
    ov = Image.new("RGBA", (TW_W, TW_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.ellipse([av_x, av_y, av_x + av_r * 2, av_y + av_r * 2],
              fill=INDIGO + (255,))
    c.img = Image.alpha_composite(c.img, ov)
    c._refresh_draw()

    # Logo in avatar
    if c.logo:
        logo_s = 36
        ratio = logo_s / c.logo.height
        logo_w = int(c.logo.width * ratio)
        lr = c.logo.resize((logo_w, logo_s), Image.LANCZOS)
        lx = av_x + av_r - logo_w // 2
        ly = av_y + av_r - logo_s // 2
        c.img.paste(lr, (lx, ly), lr)
        c._refresh_draw()

    # Name + handle
    name_x = av_x + av_r * 2 + 16
    fnt_name = font("Inter-Bold.ttf", 26)
    fnt_hand = font("Inter-Regular.ttf", 22)
    c.draw.text((name_x, av_y + 2), "Navinta AI", fill=WHITE, font=fnt_name)
    # Verified badge ✓
    vx = name_x + text_size("Navinta AI", fnt_name)[0] + 8
    c.draw.text((vx, av_y + 2), "✓", fill=IOS_BLUE, font=fnt_name)
    c.draw.text((name_x, av_y + 32), handle + "  ·  now", fill=MUTED, font=fnt_hand)

    # Tweet text
    fnt_tw = font("Inter-Regular.ttf", 34)
    ty = card_m + 110
    lines = wrap(tweet_text, fnt_tw, TW_W - card_m * 2 - 80)
    lh = line_height(fnt_tw, 8)
    for i, ln in enumerate(lines):
        bb = fnt_tw.getbbox(ln)
        c.draw.text((card_m + 36 - bb[0], ty + i * lh - bb[1]), ln, fill=WHITE, font=fnt_tw)

    # Divider
    div_y = TW_H - card_m - 56
    c.h_line(div_y, x0=card_m + 20, x1=TW_W - card_m - 20)

    # Stats row
    stats_y = div_y + 14
    fnt_st = font("Inter-Regular.ttf", 20)
    icons = [("💬", replies), ("🔁", retweets), ("♥", likes), ("👁", views)]
    stats_x = card_m + 36
    for icon, val in icons:
        c.draw.text((stats_x, stats_y), f"{icon} {val}", fill=MUTED, font=fnt_st)
        stats_x += 180

    c.save(filename)


# ─── iMessage Template ────────────────────────────────────────────────────────

def imessage_post(messages, contact="Navinta AI", filename=None):
    """
    messages: list of (sender, text) tuples.
    sender = 'them' | 'navinta'
    """
    c = NavintaCanvas(IM_W, IM_H)

    # iPhone background
    c.draw.rectangle([0, 0, IM_W, IM_H], fill=(0, 0, 0))

    # Status bar
    fnt_status = font("Inter-SemiBold.ttf", 22)
    c.draw.text((60, 32), "9:41", fill=WHITE, font=fnt_status)
    c.draw.text((IM_W - 130, 32), "●●●  ■", fill=WHITE, font=fnt_status)

    # Header bar
    header_y = 80
    header_h = 84
    c.draw.rectangle([0, header_y, IM_W, header_y + header_h], fill=(28, 28, 30))

    # Back arrow
    fnt_back = font("Inter-Regular.ttf", 26)
    c.draw.text((36, header_y + 24), "‹ Back", fill=IOS_BLUE, font=fnt_back)

    # Avatar circle in header
    av_cx = IM_W // 2 - 14
    av_r = 22
    ov = Image.new("RGBA", (IM_W, IM_H), (0, 0, 0, 0))
    d_ov = ImageDraw.Draw(ov)
    d_ov.ellipse([av_cx - av_r, header_y + 12, av_cx + av_r, header_y + 12 + av_r * 2],
                 fill=INDIGO + (255,))
    c.img = Image.alpha_composite(c.img, ov)
    c._refresh_draw()

    if c.logo:
        ls = 28
        ratio = ls / c.logo.height
        lw_s = int(c.logo.width * ratio)
        lr2 = c.logo.resize((lw_s, ls), Image.LANCZOS)
        c.img.paste(lr2, (av_cx - lw_s // 2, header_y + 12 + av_r - ls // 2), lr2)
        c._refresh_draw()

    # Contact name
    fnt_contact = font("Inter-SemiBold.ttf", 26)
    fnt_info = font("Inter-Regular.ttf", 18)
    cw, _ = text_size(contact, fnt_contact)
    cx_txt = IM_W // 2 - cw // 2 + 16
    c.draw.text((cx_txt, header_y + 16), contact, fill=WHITE, font=fnt_contact)
    c.draw.text((IM_W // 2 - 14, header_y + 50), "iMessage", fill=MUTED, font=fnt_info)

    # Message area
    msg_y = header_y + header_h + 24
    pad_h = 70
    bub_r = 20
    fnt_msg = font("Inter-Regular.ttf", 28)
    max_bub_w = int(IM_W * 0.72)

    for sender, text in messages:
        is_navinta = sender == "navinta"
        bub_color = IOS_BLUE if is_navinta else IOS_GRAY
        text_color = WHITE

        lines = wrap(text, fnt_msg, max_bub_w - 48)
        lh = line_height(fnt_msg, 6)
        bub_h = len(lines) * lh + 28

        if is_navinta:
            bub_x = IM_W - max_bub_w - 20
        else:
            bub_x = 20

        bub_w = max_bub_w

        bub_ov = Image.new("RGBA", (IM_W, IM_H), (0, 0, 0, 0))
        bub_d = ImageDraw.Draw(bub_ov)
        bub_d.rounded_rectangle(
            [bub_x, msg_y, bub_x + bub_w, msg_y + bub_h],
            radius=bub_r,
            fill=bub_color + (255,)
        )
        c.img = Image.alpha_composite(c.img, bub_ov)
        c._refresh_draw()

        for i, ln in enumerate(lines):
            bb = fnt_msg.getbbox(ln)
            c.draw.text((bub_x + 20 - bb[0], msg_y + 14 + i * lh - bb[1]),
                        ln, fill=text_color, font=fnt_msg)

        msg_y += bub_h + 14

    # Home bar
    bar_w = 140
    bar_x = (IM_W - bar_w) // 2
    c.rounded_rect([bar_x, IM_H - 32, bar_x + bar_w, IM_H - 20],
                   radius=6, fill=(255, 255, 255, 80))

    # Navinta watermark bottom
    fnt_wm = font("Inter-Regular.ttf", 18)
    wm = "navintaai.com"
    ww, _ = text_size(wm, fnt_wm)
    wb = fnt_wm.getbbox(wm)
    c.draw.text(((IM_W - ww) // 2 - wb[0], IM_H - 60 - wb[1]), wm, fill=DIM, font=fnt_wm)

    c.save(filename)


# ─── Generate All Posts ───────────────────────────────────────────────────────

def generate_all():
    os.makedirs(f"{OUTPUT_DIR}/instagram", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/twitter", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/imessage", exist_ok=True)

    ig = f"{OUTPUT_DIR}/instagram"
    tw = f"{OUTPUT_DIR}/twitter"
    im = f"{OUTPUT_DIR}/imessage"

    print("\n=== Instagram Posts ===")

    # ── Post 01 ── Hero: Problem/Solution
    ig_hero(
        headline="4 hours editing. Still didn't go viral.",
        subtext="Your production workflow is the problem. Navinta AI automates every step — script, filming, editing, captions, music — in minutes.",
        badge="✨ The smarter way to create",
        cta="Free plan available  ·  navintaai.com",
        filename=f"{ig}/post-01-problem-solution.png"
    )

    # ── Post 02 ── Carousel: Old Way vs New Way (time breakdown)
    slides_02 = [
        ("Why making one video takes all day 🧵", "Swipe to see where your time actually goes →", True),
        ("1. Writing the script from scratch", "Average: 60–90 minutes staring at a blank doc", False),
        ("2. Filming 10+ takes", "Because you forgot your lines. Again.", False),
        ("3. Manual editing for hours", "Cutting silences, syncing captions, picking music — by hand", False),
        ("With Navinta AI: all of this is automated", "Script → Film → Edit → Export. Done in 20 minutes.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_02):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_02),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-02-carousel-slide-{i+1}.png"
        )

    # ── Post 03 ── Hero: Consistency
    ig_hero(
        headline="Your competitors post every day. Do you?",
        subtext="Consistency is the #1 growth factor on social. Navinta AI lets you batch 5 videos in the time it used to take to make 1.",
        badge="📅 Content consistency",
        cta="Start free — no credit card needed",
        filename=f"{ig}/post-03-consistency.png"
    )

    # ── Post 04 ── Hero: Better Way
    ig_hero(
        headline="There has to be a better way.",
        subtext="Script → Film → Edit → Export. In minutes. No timeline headaches. No 4-hour sessions. Just great content.",
        badge="🔥 New workflow",
        filename=f"{ig}/post-04-better-way.png"
    )

    # ── Post 05 ── Carousel: Old Way vs Navinta Way
    slides_05 = [
        ("Old Way vs. the Navinta AI Way", "Swipe to see the difference →", True),
        ("Script writing", "OLD: 60min staring at a blank page\nNEW: AI generates a viral script in seconds", False),
        ("Filming", "OLD: 12 takes, forgotten lines, wasted hours\nNEW: Director Mode guides you beat by beat", False),
        ("Editing", "OLD: Manual cuts, captions, color — 3+ hours\nNEW: Smart Auto-Edit does it all automatically", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_05):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_05),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-05-carousel-slide-{i+1}.png"
        )

    # ── Post 06 ── Feature: AI Script Generator
    ig_list(
        headline="Never face a blank page again.",
        badge="🤖 AI Script Generator",
        items=[
            ("Enter your topic", "Any niche, any platform"),
            ("AI writes a viral script", "Hook, beats, CTA — fully structured"),
            ("Shot-by-shot breakdown", "Know exactly what to film"),
            ("Platform-optimized", "TikTok, Reels, Shorts formats"),
        ],
        cta="Try free → navintaai.com",
        filename=f"{ig}/post-06-ai-script.png"
    )

    # ── Post 07 ── Feature: Director Mode
    ig_hero(
        headline="A Hollywood director in your pocket.",
        subtext="Director Mode connects your phone via QR code and feeds you your script beat by beat. No forgotten lines. No wasted takes.",
        badge="🎬 Director Mode",
        cta="Film with confidence — free plan available",
        filename=f"{ig}/post-07-director-mode.png"
    )

    # ── Post 08 ── Feature: Smart Auto-Edit
    ig_list(
        headline="AI edits your video while you sleep.",
        badge="✂️ Smart Auto-Edit",
        items=[
            ("Cuts dead air automatically", "Frame-accurate silence trimming"),
            ("Syncs word-by-word captions", "500+ styles, zero manual timing"),
            ("Layers trending music", "Background audio at perfect volume"),
            ("Adds smart zoom effects", "At emotional peaks in your transcript"),
            ("Applies cinematic color grade", "Professional look, zero effort"),
        ],
        cta="Free plan → navintaai.com",
        filename=f"{ig}/post-08-auto-edit.png"
    )

    # ── Post 09 ── Feature: AI B-Roll
    ig_hero(
        headline="B-roll. On demand. AI-generated.",
        subtext="Highlight any word in your transcript. Navinta AI uses Luma AI's Dream Machine to generate a custom video clip and drop it straight into your edit.",
        badge="🎥 Luma AI B-Roll",
        cta="Pro plan unlocks full B-roll generation",
        filename=f"{ig}/post-09-broll.png"
    )

    # ── Post 10 ── Carousel: Caption Styles
    slides_10 = [
        ("500+ caption styles. Find yours. 🔤", "Every style auto-synced from your transcript →", True),
        ("Word-by-word TikTok highlight", "Bouncy, bold, high-retention — built for Reels", False),
        ("Minimal subtitle style", "Clean and readable. Works on any background.", False),
        ("Cinematic plate captions", "Lower-third style for premium content", False),
        ("Glow outline style", "Neon-accented for energy and impact", False),
        ("All styles. Zero manual timing.", "Just upload. Navinta syncs everything automatically.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_10):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_10),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-10-carousel-slide-{i+1}.png"
        )

    # ── Post 11 ── Before/After: Same Clip
    ig_split(
        headline="Same clip. 10 minutes apart.",
        left_title="Raw Footage",
        left_items=["No captions", "Flat color grade", "Awkward silences", "No music"],
        right_title="After Navinta AI",
        right_items=["Word-by-word captions", "Cinematic color grade", "Silences auto-cut", "Trending music added"],
        filename=f"{ig}/post-11-before-after-clip.png"
    )

    # ── Post 12 ── Before/After: Time
    ig_split(
        headline="6.5 hours → 25 minutes.",
        left_title="Before Navinta AI",
        left_items=["Script: 60 min", "Filming setup: 30 min", "Editing: 180 min", "Captions: 45 min", "Export: 30 min"],
        right_title="With Navinta AI",
        right_items=["Script: 10 seconds", "Filming: 20 min", "Editing: Automatic", "Captions: Automatic", "Export: 5 min"],
        filename=f"{ig}/post-12-time-saved.png"
    )

    # ── Post 13 ── Before/After: Quality Reel cover
    ig_hero(
        headline="Watch what happens when AI edits your video.",
        subtext="Same raw footage. Before: flat, unedited phone video. After: captions synced, music layered, zoom effects, color graded. Automatically.",
        badge="👀 Before vs. After",
        filename=f"{ig}/post-13-quality-reel.png"
    )

    # ── Post 14 ── Carousel: Creator Confidence
    slides_14 = [
        ("Before vs. After: Creator Confidence", "Swipe to see the transformation →", True),
        ("Before Navinta AI", "You film 12 takes. Forget your lines on take 11. Give up. Post nothing.", False),
        ("After Navinta AI", "Director Mode feeds you your script beat by beat. 1–2 takes. Done. Posted.", False),
        ("Confidence isn't born — it's built.", "With Navinta AI, the right words are always right in front of you.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_14):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_14),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-14-carousel-slide-{i+1}.png"
        )

    # ── Post 15 ── Before/After: Agency
    ig_split(
        headline="Your agency on Navinta AI Studio.",
        left_title="Before",
        left_items=["5 editors, constant revisions", "Inconsistent brand quality", "40 videos takes the whole month", "Client revisions never end"],
        right_title="With Studio Plan",
        right_items=["Shared brand kit, AI-assisted", "Consistent output, every time", "40 videos in half the time", "Clients love it, team is happy"],
        filename=f"{ig}/post-15-agency.png"
    )

    # ── Post 16 ── Quote
    ig_quote(
        quote_text="I used to spend my entire weekend editing one video. Now I batch 8 in a Saturday morning and still have time for brunch.",
        attribution="— Sarah K., Lifestyle Creator",
        filename=f"{ig}/post-16-testimonial.png"
    )

    # ── Post 17 ── Carousel: Stats
    slides_17 = [
        ("The numbers don't lie. 📊", "Swipe for the stats that will change how you create →", True),
        ("Creators using AI tools grow 3× faster than those who don't.", "HubSpot Content Trends Report, 2024", False),
        ("Short-form video is the #1 marketing channel for ROI in 2025.", "Across TikTok, Reels, and YouTube Shorts", False),
        ("Navinta AI users report saving 5+ hours per video.", "Are you still editing manually?", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_17):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_17),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-17-carousel-slide-{i+1}.png"
        )

    # ── Post 18 ── FOMO
    ig_hero(
        headline="Your competitors are already using AI.",
        subtext="Every day you edit manually is a day they post more, grow faster, and get further ahead. The free plan is right there. No excuses.",
        badge="⚡ The gap is widening",
        cta="Start today → navintaai.com",
        filename=f"{ig}/post-18-fomo.png"
    )

    # ── Post 19 ── Carousel: 5 Viral Tips
    slides_19 = [
        ("5 things every viral video has in common 🧵", "Save this. Swipe to learn →", True),
        ("1. A hook in the first 2 seconds.", "Say something surprising, bold, or counterintuitive — immediately.", False),
        ("2. Pattern interrupts.", "Change the visual or audio every 3–5 seconds to hold attention.", False),
        ("3. Word-by-word captions.", "85% of social video is watched on mute. Captions are non-negotiable.", False),
        ("4. A single clear CTA.", "One action: follow, comment, or click. Not three. One.", False),
        ("5. Consistency over perfection.", "One great video won't blow you up. A hundred will.", False),
        ("Navinta AI builds all 5 into every video — automatically.", "Link in bio to try free →", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_19):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_19),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-19-carousel-slide-{i+1}.png"
        )

    # ── Post 20 ── Carousel: Script Writing
    slides_20 = [
        ("How to write a viral video script (5 steps) ✍️", "Or skip all of this with Navinta AI →", True),
        ("Step 1: The Hook", "Your first sentence must create a question. Never start with 'Today I'm going to...'", False),
        ("Step 2: The Promise", "Tell viewers what they'll get by the end. Make it worth staying for.", False),
        ("Step 3: Keep it tight.", "Cut anything that doesn't directly support your main point. Be ruthless.", False),
        ("Step 4: Pattern interrupt.", "Change something every 3–5 sec — tone, pacing, visual. Keeps eyes locked.", False),
        ("Step 5: One clear CTA.", "Follow, comment, or click link. Pick one. Say it confidently.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_20):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_20),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-20-carousel-slide-{i+1}.png"
        )

    # ── Post 21 ── Stat: Captions
    ig_stat(
        stat_text="85%",
        label="of social video is watched on mute.",
        sub="Navinta AI auto-generates perfectly timed captions in 500+ styles — zero manual work.",
        filename=f"{ig}/post-21-caption-stat.png"
    )

    # ── Post 22 ── Free Plan
    ig_list(
        headline="Free forever. No credit card.",
        badge="✅ Free Plan",
        items=[
            ("AI content planning", "Generate viral scripts instantly"),
            ("Director Mode", "Guided filming with teleprompter"),
            ("Smart Auto-Edit preview", "See your AI-edited video"),
            ("500+ caption styles", "TikTok, minimal, cinematic and more"),
            ("1 video export per month", "Watermarked, no time limit"),
        ],
        cta="Sign up free → navintaai.com",
        filename=f"{ig}/post-22-free-plan.png"
    )

    # ── Post 23 ── Carousel: Value comparison
    slides_23 = [
        ("Replaces $500/month in tools for $19.99", "Swipe to see the breakdown →", True),
        ("The tools Navinta AI replaces:",
         "Teleprompter app: $9.99\nCaption tool: $19.99\nAI script writer: $29.99\nVideo editor sub: $54.99\nMusic library: $14.99\nTotal: $129.95/month", False),
        ("Navinta AI Starter: $19.99/month", "Everything. One tool. One price.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_23):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_23),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-23-carousel-slide-{i+1}.png"
        )

    # ── Post 24 ── Pro Plan
    ig_list(
        headline="Unlimited. 4K. AI B-roll.",
        badge="🚀 Pro Plan — $49.99/mo",
        items=[
            ("Unlimited video production", "No monthly caps, ever"),
            ("AI-generated B-roll", "Powered by Luma AI Dream Machine"),
            ("4K export quality", "Professional resolution output"),
            ("Advanced caption styles", "All 500+ styles unlocked"),
            ("Priority rendering", "No queue, instant processing"),
            ("Advanced analytics", "Track what's performing"),
        ],
        cta="Upgrade to Pro → navintaai.com",
        filename=f"{ig}/post-24-pro-plan.png"
    )

    # ── Post 25 ── Meme: Procrastination
    ig_meme(
        headline="Me at 9am: gonna film an amazing video today",
        subtext="Me at 9pm: ok maybe tomorrow 😭\n\nNavinta AI is for the creator who keeps saying tomorrow.",
        badge="😅 Relatable",
        filename=f"{ig}/post-25-meme-procrastination.png"
    )

    # ── Post 26 ── Meme: Choice
    ig_meme(
        headline="Spend 4 hours editing manually.",
        subtext="...or use Navinta AI and be done in 20 minutes. 🤔\n\nFor creators who choose sleep over suffering.",
        badge="😂 Creator life",
        filename=f"{ig}/post-26-meme-choice.png"
    )

    # ── Post 27 ── Meme: Content Calendar
    ig_meme(
        headline="My content calendar:\nPlan: ✅✅✅✅✅✅✅\nReality: ✅🫠🫠🫠🫠🫠🫠",
        subtext="Consistency is hard without the right tools. Navinta AI makes batching 7 videos possible in a single afternoon.",
        filename=f"{ig}/post-27-meme-calendar.png"
    )

    # ── Post 28 ── BTS: How it works
    ig_list(
        headline="Idea to export in 5 steps.",
        badge="🎬 How it works",
        items=[
            ("Enter your topic", "AI writes a viral script in seconds"),
            ("Scan QR code", "Director Mode on your phone"),
            ("Upload footage", "Smart Auto-Edit processes everything"),
            ("Preview your video", "Captions, music, effects — all applied"),
            ("Export and post", "Platform-ready in minutes"),
        ],
        cta="Try it free → navintaai.com",
        filename=f"{ig}/post-28-how-it-works.png"
    )

    # ── Post 29 ── Carousel: Under the hood
    slides_29 = [
        ("What's actually happening when Navinta AI edits your video? 🧠", "Swipe to see the tech →", True),
        ("Step 1: Whisper AI transcription", "Every word of your footage is transcribed with frame-accurate timestamps.", False),
        ("Step 2: GPT-4o analysis", "The AI finds silences, emotional peaks, key moments, and structure.", False),
        ("Step 3: DecisionEngine builds your EDL", "Frame-accurate Edit Decision List — every cut, zoom, and transition planned.", False),
        ("Step 4: Remotion renders in the cloud", "Your final video with captions, music, and effects — no local rendering needed.", False),
    ]
    for i, (headline, body, is_cover) in enumerate(slides_29):
        ig_carousel_slide(
            slide_num=i + 1, total_slides=len(slides_29),
            headline=headline, body=body, is_cover=is_cover,
            filename=f"{ig}/post-29-carousel-slide-{i+1}.png"
        )

    # ── Post 30 ── Launch CTA
    ig_hero(
        headline="Stop editing. Start creating.",
        subtext="Navinta AI is the all-in-one AI video studio for creators who are done wasting time. Free plan. No credit card. No excuses.",
        badge="🔗 navintaai.com",
        cta="Sign up free today  ·  Your audience is waiting.",
        filename=f"{ig}/post-30-launch-cta.png"
    )

    print("\n=== Twitter/X Posts ===")

    twitter_post(
        tweet_text="You're spending 6 hours making a 30-second video.\n\nThere's a better way.\n\nNavinta AI: Script → Film → Edit → Export.\nIn 20 minutes. 🧵",
        likes="3.1K", retweets="924", replies="408", views="62K",
        filename=f"{tw}/tweet-01-hook.png"
    )
    twitter_post(
        tweet_text="Writers block is cancelled.\n\nNavinta AI's script generator turns any topic into a fully structured, viral-ready script in seconds.\n\nHook. Beats. CTA. Platform-optimized.\n\nFree to try 👇",
        likes="1.8K", retweets="612", replies="234", views="41K",
        filename=f"{tw}/tweet-02-ai-script.png"
    )
    twitter_post(
        tweet_text="Director Mode changed how I film forever.\n\nScan a QR code → your phone links to your laptop → teleprompter cards show you your script beat by beat.\n\nNo forgotten lines. No 12 takes. Just confident filming.",
        likes="2.4K", retweets="756", replies="319", views="54K",
        filename=f"{tw}/tweet-03-director-mode.png"
    )
    twitter_post(
        tweet_text="Navinta AI's auto-edit cuts your editing time by 90%.\n\nWhisper AI transcribes every word → GPT-4o finds the gold → the DecisionEngine builds your edit → Remotion renders it in the cloud.\n\nYou just upload your footage.",
        likes="2.9K", retweets="843", replies="367", views="58K",
        filename=f"{tw}/tweet-04-auto-edit.png"
    )
    twitter_post(
        tweet_text="You can now generate custom B-roll for your videos using AI.\n\nHighlight any word in your transcript → Navinta AI generates a video clip via Luma AI → it drops straight into your edit.\n\nNo stock footage needed.",
        likes="4.2K", retweets="1.3K", replies="512", views="89K",
        filename=f"{tw}/tweet-05-broll.png"
    )
    twitter_post(
        tweet_text="85% of social video is watched on mute.\n\nIf you don't have captions, you're invisible to 85% of your potential audience.\n\nNavinta AI auto-generates word-level captions in 500+ styles from your transcript. Zero manual timing.",
        likes="5.6K", retweets="2.1K", replies="743", views="124K",
        filename=f"{tw}/tweet-06-captions.png"
    )
    twitter_post(
        tweet_text="Teleprompter app: $9.99/mo\nCaption tool: $19.99/mo\nAI writer: $29.99/mo\nVideo editor: $54.99/mo\nMusic library: $14.99/mo\n\nTotal: $129.95/mo\n\nNavinta AI Starter: $19.99/mo\n\nAll of it. One tool.",
        likes="6.8K", retweets="3.4K", replies="891", views="187K",
        filename=f"{tw}/tweet-07-pricing.png"
    )
    twitter_post(
        tweet_text="\"I used to spend my entire weekend editing one video.\n\nNow I batch 8 in a Saturday morning and still have time for brunch.\"\n\n— Sarah K., Lifestyle Creator\n\nThis is what Navinta AI does to your workflow.",
        likes="3.7K", retweets="1.1K", replies="428", views="76K",
        filename=f"{tw}/tweet-08-testimonial.png"
    )
    twitter_post(
        tweet_text="The viral hook formula:\n\n1. Make a surprising claim\n2. Create a knowledge gap\n3. Promise a payoff\n\nExample:\n\"The reason your videos aren't getting views has nothing to do with your camera.\"\n\nNavinta AI generates hooks like this automatically.",
        likes="8.2K", retweets="4.6K", replies="1.2K", views="234K",
        filename=f"{tw}/tweet-09-tip.png"
    )
    twitter_post(
        tweet_text="Navinta AI is free forever.\n\nNo credit card. No trial period. No catch.\n\nAI scripts. Director Mode. Smart auto-edit. 500+ caption styles. Export your first video today.\n\nnavintaai.com 🔗",
        likes="4.9K", retweets="2.8K", replies="634", views="108K",
        filename=f"{tw}/tweet-10-cta.png"
    )

    print("\n=== iMessage Posts ===")

    imessage_post(
        messages=[
            ("them", "omg what even is navintaai?? my friend keeps talking about it"),
            ("navinta", "It's an AI video studio that handles everything 🎬 Script, filming, editing, captions, music — all automated"),
            ("them", "wait seriously?? like it does the editing FOR you?"),
            ("navinta", "Yep. You upload your footage and it auto-cuts the silences, adds captions, layers music, and exports a polished video. Free plan at navintaai.com 🔗"),
            ("them", "ok I'm downloading this rn"),
        ],
        filename=f"{im}/imsg-01-what-is-navinta.png"
    )

    imessage_post(
        messages=[
            ("them", "how long does editing actually take with navintaai?"),
            ("navinta", "Realistically? I made a full Reel in about 20 minutes today 🤯"),
            ("them", "20 MINUTES??"),
            ("navinta", "AI wrote the script in 10 seconds, filmed 2 takes with Director Mode, uploaded and it auto-edited itself. Done."),
            ("them", "it used to take me like 4 hours 💀"),
            ("navinta", "Yeah that's why I switched lol. navintaai.com — free plan to start"),
        ],
        filename=f"{im}/imsg-02-time-saved.png"
    )

    imessage_post(
        messages=[
            ("them", "is navintaai expensive though"),
            ("navinta", "Free plan is actually free forever. No credit card."),
            ("them", "ok but what's the paid plan"),
            ("navinta", "Starter is $19.99/month. Replaces like 5 different tools — teleprompter, caption app, AI writer, video editor, music library"),
            ("them", "that's actually way cheaper than buying all those separately"),
            ("navinta", "Exactly. I was spending over $100/month before 😅"),
        ],
        filename=f"{im}/imsg-03-pricing.png"
    )

    imessage_post(
        messages=[
            ("them", "does it do captions automatically or do you have to do them manually"),
            ("navinta", "Fully automatic! It transcribes your video and syncs captions word by word 🔤"),
            ("them", "what style? like the tiktok bouncy ones?"),
            ("navinta", "There are 500+ styles actually. TikTok word-by-word, minimal subtitle, cinematic plate, glow outline... you just pick one"),
            ("them", "omg I've been doing mine by hand this whole time"),
            ("navinta", "Same 😭 Never again. navintaai.com"),
        ],
        filename=f"{im}/imsg-04-captions.png"
    )

    imessage_post(
        messages=[
            ("them", "what's Director Mode?? I keep seeing it mentioned"),
            ("navinta", "It's a teleprompter system basically 🎬 You scan a QR code to link your phone, then your script shows up as cards on your screen"),
            ("them", "so it like tells you what to say?"),
            ("navinta", "Beat by beat! It shows you the timing too, like '0:00–0:03: Look at camera and say [hook]' so you always know exactly what to do"),
            ("them", "I literally forget my lines every single take lmao this would fix everything"),
            ("navinta", "It changed everything for me. Free at navintaai.com 🔗"),
        ],
        filename=f"{im}/imsg-05-director-mode.png"
    )

    imessage_post(
        messages=[
            ("them", "can it actually make broll with AI?? like generate it??"),
            ("navinta", "Yeah it uses Luma AI's Dream Machine 🎥 You highlight a word in your transcript, Navinta describes the scene, and it generates a custom clip"),
            ("them", "wait so it makes a completely new video clip??"),
            ("navinta", "Yep. Sunsets, cityscapes, products, abstract visuals — whatever you describe. Drops straight into your edit"),
            ("them", "that's genuinely insane"),
            ("navinta", "Pro plan feature. navintaai.com to check it out"),
        ],
        filename=f"{im}/imsg-06-broll.png"
    )

    imessage_post(
        messages=[
            ("them", "is there actually a free plan or is it one of those fake free trials"),
            ("navinta", "Genuinely free forever. No credit card, no time limit."),
            ("them", "ok what do you actually get for free"),
            ("navinta", "AI content planning, Director Mode filming guide, auto-edit preview, 500+ caption styles, 1 export per month"),
            ("them", "that's actually a lot for free"),
            ("navinta", "I know right. navintaai.com — sign up takes 30 seconds"),
        ],
        filename=f"{im}/imsg-07-free-plan.png"
    )

    imessage_post(
        messages=[
            ("them", "my friend used navintaai and her reel got 800k views??"),
            ("navinta", "Wait seriously?? 👀"),
            ("them", "she said the AI script gave her the hook and everything, she just filmed it"),
            ("navinta", "Honestly that tracks. The scripts are genuinely structured for virality — hook, pattern interrupts, CTA, everything"),
            ("them", "ok I'm literally signing up right now"),
            ("navinta", "navintaai.com — free plan, no card needed 🔗"),
        ],
        filename=f"{im}/imsg-08-viral.png"
    )

    # ── README ──
    readme = f"""{OUTPUT_DIR}/README.txt"""
    with open(f"{OUTPUT_DIR}/README.txt", "w") as f:
        f.write("""Navinta AI — Social Media Post Pack
=====================================

INSTAGRAM/ (64 files)
  post-01 through post-30
  (carousels: 02, 05, 10, 14, 17, 19, 20, 23, 29 have multiple slides)

TWITTER/ (10 files)
  tweet-01 through tweet-10
  Dimensions: 1200×675px

IMESSAGE/ (8 files)
  imsg-01 through imsg-08
  Dimensions: 1080×1350px (Instagram-ready)

USAGE:
- Instagram: Upload images directly. Use captions from instagram-posts.md
- Twitter/X: Upload as image cards with tweet text from the card itself
- iMessage: Upload as regular Instagram static posts for organic engagement

All images are 1080px wide and match the Navinta AI brand design system.
Generated by scripts/generate_posts.py
""")

    print(f"\n✅ All posts generated → {OUTPUT_DIR}")


if __name__ == "__main__":
    generate_all()
