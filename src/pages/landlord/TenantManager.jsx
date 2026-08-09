import { useState, useEffect } from 'react';
import { Table, Tag, Avatar, Space, Card, Button, Modal, Form, Input, message, Popconfirm, Spin } from 'antd';
import { UserPlus, Trash2, Calendar, Phone } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const TenantManager = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/tenants');
      setTenants(data);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      message.error('Không thể tải danh sách khách thuê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
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

  const columns = [
    { 
      title: 'THÔNG TIN KHÁCH THUÊ', 
      key: 'tenantDetails',
      render: (r) => (
        <Space>
          <Avatar 
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.name)}`} 
            style={{ background: '#f1f5f9' }}
          />
          <div>
            <b style={{ color: '#1a3353' }}>{r.name}</b>
            <br />
            <small style={{ color: '#8c8c8c' }}>{r.email || 'Chưa cập nhật email'}</small>
          </div>
        </Space>
      )
    },
    { 
      title: 'SỐ ĐIỆN THOẠI', 
      dataIndex: 'phone', 
      key: 'phone',
      render: (phone) => <b>{phone}</b>
    },
    { 
      title: 'LIÊN KẾT TELEGRAM', 
      dataIndex: 'telegramChatId', 
      key: 'telegramChatId',
      render: (chatId) => {
        return chatId ? (
          <Tag color="success" style={{ fontWeight: 'bold' }}>Đã liên kết ({chatId})</Tag>
        ) : (
          <Tag color="warning" style={{ fontWeight: 'bold' }}>Chưa liên kết</Tag>
        );
      }
    },
    { 
      title: 'NGÀY TẠO TÀI KHOẢN', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => (
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {new Date(date).toLocaleDateString('vi-VN')}
        </span>
      )
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="Xóa tài khoản khách thuê"
            description="Bạn có chắc chắn muốn xóa khách thuê này không? Hợp đồng của khách thuê phải được thanh lý trước."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteTenant(record.id)}
          >
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Danh mục  •  Khách thuê</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Quản lý Khách thuê</h1>
        </div>
        <Button 
          type="primary" 
          icon={<UserPlus size={16} />} 
          style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
          onClick={() => setModalVisible(true)}
        >
          Tạo tài khoản khách thuê
        </Button>
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        title={<Space><Phone size={18} color="#1a3353" /> Danh sách khách thuê trọ</Space>}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="Đang tải danh sách khách thuê..." />
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={tenants} 
            rowKey="id" 
            pagination={{ pageSize: 8 }}
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* MODAL THÊM KHÁCH THUÊ */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><UserPlus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tạo tài khoản khách thuê mới</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)} style={{ borderRadius: '8px' }}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitLoading} 
            style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }}
            onClick={() => form.submit()}
          >
            Tạo tài khoản
          </Button>
        ]}
        width={400}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTenant}
          requiredMark={false}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Họ và tên khách thuê</span>}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A, Trần Thị B" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số điện thoại</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số)!' }
            ]}
          >
            <Input placeholder="Ví dụ: 0987654321" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Mật khẩu đăng nhập mặc định</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mặc định!' },
              { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mặc định" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantManager;