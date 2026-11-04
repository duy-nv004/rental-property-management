import { test, expect } from '@playwright/test';

/**
 * E2E luồng chatbot đề xuất + xác nhận tạo phòng (landlord).
 * Mock cả /api/chat (bot đề xuất pendingAction) và /api/chat/execute (thực thi)
 * để test không phụ thuộc AI thật và không tạo dữ liệu thật.
 */

const fakeToken = 'e2e-fake-token';

async function loginAsLandlord(page) {
  await page.addInitScript(([token]) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E Landlord');
  }, [fakeToken]);
  // Chặn mặc định API thật (token giả -> 401 sẽ redirect /login). Mock cụ thể sau sẽ đè lên.
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'E2E skip' }) }),
  );
}

async function openWidget(page) {
  await page.goto('/landlord/dashboard');
  await page.getByTestId('chat-launcher').click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
}

const mockBotProposal = (page) => {
  return page.route('**/api/chat', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Bạn muốn tạo phòng 101 với giá 3.500.000đ/tháng?',
        pendingAction: {
          tool: 'create_room',
          params: { buildingId: 1, roomNumber: '101', price: 3500000, capacity: 2, area: 20 },
        },
      }),
    }),
  );
};

test.describe('Chatbot tạo phòng (function calling)', () => {
  test('bot đề xuất -> thẻ xác nhận hiện đầy đủ thông số -> Xác nhận thành công', async ({ page }) => {
    await loginAsLandlord(page);
    await mockBotProposal(page);
    await openWidget(page);

    await page.getByTestId('chat-input').fill('tạo phòng 101 giá 3.5 triệu');
    await page.getByTestId('chat-send').click();

    // Thẻ xác nhận hiện với đầy đủ thông số
    const card = page.getByTestId('chat-action-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Tạo phòng mới');
    await expect(card).toContainText('101');
    await expect(card).toContainText('3.500.000 VND/tháng');
    await expect(card).toContainText('2 người');
    await expect(card).toContainText('20 m²');

    // Bấm Xác nhận -> gọi execute -> hiện kết quả thành công
    await page.route('**/api/chat/execute', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Đã tạo phòng 101 thành công.', room: { id: 9, roomNumber: '101' } }),
      }),
    );
    await page.getByTestId('chat-action-confirm').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Đã tạo phòng 101 thành công.');
    await expect(page.getByTestId('chat-action-card')).toHaveCount(0);
  });

  test('bấm Hủy -> không gọi execute, hiện đã hủy', async ({ page }) => {
    await loginAsLandlord(page);
    await mockBotProposal(page);
    await openWidget(page);

    await page.getByTestId('chat-input').fill('tạo phòng 102');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-action-card')).toBeVisible();

    await page.getByTestId('chat-action-cancel').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Đã hủy hành động.');
    await expect(page.getByTestId('chat-action-card')).toHaveCount(0);
  });

  test('Xác nhận nhưng server lỗi 403 -> hiện thông báo lỗi, không nổ app', async ({ page }) => {
    await loginAsLandlord(page);
    await mockBotProposal(page);
    await openWidget(page);

    await page.getByTestId('chat-input').fill('tạo phòng');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-action-card')).toBeVisible();

    await page.route('**/api/chat/execute', async (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Bạn không có quyền thực hiện hành động này' }) }),
    );
    await page.getByTestId('chat-action-confirm').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Bạn không có quyền thực hiện hành động này');
  });
});
