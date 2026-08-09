import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Select, Space, Spin, message, Alert } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Landmark, ArrowUpRight, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const Financials = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Mặc định là tháng hiện tại (có thể đổi sang 'all' nếu muốn)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get(`/invoices/status?month=${selectedMonth}&year=${selectedYear}`);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching revenue stats:', err);
      message.error('Không thể tải dữ liệu thống kê tài chính.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const chartData = stats ? [
    { name: 'Kỳ vọng', amount: stats.totalExpected },
    { name: 'Đã thu', amount: stats.totalCollected },
    { name: 'Chưa thu', amount: stats.unpaidAmount }
  ] : [];

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 'bold' }}>QUẢN LÝ / DOANH THU</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Thống kê Tài chính</h1>
        </div>
        <Space>
          <Select
            value={selectedMonth}
            style={{ width: 110 }}
            onChange={(val) => setSelectedMonth(val)}
            options={[
              { value: 'all', label: 'Cả năm' },
              ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
            ]}
          />
          <Select
            value={selectedYear}
            style={{ width: 110 }}
            onChange={(val) => setSelectedYear(val)}
            options={[{ value: 2026, label: 'Năm 2026' }, { value: 2025, label: 'Năm 2025' }]}
          />
        </Space>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Spin size="large" tip="Đang tính toán số liệu tài chính..." />
        </div>
      ) : (
        <div>
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            {/* TỔNG KỲ VỌNG */}
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
                <Statistic 
                  title={<span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8c8c8c' }}>TỔNG DOANH THU KỲ VỌNG</span>} 
                  value={stats?.totalExpected} 
                  formatter={(val) => formatVND(val)}
                  valueStyle={{ color: '#1a3353', fontWeight: '800', fontSize: '22px' }} 
                />
                <div style={{ color: '#1890ff', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>
                  Tổng hóa đơn xuất trong tháng
                </div>
              </Card>
            </Col>

            {/* THỰC THU */}
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
                <Statistic 
                  title={<span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8c8c8c' }}>ĐÃ THU THỰC TẾ (ĐÃ ĐÓNG)</span>} 
                  value={stats?.totalCollected} 
                  formatter={(val) => formatVND(val)}
                  valueStyle={{ color: '#52c41a', fontWeight: '800', fontSize: '22px' }} 
                />
                <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>
                  Hiệu suất: {stats?.totalExpected > 0 ? ((stats.totalCollected / stats.totalExpected) * 100).toFixed(1) : 0}%
                </div>
              </Card>
            </Col>

            {/* NỢ ĐỌNG */}
            <Col xs={24} sm={8}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
                <Statistic 
                  title={<span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8c8c8c' }}>TIỀN PHÒNG NỢ ĐỌNG</span>} 
                  value={stats?.unpaidAmount} 
                  formatter={(val) => formatVND(val)}
                  valueStyle={{ color: '#ff4d4f', fontWeight: '800', fontSize: '22px' }} 
                />
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>
                  Có <strong>{stats?.unpaidRooms}</strong> phòng chưa hoàn tất thanh toán
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[24, 24]}>
            {/* BIỂU ĐỒ BÁO CÁO */}
            <Col xs={24} md={12}>
              <Card title={<span style={{ fontWeight: '800', fontSize: '14px' }}>Biểu đồ Cơ cấu Doanh thu ({selectedMonth === 'all' ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`})</span>} bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(val) => val / 1000000 + 'M'} />
                      <Tooltip formatter={(value) => [formatVND(value), 'Số tiền']} />
                      <Bar dataKey="amount" fill="#1a3353" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* NHẬT KÝ CHI TIẾT */}
            <Col xs={24} md={12}>
              <Card 
                title={<span style={{ fontWeight: '800', fontSize: '14px' }}>Khuyến nghị Tài chính</span>} 
                bordered={false} 
                style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', height: '100%' }}
              >
                {stats?.unpaidAmount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Alert
                      message="Cảnh báo nợ đọng cao"
                      description={`Tháng này có ${stats.unpaidRooms} phòng chưa đóng tiền với tổng nợ đọng là ${formatVND(stats.unpaidAmount)}. Vui lòng gửi thông báo nhắc đóng tiền qua Telegram.`}
                      type="error"
                      showIcon
                      style={{ borderRadius: '8px' }}
                    />
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                      💡 <strong>Mẹo giảm nợ đọng:</strong> Hãy kích hoạt gửi thông báo hàng loạt tới khách thuê có liên kết Bot Telegram. Khi khách thuê thanh toán, bạn chỉ cần bấm "Xác nhận đã nhận tiền" trên hóa đơn, hệ thống sẽ tự động gạch nợ.
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <CheckCircle2 size={48} color="#52c41a" style={{ margin: '0 auto 12px auto' }} />
                    <h3 style={{ fontWeight: 'bold', color: '#52c41a' }}>Tài chính tuyệt vời!</h3>
                    <p style={{ color: '#8c8c8c', fontSize: '13px', margin: 0 }}>Tất cả các hóa đơn được xuất trong chu kỳ này đều đã hoàn tất thanh toán.</p>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default Financials;