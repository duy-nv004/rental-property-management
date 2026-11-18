import { test, expect } from '@playwright/test';

/**
 * E2E (POM): Admin Redis Cache Status & Flush Panel (/admin/dashboard).
 * Tuân thủ ecc-e2e-testing (Page Object Model) & ui-ux-pro-max (accessibility + loading feedback + responsive).
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

class AdminCacheDashboardPage {
  constructor(page) {
    this.page = page;
    this.cacheCard = page.locator('[data-testid="redis-cache-card"]');
    this.statusBadge = page.locator('[data-testid="redis-status-badge"]');
    this.hitRateValue = page.locator('[data-testid="redis-hit-rate"]');
    this.latencyValue = page.locator('[data-testid="redis-latency"]');
    this.keysValue = page.locator('[data-testid="redis-keys-count"]');
    this.flushButton = page.locator('[data-testid="redis-flush-btn"]');
  }

  async seedAdminSession() {
    await this.page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('accessToken', 'e2e-admin-token');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('username', 'E2E Admin');
      localStorage.setItem('user', JSON.stringify({ id: 1, role: 'admin', name: 'E2E Admin' }));
    });
  }

  async goto() {
    await this.page.goto('/admin/dashboard');
    await expect(this.cacheCard).toBeVisible();
  }
}

const baseStats = {
  stats: { totalRevenue: 3000000, estimatedMrr: 3500000, landlordCount: 12, userCount: 45 },
  packages: { free: 5, basic: 4, pro: 3, total: 12 },
  recentActivity: [],
};

test.describe('Admin Dashboard - Redis Cache Monitoring & Flush', () => {
  test('hiển thị trạng thái Redis thật, hit rate, latency và hỗ trợ nút làm mới cache', async ({ page }) => {
    const dashboard = new AdminCacheDashboardPage(page);
    await dashboard.seedAdminSession();

    let flushed = false;
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const key = `${req.method()} ${path}`;

      if (key === 'GET /admin/stats') return json(route, baseStats);
      if (key === 'GET /admin/cache/status') {
        return json(route, {
          redis: {
            mode: 'redis',
            connected: true,
            latencyMs: 2,
            keyCount: flushed ? 0 : 18,
            memoryUsed: '1.42M',
          },
          metrics: {
            hits: flushed ? 0 : 85,
            misses: flushed ? 0 : 15,
            errors: 0,
            hitRate: flushed ? 0 : 85,
          },
        });
      }
      if (key === 'POST /admin/cache/flush') {
        await new Promise((r) => setTimeout(r, 80));
        flushed = true;
        return json(route, { message: 'Đã xóa toàn bộ bộ nhớ đệm hệ thống', clearedKeys: 18 });
      }
      return json(route, []);
    });

    await dashboard.goto();

    await expect(dashboard.statusBadge).toHaveAttribute('role', 'status');
    await expect(dashboard.statusBadge).toContainText('Redis Đang Hoạt Động');
    await expect(dashboard.hitRateValue).toContainText('85%');
    await expect(dashboard.latencyValue).toContainText('2 ms');
    await expect(dashboard.keysValue).toContainText('18');

    // Click nút làm mới cache và xác nhận popconfirm
    await dashboard.flushButton.click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();

    await expect(page.getByText(/Đã xóa 18 key bộ nhớ đệm/i)).toBeVisible();
    await expect(dashboard.keysValue).toContainText('0');
  });

  test('hiển thị rõ chế độ In-Memory Fallback khi chưa bật Redis server và xử lý lỗi khi flush thất bại', async ({ page }) => {
    const dashboard = new AdminCacheDashboardPage(page);
    await dashboard.seedAdminSession();

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const key = `${req.method()} ${path}`;

      if (key === 'GET /admin/stats') return json(route, baseStats);
      if (key === 'GET /admin/cache/status') {
        return json(route, {
          redis: {
            mode: 'memory-fallback',
            connected: true,
            latencyMs: 0,
            keyCount: 4,
            memoryUsed: null,
          },
          metrics: { hits: 10, misses: 10, errors: 0, hitRate: 50 },
        });
      }
      if (key === 'POST /admin/cache/flush') {
        return json(route, { message: 'Không thể kết nối Redis' }, 500);
      }
      return json(route, []);
    });

    await dashboard.goto();
    await expect(dashboard.statusBadge).toContainText('In-Memory Fallback');
    await expect(dashboard.hitRateValue).toContainText('50%');

    await dashboard.flushButton.click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText(/Không thể kết nối Redis/i)).toBeVisible();
  });

  test('responsive mobile 375px: thẻ Redis Cache không bị tràn ngang', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const dashboard = new AdminCacheDashboardPage(page);
    await dashboard.seedAdminSession();

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
      if (path === '/admin/stats') return json(route, baseStats);
      if (path === '/admin/cache/status') {
        return json(route, {
          redis: { mode: 'redis', connected: true, latencyMs: 1, keyCount: 6, memoryUsed: '1.1M' },
          metrics: { hits: 12, misses: 4, errors: 0, hitRate: 75 },
        });
      }
      return json(route, []);
    });

    await dashboard.goto();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

