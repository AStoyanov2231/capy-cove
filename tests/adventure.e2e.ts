import { test, expect, type Page } from '@playwright/test';
import { ITEMS, QUESTS } from '../src/game/content';

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

test('two friends complete all three quests through real movement and interaction', async ({ browser }) => {
  test.setTimeout(300000);
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
  await expect(host.locator('#label-p1')).toBeVisible();
  for (const [index, quest] of QUESTS.entries()) {
    const items = ITEMS.filter(i => i.kind === quest.kind).slice(0, quest.amount);
    for (const [i, item] of items.entries()) {
      const page = i % 2 === 0 ? host : guest, id = i % 2 === 0 ? 'p1' : 'p2';
      await walkTo(page, id, item);
      await expect(page.locator('#interact-button')).toBeEnabled();
      await page.keyboard.press('e');
      await expect(host.locator(`#bag-${quest.kind}`)).toHaveText(String(i + 1));
      await expect(guest.locator(`#bag-${quest.kind}`)).toHaveText(String(i + 1));
    }
    await walkTo(host, 'p1', quest); await walkTo(guest, 'p2', quest);
    await host.keyboard.press('e');
    await expect(host.locator('#quest-hint')).toContainText('Your part is done');
    await guest.keyboard.press('e');
    const nextTitle = QUESTS[index + 1]?.title || 'A very good day.';
    await expect(host.getByRole('heading', { name: nextTitle, exact: true })).toBeVisible();
    await expect(guest.getByRole('heading', { name: nextTitle, exact: true })).toBeVisible();
  }
  await expect(host.getByRole('dialog', { name: 'Adventure complete' })).toBeVisible();
  await expect(guest.getByRole('dialog', { name: 'Adventure complete' })).toBeVisible();
  await host.screenshot({ path: 'test-results/adventure-complete.png' });
  await host.getByRole('button', { name: 'Stay a little longer' }).click();
  await host.getByRole('button', { name: 'Island journal' }).click();
  await expect(host.locator('.journal-list .done')).toHaveCount(3);
  await hostContext.close(); await guestContext.close();
});
