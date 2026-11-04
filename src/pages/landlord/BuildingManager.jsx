import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Modal, Form, Input, InputNumber, Select, 
  message, Popconfirm, Empty, Spin, Tooltip, Alert
} from 'antd';
import { 
  Plus, MapPin, Trash2, Building, Settings, Home, 
  User, AlertTriangle, Clock, CheckCircle2, ArrowRight, ArrowLeft, Edit2,
  FileSignature, Zap, Users, Maximize2, RotateCcw, Wrench
} from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import axiosInstance from '../../utils/axios';

const formatVND = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

// Trạng thái phòng: dùng chung cho bộ lọc, chú thích và thẻ phòng (T2.19: thêm maintenance)
const ROOM_STATUSES = [
  { key: 'available', label: 'Còn trống', Icon: CheckCircle2 },
  { key: 'reserved', label: 'Chờ ký HĐ', Icon: FileSignature },
  { key: 'occupied', label: 'Đang thuê', Icon: User },
  { key: 'overdue', label: 'Chưa thanh toán', Icon: AlertTriangle },
  { key: 'expiring', label: 'Sắp hết hạn HĐ', Icon: Clock },
  { key: 'expired', label: 'Quá hạn HĐ', Icon: AlertTriangle },
  { key: 'maintenance', label: 'Đang bảo trì', Icon: Wrench },
];
const STATUS_BY_KEY = Object.fromEntries(ROOM_STATUSES.map(s => [s.key, s]));

const BuildingManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Tòa nhà đang được chọn để xem danh sách phòng (nếu null -> hiển thị danh sách tòa nhà)
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const selectedBuildingIdRef = useRef(null);
  selectedBuildingIdRef.current = selectedBuilding?.id || null;

  // Modals
  const [buildingModalVisible, setBuildingModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  // Tòa nhà đang sửa đơn giá dịch vụ. Trước đây dùng selectedBuilding nên mở modal
  // từ danh sách (selectedBuilding = null) thì lưu không chạy.
  const [serviceBuilding, setServiceBuilding] = useState(null);
  const [editRoomModalVisible, setEditRoomModalVisible] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [buildingsData, roomsData] = await Promise.all([
        axiosInstance.get('/manage/buildings'),
        axiosInstance.get('/manage/rooms')
      ]);

      setBuildings(buildingsData);
      setRooms(roomsData);

      // Cập nhật thông tin selectedBuilding nếu đang ở trong view xem phòng
      if (selectedBuildingIdRef.current) {
        const updatedSelected = buildingsData.find(b => b.id === selectedBuildingIdRef.current);
        setSelectedBuilding(updatedSelected || null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      message.error('Không thể tải danh sách tòa nhà và phòng trọ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchData(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, [fetchData]);

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

  // ─── ĐƠN GIÁ DỊCH VỤ (T2.18: đồng bộ waterPrice 30000) ───────────────────────
  const handleOpenServiceModal = (building) => {
    if (!building) return;
    setServiceBuilding(building);
    const s = building.service || {
      electricityPrice: 3500,
      waterPrice: 30000,
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
    if (!serviceBuilding) return;
    setSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/buildings/${serviceBuilding.id}/service`, values);
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
  const isRoomOccupiedOrReserved = (room) => {
    if (!room) return false;
    if (['occupied', 'reserved'].includes(room.status)) return true;
    return Array.isArray(room.contracts) && room.contracts.length > 0;
  };

  const handleOpenEditRoomModal = (room) => {
    setSelectedRoom(room);
    editRoomForm.setFieldsValue({
      roomNumber: room.roomNumber,
      price: parseFloat(room.price),
      capacity: room.capacity || 2,
      area: room.area ? parseFloat(room.area) : 20,
      status: room.status === 'maintenance' ? 'maintenance' : 'empty'
    });
    setEditRoomModalVisible(true);
  };

  const handleUpdateRoom = async (values) => {
    if (!selectedRoom) return;
    setSubmitLoading(true);
    try {
      const payload = {
        roomNumber: values.roomNumber,
        price: values.price,
        capacity: values.capacity,
        area: values.area
      };
      if (!isRoomOccupiedOrReserved(selectedRoom) && values.status) {
        payload.status = values.status;
      }
      await axiosInstance.put(`/manage/rooms/${selectedRoom.id}`, payload);
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

  // ─── LOGIC TRẠNG THÁI PHÒNG (T2.19: hỗ trợ maintenance) ─────────────────────
  const getRoomStatusDetails = (room) => {
    if (room.status === 'maintenance') {
      return { key: 'maintenance', tenantName: null, contractId: null };
    }
    const activeContract = room.contracts && room.contracts.find(c => c.status === 'active');
    const tenantName = activeContract?.tenant?.name || null;
    // Chỉ tính hóa đơn của hợp đồng hiện tại: nợ của khách cũ không làm phòng bị đánh dấu "Chưa thanh toán".
    const hasUnpaidInvoice = !!activeContract && (room.invoices || []).some(inv => !inv.isPaid && inv.contractId === activeContract.id);

    let diffDays = null;
    if (activeContract && activeContract.endDate) {
      diffDays = Math.ceil((new Date(activeContract.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    }

    const contractId = activeContract?.id || null;
    if (diffDays !== null && diffDays < 0) return { key: 'expired', tenantName, contractId };
    if (hasUnpaidInvoice) return { key: 'overdue', tenantName, contractId };
    if (diffDays !== null && diffDays <= 30) return { key: 'expiring', tenantName, contractId };
    if (activeContract || room.status === 'occupied') return { key: 'occupied', tenantName, contractId };
    // Đã lập hợp đồng, đang chờ khách ký (backend giữ chỗ phòng ở trạng thái 'reserved')
    if (room.status === 'reserved') return { key: 'reserved', tenantName: null, contractId: null };
    return { key: 'available', tenantName: null, contractId: null };
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

  const roomsWithStatus = currentBuildingRooms.map(room => ({ room, status: getRoomStatusDetails(room) }));

  const statusCounts = roomsWithStatus.reduce((acc, { status }) => {
    acc[status.key] = (acc[status.key] || 0) + 1;
    return acc;
  }, {});
  const totalRooms = currentBuildingRooms.length;
  const occupancyRate = totalRooms
    ? Math.round(((totalRooms - (statusCounts.available || 0) - (statusCounts.maintenance || 0)) / totalRooms) * 100)
    : 0;

  const visibleRooms = statusFilter === 'all'
    ? roomsWithStatus
    : roomsWithStatus.filter(r => r.status.key === statusFilter);

  const groupedRoomsByFloor = visibleRooms.reduce((acc, item) => {
    const floor = getFloorNumber(item.room.roomNumber);
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(item);
    return acc;
  }, {});

  const sortedFloors = Object.keys(groupedRoomsByFloor)
    .map(Number)
    .sort((a, b) => b - a);


  const modalTitle = (icon, text) => <span className="modal-title">{icon} {text}</span>;

  // Form đơn giá dịch vụ dùng chung cho cả 2 view (T2.18: thêm chú thích lưu ý)
  const serviceFormItems = (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Lưu ý: Đơn giá mới chỉ áp dụng cho các hợp đồng tạo mới, không làm thay đổi hợp đồng đang hiệu lực."
      />
      <Form.Item name="electricityPrice" label="Đơn giá Điện (VND/kWh)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="waterPrice" label="Đơn giá Nước (VND/m³)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="internetPrice" label="Internet / tháng (VND)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="cleaningPrice" label="Phí vệ sinh / tháng (VND)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
    </>
  );

  if (loading && buildings.length === 0) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải danh sách tòa nhà..." />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: TRANG DANH SÁCH TÒA NHÀ
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedBuilding) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Quản lý Tòa nhà"
          description="Danh mục tòa nhà, số phòng và đơn giá dịch vụ chung."
          extra={
            <Button
              type="primary"
              size="large"
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => {
                buildingForm.resetFields();
                setBuildingModalVisible(true);
              }}
            >
              Thêm tòa nhà mới
            </Button>
          }
        />

        {buildings.length === 0 ? (
          <Card variant="borderless" className="stat-card empty-card">
            <Empty description="Bạn chưa thêm tòa nhà nào" />
            <Button type="dashed" onClick={() => setBuildingModalVisible(true)}>
              Thêm ngay
            </Button>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {buildings.map((b, i) => {
              const buildingRoomCount = rooms.filter(r => r.buildingId === b.id).length;
              return (
                <Col xs={24} sm={12} lg={8} key={b.id}>
                  <Card
                    variant="borderless"
                    className="stat-card building-card"
                    hoverable
                    cover={
                      <img
                        alt={`Ảnh tòa nhà ${b.name}`}
                        src={defaultImages[i % defaultImages.length]}
                        className="building-cover"
                        loading="lazy"
                        onClick={() => setSelectedBuilding(b)}
                      />
                    }
                  >
                    <div className="building-head">
                      <button type="button" className="building-name" onClick={() => setSelectedBuilding(b)}>
                        {b.name}
                      </button>
                      <Popconfirm
                        title="Xóa tòa nhà"
                        description="Bạn có chắc chắn muốn xóa tòa nhà này không? Chỉ xóa được khi tòa nhà không còn phòng trọ nào."
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => handleDeleteBuilding(b.id)}
                      >
                        <Button type="text" danger size="small" aria-label={`Xóa tòa nhà ${b.name}`} icon={<Trash2 size={16} aria-hidden="true" />} />
                      </Popconfirm>
                    </div>

                    <div className="building-addr" title={b.address}>
                      <MapPin size={14} aria-hidden="true" />
                      <span>{b.address}</span>
                    </div>

                    <div className="building-stats">
                      <div>
                        <div className="building-stat-label">SỐ PHÒNG</div>
                        <div className="building-stat-value">{buildingRoomCount} phòng</div>
                      </div>
                      <div>
                        <div className="building-stat-label">NGÀY TẠO</div>
                        <div className="building-stat-value">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>

                    <div className="building-actions">
                      <Button type="primary" block className="btn-dark" icon={<ArrowRight size={14} aria-hidden="true" />} onClick={() => setSelectedBuilding(b)}>
                        Xem sơ đồ phòng
                      </Button>
                      <Button type="dashed" block icon={<Settings size={14} aria-hidden="true" />} onClick={() => handleOpenServiceModal(b)}>
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
          title={modalTitle(<Building size={18} aria-hidden="true" />, 'Thêm Tòa nhà mới')}
          open={buildingModalVisible}
          onCancel={() => setBuildingModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setBuildingModalVisible(false)}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} onClick={() => buildingForm.submit()}>Lưu lại</Button>
          ]}
          width={450}
          centered
        >
          <Form form={buildingForm} layout="vertical" onFinish={handleCreateBuilding} requiredMark={false} className="modal-form">
            <Form.Item name="name" label="Tên tòa nhà" rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà!' }]}>
              <Input size="large" placeholder="Ví dụ: Sunshine House, Chung cư cao cấp Láng" />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
              <Input.TextArea rows={2} placeholder="Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP" />
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL ĐƠN GIÁ DỊCH VỤ CHUNG */}
        <Modal
          title={modalTitle(<Building size={18} aria-hidden="true" />, `Cấu hình dịch vụ: ${serviceBuilding?.name || ''}`)}
          open={serviceModalVisible}
          onCancel={() => setServiceModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setServiceModalVisible(false)}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} onClick={() => serviceForm.submit()}>Lưu thay đổi</Button>
          ]}
          width={450}
          centered
        >
          <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} className="modal-form">
            {serviceFormItems}
          </Form>
        </Modal>
      </div>
    );
  }

  const openCreateRoom = () => {
    roomForm.resetFields();
    roomForm.setFieldsValue({ buildingId: selectedBuilding.id });
    setRoomModalVisible(true);
  };

  const priceFormatter = (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const priceParser = (val) => val.replace(/\$\s?|(,*)/g, '');

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: SƠ ĐỒ PHÒNG CỦA 1 TÒA NHÀ ("THE ROOM MATRIX")
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      <div className="page-header room-page-header">
        <div className="page-header-main">
          <Button type="link" className="back-link" icon={<ArrowLeft size={16} aria-hidden="true" />} onClick={() => setSelectedBuilding(null)}>
            Quay lại danh sách tòa nhà
          </Button>
          <h1 className="page-header-title">{selectedBuilding.name}</h1>
          <div className="addr-line">
            <MapPin size={14} aria-hidden="true" /> {selectedBuilding.address}
          </div>
        </div>

        {/* Bộ lọc theo trạng thái, kiêm tổng quan số phòng */}
        <div className="room-summary" role="group" aria-label="Lọc phòng theo trạng thái">
          <button
            type="button"
            className={`summary-tile is-all${statusFilter === 'all' ? ' is-active' : ''}`}
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            title={`Lấp đầy ${occupancyRate}%`}
          >
            <Home size={14} aria-hidden="true" />
            <span className="summary-label">Tất cả</span>
            <span className="summary-value">{totalRooms}</span>
            <span className="summary-sub">· {occupancyRate}% lấp đầy</span>
          </button>
          {ROOM_STATUSES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`summary-tile is-${key}${statusFilter === key ? ' is-active' : ''}`}
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="summary-label">{label}</span>
              <span className="summary-value">{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="page-header-actions">
          <Button icon={<Settings size={16} aria-hidden="true" />} onClick={() => handleOpenServiceModal(selectedBuilding)}>
            Đơn giá dịch vụ
          </Button>
          <Button type="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={openCreateRoom}>
            Thêm phòng mới
          </Button>
        </div>
      </div>

      <Card variant="borderless" className="stat-card">
        <div className="matrix-head">
          <div>
            <h2 className="matrix-title">Sơ đồ phòng</h2>
            <div className="matrix-sub">
              {statusFilter === 'all'
                ? 'Tình trạng thuê và thanh toán của từng phòng, sắp xếp theo tầng.'
                : `Đang lọc: ${STATUS_BY_KEY[statusFilter]?.label || ''} (${visibleRooms.length} phòng)`}
            </div>
          </div>
          {statusFilter !== 'all' && (
            <Button onClick={() => setStatusFilter('all')}>Bỏ lọc</Button>
          )}
        </div>

        {currentBuildingRooms.length > 0 && visibleRooms.length === 0 ? (
          <div className="matrix-empty">
            <Empty description="Không có phòng nào ở trạng thái này" />
          </div>
        ) : currentBuildingRooms.length === 0 ? (
          <div className="matrix-empty">
            <Empty description="Tòa nhà này chưa có phòng trọ nào" />
            <Button type="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={openCreateRoom}>
              Thêm phòng đầu tiên
            </Button>
          </div>
        ) : (
          <div className="floor-list">
            {sortedFloors.map(floorNum => {
              const floorRooms = groupedRoomsByFloor[floorNum] || [];

              return (
                <section key={floorNum} aria-label={`Tầng ${floorNum}`}>
                  <div className="floor-head">
                    <h3 className="floor-title">Tầng {floorNum}</h3>
                    <span className="floor-count">{floorRooms.length} phòng</span>
                    <div className="floor-line" aria-hidden="true" />
                  </div>

                  <Row gutter={[16, 16]}>
                    {floorRooms.map(({ room, status }) => {
                      const { label, Icon } = STATUS_BY_KEY[status.key];

                      return (
                        <Col xs={24} sm={12} lg={8} xl={6} key={room.id}>
                          <div className={`room-card is-${status.key}`}>
                            <div>
                              <div className="room-top">
                                <div>
                                  <div className="room-number">Phòng {room.roomNumber}</div>
                                  <span className="room-status">
                                    <Icon size={12} aria-hidden="true" /> {label}
                                  </span>
                                </div>
                                <div className="room-tools">
                                  <Tooltip title="Sửa thông tin phòng">
                                    <Button
                                      type="text"
                                      size="small"
                                      aria-label={`Sửa phòng ${room.roomNumber}`}
                                      icon={<Edit2 size={15} color="#64748B" aria-hidden="true" />}
                                      onClick={() => handleOpenEditRoomModal(room)}
                                    />
                                  </Tooltip>
                                </div>
                              </div>

                              <div className="room-specs">
                                <div className="room-spec">
                                  <span className="room-spec-label">Giá thuê</span>
                                  <span className="room-price">{formatVND(room.price)}<small>/tháng</small></span>
                                </div>
                                <div className="room-spec">
                                  <span className="room-spec-label"><Users size={13} aria-hidden="true" /> Sức chứa</span>
                                  <span>{room.capacity || 2} người</span>
                                </div>
                                <div className="room-spec">
                                  <span className="room-spec-label"><Maximize2 size={13} aria-hidden="true" /> Diện tích</span>
                                  <span>{room.area || 20} m²</span>
                                </div>
                              </div>

                              <div className="room-tenant">
                                <User size={13} aria-hidden="true" />
                                {status.tenantName || {
                                  available: 'Sẵn sàng cho thuê',
                                  reserved: 'Đang chờ khách ký hợp đồng',
                                  maintenance: 'Đang tạm ngưng để bảo trì',
                                }[status.key] || 'Chưa có thông tin khách thuê'}
                              </div>
                            </div>

                            <div className="room-actions">
                              {status.key === 'available' && (
                                <Button
                                  type="primary"
                                  size="small"
                                  className="btn-success"
                                  icon={<FileSignature size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts', { state: { createForRoomId: room.id, buildingId: room.buildingId } })}
                                >
                                  Tạo hợp đồng
                                </Button>
                              )}
                              {status.key === 'reserved' && (
                                <Button
                                  size="small"
                                  icon={<FileSignature size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts')}
                                >
                                  Xem hợp đồng
                                </Button>
                              )}
                              {(status.key === 'expiring' || status.key === 'expired') && status.contractId && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<RotateCcw size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts', { state: { renewContractId: status.contractId } })}
                                >
                                  Gia hạn
                                </Button>
                              )}
                              {status.key !== 'available' && status.key !== 'reserved' && status.key !== 'maintenance' && (
                              <Button
                                size="small"
                                className="btn-meter"
                                icon={<Zap size={14} color="#D97706" aria-hidden="true" />}
                                onClick={() => navigate('/landlord/utilities', { state: { selectedRoomId: room.id, buildingId: room.buildingId } })}
                              >
                                Chốt số điện
                              </Button>
                              )}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </section>
              );
            })}
          </div>
        )}
      </Card>

      {/* MODAL THÊM PHÒNG TRỌ MỚI */}
      <Modal
        title={modalTitle(<Home size={18} aria-hidden="true" />, 'Thêm Phòng trọ mới')}
        open={roomModalVisible}
        onCancel={() => setRoomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRoomModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => roomForm.submit()}>Thêm phòng</Button>
        ]}
        width={450}
        centered
      >
        <Form form={roomForm} layout="vertical" onFinish={handleCreateRoom} requiredMark={false} className="modal-form">
          <Form.Item name="buildingId" label="Tòa nhà" rules={[{ required: true, message: 'Chọn tòa nhà!' }]}>
            <Select placeholder="Chọn tòa nhà">
              {buildings.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="roomNumber" label="Số phòng / Mã phòng" rules={[{ required: true, message: 'Vui lòng nhập số phòng!' }]}>
            <Input placeholder="Ví dụ: 101, 202, 301" />
          </Form.Item>
          <Form.Item name="price" label="Giá thuê (VND/tháng)" rules={[{ required: true, message: 'Vui lòng nhập giá thuê!' }]}>
            <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" placeholder="3,500,000" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="capacity" label="Sức chứa (Người)" rules={[{ required: true, message: 'Nhập sức chứa!' }]} initialValue={2}>
                <InputNumber min={1} max={50} className="w-full" placeholder="2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="area" label="Diện tích (m²)" rules={[{ required: true, message: 'Nhập diện tích!' }]} initialValue={20}>
                <InputNumber min={1} className="w-full" placeholder="20" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* MODAL SỬA PHÒNG TRỌ */}
      <Modal
        title={modalTitle(<Edit2 size={18} aria-hidden="true" />, `Quản lý phòng: ${selectedRoom?.roomNumber || ''}`)}
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
            <Button danger className="footer-left">Xóa phòng</Button>
          </Popconfirm>,
          <Button key="cancel" onClick={() => setEditRoomModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => editRoomForm.submit()}>Cập nhật</Button>
        ]}
        width={450}
        centered
      >
        <Form form={editRoomForm} layout="vertical" onFinish={handleUpdateRoom} requiredMark={false} className="modal-form">
          <Form.Item name="roomNumber" label="Số phòng / Tên phòng" rules={[{ required: true, message: 'Nhập số phòng!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Giá thuê phòng (VND)" rules={[{ required: true, message: 'Nhập giá phòng!' }]}>
            <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="capacity" label="Sức chứa (Người)" rules={[{ required: true, message: 'Nhập sức chứa!' }]}>
                <InputNumber min={1} max={50} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="area" label="Diện tích (m²)" rules={[{ required: true, message: 'Nhập diện tích!' }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          {!isRoomOccupiedOrReserved(selectedRoom) && (
            <Form.Item name="status" label="Trạng thái phòng">
              <Select>
                <Select.Option value="empty">Còn trống</Select.Option>
                <Select.Option value="maintenance">Đang bảo trì</Select.Option>
              </Select>
            </Form.Item>
          )}

          {selectedRoom?.contracts && selectedRoom.contracts.length > 0 && (
            <div className="tenant-box">
              <div className="tenant-box-label">Khách thuê đang ở</div>
              <div className="tenant-box-value">
                {selectedRoom.contracts[0]?.tenant?.name} ({selectedRoom.contracts[0]?.tenant?.phone})
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* MODAL CẤU HÌNH DỊCH VỤ CHUNG CỦA TÒA NHÀ */}
      <Modal
        title={modalTitle(<Building size={18} aria-hidden="true" />, `Cấu hình dịch vụ: ${serviceBuilding?.name || ''}`)}
        open={serviceModalVisible}
        onCancel={() => setServiceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setServiceModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => serviceForm.submit()}>Lưu đơn giá</Button>
        ]}
        width={450}
        centered
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} className="modal-form">
          {serviceFormItems}
        </Form>
      </Modal>
    </div>
  );
};

export default BuildingManager;
