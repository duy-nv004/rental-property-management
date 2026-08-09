import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Button, Space, Select, Avatar, Spin, message } from 'antd';
import { Plus, Filter, Download, MoreVertical } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const LandlordList = () => {
  const [loading, setLoading] = useState(true);
  const [landlords, setLandlords] = useState([]);

  const fetchLandlords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/landlords');
      setLandlords(res);
    } catch (err) {
      console.error(err);
      message.error("Lỗi hệ thống khi tải danh sách chủ nhà!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandlords();
  }, []);

  const handlePlanChange = async (landlordId, newPlan) => {
    try {
      const response = await axiosInstance.put(`/admin/landlords/${landlordId}/plan`, { plan: newPlan });
      message.success(response.message || "Đã cập nhật gói dịch vụ thành công!");
      // Cập nhật lại danh sách trên giao diện
      fetchLandlords();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Lỗi cập nhật gói cước!";
      message.error(errMsg);
    }
  };

  const columns = [
    {
      title: 'LANDLORD ENTITY',
      dataIndex: 'name',
      render: (text, record) => (
        <Space>
          <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.id}`} />
          <div>
            <div style={{ fontWeight: 'bold', color: '#1a3353' }}>{text}</div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'} style={{ borderRadius: '4px', fontSize: '10px' }}>
          ● {status}
        </Tag>
      ),
    },
    {
      title: 'GÓI CƯỚC (CLICK ĐỂ ĐỔI)',
      dataIndex: 'plan',
      render: (plan, record) => (
        <Select
          defaultValue={plan}
          style={{ width: 110 }}
          bordered={false}
          className="plan-select"
          onChange={(value) => handlePlanChange(record.id, value)}
          options={[
            { value: 'FREE', label: <span style={{ color: '#8c8c8c', fontWeight: 'bold' }}>FREE</span> },
            { value: 'BASIC', label: <span style={{ color: '#1890ff', fontWeight: 'bold' }}>BASIC</span> },
            { value: 'PRO', label: <span style={{ color: '#52c41a', fontWeight: 'bold' }}>PRO</span> },
          ]}
        />
      ),
    },
    { title: 'PORTFOLIO SIZE', dataIndex: 'portfolio' },
    { title: 'JOINED DATE', dataIndex: 'date' },
    { title: 'ACTIONS', render: () => <MoreVertical size={16} cursor="pointer" /> },
  ];

  // Tính toán nhanh số liệu thống kê ở hàng trên cùng
  const totalPartners = landlords.length;
  const activeSubs = landlords.filter(l => l.plan !== 'FREE').length;
  const averageRooms = landlords.length > 0 
    ? (landlords.reduce((acc, l) => {
        // Lấy số lượng phòng trọ từ chuỗi "x Tòa nhà / y Phòng"
        const match = l.portfolio.match(/\/ (\d+) Phòng/);
        return acc + (match ? parseInt(match[1]) : 0);
      }, 0) / landlords.length).toFixed(1)
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Danh Sách Chủ Nhà</h1>
          <p style={{ color: '#8c8c8c' }}>Giám sát đối tác vận hành căn hộ dịch vụ và quản lý nâng cấp gói cước hệ thống.</p>
        </div>
        <Button onClick={fetchLandlords} type="default" style={{ borderRadius: '8px', height: '40px' }}>
          Tải lại danh sách
        </Button>
      </div>

      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {[
          { label: 'TỔNG CHỦ NHÀ', value: totalPartners, sub: 'Đối tác' },
          { label: 'GÓI TRẢ PHÍ (BASIC & PRO)', value: activeSubs, sub: 'Đang hoạt động' },
          { label: 'TB QUY MÔ PHÒNG', value: averageRooms, sub: 'Phòng / Chủ nhà' },
        ].map((s, i) => (
          <Col span={8} key={i}>
            <Card bordered={false} style={{ borderRadius: '12px' }}>
              <div style={{ fontSize: '10px', color: '#8c8c8c', fontWeight: '600' }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#1a3353' }}>{s.value}</span>
                <span style={{ fontSize: '11px', color: '#52c41a' }}>{s.sub}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{ borderRadius: '12px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải danh sách chủ nhà..." />
          </div>
        ) : (
          <Table dataSource={landlords} columns={columns} pagination={false} rowKey="id" />
        )}
      </Card>

      <style>{`
        .plan-select .ant-select-selector {
          background-color: #f0f2f5 !important;
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  );
};

export default LandlordList;