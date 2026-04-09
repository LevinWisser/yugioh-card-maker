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
  // Firebase tracking (nicht serialisiert)
  _firebaseId:      null,
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
  else if (attrEl.value === 'spell' || attrEl.value === 'trap') { attrEl.value = 'dark'; state.attribute = 'dark'; }
  attrEl.disabled = isSpellOrTrap;

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
    setDropZoneImage(url);
    scheduleRender();
  };
  img.src = url;
}

function setDropZoneImage(url) {
  const dropZone = document.getElementById('drop-zone');
  dropZone.style.backgroundImage    = `url(${url})`;
  dropZone.style.backgroundSize     = 'cover';
  dropZone.style.backgroundPosition = 'center';
  const lbl = dropZone.querySelector('.drop-label');
  if (lbl) lbl.hidden = true;
}

function clearDropZone() {
  const dropZone = document.getElementById('drop-zone');
  dropZone.style.backgroundImage = '';
  const lbl = dropZone.querySelector('.drop-label');
  if (lbl) lbl.hidden = false;
}

// ─── Set form values from state ───────────────────────────────────────────────
function applyStateToForm() {
  document.getElementById('card-name').value    = state.name;
  document.getElementById('card-type').value    = state.type;
  document.getElementById('card-attribute').value = state.attribute;
  document.getElementById('monster-type').value = state.monsterType;
  document.getElementById('card-level').value   = state.level;
  document.getElementById('link-rating').value  = state.linkRating;
  document.getElementById('card-atk').value     = state.atk;
  document.getElementById('card-def').value     = state.def;
  document.getElementById('card-effect').value  = state.effect;
  document.getElementById('spell-subtype').value = state.spellTrapSubtype;
  document.getElementById('trap-subtype').value  = state.spellTrapSubtype;

  // Link arrow buttons
  document.querySelectorAll('.arrow-btn').forEach((btn, i) => {
    btn.classList.toggle('active', !!state.linkArrows[i]);
  });
}

// ─── Set initial form values ──────────────────────────────────────────────────
function setFormDefaults() {
  document.getElementById('card-name').value  = state.name;
  document.getElementById('card-level').value = state.level;
  document.getElementById('card-atk').value   = state.atk;
  document.getElementById('card-def').value   = state.def;
  document.getElementById('card-effect').value = state.effect;
}

// ─── Firebase: Auth UI ────────────────────────────────────────────────────────
function handleAuthChange(user) {
  const signedOut = document.getElementById('auth-signed-out');
  const signedIn  = document.getElementById('auth-signed-in');
  const saveArea  = document.getElementById('save-area');

  if (user) {
    signedOut.classList.add('hidden');
    signedIn.classList.remove('hidden');
    document.getElementById('user-name').textContent = user.displayName || user.email;
    const avatar = document.getElementById('user-avatar');
    if (user.photoURL) { avatar.src = user.photoURL; avatar.hidden = false; }
    else { avatar.hidden = true; }
    saveArea.classList.remove('hidden');
  } else {
    signedOut.classList.remove('hidden');
    signedIn.classList.add('hidden');
    saveArea.classList.add('hidden');
  }
}

function updateSaveButton() {
  const btn = document.getElementById('btn-save');
  if (!btn) return;
  btn.textContent = state._firebaseId ? 'Update Card' : 'Save Card';
}

function bindAuthEvents() {
  document.getElementById('btn-login').addEventListener('click', () => {
    FB.signIn().catch(err => showToast('Login fehlgeschlagen: ' + err.message, true));
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    FB.signOut();
    state._firebaseId = null;
    updateSaveButton();
  });

  document.getElementById('btn-my-cards').addEventListener('click', openMyCards);

  document.getElementById('btn-save').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      if (state._firebaseId) {
        await FB.update(state._firebaseId, state, canvas);
        showToast('Karte aktualisiert!');
      } else {
        state._firebaseId = await FB.saveNew(state, canvas);
        showToast('Karte gespeichert!');
      }
    } catch (err) {
      showToast('Fehler: ' + err.message, true);
    } finally {
      btn.disabled = false;
      updateSaveButton();
    }
  });

  document.getElementById('modal-close').addEventListener('click', closeMyCards);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMyCards();
  });
}

