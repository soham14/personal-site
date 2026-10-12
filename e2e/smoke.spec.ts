import { test, expect, type Page } from '@playwright/test';
import { PROFILE, MENTORS, MAPS, WORLD, TRIALS } from '../src/content.ts';

// Smoke tests: the real build in real browsers. They assert what a visitor sees and can do.
// `?e2e` only exposes a hook used to SET UP scenarios (e.g. start beside a gate); checks go through the page.

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?e2e');
  await expect(page.locator('#boot')).toHaveCount(0, { timeout: 15_000 }); // loading screen gone = world drawn
  await expect(page.locator('#game canvas')).toBeVisible();
  return errors;
}
const dot = (page: Page) => page.locator('[data-mini-dot]');
const dotX = async (page: Page) => (await dot(page).boundingBox())!.x;
const dotBottom = async (page: Page) => parseFloat(await dot(page).evaluate((e) => (e as HTMLElement).style.bottom || '0'));
const place = (page: Page, x: number, tier = 0) => page.evaluate(([x, t]) => { const c = (window as any).__cq; c.initSim(t); c.sim.px = x; }, [x, tier]);

test('loads without errors and shows the HUD', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('[data-act="sound"]')).toBeVisible();
  await expect(page.locator('[data-act="resume"]')).toBeVisible();
  await expect(page.locator('[data-act="profile"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors.filter((e) => !/favicon|net::ERR/.test(e))).toEqual([]);
});

test('sound button toggles on and off', async ({ page }) => {
  await open(page);
  const btn = page.locator('[data-act="sound"]');
  const before = await btn.getAttribute('aria-pressed');
  await btn.click();
  await expect(btn).not.toHaveAttribute('aria-pressed', before!);
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', before!);
});

test('résumé opens with the content and closes back to the game', async ({ page }) => {
  await open(page);
  await page.locator('[data-act="resume"]').click();
  const r = page.locator('.cq-resume');
  await expect(r.locator('h1')).toHaveText(PROFILE.name);
  await expect(r.getByText(PROFILE.email).first()).toBeVisible();
  await r.locator('[data-act="closeResume"]').click();
  await expect(r).toBeHidden();
});

test('profile window opens and switches tabs', async ({ page }) => {
  await open(page);
  await page.locator('[data-act="profile"]').click();
  const w = page.getByRole('dialog', { name: 'Character info' });
  await expect(w).toBeVisible();
  for (const tab of ['skills', 'trophies', 'journey']) {
    await w.locator(`[data-tab="${tab}"]`).click();
    await expect(w.locator(`[data-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
  }
  await page.keyboard.press('Escape');
  await expect(w).toBeHidden();
});

test.describe('keyboard (desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard controls');

  test('walking right moves the hero; jumping lifts it', async ({ page }) => {
    await open(page);
    await page.locator('#game').click({ position: { x: 5, y: 5 } }); // focus the game
    const x0 = await dotX(page);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
    expect(await dotX(page)).toBeGreaterThan(x0);
    const b0 = await dotBottom(page);
    await page.keyboard.press('Space');
    await expect.poll(() => dotBottom(page), { timeout: 2000 }).toBeGreaterThan(b0);
    await expect.poll(() => dotBottom(page), { timeout: 3000 }).toBe(b0); // lands again
  });

  test('Space jumps after clicking a HUD button (does not re-press it)', async ({ page }) => {
    await open(page);
    const btn = page.locator('[data-act="sound"]');
    await btn.click();
    const pressed = await btn.getAttribute('aria-pressed');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await expect(btn).toHaveAttribute('aria-pressed', pressed!);
  });

  test('talking to the first mentor shows their dialogue', async ({ page }) => {
    await open(page);
    await place(page, MENTORS[0].x - 30);
    await page.locator('#game').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowUp');
    const d = page.getByRole('dialog', { name: 'NPC dialogue' });
    await expect(d).toContainText(MENTORS[0].name);
    await d.locator('button', { hasText: 'End chat' }).click();
    await expect(d).toBeHidden();
  });

  test('crossing the first gate: trial offered, skipped, then job advancement', async ({ page }) => {
    await open(page);
    await place(page, WORLD.GATES[0] - 150);
    await page.locator('#game').click({ position: { x: 5, y: 5 } });
    await page.keyboard.down('ArrowRight');
    const trial = page.getByRole('dialog', { name: `Trial from ${MENTORS[TRIALS.hex.mentor].name}` });
    await expect(trial).toBeVisible({ timeout: 5000 });
    await page.keyboard.up('ArrowRight');
    await trial.locator('button', { hasText: 'Skip trial' }).click();
    await expect(trial).toBeHidden();
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowRight');
    await expect(page.getByText('JOB ADVANCED!')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cq-mini-title')).toContainText(MAPS[1].name, { timeout: 8000 });
  });
});

for (const kind of Object.keys(TRIALS) as (keyof typeof TRIALS)[]) {
  test(`trial "${TRIALS[kind].name}" starts and can be quit`, async ({ page }) => {
    await open(page);
    await page.evaluate((k) => (window as any).__cq.emit('trialOffer', { kind: k, gate: false }), kind);
    const prompt = page.getByRole('dialog', { name: `Trial from ${MENTORS[TRIALS[kind].mentor].name}` });
    await expect(prompt).toBeVisible();
    await prompt.locator('button', { hasText: 'Start trial' }).click();
    await expect(prompt).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).__cq.state.trial?.phase)).toBe('play');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => (window as any).__cq.state.trial)).toBeNull();
  });
}

test.describe('touch (phones)', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch controls');

  test('holding the right half walks right; JUMP button jumps', async ({ page }) => {
    await open(page);
    const vp = page.viewportSize()!;
    const x0 = await dotX(page);
    // Hold a finger on the right half of the screen.
    await page.locator('#game').dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: vp.width * 0.8, clientY: vp.height * 0.5, button: 0, buttons: 1 });
    await page.waitForTimeout(700);
    await page.locator('#game').dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: vp.width * 0.8, clientY: vp.height * 0.5 });
    expect(await dotX(page)).toBeGreaterThan(x0);
    const b0 = await dotBottom(page);
    await page.getByRole('button', { name: 'Jump' }).dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: true });
    await expect.poll(() => dotBottom(page), { timeout: 2000 }).toBeGreaterThan(b0);
  });

  test('landscape: dialogue fits on screen; résumé text size survives rotation', async ({ page }) => {
    await open(page);
    const portrait = page.viewportSize()!;
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await page.evaluate(() => (window as any).__cq.emit('talk', { i: 0 }));
    const d = page.getByRole('dialog', { name: 'NPC dialogue' });
    await expect(d).toBeVisible();
    const box = (await d.boundingBox())!;
    const diag = await d.evaluate((e) => ({ pz: getComputedStyle(document.documentElement).getPropertyValue('--pz'), zoom: getComputedStyle(e).zoom, ih: innerHeight, rectH: e.getBoundingClientRect().height, offH: (e as HTMLElement).offsetHeight }));
    console.log('landscape diag', JSON.stringify(diag), JSON.stringify(box));
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(portrait.width + 1);
    await d.locator('button', { hasText: 'End chat' }).click();

    await page.setViewportSize(portrait);
    await page.locator('[data-act="resume"]').click();
    const h1 = page.locator('.cq-resume h1');
    await expect(h1).toBeVisible();
    const size = () => h1.evaluate((e) => getComputedStyle(e).fontSize);
    const before = await size();
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await page.setViewportSize(portrait);
    expect(await size()).toBe(before);
  });
});
