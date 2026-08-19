import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Select, InputNumber, Button, Space, message, Modal, Tag, Alert, Card, Upload, Tooltip } from 'antd';
import { Calculator, CheckCircle2, Save, Camera, ArrowRight } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const UtilityManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  
  // State quản lý giá trị nhập chỉ số cho từng phòng: { [roomId]: { electricity, water } }
  const [readingsInput, setReadingsInput] = useState({});
  const [savingRoomId, setSavingRoomId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [invoiceResult, setInvoiceResult] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buildingsData, roomsData] = await Promise.all([
        axiosInstance.get('/manage/buildings'),
        axiosInstance.get('/manage/rooms')
      ]);
      setBuildings(buildingsData);
      setRooms(roomsData);
      
      if (buildingsData.length > 0) {
        setSelectedBuildingId(buildingsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching utility data:', err);
      message.error('Không thể tải danh sách dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lấy chỉ số đo lường cũ gần nhất của phòng
  const getLatestReading = (roomReadings, type) => {
    if (!roomReadings || roomReadings.length === 0) return 0;
    const filtered = roomReadings
      .filter(r => r.type === type)
      .sort((a, b) => (b.id || 0) - (a.id || 0) || new Date(b.createdAt || b.readingDate) - new Date(a.createdAt || a.readingDate));
    return filtered.length > 0 ? filtered[0].readingValue : 0;
  };

  // Cập nhật giá trị nhập vào ô Input của từng phòng
  const handleInputChange = (roomId, field, value) => {
    setReadingsInput(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value
      }
    }));
  };

  const [scanningStates, setScanningStates] = useState({});

  const handleMeterUpload = async (roomId, type, file) => {
    const stateKey = `${roomId}-${type}`;
    setScanningStates(prev => ({ ...prev, [stateKey]: true }));
    const formData = new FormData();
    formData.append('meterImage', file);
    
    try {
      const res = await axiosInstance.post('/ai/read-meter', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res && res.readingValue !== undefined) {
        const val = res.readingValue;
        handleInputChange(roomId, type, val);
        message.success(`AI quét chỉ số ${type === 'electricity' ? 'Điện' : 'Nước'} thành công: ${val}`);
      } else {
        message.warning('AI không tìm thấy chỉ số phù hợp, vui lòng nhập thủ công.');
      }
    } catch (err) {
      console.error('Meter scan error:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi quét chỉ số đồng hồ.');
    } finally {
      setScanningStates(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  // 1. Chốt số & Xuất Hóa Đơn cho Từng Phòng
  const handleSaveAndGenerateInvoice = async (room) => {
    const input = readingsInput[room.id];
    const elecVal = input?.electricity;
    const waterVal = input?.water;

    if (elecVal === undefined || elecVal === null || waterVal === undefined || waterVal === null) {
      message.warning(`Vui lòng nhập cả số điện và nước cho Phòng ${room.roomNumber}!`);
      return;
    }

    const prevElec = getLatestReading(room.readings, 'electricity');
    const prevWater = getLatestReading(room.readings, 'water');

    if (elecVal < prevElec) {
      message.error(`Chỉ số ĐIỆN mới (${elecVal}) không được nhỏ hơn chỉ số cũ (${prevElec})!`);
      return;
    }
    if (waterVal < prevWater) {
      message.error(`Chỉ số NƯỚC mới (${waterVal}) không được nhỏ hơn chỉ số cũ (${prevWater})!`);
      return;
    }

    setSavingRoomId(room.id);
    try {
      // B1: Ghi số điện nước
      await axiosInstance.post('/manage/meter-readings/sync', {
        roomId: room.id,
        electricityValue: elecVal,
        waterValue: waterVal
      });

      // B2: Tạo hóa đơn tháng
      const response = await axiosInstance.post('/invoices/generate', {
        roomId: room.id,
        month: currentMonth,
        year: currentYear
      });

      message.success(`Đã chốt số & Xuất hóa đơn thành công cho phòng ${room.roomNumber}!`);
      setInvoiceResult(response.invoice);
      setQrModalVisible(true);
      
      // Reload dữ liệu
      await fetchData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || `Lỗi chốt số hóa đơn phòng ${room.roomNumber}.`;
      message.error(errMsg);
    } finally {
      setSavingRoomId(null);
    }
  };

  // 2. Chốt số & Xuất Hóa Đơn Hàng loạt (Toàn bộ tòa nhà)
  const handleBulkGenerate = async () => {
    const activeRooms = rooms.filter(r => r.buildingId === selectedBuildingId && r.status === 'occupied');
    
    // Lọc ra các phòng có nhập liệu đầy đủ
    const roomsToProcess = activeRooms.filter(r => {
      const input = readingsInput[r.id];
      return input?.electricity !== undefined && input?.electricity !== null &&
             input?.water !== undefined && input?.water !== null;
    });

    if (roomsToProcess.length === 0) {
      message.warning('Không có phòng nào được nhập chỉ số mới để chốt số!');
      return;
    }

    // Xác nhận tính chỉ số cũ/mới hợp lệ trước khi gọi API
    for (const room of roomsToProcess) {
      const input = readingsInput[room.id];
      const prevElec = getLatestReading(room.readings, 'electricity');
      const prevWater = getLatestReading(room.readings, 'water');
      if (input.electricity < prevElec) {
        message.error(`Lỗi Phòng ${room.roomNumber}: Chỉ số Điện mới không được nhỏ hơn chỉ số cũ!`);
        return;
      }
      if (input.water < prevWater) {
        message.error(`Lỗi Phòng ${room.roomNumber}: Chỉ số Nước mới không được nhỏ hơn chỉ số cũ!`);
        return;
      }
    }

    setBulkSaving(true);
    let successCount = 0;
    try {
      await Promise.all(roomsToProcess.map(async (room) => {
        const input = readingsInput[room.id];
        // B1: Ghi số
        await axiosInstance.post('/manage/meter-readings/sync', {
          roomId: room.id,
          electricityValue: input.electricity,
          waterValue: input.water
        });
        // B2: Tạo hóa đơn
        await axiosInstance.post('/invoices/generate', {
          roomId: room.id,
          month: currentMonth,
          year: currentYear
        });
        successCount++;
      }));

      message.success(`Đã chốt số & Xuất hóa đơn thành công cho ${successCount} phòng!`);
      // Clear inputs
      setReadingsInput({});
      await fetchData();
    } catch (err) {
      console.error(err);
      message.error('Gặp lỗi khi xử lý chốt số hàng loạt. Vui lòng thử lại.');
    } finally {
      setBulkSaving(false);
    }
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Danh sách phòng đang thuê của tòa nhà được chọn
  const filteredRooms = rooms.filter(r => r.buildingId === selectedBuildingId && r.status === 'occupied');

  const columns = [
    {
      title: 'PHÒNG TRỌ',
      dataIndex: 'roomNumber',
      key: 'roomNumber',
      render: (text) => <strong>Phòng {text}</strong>
    },
    {
      title: 'KHÁCH THUÊ',
      key: 'tenant',
      render: (_, record) => {
        const contract = record.contracts?.[0];
        return (
          <div>
            <div><strong>{contract?.tenant ? contract.tenant.name : 'N/A'}</strong></div>
            {contract?.tenant && <small style={{ color: '#8c8c8c' }}>{contract.tenant.phone}</small>}
          </div>
        );
      }
    },
    {
      title: 'ĐIỆN TIÊU THỤ (kWh)',
      key: 'electricity',
      render: (_, record) => {
        const prevElec = getLatestReading(record.readings, 'electricity');
        const currentVal = readingsInput[record.id]?.electricity;
        const used = (currentVal !== undefined && currentVal >= prevElec) ? (currentVal - prevElec) : 0;

        return (
          <Space direction="vertical" size={2}>
            <div><small style={{ color: '#8c8c8c' }}>Số cũ: {prevElec}</small></div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <InputNumber 
                min={prevElec} 
                placeholder="Chỉ số mới" 
                value={readingsInput[record.id]?.electricity}
                onChange={(val) => handleInputChange(record.id, 'electricity', val)}
                style={{ width: '100px', borderRadius: '6px' }}
              />
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleMeterUpload(record.id, 'electricity', file);
                  return false;
                }}
              >
                <Tooltip title="Chụp/Quét số điện bằng AI">
                  <Button 
                    type="dashed" 
                    shape="circle" 
                    icon={<Camera size={14} />} 
                    loading={scanningStates[`${record.id}-electricity`]}
                    style={{ 
                      borderColor: '#10b981', 
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }} 
                  />
                </Tooltip>
              </Upload>
            </div>
            {used > 0 && <Tag color="blue">Dùng: {used} số</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'NƯỚC TIÊU THỤ (m³)',
      key: 'water',
      render: (_, record) => {
        const prevWater = getLatestReading(record.readings, 'water');
        const currentVal = readingsInput[record.id]?.water;
        const used = (currentVal !== undefined && currentVal >= prevWater) ? (currentVal - prevWater) : 0;

        return (
          <Space direction="vertical" size={2}>
            <div><small style={{ color: '#8c8c8c' }}>Số cũ: {prevWater}</small></div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <InputNumber 
                min={prevWater} 
                placeholder="Chỉ số mới" 
                value={readingsInput[record.id]?.water}
                onChange={(val) => handleInputChange(record.id, 'water', val)}
                style={{ width: '100px', borderRadius: '6px' }}
              />
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleMeterUpload(record.id, 'water', file);
                  return false;
                }}
              >
                <Tooltip title="Chụp/Quét số nước bằng AI">
                  <Button 
                    type="dashed" 
                    shape="circle" 
                    icon={<Camera size={14} />} 
                    loading={scanningStates[`${record.id}-water`]}
                    style={{ 
                      borderColor: '#10b981', 
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }} 
                  />
                </Tooltip>
              </Upload>
            </div>
            {used > 0 && <Tag color="cyan">Dùng: {used} khối</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'TIỀN PHÒNG',
      dataIndex: 'price',
      key: 'price',
      render: (price) => <b>{formatVND(price)}</b>
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<Calculator size={14} />} 
          loading={savingRoomId === record.id}
          style={{ background: '#10b981', border: 'none', borderRadius: '6px' }}
          onClick={() => handleSaveAndGenerateInvoice(record)}
        >
          Lưu & Xuất HĐ
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'bold' }}>QUẢN LÝ / TIỆN ÍCH</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Chốt số điện nước & Xuất hóa đơn hàng loạt</h1>
        </div>
        <Space>
          <div style={{ fontWeight: '600', color: '#64748b' }}>Chọn tòa nhà vận hành:</div>
          <Select
            value={selectedBuildingId}
            style={{ width: 220 }}
            loading={loading}
            onChange={(val) => {
              setSelectedBuildingId(val);
              setReadingsInput({});
            }}
            placeholder="Chọn tòa nhà"
          >
            {buildings.map(b => (
              <Select.Option key={b.id} value={b.id}>
                {b.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#1a3353' }}>Chu kỳ hóa đơn: Tháng {currentMonth}/{currentYear}</span>
            <span style={{ color: '#8c8c8c', marginLeft: '12px' }}>•  Chỉ hiển thị các phòng đang hoạt động (có khách thuê).</span>
          </div>
          <Button 
            type="primary" 
            icon={<Save size={16} />} 
            loading={bulkSaving}
            disabled={filteredRooms.length === 0}
            style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={handleBulkGenerate}
          >
            Ghi số & Xuất HĐ toàn bộ tòa nhà
          </Button>
        </div>

        {filteredRooms.length > 0 ? (
          <Table 
            columns={columns} 
            dataSource={filteredRooms} 
            rowKey="id" 
            loading={loading}
            pagination={false}
            scroll={{ x: true }}
          />
        ) : (
          <Alert 
            message="Không có phòng đang được thuê" 
            description="Tòa nhà này hiện tại chưa có phòng nào được thuê hoặc không có phòng nào có hợp đồng đang hoạt động." 
            type="warning" 
            showIcon 
            style={{ borderRadius: '8px' }}
          />
        )}
      </Card>

      {/* MODAL KẾT QUẢ XUẤT HÓA ĐƠN CHI TIẾT */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#10b981' }}><CheckCircle2 size={20} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Xuất Hóa Đơn & Gửi Telegram thành công</span>}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button 
            key="financials" 
            type="default" 
            icon={<ArrowRight size={14} />} 
            onClick={() => {
              setQrModalVisible(false);
              navigate('/landlord/financials');
            }} 
            style={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Thống kê Doanh thu
          </Button>,
          <Button key="close" type="primary" onClick={() => setQrModalVisible(false)} style={{ background: '#1a3353', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            Đóng
          </Button>
        ]}
        width={420}
        centered
      >
        {invoiceResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Tổng số tiền hóa đơn</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginBottom: '16px' }}>
              {formatVND(invoiceResult.total)}
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <img 
                src={invoiceResult.qrCode} 
                alt="SePay VietQR Code" 
                style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
              />
            </div>
            
            <Alert 
              message="Đã gửi Telegram & Tích hợp SePay tự động"
              description="Thông báo kèm mã VietQR đã được gửi tới khách thuê. Khi khách quét QR thanh toán, SePay sẽ tự động gạch nợ hóa đơn và cập nhật doanh thu cho bạn."
              type="success"
              showIcon
              style={{ borderRadius: '8px', width: '100%' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UtilityManagement;
