import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Modal, Form, Input, InputNumber, Select, 
  message, Popconfirm, Empty, Spin, Space, Tooltip 
} from 'antd';
import { 
  Plus, MapPin, Trash2, Building, Settings, Home, 
  User, AlertTriangle, Clock, CheckCircle2, ArrowRight, ArrowLeft, Edit2,
  FileSignature, Zap, Users, Maximize2
} from 'lucide-react';
import axiosInstance from '../../utils/axios';

const formatVND = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

const BuildingManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Tòa nhà đang được chọn để xem danh sách phòng (nếu null -> hiển thị danh sách tòa nhà)
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Modals
  const [buildingModalVisible, setBuildingModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editRoomModalVisible, setEditRoomModalVisible] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [buildingForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [editRoomForm] = Form.useForm();
  const [serviceForm] = Form.useForm();

  const defaultImages = [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=500',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=500'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buildingsData, roomsData] = await Promise.all([
        axiosInstance.get('/manage/buildings'),
        axiosInstance.get('/manage/rooms')
      ]);

      setBuildings(buildingsData);
      setRooms(roomsData);

      // Cập nhật thông tin selectedBuilding nếu đang ở trong view xem phòng
      if (selectedBuilding) {
        const updatedSelected = buildingsData.find(b => b.id === selectedBuilding.id);
        setSelectedBuilding(updatedSelected || null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      message.error('Không thể tải danh sách tòa nhà và phòng trọ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── TẠO TÒA NHÀ MỚI ────────────────────────────────────────────────────────
  const handleCreateBuilding = async (values) => {
    setSubmitLoading(true);
    try {
      const res = await axiosInstance.post('/manage/buildings', {
        name: values.name,
        address: values.address
      });
      message.success('Đã thêm tòa nhà mới thành công!');
      buildingForm.resetFields();
      setBuildingModalVisible(false);
      await fetchData();
      if (res && res.id) {
        const newB = { id: res.id, name: values.name, address: values.address, createdAt: new Date() };
        setSelectedBuilding(newB);
      }
    } catch (err) {
      console.error('Error creating building:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tòa nhà.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── XÓA TÒA NHÀ ─────────────────────────────────────────────────────────────
  const handleDeleteBuilding = async (id) => {
    try {
      const response = await axiosInstance.delete(`/manage/buildings/${id}`);
      message.success(response.message || 'Xóa tòa nhà thành công!');
      if (selectedBuilding && selectedBuilding.id === id) {
        setSelectedBuilding(null);
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting building:', err);
      message.error(err.response?.data?.message || 'Không thể xóa tòa nhà.');
    }
  };

  // ─── ĐƠN GIÁ DỊCH VỤ ────────────────────────────────────────────────────────
  const handleOpenServiceModal = (building) => {
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
    if (!selectedBuilding) return;
    setSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/buildings/${selectedBuilding.id}/service`, values);
      message.success('Đã cập nhật đơn giá dịch vụ tòa nhà!');
      setServiceModalVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể cập nhật đơn giá dịch vụ.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── TẠO PHÒNG TRỌ MỚI ─────────────────────────────────────────────────────
  const handleCreateRoom = async (values) => {
    setSubmitLoading(true);
    try {
      const bId = values.buildingId || selectedBuilding?.id;
      await axiosInstance.post('/manage/rooms', {
        roomNumber: values.roomNumber,
        price: values.price,
        capacity: values.capacity,
        area: values.area,
        buildingId: bId
      });
      message.success('Thêm phòng trọ mới thành công!');
      roomForm.resetFields();
      setRoomModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error creating room:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi thêm phòng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── SỬA THÔNG TIN PHÒNG ────────────────────────────────────────────────────
  const handleOpenEditRoomModal = (room) => {
    setSelectedRoom(room);
    editRoomForm.setFieldsValue({
      roomNumber: room.roomNumber,
      price: parseFloat(room.price),
      capacity: room.capacity || 2,
      area: room.area ? parseFloat(room.area) : 20
    });
    setEditRoomModalVisible(true);
  };

  const handleUpdateRoom = async (values) => {
    if (!selectedRoom) return;
    setSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/rooms/${selectedRoom.id}`, {
        roomNumber: values.roomNumber,
        price: values.price,
        capacity: values.capacity,
        area: values.area
      });
      message.success('Cập nhật thông tin phòng thành công!');
      setEditRoomModalVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể cập nhật phòng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── XÓA PHÒNG ──────────────────────────────────────────────────────────────
  const handleDeleteRoom = async (roomId) => {
    try {
      const response = await axiosInstance.delete(`/manage/rooms/${roomId}`);
      message.success(response.message || 'Xóa phòng thành công!');
      fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xóa phòng.');
    }
  };

  // ─── LOGIC TRẠNG THÁI PHÒNG ────────────────────────────────────────────────
  const getRoomStatusDetails = (room) => {
    const hasUnpaidInvoice = room.invoices && room.invoices.some(inv => !inv.isPaid);
    const activeContract = room.contracts && room.contracts.find(c => c.status === 'active');
    const tenantName = activeContract?.tenant?.name || 'N/A';

    let isExpiringSoon = false;
    if (activeContract && activeContract.endDate) {
      const today = new Date();
      const end = new Date(activeContract.endDate);
      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        isExpiringSoon = true;
      }
    }

    if (hasUnpaidInvoice) {
      return {
        key: 'overdue',
        label: 'OVERDUE PAYMENT',
        subLabel: tenantName !== 'N/A' ? tenantName : 'Chưa đóng tiền',
        color: '#f59e0b',
        borderLeft: '4px solid #f59e0b',
        bg: '#ffffff',
        icon: <AlertTriangle size={20} color="#f59e0b" />
      };
    }

    if (isExpiringSoon) {
      return {
        key: 'expiring',
        label: 'EXPIRING CONTRACT',
        subLabel: tenantName !== 'N/A' ? tenantName : 'Sắp hết hạn',
        color: '#8b5cf6',
        borderLeft: '4px solid #8b5cf6',
        bg: '#ffffff',
        icon: <Clock size={20} color="#8b5cf6" />
      };
    }

    if (activeContract || room.status === 'occupied') {
      return {
        key: 'occupied',
        label: 'OCCUPIED',
        subLabel: tenantName !== 'N/A' ? tenantName : 'Đã thuê',
        color: '#3b82f6',
        borderLeft: '4px solid #3b82f6',
        bg: '#ffffff',
        icon: <User size={20} color="#3b82f6" />
      };
    }

    return {
      key: 'available',
      label: 'AVAILABLE',
      subLabel: 'Ready to Lease',
      color: '#10b981',
      borderLeft: '4px solid #10b981',
      bg: '#f0fdf4',
      icon: <CheckCircle2 size={20} color="#10b981" />
    };
  };

  // ─── GOM PHÒNG THEO TẦNG ────────────────────────────────────────────────────
  const getFloorNumber = (roomNumberStr) => {
    const cleanStr = String(roomNumberStr || '').replace(/\D/g, '');
    if (!cleanStr) return 1;
    const num = parseInt(cleanStr, 10);
    if (num >= 100) {
      return Math.floor(num / 100);
    }
    return 1;
  };

  const currentBuildingRooms = selectedBuilding 
    ? rooms.filter(r => r.buildingId === selectedBuilding.id)
    : [];

  const groupedRoomsByFloor = currentBuildingRooms.reduce((acc, room) => {
    const floor = getFloorNumber(room.roomNumber);
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  const sortedFloors = Object.keys(groupedRoomsByFloor)
    .map(Number)
    .sort((a, b) => b - a);

  if (loading && buildings.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách tòa nhà..." />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: TRANG DANH SÁCH TÒA NHÀ (GIỮ NGUYÊN THIẾT KẾ GỐC)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedBuilding) {
    return (
      <div style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Danh mục • Tòa nhà
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Quản lý Tòa nhà</h1>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={16} />} 
            style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={() => {
              buildingForm.resetFields();
              setBuildingModalVisible(true);
            }}
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
              onClick={() => setBuildingModalVisible(true)}
            >
              Thêm ngay
            </Button>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {buildings.map((b, i) => {
              const buildingRoomCount = rooms.filter(r => r.buildingId === b.id).length;
              return (
                <Col xs={24} sm={12} md={8} key={b.id}>
                  <Card 
                    cover={
                      <img 
                        alt="building" 
                        src={defaultImages[i % defaultImages.length]} 
                        style={{ height: 180, objectFit: 'cover', cursor: 'pointer' }} 
                        onClick={() => setSelectedBuilding(b)}
                      />
                    } 
                    hoverable 
                    style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 
                        style={{ color: '#1a3353', fontWeight: '800', fontSize: '16px', margin: '0 0 6px 0', cursor: 'pointer' }}
                        onClick={() => setSelectedBuilding(b)}
                      >
                        {b.name}
                      </h3>
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
                    
                    <div style={{ display: 'flex', background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#bfbfbf', fontWeight: 'bold' }}>SỐ PHÒNG</div>
                        <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>{buildingRoomCount} phòng</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#bfbfbf', fontWeight: 'bold' }}>NGÀY TẠO</div>
                        <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '13px' }}>
                          {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* NÚT BẤM VÀO XEM SƠ ĐỒ PHÒNG CỦA TÒA NHÀ */}
                      <Button 
                        type="primary" 
                        icon={<ArrowRight size={14} />}
                        block
                        style={{ background: '#1a3353', border: 'none', borderRadius: '8px', fontWeight: '700', height: '36px' }}
                        onClick={() => setSelectedBuilding(b)}
                      >
                        Xem sơ đồ phòng
                      </Button>

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
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* MODAL THÊM TÒA NHÀ MỚI */}
        <Modal
          title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Building size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thêm Tòa nhà mới</span>}
          open={buildingModalVisible}
          onCancel={() => setBuildingModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setBuildingModalVisible(false)} style={{ borderRadius: '8px' }}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }} onClick={() => buildingForm.submit()}>Lưu lại</Button>
          ]}
          width={450}
          centered
        >
          <Form form={buildingForm} layout="vertical" onFinish={handleCreateBuilding} requiredMark={false} style={{ marginTop: '16px' }}>
            <Form.Item name="name" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Tên tòa nhà</span>} rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà!' }]}>
              <Input placeholder="Ví dụ: Sunshine House, Chung cư cao cấp Láng" style={{ borderRadius: '8px', padding: '8px 12px' }} />
            </Form.Item>
            <Form.Item name="address" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Địa chỉ</span>} rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
              <Input.TextArea rows={2} placeholder="Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP" style={{ borderRadius: '8px' }} />
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL ĐƠN GIÁ DỊCH VỤ CHUNG */}
        <Modal
          title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Building size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Cấu hình dịch vụ: {selectedBuilding?.name}</span>}
          open={serviceModalVisible}
          onCancel={() => setServiceModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setServiceModalVisible(false)} style={{ borderRadius: '8px' }}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }} onClick={() => serviceForm.submit()}>Lưu thay đổi</Button>
          ]}
          width={450}
          centered
        >
          <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} style={{ marginTop: '16px' }}>
            <Form.Item name="electricityPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Điện (VND/kWh)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="waterPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Nước (VND/m³)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="internetPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Internet / tháng (VND)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
            <Form.Item name="cleaningPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Phí vệ sinh / tháng (VND)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: KHI BẤM VÀO 1 TÒA NHÀ -> HIỂN THỊ DANH SÁCH CÁC PHÒNG "THE ROOM MATRIX"
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* HEADER CHI TIẾT TÒA NHÀ & NÚT QUAY LẠI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Button 
            type="link" 
            icon={<ArrowLeft size={16} />}
            onClick={() => setSelectedBuilding(null)}
            style={{ padding: 0, fontWeight: '700', color: '#6366f1', marginBottom: '8px', display: 'flex', alignItems: 'center' }}
          >
            Quay lại danh sách tòa nhà
          </Button>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>
            {selectedBuilding.name}
          </h1>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} /> {selectedBuilding.address}
          </div>
        </div>

        <Space size="middle">
          <Button 
            type="primary" 
            icon={<Plus size={16} />} 
            style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={() => {
              roomForm.resetFields();
              roomForm.setFieldsValue({ buildingId: selectedBuilding.id });
              setRoomModalVisible(true);
            }}
          >
            Thêm phòng mới
          </Button>

          <Button 
            type="dashed" 
            icon={<Settings size={16} />} 
            style={{ height: '40px', borderRadius: '8px', fontWeight: '600' }}
            onClick={() => handleOpenServiceModal(selectedBuilding)}
          >
            Đơn giá dịch vụ
          </Button>
        </Space>
      </div>

      {/* ─── THE ROOM MATRIX CARD ───────────────────────────────────────────────── */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: '20px', 
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          background: '#ffffff',
          padding: '12px'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        {/* MATRIX HEADER & LEGEND */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
              The Room Matrix
            </h2>
            <div style={{ color: '#64748b', fontSize: '13.5px', fontWeight: '500', marginTop: '4px' }}>
              Real-time occupancy and payment status overview
            </div>
          </div>

          {/* LEGEND PILLS */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              background: '#f8fafc', 
              padding: '8px 16px', 
              borderRadius: '30px', 
              border: '1px solid #f1f5f9',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span>
              Occupied
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
              Overdue
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></span>
              Expiring
            </div>
          </div>
        </div>

        {/* DANH SÁCH PHÒNG THEO TẦNG */}
        {currentBuildingRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Empty description="Tòa nhà này chưa có phòng trọ nào" />
            <Button 
              type="primary" 
              style={{ marginTop: '16px', background: '#1a3353', borderRadius: '8px' }}
              onClick={() => {
                roomForm.resetFields();
                roomForm.setFieldsValue({ buildingId: selectedBuilding.id });
                setRoomModalVisible(true);
              }}
            >
              + Thêm phòng đầu tiên
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            {sortedFloors.map(floorNum => {
              const floorRooms = groupedRoomsByFloor[floorNum] || [];

              return (
                <div key={floorNum}>
                  {/* TIÊU ĐỀ TẦNG */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                      Floor {floorNum}
                    </h3>
                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                  </div>

                  {/* LƯỚI PHÒNG TRỌ TRONG TẦNG */}
                  <Row gutter={[20, 20]}>
                    {floorRooms.map(room => {
                      const status = getRoomStatusDetails(room);

                      return (
                        <Col xs={24} sm={12} md={12} lg={8} xl={6} key={room.id}>
                          <div
                            style={{
                              borderRadius: '16px',
                              background: status.bg,
                              borderLeft: status.borderLeft,
                              borderTop: '1px solid #f1f5f9',
                              borderRight: '1px solid #f1f5f9',
                              borderBottom: '1px solid #f1f5f9',
                              padding: '18px',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justify: 'space-between',
                              minHeight: '220px'
                            }}
                          >
                            {/* HÀNG ĐẦU: SỐ PHÒNG, TRẠNG THÁI VÀ NÚT CHỈNH SỬA */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <span style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: '1' }}>
                                    Phòng {room.roomNumber}
                                  </span>
                                  <div style={{ fontSize: '10.5px', fontWeight: '800', color: status.color, letterSpacing: '0.6px', marginTop: '4px' }}>
                                    {status.label}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {status.icon}
                                  <Tooltip title="Sửa thông tin phòng">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<Edit2 size={15} color="#64748b" />}
                                      onClick={() => handleOpenEditRoomModal(room)}
                                      style={{ borderRadius: '6px' }}
                                    />
                                  </Tooltip>
                                </div>
                              </div>

                              {/* THÔNG TIN CHI TIẾT HIỂN THỊ TRỰC TIẾP: GIÁ, SỨC CHỨA, DIỆN TÍCH */}
                              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.7)', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>Giá thuê:</span>
                                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{formatVND(room.price)}/tháng</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={13} color="#64748b" /> Sức chứa:
                                  </span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{room.capacity || 2} người</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Maximize2 size={13} color="#64748b" /> Diện tích:
                                  </span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{room.area || 20} m²</span>
                                </div>
                              </div>

                              {status.subLabel && status.subLabel !== 'Ready to Lease' && (
                                <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginTop: '8px' }}>
                                  👤 {status.subLabel}
                                </div>
                              )}
                            </div>

                            {/* CÁC NÚT HÀNH ĐỘNG HỢP ĐỒNG & CHỐT SỐ ĐIỆN */}
                            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {(status.key === 'available' || room.status === 'empty') && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<FileSignature size={14} />}
                                  style={{ background: '#10b981', borderColor: '#10b981', borderRadius: '8px', fontWeight: '600', flex: 1 }}
                                  onClick={() => navigate('/landlord/contracts', { state: { createForRoomId: room.id, buildingId: room.buildingId } })}
                                >
                                  Tạo hợp đồng
                                </Button>
                              )}
                              <Button
                                type="default"
                                size="small"
                                icon={<Zap size={14} color="#d97706" />}
                                style={{ borderRadius: '8px', fontWeight: '600', flex: 1, borderColor: '#fde047', background: '#fefce8', color: '#854d0e' }}
                                onClick={() => navigate('/landlord/utilities', { state: { selectedRoomId: room.id, buildingId: room.buildingId } })}
                              >
                                Chốt số điện
                              </Button>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* MODAL THÊM PHÒNG TRỌ MỚI */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Home size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thêm Phòng trọ mới</span>}
        open={roomModalVisible}
        onCancel={() => setRoomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRoomModalVisible(false)} style={{ borderRadius: '8px' }}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }} onClick={() => roomForm.submit()}>Thêm phòng</Button>
        ]}
        width={450}
        centered
      >
        <Form form={roomForm} layout="vertical" onFinish={handleCreateRoom} requiredMark={false} style={{ marginTop: '16px' }}>
          <Form.Item name="buildingId" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Tòa nhà</span>} rules={[{ required: true, message: 'Chọn tòa nhà!' }]}>
            <Select placeholder="Chọn tòa nhà" style={{ borderRadius: '8px' }}>
              {buildings.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="roomNumber" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số phòng / Mã phòng</span>} rules={[{ required: true, message: 'Vui lòng nhập số phòng!' }]}>
            <Input placeholder="Ví dụ: 101, 202, 301" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>
          <Form.Item name="price" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Giá thuê (VND/tháng)</span>} rules={[{ required: true, message: 'Vui lòng nhập giá thuê!' }]}>
            <InputNumber min={0} formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(val) => val.replace(/\$\s?|(,*)/g, '')} style={{ width: '100%', borderRadius: '8px' }} placeholder="3,500,000" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="capacity" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Sức chứa (Người)</span>} rules={[{ required: true, message: 'Nhập sức chứa!' }]} initialValue={2}>
                <InputNumber min={1} max={50} style={{ width: '100%', borderRadius: '8px' }} placeholder="2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Diện tích (m²)</span>} rules={[{ required: true, message: 'Nhập diện tích!' }]} initialValue={20}>
                <InputNumber min={1} style={{ width: '100%', borderRadius: '8px' }} placeholder="20" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* MODAL SỬA PHÒNG TRỌ */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Edit2 size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Quản lý phòng: {selectedRoom?.roomNumber}</span>}
        open={editRoomModalVisible}
        onCancel={() => setEditRoomModalVisible(false)}
        footer={[
          <Popconfirm
            key="delete"
            title="Xóa phòng trọ này?"
            description="Bạn có chắc chắn muốn xóa phòng trọ này không?"
            okText="Xóa phòng"
            cancelText="Hủy"
            onConfirm={() => {
              handleDeleteRoom(selectedRoom?.id);
              setEditRoomModalVisible(false);
            }}
          >
            <Button danger style={{ borderRadius: '8px', float: 'left' }}>Xóa phòng</Button>
          </Popconfirm>,
          <Button key="cancel" onClick={() => setEditRoomModalVisible(false)} style={{ borderRadius: '8px' }}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }} onClick={() => editRoomForm.submit()}>Cập nhật</Button>
        ]}
        width={450}
        centered
      >
        <Form form={editRoomForm} layout="vertical" onFinish={handleUpdateRoom} requiredMark={false} style={{ marginTop: '16px' }}>
          <Form.Item name="roomNumber" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số phòng / Tên phòng</span>} rules={[{ required: true, message: 'Nhập số phòng!' }]}>
            <Input style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>
          <Form.Item name="price" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Giá thuê phòng (VND)</span>} rules={[{ required: true, message: 'Nhập giá phòng!' }]}>
            <InputNumber min={0} formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(val) => val.replace(/\$\s?|(,*)/g, '')} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="capacity" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Sức chứa (Người)</span>} rules={[{ required: true, message: 'Nhập sức chứa!' }]}>
                <InputNumber min={1} max={50} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Diện tích (m²)</span>} rules={[{ required: true, message: 'Nhập diện tích!' }]}>
                <InputNumber min={1} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          {selectedRoom?.contracts && selectedRoom.contracts.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginTop: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>KHÁCH THUÊ ĐANG Ở</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                {selectedRoom.contracts[0]?.tenant?.name} ({selectedRoom.contracts[0]?.tenant?.phone})
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* MODAL CẤU HÌNH DỊCH VỤ CHUNG CỦA TÒA NHÀ */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Building size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Cấu hình dịch vụ: {selectedBuilding?.name}</span>}
        open={serviceModalVisible}
        onCancel={() => setServiceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setServiceModalVisible(false)} style={{ borderRadius: '8px' }}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} style={{ background: '#1a3353', border: 'none', borderRadius: '8px' }} onClick={() => serviceForm.submit()}>Lưu đơn giá</Button>
        ]}
        width={450}
        centered
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} style={{ marginTop: '16px' }}>
          <Form.Item name="electricityPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Điện (VND/kWh)</span>} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="waterPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Đơn giá Nước (VND/m³)</span>} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="internetPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Internet / tháng (VND)</span>} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="cleaningPrice" label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Phí vệ sinh / tháng (VND)</span>} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BuildingManager;