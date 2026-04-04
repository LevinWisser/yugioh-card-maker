// ─── Canvas dimensions ────────────────────────────────────────────────────────
// Source frames are 813×1185. We render at 421×614.
const CARD_W = 421;
const CARD_H = 614;

// All coordinates are hand-calibrated to match the frame images visually.
const CARD_LAYOUT = {
  //             x    y    extra
  name:      { x: 30,  y: 57,  maxWidth: 284, font: '32px Cinzel, serif' },
  attribute: { x: 373, y: 14,  size: 40 },
  // Subtype icon (Continuous/Quick-Play/etc.) sits to the LEFT of attribute
  subtype:   { size: 26, gap: 4 },   // x = attribute.x - size - gap, y centred with attribute
  artwork:   { x: 52,  y: 113, w: 318, h: 318 },
  levelRow:  {
    yBaseline:     93,   // bottom of star images
    starSize:      26,
    spacing:       2,
    startX_normal: 388,  // right-aligned: star[0] right edge
    startX_xyz:    33,   // left-aligned:  star[0] left edge
  },
  // Background images (sourced from ygocarder at 813×1185 → scaled)
  bgName:    { x: 0,  y: 0,   w: CARD_W, h: 109 },  // 813×170 → full width, h=210*0.518
  bgText:    { x: 28, y: 458, w: 365,    h: 120 },   // 705×231 at x=54,y=884 → scaled
  // Type / effect text
  typeLine:  { x: 30, y: 473, maxWidth: 362, font: 'bold 13px "IM Fell English", serif' },
  effectBox: { x: 30, y: 487, w: 362,    h: 80,  fontBase: 13 },
  // ATK / DEF (right-aligned)
  atk:       { x: 319, y: 573, font: 'bold 14px "IM Fell English", serif' },
  def:       { x: 399, y: 573, font: 'bold 14px "IM Fell English", serif' },
  linkRating:{ x: 389, y: 573, font: 'bold 14px "IM Fell English", serif' },
};

// ─── Card types ───────────────────────────────────────────────────────────────
const CARD_TYPES = {
  normal:  { label: 'Normal Monster',  frame: 'frame-normal.png',  isMonster: true,  hasLevel: true,  hasRank: false, hasLink: false },
  effect:  { label: 'Effect Monster',  frame: 'frame-effect.png',  isMonster: true,  hasLevel: true,  hasRank: false, hasLink: false },
  fusion:  { label: 'Fusion Monster',  frame: 'frame-fusion.png',  isMonster: true,  hasLevel: true,  hasRank: false, hasLink: false },
  ritual:  { label: 'Ritual Monster',  frame: 'frame-ritual.png',  isMonster: true,  hasLevel: true,  hasRank: false, hasLink: false },
  synchro: { label: 'Synchro Monster', frame: 'frame-synchro.png', isMonster: true,  hasLevel: true,  hasRank: false, hasLink: false },
  xyz:     { label: 'XYZ Monster',     frame: 'frame-xyz.png',     isMonster: true,  hasLevel: false, hasRank: true,  hasLink: false },
  link:    { label: 'Link Monster',    frame: 'frame-link.png',    isMonster: true,  hasLevel: false, hasRank: false, hasLink: true  },
  spell:   { label: 'Spell Card',      frame: 'frame-spell.png',   isMonster: false, hasLevel: false, hasRank: false, hasLink: false },
  trap:    { label: 'Trap Card',       frame: 'frame-trap.png',    isMonster: false, hasLevel: false, hasRank: false, hasLink: false },
};

// ─── Attributes ───────────────────────────────────────────────────────────────
const ATTRIBUTES = [
  { value: 'dark',   label: 'DARK',   icon: 'attr-dark.png'   },
  { value: 'light',  label: 'LIGHT',  icon: 'attr-light.png'  },
  { value: 'fire',   label: 'FIRE',   icon: 'attr-fire.png'   },
  { value: 'water',  label: 'WATER',  icon: 'attr-water.png'  },
  { value: 'earth',  label: 'EARTH',  icon: 'attr-earth.png'  },
  { value: 'wind',   label: 'WIND',   icon: 'attr-wind.png'   },
  { value: 'divine', label: 'DIVINE', icon: 'attr-divine.png' },
  { value: 'spell',  label: 'SPELL',  icon: 'attr-spell.png'  },
  { value: 'trap',   label: 'TRAP',   icon: 'attr-trap.png'   },
];

