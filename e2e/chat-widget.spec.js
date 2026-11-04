import { test, expect } from '@playwright/test';

/**
 * E2E widget chatbot. Widget chỉ hiện khi đã đăng nhập (nó nằm trong AppShell),
 * nên các test gán sẵn token + role vào localStorage rồi vào thẳng dashboard.
 * Response của /api/chat được mock để test không phụ thuộc backend/AI thật.
 */

const fakeToken = 'e2e-fake-token';

async function loginAs(page, role) {
  await page.addInitScript(([r, token]) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('role', r);
    localStorage.setItem('username', 'E2E User');
  }, [role, fakeToken]);
  // Chặn mặc định mọi API thật: token giả sẽ bị 401 -> axios redirect về /login.
  // Trả 403 vì interceptor chỉ redirect riêng với 401. Mock /api/chat cụ thể đăng ký sau sẽ đè lên.
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'E2E skip' }) }),
  );
}

async function openWidget(page) {
  await page.goto('/tenant/dashboard');
  const launcher = page.getByTestId('chat-launcher');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  return launcher;
}

test.describe('ChatWidget', () => {
  test('hiện nút nổi trên dashboard, ẩn ở trang đăng nhập', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('chat-launcher')).toHaveCount(0);

    await loginAs(page, 'tenant');
    await page.goto('/tenant/dashboard');
    await expect(page.getByTestId('chat-launcher')).toBeVisible();
  });

  test('mở panel: lời chào theo vai trò và gợi ý câu hỏi', async ({ page }) => {
    await loginAs(page, 'tenant');
    await openWidget(page);

    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText(/tra cứu phòng|hóa đơn|hợp đồng/i);
    await expect(page.locator('.chat-suggestion')).toHaveCount(3);
  });

  test('gửi câu hỏi và nhận trả lời từ API', async ({ page }) => {
    await loginAs(page, 'tenant');
    await openWidget(page);

    // Mock endpoint chat: trả lời cố định để test không phụ thuộc AI
    await page.route('**/api/chat', async (route) => {
      const body = route.request().postDataJSON();
      const last = body.messages.at(-1);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: `Echo: ${last.content}` }),
      });
    });

    await page.getByTestId('chat-input').fill('Hóa đơn tháng này bao nhiêu?');
    await page.getByTestId('chat-send').click();

    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText('Echo: Hóa đơn tháng này bao nhiêu?');
    await expect(page.locator('.chat-msg.user')).toHaveCount(1);
  });

  test('hiển thị thông báo lỗi thân thiện khi API lỗi 500', async ({ page }) => {
    await loginAs(page, 'tenant');
    await openWidget(page);

    await page.route('**/api/chat', async (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Có lỗi xảy ra, vui lòng thử lại sau.' }) }),
    );

    await page.getByTestId('chat-input').fill('ping');
    await page.getByTestId('chat-send').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Có lỗi xảy ra, vui lòng thử lại sau.');
  });

  test('nút gửi bị chặn khi ô trống; nút launcher đóng/mở được', async ({ page }) => {
    await loginAs(page, 'tenant');
    await openWidget(page);

    await expect(page.getByTestId('chat-send')).toBeDisabled();

    const launcher = page.getByTestId('chat-launcher');
    await launcher.click();
    await expect(page.getByTestId('chat-panel')).toHaveCount(0);
    await launcher.click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
  });

  test('gợi ý chỉ hiện khi chưa có hội thoại thật', async ({ page }) => {
    await loginAs(page, 'tenant');
    await openWidget(page);

    await page.route('**/api/chat', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'ok' }) }),
    );

    await page.getByTestId('chat-input').fill('xin chào');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-messages')).toContainText('ok');

    await expect(page.locator('.chat-suggestion')).toHaveCount(0);
  });
});
