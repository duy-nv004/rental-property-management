import { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Spin } from 'antd';
import { Home, Plus, Trash2, Edit2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const RoomManager = () => {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsData, buildingsData] = await Promise.all([
        axiosInstance.get('/manage/rooms'),
        axiosInstance.get('/manage/buildings')
      ]);
      setRooms(roomsData);
      setBuildings(buildingsData);
    } catch (err) {
      console.error('Error fetching rooms data:', err);
      message.error('Không thể tải danh sách dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoom = async (values) => {
    setSubmitLoading(true);
    try {
      await axiosInstance.post('/manage/rooms', {
        roomNumber: values.roomNumber,
        price: values.price,
        buildingId: values.buildingId
      });
      message.success('Đã thêm phòng trọ mới thành công!');
      form.resetFields();
      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error creating room:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi thêm phòng.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    try {
      const response = await axiosInstance.delete(`/manage/rooms/${id}`);
      message.success(response.message || 'Xóa phòng trọ thành công!');
      fetchData();
    } catch (err) {
      console.error('Error deleting room:', err);
      const errMsg = err.response?.data?.message || 'Không thể xóa phòng.';
      message.error(errMsg);
    }
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const columns = [
    { 
      title: 'MÃ PHÒNG', 
      dataIndex: 'id', 
      key: 'id',
      render: (text) => <b>#{text}</b> 
    },
    { 
      title: 'SỐ PHÒNG', 
      dataIndex: 'roomNumber', 
      key: 'roomNumber',
      render: (text) => <strong style={{ color: '#1a3353' }}>{text}</strong>
    },
    { 
      title: 'TÒA NHÀ', 
      dataIndex: ['building', 'name'], 
      key: 'buildingName' 
    },
    { 
      title: 'GIÁ THUÊ / THÁNG', 
      dataIndex: 'price', 
      key: 'price',
      render: (price) => <b>{formatVND(price)}</b> 
    },
    { 
      title: 'TRẠNG THÁI', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        let color = 'default';
        let text = status;
        if (status === 'empty') { color = 'cyan'; text = 'Còn trống'; }
        else if (status === 'occupied') { color = 'orange'; text = 'Đã thuê'; }
        else if (status === 'maintenance') { color = 'red'; text = 'Bảo trì'; }
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{text}</Tag>;
      }
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title="Xóa phòng trọ"
            description="Bạn có chắc chắn muốn xóa phòng trọ này không? Hợp đồng liên quan (nếu có) sẽ bị ảnh hưởng."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDeleteRoom(record.id)}
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
          <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Danh mục  •  Phòng trọ</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Quản lý phòng trọ</h1>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={16} />} 
          style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
          onClick={() => setModalVisible(true)}
          disabled={buildings.length === 0}
        >
          Thêm phòng trọ mới
        </Button>
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        title={<Space><Home size={18} color="#1a3353" /> Danh sách phòng trọ</Space>}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="Đang tải danh sách phòng..." />
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={rooms} 
            rowKey="id" 
            pagination={{ pageSize: 8 }}
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* MODAL THÊM PHÒNG */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Home size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thêm Phòng trọ mới</span>}
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
            Lưu lại
          </Button>
        ]}
        width={400}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRoom}
          requiredMark={false}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="buildingId"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Thuộc tòa nhà</span>}
            rules={[{ required: true, message: 'Vui lòng chọn tòa nhà!' }]}
          >
            <Select placeholder="Chọn tòa nhà" style={{ borderRadius: '8px' }}>
              {buildings.map(b => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roomNumber"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số phòng / Tên phòng</span>}
            rules={[{ required: true, message: 'Vui lòng nhập số phòng!' }]}
          >
            <Input placeholder="Ví dụ: P.101, P.202" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="price"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Giá thuê (VND)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập giá thuê phòng!' }]}
          >
            <InputNumber 
              min={0} 
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              style={{ width: '100%', borderRadius: '8px', padding: '4px' }} 
              placeholder="3,500,000"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoomManager;