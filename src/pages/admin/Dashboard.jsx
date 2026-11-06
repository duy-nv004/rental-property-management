import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Progress, Spin, Empty, message } from 'antd';
import { Users, Wallet, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Sub-components ─────────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon, tint }) => (
  <Card className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-sub">{subtitle}</div>}
      </div>
      <div className="stat-icon" style={{ background: tint.bg, color: tint.fg }} aria-hidden="true">{icon}</div>
    </div>
  </Card>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  tint: PropTypes.shape({ bg: PropTypes.string, fg: PropTypes.string }),
};

const PlanBar = ({ label, count, percent, color }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#0F172A' }}>
        {percent}% <span style={{ color: '#64748B', fontWeight: 400 }}>· {count} chủ nhà</span>
      </span>
    </div>
    <Progress percent={percent} strokeColor={color} trailColor="#F1F5F9" showInfo={false} size={['100%', 10]} />
  </div>
);

PlanBar.propTypes = {
  label: PropTypes.string,
  count: PropTypes.number,
  percent: PropTypes.number,
  color: PropTypes.string,
};

const ACTION_COLORS = {
  UPDATE_PLAN: '#0369A1',
  LOCK_USER: '#DC2626',
  UNLOCK_USER: '#15803D',
};

const ActivityItem = ({ log }) => (
  <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
    <span
      aria-hidden="true"
      style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: ACTION_COLORS[log.action] || '#64748B' }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{log.label}</div>
      <div style={{ fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.sub}</div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{log.time}</div>
    </div>
  </div>
);

ActivityItem.propTypes = {
  log: PropTypes.shape({
    action: PropTypes.string,
    label: PropTypes.string,
    sub: PropTypes.string,
    time: PropTypes.string,
  }),
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/stats');
      setData(res);
    } catch (err) {
      console.error(err);
      if (!isSilent) message.error('Lỗi khi tải dữ liệu thống kê quản trị!');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

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

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const { stats, packages, recentActivity } = data;
  const total = packages.total || stats.landlordCount || 1;
  const proPercent = Math.round((packages.pro / total) * 100) || 0;
  const basicPercent = Math.round((packages.basic / total) * 100) || 0;
  const freePercent = Math.round((packages.free / total) * 100) || 0;

  const statCards = [
    {
      title: 'Doanh thu ước tính (theo gói đang hoạt động)',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(stats.totalRevenue) || 0),
      subtitle: 'Từ gói chủ nhà (MRR)',
      icon: <Wallet size={20} />,
      tint: { bg: '#F0FDFA', fg: '#0F766E' },
    },
    {
      title: 'Chủ nhà đã xác thực',
      value: stats.landlordCount,
      subtitle: 'Đang hoạt động',
      icon: <CheckCircle2 size={20} />,
      tint: { bg: '#F0F9FF', fg: '#0369A1' },
    },
    {
      title: 'Gói trả phí kích hoạt',
      value: (packages.basic || 0) + (packages.pro || 0),
      subtitle: 'Basic & Pro',
      icon: <Users size={20} />,
      tint: { bg: '#F0FDF4', fg: '#15803D' },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tổng quan hệ thống"
        description="Số liệu giám sát các gói cước và chủ nhà trong hệ thống."
      />

      <Row gutter={[20, 20]}>
        {statCards.map((card) => (
          <Col xs={24} md={8} key={card.title}>
            <StatCard {...card} />
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            title={<span className="card-title"><TrendingUp size={18} color="#0F766E" aria-hidden="true" /> Phân bổ gói cước</span>}
            extra={<span style={{ fontSize: 13, color: '#475569' }}>Tổng: <b>{packages.total}</b> chủ nhà</span>}
            style={{ height: '100%' }}
          >
            <PlanBar label="Chuyên nghiệp (Pro)" count={packages.pro} percent={proPercent} color="#0F766E" />
            <PlanBar label="Cơ bản (Basic)" count={packages.basic} percent={basicPercent} color="#14B8A6" />
            <PlanBar label="Miễn phí (Free)" count={packages.free} percent={freePercent} color="#94A3B8" />

            <div className="callout">
              <div className="callout-value">{proPercent + basicPercent}%</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Tỷ lệ chuyển đổi trả phí</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  Tỷ lệ chủ nhà đã nâng cấp lên gói trả phí (Pro & Basic).
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<span className="card-title"><Activity size={18} color="#0F766E" aria-hidden="true" /> Hoạt động gần đây</span>}
            style={{ height: '100%' }}
          >
            {recentActivity.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hoạt động nào" />
            ) : (
              recentActivity.map((act, i) => <ActivityItem key={i} log={act} />)
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
