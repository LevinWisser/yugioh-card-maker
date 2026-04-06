// ─── State (default: Effect Monster, Level 4, DARK) ──────────────────────────
const state = {
  name:             'My Card',
  type:             'effect',
  attribute:        'dark',
  monsterType:      'Dragon',
  spellTrapSubtype: '',
  level:            4,
  linkRating:       2,
  atk:              '1500',
  def:              '1200',
  effect:           'A dragon of great power, shrouded in eternal darkness.',
  artImage:         null,
  linkArrows:       new Array(8).fill(false),
};

// ─── Renderer ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('card-canvas');
const renderer = new CardRenderer(canvas);

// ─── Debounced render ─────────────────────────────────────────────────────────
let rafPending = false;
function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; renderer.render(state); });
}

// ─── Populate selects ─────────────────────────────────────────────────────────
function populateSelects() {
  const typeEl = document.getElementById('card-type');
  Object.entries(CARD_TYPES).forEach(([value, cfg]) => {
    typeEl.appendChild(new Option(cfg.label, value));
  });
  typeEl.value = state.type;

  const attrEl = document.getElementById('card-attribute');
  ATTRIBUTES.forEach(a => attrEl.appendChild(new Option(a.label, a.value)));
  attrEl.value = state.attribute;

  const monsterTypeEl = document.getElementById('monster-type');
  MONSTER_TYPES.forEach(t => monsterTypeEl.appendChild(new Option(t, t)));
  monsterTypeEl.value = state.monsterType;

  const spellSubEl = document.getElementById('spell-subtype');
  SPELL_TYPES.forEach(t => spellSubEl.appendChild(new Option(t.label, t.value)));

  const trapSubEl = document.getElementById('trap-subtype');
  TRAP_TYPES.forEach(t => trapSubEl.appendChild(new Option(t.label, t.value)));

  // Link arrow buttons
  const grid = document.getElementById('link-arrows-grid');
  LINK_ARROWS.forEach((arrow, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arrow-btn';
    btn.textContent = arrow.label;
    btn.style.gridColumn = arrow.gridCol;
    btn.style.gridRow    = arrow.gridRow;
    btn.addEventListener('click', () => {
      state.linkArrows[i] = !state.linkArrows[i];
      btn.classList.toggle('active', state.linkArrows[i]);
      scheduleRender();
    });
    grid.appendChild(btn);
  });
}

// ─── Form visibility ──────────────────────────────────────────────────────────
function setGreyed(id, greyOut) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('greyed', greyOut);
}

function updateVisibility() {
  const cfg         = CARD_TYPES[state.type];
  const isSpell     = state.type === 'spell';
  const isTrap      = state.type === 'trap';
  const isSpellOrTrap = isSpell || isTrap;

  setGreyed('monster-details',     isSpellOrTrap);
  setGreyed('stats-group',         isSpellOrTrap);
  setGreyed('def-field',           cfg.hasLink);
  setGreyed('link-group',          !cfg.hasLink);
  setGreyed('level-group',         (!cfg.hasLevel && !cfg.hasRank) || cfg.hasLink);
  setGreyed('link-rating-group',   !cfg.hasLink);
  setGreyed('spell-subtype-group', !isSpell);
  setGreyed('trap-subtype-group',  !isTrap);

  const levelLabel = document.getElementById('level-label');
  levelLabel.textContent = cfg.hasRank ? 'Rank' : 'Level';

  const attrEl = document.getElementById('card-attribute');
  if (isSpell)     { attrEl.value = 'spell'; state.attribute = 'spell'; }
  else if (isTrap) { attrEl.value = 'trap';  state.attribute = 'trap';  }
  attrEl.disabled = isSpellOrTrap;

  // Disable SPELL/TRAP options for monster types, re-enable for Spell/Trap cards
  attrEl.querySelectorAll('option').forEach(opt => {
    if (opt.value === 'spell' || opt.value === 'trap') {
      opt.disabled = cfg.isMonster;
    }
  });
}

// ─── Event wiring ─────────────────────────────────────────────────────────────
function bindEvents() {
  bind('card-name',       'input',  e => { state.name = e.target.value; });
  bind('card-type',       'change', e => { state.type = e.target.value; updateVisibility(); });
  bind('card-attribute',  'change', e => { state.attribute = e.target.value; });
  bind('monster-type',    'change', e => { state.monsterType = e.target.value; });
  bind('card-level',      'input',  e => { state.level = e.target.value; });
  bind('link-rating',     'input',  e => { state.linkRating = e.target.value; });
  bind('card-atk',        'input',  e => { state.atk = e.target.value; });
  bind('card-def',        'input',  e => { state.def = e.target.value; });
  bind('card-effect',     'input',  e => { state.effect = e.target.value; });
  bind('spell-subtype',   'change', e => { state.spellTrapSubtype = e.target.value; });
  bind('trap-subtype',    'change', e => { state.spellTrapSubtype = e.target.value; });

  // Artwork upload via button/click
  const artInput = document.getElementById('art-upload');
  const dropZone = document.getElementById('drop-zone');

  artInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) loadArtFile(file);
  });

  dropZone.addEventListener('click', () => artInput.click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadArtFile(file);
  });

  document.getElementById('btn-png').addEventListener('click', () => downloadCard(state, 'png'));
  document.getElementById('btn-jpg').addEventListener('click', () => downloadCard(state, 'jpg'));
}

function bind(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(event, e => { handler(e); scheduleRender(); });
}

function loadArtFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    if (state.artImage && state.artImage._url) URL.revokeObjectURL(state.artImage._url);
    img._url = url;
    state.artImage = img;
    const dropZone = document.getElementById('drop-zone');
    dropZone.style.backgroundImage = `url(${url})`;
    dropZone.style.backgroundSize  = 'cover';
    dropZone.style.backgroundPosition = 'center';
    const lbl = dropZone.querySelector('.drop-label');
    if (lbl) lbl.hidden = true;
    scheduleRender();
  };
  img.src = url;
}

// ─── Set initial form values ──────────────────────────────────────────────────
function setFormDefaults() {
  document.getElementById('card-name').value  = state.name;
  document.getElementById('card-level').value = state.level;
  document.getElementById('card-atk').value   = state.atk;
  document.getElementById('card-def').value   = state.def;
  document.getElementById('card-effect').value = state.effect;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  populateSelects();
  bindEvents();
  setFormDefaults();
  updateVisibility();
  renderer.render(state);
});
