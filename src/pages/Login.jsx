import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Modal } from 'antd';
import { Mail, Lock, ArrowRight, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';
import AuthLayout from '../components/common/AuthLayout';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [telegramLink] = useState('');
  const navigate = useNavigate();
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [appealLoading, setAppealLoading] = useState(false);

  useEffect(() => {
    const flash = sessionStorage.getItem('auth_flash_message');
    if (flash) {
      sessionStorage.removeItem('auth_flash_message');
      message.warning({
        content: flash,
        duration: 6,
        key: 'auth_flash_notice'
      });
    }
  }, []);

  const onAppealFinish = async (values) => {
    setAppealLoading(true);
    try {
      const response = await axiosInstance.post('/auth/appeal', {
        email: values.email,
        title: values.title,
        message: values.message
      });
      message.success(response.message || "Gửi khiếu nại thành công!");
      setAppealModalVisible(false);
    } catch (error) {
      console.error('Appeal Error:', error);
      const errMsg = error.response?.data?.message || 'Không thể gửi khiếu nại. Vui lòng kiểm tra email của bạn!';
      message.error(errMsg);
    } finally {
      setAppealLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Gọi API đăng nhập bằng axiosInstance
      const response = await axiosInstance.post('/auth/login', {
        identity: values.identity,
        password: values.password,
      });

      // Kiểm tra xem API trả về token và thông tin thành công hay không
      if (response && (response.accessToken || response.token)) {
        // Lưu trữ thông tin đăng nhập vào localStorage
        localStorage.setItem('accessToken', response.accessToken || response.token);
        localStorage.setItem('role', response.role);
        localStorage.setItem('username', response.name || 'Người dùng');
        localStorage.setItem('user', JSON.stringify({
          id: response.id,
          name: response.name,
          email: response.email,
          phone: response.phone,
          role: response.role,
          plan: response.plan || 'free',
          planExpiresAt: response.planExpiresAt || null
        }));

        message.success(`Chào mừng trở lại, ${response.name || 'Người dùng'}!`);

        // Điều hướng dựa trên vai trò người dùng (Role)
        const userRole = response.role ? response.role.toLowerCase() : '';
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else if (userRole === 'landlord') {
          navigate('/landlord/dashboard');
        } else if (userRole === 'tenant') {
          navigate('/tenant/dashboard');
        } else {
          // Trường hợp quyền khác
          message.warning('Tài khoản của bạn chưa được phân quyền truy cập hệ thống quản trị.');
        }
      } else {
        message.error('Đăng nhập thất bại. Vui lòng kiểm tra lại phản hồi từ hệ thống.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      const errMsg = error.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Quản lý nhà trọ & căn hộ dịch vụ thông minh"
      description="Số hóa toàn bộ quy trình vận hành: quản lý tòa nhà, tự động lập hóa đơn và gửi thông báo tới người thuê chỉ trong vài giây."
      title="Đăng nhập"
      subtitle="Đăng nhập tài khoản của bạn để tiếp tục."
    >
      <Form name="login_form" layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
        <Form.Item
          name="identity"
          label="Email hoặc số điện thoại"
          rules={[{ required: true, message: 'Vui lòng nhập Email hoặc Số điện thoại!' }]}
        >
          <Input prefix={<Mail size={18} color="#64748B" aria-hidden="true" />} placeholder="ban@example.com" autoComplete="username" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
        >
          <Input.Password prefix={<Lock size={18} color="#64748B" aria-hidden="true" />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>

        <div className="auth-links">
          <button type="button" className="link-btn danger" onClick={() => setAppealModalVisible(true)}>
            Tài khoản bị khóa?
          </button>
          {/* ponytail: chưa có API quên mật khẩu, thêm khi backend hỗ trợ */}
          <button type="button" className="link-btn" onClick={() => message.info('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}>
            Quên mật khẩu?
          </button>
        </div>

        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48 }} icon={<ArrowRight size={16} />} iconPosition="end">
          Đăng nhập
        </Button>

        <div className="auth-switch">
          Chưa có tài khoản?{' '}
          <button type="button" className="link-btn" style={{ fontSize: 14 }} onClick={() => navigate('/register')}>
            Đăng ký chủ nhà
          </button>
        </div>
      </Form>

      {/* Modal hướng dẫn người thuê kết nối Telegram */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Send size={20} color="#0088cc" /> Liên kết Telegram nhận hóa đơn</span>}
        open={tenantModalVisible}
        onCancel={() => setTenantModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTenantModalVisible(false)}>Để sau</Button>,
          <Button
            key="connect"
            type="primary"
            onClick={() => {
              window.open(telegramLink, '_blank', 'noopener');
              setTenantModalVisible(false);
            }}
          >
            Mở Telegram
          </Button>
        ]}
        width={420}
        centered
      >
        <p style={{ color: '#475569', lineHeight: 1.6 }}>
          Để nhận thông báo hóa đơn tiền phòng hàng tháng kèm mã QR chuyển khoản qua Telegram, vui lòng kết nối với Bot Telegram của chúng tôi.
        </p>
      </Modal>

      {/* Modal gửi khiếu nại tài khoản bị khóa */}
      <Modal
        title="Khiếu nại tài khoản bị khóa"
        open={appealModalVisible}
        onCancel={() => setAppealModalVisible(false)}
        footer={null}
        width={460}
        centered
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={onAppealFinish} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item
            name="email"
            label="Email tài khoản bị khóa"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không đúng định dạng!' }
            ]}
          >
            <Input placeholder="ban@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề khiếu nại"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
            initialValue="Yêu cầu mở khóa tài khoản chủ nhà"
          >
            <Input placeholder="Ví dụ: Khiếu nại khóa nhầm tài khoản" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Lý do & nội dung khiếu nại"
            rules={[{ required: true, message: 'Vui lòng nhập lý do khiếu nại!' }]}
          >
            <Input.TextArea rows={4} placeholder="Cung cấp lý do chi tiết để ban quản trị đối soát mở khóa tài khoản..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setAppealModalVisible(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={appealLoading}>Gửi khiếu nại</Button>
          </div>
        </Form>
      </Modal>
    </AuthLayout>
  );
};

export default Login;
