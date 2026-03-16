/**
 * Navinta AI — Social Media Post Generator v2
 * Uses node-canvas (Cairo backend) for high-quality rendering.
 * Produces Instagram, Twitter/X, and iMessage-style PNG posts.
 */

const { createCanvas, registerFont, loadImage } = require('canvas')
const fs   = require('fs')
const path = require('path')

// ─── Font registration ────────────────────────────────────────────────────────
const FD = path.join(__dirname, 'fonts')
registerFont(path.join(FD, 'Inter-Bold.ttf'),          { family: 'Inter', weight: 'bold' })
registerFont(path.join(FD, 'Inter-SemiBold.ttf'),      { family: 'Inter', weight: '600' })
registerFont(path.join(FD, 'Inter-Regular.ttf'),       { family: 'Inter', weight: 'normal' })
registerFont(path.join(FD, 'PlayfairDisplay-Bold.ttf'),   { family: 'Playfair Display', weight: 'bold' })
registerFont(path.join(FD, 'PlayfairDisplay-Italic.ttf'), { family: 'Playfair Display', style: 'italic' })

// ─── Paths ────────────────────────────────────────────────────────────────────
const LOGO_PATH = '/home/user/navintaai/client/public/navinta-logo.png'
const OUT  = '/home/user/navintaai/instagram-posts'

// ─── Sizes ────────────────────────────────────────────────────────────────────
const IG_W = 1080, IG_H = 1350
const TW_W = 1200, TW_H = 675
const IM_W = 1080, IM_H = 1350

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  bg:       '#000000',
  bgCard:   '#11141A',
  bgCard2:  '#0D0D0F',
  blue:     '#3B82F6',
  indigo:   '#6366F1',
  purple:   '#A855F7',
  white:    '#FFFFFF',
  muted:    'rgba(255,255,255,0.58)',
  dim:      'rgba(255,255,255,0.32)',
  border:   'rgba(255,255,255,0.08)',
  emerald:  '#34D399',
  red:      '#F87171',
  amber:    '#FBBF24',
  gradBlue:   '#60A5FA',
  gradIndigo: '#818CF8',
  gradPurple: '#A78BFA',
  iosBlue:  '#0A84FF',
  iosGray:  '#2C2C2E',
}

// ─── Canvas helper class ──────────────────────────────────────────────────────
class NC {
  constructor (w, h) {
    this.w = w
    this.h = h
    this.canvas = createCanvas(w, h)
    this.ctx    = this.canvas.getContext('2d')
    this.ctx.textBaseline = 'top'
    this._fill(C.bg)
  }

