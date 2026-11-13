// Design switcher + index.html router. Runs against every design page (see scripts/check.sh).
export const viewports = ['desktop', 'phone'];
export default async function ({ page, check, eq, open, screenshot }) {
  await open();
  await page.evaluate(() => localStorage.clear());
  await open();

  const url = f => new URL(f, page.url()).href;
  const here = await page.evaluate(() => document.body.dataset.theme);
  const saved = () => page.evaluate(() => localStorage.getItem('gangetabellen.theme'));
  const current = () => page.$eval('#theme-switcher [aria-current]', a => a.dataset.theme);
  const goTo = async (theme) => {
    await Promise.all([
      page.waitForURL(new RegExp(`index-${theme}\\.html`)),
      page.click(`#theme-switcher a[data-theme="${theme}"]`)
    ]);
    await page.waitForLoadState('load');
  };

  eq('four designs offered', await page.$$eval('#theme-switcher a', as => as.map(a => a.dataset.theme)), ['classic', 'minecraft', 'cat', 'build']);
  eq('current design is marked', await current(), here);
  eq('nothing saved before the first switch', await saved(), null);

  // router with nothing saved -> classic
  await page.goto(url('index.html'));
  await page.waitForURL(/index-classic\.html/);
  eq('index.html defaults to classic', await page.evaluate(() => document.body.dataset.theme), 'classic');

  // progress typed in one design is still there in the next
  await page.fill('#answer-0', '1');

  let first = true;
  for (const theme of ['cat', 'build', 'minecraft', 'classic']) {
    await goTo(theme);
    eq(`switched to ${theme}`, await page.evaluate(() => document.body.dataset.theme), theme);
    eq(`${theme} is marked current`, await current(), theme);
    eq(`${theme} is saved`, await saved(), theme);
    if (first) {
      eq('answer survives the switch', await page.inputValue('#answer-0'), '1');
      first = false;
    }

    // entry point sends us back to the remembered design
    await page.goto(url('index.html'));
    await page.waitForURL(new RegExp(`index-${theme}\\.html`));
    eq(`index.html opens ${theme}`, await page.evaluate(() => document.body.dataset.theme), theme);
  }

  // clicking the design you are already in does nothing
  const before = page.url();
  await page.click('#theme-switcher [aria-current]');
  eq('clicking the current design stays put', page.url(), before);

  // unknown saved value falls back to classic
  await page.evaluate(() => localStorage.setItem('gangetabellen.theme', 'nope'));
  await page.goto(url('index.html'));
  await page.waitForURL(/index-classic\.html/);
  check('unknown saved design falls back to classic', true);

  await screenshot('switcher');
}
