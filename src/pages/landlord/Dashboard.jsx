import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Card, Tag, Table, Button, Spin, message, Select, Empty, Alert, Progress } from 'antd';
import { ArrowRight, Wrench, CheckCircle2, Home, Wallet, AlertCircle, Gauge, Lightbulb, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const STATUS_TAGS = {
  pending: { color: 'warning', text: 'Chờ duyệt' },
  in_progress: { color: 'processing', text: 'Đang sửa' },
  resolved: { color: 'success', text: 'Đã xong' },
};

// Màu cột biểu đồ: Kỳ vọng / Đã thu / Chưa thu
const BAR_COLORS = ['#94A3B8', '#0F766E', '#DC2626'];

const StatCard = ({ label, value, icon, tint, footer, loading }) => (
  <Card className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: 22 }}>{loading ? <Spin size="small" /> : value}</div>
      </div>
      <div className="stat-icon" style={{ background: tint + '14', color: tint }} aria-hidden="true">{icon}</div>
    </div>
    {footer && <div style={{ marginTop: 10 }}>{footer}</div>}
  </Card>
);

StatCard.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.node,
  icon: PropTypes.node,
  tint: PropTypes.string.isRequired,
  footer: PropTypes.node,
  loading: PropTypes.bool,
};

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

  const fetchStats = useCallback(async () => {
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
  }, [selectedMonth, selectedYear]);

  const fetchGeneralData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchGeneralData();
  }, [fetchGeneralData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Danh sách năm: năm hiện tại và 4 năm trước đó
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: y, label: `Năm ${y}` };
  });

  const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Phân tích dữ liệu phòng
  const totalRooms = rooms.length;
  const vacantRooms = rooms.filter(r => r.status === 'empty').length;
  const occupancyRate = totalRooms > 0 ? Math.round(((totalRooms - vacantRooms) / totalRooms) * 100) : 0;
  const periodLabel = selectedMonth === 'all' ? `năm ${selectedYear}` : `tháng ${selectedMonth}/${selectedYear}`;

  const activityData = supportRequests.slice(0, 5).map(req => ({
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
      <PageHeader
        title="Tổng quan vận hành"
        description="Theo dõi thông số vận hành và doanh thu khu trọ của bạn."
        extra={
          <div className="toolbar-wrap">
            <Select
              aria-label="Chọn tháng"
              value={selectedMonth}
              style={{ minWidth: 120 }}
              onChange={setSelectedMonth}
              options={[
                { value: 'all', label: 'Cả năm' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
              ]}
            />
            <Select aria-label="Chọn năm" value={selectedYear} style={{ minWidth: 120 }} onChange={setSelectedYear} options={yearOptions} />
            <Button type="primary" icon={<Zap size={16} />} onClick={() => navigate('/landlord/utilities')}>
              Chốt điện nước
            </Button>
          </div>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label={`Thực thu ${periodLabel}`}
            value={formatVND(stats?.totalCollected)}
            icon={<Wallet size={20} />}
            tint="#0F766E"
            loading={statsLoading}
            footer={!statsLoading && stats?.depositOffset > 0 && (
              <div style={{ fontSize: 13, color: '#475569' }}>
                Cấn trừ cọc: <b>{formatVND(stats.depositOffset)}</b> · Tiền mới thu: <b>{formatVND(stats.cashCollected)}</b>
              </div>
            )}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Tỷ lệ lấp đầy"
            value={`${occupancyRate}%`}
            icon={<Gauge size={20} />}
            tint="#0369A1"
            footer={<Progress percent={occupancyRate} showInfo={false} strokeColor="#0369A1" size={['100%', 6]} />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Phòng còn trống" value={`${vacantRooms} / ${totalRooms}`} icon={<Home size={20} />} tint="#15803D" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="Phòng nợ tiền" value={stats?.unpaidRooms ?? 0} icon={<AlertCircle size={20} />} tint="#DC2626" loading={statsLoading} />
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card title={<span className="card-title">Cơ cấu doanh thu {periodLabel}</span>} style={{ height: '100%' }}>
            {statsLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 260 }}><Spin /></div>
            ) : (
              <div style={{ height: 260 }} role="img" aria-label={`Biểu đồ doanh thu: kỳ vọng ${formatVND(stats?.totalExpected)}, đã thu ${formatVND(stats?.totalCollected)}, chưa thu ${formatVND(stats?.unpaidAmount)}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? (val / 1000000) + 'M' : '0'} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(value) => [formatVND(value), 'Số tiền']} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={44}>
                      {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<span className="card-title">Khuyến nghị tài chính</span>} style={{ height: '100%' }}>
            {statsLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 260 }}><Spin /></div>
            ) : stats?.invoiceCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Empty description="Chưa có hóa đơn nào cho kỳ này" />
                <Button type="primary" style={{ marginTop: 12 }} onClick={() => navigate('/landlord/utilities')}>Xuất hóa đơn</Button>
              </div>
            ) : stats?.unpaidAmount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Alert
                  type="error"
                  showIcon
                  message="Cảnh báo nợ đọng"
                  description={`Có ${stats.unpaidRooms} phòng còn hóa đơn chưa thanh toán, tổng nợ ${formatVND(stats.unpaidAmount)}.`}
                />
                <div style={{ display: 'flex', gap: 10, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                  <Lightbulb size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <span>
                    <b style={{ color: '#0F172A' }}>Mẹo thu hồi nợ:</b> Dùng Bot Telegram của hệ thống để nhắc người thuê. Khi họ chuyển khoản, gạch nợ trên hóa đơn để doanh thu tự đồng bộ.
                  </span>
                </div>
                <Button type="primary" onClick={() => navigate('/landlord/invoices?status=unpaid')}>Gạch nợ hóa đơn</Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircle2 size={44} color="#15803D" style={{ marginBottom: 12 }} aria-hidden="true" />
                <h3 style={{ fontWeight: 700, color: '#15803D', margin: '0 0 4px' }}>Không có nợ đọng</h3>
                <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Tất cả hóa đơn trong kỳ này đã được thanh toán.</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={<span className="card-title"><Wrench size={18} color="#0F766E" aria-hidden="true" /> Sự cố & yêu cầu sửa chữa gần đây</span>}
        extra={<Button type="link" onClick={() => navigate('/landlord/support')}>Xem tất cả</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={activityData}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: 'Chưa có báo cáo sự cố nào' }}
          columns={[
            { title: 'Thời gian', dataIndex: 'time', width: 160, render: (t) => <span style={{ color: '#475569' }}>{t}</span> },
            { title: 'Phòng', dataIndex: 'roomNumber', width: 100, render: (room) => <Tag color="cyan">P.{room}</Tag> },
            { title: 'Mô tả', dataIndex: 'desc', ellipsis: true },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 120,
              render: (status) => {
                const cfg = STATUS_TAGS[status] || STATUS_TAGS.pending;
                return <Tag color={cfg.color}>{cfg.text}</Tag>;
              }
            },
            {
              title: '',
              width: 56,
              render: () => (
                <Button type="text" aria-label="Xem chi tiết sự cố" icon={<ArrowRight size={16} />} onClick={() => navigate('/landlord/support')} />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default LandlordDashboard;
