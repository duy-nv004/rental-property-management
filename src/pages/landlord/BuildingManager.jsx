import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Empty, Spin } from 'antd';
import { Plus, MapPin, Trash2, Building, Settings } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const BuildingManager = () => {
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // State cấu hình dịch vụ chung của tòa nhà
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceSubmitLoading, setServiceSubmitLoading] = useState(false);
  const [serviceForm] = Form.useForm();

  const fetchBuildings = async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/buildings');
      setBuildings(data);
    } catch (err) {
      console.error('Error fetching buildings:', err);
      message.error('Không thể tải danh sách tòa nhà.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  const handleCreateBuilding = async (values) => {
    setSubmitLoading(true);
    try {
      await axiosInstance.post('/manage/buildings', {
        name: values.name,
        address: values.address
      });
      message.success('Đã thêm tòa nhà mới thành công!');
      form.resetFields();
      setModalVisible(false);
      fetchBuildings();
    } catch (err) {
      console.error('Error creating building:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo tòa nhà.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBuilding = async (id) => {
    try {
      const response = await axiosInstance.delete(`/manage/buildings/${id}`);
      message.success(response.message || 'Xóa tòa nhà thành công!');
      fetchBuildings();
    } catch (err) {
      console.error('Error deleting building:', err);
      const errMsg = err.response?.data?.message || 'Không thể xóa tòa nhà.';
      message.error(errMsg);
    }
  };

  const handleOpenServiceModal = (building) => {
    setSelectedBuilding(building);
    const s = building.service || {
      electricityPrice: 3500,
      waterPrice: 20000,
      internetPrice: 100000,
      cleaningPrice: 50000
    };
    serviceForm.setFieldsValue({
      electricityPrice: parseFloat(s.electricityPrice),
      waterPrice: parseFloat(s.waterPrice),
      internetPrice: parseFloat(s.internetPrice),
      cleaningPrice: parseFloat(s.cleaningPrice)
    });
    setServiceModalVisible(true);
  };

  const handleUpdateService = async (values) => {
    setServiceSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/buildings/${selectedBuilding.id}/service`, values);
      message.success('Đã cập nhật đơn giá dịch vụ tòa nhà thành công!');
      setServiceModalVisible(false);
      fetchBuildings();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đơn giá dịch vụ.';
      message.error(errMsg);
    } finally {
      setServiceSubmitLoading(false);
    }
  };

  if (loading && buildings.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách tòa nhà..." />
      </div>
    );
  }

  const defaultImages = [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=500',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=500'
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Danh mục  •  Tòa nhà</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Quản lý Tòa nhà</h1>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={16} />} 
          style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
          onClick={() => setModalVisible(true)}
        >
          Thêm tòa nhà mới
        </Button>
      </div>

      {buildings.length === 0 ? (
        <Card bordered={false} style={{ textAlign: 'center', padding: '40px 0', borderRadius: '12px' }}>
          <Empty description="Bạn chưa thêm tòa nhà nào" />
          <Button 
            type="dashed" 
            style={{ marginTop: '16px' }}
            onClick={() => setModalVisible(true)}
          >
            Thêm ngay
          </Button>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {buildings.map((b, i) => (
            <Col xs={24} sm={12} md={8} key={b.id}>
              <Card 
                cover={
                  <img 
                    alt="building" 
                    src={defaultImages[i % defaultImages.length]} 
                    style={{ height: 180, objectFit: 'cover' }} 
                  />
                } 
                hoverable 
                style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                bodyStyle={{ padding: '20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ color: '#1a3353', fontWeight: '800', fontSize: '16px', margin: '0 0 6px 0' }}>{b.name}</h3>
                  <Popconfirm
                    title="Xóa tòa nhà"
                    description="Bạn có chắc chắn muốn xóa tòa nhà này không? Tất cả phòng trọ trống sẽ bị xóa."
                    okText="Xóa"
                    cancelText="Hủy"
                    onConfirm={() => handleDeleteBuilding(b.id)}
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<Trash2 size={16} />} 
                      style={{ padding: 0, height: 'auto' }}
                    />
                  </Popconfirm>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8c8c8c', marginBottom: '16px', fontSize: '12.5px' }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} /> 
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.address}</span>
                </div>
                
                <div style={{ display: 'flex', background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#bfbfbf', fontWeight: 'bold' }}>MÃ TÒA NHÀ</div>
                    <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>#{b.id}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#bfbfbf', fontWeight: 'bold' }}>NGÀY TẠO</div>
                    <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>

                <Button 
                  type="dashed" 
                  icon={<Settings size={14} />}
                  size="small" 
                  block
                  style={{ borderRadius: '8px', fontWeight: '600', color: '#1a3353', border: '1px dashed #1a3353', height: '32px' }}
                  onClick={() => handleOpenServiceModal(b)}
                >
                  Đơn giá dịch vụ chung
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* MODAL THÊM TÒA NHÀ */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Building size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thêm Tòa nhà mới</span>}
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
        width={450}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBuilding}
          requiredMark={false}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Tên tòa nhà</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà!' }]}
          >
            <Input placeholder="Ví dụ: Sunshine House, Chung cư cao cấp Láng" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="address"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Địa chỉ</span>}
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ tòa nhà!' }]}
          >
            <Input.TextArea rows={2} placeholder="Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CẤU HÌNH DỊCH VỤ CHUNG */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Building size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Cấu hình dịch vụ: {selectedBuilding?.name}</span>}
        open={serviceModalVisible}
        onCancel={() => setServiceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setServiceModalVisible(false)} style={{ borderRadius: '8px' }}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={serviceSubmitLoading} 
            style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }}
            onClick={() => serviceForm.submit()}
          >
            Lưu thay đổi
          </Button>
        ]}
        width={450}
        centered
      >
        <Form
          form={serviceForm}
          layout="vertical"
          onFinish={handleUpdateService}
          requiredMark={false}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="electricityPrice"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Điện (VND/kWh)</span>}
            rules={[{ required: true, message: 'Nhập đơn giá điện!' }]}
          >
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="waterPrice"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Nước (VND/m³)</span>}
            rules={[{ required: true, message: 'Nhập đơn giá nước!' }]}
          >
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="internetPrice"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Internet / tháng (VND)</span>}
            rules={[{ required: true, message: 'Nhập đơn giá internet!' }]}
          >
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="cleaningPrice"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Phí vệ sinh / tháng (VND)</span>}
            rules={[{ required: true, message: 'Nhập phí vệ sinh!' }]}
          >
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BuildingManager;