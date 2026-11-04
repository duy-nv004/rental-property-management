import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { Lock } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const AdminProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      const res = await axiosInstance.put('/auth/change-password', {
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      // Đổi mật khẩu thu hồi mọi phiên cũ -> phải lưu token mới
      if (res?.token) localStorage.setItem('accessToken', res.token);
      message.success('Đổi mật khẩu thành công!');
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đổi mật khẩu (hãy kiểm tra lại mật khẩu cũ).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Hồ sơ quản trị viên" description="Đổi mật khẩu đăng nhập của tài khoản quản trị." />
      <Card style={{ maxWidth: 520 }} title={<span className="card-title"><Lock size={18} color="#0F766E" aria-hidden="true" /> Đổi mật khẩu</span>}>
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
          ]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" dependencies={['newPassword']} rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(new Error('Mật khẩu xác nhận không khớp'))),
            }),
          ]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} className="btn-dark">Đổi mật khẩu</Button>
        </Form>
      </Card>
    </div>
  );
};

export default AdminProfile;
