import { Table, Tag, Card, Button, Space, Modal, Form, Select, DatePicker, InputNumber, message, Popconfirm, Spin, Divider, Row, Col, Checkbox, Upload, Input } from 'antd';
import { FileSignature, Plus, Eye, UploadCloud, Printer, UserPlus } from 'lucide-react';
import axiosInstance from '../../utils/axios';

import { useState, useEffect } from 'react';

const ContractManager = () => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  
  // State tạo nhanh khách thuê trong modal hợp đồng
  const [quickTenantModalVisible, setQuickTenantModalVisible] = useState(false);
  const [quickTenantLoading, setQuickTenantLoading] = useState(false);
  const [quickTenantForm] = Form.useForm();
  
  // State bật/tắt thiết lập đơn giá thỏa thuận riêng
  const [hasCustomPrices, setHasCustomPrices] = useState(false);
  
  // State quét CCCD bằng AI
  const [scanningCccd, setScanningCccd] = useState(false);
  
  // State hiển thị Modal lập hợp đồng và Modal chi tiết hợp đồng
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();



  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsData, roomsData, tenantsData, buildingsData] = await Promise.all([
        axiosInstance.get('/contracts'),
        axiosInstance.get('/manage/rooms'),
        axiosInstance.get('/manage/tenants'),
        axiosInstance.get('/manage/buildings')
      ]);
      setContracts(contractsData);
      setRooms(roomsData.filter(r => r.status === 'empty')); // Chỉ lấy phòng trống để làm hợp đồng mới
      setTenants(tenantsData);
      setBuildings(buildingsData);
    } catch (err) {
      console.error('Error fetching contracts data:', err);
      message.error('Không thể tải danh sách dữ liệu hợp đồng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xử lý Upload và Quét CCCD bằng AI
  const handleCccdUpload = async (file) => {
    setScanningCccd(true);
    const formData = new FormData();
    formData.append('cccdImage', file);
    try {
      const response = await axiosInstance.post('/ai/scan-cccd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ocrResult = response;
      if (ocrResult && ocrResult.data) {
        const { name, dob, cccdNumber, hometown } = ocrResult.data;
        form.setFieldsValue({
          tenantName: name || '',
          tenantCccd: cccdNumber || '',
          tenantDob: dob || '',
          tenantHometown: hometown || ''
        });
        message.success('AI quét và điền thông tin Căn cước công dân thành công!');
      } else {
        message.warning('AI không tìm thấy thông tin phù hợp, vui lòng nhập thủ công.');
      }
    } catch (err) {
      console.error('CCCD OCR upload error:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi phân tích ảnh CCCD.');
    } finally {
      setScanningCccd(false);
    }
  };

  const handleQuickCreateTenant = async (values) => {
    setQuickTenantLoading(true);
    try {
      const response = await axiosInstance.post('/auth/create-tenant', {
        name: values.name,
        phone: values.phone,
        password: values.password || '123456'
      });
      message.success('Đã tạo tài khoản khách thuê mới thành công!');
      quickTenantForm.resetFields();
      setQuickTenantModalVisible(false);
      
      // Refresh danh sách khách thuê và tự động chọn khách mới tạo vào form Hợp đồng
      const freshTenants = await axiosInstance.get('/manage/tenants');
      setTenants(freshTenants);
      
      const createdId = response.user?.id || freshTenants.find(t => t.phone === values.phone)?.id;
      if (createdId) {
        form.setFieldsValue({
          tenantId: createdId,
          tenantName: values.name,
          tenantPhone: values.phone
        });
      }
    } catch (err) {
      console.error('Error creating quick tenant:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản khách thuê.');
    } finally {
      setQuickTenantLoading(false);
    }
  };

  const handleCreateContract = async (values) => {
    setSubmitLoading(true);
    try {
      let finalPrices = {};
      if (hasCustomPrices) {
        finalPrices = {
          electricityPrice: values.electricityPrice,
          waterPrice: values.waterPrice,
          internetPrice: values.internetPrice,
          cleaningPrice: values.cleaningPrice
        };
      } else {
        const chosenBuilding = buildings.find(b => b.id === values.buildingId);
        const s = chosenBuilding?.service || {
          electricityPrice: 3500,
          waterPrice: 20000,
          internetPrice: 100000,
          cleaningPrice: 50000
        };
        finalPrices = {
          electricityPrice: parseFloat(s.electricityPrice),
          waterPrice: parseFloat(s.waterPrice),
          internetPrice: parseFloat(s.internetPrice),
          cleaningPrice: parseFloat(s.cleaningPrice)
        };
      }

      // Chuẩn bị danh sách đồ dùng bàn giao mặc định (luôn là đầy đủ và bình thường)
      const defaultInventory = [
        { name: 'Giường', quantity: 1, status: 'Bình thường' },
        { name: 'Tủ quần áo', quantity: 1, status: 'Bình thường' },
        { name: 'Điều hòa + điều khiển', quantity: 1, status: 'Bình thường' },
        { name: 'Bình nóng lạnh', quantity: 1, status: 'Bình thường' },
        { name: 'Bàn bếp + bồn rửa', quantity: 1, status: 'Bình thường' }
      ];

      const landlordInfo = JSON.parse(localStorage.getItem('user')) || {};
      const chosenBuilding = buildings.find(b => b.id === values.buildingId);
      const landlordAddress = chosenBuilding ? (chosenBuilding.address || chosenBuilding.name) : '';

      await axiosInstance.post('/contracts/create', {
        tenantId: values.tenantId,
        roomId: values.roomId,
        startDate: values.dates[0].format('YYYY-MM-DD'),
        endDate: values.dates[1].format('YYYY-MM-DD'),
        deposit: values.deposit,
        initialElectricity: values.initialElectricity,
        initialWater: values.initialWater,

        // Thông tin Bên A (Tự động nạp nền)
        landlordName: landlordInfo.name || '',
        landlordPhone: landlordInfo.phone || '',
        landlordCccd: landlordInfo.cccd || '',
        landlordDob: landlordInfo.dob || '',
        landlordHometown: landlordInfo.hometown || '',
        landlordAddress: landlordAddress,

        // Thông tin Bên B
        tenantCccd: values.tenantCccd,
        tenantDob: values.tenantDob,
        tenantHometown: values.tenantHometown,
        tenantPhone: values.tenantPhone,
        
        numTenants: values.numTenants || 1,
        paymentDay: values.paymentDay || 30,
        inventory: defaultInventory,
        
        ...finalPrices
      });
      message.success('Thiết lập hợp đồng thuê trọ mới thành công!');
      form.resetFields();
      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error creating contract:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo hợp đồng.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTerminateContract = async (id) => {
    try {
      const response = await axiosInstance.put(`/contracts/${id}`);
      message.success(response.message || 'Thanh lý hợp đồng thành công!');
      fetchData();
    } catch (err) {
      console.error('Error terminating contract:', err);
      const errMsg = err.response?.data?.message || 'Không thể thanh lý hợp đồng.';
      message.error(errMsg);
    }
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const columns = [
    { 
      title: 'MÃ HĐ', 
      dataIndex: 'id', 
      key: 'id',
      render: (text) => <b>#{text}</b> 
    },
    { 
      title: 'KHÁCH THUÊ (BÊN B)', 
      key: 'tenantName',
      render: (_, record) => (
        <div>
          <strong>{record.tenantCccd ? record.tenantName || record.tenant?.name : record.tenant?.name || 'Chưa gán khách'}</strong>
          <br />
          <small style={{ color: '#8c8c8c' }}>{record.tenantPhone || record.tenant?.phone || 'N/A'}</small>
        </div>
      )
    },
    { 
      title: 'PHÒNG', 
      key: 'roomNumber',
      render: (_, record) => {
        if (!record.room) return 'Không xác định';
        return `Phòng ${record.room.roomNumber} (${record.room.building?.name || ''})`;
      }
    },
    {
      title: 'THỜI HẠN THUÊ',
      key: 'period',
      render: (_, record) => {
        if (!record.startDate || !record.endDate) return 'N/A';
        const start = new Date(record.startDate).toLocaleDateString('vi-VN');
        const end = new Date(record.endDate).toLocaleDateString('vi-VN');
        return `${start} - ${end}`;
      }
    },
    { 
      title: 'TIỀN ĐẶT CỌ', 
      dataIndex: 'deposit', 
      key: 'deposit',
      render: (deposit) => <b>{formatVND(deposit)}</b> 
    },
    { 
      title: 'TRẠNG THÁI', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        let color = 'default';
        let text = status;
        if (status === 'active') { color = 'green'; text = 'Đang hoạt động'; }
        else if (status === 'terminated') { color = 'orange'; text = 'Đã thanh lý'; }
        else if (status === 'expired') { color = 'red'; text = 'Hết hạn'; }
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{text}</Tag>;
      }
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="default" 
            icon={<Eye size={14} />} 
            size="small" 
            style={{ borderRadius: '6px' }}
            onClick={() => {
              setSelectedContract(record);
              setDetailModalVisible(true);
            }}
          >
            Xem HĐ
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="Thanh lý hợp đồng"
              description="Hành động này sẽ giải phóng phòng trọ về trạng thái Trống. Bạn chắc chắn chứ?"
              okText="Xác nhận"
              cancelText="Hủy"
              onConfirm={() => handleTerminateContract(record.id)}
            >
              <Button type="primary" danger size="small" style={{ borderRadius: '6px' }}>
                Thanh lý
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Danh mục  •  Hợp đồng</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Quản lý hợp đồng</h1>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={16} />} 
          style={{ background: '#1a3353', border: 'none', height: '40px', borderRadius: '8px', fontWeight: 'bold' }}
          onClick={() => {
            setHasCustomPrices(false);
            form.resetFields();
            setModalVisible(true);
          }}
          disabled={tenants.length === 0 || rooms.length === 0}
        >
          Lập hợp đồng mới
        </Button>
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        title={<Space><FileSignature size={18} color="#1a3353" /> Danh sách hợp đồng thuê phòng</Space>}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="Đang tải danh sách hợp đồng..." />
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={contracts} 
            rowKey="id" 
            pagination={{ pageSize: 8 }}
            scroll={{ x: true }}
          />
        )}
      </Card>

      {/* MODAL THÊM HỢP ĐỒNG MỚI */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><FileSignature size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Lập Hợp đồng thuê phòng mới</span>}
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
            Tạo hợp đồng
          </Button>
        ]}
        width={750}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateContract}
          requiredMark={false}
          style={{ marginTop: '16px' }}
          initialValues={{
            electricityPrice: 3500,
            waterPrice: 20000,
            internetPrice: 100000,
            cleaningPrice: 50000,
            numTenants: 1,
            paymentDay: 30
          }}
        >
          <Divider style={{ fontWeight: 'bold', margin: '0 0 16px 0' }}>1. Chọn Tòa nhà & Phòng trọ</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="buildingId"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Chọn tòa nhà</span>}
                rules={[{ required: true, message: 'Vui lòng chọn tòa nhà!' }]}
              >
                <Select 
                  placeholder="Chọn tòa nhà" 
                  style={{ borderRadius: '8px' }}
                  onChange={(val) => {
                    setSelectedBuildingId(val);
                    form.setFieldsValue({ roomId: undefined });
                    
                    // Tự động điền đơn giá dịch vụ của tòa nhà được chọn
                    const chosenBuilding = buildings.find(b => b.id === val);
                    if (chosenBuilding) {
                      const s = chosenBuilding.service || {
                        electricityPrice: 3500,
                        waterPrice: 20000,
                        internetPrice: 100000,
                        cleaningPrice: 50000
                      };
                      form.setFieldsValue({
                        electricityPrice: parseFloat(s.electricityPrice),
                        waterPrice: parseFloat(s.waterPrice),
                        internetPrice: parseFloat(s.internetPrice),
                        cleaningPrice: parseFloat(s.cleaningPrice),
                        landlordAddress: chosenBuilding.address || chosenBuilding.name || ''
                      });
                    }
                  }}
                >
                  {buildings.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                name="roomId"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Phòng trống gán hợp đồng</span>}
                rules={[{ required: true, message: 'Chọn phòng trống!' }]}
              >
                <Select placeholder="Chọn phòng trống" style={{ borderRadius: '8px' }} disabled={!selectedBuildingId}>
                  {rooms
                    .filter(r => r.buildingId === selectedBuildingId)
                    .map(r => (
                      <Select.Option key={r.id} value={r.id}>Phòng {r.roomNumber}</Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="dates"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Thời hạn thuê phòng</span>}
                rules={[{ required: true, message: 'Chọn thời hạn thuê!' }]}
              >
                <DatePicker.RangePicker style={{ width: '100%', borderRadius: '8px' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ fontWeight: 'bold', margin: '16px 0' }}>2. Thông tin Bên B (Bên thuê phòng)</Divider>
          
          {/* PHẦN QUÉT CCCD AI */}
          <Card 
            size="small" 
            style={{ 
              background: '#f8fafc', 
              border: '1px dashed #cbd5e1', 
              marginBottom: '16px', 
              borderRadius: '8px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UploadCloud size={16} color="#10b981" /> Quét Căn cước công dân (CCCD) bằng AI
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Tải lên ảnh mặt trước CCCD của khách thuê để AI tự động trích xuất điền thông tin bên dưới.
                </div>
              </div>
              <Upload
                beforeUpload={(file) => {
                  handleCccdUpload(file);
                  return false; // ngăn upload tự động
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button 
                  type="primary" 
                  size="small" 
                  loading={scanningCccd} 
                  style={{ background: '#10b981', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                >
                  {scanningCccd ? 'AI đang quét...' : 'Tải lên ảnh CCCD'}
                </Button>
              </Upload>
            </div>
          </Card>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tenantId"
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>Chọn tài khoản liên kết</span>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<UserPlus size={12} />} 
                      style={{ padding: 0, height: 'auto', fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickTenantModalVisible(true);
                      }}
                    >
                      + Tạo khách mới
                    </Button>
                  </div>
                }
                rules={[{ required: true, message: 'Chọn tài khoản liên kết khách thuê!' }]}
              >
                <Select 
                  placeholder="Chọn tài khoản" 
                  style={{ borderRadius: '8px' }}
                  onChange={(val) => {
                    const matched = tenants.find(t => t.id === val);
                    if (matched) {
                      form.setFieldsValue({ 
                        tenantName: matched.name,
                        tenantPhone: matched.phone 
                      });
                    }
                  }}
                >
                  {tenants.map(t => (
                    <Select.Option key={t.id} value={t.id}>{t.name} ({t.phone})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                name="tenantName"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Họ tên người thuê (Bên B)</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên người thuê!' }]}
              >
                <Input placeholder="AI tự điền hoặc nhập tay" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="tenantPhone"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số điện thoại người thuê</span>}
                rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
              >
                <Input placeholder="AI tự điền hoặc nhập tay" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tenantCccd"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số CCCD người thuê</span>}
                rules={[{ required: true, message: 'Nhập số CCCD khách thuê!' }]}
              >
                <Input placeholder="AI tự điền hoặc nhập tay" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tenantDob"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Ngày tháng năm sinh</span>}
                rules={[{ required: true, message: 'Nhập ngày sinh!' }]}
              >
                <Input placeholder="AI tự điền hoặc nhập tay (DD/MM/YYYY)" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tenantHometown"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Hộ khẩu thường trú (HKTT)</span>}
                rules={[{ required: true, message: 'Nhập quê quán/thường trú!' }]}
              >
                <Input placeholder="AI tự điền hoặc nhập tay" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="numTenants"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số lượng người ở cùng phòng</span>}
                rules={[{ required: true, message: 'Nhập số người ở!' }]}
              >
                <InputNumber min={1} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentDay"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Ngày đóng tiền phòng hàng tháng</span>}
                rules={[{ required: true, message: 'Chọn ngày đóng tiền!' }]}
              >
                <InputNumber min={1} max={31} placeholder="Ví dụ: ngày 30 hàng tháng" style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ fontWeight: 'bold', margin: '16px 0' }}>3. Đơn giá Đặt cọc & Chỉ số Tiện ích</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="deposit"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số tiền đặt cọc (VND)</span>}
                rules={[{ required: true, message: 'Nhập số tiền đặt cọc!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Ví dụ: 1,500,000" />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                name="initialElectricity"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Chỉ số ĐIỆN ban đầu (kWh)</span>}
                rules={[{ required: true, message: 'Nhập số điện bắt đầu!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Ví dụ: 10450" />
              </Form.Item>
            </Col>
            
            <Col span={8}>
              <Form.Item
                name="initialWater"
                label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Chỉ số NƯỚC ban đầu (m³)</span>}
                rules={[{ required: true, message: 'Nhập số nước bắt đầu!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Ví dụ: 120" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="hasCustomPrices" valuePropName="checked" style={{ margin: '16px 0 8px 0' }}>
            <Checkbox onChange={(e) => {
              const checked = e.target.checked;
              setHasCustomPrices(checked);
              if (checked) {
                const chosenBuilding = buildings.find(b => b.id === form.getFieldValue('buildingId'));
                if (chosenBuilding) {
                  const s = chosenBuilding.service || {
                    electricityPrice: 3500,
                    waterPrice: 20000,
                    internetPrice: 100000,
                    cleaningPrice: 50000
                  };
                  form.setFieldsValue({
                    electricityPrice: parseFloat(s.electricityPrice),
                    waterPrice: parseFloat(s.waterPrice),
                    internetPrice: parseFloat(s.internetPrice),
                    cleaningPrice: parseFloat(s.cleaningPrice)
                  });
                }
              }
            }}>
              Thiết lập đơn giá dịch vụ thỏa thuận riêng cho phòng này (Trường hợp đặc biệt)
            </Checkbox>
          </Form.Item>

          <div style={{ display: hasCustomPrices ? 'block' : 'none' }}>
            <Divider style={{ margin: '12px 0', fontWeight: 'bold' }}>Đơn giá dịch vụ thỏa thuận riêng</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="electricityPrice"
                  label={<span style={{ fontWeight: '600', fontSize: '12px' }}>Đơn giá Điện (VND/kWh)</span>}
                  rules={[{ required: hasCustomPrices, message: 'Nhập giá điện!' }]}
                >
                  <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="waterPrice"
                  label={<span style={{ fontWeight: '600', fontSize: '12px' }}>Đơn giá Nước (VND/m³)</span>}
                  rules={[{ required: hasCustomPrices, message: 'Nhập giá nước!' }]}
                >
                  <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="internetPrice"
                  label={<span style={{ fontWeight: '600', fontSize: '12px' }}>Internet / tháng (VND)</span>}
                >
                  <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="cleaningPrice"
                  label={<span style={{ fontWeight: '600', fontSize: '12px' }}>Vệ sinh / tháng (VND)</span>}
                >
                  <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

        </Form>
      </Modal>

      {/* MODAL CHI TIẾT HỢP ĐỒNG IN / XEM */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><FileSignature size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Bản Hợp đồng thuê phòng trọ chi tiết</span>}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        centered
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)} style={{ borderRadius: '8px' }}>
            Đóng
          </Button>,
          <Button 
            key="print" 
            type="primary" 
            icon={<Printer size={14} />}
            style={{ background: '#10b981', border: 'none', borderRadius: '8px' }}
            onClick={() => window.print()}
          >
            In hợp đồng
          </Button>
        ]}
      >
        {selectedContract && (
          <div className="printable-contract" style={{ padding: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', lineHeight: '1.8', fontFamily: 'serif', fontSize: '15px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
              <strong>Độc lập - Tự do - Hạnh phúc</strong>
              <div style={{ borderBottom: '1px solid #1e293b', width: '200px', margin: '8px auto' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: '800', fontFamily: 'serif', color: '#0f172a' }}>HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ</h2>
              <small><i>Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</i></small>
            </div>

            <p>Hôm nay, ngày {new Date(selectedContract.startDate).getDate()} tháng {new Date(selectedContract.startDate).getMonth() + 1} năm {new Date(selectedContract.startDate).getFullYear()}, chúng tôi gồm có:</p>

            <div style={{ marginBottom: '16px' }}>
              <strong>BÊN A: BÊN CHO THUÊ (PHÒNG TRỌ)</strong><br />
              - Họ và Tên: {selectedContract.landlordName || selectedContract.room?.building?.landlord?.name || 'Nguyễn Thị Ngọc Diệp'}<br />
              - Điện thoại: {selectedContract.landlordPhone || selectedContract.room?.building?.landlord?.phone || 'N/A'}<br />
              - CCCD số: {selectedContract.landlordCccd || 'Chưa cung cấp'}<br />
              - HK thường trú: {selectedContract.landlordHometown || 'N/A'}<br />
              - Địa chỉ bàn giao phòng thuê: {selectedContract.landlordAddress || selectedContract.room?.building?.address || 'N/A'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>BÊN B: BÊN THUÊ (PHÒNG TRỌ)</strong><br />
              - Họ và Tên: {selectedContract.tenantName || selectedContract.tenant?.name || 'Tạ Đình Cường'}<br />
              - Điện thoại: {selectedContract.tenantPhone || selectedContract.tenant?.phone || 'N/A'}<br />
              - CCCD số: {selectedContract.tenantCccd || 'Chưa cung cấp'} {selectedContract.tenantDob && ` - Ngày sinh: ${selectedContract.tenantDob}`}<br />
              - HK thường trú: {selectedContract.tenantHometown || 'N/A'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>ĐIỀU 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG</strong><br />
              Bên A đồng ý cho bên B thuê phòng trọ số <strong>{selectedContract.room?.roomNumber}</strong> thuộc tòa nhà <strong>{selectedContract.room?.building?.name}</strong>.<br />
              - Thời hạn thuê phòng là tính từ ngày {new Date(selectedContract.startDate).toLocaleDateString('vi-VN')} đến ngày {new Date(selectedContract.endDate).toLocaleDateString('vi-VN')}.<br />
              - Mục đích thuê để lưu trú sinh hoạt với số lượng người ở thực tế là: {selectedContract.numTenants || 1} người.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>ĐIỀU 2: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</strong><br />
              - Hai bên nhất trí giá thuê phòng trọ là: <strong>{formatVND(selectedContract.room?.price)} / tháng</strong>.<br />
              - Tiền đặt cọc phòng: <strong>{formatVND(selectedContract.deposit)}</strong> (Được hoàn trả lại đầy đủ khi kết thúc hợp đồng theo quy định).<br />
              - Đơn giá dịch vụ tiện ích áp dụng:<br />
              &nbsp;&nbsp;+ Tiền điện: {formatVND(selectedContract.electricityPrice)} / kWh<br />
              &nbsp;&nbsp;+ Tiền nước: {formatVND(selectedContract.waterPrice)} / m³ hoặc theo đầu người<br />
              &nbsp;&nbsp;+ Phí Internet: {formatVND(selectedContract.internetPrice)} / tháng<br />
              &nbsp;&nbsp;+ Phí vệ sinh dịch vụ: {formatVND(selectedContract.cleaningPrice)} / tháng<br />
              - Kỳ thanh toán: Bên B có nghĩa vụ thanh toán đầy đủ tiền phòng trọ và dịch vụ vào ngày {selectedContract.paymentDay || 30} hàng tháng.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>ĐIỀU 3: DANH SÁCH ĐỒ DÙNG VÀ THIẾT BỊ BÊN A BÀN GIAO</strong><br />
              {selectedContract.inventory ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontSize: '13px' }}>STT</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontSize: '13px' }}>Tên loại thiết bị</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontSize: '13px' }}>Số lượng</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left', fontSize: '13px' }}>Tình trạng bàn giao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JSON.parse(selectedContract.inventory).map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontSize: '13px' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontSize: '13px' }}>{item.name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontSize: '13px' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontSize: '13px' }}>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span>Không bàn giao thiết bị đặc biệt nào kèm theo.</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingBottom: '40px' }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <strong>Đại diện Bên A</strong><br />
                <small>(Ký và ghi rõ họ tên)</small><br /><br /><br /><br />
                <strong>{selectedContract.landlordName || selectedContract.room?.building?.landlord?.name || 'Nguyễn Thị Ngọc Diệp'}</strong>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <strong>Đại diện Bên B</strong><br />
                <small>(Ký và ghi rõ họ tên)</small><br /><br /><br /><br />
                <strong>{selectedContract.tenantName || selectedContract.tenant?.name || 'Tạ Đình Cường'}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẠO NHANH TÀI KHOẢN KHÁCH THUÊ */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '17px', color: '#1a3353' }}><UserPlus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tạo nhanh tài khoản khách thuê mới</span>}
        open={quickTenantModalVisible}
        onCancel={() => setQuickTenantModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuickTenantModalVisible(false)} style={{ borderRadius: '8px' }}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={quickTenantLoading} 
            style={{ background: '#10b981', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={() => quickTenantForm.submit()}
          >
            Tạo & Chọn khách này
          </Button>
        ]}
        width={420}
        centered
      >
        <Form
          form={quickTenantForm}
          layout="vertical"
          onFinish={handleQuickCreateTenant}
          requiredMark={false}
          initialValues={{ password: '123456' }}
          style={{ marginTop: '12px' }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Họ và tên khách thuê</span>}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên khách thuê!' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Số điện thoại (tên đăng nhập)</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại gồm 10 chữ số!' }
            ]}
          >
            <Input placeholder="Ví dụ: 0987654321" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: '600', fontSize: '13px' }}>Mật khẩu đăng nhập ban đầu</span>}
            rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
          >
            <Input.Password placeholder="Mặc định: 123456" style={{ borderRadius: '8px', padding: '8px 12px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractManager;
