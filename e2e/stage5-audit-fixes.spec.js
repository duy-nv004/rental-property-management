import { test, expect } from '@playwright/test';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginLandlord(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-stage5-init')) return;
    sessionStorage.setItem('e2e-stage5-init', '1');
    localStorage.setItem('accessToken', 'e2e-landlord-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'Chủ trọ E2E');
    localStorage.setItem('user', JSON.stringify({ id: 5, name: 'Chủ trọ E2E', role: 'landlord' }));
  });
}

const PUBLIC_ROOM_101 = {
  id: 101,
  buildingId: 1,
  roomNumber: '101',
  price: 3500000,
  depositAmount: 3500000,
  area: 25,
  capacity: 2,
  status: 'empty',
  description: 'Phòng rộng rãi gần công viên',
  images: [],
  amenities: ['Wifi', 'Điều hòa'],
  building: {
    id: 1,
    name: 'Sunshine Cầu Giấy',
    address: '12 Đường Trần Thái Tông',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng Hậu',
    latitude: 21.036,
    longitude: 105.79,
    service: { electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000 },
    landlord: { id: 5, name: 'Chủ nhà Minh', phone: '0909111222' },
  },
};

const CONTRACT_WITHOUT_SIGNATURES = {
  id: 11,
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  rentPrice: 3000000,
  deposit: 5000000,
  electricityPrice: 3500,
  waterPrice: 20000,
  internetPrice: 100000,
  cleaningPrice: 50000,
  numTenants: 2,
  tenant: { id: 90, name: 'Nguyễn Văn Thuê', phone: '0912345678' },
  tenantName: 'Nguyễn Văn Thuê',
  tenantPhone: '0912345678',
  landlordName: 'Chủ trọ E2E',
  room: { id: 5, roomNumber: '101', building: { id: 7, name: 'Sunshine', landlord: { name: 'Chủ trọ E2E' } } },
};

test.describe('Stage 5 Audit Fixes E2E', () => {
  test('Flow 1: Khách vãng lai đặt lịch xem phòng không nhập mật khẩu nhận mật khẩu tạm & nút sao chép', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
      if (path === '/public/rooms/101' && req.method() === 'GET') {
        return json(route, PUBLIC_ROOM_101);
      }
      if (path === '/public/bookings' && req.method() === 'POST') {
        return json(
          route,
          {
            message: 'Đã gửi lịch hẹn xem phòng thành công!',
            booking: { id: 177, roomId: 101, type: 'viewing', status: 'pending' },
            auth: {
              token: 'guest-jwt-177',
              user: { id: 99, name: 'Lê Khách Mới', phone: '0912345678', role: 'tenant' },
              isNewAccount: true,
              requiresLogin: false,
              generatedPassword: 'Hs@9f8e7d6c',
            },
          },
          201
        );
      }
      return json(route, { message: 'Mock skip' }, 404);
    });

    await page.goto('/rooms/101');
    await page.getByRole('button', { name: 'Đặt lịch xem phòng' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Họ và tên').fill('Lê Khách Mới');
    await dialog.getByLabel('Số điện thoại').fill('0912345678');
    await dialog.getByRole('button', { name: 'Xác nhận đặt lịch xem phòng' }).click();

    const passwordAlert = dialog.getByTestId('guest-generated-password-alert');
    await expect(passwordAlert).toBeVisible();
    await expect(dialog.getByTestId('guest-generated-password-value')).toHaveText('Hs@9f8e7d6c');

    const copyBtn = dialog.getByTestId('btn-copy-generated-password');
    await expect(copyBtn).toContainText('Sao chép mật khẩu');
    await copyBtn.click();
    await expect(copyBtn).toContainText('Đã sao chép!');
  });

  test('Flow 2: Xem chi tiết hợp đồng tự lazy-load GET /contracts/:id khi danh sách lược bỏ chữ ký', async ({ page }) => {
    await loginLandlord(page);
    let detailFetched = 0;

    await page.route('**/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
      if (path === '/contracts' && req.method() === 'GET') {
        return json(route, [CONTRACT_WITHOUT_SIGNATURES]);
      }
      if (path === '/contracts/11' && req.method() === 'GET') {
        detailFetched += 1;
        return json(route, {
          ...CONTRACT_WITHOUT_SIGNATURES,
          landlordSignature: TINY_PNG_DATA_URL,
          landlordSignedAt: '2026-01-01T10:00:00Z',
          tenantSignature: TINY_PNG_DATA_URL,
          tenantSignedAt: '2026-01-02T10:00:00Z',
        });
      }
      if (path === '/contracts/requests') return json(route, []);
      if (path === '/manage/buildings') return json(route, [{ id: 7, name: 'Sunshine' }]);
      if (path === '/manage/bookings') return json(route, []);
      return json(route, []);
    });

    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: 'Xem HĐ' }).first().click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByAltText('Chữ ký bên A')).toBeVisible();
    await expect(modal.getByAltText('Chữ ký bên B')).toBeVisible();
    expect(detailFetched).toBe(1);
  });

  test('Flow 3: Tính quyết toán thanh lý hiển thị Phí sửa chữa chờ kết chuyển và tổng ước tính chính xác', async ({ page }) => {
    await loginLandlord(page);

    await page.route('**/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
      if (path === '/contracts' && req.method() === 'GET') {
        return json(route, [CONTRACT_WITHOUT_SIGNATURES]);
      }
      if (path === '/contracts/11/settlement-preview' && req.method() === 'POST') {
        return json(route, {
          held: 5000000,
          unpaidInvoices: [],
          unpaidTotal: 0,
          needsReadings: true,
          finalInvoice: null,
          pendingRepairFee: 200000,
          finalInvoiceEstimate: 3570000,
          damageAmount: 0,
          deduct: 3570000,
          refund: 1430000,
          blocked: false,
          blockMessage: null,
        });
      }
      if (path === '/contracts/requests') return json(route, []);
      if (path === '/manage/buildings') return json(route, [{ id: 7, name: 'Sunshine' }]);
      if (path === '/manage/bookings') return json(route, []);
      return json(route, []);
    });

    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: 'Thanh lý' }).first().click();

    const modal = page.getByRole('dialog');
    await modal.getByLabel('Chỉ số điện cuối').fill('120');
    await modal.getByLabel('Chỉ số nước cuối').fill('15');
    await modal.getByRole('button', { name: 'Tính quyết toán' }).click();

    await expect(modal.getByText('Phí sửa chữa chờ kết chuyển')).toBeVisible();
    await expect(modal).toContainText('200.000');
    await expect(modal).toContainText('3.570.000');
    await expect(modal).toContainText('1.430.000');
  });
});
