async function downloadCard(state, format) {
  // Render to an off-screen canvas at 2× resolution
  const offscreen = document.createElement('canvas');
  offscreen.width  = CARD_W * 2;
  offscreen.height = CARD_H * 2;

  const renderer = new CardRenderer(offscreen);
  renderer.ctx.scale(2, 2);
  await renderer.render(state);

  const filename = (state.name || 'card').replace(/[^a-z0-9äöüÄÖÜß]/gi, '_').toLowerCase();
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality  = format === 'jpg' ? 0.95 : undefined;

  try {
    // toDataURL is synchronous and more reliable than toBlob for local files
    const dataURL = quality !== undefined
      ? offscreen.toDataURL(mimeType, quality)
      : offscreen.toDataURL(mimeType);

    const a = document.createElement('a');
    a.href     = dataURL;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download fehlgeschlagen:', err);
    alert(
      'Download fehlgeschlagen.\n\n' +
      'Bitte öffne die App über einen lokalen Webserver statt direkt als Datei.\n' +
      'Tipp: VS Code → "Go Live" (Live Server Extension) oder:\n' +
      '  python -m http.server 8080\n' +
      'dann http://localhost:8080 im Browser öffnen.'
    );
  }
}
