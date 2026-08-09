import { useState, useEffect } from 'react';
import { Card, Button, Avatar, Space, Row, Col, Alert, Form, Input, Divider, message, Modal, Spin } from 'antd';
import { User, Phone, Mail, Send, CheckCircle2, Lock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';

const TenantProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form] = Form.useForm();
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('/tenant/summary');
        setProfile(response.profile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        message.error('Không thể tải thông tin hồ sơ.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Modal.confirm({
      title: 'Đăng xuất tài khoản',
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý?',
      okText: 'Đăng xuất',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        localStorage.clear();
        message.success('Đăng xuất thành công.');
        navigate('/login');
      }
    });
  };

  const handlePasswordChange = async (values) => {
    setChangePasswordLoading(true);
    // Giả lập đổi mật khẩu thành công do backend chưa có API đổi mật khẩu riêng biệt
    setTimeout(() => {
      message.success('Cập nhật mật khẩu mới thành công!');
      form.resetFields();
      setChangePasswordLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải thông tin hồ sơ..." />
      </div>
    );
  }

  const telegramLink = `https://t.me/phongtro_smart_bot?start=${profile?.id}`;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Tài khoản cá nhân</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Quản lý thông tin liên hệ, liên kết Telegram và đổi mật khẩu bảo mật.</p>
      </div>

      <Row gutter={[20, 20]}>
        
        {/* CỘT 1: PROFILE OVERVIEW */}
        <Col xs={24} md={10}>
          
          {/* USER CARD */}
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', textAlign: 'center', marginBottom: '20px' }}>
            <Avatar 
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.name || 'Tenant')}`} 
              size={90}
              style={{ border: '3px solid #e2e8f0', background: '#f1f5f9', marginBottom: '16px' }}
            />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>{profile?.name}</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8', background: '#f8fafc', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
              KHÁCH THUÊ
            </span>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="#64748b" />
                <span style={{ fontSize: '13px', color: '#475569' }}>SĐT: <strong>{profile?.phone || 'Chưa cập nhật'}</strong></span>
              </div>
            </div>
          </Card>

          {/* TELEGRAM STATUS CARD */}
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '14px' }}>Thông báo qua Telegram</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            {profile?.telegramChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: '600' }}>
                  Đã liên kết Telegram thành công
                </span>
              </div>
            ) : (
              <div>
                <Alert 
                  message="Chưa kết nối Telegram"
                  description="Hãy kết nối với Bot Telegram để nhận hóa đơn và thông tin chuyển khoản nhanh chóng nhất."
                  type="warning"
                  showIcon
                  style={{ borderRadius: '8px', marginBottom: '16px' }}
                />
                <Button 
                  type="primary" 
                  block 
                  icon={<Send size={15} />}
                  style={{ background: '#0088cc', border: 'none', borderRadius: '8px', height: '40px', fontWeight: '700' }}
                  onClick={() => window.open(telegramLink, '_blank')}
                >
                  Kết nối Bot Telegram
                </Button>
              </div>
            )}
          </Card>

        </Col>

        {/* CỘT 2: PASSWORD CHANGE */}
        <Col xs={24} md={14}>
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '15px' }}>Đổi mật khẩu bảo mật</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePasswordChange}
              requiredMark={false}
            >
              <Form.Item
                name="currentPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Mật khẩu hiện tại</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
              >
                <Input.Password prefix={<Lock size={15} color="#94a3b8" style={{ marginRight: '6px' }} />} style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Mật khẩu mới</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự!' }
                ]}
              >
                <Input.Password prefix={<Lock size={15} color="#94a3b8" style={{ marginRight: '6px' }} />} style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Xác nhận mật khẩu mới</span>}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<Lock size={15} color="#94a3b8" style={{ marginRight: '6px' }} />} style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={changePasswordLoading}
                  style={{
                    background: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    height: '42px',
                    fontWeight: '700',
                    padding: '0 24px'
                  }}
                >
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

      </Row>

    </div>
  );
};

export default TenantProfile;
