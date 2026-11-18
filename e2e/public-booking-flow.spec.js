/* global Buffer */
import { test, expect } from '@playwright/test';

/**
 * E2E luồng tìm phòng công khai theo vị trí, upload ảnh phòng/vị trí tòa nhà,
 * đặt lịch xem phòng, đặt cọc giữ phòng SePay VietQR, lập hợp đồng từ booking
 * và người thuê ký hợp đồng. Mock toàn bộ /api/** để chạy deterministic.
 */

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page, role, extraUser = {}) {
  await page.addInitScript(
    ([r, userObj]) => {
      localStorage.setItem('accessToken', 'e2e-fake-token');
      localStorage.setItem('role', r);
      localStorage.setItem('username', userObj.name || `E2E ${r}`);
      localStorage.setItem('user', JSON.stringify(userObj));
    },
    [role, { id: role === 'landlord' ? 5 : 90, name: `E2E ${role}`, role, ...extraUser }]
  );
}

async function mockApi(page, handlers) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    if (req.method() !== 'GET') {
      let body = null;
      try {
        body = req.postDataJSON();
      } catch {
        body = req.postDataBuffer?.()?.toString('utf8') ?? req.postData() ?? null;
      }
      calls.push({ key, body, url: req.url() });
    }
    const handler = handlers[key];
    if (handler) return handler(route, req, url);
    return json(route, { message: 'E2E mock skip' }, 403);
  });
  return calls;
}

const buildingHN = {
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
};

const buildingHCM = {
  id: 2,
  name: 'Saigon Central',
  address: '88 Nguyễn Huệ',
  city: 'TP.HCM',
  district: 'Quận 1',
  ward: 'Bến Nghé',
  latitude: 10.776,
  longitude: 106.7,
  service: { electricityPrice: 3800, waterPrice: 25000, internetPrice: 120000, cleaningPrice: 60000 },
  landlord: { id: 6, name: 'Chủ nhà Lan', phone: '0909333444' },
};

const publicRoomsFixture = [
  {
    id: 101,
    buildingId: 1,
    roomNumber: '101',
    price: 3500000,
    depositAmount: 3500000,
    area: 25,
    capacity: 2,
    status: 'empty',
    description: 'Phòng đầy đủ ban công thoáng mát gần công viên Cầu Giấy.',
    images: [],
    amenities: ['Wifi', 'Điều hòa', 'Ban công', 'Máy giặt'],
    building: buildingHN,
    createdAt: '2026-11-10T08:00:00Z',
  },
  {
    id: 202,
    buildingId: 2,
    roomNumber: '202',
    price: 6200000,
    depositAmount: 6200000,
    area: 35,
    capacity: 3,
    status: 'empty',
    description: 'Căn hộ studio trung tâm Quận 1.',
    images: [],
    amenities: ['Wifi', 'Điều hòa', 'Tủ lạnh'],
    building: buildingHCM,
    createdAt: '2026-11-09T08:00:00Z',
  },
];

const locationsFixture = {
  cities: ['Hà Nội', 'TP.HCM'],
  districtsByCity: {
    'Hà Nội': ['Cầu Giấy'],
    'TP.HCM': ['Quận 1'],
  },
  wardsByDistrict: {
    'Hà Nội|Cầu Giấy': ['Dịch Vọng Hậu'],
    'TP.HCM|Quận 1': ['Bến Nghé'],
  },
};

