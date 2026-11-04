import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

/**
 * Responsive harness: mọi route của admin / landlord / tenant (+ login/register)
 * trên phone / tablet / desktop. API mock bằng fixtures thực tế, không cần backend.
 * Kiểm tra: (a) không cuộn ngang trang, (b) heading chính hiển thị.
 */

const VIEWPORTS = [
  { name: 'phone', w: 375, h: 812 },
  { name: 'tablet', w: 768, h: 1024 },
  { name: 'desktop', w: 1366, h: 900 },
];

const ROUTES = {
  admin: ['dashboard', 'landlords', 'packages', 'logs', 'tickets', 'profile'],
  landlord: ['dashboard', 'buildings', 'tenants', 'utilities', 'invoices', 'financials', 'contracts', 'support', 'profile', 'plans'],
  tenant: ['dashboard', 'invoices', 'contract', 'support', 'profile'],
  public: ['login', 'register'],
};

async function login(page, role) {
  await page.addInitScript(([r]) => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
  }, [role]);
}

async function mockApi(page) {
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFor(req.method(), path)) });
  });
}

const overflow = (page) => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));

for (const vp of VIEWPORTS) {
  for (const [role, paths] of Object.entries(ROUTES)) {
    for (const p of paths) {
      const url = role === 'public' ? `/${p}` : `/${role}/${p}`;
      test(`${role} ${url} @${vp.name} — không cuộn ngang, có heading`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        if (role !== 'public') await login(page, role);
        await mockApi(page);
        await page.goto(url);
        await expect(page).toHaveURL(new RegExp(url.replace(/\//g, '\\/')));

        const heading = page.locator('h1:visible, h2:visible').first();
        await expect(heading).toBeVisible();
        await page.waitForLoadState('networkidle');

        const { scrollWidth, innerWidth } = await overflow(page);
        expect(scrollWidth, `scrollWidth ${scrollWidth} > viewport ${innerWidth}`).toBeLessThanOrEqual(innerWidth + 1);

        // (b) dialog đang mở (nếu có) không rộng hơn viewport
        for (const box of await page.getByRole('dialog').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))) {
          expect(box).toBeLessThanOrEqual(innerWidth + 1);
        }
      });
    }
  }
}

// (b) mở modal đại diện ở phone: modal không vượt viewport
test('landlord /landlord/contracts @phone — modal "Yêu cầu từ khách" vừa màn hình', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, 'landlord');
  await mockApi(page);
  await page.goto('/landlord/contracts');
  await page.getByRole('button', { name: /Yêu cầu từ khách/ }).click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  const w = await dialog.evaluate((e) => e.getBoundingClientRect().width);
  expect(w).toBeLessThanOrEqual(375);
});
