import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Select, Spin, message, Alert, Empty } from 'antd';
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Wallet, TrendingUp, AlertCircle, Lightbulb, CheckCircle2, Wrench, PiggyBank, Home } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const BAR_COLORS = ['#94A3B8', '#0F766E', '#DC2626'];

const StatCard = ({ label, value, icon, tint, note }) => (
  <Card className="stat-card mobile-compact" style={{ height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: 22, fontWeight: 700, color: '#0F172A' }}>{value}</div>
        {note && <div className="stat-note" style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{note}</div>}
      </div>
      <div className="stat-icon" style={{ background: tint + '18', color: tint, width: 44, height: 44, borderRadius: 10, display: 'grid', placeItems: 'center' }} aria-hidden="true">{icon}</div>
    </div>
  </Card>
);

const Financials = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await axiosInstance.get(`/invoices/status?month=${selectedMonth}&year=${selectedYear}`);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching revenue stats:', err);
      if (!isSilent) message.error('Không thể tải dữ liệu thống kê tài chính.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats(true);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchStats]);

  // Danh sách năm: năm hiện tại và 4 năm trước đó
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: y, label: `Năm ${y}` };
  });

  const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const periodLabel = selectedMonth === 'all' ? `năm ${selectedYear}` : `tháng ${selectedMonth}/${selectedYear}`;
  const collectionRate = stats?.totalExpected > 0 ? ((stats.totalCollected / stats.totalExpected) * 100).toFixed(1) : 0;

  const chartData = stats ? [
    { name: 'Kỳ vọng', amount: stats.totalExpected },
    { name: 'Đã thu', amount: stats.totalCollected },
    { name: 'Chưa thu', amount: stats.unpaidAmount }
  ] : [];

  return (
    <div>
      <PageHeader
        title="Thống kê tài chính"
        description="Doanh thu, tỷ lệ thu tiền và nợ đọng theo từng kỳ."
        extra={
          <div className="financial-period-bar">
            <Select
              aria-label="Chọn tháng"
              value={selectedMonth}
              style={{ minWidth: 100 }}
              onChange={setSelectedMonth}
              options={[
                { value: 'all', label: 'Cả năm' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
              ]}
            />
            <Select aria-label="Chọn năm" value={selectedYear} style={{ minWidth: 100 }} onChange={setSelectedYear} options={yearOptions} />
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '50vh' }}><Spin size="large" /></div>
      ) : (
        <>
          <Row gutter={[{ xs: 8, sm: 16 }, { xs: 8, sm: 16 }]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Tổng doanh thu kỳ vọng"
                value={formatVND(stats?.totalExpected)}
                icon={<TrendingUp size={20} />}
                tint="#0369A1"
                note="Tổng hóa đơn đã xuất trong kỳ"
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Đã thu thực tế"
                value={formatVND(stats?.totalCollected)}
                icon={<Wallet size={20} />}
                tint="#0F766E"
                note={`Hiệu suất thu tiền: ${collectionRate}%`}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Tiền phòng nợ đọng"
                value={formatVND(stats?.unpaidAmount)}
                icon={<AlertCircle size={20} />}
                tint="#DC2626"
                note={`${stats?.unpaidRooms ?? 0} phòng chưa hoàn tất thanh toán`}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Chi phí sửa chữa/bảo dưỡng"
                value={formatVND(stats?.totalRepairCost)}
                icon={<Wrench size={20} />}
                tint="#EA580C"
                note="Chi phí chủ trọ chi trả trong kỳ"
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Lợi nhuận ròng (Net Profit)"
                value={formatVND(stats?.netProfit)}
                icon={<PiggyBank size={20} />}
                tint="#15803D"
                note="Tiền thực thu trừ chi phí sửa chữa"
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <StatCard
                label="Tỷ lệ lấp đầy phòng"
                value={`${stats?.occupancyRate ?? 0}%`}
                icon={<Home size={20} />}
                tint="#7C3AED"
                note={stats?.totalRooms ? `${stats?.occupiedRooms ?? 0}/${stats.totalRooms} phòng đang có khách` : "Tỷ lệ phòng đang có khách thuê"}
              />
            </Col>
          </Row>

          {/* Biểu đồ xu hướng 12 tháng */}
          {Array.isArray(stats?.trend12Months) && stats.trend12Months.length > 0 && (
            <Card
              title={<span className="card-title">Xu hướng doanh thu & lợi nhuận 12 tháng năm {selectedYear}</span>}
              style={{ marginBottom: 20 }}
            >
              <div className="financial-chart-container" role="img" aria-label="Biểu đồ xu hướng 12 tháng">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.trend12Months} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
                    <XAxis dataKey="month" tickFormatter={(m) => `Tháng ${m}`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? (val / 1000000).toFixed(0) + 'M' : '0'} />
                    <Tooltip
                      formatter={(val, name) => [formatVND(val), name === 'collected' ? 'Đã thu' : name === 'repairCost' ? 'Chi phí sửa chữa' : name === 'profit' ? 'Lợi nhuận ròng' : 'Kỳ vọng']}
                      labelFormatter={(label) => `Tháng ${label}/${selectedYear}`}
                    />
                    <Legend
                      formatter={(value) => value === 'collected' ? 'Đã thu thực tế' : value === 'repairCost' ? 'Chi phí sửa chữa' : value === 'profit' ? 'Lợi nhuận ròng' : value}
                    />
                    <Bar dataKey="collected" fill="#0F766E" radius={[4, 4, 0, 0]} barSize={24} name="collected" />
                    <Bar dataKey="repairCost" fill="#EA580C" radius={[4, 4, 0, 0]} barSize={24} name="repairCost" />
                    <Line type="monotone" dataKey="profit" stroke="#15803D" strokeWidth={3} dot={{ r: 4, fill: '#15803D' }} name="profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={14}>
              <Card title={<span className="card-title">Cơ cấu doanh thu {periodLabel}</span>} style={{ height: '100%' }}>
                <div style={{ height: 280 }} role="img" aria-label={`Biểu đồ doanh thu ${periodLabel}: kỳ vọng ${formatVND(stats?.totalExpected)}, đã thu ${formatVND(stats?.totalCollected)}, chưa thu ${formatVND(stats?.unpaidAmount)}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? (val / 1000000) + 'M' : '0'} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(value) => [formatVND(value), 'Số tiền']} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={48}>
                        {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card title={<span className="card-title">Khuyến nghị tài chính</span>} style={{ height: '100%' }}>
                {stats?.invoiceCount === 0 ? (
                  <Empty description="Chưa có hóa đơn nào cho kỳ này" style={{ padding: '32px 0' }} />
                ) : stats?.unpaidAmount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Alert
                      type="error"
                      showIcon
                      message="Cảnh báo nợ đọng"
                      description={`Kỳ này có ${stats.unpaidRooms} phòng chưa đóng tiền, tổng nợ ${formatVND(stats.unpaidAmount)}. Nên gửi nhắc đóng tiền qua Telegram.`}
                    />
                    <div style={{ display: 'flex', gap: 10, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                      <Lightbulb size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <span>
                        <b style={{ color: '#0F172A' }}>Mẹo giảm nợ đọng:</b> Gửi thông báo hàng loạt tới khách thuê đã liên kết Bot Telegram. Khi khách thanh toán, bấm &quot;Xác nhận đã nhận tiền&quot; trên hóa đơn để hệ thống tự gạch nợ.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <CheckCircle2 size={44} color="#15803D" style={{ marginBottom: 12 }} aria-hidden="true" />
                    <h3 style={{ fontWeight: 700, color: '#15803D', margin: '0 0 4px' }}>Không có nợ đọng</h3>
                    <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Tất cả hóa đơn trong kỳ này đã hoàn tất thanh toán.</p>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Financials;
