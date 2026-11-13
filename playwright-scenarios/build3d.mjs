// 3D build design (index-build.html): every correct answer adds blocks to a picture. Skipped on the other designs.
export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, open, screenshot }) {
  page.on('dialog', d => d.accept());
  await open();
  if (await page.evaluate(() => document.body.dataset.theme) !== 'build') return;

  const info = () => page.evaluate(() => getBuildInfo());
  const answer = async rank => {
    const c = await page.locator(`#answer-${rank}`).getAttribute('data-correct');
    await page.fill(`#answer-${rank}`, c);
    await page.press(`#answer-${rank}`, 'Enter');
  };

  const i0 = await info();
  check('3D stage started (WebGL available)', i0 !== null && i0.ready);
  if (!i0) return;
  eq('no blocks before the first answer', i0.shown, 0);
  check('picture has at least 100 blocks', i0.total >= 100, `total=${i0.total}`);
  const box = await page.$eval('#build-canvas', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  check('canvas has a size', box[0] > 100 && box[1] > 100, `size=${box}`);

  // a wrong answer builds nothing, a correct one adds a block
  await page.fill('#answer-0', '999'); await page.press('#answer-0', 'Enter');
  eq('wrong answer adds no block', (await info()).shown, 0);
  await answer(0);
  const i1 = await info();
  check('correct answer adds a block', i1.shown >= 1, `shown=${i1.shown}`);
  const withAnswer = i1.shown;
  await page.focus('#answer-0'); await page.press('#answer-0', 'Enter');
  eq('re-checking does not add blocks', (await info()).shown, withAnswer);

  // every further correct answer adds at least one block
  let prev = withAnswer;
  for (let r = 1; r < 5; r++) {
    await answer(r);
    const now = (await info()).shown;
    check(`answer ${r + 1} adds a block`, now > prev, `${prev} -> ${now}`);
    prev = now;
  }
  check('caption counts blocks', /\d+ av \d+ blokker/.test(await page.textContent('#build-caption')));

  // a wrong re-answer never removes blocks
  await page.fill('#answer-0', '999'); await page.press('#answer-0', 'Enter');
  eq('wrong re-answer keeps blocks', (await info()).shown, prev);

  // the canvas actually draws something
  await page.waitForTimeout(1500);
  // (read inside a frame callback queued after the page's own, while the WebGL buffer is still valid)
  const painted = await page.$eval('#build-canvas', c => new Promise(resolve => requestAnimationFrame(() => {
    const t = document.createElement('canvas'); t.width = 64; t.height = 32;
    const ctx = t.getContext('2d');
    ctx.drawImage(c, 0, 0, 64, 32);
    const d = ctx.getImageData(0, 0, 64, 32).data;
    let drawn = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) drawn++;
    resolve(drawn);
  })));
  check('canvas has drawn pixels', painted > 50, `pixels=${painted}`);
  await screenshot('building');

  // a reload keeps the blocks (and the picture)
  const pic = (await info()).picture;
  await open();
  const reloaded = await info();
  eq('reload keeps the picture', reloaded.picture, pic);
  check('reload keeps the blocks', reloaded.shown >= prev, `shown=${reloaded.shown}`);

  // finish the test: the picture is complete and the summary names it
  await page.selectOption('#problem-count', '10');
  const total = (await info()).total;
  eq('new test starts with an empty stage', (await info()).shown, 0);
  for (let r = 0; r < 10; r++) { await answer(r); }
  await page.focus('#answer-9'); await page.locator('#answer-9').blur();
  const done = await info();
  eq('all blocks stand after the last answer', done.shown, total);
  check('picture complete', done.complete);
  await page.waitForSelector('#summary-modal', { state: 'visible' });
  check('summary names the picture', (await page.textContent('#summary-build')).includes(done.picture));
  await page.waitForTimeout(2000);
  await screenshot('finished');

  // "Prøv igjen" starts over with an empty stage
  await page.click('#restart-button');
  eq('restart empties the stage', (await info()).shown, 0);
}
