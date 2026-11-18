/* global Buffer */
import { test, expect } from '@playwright/test';

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginAsLandlord(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'Chủ nhà Minh');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 5, name: 'Chủ nhà Minh', role: 'landlord', phone: '0909111222' })
    );
  });
}

class BuildingMapModalPage {
  constructor(page, buildingName) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: new RegExp(`Sửa tòa nhà: ${buildingName}`) });
    this.addressInput = this.dialog.getByLabel('Địa chỉ');
    this.mapCanvas = this.dialog.getByTestId('building-map-canvas');
    this.mapPin = this.dialog.getByTestId('building-map-pin');
    this.geocodeBtn = this.dialog.getByTestId('btn-geocode-address');
    this.pinnedCoords = this.dialog.getByTestId('building-pinned-coords');
    this.inferredArea = this.dialog.getByTestId('building-inferred-area');
    this.precisionBadge = this.dialog.getByTestId('building-geo-precision');
    this.addressLabel = this.dialog.getByTestId('building-map-address-label');
    this.suggestions = this.dialog.getByTestId('building-map-suggestions');
    this.applyReverseBtn = this.dialog.getByTestId('btn-apply-reverse-address');
    this.saveBtn = this.dialog.getByRole('button', { name: 'Lưu thay đổi' });
  }
}

const sampleBuilding = {
  id: 1,
  name: 'Sunshine Cầu Giấy',
  address: '12 Đường Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
  city: 'Hà Nội',
  district: 'Cầu Giấy',
  ward: 'Dịch Vọng Hậu',
  latitude: 21.036,
  longitude: 105.79,
  service: { electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000 },
};

test.describe('Edit Building Mini Map & Address Location (TDD/E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLandlord(page);

    // Mock tile & external geocoding requests so tests don't depend on external servers
    await page.route('https://server.arcgisonline.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') })
    );
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') })
    );
    await page.route('https://photon.komoot.io/**', (route) =>
      json(route, { features: [] })
    );

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      if (req.method() === 'GET' && path === '/manage/buildings') {
        return json(route, [sampleBuilding]);
      }
      if (req.method() === 'GET' && path === '/manage/rooms') {
        return json(route, []);
      }
      if (req.method() === 'PUT' && path === '/manage/buildings/1') {
        return json(route, { ...sampleBuilding, ...(req.postDataJSON?.() || {}) });
      }
      if (req.method() === 'GET' && path === '/auth/profile') {
        return json(route, { id: 5, name: 'Chủ nhà Minh', role: 'landlord' });
      }
      return json(route, []);
    });
  });

  test('hiển thị rõ địa chỉ trên map và cho phép chọn gợi ý chính xác từ Nominatim', async ({ page }) => {
    await page.route('https://nominatim.openstreetmap.org/search**', (route) =>
      json(route, [
        {
          place_id: 1001,
          lat: '21.036812',
          lon: '105.782451',
          display_name: '15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Việt Nam',
          address: {
            house_number: '15',
            road: 'Xuân Thủy',
            quarter: 'Dịch Vọng Hậu',
            city_district: 'Cầu Giấy',
            city: 'Hà Nội',
          },
        },
        {
          place_id: 1002,
          lat: '21.037955',
          lon: '105.784120',
          display_name: '68 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Việt Nam',
          address: {
            house_number: '68',
            road: 'Xuân Thủy',
            quarter: 'Dịch Vọng Hậu',
            city_district: 'Cầu Giấy',
            city: 'Hà Nội',
          },
        },
      ])
    );

    await page.goto('/landlord/buildings');
    await page.getByRole('button', { name: 'Sửa tòa nhà Sunshine Cầu Giấy' }).click();

    const modal = new BuildingMapModalPage(page, 'Sunshine Cầu Giấy');
    await expect(modal.mapCanvas).toBeVisible();
    await expect(modal.mapCanvas).toHaveClass(/leaflet-container/);
    await expect(modal.mapPin).toBeVisible();
    await expect(modal.addressLabel).toContainText('12 Đường Trần Thái Tông');

    await modal.addressInput.fill('15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội');
    await modal.geocodeBtn.click();

    await expect(modal.pinnedCoords).toContainText('21.036812, 105.782451');
    await expect(modal.precisionBadge).toContainText('Chính xác');
    await expect(modal.addressLabel).toContainText('15 Xuân Thủy');

    // Có danh sách gợi ý để người dùng chọn lại đúng điểm nếu cần
    await expect(modal.suggestions).toBeVisible();
    await modal.suggestions.getByText('68 Xuân Thủy').click();
    await expect(modal.pinnedCoords).toContainText('21.037955, 105.784120');
  });

  test('chạm lên bản đồ để ghim tay sẽ reverse-geocode ra địa chỉ tại điểm ghim và cho phép áp dụng', async ({ page }) => {
    await page.route('https://nominatim.openstreetmap.org/reverse**', (route) =>
      json(route, {
        lat: '21.035500',
        lon: '105.788800',
        display_name: '99 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Việt Nam',
        address: {
          house_number: '99',
          road: 'Trần Thái Tông',
          quarter: 'Dịch Vọng Hậu',
          city_district: 'Cầu Giấy',
          city: 'Hà Nội',
        },
      })
    );

    await page.goto('/landlord/buildings');
    await page.getByRole('button', { name: 'Sửa tòa nhà Sunshine Cầu Giấy' }).click();

    const modal = new BuildingMapModalPage(page, 'Sunshine Cầu Giấy');
    await expect(modal.mapCanvas).toBeVisible();
    const beforeCoords = await modal.pinnedCoords.textContent();

    await modal.mapCanvas.click({ position: { x: 140, y: 90 } });

    await expect(modal.pinnedCoords).not.toHaveText(beforeCoords || '');
    await expect(modal.precisionBadge).toContainText('Đã ghim thủ công');
    await expect(modal.addressLabel).toContainText('99 Trần Thái Tông');

    await modal.applyReverseBtn.click();
    await expect(modal.addressInput).toHaveValue(/99 Trần Thái Tông/);
  });

  test('hiển thị cảnh báo ước lượng khi Nominatim không trả kết quả', async ({ page }) => {
    await page.route('https://nominatim.openstreetmap.org/search**', (route) => json(route, []));

    await page.goto('/landlord/buildings');
    await page.getByRole('button', { name: 'Sửa tòa nhà Sunshine Cầu Giấy' }).click();

    const modal = new BuildingMapModalPage(page, 'Sunshine Cầu Giấy');
    await modal.addressInput.fill('88 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM');
    await modal.geocodeBtn.click();

    await expect(modal.precisionBadge).toContainText('Ước lượng theo khu vực');
    await expect(modal.inferredArea).toContainText('Quận 1');
    await expect(modal.inferredArea).toContainText('TP.HCM');
  });
});