  _fill (color) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.w, this.h)
  }

  /* ── Background ──────────────────────────────────────────────────────────── */

  dotGrid (spacing = 40, alpha = 0.055) {
    const { ctx, w, h } = this
    ctx.save()
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    for (let x = 0; x <= w; x += spacing)
      for (let y = 0; y <= h; y += spacing) {
        ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
      }
    ctx.restore()
  }

  glowOrb (cx, cy, r, rgb, a = 0.18) {
    const { ctx } = this
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0,   `rgba(${rgb},${a})`)
    g.addColorStop(0.5, `rgba(${rgb},${a * 0.4})`)
    g.addColorStop(1,   `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  stdBg () {
    this.dotGrid()
    this.glowOrb(-80,       -100,        580, '99,102,241',  0.20)
    this.glowOrb(this.w+80, -60,         480, '168,85,247',  0.16)
    this.glowOrb(-60,       this.h+100,  520, '59,130,246',  0.13)
  }

  /* ── Shapes ──────────────────────────────────────────────────────────────── */

  rrect (x, y, w, h, r, fill, stroke, sw = 1) {
    const { ctx } = this
    ctx.save()
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
    if (fill)   { ctx.fillStyle = fill;   ctx.fill()   }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke() }
    ctx.restore()
  }

  hLine (y, x0, x1, alpha = 0.12) {
    const { ctx, w } = this
    ctx.save()
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x0 ?? 68, y); ctx.lineTo(x1 ?? w - 68, y); ctx.stroke()
    ctx.restore()
  }

  vAccent (x, y0, y1, color = C.indigo, width = 4) {
    this.rrect(x, y0, width, y1 - y0, 2, color)
  }

  /* ── Text ────────────────────────────────────────────────────────────────── */

  _setFont (size, weight, family = 'Inter') {
    this.ctx.font = `${weight} ${size}px "${family}"`
    this.ctx.textBaseline = 'top'
  }

  _wrap (text, maxW) {
    const words = String(text).split(' ')
    const lines = []; let cur = ''
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w
      if (this.ctx.measureText(t).width <= maxW) { cur = t }
      else { if (cur) lines.push(cur); cur = w }
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ['']
  }

  /* Draw centered gradient text, returns new Y after the block */
  gradText (text, size, cx, y, maxW, colors) {
    const clrs = colors || [C.gradBlue, C.gradIndigo, C.gradPurple]
    this._setFont(size, 'bold')
    const lh   = size * 1.22
    const lines = this._wrap(text, maxW)
    lines.forEach((ln, i) => {
      const tw  = this.ctx.measureText(ln).width
      const lx  = cx - tw / 2
      const ly  = y + i * lh
      const g   = this.ctx.createLinearGradient(lx, 0, lx + tw, 0)
      clrs.forEach((c, ci) => g.addColorStop(ci / (clrs.length - 1), c))
      this.ctx.fillStyle = g
      this.ctx.fillText(ln, lx, ly)
    })
    return y + lines.length * lh
  }

  /* Draw centered plain-color text, returns new Y */
  txt (text, size, weight, cx, y, maxW, color, lhMult = 1.28, align = 'center') {
    const { ctx } = this
    this._setFont(size, weight)
    const lh    = size * lhMult
    const lines = this._wrap(String(text), maxW)
    lines.forEach((ln, i) => {
      const tw  = ctx.measureText(ln).width
      const lx  = align === 'center' ? cx - tw / 2
                : align === 'left'   ? cx
                :                      cx - tw
      ctx.fillStyle = color || C.white
      ctx.fillText(ln, lx, y + i * lh)
    })
    return y + lines.length * lh
  }

  /* Italic display text (Playfair Display) */
  displayItalic (text, size, cx, y, maxW, color) {
    const { ctx } = this
    ctx.font = `italic ${size}px "Playfair Display"`
    ctx.textBaseline = 'top'
    const lh    = size * 1.38
    const lines = this._wrap(text, maxW)
    lines.forEach((ln, i) => {
      const tw = ctx.measureText(ln).width
      ctx.fillStyle = color || C.white
      ctx.fillText(ln, cx - tw / 2, y + i * lh)
    })
    return y + lines.length * lh
  }

  /* Pill badge */
  pill (text, size, cx, y, bg, border, textColor) {
    const { ctx } = this
    this._setFont(size, '600')
    const tw  = ctx.measureText(text).width
    const ph  = size + 20, pw = tw + 44
    const px  = cx - pw / 2
    this.rrect(px, y, pw, ph, ph / 2, bg || 'rgba(99,102,241,0.18)', border || 'rgba(99,102,241,0.5)', 1)
    ctx.fillStyle = textColor || '#A5B4FC'
    ctx.fillText(text, px + 22, y + (ph - size) / 2)
    return y + ph
  }

  /* Logo bar at bottom */
  async logoBar (logo, y) {
    if (y === undefined) y = this.h - 78
    const { ctx, w } = this
    const lh  = 34
    if (logo) {
      const ratio = lh / logo.height
      const lw    = Math.round(logo.width * ratio)
      ctx.drawImage(logo, (w / 2) - lw / 2 - 56, y, lw, lh)
    }
    this._setFont(24, '600')
    ctx.fillStyle = C.dim
    const label = 'navinta.org'
    const tw    = ctx.measureText(label).width
    ctx.fillText(label, w / 2 - tw / 2 + (logo ? 18 : 0), y + (lh - 24) / 2)
  }

  save (fp) {
    fs.writeFileSync(fp, this.canvas.toBuffer('image/png'))
    console.log(`  ✓ ${path.basename(fp)}`)
  }
}

// ─── Instagram Templates ──────────────────────────────────────────────────────

async function igHero ({ headline, subtext, badge, cta, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx  = IG_W / 2, pad = 96
  let y = 168

  if (badge) {
    y = c.pill(badge, 22, cx, y) + 46
  }

  y = c.gradText(headline, 82, cx, y, IG_W - pad * 2) + 44

  if (subtext) {
    y = c.txt(subtext, 33, 'normal', cx, y, IG_W - pad * 2 - 20, C.muted) + 28
  }
  if (cta) {
    c.txt(cta, 25, '600', cx, y, IG_W - pad * 2, C.dim)
  }

  await c.logoBar(logo)
  c.save(file)
}

async function igList ({ headline, badge, items, cta, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2, lx = 88
  let y = 136

  if (badge) y = c.pill(badge, 22, cx, y) + 40

  y = c.gradText(headline, 66, cx, y, IG_W - 160) + 34
  c.hLine(y); y += 36

  for (const item of items) {
    const label  = typeof item === 'string' ? item : item[0]
    const detail = typeof item === 'string' ? null  : item[1]
    // Dot
    c.ctx.fillStyle = C.indigo
    c.ctx.beginPath(); c.ctx.arc(lx + 7, y + 16, 5, 0, Math.PI * 2); c.ctx.fill()
    c._setFont(30, '600')
    c.ctx.fillStyle = C.white
    c.ctx.fillText(label, lx + 24, y)
    y += 38
    if (detail) {
      y = c.txt(detail, 25, 'normal', lx + 24, y, IG_W - lx - 60, C.muted, 1.3, 'left') + 4
    }
    y += 16
  }

  if (cta) {
    y += 4; c.hLine(y); y += 26
    c.txt(cta, 25, '600', cx, y, IG_W - 160, C.dim)
  }

  await c.logoBar(logo)
  c.save(file)
}

async function igSplit ({ headline, leftTitle, leftItems, rightTitle, rightItems, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2
  let y = 100

  y = c.gradText(headline, 58, cx, y, IG_W - 120) + 36

  const cw   = IG_W / 2 - 60
  const lcx  = IG_W / 4 + 4
  const rcx  = IG_W * 3 / 4 - 4
  const ct   = y
  const cb   = IG_H - 150

  // Cards
  c.rrect(32, ct, IG_W / 2 - 48, cb - ct, 22,
    'rgba(17,20,26,0.92)', 'rgba(248,113,113,0.25)', 1)
  c.rrect(IG_W / 2 + 16, ct, IG_W / 2 - 48, cb - ct, 22,
    'rgba(17,20,26,0.92)', 'rgba(52,211,153,0.30)', 1)

  y += 26
  c.txt(leftTitle,  26, '600', lcx, y, cw - 20, 'rgba(248,113,113,0.85)')
  c.txt(rightTitle, 26, '600', rcx, y, cw - 20, 'rgba(52,211,153,0.85)')
  y += 46

  const lh = 36
  const pairs = Math.max(leftItems.length, rightItems.length)
  for (let i = 0; i < pairs; i++) {
    const li = leftItems[i]  || ''
    const ri = rightItems[i] || ''
    const iy = y + i * lh
    c.txt('✗  ' + li, 24, 'normal', lcx, iy, cw - 16, 'rgba(255,255,255,0.52)')
    c.txt('✓  ' + ri, 24, 'normal', rcx, iy, cw - 16, 'rgba(255,255,255,0.88)')
  }

  await c.logoBar(logo)
  c.save(file)
}

async function igQuote ({ quote, attr, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2, pad = 108

  // Decorative quote mark
  c.ctx.font = 'bold 160px "Playfair Display"'
  c.ctx.fillStyle = 'rgba(99,102,241,0.45)'
  c.ctx.textBaseline = 'top'
  c.ctx.fillText('\u201c', pad - 16, 120)

  let y = 280
  y = c.displayItalic(quote, 50, cx, y, IG_W - pad * 2, C.white) + 50

  // Accent bar
  const bw = 60
  c.rrect(cx - bw / 2, y, bw, 3, 2, C.indigo)
  y += 36
  c.txt(attr, 28, '600', cx, y, IG_W - pad * 2, C.muted)

  await c.logoBar(logo)
  c.save(file)
}

async function igStat ({ stat, label, sub, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2

  c._setFont(130, 'bold')
  const sw = c.ctx.measureText(stat).width
  const sy = IG_H / 2 - 120
  const g  = c.ctx.createLinearGradient(cx - sw / 2, 0, cx + sw / 2, 0)
  g.addColorStop(0, C.gradBlue); g.addColorStop(0.5, C.gradIndigo); g.addColorStop(1, C.gradPurple)
  c.ctx.fillStyle = g
  c.ctx.fillText(stat, cx - sw / 2, sy)

  let y = sy + 148
  y = c.txt(label, 38, '600', cx, y, IG_W - 160, C.white) + 24
  if (sub) c.txt(sub, 28, 'normal', cx, y, IG_W - 160, C.muted)

  await c.logoBar(logo)
  c.save(file)
}

async function igCarousel ({ slideNum, total, headline, body, isCover, file }, logo) {
  const c = new NC(IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2, pad = 90

  // Progress dots — top right
  const diam = 10, gap = 8
  const totalDotW = total * (diam + gap) - gap
  let dx = IG_W - pad - totalDotW, dy = 66
  for (let i = 0; i < total; i++) {
    const filled = i < slideNum
    c.rrect(dx + i * (diam + gap), dy, diam, diam, diam / 2,
      filled ? C.indigo : 'rgba(255,255,255,0.18)')
  }

  // Slide tag — top left
  c.pill(`${slideNum}/${total}`, 21, pad + 40, 52, 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.5)', '#A5B4FC')

  let y = 186
  if (isCover) {
    y = c.gradText(headline, 74, cx, y, IG_W - 140) + 40
    if (body) c.txt(body, 31, 'normal', cx, y, IG_W - 160, C.muted)
  } else {
    c._setFont(52, '600')
    y = c.txt(headline, 52, '600', cx, y, IG_W - 140, C.white, 1.28) + 36
    if (body) c.txt(body, 29, 'normal', cx, y, IG_W - 160, C.muted)
  }

  if (slideNum < total) {
    c.txt('Swipe →', 23, 'normal', cx, IG_H - 136, IG_W - 200, C.dim)
  }

  await c.logoBar(logo)
  c.save(file)
}

async function igMeme ({ headline, sub, badge, file }, logo) {
  const c = new NC(IG_W, IG_H)
  // Slightly lighter bg for memes
  c.ctx.fillStyle = '#0A0A0C'; c.ctx.fillRect(0, 0, IG_W, IG_H)
  c.stdBg()
  const cx = IG_W / 2
  let y = 190

  if (badge) y = c.pill(badge, 22, cx, y) + 50
  y = c.gradText(headline, 74, cx, y, IG_W - 120) + 46
  if (sub) c.txt(sub, 31, 'normal', cx, y, IG_W - 160, C.muted)

  await c.logoBar(logo)
  c.save(file)
}

// ─── Twitter/X Template ───────────────────────────────────────────────────────
async function twitterPost ({ tweet, likes, retweets, replies, views, file }, logo) {
  const c = new NC(TW_W, TW_H)
  c.stdBg()

  const m = 44
  // Main card
  c.rrect(m, m, TW_W - m * 2, TW_H - m * 2, 20,
    'rgba(17,20,26,0.95)', 'rgba(255,255,255,0.10)', 1)

  // Left gradient accent strip
  const { ctx } = c
  const sg = ctx.createLinearGradient(0, m, 0, TW_H - m)
  sg.addColorStop(0, C.indigo); sg.addColorStop(1, C.purple)
  ctx.fillStyle = sg
  ctx.beginPath(); ctx.roundRect(m, m, 4, TW_H - m * 2, [2, 0, 0, 2]); ctx.fill()

  // Avatar circle
  const avX = m + 36, avY = m + 34, avR = 28
  const ag = ctx.createRadialGradient(avX, avY, 0, avX, avY, avR)
  ag.addColorStop(0, '#818CF8'); ag.addColorStop(1, '#6366F1')
  ctx.fillStyle = ag
  ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI * 2); ctx.fill()

  if (logo) {
    const ls = 34, ratio = ls / logo.height, lw = Math.round(logo.width * ratio)
    ctx.drawImage(logo, avX - lw / 2, avY - ls / 2, lw, ls)
  }

  // Name row
  const nx = avX + avR + 14, ny = m + 14
  c._setFont(26, 'bold')
  ctx.fillStyle = C.white
  ctx.fillText('Navinta AI', nx, ny)
  const nw = ctx.measureText('Navinta AI').width
  // Verified badge
  c._setFont(22, '600')
  ctx.fillStyle = C.iosBlue
  ctx.fillText('✓', nx + nw + 8, ny + 2)
  // Handle
  c._setFont(21, 'normal')
  ctx.fillStyle = C.muted
  ctx.fillText('@NavintaAI · now', nx, ny + 34)

  // Tweet text
  let ty = m + 102
  const tweetLines = c._wrap(tweet, TW_W - m * 2 - 80)
  const tlh = 44
  c._setFont(34, 'normal')
  tweetLines.forEach((ln, i) => {
    ctx.fillStyle = C.white
    ctx.fillText(ln, m + 36, ty + i * tlh)
  })

  // Divider + stats
  const divY = TW_H - m - 54
  c.hLine(divY, m + 20, TW_W - m - 20, 0.10)

  c._setFont(20, 'normal')
  const stats = [`💬 ${replies}`, `🔁 ${retweets}`, `♥ ${likes}`, `👁 ${views}`]
  stats.forEach((s, i) => {
    ctx.fillStyle = C.muted
    ctx.fillText(s, m + 36 + i * 172, divY + 14)
  })

  c.save(file)
}

// ─── iMessage Template ────────────────────────────────────────────────────────
async function imessagePost ({ messages, contact, file }, logo) {
  const c = new NC(IM_W, IM_H)
  c.ctx.fillStyle = '#000000'; c.ctx.fillRect(0, 0, IM_W, IM_H)

  const { ctx } = c

  /* Status bar */
  c._setFont(22, '600')
  ctx.fillStyle = C.white
  ctx.fillText('9:41', 56, 18)
  ctx.fillText('●●●  ■', IM_W - 120, 18)

  /* Header bar */
  const hY = 62, hH = 86
  ctx.fillStyle = '#1C1C1E'
  ctx.fillRect(0, hY, IM_W, hH)
  // Bottom border
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(0, hY + hH); ctx.lineTo(IM_W, hY + hH); ctx.stroke()

  // Back arrow
  c._setFont(24, 'normal')
  ctx.fillStyle = C.iosBlue
  ctx.fillText('‹ Back', 32, hY + 26)

  // Avatar
  const avCX = IM_W / 2, avCY = hY + hH / 2, avR = 22
  const avG = ctx.createRadialGradient(avCX, avCY, 0, avCX, avCY, avR)
  avG.addColorStop(0, '#818CF8'); avG.addColorStop(1, '#6366F1')
  ctx.fillStyle = avG
  ctx.beginPath(); ctx.arc(avCX, avCY, avR, 0, Math.PI * 2); ctx.fill()
  if (logo) {
    const ls = 28, ratio = ls / logo.height, lw = Math.round(logo.width * ratio)
    ctx.drawImage(logo, avCX - lw / 2, avCY - ls / 2, lw, ls)
  }

  // Online dot
  ctx.fillStyle = '#30D158'
  ctx.beginPath(); ctx.arc(avCX + avR - 4, avCY + avR - 4, 7, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#1C1C1E'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(avCX + avR - 4, avCY + avR - 4, 7, 0, Math.PI * 2); ctx.stroke()

  // Contact name
  c._setFont(24, '600')
  const cnW = ctx.measureText(contact).width
  ctx.fillStyle = C.white
  ctx.fillText(contact, avCX - cnW / 2 + avR, hY + 20)
  c._setFont(17, 'normal')
  ctx.fillStyle = C.muted
  const imW = ctx.measureText('iMessage').width
  ctx.fillText('iMessage', avCX - imW / 2 + avR, hY + 50)

  /* Messages */
  let msgY = hY + hH + 22
  const maxBub = Math.floor(IM_W * 0.73)
  const bubPad = 18, fontSize = 27, lineMult = 1.32

  for (const [sender, text] of messages) {
    const isYou = sender === 'you'
    const color = isYou ? C.iosBlue : '#2C2C2E'
    c._setFont(fontSize, 'normal')
    const lines = c._wrap(text, maxBub - bubPad * 2)
    const lh    = fontSize * lineMult
    const bubH  = lines.length * lh + bubPad * 1.6
    const bubW  = Math.min(maxBub, lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0) + bubPad * 2 + 8)
    const bubX  = isYou ? IM_W - bubW - 18 : 18

    // Bubble
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(bubX, msgY, bubW, bubH, 18)
    ctx.fill()

    // Text in bubble
    ctx.fillStyle = C.white
    lines.forEach((ln, i) => {
      ctx.fillText(ln, bubX + bubPad, msgY + bubPad * 0.8 + i * lh)
    })
    msgY += bubH + 10
  }

  /* Home indicator */
  const barW = 130
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.roundRect((IM_W - barW) / 2, IM_H - 30, barW, 5, 3)
  ctx.fill()

  /* Watermark */
  c._setFont(18, 'normal')
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  const wm = 'navinta.org'
  ctx.fillText(wm, (IM_W - ctx.measureText(wm).width) / 2, IM_H - 56)

  c.save(file)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main () {
  ;[`${OUT}/instagram`, `${OUT}/twitter`, `${OUT}/imessage`].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  })

  let logo = null
  try { logo = await loadImage(LOGO_PATH) } catch (e) { console.warn('Logo not found, skipping') }

  const ig = `${OUT}/instagram`
  const tw = `${OUT}/twitter`
  const im = `${OUT}/imessage`

  console.log('\n=== Instagram Posts ===')

  await igHero({ headline: '4 hours editing.\nStill didn\'t go viral.', subtext: 'Your production workflow is the problem — not your ideas. Navinta AI automates every step: script, filming, editing, captions, music. Done in minutes.', badge: '✨ The smarter way to create', cta: 'Free plan  ·  navinta.org', file: `${ig}/post-01-problem-solution.png` }, logo)

  const slides02 = [
    { headline: 'Why making one video takes all day 🧵', body: 'Swipe to see where your time actually goes →', isCover: true },
    { headline: 'Script writing from scratch', body: 'Average: 60–90 minutes staring at a blank document', isCover: false },
    { headline: 'Filming 10+ takes', body: 'Because you forgot your lines. Again.', isCover: false },
    { headline: 'Manual editing for hours', body: 'Cutting silences, syncing captions, picking music — by hand', isCover: false },
    { headline: 'With Navinta AI, all of this is automated.', body: 'Script → Film → Edit → Export. Done in 20 minutes.', isCover: false },
  ]
  for (let i = 0; i < slides02.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides02.length, ...slides02[i], file: `${ig}/post-02-carousel-slide-${i+1}.png` }, logo)

  await igHero({ headline: 'Your competitors post every day.\nDo you?', subtext: 'Consistency is the #1 growth factor on social. Navinta AI lets you batch 5 videos in the time it used to take to make 1.', badge: '📅 Content consistency', cta: 'Start free — no credit card needed', file: `${ig}/post-03-consistency.png` }, logo)

  await igHero({ headline: 'There has to be a better way.', subtext: 'Script → Film → Edit → Export. In minutes. No timeline headaches. No 4-hour sessions. Just great content, faster than you thought possible.', badge: '🔥 New workflow', cta: 'navinta.org', file: `${ig}/post-04-better-way.png` }, logo)

  const slides05 = [
    { headline: 'Old Way vs. the Navinta AI Way', body: 'Swipe to see the difference →', isCover: true },
    { headline: 'Script writing', body: 'OLD: 60min staring at a blank page\nNEW: AI generates a viral script in seconds', isCover: false },
    { headline: 'Filming', body: 'OLD: 12 takes, forgotten lines, wasted hours\nNEW: Director Mode guides you beat by beat', isCover: false },
    { headline: 'Editing', body: 'OLD: Manual cuts, captions, color — 3+ hours\nNEW: Smart Auto-Edit does it all automatically', isCover: false },
  ]
  for (let i = 0; i < slides05.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides05.length, ...slides05[i], file: `${ig}/post-05-carousel-slide-${i+1}.png` }, logo)

  await igList({ headline: 'Never face a blank page again.', badge: '🤖 AI Script Generator', items: [['Enter your topic', 'Any niche, any platform'], ['AI writes a viral script', 'Hook, beats, CTA — fully structured'], ['Shot-by-shot breakdown', 'Know exactly what to film'], ['Platform-optimized', 'TikTok, Reels, Shorts formats']], cta: 'Try free → navinta.org', file: `${ig}/post-06-ai-script.png` }, logo)

  await igHero({ headline: 'A Hollywood director in your pocket.', subtext: 'Director Mode connects your phone via QR code and feeds you your script beat by beat. No forgotten lines. No wasted takes. Confident, guided filming — every time.', badge: '🎬 Director Mode', cta: 'Film with confidence · navinta.org', file: `${ig}/post-07-director-mode.png` }, logo)

  await igList({ headline: 'AI edits your video while you sleep.', badge: '✂️ Smart Auto-Edit', items: [['Cuts dead air automatically', 'Frame-accurate silence trimming'], ['Syncs word-by-word captions', '500+ styles, zero manual timing'], ['Layers trending music', 'Background audio at perfect volume'], ['Adds smart zoom effects', 'At emotional peaks in your transcript'], ['Applies cinematic color grade', 'Professional look, zero effort']], cta: 'navinta.org', file: `${ig}/post-08-auto-edit.png` }, logo)

  await igHero({ headline: 'B-roll. On demand.\nAI-generated.', subtext: 'Highlight any word in your transcript. Navinta AI uses Luma AI to generate a custom video clip and drop it straight into your edit. No stock footage subscription needed.', badge: '🎥 Luma AI B-Roll', cta: 'Pro plan · navinta.org', file: `${ig}/post-09-broll.png` }, logo)

  const slides10 = [
    { headline: '500+ caption styles. Find yours. 🔤', body: 'Every style auto-synced from your transcript →', isCover: true },
    { headline: 'Word-by-word TikTok highlight', body: 'Bouncy, bold, high-retention — built for Reels', isCover: false },
    { headline: 'Minimal subtitle style', body: 'Clean and readable. Works on any background.', isCover: false },
    { headline: 'Cinematic plate captions', body: 'Lower-third style for premium content', isCover: false },
    { headline: 'Glow outline style', body: 'Neon-accented for energy and impact', isCover: false },
    { headline: 'All styles. Zero manual timing.', body: 'Upload your footage. Navinta syncs everything automatically.', isCover: false },
  ]
  for (let i = 0; i < slides10.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides10.length, ...slides10[i], file: `${ig}/post-10-carousel-slide-${i+1}.png` }, logo)

  await igSplit({ headline: 'Same clip. 10 minutes apart.', leftTitle: 'Raw footage', leftItems: ['No captions', 'Flat color grade', 'Awkward silences', 'No music'], rightTitle: 'After Navinta AI', rightItems: ['Word-by-word captions', 'Cinematic color grade', 'Silences auto-cut', 'Trending music added'], file: `${ig}/post-11-before-after.png` }, logo)

  await igSplit({ headline: '6.5 hours → 25 minutes.', leftTitle: 'Before Navinta AI', leftItems: ['Script: 60 min', 'Filming setup: 30 min', 'Editing: 180 min', 'Captions: 45 min', 'Export: 30 min'], rightTitle: 'With Navinta AI', rightItems: ['Script: 10 seconds', 'Filming: 20 min', 'Editing: Automatic', 'Captions: Automatic', 'Export: 5 min'], file: `${ig}/post-12-time-saved.png` }, logo)

  await igHero({ headline: 'Watch what happens when AI edits your video.', subtext: 'Same raw footage. Before: flat phone video. After: captions synced, music layered, smart zooms, color graded. All automatically. Zero editing experience required.', badge: '👀 Before vs. After', cta: 'navinta.org', file: `${ig}/post-13-quality.png` }, logo)

  const slides14 = [
    { headline: 'Before vs. After: Creator Confidence', body: 'Swipe to see the transformation →', isCover: true },
    { headline: 'Before Navinta AI', body: 'You film 12 takes. Forget your lines on take 11. Give up. Post nothing.', isCover: false },
    { headline: 'After Navinta AI', body: 'Director Mode feeds you your script beat by beat. 1–2 takes. Done. Posted.', isCover: false },
    { headline: 'Confidence isn\'t born — it\'s built.', body: 'With Navinta AI, the right words are always right in front of you.', isCover: false },
  ]
  for (let i = 0; i < slides14.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides14.length, ...slides14[i], file: `${ig}/post-14-carousel-slide-${i+1}.png` }, logo)

  await igSplit({ headline: 'Your agency on Navinta AI Studio.', leftTitle: 'Before', leftItems: ['5 editors, constant revisions', 'Inconsistent quality', '40 videos takes the month', 'Client revisions never end'], rightTitle: 'With Studio Plan', rightItems: ['Shared brand kit, AI-assisted', 'Consistent output, every time', '40 videos in half the time', 'Clients love it, team happy'], file: `${ig}/post-15-agency.png` }, logo)

  await igQuote({ quote: 'I used to spend my entire weekend editing one video. Now I batch 8 in a Saturday morning and still have time for brunch.', attr: '— Sarah K., Lifestyle Creator', file: `${ig}/post-16-testimonial.png` }, logo)

  const slides17 = [
    { headline: 'The numbers don\'t lie. 📊', body: 'Swipe for the stats that will change how you create →', isCover: true },
    { headline: 'Creators using AI tools grow 3× faster than those who don\'t.', body: 'HubSpot Content Trends, 2024', isCover: false },
    { headline: 'Short-form video is the #1 marketing channel for ROI in 2025.', body: 'Across TikTok, Reels, and YouTube Shorts', isCover: false },
    { headline: 'Navinta AI users report saving 5+ hours per video.', body: 'Are you still editing manually?', isCover: false },
  ]
  for (let i = 0; i < slides17.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides17.length, ...slides17[i], file: `${ig}/post-17-carousel-slide-${i+1}.png` }, logo)

  await igHero({ headline: 'Your competitors are already using AI.', subtext: 'Every day you edit manually is a day they post more, grow faster, and get further ahead. Free plan available. No credit card. No excuses.', badge: '⚡ The gap is widening', cta: 'Start today → navinta.org', file: `${ig}/post-18-fomo.png` }, logo)

  const slides19 = [
    { headline: '5 things every viral video has in common 🧵', body: 'Save this. Swipe to learn →', isCover: true },
    { headline: '1. A hook in the first 2 seconds.', body: 'Say something surprising, bold, or counterintuitive — immediately.', isCover: false },
    { headline: '2. Pattern interrupts.', body: 'Change the visual or audio every 3–5 seconds to hold attention.', isCover: false },
    { headline: '3. Word-by-word captions.', body: '85% of social video is watched on mute. Captions are non-negotiable.', isCover: false },
    { headline: '4. One clear CTA.', body: 'Follow, comment, or click link. Pick one. Say it confidently.', isCover: false },
    { headline: '5. Consistency over perfection.', body: 'One great video won\'t blow you up. A hundred will.', isCover: false },
    { headline: 'Navinta AI builds all 5 into every video — automatically.', body: 'navinta.org to try free →', isCover: false },
  ]
  for (let i = 0; i < slides19.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides19.length, ...slides19[i], file: `${ig}/post-19-carousel-slide-${i+1}.png` }, logo)

  const slides20 = [
    { headline: 'How to write a viral video script (5 steps) ✍️', body: 'Or skip all of this with Navinta AI →', isCover: true },
    { headline: 'Step 1: The Hook', body: 'Your first sentence must create a question in the viewer\'s mind.', isCover: false },
    { headline: 'Step 2: The Promise', body: 'Tell viewers what they\'ll learn by the end. Make it worth staying for.', isCover: false },
    { headline: 'Step 3: Keep it tight.', body: 'Cut anything that doesn\'t directly support your main point. Be ruthless.', isCover: false },
    { headline: 'Step 4: Pattern interrupt.', body: 'Change something every 3–5 sec. Tone, pacing, visual. Keeps eyes locked.', isCover: false },
    { headline: 'Step 5: One clear CTA.', body: '"Follow", "Comment", or "Click link". One action. Say it confidently.', isCover: false },
  ]
  for (let i = 0; i < slides20.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides20.length, ...slides20[i], file: `${ig}/post-20-carousel-slide-${i+1}.png` }, logo)

  await igStat({ stat: '85%', label: 'of social video is watched on mute.', sub: 'Navinta AI auto-generates perfectly timed captions in 500+ styles — zero manual work.', file: `${ig}/post-21-caption-stat.png` }, logo)

  await igList({ headline: 'Free forever. No credit card.', badge: '✅ Free Plan', items: [['AI content planning', 'Generate viral scripts instantly'], ['Director Mode', 'Guided filming with teleprompter'], ['Smart Auto-Edit preview', 'See your AI-edited video'], ['500+ caption styles', 'TikTok, minimal, cinematic and more'], ['1 video export per month', 'Watermarked, no time limit']], cta: 'Sign up free → navinta.org', file: `${ig}/post-22-free-plan.png` }, logo)

  const slides23 = [
    { headline: 'Replaces $500/month in tools for $19.99', body: 'Swipe to see the full breakdown →', isCover: true },
    { headline: 'What Navinta AI replaces:', body: 'Teleprompter: $9.99  Caption tool: $19.99  AI writer: $29.99  Video editor: $54.99  Music library: $14.99\n\nTotal: $129.95 / month', isCover: false },
    { headline: 'Navinta AI Starter: $19.99/month', body: 'Everything. One tool. One price. navinta.org', isCover: false },
  ]
  for (let i = 0; i < slides23.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides23.length, ...slides23[i], file: `${ig}/post-23-carousel-slide-${i+1}.png` }, logo)

  await igList({ headline: 'Unlimited. 4K. AI B-roll.', badge: '🚀 Pro Plan — $49.99/mo', items: [['Unlimited video production', 'No monthly caps, ever'], ['AI-generated B-roll', 'Powered by Luma AI Dream Machine'], ['4K export quality', 'Professional resolution output'], ['Advanced caption styles', 'All 500+ styles unlocked'], ['Priority rendering', 'No queue, instant processing'], ['Advanced analytics', 'Track what\'s performing']], cta: 'Upgrade to Pro → navinta.org', file: `${ig}/post-24-pro-plan.png` }, logo)

  await igMeme({ headline: 'Me at 9am: gonna film an amazing video today\n\nMe at 9pm: ok maybe tomorrow 😭', sub: 'Navinta AI is for the creator who keeps saying tomorrow.\nnavinta.org — free plan.', badge: '😅 Relatable', file: `${ig}/post-25-meme-procrastination.png` }, logo)

  await igMeme({ headline: 'Spend 4 hours editing manually\n\nor use Navinta AI\nand be done in 20 minutes 🤔', sub: 'For creators who choose sleep over suffering.\nnavinta.org', badge: '😂 Creator life', file: `${ig}/post-26-meme-choice.png` }, logo)

  await igMeme({ headline: 'My content calendar:\nPlan: ✅✅✅✅✅✅✅\nReality: ✅🫠🫠🫠🫠🫠🫠', sub: 'Consistency is hard without the right tools.\nNavinta AI makes batching 7 videos possible in one afternoon.', file: `${ig}/post-27-meme-calendar.png` }, logo)

  await igList({ headline: 'Idea to export in 5 steps.', badge: '🎬 How it works', items: [['Enter your topic', 'AI writes a viral script in seconds'], ['Scan QR code', 'Director Mode on your phone'], ['Upload footage', 'Smart Auto-Edit processes everything'], ['Preview your video', 'Captions, music, effects — all applied'], ['Export and post', 'Platform-ready in minutes']], cta: 'navinta.org', file: `${ig}/post-28-how-it-works.png` }, logo)

  const slides29 = [
    { headline: 'What\'s actually happening when Navinta AI edits your video? 🧠', body: 'Swipe to see the tech →', isCover: true },
    { headline: 'Step 1: Whisper AI transcription', body: 'Every word of your footage is transcribed with frame-accurate timestamps.', isCover: false },
    { headline: 'Step 2: GPT-4o analysis', body: 'The AI finds silences, emotional peaks, key moments, and structure.', isCover: false },
    { headline: 'Step 3: DecisionEngine builds your EDL', body: 'Frame-accurate Edit Decision List — every cut, zoom, and transition planned.', isCover: false },
    { headline: 'Step 4: Remotion renders in the cloud', body: 'Your final video with captions, music, and effects. No local rendering.', isCover: false },
  ]
  for (let i = 0; i < slides29.length; i++)
    await igCarousel({ slideNum: i + 1, total: slides29.length, ...slides29[i], file: `${ig}/post-29-carousel-slide-${i+1}.png` }, logo)

  await igHero({ headline: 'Stop editing.\nStart creating.', subtext: 'Navinta AI is the all-in-one AI video studio for creators who are done wasting time. Free plan. No credit card. No excuses.', badge: '🔗 navinta.org', cta: 'Sign up free today  ·  Your audience is waiting.', file: `${ig}/post-30-launch-cta.png` }, logo)

  console.log('\n=== Twitter/X Posts ===')

  await twitterPost({ tweet: 'You\'re spending 6 hours making a 30-second video.\n\nThere\'s a better way.\n\nNavinta AI: Script → Film → Edit → Export. In 20 minutes. 🧵', likes: '3.1K', retweets: '924', replies: '408', views: '62K', file: `${tw}/tweet-01-hook.png` }, logo)

  await twitterPost({ tweet: 'Writers block is cancelled.\n\nNavinta AI\'s script generator turns any topic into a viral-ready script in seconds.\n\nHook. Beats. CTA. Platform-optimized.\n\nFree to try at navinta.org 👇', likes: '1.8K', retweets: '612', replies: '234', views: '41K', file: `${tw}/tweet-02-ai-script.png` }, logo)

  await twitterPost({ tweet: 'Director Mode changed how I film forever.\n\nScan a QR code → phone links to laptop → teleprompter cards show your script beat by beat.\n\nNo forgotten lines. No 12 takes. Just confident filming.', likes: '2.4K', retweets: '756', replies: '319', views: '54K', file: `${tw}/tweet-03-director-mode.png` }, logo)

  await twitterPost({ tweet: 'Navinta AI\'s auto-edit cuts your editing time by 90%.\n\nWhisper AI transcribes every word → GPT-4o finds the gold → DecisionEngine builds your edit → Remotion renders in the cloud.\n\nYou just upload your footage.', likes: '2.9K', retweets: '843', replies: '367', views: '58K', file: `${tw}/tweet-04-auto-edit.png` }, logo)

  await twitterPost({ tweet: 'You can now generate custom B-roll for your videos using AI.\n\nHighlight a word in your transcript → Navinta AI generates a video clip → it drops into your edit.\n\nNo stock footage needed. navinta.org', likes: '4.2K', retweets: '1.3K', replies: '512', views: '89K', file: `${tw}/tweet-05-broll.png` }, logo)

  await twitterPost({ tweet: '85% of social video is watched on mute.\n\nIf you don\'t have captions, you\'re invisible to 85% of your potential audience.\n\nNavinta AI auto-generates word-level captions in 500+ styles. Zero manual timing.', likes: '5.6K', retweets: '2.1K', replies: '743', views: '124K', file: `${tw}/tweet-06-captions.png` }, logo)

  await twitterPost({ tweet: 'Teleprompter app: $9.99\nCaption tool: $19.99\nAI writer: $29.99\nVideo editor: $54.99\nMusic library: $14.99\n\nTotal: $129.95/mo\n\nNavinta AI Starter: $19.99/mo\n\nAll of it. One tool. navinta.org', likes: '6.8K', retweets: '3.4K', replies: '891', views: '187K', file: `${tw}/tweet-07-pricing.png` }, logo)

  await twitterPost({ tweet: '"I used to spend my entire weekend editing one video.\n\nNow I batch 8 in a Saturday morning and still have time for brunch."\n\n— Sarah K., Lifestyle Creator\n\nThis is what Navinta AI does to your workflow.', likes: '3.7K', retweets: '1.1K', replies: '428', views: '76K', file: `${tw}/tweet-08-testimonial.png` }, logo)

  await twitterPost({ tweet: 'The viral hook formula:\n\n1. Make a surprising claim\n2. Create a knowledge gap\n3. Promise a payoff\n\nExample: "The reason your videos aren\'t getting views has nothing to do with your camera."\n\nNavinta AI generates hooks like this automatically.', likes: '8.2K', retweets: '4.6K', replies: '1.2K', views: '234K', file: `${tw}/tweet-09-tip.png` }, logo)

  await twitterPost({ tweet: 'Navinta AI is free forever.\n\nNo credit card. No trial period. No catch.\n\nAI scripts. Director Mode. Smart auto-edit. 500+ caption styles. Export your first video today.\n\nnavinta.org 🔗', likes: '4.9K', retweets: '2.8K', replies: '634', views: '108K', file: `${tw}/tweet-10-cta.png` }, logo)

  console.log('\n=== iMessage Posts ===')

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'omg I\'ve been spending literally 4 hours on one reel 😭'],
    ['you', 'wait have you tried navinta.org??'],
    ['sarah', 'what\'s that'],
    ['you', 'AI video studio — writes the script, guides your filming, auto-edits everything. captions and music included'],
    ['sarah', 'wait it does the editing FOR you??'],
    ['you', 'yeah I exported a full reel in 20 mins today lol. free plan too'],
  ], file: `${im}/imsg-01-what-is-navinta.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'how long does editing actually take with it?'],
    ['you', 'realistically? made a full Reel in about 20 minutes today 🤯'],
    ['sarah', '20 MINUTES?? how'],
    ['you', 'AI wrote the script in 10 seconds, filmed 2 takes with Director Mode, uploaded and it auto-edited itself. done.'],
    ['sarah', 'it used to take me like 4 hours 💀'],
    ['you', 'lol same. navinta.org — free plan to start'],
  ], file: `${im}/imsg-02-time-saved.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'is navinta expensive tho'],
    ['you', 'free plan is actually free forever. no credit card.'],
    ['sarah', 'ok but what\'s the paid plan'],
    ['you', 'starter is $19.99/month. replaces like 5 different tools — teleprompter, caption app, AI writer, video editor, music library'],
    ['sarah', 'that\'s way cheaper than buying all those separately lol'],
    ['you', 'exactly. I was spending $130+ before 😅'],
  ], file: `${im}/imsg-03-pricing.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'does it do captions automatically or do you still have to do them manually'],
    ['you', 'fully automatic! it transcribes your video and syncs captions word by word 🔤'],
    ['sarah', 'what style? like the tiktok bouncy ones?'],
    ['you', 'there are 500+ styles actually. tiktok word-by-word, minimal subtitle, cinematic plate, glow outline...'],
    ['sarah', 'omg I\'ve been doing mine by hand this whole time 😭'],
    ['you', 'same lol. never again. navinta.org'],
  ], file: `${im}/imsg-04-captions.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'what\'s Director Mode?? keep seeing it mentioned'],
    ['you', 'teleprompter system basically 🎬 you scan a QR code to link your phone, your script shows up as cards on screen'],
    ['sarah', 'so it like tells you what to say??'],
    ['you', 'beat by beat! shows timing too — "0:00–0:03: Look at camera and say [hook]" — you always know what to do'],
    ['sarah', 'I literally forget my lines every single take lmao'],
    ['you', 'it changed everything for me. free at navinta.org 🔗'],
  ], file: `${im}/imsg-05-director-mode.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'can it actually make broll with AI?? like generate it??'],
    ['you', 'yeah it uses Luma AI 🎥 highlight a word in your transcript, Navinta describes the scene, generates a custom clip'],
    ['sarah', 'wait so it makes a completely new video clip from scratch??'],
    ['you', 'yep. sunsets, cityscapes, products, abstract visuals — whatever you describe. drops straight into your edit'],
    ['sarah', 'that\'s genuinely insane'],
    ['you', 'pro plan feature. navinta.org to check it out'],
  ], file: `${im}/imsg-06-broll.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'is there actually a free plan or is it one of those fake "free" trials'],
    ['you', 'genuinely free forever. no credit card, no time limit.'],
    ['sarah', 'ok what do you actually get for free'],
    ['you', 'AI content planning, Director Mode filming guide, auto-edit preview, 500+ caption styles, 1 export/month'],
    ['sarah', 'that\'s actually a lot for free'],
    ['you', 'I know right. navinta.org — sign up takes 30 seconds'],
  ], file: `${im}/imsg-07-free-plan.png` }, logo)

  await imessagePost({ contact: 'Sarah', messages: [
    ['sarah', 'omg my reel got 800k views 😭😭😭'],
    ['you', 'WAIT SERIOUSLY??'],
    ['sarah', 'the AI script gave me the hook, I just filmed it on my phone'],
    ['you', 'that tracks honestly. the hooks it writes are built for virality — surprising, creates curiosity, delivers'],
    ['sarah', 'I can\'t believe I was manually editing for years when this existed'],
    ['you', 'lol same. navinta.org 🔗 tell everyone'],
  ], file: `${im}/imsg-08-viral.png` }, logo)

  // README
  fs.writeFileSync(`${OUT}/README.txt`, `Navinta AI — Social Media Post Pack (v2 — High Quality)
==========================================================

INSTAGRAM/ (65 files, 1080×1350px)
  post-01 through post-30
  Carousels: 02, 05, 10, 14, 17, 19, 20, 23, 29

TWITTER/ (10 files, 1200×675px)
  tweet-01 through tweet-10

IMESSAGE/ (8 files, 1080×1350px)
  imsg-01 through imsg-08
  Contact: Sarah — you recommending Navinta to her

NOTES:
- All captions/copy in instagram-posts.md
- Regenerate: node scripts/generate_posts_v2.js
- URL everywhere: navinta.org
`)

  console.log(`\n✅ All posts generated → ${OUT}`)
}

main().catch(err => { console.error(err); process.exit(1) })
