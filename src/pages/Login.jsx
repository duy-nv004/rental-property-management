import { useState } from 'react';
import { Form, Input, Button, message, Card, Modal } from 'antd';
import { Mail, Lock, Building, ArrowRight, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [telegramLink, setTelegramLink] = useState('');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Gọi API đăng nhập bằng axiosInstance
      const response = await axiosInstance.post('/auth/login', {
        identity: values.identity,
        password: values.password,
      });

      // Kiểm tra xem API trả về token và thông tin thành công hay không
      if (response && response.token) {
        // Lưu trữ thông tin đăng nhập vào localStorage
        localStorage.setItem('accessToken', response.token);
        localStorage.setItem('role', response.role);
        localStorage.setItem('username', response.name || 'Người dùng');

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f6f8fb', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Cột trái: Giới thiệu hệ thống (Chỉ hiển thị trên màn hình máy tính) */}
      <div style={{
        flex: 1.2,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px',
        color: '#fff',
        overflow: 'hidden'
      }} className="login-banner">
        {/* Lớp nền mờ nhẹ dạng lưới */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(20, 184, 166, 0.1) 0%, transparent 50%)',
          zIndex: 1
        }} />

        <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building size={24} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>EXECUTIVE LENS</div>
            <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '2px' }}>PROPERTY MANAGEMENT</div>
          </div>
        </div>

        <div style={{ zIndex: 2, margin: '80px 0' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '800', lineHeight: '1.2', marginBottom: '24px', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hệ thống Quản lý <br />Nhà trọ & Căn hộ Dịch vụ <br />Thông minh Tích hợp AI
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', maxWidth: '480px' }}>
            Giải pháp số hóa toàn diện quy trình vận hành: Quản lý tòa nhà, Tự động hóa hóa đơn qua mã VietQR và gửi thông báo tức thời tới Telegram người thuê trọ chỉ trong vài giây.
          </p>
        </div>

        <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>© 2026 Executive Lens. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#94a3b8' }}>
            <span style={{ cursor: 'pointer' }}>Điều khoản</span>
            <span style={{ cursor: 'pointer' }}>Bảo mật</span>
          </div>
        </div>
      </div>

      {/* Cột phải: Form Đăng nhập */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: '#ffffff'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Đăng nhập</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Vui lòng đăng nhập tài khoản của bạn để tiếp tục.</p>
          </div>

          <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ background: 'transparent' }}>
            <Form
              name="login_form"
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                name="identity"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email hoặc Số điện thoại!' },
                ]}
              >
                <Input 
                  prefix={<Mail size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />} 
                  placeholder="Email hoặc Số điện thoại" 
                  style={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    padding: '10px 14px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
              >
                <Input.Password
                  prefix={<Lock size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />}
                  placeholder="Mật khẩu"
                  style={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    padding: '10px 14px'
                  }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <span style={{ color: '#6366f1', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  Quên mật khẩu?
                </span>
              </div>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  block
                  style={{
                    height: '48px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                  }}
                  className="login-btn"
                >
                  Bắt đầu làm việc <ArrowRight size={16} />
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
                Chưa có tài khoản?{' '}
                <span 
                  onClick={() => navigate('/register')} 
                  style={{ color: '#6366f1', fontWeight: '600', cursor: 'pointer' }}
                >
                  Đăng ký chủ nhà
                </span>
              </div>
            </Form>
          </Card>
        </div>
      </div>

      {/* Modal hướng dẫn người thuê kết nối Telegram */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '18px', fontWeight: '700' }}>
            <Send size={20} color="#0088cc" /> Liên kết Telegram nhận hóa đơn
          </div>
        }
        open={tenantModalVisible}
        onCancel={() => setTenantModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTenantModalVisible(false)} style={{ borderRadius: '6px' }}>
            Để sau
          </Button>,
          <Button 
            key="connect" 
            type="primary" 
            style={{ background: '#0088cc', border: 'none', borderRadius: '6px' }}
            onClick={() => {
              window.open(telegramLink, '_blank');
              setTenantModalVisible(false);
            }}
          >
            Mở Telegram
          </Button>
        ]}
        width={420}
        centered
      >
        <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', padding: '10px 0' }}>
          Chào bạn! Để nhận thông báo hóa đơn tiền phòng hàng tháng kèm mã QR chuyển khoản trực tiếp qua Telegram, vui lòng nhấn kết nối với Bot Telegram của chúng tôi.
        </div>
      </Modal>

      {/* CSS phụ trợ cho Responsive */}
      <style>{`
        @media (max-width: 992px) {
          .login-banner {
            display: none !important;
          }
        }
        .login-btn:hover {
          background: #1e293b !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default Login;
