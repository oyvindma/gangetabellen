export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, open, screenshot }) {
  await open();
  const top = () => page.$eval('#progress-container', e => Math.round(e.getBoundingClientRect().top));
  const vis = await page.$eval('#progress-container', e => getComputedStyle(e).display);
  check('progress container visible (interactive mode)', vis !== 'none', `display=${vis}`);
  const pos = await page.$eval('#progress-container', e => getComputedStyle(e).position);
  eq('position is sticky', pos, 'sticky');
  const t0 = await top();
  check('starts below page top', t0 > 0, `top=${t0}`);

  // Bar's natural document position; before reaching it, it must NOT be stuck yet.
  const natural = await page.$eval('#progress-container', e => Math.round(e.getBoundingClientRect().top + scrollY));
  await page.evaluate(y => window.scrollTo(0, y), natural - 100);
  await page.waitForTimeout(100);
  eq('not stuck yet 100px before its natural position', await top(), 100);
  for (const y of [natural + 1, natural + 500, natural + 2000]) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await page.waitForTimeout(100);
    eq(`stuck at top after scrollY=${y}`, await top(), 0);
  }
  const inView = await page.$eval('#progress-container', e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
  check('visible in viewport when scrolled', inView);

  // progress updates while stuck
  await page.evaluate(() => { const i = document.querySelector('.answer-input:not([readonly])'); i.scrollIntoView(); });
  const id = await page.evaluate(() => { const els=[...document.querySelectorAll('.answer-input')]; return els.find(e=>e.getBoundingClientRect().top>150 && e.getBoundingClientRect().top<innerHeight)?.id; });
  await page.fill('#'+id, '1'); await page.focus('#answer-99');
  const w = await page.$eval('#progress-bar', e => parseFloat(e.style.width));
  check('progress bar fills while stuck', w > 0, `width=${w}%`);
  eq('still stuck after update', await top(), 0);

  // not covered by other content: first visible problem sits below bar
  const overlap = await page.evaluate(() => { const b=document.querySelector('#progress-container').getBoundingClientRect(); return b.bottom; });
  // Focus on a field must not leave it hidden under the bar
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.focus('#answer-60');
  await page.waitForTimeout(100);
  const hidden = await page.evaluate(() => { const b=document.querySelector('#progress-container').getBoundingClientRect().bottom; return document.activeElement.getBoundingClientRect().top < b; });
  check('focused input not hidden under sticky bar', !hidden);
  await screenshot('scrolled');
  console.log('bar bottom px:', overlap);
}
