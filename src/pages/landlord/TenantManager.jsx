import { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Avatar, Space, Card, Button, Modal, Form, Input, Select, message, Popconfirm, Tooltip, Grid } from 'antd';
import { UserPlus, Trash2, Users, Edit2, Search } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';
import ResponsiveFilterBar from '../../components/common/ResponsiveFilterBar';

const TenantManager = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const isPhone = !Grid.useBreakpoint().md;

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchTenants = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/tenants');
      setTenants(data);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      if (!isSilent) message.error('Không thể tải danh sách khách thuê.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    // Tự động kiểm tra khách thuê mới mỗi 15 giây hoặc khi chuyển tab
    const timer = setInterval(() => fetchTenants(true), 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchTenants(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, []);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchTenants(true); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, []);

  const handleCreateTenant = async (values) => {
    setSubmitLoading(true);
    try {
      await axiosInstance.post('/auth/create-tenant', {
        name: values.name,
        phone: values.phone,
        password: values.password
      });
      message.success('Đã tạo tài khoản khách thuê mới thành công!');
      form.resetFields();
      setModalVisible(false);
      fetchTenants();
    } catch (err) {
      console.error('Error creating tenant:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenEditModal = (record) => {
    setEditingTenant(record);
    editForm.setFieldsValue({
      name: record.name || '',
      phone: record.phone || '',
      email: record.email || ''
    });
    setEditModalVisible(true);
  };

  const handleUpdateTenant = async (values) => {
    if (!editingTenant) return;
    setSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/tenants/${editingTenant.id}`, {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined
      });
      message.success('Đã cập nhật thông tin khách thuê thành công!');
      setEditModalVisible(false);
      setEditingTenant(null);
      fetchTenants();
    } catch (err) {
      console.error('Error updating tenant:', err);
      message.error(err.response?.data?.message || 'Không thể cập nhật thông tin khách thuê.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteTenant = async (id) => {
    try {
      const response = await axiosInstance.delete(`/manage/tenants/${id}`);
      message.success(response.message || 'Xóa tài khoản khách thuê thành công!');
      fetchTenants();
    } catch (err) {
      console.error('Error deleting tenant:', err);
      const errMsg = err.response?.data?.message || 'Không thể xóa khách thuê.';
      message.error(errMsg);
    }
  };

  const handleUnlockTenant = async (record) => {
    try {
      const response = await axiosInstance.put(`/manage/tenants/${record.id}`, { status: 'active' });
      message.success(response?.message || 'Đã mở khóa tài khoản khách thuê!');
      fetchTenants();
    } catch (err) {
      console.error('Error unlocking tenant:', err);
      message.error(err.response?.data?.message || 'Không thể mở khóa khách thuê.');
    }
  };

  const filteredTenants = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return tenants.filter((t) => {
      if (q) {
        const matchName = (t.name || '').toLowerCase().includes(q);
        const matchPhone = (t.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (filterType === 'locked') {
        return t.status === 'locked';
      }
      if (filterType === 'unlinked_telegram') {
        return !t.telegramChatId;
      }
      if (filterType === 'unregistered_residence') {
        const occ = (t.rentals || []).flatMap((c) => c.occupants || []);
        return occ.length > 0 && occ.some((o) => o.residenceStatus !== 'registered');
      }
      return true;
    });
  }, [tenants, searchText, filterType]);

  const columns = [
    {
      title: 'Khách thuê',
      key: 'tenantDetails',
      width: 220,
      render: (r) => (
        <Space>
          <Avatar style={{ background: '#CCFBF1', color: '#0F766E', fontWeight: 700 }}>
            {(r.name || '?').trim().charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
              {r.name}{' '}
              {r.status === 'locked' && (
                <Tooltip title={r.lockReason || 'Tài khoản đã bị khóa'}>
                  <Tag color="red">Đã khóa</Tag>
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {r.phone && <span style={{ color: '#0F766E', fontWeight: 500 }}>{r.phone}</span>}
              {r.phone && r.email && ' · '}
              {r.email}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Phòng đang thuê',
      key: 'rentedRooms',
      render: (_, r) => {
        const roomNumbers = (r.rentals || [])
          .map((c) => c.room?.roomNumber)
          .filter(Boolean);
        if (roomNumbers.length === 0) {
          return <span style={{ color: '#94A3B8' }}>Chưa thuê phòng</span>;
        }
        return (
          <Space size={4} wrap>
            {roomNumbers.map((rn) => (
              <Tag key={rn} color="blue">Phòng {rn}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Liên kết Telegram',
      dataIndex: 'telegramChatId',
      key: 'telegramChatId',
      responsive: ['md'],
      render: (chatId) => (
        <Tag color={chatId ? 'success' : 'warning'}>{chatId ? `Đã liên kết (${chatId})` : 'Chưa liên kết'}</Tag>
      )
    },
    {
      // Số người đã khai báo tạm trú / tổng số người ở trên các HĐ active (C6)
      title: 'Tạm trú',
      key: 'residence',
      responsive: ['sm'],
      render: (_, r) => {
        const occ = (r.rentals || []).flatMap((c) => c.occupants || []);
        if (occ.length === 0) return <span style={{ color: '#94A3B8' }}>—</span>;
        const reg = occ.filter((o) => o.residenceStatus === 'registered').length;
        return <Tag color={reg === occ.length ? 'success' : 'warning'}>{reg}/{occ.length} đã khai báo</Tag>;
      }
    },
    {
      title: 'Ngày tạo tài khoản',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (date) => <span style={{ fontSize: 13, color: '#475569' }}>{new Date(date).toLocaleDateString('vi-VN')}</span>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa thông tin khách thuê">
            <Button
              type="text"
              aria-label={`Sửa thông tin khách thuê ${record.name}`}
              icon={<Edit2 size={15} color="#475569" />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          {record.status === 'locked' && (
            <Button size="small" aria-label={`Mở khóa khách thuê ${record.name}`} onClick={() => handleUnlockTenant(record)}>Mở khóa</Button>
          )}
          <Popconfirm
            title="Xóa tài khoản khách thuê"
            description="Hợp đồng phải được thanh lý trước. Khách có lịch sử sẽ bị khóa thay vì xóa."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteTenant(record.id)}
          >
            <Button type="text" danger aria-label={`Xóa khách thuê ${record.name}`} icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý khách thuê"
        description="Tài khoản đăng nhập và liên kết Telegram của khách thuê trong khu trọ."
        extra={
          <Button type="primary" icon={<UserPlus size={16} />} onClick={() => setModalVisible(true)}>
            Tạo tài khoản
          </Button>
        }
      />

      {/* Thanh bộ lọc đáp ứng chuẩn UI/UX Pro Max */}
      <ResponsiveFilterBar
        search={{
          placeholder: 'Tìm theo tên hoặc SĐT...',
          value: searchText,
          onChange: (e) => setSearchText(e.target.value),
          'data-testid': 'tenant-search-input'
        }}
        filters={[
          {
            key: 'filterType',
            label: 'Phân loại khách thuê',
            placeholder: 'Tất cả khách thuê',
            value: filterType,
            onChange: (v) => setFilterType(v ?? 'all'),
            options: [
              { value: 'all', label: 'Tất cả khách thuê' },
              { value: 'locked', label: 'Đã khóa' },
              { value: 'unregistered_residence', label: 'Chưa đăng ký tạm trú' },
              { value: 'unlinked_telegram', label: 'Chưa liên kết Telegram' }
            ],
            'data-testid': 'tenant-type-filter',
            width: 220
          }
        ]}
        onReset={() => {
          setSearchText('');
          setFilterType('all');
        }}
      />

      <Card
        title={<span className="card-title"><Users size={18} color="#0F766E" aria-hidden="true" /> Danh sách khách thuê</span>}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={filteredTenants}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `Tổng ${total} khách thuê` }}
          scroll={{ x: 720 }}
          locale={{ emptyText: 'Chưa có khách thuê nào' }}
        />
      </Card>

      {/* MODAL THÊM KHÁCH THUÊ */}
      <Modal
        title="Tạo tài khoản khách thuê mới"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        confirmLoading={submitLoading}
        width={440}
        centered
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTenant} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Họ và tên khách thuê" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
            <Input placeholder="Ví dụ: Nguyễn Văn A" autoComplete="name" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số)!' }
            ]}
          >
            <Input placeholder="Ví dụ: 0987654321" inputMode="numeric" autoComplete="tel" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu đăng nhập mặc định"
            extra="Tối thiểu 6 ký tự"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mặc định!' },
              { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL SỬA THÔNG TIN KHÁCH THUÊ (T3.3) */}
      <Modal
        title="Sửa thông tin khách thuê"
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingTenant(null); }}
        onOk={() => editForm.submit()}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={submitLoading}
        width={440}
        centered
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateTenant} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Họ và tên khách thuê" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
            <Input placeholder="Ví dụ: Nguyễn Văn A" autoComplete="name" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số)!' }
            ]}
          >
            <Input placeholder="Ví dụ: 0987654321" inputMode="numeric" autoComplete="tel" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Email không đúng định dạng!' }
            ]}
          >
            <Input placeholder="Ví dụ: khachthue@example.com" autoComplete="email" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantManager;
