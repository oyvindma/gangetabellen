export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, open, screenshot }) {
  page.on('dialog', d => d.accept());
  await open();
  await page.evaluate(() => localStorage.clear());
  await open();
  await page.selectOption('#problem-count', '10');

  const strip = t => t.replace(/[✓✗!]/g, '');
  const visible = () => page.$eval('#summary-modal', e => getComputedStyle(e).display !== 'none');
  const answer = async (i, wrong) => {
    const c = Number(await page.locator(`#answer-${i}`).getAttribute('data-correct'));
    await page.fill(`#answer-${i}`, String(wrong ? c + 1 : c));
    await page.press(`#answer-${i}`, 'Enter');
  };

  // Pause: a gap while the page is hidden must not count as time on the problem.
  await page.evaluate(() => {
    const real = Date.now.bind(Date);
    window.__skew = 0;
    Date.now = () => real() + window.__skew;
  });
  const setHidden = hidden => page.evaluate(h => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  }, hidden);

  await page.focus('#answer-0');
  await setHidden(true);
  await page.evaluate(() => { window.__skew += 600000; }); // 10 minutes "screen off"
  await setHidden(false);
  await answer(0, false);
  const t0 = await page.evaluate(() => state.questionTimes[0]);
  check('hidden time is excluded from the problem time', t0 < 5000, `time=${t0}ms`);

  // Idle: 5 minutes without input (page still visible) is not counted, and one problem is capped.
  eq('modal hidden before all answered', await visible(), false);
  await page.focus('#answer-1');
  await page.evaluate(() => { window.__skew += 300000; });
  await answer(1, true);
  eq('single problem time is capped', await page.evaluate(() => state.questionTimes[1]), 30000);

  // Outliers: one extreme time must not hide the genuinely slow problem (mean+sd would miss rank 2).
  const slow = await page.evaluate(() => findSlowRanks({ 0: 2000, 1: 2500, 2: 3500, 3: 1800, 4: 30000 }).sort());
  eq('robust slow detection keeps moderately slow problems', slow, [2, 4]);

  for (let i = 2; i < 10; i++) await answer(i, false);
  await page.focus('#answer-9'); await page.locator('#answer-9').blur();
  await page.waitForTimeout(100);
  eq('summary modal shown when all answered', await visible(), true);
  eq('correct count', await page.locator('#summary-correct').textContent(), '9 av 10');
  const total = await page.evaluate(() => state.finishedAt - state.startedAt);
  check('total time excludes hidden and idle gaps', total < 90000, `total=${total}ms`);
  await screenshot('summary');

  // Practice: struggled problems (incl. the wrong one) fill a test of the same size.
  const wrongText = strip(await page.locator('#answer-1').evaluate(e => e.closest('.problem-container').textContent));
  await page.click('#practice-button');
  eq('modal closes on practice', await visible(), false);
  eq('practice test has same size', await page.locator('.problem-container').count(), 10);
  const texts = await page.$$eval('.problem-container', els => els.map(e => e.textContent.replace(/[✓✗!]/g, '')));
  check('practice test contains the wrong problem', texts.includes(wrongText));
  eq('inputs cleared for practice', await page.$$eval('.answer-input', els => els.filter(e => e.value).length), 0);
  eq('score reset for practice', await page.locator('#points-display').textContent(), '0');

  // Retry the same problems.
  for (let i = 0; i < 10; i++) await answer(i, false);
  await page.focus('#answer-9'); await page.locator('#answer-9').blur();
  await page.waitForTimeout(100);
  eq('summary shown again', await visible(), true);
  const textsNow = () => page.$$eval('.problem-container', els => els.map(e => e.textContent.replace(/[✓✗!]/g, '')).join('|'));
  const before = await textsNow();
  await page.click('#restart-button');
  eq('same problems after "Prøv igjen"', await textsNow(), before);
  eq('restart clears inputs', await page.$$eval('.answer-input', els => els.filter(e => e.value).length), 0);

  // Close button.
  for (let i = 0; i < 10; i++) await answer(i, false);
  await page.focus('#answer-9'); await page.locator('#answer-9').blur();
  await page.waitForTimeout(100);
  check('modal shown', await visible());
  await page.click('#summary-close');
  eq('close button hides modal', await visible(), false);
}
