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
function drawEffectText(ctx, text, isNormal) {
  const { x, y, w, h, fontBase } = CARD_LAYOUT.effectBox;
  if (!text) return;

  let fontSize = fontBase;
  let lines, lineHeight;
  for (let fs = fontBase; fs >= 7; fs -= 0.5) {
    const style = isNormal
      ? `italic ${fs}px "IM Fell English", serif`
      : `${fs}px "IM Fell English", serif`;
    ctx.font = style;
    lineHeight = fs * 1.2;
    lines = wrapText(ctx, text, w);
    if (lines.length * lineHeight <= h) { fontSize = fs; break; }
    fontSize = fs;
  }

  ctx.font = isNormal
    ? `italic ${fontSize}px "IM Fell English", serif`
    : `${fontSize}px "IM Fell English", serif`;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  lineHeight = fontSize * 1.2;
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

// ─── CardRenderer ─────────────────────────────────────────────────────────────
class CardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  async render(state) {
    const ctx = this.ctx;
    const typeCfg = CARD_TYPES[state.type] || CARD_TYPES.normal;
    const S = 421 / 813;

    ctx.clearRect(0, 0, CARD_W, CARD_H);

    // 1. Name-area background (613×170 source → full card width, h proportional)
    const bgName = await loadImage(`assets/backgrounds/bg-name-${state.type}.png`);
    if (bgName) ctx.drawImage(bgName, 0, 0, CARD_W, Math.round(210 * S));

    // 2. Text-area background (705×231 source, positioned at sc(54), sc(884))
    const bgText = await loadImage(`assets/backgrounds/bg-text-${state.type}.png`);
    if (bgText) {
      ctx.drawImage(bgText,
        Math.round(54  * S), Math.round(884 * S),
        Math.round(705 * S), Math.round(231 * S));
    }

    // 3. Artwork (drawn before frame so the art border of the frame sits on top)
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

    // 4. Frame overlay (on top of artwork, covers border + transparent name/text areas)
    const frameImg = await loadImage(`assets/frames/${typeCfg.frame}`);
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);
    } else {
      this._drawFallbackFrame(ctx, state.type);
    }

    // 5. Card name
    if (state.name) {
      const { x, y, maxWidth, font } = CARD_LAYOUT.name;
      ctx.font = font;
      ctx.fillStyle = state.type === 'xyz' ? '#fff' : '#000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      const tw = ctx.measureText(state.name).width;
      if (tw > maxWidth) {
        ctx.save();
        const ratio = maxWidth / tw;
        ctx.transform(ratio, 0, 0, 1, x * (1 - ratio), 0);
        ctx.fillText(state.name, x, y);
        ctx.restore();
      } else {
        ctx.fillText(state.name, x, y);
      }
    }

    // 6. Attribute icon
    const attrData = ATTRIBUTES.find(a => a.value === state.attribute);
    if (attrData) {
      const { x, y, size } = CARD_LAYOUT.attribute;
      const icon = await loadImage(`assets/icons/${attrData.icon}`);
      if (icon) ctx.drawImage(icon, x, y, size, size);
      else this._fallbackAttr(ctx, attrData.label, x, y, size);
    }

    // 7. Stars / Rank
    if (typeCfg.hasLevel || typeCfg.hasRank) {
      await this._drawStars(ctx, state.level, typeCfg.hasRank);
    }

    // 8. Link rating text
    if (typeCfg.hasLink) {
      const { x, y, font } = CARD_LAYOUT.linkRating;
      ctx.font = font;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      ctx.fillText(`LINK-${state.linkRating || 1}`, x, y);
      ctx.textAlign = 'left';
    }

    // 9. Type / ability line
    this._drawTypeLine(ctx, state, typeCfg);

    // 10. Effect / flavor text
    drawEffectText(ctx, state.effect, state.type === 'normal');

    // 11. ATK / DEF
    if (typeCfg.isMonster) {
      ctx.fillStyle = '#000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      ctx.font = CARD_LAYOUT.atk.font;
      ctx.fillText(state.atk !== '' ? state.atk : '?', CARD_LAYOUT.atk.x, CARD_LAYOUT.atk.y);
      if (!typeCfg.hasLink) {
        ctx.font = CARD_LAYOUT.def.font;
        ctx.fillText(state.def !== '' ? state.def : '?', CARD_LAYOUT.def.x, CARD_LAYOUT.def.y);
      }
      ctx.textAlign = 'left';
    }

    // 12. Link arrows
    if (typeCfg.hasLink) {
      await this._drawLinkArrows(ctx, state.linkArrows);
    }
  }

  async _drawStars(ctx, count, isXyz) {
    const n = Math.min(Math.max(parseInt(count) || 0, 0), 12);
    if (n === 0) return;
    const { yBaseline, starSize, spacing, startX_normal, startX_xyz } = CARD_LAYOUT.levelRow;
    const src = isXyz ? 'assets/icons/star-xyz.png' : 'assets/icons/star.png';
    const starImg = await loadImage(src);
    const step = starSize + spacing;
    const starY = yBaseline - starSize;
    for (let i = 0; i < n; i++) {
      const sx = isXyz
        ? startX_xyz + i * step
        : startX_normal - (i + 1) * step;
      if (starImg) ctx.drawImage(starImg, sx, starY, starSize, starSize);
      else {
        ctx.fillStyle = isXyz ? '#888' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(sx + starSize / 2, starY + starSize / 2, starSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawTypeLine(ctx, state, typeCfg) {
    const { x, y, maxWidth, font } = CARD_LAYOUT.typeLine;
    const str = this._typeString(state, typeCfg);
    ctx.font = font;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const tw = ctx.measureText(str).width;
    if (tw > maxWidth) {
      ctx.save();
      const r = maxWidth / tw;
      ctx.transform(r, 0, 0, 1, x * (1 - r), 0);
      ctx.fillText(str, x, y);
      ctx.restore();
    } else {
      ctx.fillText(str, x, y);
    }
  }

  _typeString(state, typeCfg) {
    if (!typeCfg.isMonster) {
      const sub = state.spellTrapSubtype;
      const kind = typeCfg.label.split(' ')[0];
      return sub ? `[${sub} ${kind}]` : `[${kind}]`;
    }
    const parts = [state.monsterType || 'Dragon'];
    const extras = {
      effect: ['Effect'], ritual: ['Ritual', 'Effect'], fusion: ['Fusion', 'Effect'],
      synchro: ['Synchro', 'Effect'], xyz: ['Xyz', 'Effect'], link: ['Link', 'Effect'],
    };
    if (extras[state.type]) parts.push(...extras[state.type]);
    return `[${parts.join('/')}]`;
  }

  async _drawLinkArrows(ctx, activeStates) {
    for (let i = 0; i < 8; i++) {
      const r = LINK_ARROW_RECTS[i];
      const src = activeStates[i]
        ? `assets/icons/link-active-${r.file}.png`
        : `assets/icons/link-inactive-${r.file}.png`;
      const img = await loadImage(src);
      if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
    }
  }

  _drawFallbackFrame(ctx, type) {
    const colors = {
      normal: '#D4B483', effect: '#8B4513', fusion: '#7B2D8B',
      ritual: '#2855B2', synchro: '#E0E0E0', xyz: '#222',
      link: '#1a3a5c', spell: '#1a6b4a', trap: '#7b1c4d',
    };
    const c = colors[type] || '#8B4513';
    ctx.fillStyle = c; ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.fillStyle = '#c8a44a'; ctx.fillRect(8, 8, CARD_W - 16, CARD_H - 16);
    ctx.fillStyle = c; ctx.fillRect(18, 18, CARD_W - 36, CARD_H - 36);
    const { x, y, w, h } = CARD_LAYOUT.artwork;
    ctx.fillStyle = '#777'; ctx.fillRect(x, y, w, h);
    const eb = CARD_LAYOUT.effectBox;
    ctx.fillStyle = '#f5e6c8'; ctx.fillRect(eb.x, eb.y - 30, eb.w, eb.h + 50);
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
