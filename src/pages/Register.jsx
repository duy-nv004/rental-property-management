import { useState } from 'react';
import { Form, Input, Button, Segmented, message } from 'antd';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import AuthLayout from '../components/common/AuthLayout';

const iconProps = { size: 18, color: '#64748B', 'aria-hidden': true };

const Register = () => {
  const [searchParams] = useSearchParams();
  const [accountRole, setAccountRole] = useState(
    searchParams.get('role') === 'tenant' ? 'tenant' : 'landlord'
  );
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleRoleChange = (nextRole) => {
    setAccountRole(nextRole);
    form.resetFields(['phone', 'email']);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (accountRole === 'tenant') {
        const response = await axiosInstance.post('/auth/register-tenant', {
          name: values.name,
          phone: values.phone,
          email: values.email || undefined,
          password: values.password,
        });

        if (response && response.token) {
          localStorage.setItem('accessToken', response.token);
          localStorage.setItem('role', 'tenant');
          localStorage.setItem('username', values.name || 'Người thuê');
          const u = response.user || (response.id ? response : null);
          if (u) {
            localStorage.setItem('user', JSON.stringify({
              id: u.id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              role: u.role || 'tenant',
              plan: u.plan || 'free',
              planExpiresAt: u.planExpiresAt || null,
            }));
          }
          message.success('Đăng ký người thuê thành công!');
          navigate('/tenant/contract');
        } else {
          message.error('Đăng ký thất bại. Vui lòng kiểm tra lại phản hồi hệ thống.');
        }
        return;
      }

      // Gọi API đăng ký chủ nhà
      const response = await axiosInstance.post('/auth/register', {
        email: values.email,
        password: values.password,
        name: values.name,
      });

      if (response && response.token) {
        // Lưu thông tin đăng nhập sau khi đăng ký thành công
        localStorage.setItem('accessToken', response.token);
        localStorage.setItem('role', 'landlord');
        localStorage.setItem('username', values.name || 'Chủ nhà');
        // Lưu user giống Login.jsx; register trả phẳng như login, thiếu id thì lấy /auth/profile
        let u = response.user || (response.id ? response : null);
        if (!u) {
          try { u = await axiosInstance.get('/auth/profile'); } catch { u = null; }
        }
        if (u) {
          localStorage.setItem('user', JSON.stringify({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role || 'landlord',
            plan: u.plan || 'free',
            planExpiresAt: u.planExpiresAt || null
          }));
        }

        message.success('Đăng ký chủ nhà thành công! Chào mừng bạn.');
        // Đăng ký chủ nhà thì điều hướng thẳng tới dashboard của chủ nhà
        navigate('/landlord/dashboard');
      } else {
        message.error('Đăng ký thất bại. Vui lòng kiểm tra lại phản hồi hệ thống.');
      }
    } catch (error) {
      console.error('Register Error:', error);
      const errMsg = error.response?.data?.message || (
        accountRole === 'tenant'
          ? 'Đăng ký không thành công. Số điện thoại hoặc Email có thể đã tồn tại!'
          : 'Email này đã tồn tại trên hệ thống!'
      );
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isTenant = accountRole === 'tenant';

  return (
    <AuthLayout
      heading="Vận hành chuyên nghiệp và tự động"
      description={
        isTenant
          ? 'Tạo tài khoản người thuê để đặt lịch xem phòng, đặt cọc giữ phòng trực tuyến và ký hợp đồng minh bạch.'
          : 'Tạo tài khoản để quản lý danh mục bất động sản, chốt số điện nước và gửi hóa đơn tức thì cho người thuê.'
      }
      title={isTenant ? 'Đăng ký người thuê' : 'Đăng ký chủ nhà'}
      subtitle={
        isTenant
          ? 'Theo dõi lịch xem phòng, thanh toán đặt cọc VietQR và ký hợp đồng thuê.'
          : 'Tạo tài khoản quản lý nhà trọ và căn hộ dịch vụ của bạn.'
      }
    >
      <div style={{ marginBottom: 18 }}>
        <Segmented
          block
          size="large"
          value={accountRole}
          onChange={handleRoleChange}
          options={[
            { label: 'Chủ nhà quản lý', value: 'landlord' },
            { label: 'Người thuê tìm phòng', value: 'tenant' },
          ]}
        />
      </div>

      <Form form={form} name="register_form" layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: isTenant ? 'Vui lòng nhập Họ và tên!' : 'Vui lòng nhập Họ và tên chủ quản!' }]}
        >
          <Input prefix={<User {...iconProps} />} placeholder="Nguyễn Văn A" autoComplete="name" />
        </Form.Item>

        {isTenant && (
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^0\d{9,10}$/, message: 'Số điện thoại Việt Nam gồm 10-11 số bắt đầu bằng 0!' },
            ]}
          >
            <Input prefix={<Phone {...iconProps} />} placeholder="0912345678" autoComplete="tel" />
          </Form.Item>
        )}

        <Form.Item
          name="email"
          label={isTenant ? 'Email (tùy chọn)' : 'Email'}
          rules={
            isTenant
              ? [{ type: 'email', message: 'Địa chỉ Email không đúng định dạng!' }]
              : [
                  { required: true, message: 'Vui lòng nhập địa chỉ Email!' },
                  { type: 'email', message: 'Địa chỉ Email không đúng định dạng!' },
                ]
          }
        >
          <Input prefix={<Mail {...iconProps} />} placeholder="ban@example.com" autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          extra="Tối thiểu 6 ký tự"
          rules={[
            { required: true, message: 'Vui lòng nhập Mật khẩu!' },
            { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' }
          ]}
        >
          <Input.Password prefix={<Lock {...iconProps} />} placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Xác nhận mật khẩu"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận Mật khẩu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không trùng khớp!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<Lock {...iconProps} />} placeholder="••••••••" autoComplete="new-password" />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, marginTop: 4 }} icon={<ArrowRight size={16} />} iconPosition="end">
          Đăng ký ngay
        </Button>

        <div className="auth-switch">
          Đã có tài khoản?{' '}
          <button type="button" className="link-btn" style={{ fontSize: 14 }} onClick={() => navigate('/login')}>
            Đăng nhập
          </button>
          {' · '}
          <button type="button" className="link-btn" style={{ fontSize: 14 }} onClick={() => navigate('/rooms')}>
            Xem phòng trống
          </button>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default Register;
