import { test, expect } from '@playwright/test';

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test.describe('Quên mật khẩu & Đặt lại mật khẩu qua Email OTP', () => {
  test('người dùng gửi yêu cầu OTP và đặt lại mật khẩu thành công trên trang Login', async ({ page }) => {
    let forgotPayload = null;
    let resetPayload = null;

    await page.route('**/api/auth/forgot-password', async (route) => {
      forgotPayload = route.request().postDataJSON();
      return json(route, { message: 'Nếu email tồn tại trong hệ thống, mã OTP đặt lại mật khẩu đã được gửi.' });
    });

    await page.route('**/api/auth/reset-password', async (route) => {
      resetPayload = route.request().postDataJSON();
      return json(route, { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
    });

    await page.goto('/login');

    await page.getByRole('button', { name: /quên mật khẩu/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.getByLabel(/email/i).fill('landlord@example.com');
    await modal.getByRole('button', { name: /gửi mã otp/i }).click();

    await expect.poll(() => forgotPayload).toEqual({ email: 'landlord@example.com' });

    await modal.getByLabel(/mã otp/i).fill('123456');
    await modal.getByLabel(/^mật khẩu mới$/i).fill('newpass123');
    await modal.getByLabel(/xác nhận mật khẩu/i).fill('newpass123');
    await modal.getByRole('button', { name: /đặt lại mật khẩu/i }).click();

    await expect.poll(() => resetPayload).toEqual({
      email: 'landlord@example.com',
      otp: '123456',
      newPassword: 'newpass123',
    });
    await expect(page.getByText(/đặt lại mật khẩu thành công/i)).toBeVisible();
  });
});