// ─── My Cards Modal ───────────────────────────────────────────────────────────
async function openMyCards() {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.classList.add('modal-open');
  await refreshMyCards();
}

function closeMyCards() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function refreshMyCards() {
  const grid    = document.getElementById('cards-grid');
  const empty   = document.getElementById('cards-empty');
  const loading = document.getElementById('cards-loading');

  grid.innerHTML = '';
  loading.classList.remove('hidden');
  empty.classList.add('hidden');

  let cards;
  try {
    cards = await FB.list();
  } catch (err) {
    showToast('Laden fehlgeschlagen: ' + err.message, true);
    loading.classList.add('hidden');
    return;
  }

  loading.classList.add('hidden');

  if (cards.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  cards.forEach(card => {
    const item = document.createElement('div');
    item.className = 'saved-card-item';

    const thumb = document.createElement('img');
    thumb.className = 'saved-card-thumb';
    thumb.src = card.thumbnailDataUrl || '';
    thumb.alt = card.name;

    const info = document.createElement('div');
    info.className = 'saved-card-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'saved-card-name';
    nameEl.textContent = card.name || '(kein Name)';

    const typeEl = document.createElement('span');
    typeEl.className = 'saved-card-meta';
    const cfg = CARD_TYPES[card.type];
    typeEl.textContent = cfg ? cfg.label : card.type;

    info.append(nameEl, typeEl);

    const actions = document.createElement('div');
    actions.className = 'saved-card-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-card-action';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      loadCardFromSave(card);
      closeMyCards();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-card-action btn-card-delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      try {
        await FB.remove(card.id);
        item.remove();
        if (grid.children.length === 0) empty.classList.remove('hidden');
        if (state._firebaseId === card.id) {
          state._firebaseId = null;
          updateSaveButton();
        }
      } catch (err) {
        showToast('Löschen fehlgeschlagen', true);
        delBtn.disabled = false;
      }
    });

    actions.append(loadBtn, delBtn);
    item.append(thumb, info, actions);
    grid.appendChild(item);
  });
}

function loadCardFromSave(card) {
  // Felder in State übernehmen
  state.name             = card.name             ?? state.name;
  state.type             = card.type             ?? state.type;
  state.attribute        = card.attribute        ?? state.attribute;
  state.monsterType      = card.monsterType      ?? state.monsterType;
  state.spellTrapSubtype = card.spellTrapSubtype ?? '';
  state.level            = card.level            ?? state.level;
  state.linkRating       = card.linkRating       ?? state.linkRating;
  state.atk              = card.atk              ?? state.atk;
  state.def              = card.def              ?? state.def;
  state.effect           = card.effect           ?? state.effect;
  state.linkArrows       = card.linkArrows       ? [...card.linkArrows] : new Array(8).fill(false);
  state._firebaseId      = card.id;

  // Artwork laden (DataURL → Image-Objekt)
  if (card.artworkDataUrl) {
    const img = new Image();
    img.onload = () => {
      if (state.artImage && state.artImage._url) URL.revokeObjectURL(state.artImage._url);
      state.artImage = img;
      setDropZoneImage(card.artworkDataUrl);
      scheduleRender();
    };
    img.src = card.artworkDataUrl;
  } else {
    state.artImage = null;
    clearDropZone();
  }

  applyStateToForm();
  updateVisibility();
  updateSaveButton();
  scheduleRender();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' toast-error' : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  populateSelects();
  bindEvents();
  setFormDefaults();
  updateVisibility();
  renderer.render(state);

  // Firebase
  FB.init();
  FB.onAuthChange(handleAuthChange);
  bindAuthEvents();
});
