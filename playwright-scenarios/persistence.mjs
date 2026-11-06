export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, domClick, open, screenshot }) {
  let dialogs = [];
  let accept = true;
  page.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  await open();
  await page.evaluate(() => localStorage.clear());
  await open();

  const num = async s => Number(await page.locator(s).textContent());
  const problemsText = () => page.$$eval('.problem-container', els => els.map(e => e.textContent).join('|'));
  const filled = () => page.$$eval('.answer-input', els => els.filter(e => e.value).length);

  // no dialog while nothing is typed
  await domClick('input[name=operation_type][value=add]');
  eq('no confirm without progress', dialogs.length, 0);
  await domClick('input[name=operation_type][value=add]');

  // answer: one correct, one wrong
  const c0 = await page.locator('#answer-0').getAttribute('data-correct');
  await page.fill('#answer-0', c0); await page.press('#answer-0', 'Enter');
  await page.fill('#answer-1', '999'); await page.press('#answer-1', 'Enter');
  await page.fill('#answer-2', '7'); // half-typed, never checked
  const points = await num('#points-display');
  check('points awarded', points > 0);
  const before = await problemsText();

  // reload restores everything
  await open();
  eq('same problems after reload', await problemsText(), before);
  eq('answers restored', await filled(), 3);
  eq('points restored', await num('#points-display'), points);
  check('solved state restored', (await page.locator('#answer-0').getAttribute('data-solved')) === '1');
  check('incorrect state restored', await page.locator('#answer-1').evaluate(e => e.classList.contains('incorrect-answer')));
  check('progress restored', parseFloat(await page.$eval('#progress-bar', e => e.style.width)) > 0);
  await page.fill('#answer-0', c0); await page.press('#answer-0', 'Enter');
  eq('no double points after restore', await num('#points-display'), points);

  // declined config change reverts and keeps answers
  accept = false; dialogs = [];
  await domClick('input[name=operation_type][value=divide]');
  eq('confirm shown', dialogs.length, 1);
  eq('checkbox reverted', await page.$eval('input[name=operation_type][value=divide]', e => e.checked), false);
  eq('answers kept', await filled(), 3);
  await domClick('#order-toggle');
  eq('order toggle reverted', await page.$eval('#order-toggle', e => e.checked), false);
  await domClick('#show-results');
  eq('show-answers reverted', await page.$eval('#show-results', e => e.checked), false);
  eq('confirm for each change', dialogs.length, 3);

  // declined clear keeps answers
  dialogs = [];
  await domClick('#clear-btn');
  eq('clear asks', dialogs.length, 1);
  eq('clear declined keeps answers', await filled(), 3);

  // accepted config change wipes
  accept = true; dialogs = [];
  await domClick('#order-toggle');
  eq('accepted change asks', dialogs.length, 1);
  eq('answers wiped', await filled(), 0);
  eq('score reset', await num('#points-display'), 0);
  await open();
  eq('sorted mode persists', await page.$eval('#order-toggle', e => e.checked), true);
  eq('100 problems after reload', await page.locator('.problem-container').count(), 100);

  // accepted clear gives a fresh, empty test that persists as such
  await page.fill('#answer-5', '1'); await page.press('#answer-5', 'Enter');
  dialogs = [];
  await domClick('#clear-btn');
  eq('clear accepted asks', dialogs.length, 1);
  eq('clear wipes answers', await filled(), 0);
  await open();
  eq('still empty after reload', await filled(), 0);

  // clear with nothing typed: no dialog
  dialogs = [];
  await domClick('#clear-btn');
  eq('no confirm when nothing to lose', dialogs.length, 0);

  // show answers with progress, persisted
  await domClick('#show-results');
  await open();
  eq('show-answers persists', await page.$$eval('.answer-input', els => els.every(e => e.value === e.dataset.correct && e.readOnly)), true);
  await screenshot('persistence');
}
