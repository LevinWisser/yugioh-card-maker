// ─── Image cache ──────────────────────────────────────────────────────────────
const imageCache = new Map();

function loadImage(src) {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { imageCache.set(src, img);  resolve(img);  };
    img.onerror = () => { imageCache.set(src, null); resolve(null); };
    img.src = src;
  });
}

// ─── Word-wrap ────────────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    lines.push(cur);
  }
  return lines;
}

// ─── Effect text with auto-shrink ────────────────────────────────────────────
// isSpellTrap: no type-line in text box → use taller box starting higher up
// ygocarder: without type: y=890.23, h=182 (scaled: 461, 94)
//            with type:    y=920.8,  h=152 (scaled: 477, 79)
function drawEffectText(ctx, text, isNormal, isSpellTrap) {
  if (!text) return;
  const { x, w, fontBase } = CARD_LAYOUT.effectBox;
  const S = CARD_W / 813;
  const y = isSpellTrap ? Math.round(890.23 * S) : CARD_LAYOUT.effectBox.y;
  const h = isSpellTrap ? Math.round(182    * S) : CARD_LAYOUT.effectBox.h;

  let fontSize = fontBase;
  let lines, lineHeight;
  for (let fs = fontBase; fs >= 8; fs -= 0.5) {
    const style = isNormal
      ? `italic ${fs}px ${F_EFFECT}`
      : `${fs}px ${F_EFFECT}`;
    ctx.font = style;
    lineHeight = fs * 1.15;
    lines = wrapText(ctx, text, w);
    if (lines.length * lineHeight <= h) { fontSize = fs; break; }
    fontSize = fs;
  }

  ctx.font = isNormal
    ? `italic ${fontSize}px ${F_EFFECT}`
    : `${fontSize}px ${F_EFFECT}`;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  lineHeight = fontSize * 1.15;
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

// ─── Helper: draw text with horizontal squish if too wide ────────────────────
function drawSquished(ctx, text, x, y, maxWidth) {
  const tw = ctx.measureText(text).width;
  if (tw > maxWidth) {
    ctx.save();
    const r = maxWidth / tw;
    ctx.transform(r, 0, 0, 1, x * (1 - r), 0);
    ctx.fillText(text, x, y);
    ctx.restore();
  } else {
    ctx.fillText(text, x, y);
  }
}

// ─── CardRenderer ─────────────────────────────────────────────────────────────
class CardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  async render(state) {
    const ctx     = this.ctx;
    const typeCfg = CARD_TYPES[state.type] || CARD_TYPES.normal;

    // Base fill in card-type colour — any transparent frame areas blend naturally
    ctx.clearRect(0, 0, CARD_W, CARD_H);
    const BASE_COLORS = {
      normal: '#C8A55A', effect: '#9C5A2A', fusion: '#7B2D8B',
      ritual: '#3A62B0', synchro: '#D8D8D8', xyz: '#2A2A2A',
      link: '#1E4878', spell: '#1A6B4A', trap: '#7B1C4D',
    };
    ctx.fillStyle = BASE_COLORS[state.type] || '#888';
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // ── 1. Artwork (drawn first so frame border sits on top) ──────────────
    if (state.artImage) {
      const { x, y, w, h } = CARD_LAYOUT.artwork;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const scale = Math.max(w / state.artImage.width, h / state.artImage.height);
      const sw = state.artImage.width  * scale;
      const sh = state.artImage.height * scale;
      ctx.drawImage(state.artImage, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
      ctx.restore();
    }

    // ── 2. Frame (on top of artwork) ──────────────────────────────────────
    const frameImg = await loadImage(`assets/frames/${typeCfg.frame}`);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);
    } else {
      this._drawFallbackFrame(ctx, state.type);
    }

    // ── 3. Name-area texture (on top of frame's opaque name area) ─────────
    const bgName = await loadImage(`assets/backgrounds/bg-name-${state.type}.png`);
    if (bgName) {
      const l = CARD_LAYOUT.bgName;
      ctx.drawImage(bgName, l.x, l.y, l.w, l.h);
    }

    // ── 4. Text-area texture (on top of frame's opaque text area) ─────────
    const bgText = await loadImage(`assets/backgrounds/bg-text-${state.type}.png`);
    if (bgText) {
      const l = CARD_LAYOUT.bgText;
      ctx.drawImage(bgText, l.x, l.y, l.w, l.h);
    }

    // ── 5. Card name ───────────────────────────────────────────────────────
    if (state.name) {
      const { x, y, maxWidth, font } = CARD_LAYOUT.name;
      ctx.font          = font;
      ctx.fillStyle     = state.type === 'xyz' ? '#fff' : '#000';
      ctx.textBaseline  = 'alphabetic';
      ctx.textAlign     = 'left';
      drawSquished(ctx, state.name, x, y, maxWidth);
    }

    // ── 6. Attribute icon ──────────────────────────────────────────────────
    const attrData = ATTRIBUTES.find(a => a.value === state.attribute);
    if (attrData) {
      const { x, y, size } = CARD_LAYOUT.attribute;
      const icon = await loadImage(`assets/icons/${attrData.icon}`);
      if (icon) ctx.drawImage(icon, x, y, size, size);
      else      this._fallbackAttr(ctx, attrData.label, x, y, size);
    }

    // ── 7. Spell/Trap subtype icon (left of attribute) ─────────────────────
    await this._drawSubtypeIcon(ctx, state);

    // ── 8. Level stars / Rank ─────────────────────────────────────────────
    if (typeCfg.hasLevel || typeCfg.hasRank) {
      await this._drawStars(ctx, state.level, typeCfg.hasRank);
    }

    // ── 9. Link rating ─────────────────────────────────────────────────────
    if (typeCfg.hasLink) {
      const { x, y, font } = CARD_LAYOUT.linkRating;
      ctx.font         = font;
      ctx.fillStyle    = '#000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign    = 'right';
      ctx.fillText(`LINK-${state.linkRating || 1}`, x, y);
      ctx.textAlign = 'left';
    }

    // ── 10. Type / ability ────────────────────────────────────────────────
    // Monsters: type line in text box  |  Spell/Trap: type label in name area
    const isSpellTrap = !typeCfg.isMonster;
    if (!isSpellTrap) {
      this._drawTypeLine(ctx, state, typeCfg);
    } else {
      await this._drawSpellTrapTypeLabel(ctx, state);
    }

    // ── 11. Effect / flavor text ───────────────────────────────────────────
    drawEffectText(ctx, state.effect, state.type === 'normal', isSpellTrap);

    // ── 12. ATK / DEF ─────────────────────────────────────────────────────
    if (typeCfg.isMonster) {
      ctx.fillStyle    = '#000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign    = 'right';

      const atkVal = state.atk !== '' ? state.atk : '?';
      ctx.font = CARD_LAYOUT.atk.font;
      ctx.fillText(`ATK/${atkVal}`, CARD_LAYOUT.atk.x, CARD_LAYOUT.atk.y);

      if (!typeCfg.hasLink) {
        const defVal = state.def !== '' ? state.def : '?';
        ctx.font = CARD_LAYOUT.def.font;
        ctx.fillText(`DEF/${defVal}`, CARD_LAYOUT.def.x, CARD_LAYOUT.def.y);
      }
      ctx.textAlign = 'left';
    }

    // ── 13. Border overlays ────────────────────────────────────────────────
    // name-border: 813×170 image → drawn at (0,0) scaled to card width × 170*S
    const nameBorderSrc = state.type === 'xyz'
      ? 'assets/frames/name-border-xyz.png'
      : 'assets/frames/name-border-normal.png';
    const nameBorder = await loadImage(nameBorderSrc);
    if (nameBorder) ctx.drawImage(nameBorder, 0, 0, CARD_W, Math.round(170 * CARD_W / 813));

    // art-border: 693×700 image → positioned at (60,170) in 813-space
    const artBorder = await loadImage('assets/frames/art-border.png');
    if (artBorder) {
      const S = CARD_W / 813;
      ctx.drawImage(artBorder, Math.round(60*S), Math.round(170*S), Math.round(693*S), Math.round(700*S));
    }

    // ── 14. Link arrows (after art-border so they appear on top) ──────────
    if (typeCfg.hasLink) {
      await this._drawLinkArrows(ctx, state.linkArrows);
    }

    // effect-border: 743×280 image → positioned at (35,860) in 813-space
    const effectBorder = await loadImage('assets/frames/effect-border.png');
    if (effectBorder) {
      const S = CARD_W / 813;
      ctx.drawImage(effectBorder, Math.round(35*S), Math.round(860*S), Math.round(743*S), Math.round(280*S));
    }

    // card-border: full 813×1185 overlay
    const cardBorder = await loadImage('assets/frames/card-border.png');
    if (cardBorder) ctx.drawImage(cardBorder, 0, 0, CARD_W, CARD_H);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────
  async _drawStars(ctx, count, isXyz) {
    const n = Math.min(Math.max(parseInt(count) || 0, 0), 12);
    if (n === 0) return;
    const { yBaseline, starSize, spacing, startX_normal, startX_xyz } = CARD_LAYOUT.levelRow;
    const src    = isXyz ? 'assets/icons/star-xyz.png' : 'assets/icons/star.png';
    const starImg = await loadImage(src);
    const step   = starSize + spacing;
    const starY  = yBaseline - starSize;   // top of star images

    for (let i = 0; i < n; i++) {
      const sx = isXyz
        ? startX_xyz    + i * step            // left-to-right
        : startX_normal - (i + 1) * step;    // right-to-left
      if (starImg) {
        ctx.drawImage(starImg, sx, starY, starSize, starSize);
      } else {
        ctx.fillStyle = isXyz ? '#888' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(sx + starSize / 2, starY + starSize / 2, starSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Spell/Trap type label in name area ─────────────────────────────────────
  // Draws "[Continuous Spell ●]" right-aligned in the name strip, with icon inline.
  async _drawSpellTrapTypeLabel(ctx, state) {
    const subtypeArr = state.type === 'spell' ? SPELL_TYPES : TRAP_TYPES;
    const entry      = subtypeArr.find(t => t.value === state.spellTrapSubtype);
    const kindLabel  = state.type === 'spell' ? 'Spell' : 'Trap';
    const hasSubtype = entry && entry.value && entry.icon;

    const { x, y, font } = CARD_LAYOUT.spellTrapTypeLabel;
    const { size } = CARD_LAYOUT.subtype;
    ctx.font         = font;
    ctx.fillStyle    = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'right';

    if (!hasSubtype) {
      // No icon: single text string
      const typeStr = entry && entry.value
        ? `[${entry.value} ${kindLabel}]`
        : `[${kindLabel} Card]`;
      ctx.fillText(typeStr, x, y);
    } else {
      // With icon: draw as  "[Counter Spell " | icon | "]"
      // so the icon sits flush between the text and the closing bracket.
      const closingStr   = ']';
      const closingWidth = ctx.measureText(closingStr).width;
      const gap          = 2;

      // 1. Closing bracket, right-aligned at x
      ctx.fillText(closingStr, x, y);

      // 2. Icon, immediately left of ]
      const iconX = x - closingWidth - gap - size;
      const iconY = y - size + 2;  // vertically align with text baseline
      const img = await loadImage(`assets/icons/${entry.icon}`);
      if (img) ctx.drawImage(img, iconX, iconY, size, size);

      // 3. Prefix text, right-aligned so it ends exactly where the icon begins
      const prefixStr = `[${entry.value} ${kindLabel} `;
      ctx.fillText(prefixStr, iconX, y);
    }

    ctx.textAlign = 'left';
  }

  // ── Subtype icon for Spell/Trap (kept for compatibility, no longer primary) ─
  async _drawSubtypeIcon(ctx, state) {
    // Icon is now drawn inline inside _drawSpellTrapTypeLabel; this is a no-op.
  }

  // ── Type line ──────────────────────────────────────────────────────────────
  _drawTypeLine(ctx, state, typeCfg) {
    const { x, y, maxWidth, font } = CARD_LAYOUT.typeLine;
    const str = this._typeString(state, typeCfg);
    ctx.font         = font;
    ctx.fillStyle    = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';
    drawSquished(ctx, str, x, y, maxWidth);
  }

  _typeString(state, typeCfg) {
    if (!typeCfg.isMonster) {
      const sub  = state.spellTrapSubtype;
      const kind = typeCfg.label.split(' ')[0];
      return sub ? `[${sub} ${kind}]` : `[${kind}]`;
    }
    const parts = [state.monsterType || 'Dragon'];
    const extras = {
      effect:  ['Effect'],
      ritual:  ['Ritual', 'Effect'],
      fusion:  ['Fusion', 'Effect'],
      synchro: ['Synchro', 'Effect'],
      xyz:     ['Xyz', 'Effect'],
      link:    ['Link', 'Effect'],
    };
    if (extras[state.type]) parts.push(...extras[state.type]);
    return `[${parts.join('/')}]`;
  }

  // ── Link arrows ────────────────────────────────────────────────────────────
  // Active arrows: base layer (light gradient) + core layer (red fill)
  // Inactive arrows: single dark base
  async _drawLinkArrows(ctx, activeStates) {
    for (let i = 0; i < 8; i++) {
      const r = LINK_ARROW_RECTS[i];
      if (activeStates[i]) {
        const base = await loadImage(`assets/icons/link-active-${r.file}.png`);
        const core = await loadImage(`assets/icons/link-active-${r.file}-core.png`);
        if (base) ctx.drawImage(base, r.x, r.y, r.w, r.h);
        if (core) ctx.drawImage(core, r.x, r.y, r.w, r.h);
      } else {
        const img = await loadImage(`assets/icons/link-inactive-${r.file}.png`);
        if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
      }
    }
  }

  // ── Fallbacks ──────────────────────────────────────────────────────────────
  _drawFallbackFrame(ctx, type) {
    const colors = {
      normal: '#D4B483', effect: '#8B4513', fusion: '#7B2D8B',
      ritual: '#2855B2', synchro: '#E0E0E0', xyz: '#222',
      link: '#1a3a5c', spell: '#1a6b4a', trap: '#7b1c4d',
    };
    const c = colors[type] || '#8B4513';
    ctx.fillStyle = c;    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.fillStyle = '#c8a44a'; ctx.fillRect(8, 8, CARD_W - 16, CARD_H - 16);
    ctx.fillStyle = c;    ctx.fillRect(18, 18, CARD_W - 36, CARD_H - 36);
    const a = CARD_LAYOUT.artwork;
    ctx.fillStyle = '#777'; ctx.fillRect(a.x, a.y, a.w, a.h);
    const e = CARD_LAYOUT.effectBox;
    ctx.fillStyle = '#f5e6c8'; ctx.fillRect(e.x, e.y - 20, e.w, e.h + 60);
  }

  _fallbackAttr(ctx, label, x, y, size) {
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(size * 0.28)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 3), x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
  }
}
