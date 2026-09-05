import { test, expect, type Page } from '@playwright/test';

async function join(page: Page, url: string, name: string, guest = false, rejoining = false): Promise<void> {
  await page.goto(url);
  await page.getByLabel('Your capybara’s name').fill(name);
  if (guest) {
    await page.getByRole('button', { name: 'Female', exact: true }).click();
    await page.getByRole('button', { name: 'sand fur' }).click();
    await page.getByRole('button', { name: 'flower accessory' }).click();
  }
  await page.getByRole('button', { name: guest ? 'Join your friend’s island' : 'Create an island' }).click();
  if (rejoining) await expect(page.getByRole('heading', { name: 'Sunlit meadows' })).toBeVisible();
  else await expect(page.getByRole('button', { name: 'I’m ready to explore' })).toBeVisible();
}

test('two actual WebRTC peers choose capybaras, spawn, collect, reject a third, and reconnect', async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const errors: string[] = [];
  host.on('pageerror', e => errors.push(e.message)); guest.on('pageerror', e => errors.push(e.message));
  await join(host, 'http://127.0.0.1:5173', 'Mango');
  const invite = await host.getByLabel('Invite link', { exact: true }).inputValue();
  await host.screenshot({ path: 'test-results/lobby-desktop.png' });
  await join(guest, invite, 'Clover', true);
  await expect(host.getByText('Clover', { exact: true })).toBeVisible();
  await expect(guest.getByText('Male · honey coat', { exact: true })).toBeVisible();
  await expect(host.getByText('Female · sand coat', { exact: true })).toBeVisible();
  const third = await browser.newPage({ deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  await third.goto(invite); await third.getByRole('button', { name: 'Join your friend’s island' }).click();
  await expect(third.getByText('This island already has two capybaras.', { exact: false })).toBeVisible(); await third.close();
  await host.getByRole('button', { name: 'I’m ready to explore' }).click();
  await expect(host.getByRole('button', { name: 'Ready! Waiting for your friend' })).toBeVisible();
  await guest.getByRole('button', { name: 'I’m ready to explore' }).click();
  await expect(host.getByRole('heading', { name: 'Sunlit meadows' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Sunlit meadows' })).toBeVisible();
  await expect(host.locator('#label-p1')).toHaveAttribute('data-x', '-2');
  await expect(guest.locator('#label-p2')).toHaveAttribute('data-x', '0');
  await host.screenshot({ path: 'test-results/game-desktop.png' });
  // The first orange is within reach of the shared spawn. Input is a real keyboard action.
  await expect(host.locator('#interact-button')).toBeEnabled();
  await host.keyboard.press('e');
  await expect(host.locator('#bag-orange')).toHaveText('1');
  await expect(guest.locator('#bag-orange')).toHaveText('1');
  const before = Number(await guest.locator('#label-p2').getAttribute('data-x'));
  await guest.keyboard.down('d');
  await expect.poll(async () => Number(await host.locator('#label-p2').getAttribute('data-x'))).toBeGreaterThan(before + 0.7);
  await guest.keyboard.up('d');
  await guest.getByRole('button', { name: 'Send a heart (H)' }).click();
  await guest.getByRole('button', { name: 'Leave island', exact: true }).click();
  await guest.getByRole('dialog').getByRole('button', { name: 'Leave island', exact: true }).click();
  await expect(host.locator('#connection-banner')).toBeVisible();
  const paused = await host.locator('#label-p1').getAttribute('data-x');
  await host.keyboard.down('d'); await host.waitForTimeout(350); await host.keyboard.up('d');
  await expect(host.locator('#label-p1')).toHaveAttribute('data-x', paused!);
  await join(guest, invite, 'Clover', true, true);
  await expect(host.locator('#connection-banner')).toBeHidden();
  await expect(guest.locator('#bag-orange')).toHaveText('1');
  await expect(guest.locator('#label-p2')).toContainText('Clover');
  expect(errors).toEqual([]);
  await hostContext.close(); await guestContext.close();
});

test('desktop and mobile setup, keyboard-accessible help, touch play, and no overflow', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A wild world. Make it your own.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/setup-desktop.png' });
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  const phone = await mobile.newPage();
  await phone.goto('http://127.0.0.1:5173');
  await expect(phone.getByRole('button', { name: 'Create an island' })).toBeVisible();
  await phone.screenshot({ path: 'test-results/setup-mobile.png', fullPage: true });
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await join(page, 'http://127.0.0.1:5173', 'Mango');
  const invite = await page.getByLabel('Invite link', { exact: true }).inputValue();
  await join(phone, invite, 'Clover', true);
  await page.getByRole('button', { name: 'I’m ready to explore' }).click();
  await phone.getByRole('button', { name: 'I’m ready to explore' }).click();
  await expect(phone.getByRole('heading', { name: 'Sunlit meadows' })).toBeVisible();
  await phone.screenshot({ path: 'test-results/game-mobile.png' });
  const button = phone.getByRole('button', { name: 'Move right', exact: true });
  await expect(button).toBeVisible();
  const box = (await button.boundingBox())!;
  await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await phone.mouse.down();
  await expect.poll(async () => Number(await page.locator('#label-p2').getAttribute('data-x'))).toBeGreaterThan(0.5);
  await phone.mouse.up();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mobile.close();
});
