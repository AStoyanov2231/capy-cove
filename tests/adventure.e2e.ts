import { test, expect, type Page } from '@playwright/test';
import { CROP_SECONDS } from '../src/game/content';

/** Exercise DOM keyboard controls, not a state/teleport test hook. In-page steering avoids
 * automation round-trip latency overshooting targets on CI's software WebGL renderer. */
async function walkTo(page: Page, id: 'p1' | 'p2', target: { x: number; z: number }): Promise<void> {
  await page.evaluate(async ({ id, target }) => {
    const held = new Set<string>();
    const keyEvent = (type: string, key: string) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
    const deadline = performance.now() + 30000;
    let settledSince = 0;
    try {
      while (performance.now() < deadline) {
        const label = document.getElementById(`label-${id}`)!;
        const dx = target.x - Number(label.dataset.x), dz = target.z - Number(label.dataset.z);
        if (Math.hypot(dx, dz) < 1.2) {
          for (const key of held) keyEvent('keyup', key);
          held.clear();
          if (!settledSince) settledSince = performance.now();
          if (performance.now() - settledSince > 400) return;
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        settledSince = 0;
        const h = dx * 0.794 - dz * 0.607, v = dx * 0.607 + dz * 0.794;
        const next = new Set<string>();
        if (Math.abs(h) > Math.abs(v) * 0.45) next.add(h > 0 ? 'd' : 'a');
        if (Math.abs(v) > Math.abs(h) * 0.45) next.add(v > 0 ? 's' : 'w');
        for (const key of held) if (!next.has(key)) { keyEvent('keyup', key); held.delete(key); }
        for (const key of next) if (!held.has(key)) { keyEvent('keydown', key); held.add(key); }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error(`Could not walk ${id} to ${target.x}, ${target.z}`);
    } finally { for (const key of held) keyEvent('keyup', key); }
  }, { id, target });
  await page.waitForTimeout(200);
}

test('two friends rotate, store materials independently indoors, and grow crops', async ({ browser }) => {
  test.setTimeout(240000);
  // A small viewport reduces software-renderer load without changing game rules.
  const hostContext = await browser.newContext({ viewport: { width: 960, height: 720 }, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  const guestContext = await browser.newContext({ viewport: { width: 960, height: 720 }, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  await host.goto('http://127.0.0.1:5173');
  await host.getByLabel('Your capybara’s name').fill('Mango');
  await host.getByRole('button', { name: 'Create an island' }).click();
  const invite = host.getByLabel('Invite link', { exact: true });
  await expect(invite).toBeVisible();
  await guest.goto(await invite.inputValue());
  await guest.getByLabel('Your capybara’s name').fill('Clover');
  await guest.getByRole('button', { name: 'Female', exact: true }).click();
  await guest.getByRole('button', { name: 'Join your friend’s island' }).click();
  await guest.getByRole('button', { name: 'I’m ready to explore' }).click();
  await host.getByRole('button', { name: 'I’m ready to explore' }).click();
  await expect(host.getByRole('heading', { name: 'Sunlit meadows', exact: true })).toBeVisible();
  await host.locator('[data-panel="build"]').click();
  await expect(host.locator('.building-grid [data-select]')).toHaveCount(6);
  await host.locator('[data-blueprint="home"]').click();
  for (const rotation of [90, 180, 270, 0]) {
    await host.keyboard.press('r');
    await expect(host.locator('#build-placement')).toHaveAttribute('data-rotation', String(rotation));
  }
  await expect(host.getByRole('button', { name: 'Place building', exact: true })).toBeEnabled();
  await host.getByRole('button', { name: 'Place building', exact: true }).click();
  await expect(host.locator('#bag-wood')).toHaveText('4');
  await expect(guest.locator('#bag-wood')).toHaveText('4');
  await host.keyboard.press('Escape');
  await guest.locator('[data-panel="craft"]').click();
  await guest.locator('[data-select="hoe"]').click();
  await guest.getByRole('button', { name: 'Craft garden hoe', exact: true }).click();
  await expect(guest.locator('#bag-wood')).toHaveText('1');
  await guest.getByRole('button', { name: 'Close sandbox menu' }).click();
  await guest.locator('[data-panel="farm"]').click();
  await guest.getByRole('button', { name: 'Plant wheat', exact: true }).click();
  await expect(host.locator('#bag-seed')).toHaveText('5');
  const plantedAt = Date.now();
  await walkTo(host, 'p1', { x: -2, z: 4.5 });
  await expect(host.locator('#interact-label')).toHaveText('Enter home house');
  await host.keyboard.press('e');
  await expect(host.getByRole('heading', { name: 'Hearth room', exact: true })).toBeVisible();
  await expect(guest.locator('#label-p1')).toHaveAttribute('data-location', 'building-0:0');
  await expect(guest.locator('#label-p2')).toHaveAttribute('data-location', 'outside');
  await walkTo(host, 'p1', { x: 0, z: 0 });
  await walkTo(host, 'p1', { x: 3.9, z: 2.6 });
  await expect(host.locator('#interact-label')).toHaveText('Use home chest');
  await host.keyboard.press('e');
  await host.getByLabel('Material', { exact: true }).selectOption('stone');
  await host.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(guest.locator('#bag-stone')).toHaveText('1');
  await host.waitForTimeout(400);
  await host.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(guest.locator('#bag-stone')).toHaveText('2');
  await host.getByRole('button', { name: 'Close Home chest', exact: true }).click();
  await host.screenshot({ path: 'test-results/sandbox-interior.png' });
  await expect(guest.locator('#friend-location')).toHaveAttribute('title', /inside home house/);
  await guest.waitForTimeout(Math.max(0, CROP_SECONDS * 1000 + 1500 - (Date.now() - plantedAt)));
  await walkTo(guest, 'p2', { x: 2, z: 10 });
  await expect(guest.locator('#interact-label')).toHaveText('Harvest wheat');
  await guest.keyboard.press('e');
  await expect(host.locator('#bag-seed')).toHaveText('7');
  await expect(guest.locator('#bag-seed')).toHaveText('7');
  await guest.locator('[data-panel="bag"]').click();
  await guest.locator('[data-select="wheat"]').click();
  await expect(guest.locator('#stock-wheat')).toHaveText('3');
  await guest.getByRole('button', { name: 'Close sandbox menu' }).click();
  await walkTo(host, 'p1', { x: 0, z: 4 });
  await host.keyboard.press('e');
  await expect(host.locator('#label-p1')).toHaveAttribute('data-location', 'outside');
  await host.screenshot({ path: 'test-results/sandbox-outdoors.png' });
  await hostContext.close(); await guestContext.close();
});