test.describe('Trang công khai: tìm phòng theo vị trí & chi tiết phòng', () => {
  test('lọc theo Tỉnh/Quận, Tìm quanh vị trí của tôi bằng GPS và mở trang chi tiết', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 21.038, longitude: 105.792 });

    await mockApi(page, {
      'GET /public/locations': (r) => json(r, locationsFixture),
      'GET /public/rooms': (r) => json(r, { rooms: publicRoomsFixture, total: 2, page: 1, totalPages: 1 }),
      'GET /public/rooms/101': (r) => json(r, publicRoomsFixture[0]),
    });

    await page.goto('/rooms');
    await expect(page.getByText('Phòng 101 · Sunshine Cầu Giấy')).toBeVisible();
    await expect(page.getByText('Phòng 202 · Saigon Central')).toBeVisible();

    // Lọc theo Tỉnh/Thành phố TP.HCM qua AntD Select
    await page.locator('.public-search-grid .ant-select').nth(0).click();
    await page.locator('.ant-select-dropdown .ant-select-item-option', { hasText: 'TP.HCM' }).click();
    await expect(page.getByText('Phòng 202 · Saigon Central')).toBeVisible();
    await expect(page.getByText('Phòng 101 · Sunshine Cầu Giấy')).toBeHidden();

    // Đặt lại bộ lọc -> bấm Tìm quanh vị trí của tôi
    await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    await expect(page.getByText('Phòng 101 · Sunshine Cầu Giấy')).toBeVisible();

    await page.getByTestId('btn-near-me').click();
    await expect(page.getByText(/Cách bạn .* km/)).toBeVisible();
    await expect(page.getByText('Phòng 101 · Sunshine Cầu Giấy')).toBeVisible();
    await expect(page.getByText('Phòng 202 · Saigon Central')).toBeHidden();

    // Mở chi tiết phòng 101
    await page.getByTestId('room-card-101').getByRole('button', { name: /Xem chi tiết/ }).click();
    await expect(page).toHaveURL(/\/rooms\/101$/);
    await expect(page.getByRole('heading', { name: /Phòng 101 · Sunshine Cầu Giấy/ })).toBeVisible();
    await expect(page.getByText('3.500.000 ₫').first()).toBeVisible();
  });

  test('thanh tìm kiếm giữ 1 hàng gọn nhẹ, đưa bộ lọc phụ vào icon lọc và đầy đủ 63 tỉnh/thành + quận + phường', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockApi(page, {
      'GET /public/locations': (r) => json(r, { cities: [], districtsByCity: {}, wardsByDistrict: {} }),
      'GET /public/rooms': (r) => json(r, { rooms: publicRoomsFixture, total: 2, page: 1, totalPages: 1 }),
    });

    await page.goto('/rooms');
    await expect(page.getByText('Phòng 101 · Sunshine Cầu Giấy')).toBeVisible();

    // Chỉ có 1 khung tìm kiếm gọn, không tách thành khung lọc phụ
    await expect(page.locator('.public-search-panel')).toHaveCount(1);
    await expect(page.locator('.public-filters-card')).toHaveCount(0);

    const searchPanel = page.locator('.public-search-panel');
    await expect(searchPanel.locator('#filter-city')).toBeVisible();
    await expect(searchPanel.locator('#filter-district')).toBeVisible();
    await expect(searchPanel.locator('#filter-keyword')).toBeVisible();
    await expect(searchPanel.getByTestId('btn-near-me')).toBeVisible();
    await expect(searchPanel.getByTestId('btn-more-filters')).toBeVisible();

    // Các bộ lọc nâng cao mặc định ẩn trong Popover
    await expect(page.getByTestId('advanced-filter-popover')).toHaveCount(0);

    const heroBox = await page.locator('.public-hero').boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox.height).toBeLessThan(180);

    const firstCardBox = await page.getByTestId('room-card-101').boundingBox();
    expect(firstCardBox).not.toBeNull();
    expect(firstCardBox.y).toBeLessThan(400);

    // Chọn An Giang -> TP. Long Xuyên trực tiếp trên thanh chính
    await page.locator('.public-search-grid .ant-select').nth(0).click();
    await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'An Giang' })).toBeVisible();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'An Giang' }).click();

    await page.locator('.public-search-grid .ant-select').nth(1).click();
    await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'TP. Long Xuyên' })).toBeVisible();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'TP. Long Xuyên' }).click();

    // Bấm icon Lọc để mở Popover bộ lọc nâng cao & kiểm tra Phường/Xã (Mỹ Bình)
    await page.getByTestId('btn-more-filters').click();
    const popover = page.getByTestId('advanced-filter-popover');
    await expect(popover).toBeVisible();
    await expect(popover.locator('#filter-ward')).toBeVisible();
    await expect(popover.locator('#filter-price')).toBeVisible();
    await expect(popover.locator('#filter-sort')).toBeVisible();

    await popover.locator('.ant-select').nth(0).click();
    await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'Mỹ Bình' })).toBeVisible();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'Mỹ Bình' }).click();

    // Popover vẫn giữ mở để chọn tiếp tiện ích Wifi mà không bị đóng đột ngột
    await popover.getByRole('button', { name: 'Wifi' }).click();
    await popover.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(popover).toBeHidden();

    // Kiểm tra lại Hà Nội -> Cầu Giấy -> Dịch Vọng Hậu
    await page.locator('.public-search-grid .ant-select').nth(0).click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'Hà Nội' }).click();
    await page.locator('.public-search-grid .ant-select').nth(1).click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'Cầu Giấy' }).click();

    await page.getByTestId('btn-more-filters').click();
    const popover2 = page.getByTestId('advanced-filter-popover');
    await popover2.locator('.ant-select').nth(0).click();
    await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'Dịch Vọng Hậu' })).toBeVisible();
  });
});

