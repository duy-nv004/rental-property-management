import { useState } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { Mail, Lock, User, Building, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
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

        message.success('Đăng ký chủ nhà thành công! Chào mừng bạn.');
        // Đăng ký chủ nhà thì điều hướng thẳng tới dashboard của chủ nhà
        navigate('/landlord/dashboard');
      } else {
        message.error('Đăng ký thất bại. Vui lòng kiểm tra lại phản hồi hệ thống.');
      }
    } catch (error) {
      console.error('Register Error:', error);
      const errMsg = error.response?.data?.message || 'Email này đã tồn tại trên hệ thống!';
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
      }} className="register-banner">
        {/* Lớp nền mờ lưới */}
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
            Tham gia vận hành <br />Chuyên nghiệp & Tự động <br />với Trợ lý AI
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', maxWidth: '480px' }}>
            Đăng ký tài khoản để bắt đầu quản lý danh mục bất động sản, tự động chốt số điện nước bằng AI và gửi hóa đơn tức thì cho người thuê qua Telegram.
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

      {/* Cột phải: Form Đăng ký */}
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
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Đăng ký Chủ nhà</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Tạo tài khoản quản lý nhà trọ và căn hộ dịch vụ của bạn.</p>
          </div>

          <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ background: 'transparent' }}>
            <Form
              name="register_form"
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập Họ và tên chủ quản!' }]}
              >
                <Input 
                  prefix={<User size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />} 
                  placeholder="Họ và tên của bạn" 
                  style={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    padding: '10px 14px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập địa chỉ Email!' },
                  { type: 'email', message: 'Địa chỉ Email không đúng định dạng!' }
                ]}
              >
                <Input 
                  prefix={<Mail size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />} 
                  placeholder="Địa chỉ Email" 
                  style={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    padding: '10px 14px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập Mật khẩu!' },
                  { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' }
                ]}
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

              <Form.Item
                name="confirm"
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
                <Input.Password
                  prefix={<Lock size={18} style={{ color: '#94a3b8', marginRight: '8px' }} />}
                  placeholder="Xác nhận mật khẩu"
                  style={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    padding: '10px 14px'
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: '16px' }}>
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
                  className="register-btn"
                >
                  Đăng ký ngay <ArrowRight size={16} />
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                Đã có tài khoản?{' '}
                <span 
                  onClick={() => navigate('/login')} 
                  style={{ color: '#6366f1', fontWeight: '600', cursor: 'pointer' }}
                >
                  Đăng nhập
                </span>
              </div>
            </Form>
          </Card>
        </div>
      </div>

      {/* CSS phụ trợ */}
      <style>{`
        @media (max-width: 992px) {
          .register-banner {
            display: none !important;
          }
        }
        .register-btn:hover {
          background: #1e293b !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default Register;
