import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginLandlord(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E Landlord');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'E2E Landlord', role: 'landlord', plan: 'pro' }));
  });
}

const STATS = {
  totalExpected: 10000000,
  totalCollected: 8000000,
  unpaidAmount: 2000000,
  unpaidRooms: 1,
  totalRepairCost: 500000,
  netProfit: 7500000,
  occupancyRate: 85,
  occupiedRooms: 6,
  totalRooms: 7,
  invoiceCount: 3,
  trend12Months: [
    { month: 1, expected: 10000000, collected: 8000000, repairCost: 500000, profit: 7500000 },
  ],
};

const INVOICES = [
  {
    id: 101,
    month: 11,
    year: 2026,
    roomPrice: 3000000,
    electricityOld: 10,
    electricityNew: 60,
    electricityPrice: 3500,
    electricityTotal: 175000,
    waterOld: 5,
    waterNew: 10,
    waterPrice: 20000,
    waterTotal: 100000,
    serviceTotal: 150000,
    repairFee: 0,
    totalAmount: 3425000,
    paidAmount: 0,
    isPaid: false,
    dueDate: '2026-11-30',
    roomDetails: { roomNumber: '101', building: { id: 1, name: 'Sunrise' } },
    tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
  },
];

test.describe('Xuất Excel/CSV & In PDF Hợp đồng / Hóa đơn', () => {
  test.beforeEach(async ({ page }) => {
    await loginLandlord(page);
    await page.route('**/api/notifications**', (r) => json(r, { notifications: [], unreadCount: 0 }));
    await page.route('**/api/auth/profile', (r) => json(r, { id: 1, name: 'E2E Landlord', plan: 'pro' }));
  });

  test('Financials cho phép tải file Excel/CSV báo cáo tài chính', async ({ page }) => {
    await page.route('**/api/invoices/status**', (r) => json(r, { stats: STATS }));

    await page.goto('/landlord/financials');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /xuất excel/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/bao-cao-tai-chinh.*\.csv$/i);
    const filePath = await download.path();
    const content = await fs.readFile(filePath, 'utf8');
    expect(content).toContain('BÁO CÁO TÀI CHÍNH HOMESYNC');
    expect(content).toContain('7500000');
  });

  test('InvoiceManager cho phép xuất Excel danh sách hóa đơn và mở bản in PDF hóa đơn', async ({ page }) => {
    await page.route('**/api/invoices**', (r) => json(r, INVOICES));

    await page.goto('/landlord/invoices');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /xuất excel/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/danh-sach-hoa-don.*\.csv$/i);

    await page.getByRole('button', { name: /xem/i }).first().click();
    await expect(page.getByRole('button', { name: /in \/ xuất pdf/i })).toBeVisible();
  });
});