test.describe('Khách thuê: đặt lịch xem phòng & đặt cọc giữ phòng VietQR', () => {
  test('đặt lịch xem phòng tự động cấp token người thuê và hiển thị xác nhận', async ({ page }) => {
    const calls = await mockApi(page, {
      'GET /public/rooms/101': (r) => json(r, publicRoomsFixture[0]),
      'POST /public/bookings': (r) =>
        json(
          r,
          {
            message: 'Đặt lịch xem phòng thành công!',
            booking: { id: 77, roomId: 101, type: 'viewing', status: 'pending' },
            auth: {
              token: 'guest-jwt-77',
              user: { id: 90, name: 'Trần Thị Thuê', phone: '0912345678', role: 'tenant' },
              isNewAccount: true,
            },
          },
          201
        ),
    });

    await page.goto('/rooms/101');
    await page.getByRole('button', { name: 'Đặt lịch xem phòng' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Đặt lịch xem phòng miễn phí');
    await dialog.getByLabel('Họ và tên').fill('Trần Thị Thuê');
    await dialog.getByLabel('Số điện thoại').fill('0912345678');
    await dialog.getByLabel('Thời gian dự kiến xem phòng').fill('2026-12-01T14:00');
    await dialog.getByRole('button', { name: 'Xác nhận đặt lịch xem phòng' }).click();

    await expect(dialog).toContainText('Đã gửi lịch hẹn xem phòng!');
    const reqCall = calls.find((c) => c.key === 'POST /public/bookings');
    expect(reqCall.body).toMatchObject({
      roomId: 101,
      type: 'viewing',
      guestName: 'Trần Thị Thuê',
      guestPhone: '0912345678',
    });

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const role = await page.evaluate(() => localStorage.getItem('role'));
    expect(token).toBe('guest-jwt-77');
    expect(role).toBe('tenant');
  });

  test('đặt cọc giữ phòng hiển thị VietQR SePay và tự động cập nhật khi webhook xác nhận', async ({ page }) => {
    let pollCount = 0;
    await mockApi(page, {
      'GET /public/rooms/101': (r) =>
        json(r, { ...publicRoomsFixture[0], status: pollCount >= 2 ? 'reserved' : 'empty' }),
      'POST /public/bookings': (r) =>
        json(
          r,
          {
            message: 'Tạo yêu cầu đặt cọc thành công!',
            booking: {
              id: 88,
              roomId: 101,
              type: 'deposit',
              status: 'pending',
              paymentStatus: 'unpaid',
              depositAmount: 3500000,
              transferCode: 'COC 88 LL 5',
            },
            payment: {
              bankId: 'MB',
              bankAccount: '0900111222',
              bankName: 'HOMESYNC TEST',
              amount: 3500000,
              transferCode: 'COC 88 LL 5',
              qrCodeUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
            },
            auth: {
              token: 'guest-jwt-88',
              user: { id: 90, name: 'Trần Thị Thuê', phone: '0912345678', role: 'tenant' },
              isNewAccount: true,
            },
          },
          201
        ),
      'GET /public/bookings/88/status': (r) => {
        pollCount += 1;
        if (pollCount >= 2) {
          return json(r, { id: 88, status: 'deposit_paid', paymentStatus: 'paid' });
        }
        return json(r, { id: 88, status: 'pending', paymentStatus: 'unpaid' });
      },
    });

    await page.goto('/rooms/101');
    await page.getByRole('button', { name: 'Đặt cọc giữ phòng ngay' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Họ và tên người thuê').fill('Trần Thị Thuê');
    await dialog.getByLabel('Số điện thoại').fill('0912345678');
    await dialog.getByLabel('Ngày dự kiến dọn vào ở').fill('2026-12-05');
    await dialog.getByRole('button', { name: 'Tạo mã QR đặt cọc giữ phòng' }).click();

    await expect(dialog.getByTestId('transfer-code')).toContainText('COC 88 LL 5');
    await expect(dialog.getByAltText('Mã QR chuyển khoản đặt cọc VietQR')).toBeVisible();

    // Chờ polling 3 giây chuyển sang trạng thái đã nhận tiền cọc
    await expect(dialog).toContainText('Đã nhận tiền cọc & Giữ phòng thành công!', { timeout: 10000 });
  });
});

test.describe('Chủ nhà & Người thuê: upload ảnh phòng, lập hợp đồng từ cọc và ký hợp đồng', () => {
  test('chủ nhà thấy form ảnh phòng & chuyển lịch đặt cọc sang lập hợp đồng, người thuê xem được trên /tenant/contract', async ({
    page,
  }) => {
    const reservedRoom = { ...publicRoomsFixture[0], status: 'reserved', contracts: [] };
    const booking88 = {
      id: 88,
      roomId: 101,
      buildingId: 1,
      tenantId: 90,
      type: 'deposit',
      status: 'deposit_paid',
      paymentStatus: 'paid',
      guestName: 'Trần Thị Thuê',
      guestPhone: '0912345678',
      depositAmount: 3500000,
      transferCode: 'COC 88 LL 5',
      moveInDate: '2026-12-05T00:00:00Z',
      room: reservedRoom,
      building: buildingHN,
      tenant: { id: 90, name: 'Trần Thị Thuê', phone: '0912345678' },
    };

    await login(page, 'landlord');
    const calls = await mockApi(page, {
      'GET /manage/buildings': (r) => json(r, [{ ...buildingHN, rooms: [reservedRoom] }]),
      'PUT /manage/buildings/1': (r, req) => {
        const body = req.postDataJSON?.() || {};
        return json(r, { ...buildingHN, ...body });
      },
      'GET /manage/rooms': (r) => json(r, [reservedRoom]),
      'GET /contracts': (r) => json(r, []),
      'GET /contracts/requests': (r) => json(r, []),
      'GET /manage/tenants': (r) => json(r, [{ id: 90, name: 'Trần Thị Thuê', phone: '0912345678' }]),
      'GET /manage/bookings': (r) => json(r, [booking88]),
      'GET /auth/profile': (r) =>
        json(r, { id: 5, name: 'Chủ nhà Minh', phone: '0909111222', email: 'minh@example.com' }),
      'POST /contracts/create': (r) => json(r, { id: 300, status: 'pending_tenant_signature' }, 201),
    });

    // 1. Kiểm tra UI sửa tòa nhà ghim map theo địa chỉ (bỏ Tỉnh/TP & GPS thủ công) + upload ảnh phòng
    await page.goto('/landlord/buildings');
    await page.getByRole('button', { name: 'Sửa tòa nhà Sunshine Cầu Giấy' }).click();
    const editBuildingDlg = page.getByRole('dialog', { name: /Sửa tòa nhà: Sunshine Cầu Giấy/ });
    await expect(editBuildingDlg.getByText('Tỉnh / Thành phố')).toHaveCount(0);
    await expect(editBuildingDlg.getByText('Quận / Huyện')).toHaveCount(0);
    await expect(editBuildingDlg.getByText('Phường / Xã')).toHaveCount(0);
    await expect(editBuildingDlg.getByText('Vĩ độ (Latitude)')).toHaveCount(0);
    await expect(editBuildingDlg.getByText('Kinh độ (Longitude)')).toHaveCount(0);

    await expect(editBuildingDlg.getByTestId('building-map-canvas')).toBeVisible();
    await expect(editBuildingDlg.getByTestId('building-map-pin')).toBeVisible();

    await editBuildingDlg.getByLabel('Địa chỉ').fill('88 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM');
    await editBuildingDlg.getByTestId('btn-geocode-address').click();
    await expect(editBuildingDlg.getByTestId('building-inferred-area')).toContainText('Quận 1');
    await expect(editBuildingDlg.getByTestId('building-inferred-area')).toContainText('TP.HCM');
    await expect(editBuildingDlg.getByTestId('building-pinned-coords')).toContainText(/10\.7\d+/);
    const coordsBeforeMapClick = await editBuildingDlg.getByTestId('building-pinned-coords').textContent();

    await editBuildingDlg.getByTestId('building-map-canvas').click({ position: { x: 120, y: 80 } });
    await expect(editBuildingDlg.getByTestId('building-pinned-coords')).not.toHaveText(coordsBeforeMapClick || '');

    await editBuildingDlg.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(editBuildingDlg).toBeHidden();
    const updateBuildingCall = calls.find((c) => c.key === 'PUT /manage/buildings/1');
    expect(updateBuildingCall).toBeTruthy();
    expect(updateBuildingCall.body).toMatchObject({
      city: 'TP.HCM',
      district: 'Quận 1',
      ward: 'Bến Nghé',
    });
    expect(typeof updateBuildingCall.body.latitude).toBe('number');
    expect(typeof updateBuildingCall.body.longitude).toBe('number');
    expect(updateBuildingCall.body.latitude).toBeGreaterThan(10.7);
    expect(updateBuildingCall.body.latitude).toBeLessThan(10.85);

    await page.locator('.building-name', { hasText: 'Sunshine Cầu Giấy' }).click();
    await page.getByRole('button', { name: 'Thêm phòng mới' }).click();
    await expect(page.getByRole('dialog')).toContainText('Ảnh phòng (tối đa 5 ảnh)');
    await expect(page.getByRole('dialog')).toContainText('Tiền cọc giữ phòng (VND)');

    // 2. Mở ContractManager -> Lịch xem phòng & Đặt cọc -> bấm Lập hợp đồng
    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: /Lịch xem phòng & Đặt cọc/ }).click();

    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toContainText('Trần Thị Thuê');
    await expect(drawer).toContainText('Đã nhận tiền cọc');
    await drawer.getByRole('button', { name: 'Lập hợp đồng' }).click();

    const modal = page.getByRole('dialog', { name: /Lập Hợp đồng thuê phòng mới/ });
    await expect(modal).toContainText('Phòng 101');
    await expect(modal.getByLabel('Họ và tên Bên B:')).toHaveValue('Trần Thị Thuê');
    await expect(modal.getByLabel('Điện thoại Bên B:')).toHaveValue('0912345678');
    await expect(modal.getByLabel('Số tiền đặt cọc (VND):')).toHaveValue('3,500,000');

    // Điền ngày hợp đồng, CCCD Bên B & 2 ảnh CCCD rồi submit để kiểm tra bookingId được gửi lên
    const pickerInputs = modal.locator('.ant-picker-input input');
    await pickerInputs.nth(0).click();
    await pickerInputs.nth(0).fill('01/12/2026');
    await pickerInputs.nth(0).press('Enter');
    await pickerInputs.nth(1).fill('01/12/2027');
    await pickerInputs.nth(1).press('Enter');

    await modal.getByLabel('Số CCCD Bên B:').fill('001200012345');
    await modal.getByLabel('Ngày tháng năm sinh:').fill('01/01/1998');
    await modal.getByLabel('Hộ khẩu thường trú (HKTT):').fill('Cầu Giấy, Hà Nội');

    const fileInputs = modal.locator('input[type="file"]');
    const dummyImg = {
      name: 'cccd.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
    };
    await fileInputs.nth(0).setInputFiles(dummyImg);
    await fileInputs.nth(1).setInputFiles(dummyImg);

    // Ký số Bên A qua SignaturePadModal
    await modal.getByRole('button', { name: 'Vẽ chữ ký số Bên A' }).click();
    const sigModal = page.getByRole('dialog', { name: /Vẽ chữ ký điện tử/ });
    await expect(sigModal.getByText('Ký tên tại đây...')).toBeVisible();
    await page.waitForTimeout(300);
    const box = await sigModal.locator('canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(box.x + box.width * 0.25 + step * 16, box.y + box.height * 0.5 + (step % 2 === 0 ? 14 : -14));
    }
    await page.mouse.up();
    await expect(sigModal.getByText(/Đã nhận nét ký/)).toBeVisible();
    await sigModal.getByText(/Tôi đã đọc và đồng ý/).click();
    await sigModal.getByRole('button', { name: 'Xác nhận chữ ký' }).click();

    await modal.getByRole('button', { name: 'Khởi tạo & Ký hợp đồng' }).click();
    await expect(page.getByText(/Khởi tạo hợp đồng thuê thành công/)).toBeVisible();
    const createCall = calls.find((c) => c.key === 'POST /contracts/create');
    expect(createCall).toBeTruthy();
    expect(String(createCall.body)).toContain('name="bookingId"');
    expect(String(createCall.body)).toContain('88');

    // 3. Kiểm tra trang Người thuê /tenant/contract hiển thị lịch đặt cọc & hợp đồng chờ ký
    await login(page, 'tenant', { id: 90, name: 'Trần Thị Thuê', phone: '0912345678' });
    await mockApi(page, {
      'GET /tenant/summary': (r) =>
        json(r, {
          hasActiveContract: false,
          hasPendingContract: true,
          pendingContractIds: [300],
          contracts: [{ id: 300, roomNumber: '101', buildingName: 'Sunshine Cầu Giấy', status: 'pending_tenant_signature' }],
          contract: {
            id: 300,
            roomId: 101,
            tenantId: 90,
            status: 'pending_tenant_signature',
            deposit: 3500000,
            rentPrice: 3500000,
            startDate: '2026-12-01',
            endDate: '2027-12-01',
          },
          room: reservedRoom,
          building: buildingHN,
          landlord: { name: 'Chủ nhà Minh', phone: '0909111222' },
        }),
      'GET /tenant/requests': (r) => json(r, []),
      'GET /tenant/bookings': (r) => json(r, [{ ...booking88, status: 'contract_created' }]),
    });

    await page.goto('/tenant/contract');
    await expect(page.getByText('Lịch hẹn xem phòng & Đặt cọc của tôi')).toBeVisible();
    await expect(page.getByTestId('tenant-booking-88')).toContainText('Đã lập hợp đồng');
    await expect(page.getByText('Hợp đồng đang chờ bạn ký nhận')).toBeVisible();
  });

  test('gửi lookupToken, bảo vệ session requiresLogin và hiển thị cảnh báo deposit_conflict', async ({ page }) => {
    const statusTokens = [];
    const transferTokens = [];
    let pollCount = 0;

    await mockApi(page, {
      'GET /public/rooms/101': (r) => json(r, publicRoomsFixture[0]),
      'POST /public/bookings': (r) =>
        json(
          r,
          {
            message: 'Tạo yêu cầu đặt cọc thành công.',
            booking: {
              id: 99,
              roomId: 101,
              type: 'deposit',
              status: 'pending',
              paymentStatus: 'unpaid',
              depositAmount: 3500000,
              transferCode: 'COC 99 LL 5',
              lookupToken: 'tok-secret-99',
              holdExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
            },
            payment: {
              bankId: 'MB',
              bankAccount: '0900111222',
              bankName: 'HOMESYNC TEST',
              amount: 3500000,
              transferCode: 'COC 99 LL 5',
              qrCodeUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
            },
            auth: {
              token: null,
              isNewAccount: false,
              requiresLogin: true,
            },
          },
          201
        ),
      'POST /public/bookings/99/mark-transferred': (r, _req, url) => {
        transferTokens.push(url.searchParams.get('token'));
        return json(r, { message: 'Đã ghi nhận thông báo chuyển khoản.', paymentStatus: 'reported' });
      },
      'GET /public/bookings/99/status': (r, _req, url) => {
        statusTokens.push(url.searchParams.get('token'));
        pollCount += 1;
        if (pollCount >= 1) {
          return json(r, { id: 99, status: 'deposit_conflict', paymentStatus: 'conflict' });
        }
        return json(r, { id: 99, status: 'pending', paymentStatus: 'unpaid' });
      },
    });

    await page.goto('/rooms/101');
    await page.getByRole('button', { name: 'Đặt cọc giữ phòng ngay' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Họ và tên người thuê').fill('Nguyễn Khách Cũ');
    await dialog.getByLabel('Số điện thoại').fill('0912345678');
    await dialog.getByRole('button', { name: 'Tạo mã QR đặt cọc giữ phòng' }).click();

    await expect(dialog).toContainText('Số điện thoại đã có tài khoản HomeSync');
    const savedToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(savedToken).toBeNull();

    await dialog.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();
    expect(transferTokens).toEqual(['tok-secret-99']);

    await expect(dialog).toContainText('deposit_conflict', { timeout: 10000 });
    expect(statusTokens[0]).toBe('tok-secret-99');
  });

  test('người thuê tải lên CCCD 2 mặt, quét AI và gửi FormData khi tự ký hợp đồng', async ({ page }) => {
    await login(page, 'tenant', { id: 90, name: 'Trần Thị Thuê', phone: '0912345678' });
    let scanCalled = false;
    let signContentType = '';
    let signRawBody = '';

    await mockApi(page, {
      'GET /tenant/summary': (r) =>
        json(r, {
          hasActiveContract: false,
          hasPendingContract: true,
          pendingContractIds: [305],
          contracts: [{ id: 305, roomNumber: '101', buildingName: 'Sunshine Cầu Giấy', status: 'pending_tenant_signature' }],
          contract: {
            id: 305,
            roomId: 101,
            tenantId: 90,
            status: 'pending_tenant_signature',
            deposit: 3500000,
            rentPrice: 3500000,
            startDate: '2026-12-01',
            endDate: '2027-12-01',
          },
          room: { id: 101, roomNumber: '101', price: 3500000 },
          building: buildingHN,
          landlord: { name: 'Chủ nhà Minh', phone: '0909111222' },
        }),
      'GET /tenant/requests': (r) => json(r, []),
      'GET /tenant/bookings': (r) => json(r, []),
      'POST /ai/scan-cccd': (r) => {
        scanCalled = true;
        return json(r, {
          data: {
            cccdNumber: '001200012345',
            dob: '01/01/2000',
            hometown: 'Cầu Giấy, Hà Nội',
          },
          warnings: [],
        });
      },
      'POST /tenant/contract/305/sign': (r, req) => {
        signContentType = req.headers()['content-type'] || '';
        signRawBody = req.postDataBuffer?.()?.toString('latin1') || '';
        return json(r, { message: 'Ký hợp đồng thành công!' });
      },
    });

    await page.goto('/tenant/contract');
    await expect(page.getByText('Bổ sung ảnh CCCD 2 mặt trước khi ký hợp đồng')).toBeVisible();

    const tinyPng = Buffer.from(TINY_PNG_BASE64, 'base64');
    await page.getByTestId('tenant-cccd-front').setInputFiles({
      name: 'front.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await page.getByTestId('tenant-cccd-back').setInputFiles({
      name: 'back.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });

    await page.getByRole('button', { name: 'Quét CCCD bằng AI' }).click();
    await expect(page.getByPlaceholder('Số CCCD (tùy chọn / tự điền AI)')).toHaveValue('001200012345');
    expect(scanCalled).toBe(true);

    await page.getByRole('button', { name: /Vẽ & Ký hợp đồng ngay/ }).click();
    const sigDialog = page.getByRole('dialog', { name: /Vẽ chữ ký điện tử/ });
    await expect(sigDialog.getByText('Ký tên tại đây...')).toBeVisible();
    await page.waitForTimeout(350);
    const canvas = sigDialog.locator('canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await page.mouse.down();
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(box.x + box.width * 0.25 + step * 16, box.y + box.height * 0.5 + (step % 2 === 0 ? 14 : -14));
    }
    await page.mouse.up();
    await expect(sigDialog.getByText(/Đã nhận nét ký/)).toBeVisible();
    await sigDialog.getByText(/Tôi đã đọc và đồng ý/).click();
    await sigDialog.getByRole('button', { name: 'Xác nhận chữ ký' }).click();

    await expect(page.getByText(/Ký hợp đồng thành công!/)).toBeVisible();
    expect(signContentType).toContain('multipart/form-data');
    expect(signRawBody).toContain('name="cccdFront"');
    expect(signRawBody).toContain('name="cccdBack"');
    expect(signRawBody).toContain('001200012345');
  });
});
