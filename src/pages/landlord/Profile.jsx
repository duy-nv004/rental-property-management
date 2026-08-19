import { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Input, Button, message, Divider, Space, Avatar, Spin, Alert } from 'antd';
import { User, ShieldAlert, KeyRound, Save, Send, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const LandlordProfile = () => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/auth/profile');
      setUser(response);
      profileForm.setFieldsValue({
        name: response.name || '',
        email: response.email || '',
        phone: response.phone || '',
        cccd: response.cccd || '',
        dob: response.dob || '',
        hometown: response.hometown || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      message.error('Không thể tải thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (values) => {
    setProfileLoading(true);
    try {
      const response = await axiosInstance.put('/auth/profile', {
        name: values.name,
        email: values.email,
        phone: values.phone,
        cccd: values.cccd,
        dob: values.dob,
        hometown: values.hometown
      });
      message.success('Cập nhật hồ sơ cá nhân thành công!');
      
      // Cập nhật lại state
      setUser(response);
      
      // Lưu lại thông tin mới vào localStorage để đồng bộ Header
      localStorage.setItem('username', response.name);
      
      // Kích hoạt sự kiện để Header tự động reload dữ liệu mới
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error updating profile:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin.';
      message.error(errMsg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setPasswordLoading(true);
    try {
      await axiosInstance.put('/auth/change-password', {
        currentPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      message.success('Đổi mật khẩu thành công!');
      passwordForm.resetFields();
    } catch (err) {
      console.error('Error changing password:', err);
      const errMsg = err.response?.data?.message || 'Không thể đổi mật khẩu (hãy kiểm tra lại mật khẩu cũ).';
      message.error(errMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải thông tin hồ sơ..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Cấu Hình  •  Tài Khoản</div>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Cài đặt hồ sơ cá nhân</h1>
      </div>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI: THÔNG TIN HỒ SƠ */}
        <Col xs={24} md={12}>
          <Card 
            title={<Space><User size={18} color="#1a3353" /> Thông tin cá nhân</Space>}
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <Avatar 
                size={80} 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name || 'Landlord')}`}
                style={{ background: '#f1f5f9', marginBottom: '12px' }}
              />
              <strong style={{ fontSize: '18px', color: '#1a3353' }}>{user.name}</strong>
              <span style={{ fontSize: '12px', color: '#8c8c8c', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '4px' }}>
                Vai trò: {user.role || 'Chủ nhà'}
              </span>
            </div>

            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
              requiredMark={false}
            >
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Họ và tên</span>}
                rules={[{ required: true, message: 'Vui lòng điền họ tên!' }]}
              >
                <Input placeholder="Nhập họ tên của bạn" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Địa chỉ Email</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Địa chỉ email không hợp lệ!' }
                ]}
              >
                <Input placeholder="example@mail.com" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="phone"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số điện thoại liên hệ</span>}
              >
                <Input placeholder="Nhập số điện thoại" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="cccd"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số CCCD chủ nhà</span>}
              >
                <Input placeholder="Ví dụ: 001196008731" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="dob"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Ngày tháng năm sinh</span>}
              >
                <Input placeholder="Ví dụ: 10/05/1985" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="hometown"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Hộ khẩu thường trú (HKTT)</span>}
              >
                <Input placeholder="Ví dụ: Ba Đình, Hà Nội" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit"
                loading={profileLoading}
                icon={<Save size={16} />}
                style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold', marginTop: '8px' }}
                block
              >
                Lưu hồ sơ cá nhân
              </Button>
            </Form>
          </Card>
        </Col>

        {/* CỘT PHẢI: ĐỔI MẬT KHẨU */}
        <Col xs={24} md={12}>
          <Card 
            title={<Space><KeyRound size={18} color="#1a3353" /> Đổi mật khẩu bảo mật</Space>}
            bordered={false}
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
              requiredMark={false}
            >
              <Form.Item
                name="oldPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Mật khẩu hiện tại</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
              >
                <Input.Password placeholder="Nhập mật khẩu cũ" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Mật khẩu mới</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự!' }
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Xác nhận mật khẩu mới</span>}
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
                <Input.Password placeholder="Nhập lại mật khẩu mới" style={{ borderRadius: '8px', padding: '8px 12px' }} />
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit"
                loading={passwordLoading}
                icon={<KeyRound size={16} />}
                style={{ background: '#ef4444', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold', marginTop: '8px' }}
                block
              >
                Cập nhật mật khẩu mới
              </Button>
            </Form>
          </Card>

          {/* TELEGRAM STATUS CARD */}
          <Card 
            title={<Space><Send size={18} color="#1a3353" /> Kết nối Telegram Bot</Space>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginTop: '24px' }}
          >
            {user.telegramChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
                  Đã liên kết Telegram thành công (ID: {user.telegramChatId})
                </span>
              </div>
            ) : (
              <div>
                <Alert 
                  message="Chưa kết nối Telegram"
                  description="Hãy kết nối với Bot Telegram để nhận thông báo báo hỏng tức thời từ khách thuê và xem nhanh các báo cáo của bạn."
                  type="warning"
                  showIcon
                  style={{ borderRadius: '8px', marginBottom: '16px' }}
                />
                <Button 
                  type="primary" 
                  block 
                  icon={<Send size={15} />}
                  style={{ background: '#0088cc', border: 'none', borderRadius: '8px', height: '40px', fontWeight: '700' }}
                  onClick={() => window.open(`https://t.me/phongtro_smart_bot?start=${user.id}`, '_blank')}
                >
                  Kết nối Bot Telegram
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LandlordProfile;
