import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, Button, Space, Spin, message, Select, Alert } from 'antd';
import { ArrowRight, Wrench, ShieldAlert, CheckCircle2, Home, Landmark, AlertCircle, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';

const LandlordDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);

  // Thời gian lọc mặc định: tháng/năm hiện tại
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12 hoặc 'all'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await axiosInstance.get(`/invoices/status?month=${selectedMonth}&year=${selectedYear}`);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching dashboard financials:', err);
      message.error('Không thể tải số liệu doanh thu thống kê.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchGeneralData = async () => {
    setLoading(true);
    try {
      const [roomsData, supportData] = await Promise.all([
        axiosInstance.get('/manage/rooms'),
        axiosInstance.get('/manage/support-requests')
      ]);
      setRooms(roomsData);
      setSupportRequests(supportData);
    } catch (err) {
      console.error('Error fetching dashboard general data:', err);
      message.error('Không thể tải thông tin phòng và sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneralData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu tổng quan..." />
      </div>
    );
  }

  // Phân tích dữ liệu phòng
  const totalRooms = rooms.length;
  const vacantRooms = rooms.filter(r => r.status === 'empty').length;
  const occupancyRate = totalRooms > 0 ? (((totalRooms - vacantRooms) / totalRooms) * 100).toFixed(0) : 0;

  const activityData = supportRequests.slice(0, 4).map(req => ({
    key: req.id.toString(),
    time: new Date(req.createdAt).toLocaleDateString('vi-VN') + ' ' + new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    roomNumber: req.room?.roomNumber || 'N/A',
    desc: req.description,
    status: req.status
  }));

  const chartData = stats ? [
    { name: 'Kỳ vọng', amount: stats.totalExpected },
    { name: 'Đã thu', amount: stats.totalCollected },
    { name: 'Chưa thu', amount: stats.unpaidAmount }
  ] : [];

  return (
    <div>
      {/* TITLE BANNER & TIME FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1a3353', margin: 0 }}>
            Tổng quan Vận hành
          </h1>
          <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>
            Chào mừng trở lại! Theo dõi thông số vận hành và thống kê doanh thu khu trọ của bạn.
          </p>
        </div>
        <Space wrap>
          {/* Lọc tháng (Có tùy chọn Cả năm) */}
          <Select
            value={selectedMonth}
            style={{ width: 120 }}
            onChange={(val) => setSelectedMonth(val)}
            options={[
              { value: 'all', label: 'Cả năm' },
              ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
            ]}
          />
          {/* Lọc năm */}
          <Select
            value={selectedYear}
            style={{ width: 120 }}
            onChange={(val) => setSelectedYear(val)}
            options={[
              { value: 2026, label: 'Năm 2026' },
              { value: 2025, label: 'Năm 2025' }
            ]}
          />
          <Button type="primary" style={{ background: '#1a3353', border: 'none' }} onClick={() => navigate('/landlord/utilities')}>
            Chốt số điện nước
          </Button>
        </Space>
      </div>

      {/* STATS CARDS */}
      <Row gutter={[20, 20]} style={{ marginBottom: '24px' }}>
        
        {/* DOANH THU ĐÃ THU */}
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px' }}>
            {statsLoading ? (
              <Spin size="small" />
            ) : (
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold', textTransform: 'uppercase' }}>THỰC THU ({selectedMonth === 'all' ? 'CẢ NĂM' : `THÁNG ${selectedMonth}`})</span>}
                value={stats?.totalCollected}
                formatter={(val) => formatVND(val)}
                valueStyle={{ color: '#10b981', fontWeight: '800', fontSize: '18px' }}
              />
            )}
            <Tag color="success" style={{ marginTop: '8px', border: 'none', fontWeight: 'bold' }}>Đã thanh toán</Tag>
          </Card>
        </Col>

        {/* TỶ LỆ LẤP ĐẦY */}
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold', textTransform: 'uppercase' }}>
              TỶ LỆ LẤP ĐẦY
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', margin: '6px 0', color: '#1a3353' }}>
              {occupancyRate}%
            </div>
            <div style={{ height: '4px', background: '#f0f0f0', borderRadius: '2px' }}>
              <div style={{ width: `${occupancyRate}%`, height: '100%', background: '#52c41a', borderRadius: '2px' }} />
            </div>
          </Card>
        </Col>

        {/* PHÒNG TRỐNG */}
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px' }}>
            <Statistic
              title={<span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold' }}>PHÒNG CÒN TRỐNG</span>}
              value={vacantRooms}
              valueStyle={{ fontWeight: '800', color: '#0ea5e9', fontSize: '20px' }}
            />
            <Tag color="cyan" style={{ marginTop: '8px', border: 'none', fontWeight: 'bold' }}>Sẵn sàng thuê</Tag>
          </Card>
        </Col>

        {/* PHÒNG CHƯA ĐÓNG TIỀN / SỐ PHÒNG NỢ */}
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px' }}>
            {statsLoading ? (
              <Spin size="small" />
            ) : (
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold', textTransform: 'uppercase' }}>PHÒNG NỢ TIỀN</span>}
                value={stats?.unpaidRooms}
                valueStyle={{ color: '#ef4444', fontWeight: '800', fontSize: '20px' }}
              />
            )}
            <Tag color="red" style={{ marginTop: '8px', border: 'none', fontWeight: 'bold' }}>Cần nhắc nhở</Tag>
          </Card>
        </Col>
      </Row>

      {/* CHARTS & RECOMMENDATIONS SECTIONS */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        {/* BIỂU ĐỒ DOANH THU */}
        <Col xs={24} md={12}>
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '14px', color: '#1a3353' }}>Biểu đồ Cơ cấu Doanh thu ({selectedMonth === 'all' ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`})</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            {statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                <Spin size="default" tip="Đang tải biểu đồ doanh thu..." />
              </div>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => val ? (val / 1000000) + 'M' : '0M'} />
                    <Tooltip formatter={(value) => [formatVND(value), 'Số tiền']} />
                    <Bar dataKey="amount" fill="#1a3353" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        {/* KHUYẾN NGHỊ & NỢ ĐỌNG */}
        <Col xs={24} md={12}>
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '14px', color: '#1a3353' }}>Khuyến nghị tài chính</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}
          >
            {statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px' }}>
                <Spin size="default" tip="Đang tính toán số liệu..." />
              </div>
            ) : stats?.unpaidAmount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Alert
                  message="Cảnh báo nợ đọng"
                  description={`Hiện tại đang có ${stats.unpaidRooms} lượt hóa đơn chưa thanh toán với tổng số tiền nợ đọng là ${formatVND(stats.unpaidAmount)}.`}
                  type="error"
                  showIcon
                  style={{ borderRadius: '8px' }}
                />
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                  💡 <strong>Mẹo thu hồi nợ:</strong> Hãy truy cập vào Bot Telegram của hệ thống để nhắc nhở người thuê trọ. Khi người thuê thực hiện thanh toán chuyển khoản, bạn chỉ cần gạch nợ trên hóa đơn để tự động đồng bộ doanh thu.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CheckCircle2 size={48} color="#52c41a" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontWeight: 'bold', color: '#52c41a' }}>Tài chính hoàn hảo!</h3>
                <p style={{ color: '#8c8c8c', fontSize: '13px', margin: 0 }}>
                  Không ghi nhận nợ đọng nào trong chu kỳ này. Tất cả hóa đơn đã hoàn tất thanh toán.
                </p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* RECENT SUPPORT TICKETS TABLE */}
      <Card
        title={<span style={{ fontWeight: '800', color: '#1a3353', fontSize: '14px' }}><Wrench size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Các báo cáo sự cố & yêu cầu sửa chữa gần đây</span>}
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        extra={<Button type="link" onClick={() => navigate('/landlord/support')}>Quản lý Sự Cố</Button>}
      >
        <Table
          dataSource={activityData}
          pagination={false}
          scroll={{ x: true }}
          columns={[
            { title: "MÃ SỰ CỐ", dataIndex: "key", render: (val) => <b>#{val}</b> },
            { title: "THỜI GIAN", dataIndex: "time" },
            { 
              title: "SỐ PHÒNG", 
              dataIndex: "roomNumber", 
              render: (room) => <Tag color="geekblue" style={{ fontWeight: 'bold' }}>Phòng {room}</Tag> 
            },
            { title: "MÔ TẢ SỰ CỐ", dataIndex: "desc", width: '40%' },
            {
              title: "TRẠNG THÁI XỬ LÝ",
              dataIndex: "status",
              render: (status) => {
                let color = 'warning';
                let text = 'Chờ duyệt';
                if (status === 'in_progress') { color = 'processing'; text = 'Đang sửa'; }
                else if (status === 'resolved') { color = 'success'; text = 'Đã xong'; }
                return <Tag color={color} style={{ fontWeight: 'bold' }}>{text}</Tag>;
              }
            },
            {
              title: "HÀNH ĐỘNG",
              render: () => (
                <Button type="text" icon={<ArrowRight size={16} />} onClick={() => navigate('/landlord/support')} />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default LandlordDashboard;
