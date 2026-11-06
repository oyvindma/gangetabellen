export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, domClick, open, screenshot }) {
  page.on('dialog', d => d.accept()); // accept the "discard progress" confirmations
  await open();
  const num = async s => Number(await page.locator(s).textContent());
  const count = () => page.locator('.problem-container').count();
  eq('100 problems by default', await count(), 100);
  eq('only multiply by default: all have "×"-like operator', await page.locator('.problem-container').first().textContent().then(t => /[×x*]/.test(t)), true);

  // wrong answer
  eq('points start 0', await num('#points-display'), 0);
  await page.fill('#answer-0', '999');
  await page.press('#answer-0', 'Enter');
  check('wrong answer marked incorrect', await page.locator('#answer-0').evaluate(e => e.classList.contains('incorrect-answer')));
  eq('wrong answer no points', await num('#points-display'), 0);

  // correct answer, points only once
  const c0 = await page.locator('#answer-0').getAttribute('data-correct');
  await page.fill('#answer-0', c0);
  await page.press('#answer-0', 'Enter');
  const p1 = await num('#points-display');
  check('correct answer awards points', p1 > 0, `points=${p1}`);
  check('input marked solved', (await page.locator('#answer-0').getAttribute('data-solved')) === '1');
  await page.focus('#answer-0'); await page.press('#answer-0', 'Enter');
  eq('re-checking does not re-award', await num('#points-display'), p1);

  // invalid input
  await page.fill('#answer-2', 'abc'); await page.press('#answer-2', 'Enter');
  check('non-numeric flagged invalid', await page.locator('#answer-2').evaluate(e => e.classList.contains('invalid-answer')));

  // progress via blur
  await page.fill('#answer-3', '1'); await page.focus('#answer-4');
  const w = await page.$eval('#progress-bar', e => e.style.width);
  check('progress advances after blur', parseFloat(w) > 0, `width=${w}`);

  // show answers
  await domClick('#show-results');
  const filled = await page.$$eval('.answer-input', els => els.every(e => e.value === e.dataset.correct && e.readOnly));
  check('show answers fills all and readonly', filled);
  eq('score reset on show answers', await num('#points-display'), 0);
  await domClick('#show-results');
  eq('hide answers clears inputs', await page.$$eval('.answer-input', els => els.filter(e => e.value).length), 0);

  // operations: all four
  for (const v of ['divide','add','subtract']) await domClick(`input[name=operation_type][value=${v}]`);
  eq('still 100 problems with 4 ops', await count(), 100);
  const txt = await page.$$eval('.problem-container', els => els.map(e => e.textContent));
  check('mixed operators present', ['+','−','-','÷',':','×'].filter(o => txt.some(t => t.includes(o))).length >= 3);

  // non-divisible number selection: only 1,2,3 (3 numbers)
  for (let n = 4; n <= 10; n++) await domClick(`input[name=a_number][value="${n}"]`);
  eq('100 problems with 3 numbers', await count(), 100);

  // sorted order & columns
  await domClick('#order-toggle');
  const cols = await page.$eval('#problems-list', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  const ranks = await page.$$eval('.problem-container', els => els.map(e => +e.dataset.rank));
  eq('all ranks present after sort', new Set(ranks).size, 100);
  console.log('columns:', cols);
  if (cols > 1) check('column-first order (not plain 0..99)', ranks.some((r,i)=>r!==i));
  await screenshot('sorted');

  // defaults when all unticked
  await domClick('#order-toggle');
  for (const n of [1,2,3]) await domClick(`input[name=a_number][value="${n}"]`);
  eq('unticking all numbers restores 10', await page.$$eval('input[name=a_number]:checked', e => e.length), 10);
}