// ─── Monster types ────────────────────────────────────────────────────────────
const MONSTER_TYPES = [
  'Aqua', 'Beast', 'Beast-Warrior', 'Cyberse', 'Dinosaur', 'Divine-Beast',
  'Dragon', 'Fairy', 'Fiend', 'Fish', 'Illusion', 'Insect', 'Machine',
  'Plant', 'Psychic', 'Pyro', 'Reptile', 'Rock', 'Sea Serpent', 'Spellcaster',
  'Thunder', 'Warrior', 'Winged Beast', 'Wyrm', 'Zombie',
];

// ─── Spell/Trap sub-types and their icon filenames ────────────────────────────
const SPELL_TYPES = [
  { value: '',           label: '— Normal —',   icon: null             },
  { value: 'Continuous', label: 'Continuous',   icon: 'subtype-continuous.png' },
  { value: 'Counter',    label: 'Counter',      icon: 'subtype-counter.png'    },
  { value: 'Equip',      label: 'Equip',        icon: 'subtype-equip.png'      },
  { value: 'Field',      label: 'Field',        icon: 'subtype-field.png'      },
  { value: 'Quick-Play', label: 'Quick-Play',   icon: 'subtype-quick-play.png' },
  { value: 'Ritual',     label: 'Ritual',       icon: 'subtype-ritual.png'     },
];
const TRAP_TYPES = [
  { value: '',           label: '— Normal —',   icon: null             },
  { value: 'Continuous', label: 'Continuous',   icon: 'subtype-continuous.png' },
  { value: 'Counter',    label: 'Counter',      icon: 'subtype-counter.png'    },
];

// ─── Link arrow UI grid & canvas rects ───────────────────────────────────────
const LINK_ARROWS = [
  { label: '↖', gridCol: 1, gridRow: 1 },
  { label: '↑', gridCol: 2, gridRow: 1 },
  { label: '↗', gridCol: 3, gridRow: 1 },
  { label: '←', gridCol: 1, gridRow: 2 },
  { label: '→', gridCol: 3, gridRow: 2 },
  { label: '↙', gridCol: 1, gridRow: 3 },
  { label: '↓', gridCol: 2, gridRow: 3 },
  { label: '↘', gridCol: 3, gridRow: 3 },
];

// Link arrow positions scaled from ygocarder 813×1185 to 421×614
const S = 421 / 813;
const LINK_ARROW_RECTS = [
  { file: 1, x: Math.round(55  * S), y: Math.round(175 * S), w: Math.round(100 * S), h: Math.round(100 * S) },
  { file: 2, x: Math.round(323 * S), y: Math.round(165 * S), w: Math.round(170 * S), h: Math.round(80  * S) },
  { file: 3, x: Math.round(655 * S), y: Math.round(175 * S), w: Math.round(100 * S), h: Math.round(100 * S) },
  { file: 4, x: Math.round(45  * S), y: Math.round(442 * S), w: Math.round(70  * S), h: Math.round(170 * S) },
  { file: 6, x: Math.round(700 * S), y: Math.round(442 * S), w: Math.round(70  * S), h: Math.round(170 * S) },
  { file: 7, x: Math.round(55  * S), y: Math.round(775 * S), w: Math.round(100 * S), h: Math.round(100 * S) },
  { file: 8, x: Math.round(323 * S), y: Math.round(810 * S), w: Math.round(170 * S), h: Math.round(80  * S) },
  { file: 9, x: Math.round(655 * S), y: Math.round(775 * S), w: Math.round(100 * S), h: Math.round(100 * S) },
];
