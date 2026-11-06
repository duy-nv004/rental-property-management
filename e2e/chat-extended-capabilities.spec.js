import { test, expect } from '@playwright/test';

/**
 * E2E kiểm thử các tính năng mới mở rộng của Chatbot AI:
 * 1. Scope Guardrails & Capability Discovery: Bấm gợi ý "👉 Bạn có thể làm được những gì?"
 * 2. Hiển thị ảnh VietQR trực quan khi tra cứu thanh toán hóa đơn (Tenant)
 * 3. Chào đúng vai trò Quản trị viên (Admin) và hiển thị thẻ hành động cho công cụ mở rộng
 * 4. Luồng gửi yêu cầu trả phòng (Tenant) kích hoạt thẻ xác nhận "Yêu cầu trả phòng"
 */

const fakeToken = 'e2e-fake-token';

async function loginAs(page, role, username = 'E2E User') {
  await page.addInitScript(([r, token, u]) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('role', r);
    localStorage.setItem('username', u);
  }, [role, fakeToken, username]);

  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'E2E skip' }) }),
  );
}

async function openWidgetOn(page, path) {
  await page.goto(path);
  const launcher = page.getByTestId('chat-launcher');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
}

test.describe('Chatbot AI Extended Capabilities & Scope Guardrails', () => {
  test('Tenant: Bấm nút "👉 Bạn có thể làm được những gì?" kích hoạt câu hỏi khám phá năng lực', async ({ page }) => {
    await loginAs(page, 'tenant', 'Nguyen Van A');

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Chào bạn! Với vai trò Người thuê, tôi hỗ trợ: 1. Tra cứu thông tin hợp đồng & phòng, 2. Xem hóa đơn và tạo mã VietQR thanh toán nhanh, 3. Gửi báo sự cố, 4. Yêu cầu trả phòng hoặc gia hạn hợp đồng, 5. Thêm bạn cùng phòng.',
        }),
      });
    });

    await openWidgetOn(page, '/tenant/dashboard');

    // Nút gợi ý đầu tiên là nút hỏi năng lực
    const capabilityBtn = page.locator('.chat-suggestion').first();
    await expect(capabilityBtn).toContainText('Bạn có thể làm được những gì');
    await capabilityBtn.click();

    // Tin nhắn trả về có danh sách năng lực
    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText('Với vai trò Người thuê, tôi hỗ trợ');
    await expect(messages).toContainText('tạo mã VietQR thanh toán nhanh');
  });

  test('Tenant: Hiển thị ảnh VietQR trực quan khi bot trả link QR thanh toán', async ({ page }) => {
    await loginAs(page, 'tenant', 'Le Thi B');

    const qrUrl = 'https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=3500000&addInfo=HD101';
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `Dưới đây là mã VietQR thanh toán cho hóa đơn tháng 11/2026 của phòng 101:\n${qrUrl}\nSố tiền: 3.500.000 VND. Quý khách vui lòng quét mã để thanh toán.`,
        }),
      });
    });

    await openWidgetOn(page, '/tenant/dashboard');

    await page.getByTestId('chat-input').fill('cho tôi mã QR thanh toán hóa đơn');
    await page.getByTestId('chat-send').click();

    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText('Mã VietQR thanh toán nhanh');

    // Kiểm tra ảnh VietQR render chuẩn
    const qrImg = page.locator('img[src*="img.vietqr.io"]');
    await expect(qrImg).toBeVisible();
    await expect(qrImg).toHaveAttribute('alt', 'Mã VietQR thanh toán');
  });

  test('Tenant: Yêu cầu trả phòng hiển thị thẻ xác nhận "Yêu cầu trả phòng"', async ({ page }) => {
    await loginAs(page, 'tenant', 'Tran Van C');

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Bạn có chắc chắn muốn gửi yêu cầu trả phòng 101 vào ngày 30/11/2026 không?',
          pendingAction: {
            tool: 'request_move_out',
            params: { contractId: 12, desiredDate: '2026-11-30', note: 'Chuyển công tác' },
          },
        }),
      });
    });

    await openWidgetOn(page, '/tenant/dashboard');

    await page.getByTestId('chat-input').fill('tôi muốn báo trả phòng cuối tháng này');
    await page.getByTestId('chat-send').click();

    // Thẻ xác nhận hiện với tiêu đề Việt hóa chuẩn
    const card = page.getByTestId('chat-action-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Yêu cầu trả phòng');
    await expect(card).toContainText('2026-11-30');
    await expect(card).toContainText('Chuyển công tác');
  });

  test('Admin: Lời chào chuẩn Quản trị viên và thẻ xác nhận xử lý khiếu nại', async ({ page }) => {
    await loginAs(page, 'admin', 'Super Admin');

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Xác nhận duyệt mở khóa khiếu nại #45 của chủ nhà Nguyen Van D?',
          pendingAction: {
            tool: 'resolve_landlord_ticket',
            params: { ticketId: 45, status: 'resolved', adminResponse: 'Đã cấu hình lại webhook SePay' },
          },
        }),
      });
    });

    await openWidgetOn(page, '/admin/dashboard');

    // Kiểm tra câu chào Quản trị viên
    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText('Xin chào Quản trị viên!');
    await expect(messages).toContainText('theo dõi chỉ số hệ thống');

    // Gợi ý câu hỏi dành cho Admin
    const suggestions = page.locator('.chat-suggestion');
    await expect(suggestions.first()).toContainText('Bạn có thể hỗ trợ những tác vụ gì');

    // Gửi yêu cầu
    await page.getByTestId('chat-input').fill('hoàn tất ticket 45');
    await page.getByTestId('chat-send').click();

    // Thẻ xác nhận Quản trị viên
    const card = page.getByTestId('chat-action-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Xử lý khiếu nại tài khoản');
    await expect(card).toContainText('45');
    await expect(card).toContainText('Duyệt mở khóa');
    await expect(card).toContainText('Đã cấu hình lại webhook SePay');
  });

  test('Landlord: Yêu cầu thống kê doanh thu theo tháng hiển thị thẻ xác nhận và kết quả thực thi', async ({ page }) => {
    await loginAs(page, 'landlord', 'Chu Nha Hoang');

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Bạn có muốn xem báo cáo doanh thu chi tiết cho kỳ Tháng 10/2026 không?',
          pendingAction: {
            tool: 'get_revenue_stats',
            params: { month: '10', year: 2026 },
          },
        }),
      });
    });

    await openWidgetOn(page, '/landlord/dashboard');

    await page.getByTestId('chat-input').fill('thống kê doanh thu tháng 10/2026');
    await page.getByTestId('chat-send').click();

    // Thẻ xác nhận hiển thị đúng tiêu đề và kỳ thống kê
    const card = page.getByTestId('chat-action-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Thống kê doanh thu');
    await expect(card).toContainText('Tháng 10/2026');

    // Xác nhận và nhận kết quả
    await page.route('**/api/chat/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Báo cáo doanh thu Tháng 10/2026: Dự kiến 35.000.000 VNĐ, thực thu 30.000.000 VNĐ (85.7%), còn nợ 5.000.000 VNĐ (1 phòng chưa đóng).',
          period: 'Tháng 10/2026',
        }),
      });
    });

    await page.getByTestId('chat-action-confirm').click();

    const messages = page.getByTestId('chat-messages');
    await expect(messages).toContainText('Báo cáo doanh thu Tháng 10/2026');
    await expect(messages).toContainText('30.000.000 VNĐ');
    await expect(page.getByTestId('chat-action-card')).toHaveCount(0);
  });
});
