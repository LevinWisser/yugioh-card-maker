async function downloadCard(state, format) {
  const offscreen = document.createElement('canvas');
  offscreen.width  = CARD_W * 2;
  offscreen.height = CARD_H * 2;
  const renderer = new CardRenderer(offscreen);
  renderer.ctx.scale(2, 2);
  await renderer.render(state);

  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality  = format === 'jpg' ? 0.95 : undefined;
  const filename = (state.name || 'card').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  offscreen.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, mimeType, quality);
}
