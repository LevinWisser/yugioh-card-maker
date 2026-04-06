// ─── Canvas dimensions ────────────────────────────────────────────────────────
// Source frames are 813×1185. We render at 421×614.
// All coordinates derived from lauqerm/ygocarder (813×1185) scaled by S=421/813.
const CARD_W = 421;
const CARD_H = 614;
const S = CARD_W / 813; // ≈ 0.5178

// Official YuGiOh font stack (local fonts first, web-safe fallbacks second).
// Download fonts from https://github.com/lauqerm/ygocarder/tree/main/public/asset/font
// and place them in assets/fonts/ — see @font-face declarations in index.html.
const F_NAME   = '"MatrixRegularSmallCaps", "Cinzel", serif';
const F_EFFECT = '"MatrixBook", "Palatino Linotype", "Book Antiqua", serif';
const F_TYPE   = '"YuGiOhITCStoneSerifBSc", "Palatino Linotype", serif';
const F_STAT   = '"MatrixBoldSmallCaps", "Cinzel", serif';

const CARD_LAYOUT = {
  // Card name — baseline at y=116 in ygocarder → 116*S ≈ 60
  // maxWidth 608 (with attribute icon) → 608*S ≈ 315
  name:      { x: Math.round(63*S), y: Math.round(116*S), maxWidth: Math.round(608*S), font: `${Math.round(91*S)}px ${F_NAME}` },

  // Attribute icon — x=680, y=55, size=76 in ygocarder
  attribute: { x: Math.round(680*S), y: Math.round(55*S), size: Math.round(76*S) },

  // Spell/Trap type label in name area — right-aligned, large format
  // ygocarder: trueEdge=732 (right edge), trueBaseline=187.5, font 42px
  spellTrapTypeLabel: { x: Math.round(732*S), y: Math.round(187.5*S), font: `20px ${F_TYPE}` },

  // Subtype icon — shown inline in the spell/trap type label
  // iconWidth=43, iconHeight=44 in ygocarder
  subtype:   { size: Math.round(43*S), gap: 4 },

  // Artwork — 100,219,614,614 in ygocarder
  artwork:   { x: Math.round(100*S), y: Math.round(219*S), w: Math.round(614*S), h: Math.round(614*S) },

  // Level / rank stars — top y=145, starWidth=50, spacing=3.8 in ygocarder
  // Right-to-left (normal): rightmost star right-edge at x=728.775
  // Left-to-right (xyz):    leftmost star left-edge  at x=85.9125
  levelRow:  {
    yBaseline:     Math.round((145 + 50) * S), // bottom of star images ≈ 101
    starSize:      Math.round(50  * S),         // ≈ 26
    spacing:       Math.round(3.8 * S),         // ≈ 2
    startX_normal: Math.round(728.775 * S),     // ≈ 377
    startX_xyz:    Math.round(85.9125 * S),     // ≈ 44
  },

  // Background images — sourced from ygocarder at 813×1185
  bgName:    { x: 0,                    y: 0,                    w: CARD_W,              h: Math.round(170*S) },
  bgText:    { x: Math.round(54*S),     y: Math.round(884*S),    w: Math.round(705*S),   h: Math.round(231*S) },

  // Type / ability line — baseline at y=920 in ygocarder (textBaseline='alphabetic')
  // Font 31.5px in ygocarder → 31.5*S ≈ 16px
  typeLine:  { x: Math.round(62.5*S), y: Math.round(920*S), maxWidth: Math.round(684.5*S), font: `${Math.round(31.5*S)}px ${F_TYPE}` },

  // Effect text box — top at y=920.8 in ygocarder (textBaseline='top'), width=684, cap=152
  // Base font 40.2px in ygocarder → 40.2*S ≈ 21px; minimum ~8px
  effectBox: { x: Math.round(65*S), y: Math.round(920.8*S), w: Math.round(684*S), h: Math.round(152*S), fontBase: Math.round(40.2*S) },

  // ATK / DEF — right-aligned; values end at x≈582 (ATK) and x≈748 (DEF) in ygocarder
  // Font 37px in ygocarder → 37*S ≈ 19px
  atk:        { x: Math.round(582.8*S), y: Math.round(1106.5*S), font: `bold ${Math.round(37*S)}px ${F_STAT}` },
  def:        { x: Math.round(748.0*S), y: Math.round(1106.5*S), font: `bold ${Math.round(37*S)}px ${F_STAT}` },
  linkRating: { x: Math.round(748.0*S), y: Math.round(1106.5*S), font: `bold ${Math.round(37*S)}px ${F_STAT}` },
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
