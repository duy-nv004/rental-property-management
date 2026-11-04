import { useState, useEffect } from 'react';
import { Card, Button, Avatar, Row, Col, Alert, Form, Input, Divider, message, Spin, List, Tag, Modal, Select, Space } from 'antd';
import { Phone, Mail, CreditCard, Send, CheckCircle2, Lock, KeyRound } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';
import { CccdUploadFields, occupantFormData } from '../landlord/ContractManager';

const TenantProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form] = Form.useForm();
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  // Người ở cùng & tạm trú của HĐ đang hiệu lực (C6 & T3.3: hỗ trợ chọn khi có nhiều HĐ).
  const [contracts, setContracts] = useState([]);
  const [contractId, setContractId] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [occupantModal, setOccupantModal] = useState(false);
  const [occupantForm] = Form.useForm();

  const fetchOccupants = async (id) => {
    try {
      setOccupants(await axiosInstance.get(`/tenant/contract/${id}/occupants`));
    } catch {
      setOccupants([]);
    }
  };

  const handleAddOccupant = async (values) => {
    try {
      const res = await axiosInstance.post(`/tenant/contract/${contractId}/occupants`, occupantFormData(values), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(res.message || 'Đã thêm người ở cùng');
      setOccupantModal(false);
      fetchOccupants(contractId);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể thêm người ở.');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('/tenant/summary');
        setProfile(response.profile);
        const contractList = Array.isArray(response.contracts) && response.contracts.length > 0
          ? response.contracts
          : (response.contract ? [response.contract] : []);
        setContracts(contractList);
        const initialId = response.contract?.id || contractList[0]?.id || null;
        if (response.hasActiveContract && initialId) {
          setContractId(initialId);
          fetchOccupants(initialId);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        message.error('Không thể tải thông tin hồ sơ.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Chưa liên kết Telegram: khi người dùng quay lại tab sau khi bấm Start ở bot thì tải lại hồ sơ
  useEffect(() => {
    if (!profile || profile.telegramChatId) return undefined;
    const refreshProfile = async () => {
      try {
        const response = await axiosInstance.get('/tenant/summary');
        setProfile(response.profile);
      } catch {
        // Giữ nguyên trạng thái cũ nếu lỗi mạng
      }
    };
    window.addEventListener('focus', refreshProfile);
    return () => window.removeEventListener('focus', refreshProfile);
  }, [profile]);

  const handleSelectContract = (newId) => {
    setContractId(newId);
    fetchOccupants(newId);
  };

  // Link phải chứa token ngắn hạn do backend sinh (GET /auth/telegram-link), không dùng user.id
  const handleConnectTelegram = async () => {
    // Mở tab trước khi await để trình duyệt không chặn popup
    const tab = window.open('', '_blank');
    try {
      const res = await axiosInstance.get('/auth/telegram-link');
      if (tab) {
        tab.opener = null;
        tab.location.href = res.telegramConnectLink;
      } else {
        window.open(res.telegramConnectLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      tab?.close();
      message.error(err.response?.data?.message || 'Không thể tạo liên kết Telegram.');
    }
  };

  const handlePasswordChange = async (values) => {
    setChangePasswordLoading(true);
    try {
      const res = await axiosInstance.put('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      // Đổi mật khẩu thu hồi mọi phiên cũ -> phải lưu token mới
      if (res?.token) localStorage.setItem('accessToken', res.token);
      message.success('Cập nhật mật khẩu mới thành công!');
      form.resetFields();
    } catch (err) {
      console.error('Error changing password:', err);
      message.error(err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải thông tin hồ sơ..." />
      </div>
    );
  }

  const lockIcon = <Lock size={15} color="#94A3B8" aria-hidden="true" />;

  return (
    <div className="page-shell page-shell-wide tenant-page">
      <PageHeader
        title="Tài khoản cá nhân"
        description="Quản lý thông tin liên hệ, liên kết Telegram và đổi mật khẩu bảo mật."
      />

      <Row gutter={[20, 20]}>

        {/* CỘT 1: HỒ SƠ + TELEGRAM */}
        <Col xs={24} xl={10} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card variant="borderless" className="stat-card alert-block" style={{ height: 'auto' }}>
            <div className="profile-id">
              <Avatar
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.name || 'Tenant')}`}
                size={88}
                className="profile-avatar"
                alt={profile?.name || 'Ảnh đại diện'}
              />
              <h3 className="profile-name">{profile?.name}</h3>
              <span className="profile-role">KHÁCH THUÊ</span>
            </div>

            <Divider />

            <div className="contact-list">
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><Phone size={15} /></span>
                <span>SĐT: <strong>{profile?.phone || 'Chưa cập nhật'}</strong></span>
              </div>
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><Mail size={15} /></span>
                <span>Email: <strong>{profile?.email || 'Chưa cập nhật'}</strong></span>
              </div>
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><CreditCard size={15} /></span>
                <span>CCCD: <strong>{profile?.cccd || 'Chưa cập nhật'}</strong></span>
              </div>
            </div>
          </Card>

          <Card
            variant="borderless"
            className="stat-card"
            style={{ height: 'auto' }}
            title={<span className="card-title"><Send size={18} color="#0F766E" aria-hidden="true" /> Thông báo qua Telegram</span>}
          >
            {profile?.telegramChatId ? (
              <div className="status-ok" role="status">
                <CheckCircle2 size={16} color="#16A34A" aria-hidden="true" />
                <span className="status-ok-text">Đã liên kết Telegram thành công</span>
              </div>
            ) : (
              <>
                <Alert
                  className="alert-block"
                  message="Chưa kết nối Telegram"
                  description="Hãy kết nối với Bot Telegram để nhận hóa đơn và thông tin chuyển khoản nhanh chóng nhất."
                  type="warning"
                  showIcon
                />
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<Send size={15} aria-hidden="true" />}
                  onClick={handleConnectTelegram}
                >
                  Kết nối Bot Telegram
                </Button>
              </>
            )}
          </Card>
        </Col>

        {/* CỘT 2: ĐỔI MẬT KHẨU */}
        <Col xs={24} xl={14}>
          <Card
            variant="borderless"
            className="stat-card"
            title={<span className="card-title"><KeyRound size={18} color="#0F766E" aria-hidden="true" /> Đổi mật khẩu bảo mật</span>}
          >
            <Form form={form} layout="vertical" onFinish={handlePasswordChange} requiredMark={false}>
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
              >
                <Input.Password size="large" prefix={lockIcon} autoComplete="current-password" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự!' }
                ]}
              >
                <Input.Password size="large" prefix={lockIcon} autoComplete="new-password" />
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
                <Input.Password size="large" prefix={lockIcon} autoComplete="new-password" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" size="large" loading={changePasswordLoading} className="btn-dark">
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

      </Row>

      {contractId && (
        <Card
          variant="borderless"
          className="stat-card"
          style={{ height: 'auto', marginTop: 20 }}
          title="Người ở cùng & tạm trú"
          extra={
            <Space wrap>
              {contracts.length > 1 && (
                <Select
                  value={contractId}
                  onChange={handleSelectContract}
                  style={{ minWidth: 220 }}
                  options={contracts.map((c) => ({
                    value: c.id,
                    label: `HĐ #${c.id}${c.room?.roomNumber ? ` - Phòng ${c.room.roomNumber}` : ''}${c.room?.building?.name ? ` (${c.room.building.name})` : ''}`
                  }))}
                />
              )}
              <Button onClick={() => { occupantForm.resetFields(); setOccupantModal(true); }}>Thêm người ở cùng</Button>
            </Space>
          }
        >
          <List
            dataSource={occupants}
            locale={{ emptyText: 'Chưa có người ở nào' }}
            renderItem={(o) => (
              <List.Item>
                <div>
                  <b>{o.fullName}</b>{o.isPrimary ? ' (khách chính)' : o.relation ? ` · ${o.relation}` : ''}
                  {o.cccd && <div style={{ fontSize: 12, color: '#64748B' }}>CCCD: {o.cccd}</div>}
                </div>
                {o.residenceStatus === 'registered'
                  ? <Tag color="green">Đã khai báo</Tag>
                  : <Tag color="orange">Chưa khai báo</Tag>}
              </List.Item>
            )}
          />
        </Card>
      )}

      <Modal
        title="Thêm người ở cùng"
        open={occupantModal}
        onCancel={() => setOccupantModal(false)}
        onOk={() => occupantForm.submit()}
        okText="Thêm"
        cancelText="Hủy"
        width={440}
        centered
        destroyOnHidden
      >
        <Form form={occupantForm} name="tenantOccupantForm" layout="vertical" onFinish={handleAddOccupant} requiredMark={false}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}><Input /></Form.Item>
          <Form.Item name="cccd" label="CCCD"><Input /></Form.Item>
          <Form.Item name="dob" label="Ngày sinh"><Input placeholder="dd/mm/yyyy" /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại"><Input inputMode="numeric" /></Form.Item>
          <Form.Item name="relation" label="Quan hệ với khách chính"><Input /></Form.Item>
          <CccdUploadFields />
        </Form>
      </Modal>
    </div>
  );
};

export default TenantProfile;
