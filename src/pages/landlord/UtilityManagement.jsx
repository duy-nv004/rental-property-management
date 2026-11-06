import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Select, InputNumber, Input, Checkbox, Button, Space, message, Modal, Tag, Alert, Card, Upload, Tooltip, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Calculator, CheckCircle2, Save, Camera, ArrowRight, RotateCcw } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';
import { computeMeterUsage, buildMeterSyncPayload } from '../../utils/contracts';

const UtilityManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  // State quản lý giá trị nhập chỉ số cho từng phòng:
  // { [roomId]: { electricity, water, electricityReset, waterReset, resetReason } }
  const [readingsInput, setReadingsInput] = useState({});
  const [savingRoomId, setSavingRoomId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [invoiceResult, setInvoiceResult] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [scanningStates, setScanningStates] = useState({});

  // Kỳ chốt số do chủ nhà chọn. Mặc định: ngày 1-5 là chốt cho tháng trước, sau đó là tháng hiện tại.
  const [periodDate, setPeriodDate] = useState(() =>
    (dayjs().date() <= 5 ? dayjs().subtract(1, 'month') : dayjs()).startOf('month'));
  const currentMonth = periodDate.month() + 1;
  const currentYear = periodDate.year();
  // Kỳ chốt số dạng YYYY-MM, gửi kèm khi chốt số để khớp với kỳ của hóa đơn
  const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [buildingsData, roomsData] = await Promise.all([
        axiosInstance.get('/manage/buildings'),
        axiosInstance.get('/manage/rooms')
      ]);
      setBuildings(buildingsData);
      setRooms(roomsData);

      if (location.state?.buildingId) {
        setSelectedBuildingId(location.state.buildingId);
      } else if (buildingsData.length > 0) {
        setSelectedBuildingId((prev) => prev ?? buildingsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching utility data:', err);
      if (!isSilent) message.error('Không thể tải danh sách dữ liệu.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchData]);

  // Lấy chỉ số cũ = bản ghi của kỳ gần nhất TRƯỚC kỳ hiện tại, giống cách backend tính hóa đơn.
  const getLatestReading = (roomReadings, type) => {
    if (!roomReadings || roomReadings.length === 0) return 0;
    const filtered = roomReadings
      .filter(r => r.type === type && r.period && r.period < currentPeriod)
      .sort((a, b) => b.period.localeCompare(a.period));
    return filtered.length > 0 ? filtered[0].readingValue : 0;
  };

  // Phòng đã xuất hóa đơn kỳ này thì coi là đã chốt: hiện số cũ -> số mới, không cho chốt lại
  const isClosed = (room) => (room.invoices || []).some(i => Number(i.month) === currentMonth && Number(i.year) === currentYear);
  const getCurrentReading = (roomReadings, type) =>
    (roomReadings || []).find(r => r.type === type && r.period === currentPeriod)?.readingValue;

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

  const validateRoomInput = (room, input) => {
    const elecVal = input?.electricity;
    const waterVal = input?.water;
    if (elecVal === undefined || elecVal === null || waterVal === undefined || waterVal === null) {
      return `Vui lòng nhập cả số điện và nước cho Phòng ${room.roomNumber}!`;
    }
    const prevElec = getLatestReading(room.readings, 'electricity');
    const prevWater = getLatestReading(room.readings, 'water');
    const elecReset = Boolean(input?.electricityReset);
    const waterReset = Boolean(input?.waterReset);
    const reason = (input?.resetReason || '').trim();

    if ((elecReset || waterReset) && reason.length < 5) {
      return `Phòng ${room.roomNumber}: Vui lòng nhập lý do thay/reset đồng hồ (tối thiểu 5 ký tự)!`;
    }
    if (!elecReset && elecVal < prevElec) {
      return `Phòng ${room.roomNumber}: Chỉ số ĐIỆN mới (${elecVal}) không được nhỏ hơn chỉ số cũ (${prevElec}). Nếu vừa thay đồng hồ, hãy bật "Thay đồng hồ mới"!`;
    }
    if (!waterReset && waterVal < prevWater) {
      return `Phòng ${room.roomNumber}: Chỉ số NƯỚC mới (${waterVal}) không được nhỏ hơn chỉ số cũ (${prevWater}). Nếu vừa thay đồng hồ, hãy bật "Thay đồng hồ mới"!`;
    }
    return null;
  };

  // 1. Chốt số & Xuất Hóa Đơn cho Từng Phòng
  const handleSaveAndGenerateInvoice = async (room) => {
    const input = readingsInput[room.id];
    const validationErr = validateRoomInput(room, input);
    if (validationErr) {
      message.error(validationErr);
      return;
    }

    setSavingRoomId(room.id);
    try {
      // B1: Ghi số điện nước (kèm cờ thay đồng hồ nếu có - T2.4)
      await axiosInstance.post(
        '/manage/meter-readings/sync',
        buildMeterSyncPayload(room.id, input, currentPeriod)
      );

      // B2: Tạo hóa đơn tháng
      const response = await axiosInstance.post('/invoices/generate', {
        roomId: room.id,
        month: currentMonth,
        year: currentYear
      });

      message.success(`Đã chốt số & xuất hóa đơn cho phòng ${room.roomNumber}!`);
      setInvoiceResult(response.invoice);
      setQrModalVisible(true);

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
    const activeRooms = rooms.filter(r => r.buildingId === selectedBuildingId && r.status === 'occupied' && !isClosed(r));

    const roomsToProcess = activeRooms.filter(r => {
      const input = readingsInput[r.id];
      return input?.electricity !== undefined && input?.electricity !== null &&
             input?.water !== undefined && input?.water !== null;
    });

    if (roomsToProcess.length === 0) {
      message.warning('Không có phòng nào được nhập chỉ số mới để chốt số!');
      return;
    }

    for (const room of roomsToProcess) {
      const validationErr = validateRoomInput(room, readingsInput[room.id]);
      if (validationErr) {
        message.error(validationErr);
        return;
      }
    }

    setBulkSaving(true);
    let successCount = 0;
    const failed = [];

    for (const room of roomsToProcess) {
      const input = readingsInput[room.id];
      try {
        await axiosInstance.post(
          '/manage/meter-readings/sync',
          buildMeterSyncPayload(room.id, input, currentPeriod)
        );
        await axiosInstance.post('/invoices/generate', {
          roomId: room.id,
          month: currentMonth,
          year: currentYear
        });
        successCount++;
      } catch (err) {
        console.error(`Lỗi chốt số phòng ${room.roomNumber}:`, err);
        failed.push({
          room: room.roomNumber,
          message: err.response?.data?.message || 'Lỗi không xác định'
        });
      }
    }

    try {
      if (failed.length === 0) {
        message.success(`Đã chốt số & xuất hóa đơn cho ${successCount} phòng!`);
        setReadingsInput({});
      } else if (successCount === 0) {
        message.error(`Không chốt được phòng nào. ${failed[0].room}: ${failed[0].message}`);
      } else {
        message.warning(
          `Đã xử lý ${successCount}/${roomsToProcess.length} phòng. ` +
          `Chưa xong: ${failed.map(f => `P.${f.room} (${f.message})`).join('; ')}`
        );
        const failedRooms = roomsToProcess
          .filter(r => failed.some(f => f.room === r.roomNumber))
          .map(r => r.id);
        setReadingsInput(prev => {
          const kept = {};
          failedRooms.forEach(id => { if (prev[id]) kept[id] = prev[id]; });
          return kept;
        });
      }
      await fetchData();
    } finally {
      setBulkSaving(false);
    }
  };

  const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  // Danh sách phòng đang thuê của tòa nhà được chọn
  const filteredRooms = rooms.filter(r => r.buildingId === selectedBuildingId && r.status === 'occupied');

  // Ô nhập chỉ số kèm nút quét ảnh bằng AI và tùy chọn Thay đồng hồ mới (T2.4)
  const MeterCell = ({ room, type, prevValue, unit }) => {
    const roomInput = readingsInput[room.id] || {};
    const currentVal = roomInput[type];
    const resetField = type === 'electricity' ? 'electricityReset' : 'waterReset';
    const isReset = Boolean(roomInput[resetField]);
    const used = computeMeterUsage(currentVal, prevValue, isReset);
    const scanning = scanningStates[`${room.id}-${type}`];
    const label = type === 'electricity' ? 'điện' : 'nước';

    if (isClosed(room)) {
      const cur = getCurrentReading(room.readings, type);
      return (
        <Space direction="vertical" size={4}>
          <Tag color="green">Đã chốt kỳ này</Tag>
          <span style={{ fontSize: 13 }}><b>{prevValue} → {cur ?? '?'}</b> {unit}</span>
        </Space>
      );
    }

    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Số cũ: <b style={{ color: '#0F172A' }}>{prevValue}</b>
          </span>
          <Checkbox
            checked={isReset}
            onChange={(e) => handleInputChange(room.id, resetField, e.target.checked)}
            style={{ fontSize: 12 }}
          >
            <span style={{ fontSize: 12, color: '#475569' }}>Thay đồng hồ mới</span>
          </Checkbox>
        </div>
        <Space size={6}>
          <InputNumber
            min={isReset ? 0 : prevValue}
            placeholder={isReset ? 'Số mới từ 0' : 'Chỉ số mới'}
            aria-label={`Chỉ số ${label} mới của phòng ${room.roomNumber}`}
            value={currentVal}
            onChange={(val) => handleInputChange(room.id, type, val)}
            style={{ width: 120 }}
          />
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              handleMeterUpload(room.id, type, file);
              return false;
            }}
          >
            <Tooltip title={`Quét số ${label} từ ảnh bằng AI`}>
              <Button
                shape="circle"
                aria-label={`Quét số ${label} phòng ${room.roomNumber}`}
                icon={<Camera size={15} />}
                loading={scanning}
              />
            </Tooltip>
          </Upload>
        </Space>
        {isReset && (
          <Input
            size="small"
            prefix={<RotateCcw size={12} style={{ color: '#64748B' }} aria-hidden="true" />}
            placeholder="Lý do thay đồng hồ (>= 5 ký tự)"
            aria-label={`Lý do thay đồng hồ phòng ${room.roomNumber}`}
            value={roomInput.resetReason || ''}
            onChange={(e) => handleInputChange(room.id, 'resetReason', e.target.value)}
          />
        )}
        {used !== null && used >= 0 && (
          <Tag color={isReset ? 'geekblue' : 'cyan'}>
            {isReset ? `Đồng hồ mới: dùng ${used} ${unit}` : `Dùng ${used} ${unit}`}
          </Tag>
        )}
      </Space>
    );
  };

  const columns = [
    {
      title: 'Phòng & Khách',
      key: 'roomTenant',
      width: 150,
      render: (_, record) => {
        const contract = record.contracts?.[0];
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A' }}>Phòng {record.roomNumber}</div>
            <div style={{ fontSize: 12, color: '#0F766E' }}>{contract?.tenant ? contract.tenant.name : '—'}</div>
          </div>
        );
      }
    },
    {
      title: 'Điện tiêu thụ (kWh)',
      key: 'electricity',
      width: 245,
      render: (_, record) => (
        <MeterCell room={record} type="electricity" prevValue={getLatestReading(record.readings, 'electricity')} unit="kWh" />
      )
    },
    {
      title: 'Nước tiêu thụ (m³)',
      key: 'water',
      width: 245,
      render: (_, record) => (
        <MeterCell room={record} type="water" prevValue={getLatestReading(record.readings, 'water')} unit="m³" />
      )
    },
    {
      title: 'Tiền phòng',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (price) => <b>{formatVND(price)}</b>
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<Calculator size={15} />}
          loading={savingRoomId === record.id}
          disabled={isClosed(record)}
          onClick={() => handleSaveAndGenerateInvoice(record)}
        >
          {isClosed(record) ? 'Đã xuất' : 'Xuất HĐ'}
        </Button>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Chốt số điện nước"
        description={`Chu kỳ hóa đơn tháng ${currentMonth}/${currentYear}. Chỉ hiển thị các phòng đang có khách thuê.`}
        extra={
          <div className="toolbar-wrap">
            <DatePicker
              picker="month"
              format="MM/YYYY"
              aria-label="Kỳ chốt số"
              allowClear={false}
              value={periodDate}
              onChange={(d) => {
                if (!d) return;
                setPeriodDate(d.startOf('month'));
                setReadingsInput({});
              }}
            />
            <Select
              aria-label="Chọn tòa nhà"
              value={selectedBuildingId}
              style={{ minWidth: 220 }}
              loading={loading}
              onChange={(val) => {
                setSelectedBuildingId(val);
                setReadingsInput({});
              }}
              placeholder="Chọn tòa nhà"
              options={buildings.map(b => ({ value: b.id, label: b.name }))}
            />
            <Button
              type="primary"
              icon={<Save size={16} />}
              loading={bulkSaving}
              disabled={filteredRooms.length === 0}
              onClick={handleBulkGenerate}
            >
              Chốt toàn bộ tòa nhà
            </Button>
          </div>
        }
      />

      <Card styles={{ body: { padding: filteredRooms.length > 0 ? 0 : 24 } }}>
        {filteredRooms.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredRooms}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 920 }}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="Không có phòng đang được thuê"
            description="Tòa nhà này chưa có phòng nào được thuê hoặc không có hợp đồng đang hoạt động."
          />
        )}
      </Card>

      {/* MODAL KẾT QUẢ XUẤT HÓA ĐƠN CHI TIẾT */}
      <Modal
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={20} color="#15803D" aria-hidden="true" /> Đã xuất hóa đơn &amp; gửi Telegram</span>}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="financials" icon={<ArrowRight size={15} />} onClick={() => { setQrModalVisible(false); navigate('/landlord/financials'); }}>
            Thống kê doanh thu
          </Button>,
          <Button key="close" type="primary" onClick={() => setQrModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={420}
        centered
      >
        {invoiceResult && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 13, color: '#475569' }}>Tổng số tiền hóa đơn</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#DC2626', marginBottom: 16 }}>{formatVND(invoiceResult.total)}</div>

            <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
              <img
                src={invoiceResult.qrCode}
                alt={`Mã VietQR thanh toán hóa đơn ${formatVND(invoiceResult.total)}`}
                style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
              />
            </div>

            <Alert
              type="success"
              showIcon
              message="Đã gửi Telegram & tích hợp SePay"
              description="Thông báo kèm mã VietQR đã được gửi tới khách thuê. Khi khách quét QR thanh toán, SePay tự động gạch nợ và cập nhật doanh thu."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UtilityManagement;
