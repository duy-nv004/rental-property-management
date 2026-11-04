import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Form, Input, Button, message, Avatar, Spin, Alert } from 'antd';
import { User, KeyRound, Save, Send, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const LandlordProfile = () => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  const fetchProfile = useCallback(async () => {
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
  }, [profileForm]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

      setUser(response);
      // Lưu lại thông tin mới vào localStorage để đồng bộ Header
      localStorage.setItem('username', response.name);
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
      const res = await axiosInstance.put('/auth/change-password', {
        currentPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      // Đổi mật khẩu thu hồi mọi phiên cũ -> phải lưu token mới
      if (res?.token) localStorage.setItem('accessToken', res.token);
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
      <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Cài đặt hồ sơ cá nhân" description="Cập nhật thông tin liên hệ và mật khẩu đăng nhập của bạn." />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title={<span className="card-title"><User size={18} color="#0F766E" aria-hidden="true" /> Thông tin cá nhân</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <Avatar size={80} style={{ background: '#CCFBF1', color: '#0F766E', fontWeight: 700, fontSize: 30, marginBottom: 12 }}>
                {(user.name || 'C').trim().charAt(0).toUpperCase()}
              </Avatar>
              <strong style={{ fontSize: 18, color: '#0F172A' }}>{user.name}</strong>
              <span style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.6, marginTop: 4 }}>
                {user.role === 'landlord' ? 'Chủ nhà' : (user.role || 'Chủ nhà')}
              </span>
            </div>

            <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile} requiredMark={false}>
              <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng điền họ tên!' }]}>
                <Input placeholder="Nhập họ tên của bạn" autoComplete="name" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Địa chỉ Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Địa chỉ email không hợp lệ!' }
                ]}
              >
                <Input placeholder="ban@example.com" autoComplete="email" />
              </Form.Item>

              <Form.Item name="phone" label="Số điện thoại liên hệ">
                <Input placeholder="Ví dụ: 0987654321" inputMode="numeric" autoComplete="tel" />
              </Form.Item>

              <Form.Item name="cccd" label="Số CCCD chủ nhà">
                <Input placeholder="Ví dụ: 001196008731" inputMode="numeric" />
              </Form.Item>

              <Form.Item name="dob" label="Ngày tháng năm sinh">
                <Input placeholder="Ví dụ: 10/05/1985" />
              </Form.Item>

              <Form.Item name="hometown" label="Hộ khẩu thường trú">
                <Input placeholder="Ví dụ: Ba Đình, Hà Nội" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={profileLoading} icon={<Save size={16} />} block>
                Lưu hồ sơ cá nhân
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span className="card-title"><KeyRound size={18} color="#0F766E" aria-hidden="true" /> Đổi mật khẩu</span>}>
            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} requiredMark={false}>
              <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}>
                <Input.Password placeholder="••••••••" autoComplete="current-password" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                extra="Tối thiểu 6 ký tự"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự!' }
                ]}
              >
                <Input.Password placeholder="••••••••" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
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
                <Input.Password placeholder="••••••••" autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={passwordLoading} icon={<KeyRound size={16} />} block>
                Cập nhật mật khẩu
              </Button>
            </Form>
          </Card>

          <Card
            title={<span className="card-title"><Send size={18} color="#0F766E" aria-hidden="true" /> Kết nối Telegram Bot</span>}
            style={{ marginTop: 20 }}
          >
            {user.telegramChatId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', padding: 12, borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={16} color="#15803D" aria-hidden="true" />
                <span style={{ fontSize: 13, color: '#15803D', fontWeight: 600 }}>
                  Đã liên kết Telegram (ID: {user.telegramChatId})
                </span>
              </div>
            ) : (
              <>
                <Alert
                  type="warning"
                  showIcon
                  message="Chưa kết nối Telegram"
                  description="Kết nối Bot Telegram để nhận thông báo báo hỏng tức thời từ khách thuê."
                  style={{ marginBottom: 16 }}
                />
                <Button
                  type="primary"
                  block
                  icon={<Send size={16} />}
                  onClick={() => window.open(`https://t.me/phongtro_smart_bot?start=${user.id}`, '_blank', 'noopener')}
                >
                  Kết nối Bot Telegram
                </Button>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LandlordProfile;
