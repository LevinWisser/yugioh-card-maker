// ─── Firebase wrapper (Auth + Firestore only, no Storage) ─────────────────────
// Artwork wird als base64-DataURL direkt in Firestore gespeichert → kein CORS-Problem.
// Max. komprimierte Größe: ~200 KB base64 → weit unter Firestores 1 MB Dokumentlimit.

const FB = (() => {
  let auth, db, currentUserId = null;

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db   = firebase.firestore();
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
  }

  function signOut() {
    return auth.signOut();
  }

  function onAuthChange(cb) {
    auth.onAuthStateChanged(user => {
      currentUserId = user ? user.uid : null;
      cb(user);
    });
  }

  // ── Artwork helpers ─────────────────────────────────────────────────────────

  // Komprimiert das Artwork auf max. 800×800 und gibt eine JPEG-DataURL zurück.
  function encodeArtwork(artImage) {
    const MAX = 800;
    const srcW = artImage.naturalWidth  || artImage.width;
    const srcH = artImage.naturalHeight || artImage.height;
    const scale = Math.min(1, MAX / srcW, MAX / srcH);

    const tmp = document.createElement('canvas');
    tmp.width  = Math.round(srcW * scale);
    tmp.height = Math.round(srcH * scale);
    tmp.getContext('2d').drawImage(artImage, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL('image/jpeg', 0.82);
  }

  // Kleines Thumbnail (~120 px breit) für die My-Cards-Übersicht.
  function makeThumbnail(canvas) {
    const scale = 120 / canvas.width;
    const tmp   = document.createElement('canvas');
    tmp.width   = 120;
    tmp.height  = Math.round(canvas.height * scale);
    tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL('image/jpeg', 0.75);
  }

  // Serialisiert den app-State (ohne interne FB-Felder und das Image-Objekt).
  function serialize(state) {
    return {
      name:             state.name,
      type:             state.type,
      attribute:        state.attribute,
      monsterType:      state.monsterType,
      spellTrapSubtype: state.spellTrapSubtype,
      level:            state.level,
      linkRating:       state.linkRating,
      atk:              state.atk,
      def:              state.def,
      effect:           state.effect,
      linkArrows:       [...state.linkArrows],
    };
  }

  // ── Collection-Referenz ─────────────────────────────────────────────────────
  function col() {
    return db.collection('cards').doc(currentUserId).collection('collection');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async function saveNew(state, canvas) {
    if (!currentUserId) throw new Error('Nicht eingeloggt');
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = {
      ...serialize(state),
      artworkDataUrl:   state.artImage ? encodeArtwork(state.artImage) : null,
      thumbnailDataUrl: makeThumbnail(canvas),
      createdAt: now,
      updatedAt: now,
    };
    const ref = await col().add(doc);
    return ref.id;
  }

  async function update(cardId, state, canvas) {
    if (!currentUserId) throw new Error('Nicht eingeloggt');
    const doc = {
      ...serialize(state),
      artworkDataUrl:   state.artImage ? encodeArtwork(state.artImage) : null,
      thumbnailDataUrl: makeThumbnail(canvas),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await col().doc(cardId).update(doc);
  }

  async function list() {
    if (!currentUserId) throw new Error('Nicht eingeloggt');
    const snap = await col().orderBy('updatedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function remove(cardId) {
    if (!currentUserId) throw new Error('Nicht eingeloggt');
    await col().doc(cardId).delete();
  }

  return { init, signIn, signOut, onAuthChange, saveNew, update, list, remove };
})();
