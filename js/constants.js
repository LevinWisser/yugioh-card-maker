// ─── Canvas dimensions ────────────────────────────────────────────────────────
const CARD_W = 421;
const CARD_H = 614;
const S = 421 / 813; // scale factor: source frames are 813×1185

function sc(n) { return Math.round(n * S); }

const CARD_LAYOUT = {
  name:      { x: sc(58),  y: sc(187),  maxWidth: sc(600), font: `${sc(72)}px Cinzel, serif` },
  attribute: { x: sc(680), y: sc(55),   size: sc(76) },
  artwork:   { x: sc(100), y: sc(219),  w: sc(614), h: sc(614) },
  levelRow:  {
    yBaseline:     sc(145),
    starSize:      sc(50),
    spacing:       sc(3.8),
    startX_normal: sc(728.775),  // right-aligned, draw right→left
    startX_xyz:    sc(85.9125),  // left-aligned, draw left→right
  },
  typeLine:  { x: sc(62),  y: sc(920), maxWidth: sc(685), font: `${sc(27)}px "IM Fell English", serif` },
  effectBox: { x: sc(54),  y: sc(950), w: sc(705), h: sc(160), fontBase: sc(27) },
  atk:       { x: sc(465), y: sc(1106), font: `bold ${sc(30)}px "IM Fell English", serif` },
  def:       { x: sc(630), y: sc(1106), font: `bold ${sc(30)}px "IM Fell English", serif` },
  linkRating:{ x: sc(550), y: sc(1106), font: `bold ${sc(30)}px "IM Fell English", serif` },
};

// Link arrow image positions (in 421×614 canvas coords)
// Index maps: 0=NW→file1, 1=N→file2, 2=NE→file3, 3=W→file4,
//             4=E→file6, 5=SW→file7, 6=S→file8, 7=SE→file9
const LINK_ARROW_RECTS = [
  { file: 1, x: sc(55),  y: sc(175), w: sc(100), h: sc(100) },
  { file: 2, x: sc(323), y: sc(165), w: sc(170), h: sc(80)  },
  { file: 3, x: sc(655), y: sc(175), w: sc(100), h: sc(100) },
  { file: 4, x: sc(45),  y: sc(442), w: sc(70),  h: sc(170) },
  { file: 6, x: sc(700), y: sc(442), w: sc(70),  h: sc(170) },
  { file: 7, x: sc(55),  y: sc(775), w: sc(100), h: sc(100) },
  { file: 8, x: sc(323), y: sc(810), w: sc(170), h: sc(80)  },
  { file: 9, x: sc(655), y: sc(775), w: sc(100), h: sc(100) },
];

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

const MONSTER_TYPES = [
  'Aqua', 'Beast', 'Beast-Warrior', 'Cyberse', 'Dinosaur', 'Divine-Beast',
  'Dragon', 'Fairy', 'Fiend', 'Fish', 'Illusion', 'Insect', 'Machine',
  'Plant', 'Psychic', 'Pyro', 'Reptile', 'Rock', 'Sea Serpent', 'Spellcaster',
  'Thunder', 'Warrior', 'Winged Beast', 'Wyrm', 'Zombie',
];

const SPELL_TYPES = ['', 'Continuous', 'Counter', 'Equip', 'Field', 'Quick-Play', 'Ritual'];
const TRAP_TYPES  = ['', 'Continuous', 'Counter'];

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
