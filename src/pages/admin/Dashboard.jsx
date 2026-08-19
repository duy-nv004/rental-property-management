import { useState, useEffect } from 'react';
import { Row, Col, Card, Progress, Spin, message } from 'antd';
import { Users, Wallet, CheckCircle2, TrendingUp, ArrowUpRight } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Sub-components ─────────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon, gradient }) => (
  <Card
    bordered={false}
    style={{
      borderRadius: '16px',
      background: gradient,
      border: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      position: 'relative',
    }}
    bodyStyle={{ padding: '24px' }}
  >
    {/* Decorative circle */}
    <div style={{
      position: 'absolute', top: -20, right: -20,
      width: 100, height: 100, borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)',
    }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: '10px',
        borderRadius: '12px',
        backdropFilter: 'blur(4px)',
      }}>
        {icon}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255,255,255,0.15)',
        padding: '4px 10px',
        borderRadius: '20px',
      }}>
        <ArrowUpRight size={12} color="white" />
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{subtitle}</span>
      </div>
    </div>

    <div style={{ marginTop: '20px', position: 'relative' }}>
      <div style={{ fontSize: '30px', fontWeight: '900', color: 'white', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
        {title}
      </div>
    </div>
  </Card>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  gradient: PropTypes.string,
};

const PlanBar = ({ label, count, percent, color }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', letterSpacing: '0.3px' }}>
        {label}
      </span>
      <span style={{ fontSize: '12px', fontWeight: '700', color }}>
        {percent}% &nbsp;<span style={{ color: '#94a3b8', fontWeight: '400' }}>({count} chủ nhà)</span>
      </span>
    </div>
    <Progress
      percent={percent}
      strokeColor={color}
      trailColor="#f1f5f9"
      showInfo={false}
      strokeWidth={10}
      style={{ borderRadius: '99px' }}
    />
  </div>
);

PlanBar.propTypes = {
  label: PropTypes.string,
  count: PropTypes.number,
  percent: PropTypes.number,
  color: PropTypes.string,
};

const ActivityItem = ({ log }) => {
  const actionColors = {
    UPDATE_PLAN: { bg: '#eff6ff', icon: '#3b82f6', dot: '#3b82f6' },
    LOCK_USER: { bg: '#fef2f2', icon: '#ef4444', dot: '#ef4444' },
    UNLOCK_USER: { bg: '#f0fdf4', icon: '#22c55e', dot: '#22c55e' },
  };
  const style = actionColors[log.action] || { bg: '#f8fafc', icon: '#64748b', dot: '#64748b' };

  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: style.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: style.dot }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
          {log.label}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.sub}
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
          {log.time}
        </div>
      </div>
    </div>
  );
};

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
  const [refreshLoading, setRefreshLoading] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshLoading(true);
    else setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/stats');
      setData(res);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu thống kê quản trị!');
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu hệ thống..." />
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
      title: 'DOANH THU GÓI CƯỚC HÀNG THÁNG (MRR)',
      value: `$${Number(stats.totalRevenue).toLocaleString('en-US')}`,
      subtitle: 'Từ gói chủ nhà',
      icon: <Wallet size={20} color="white" />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'CHỦ NHÀ ĐÃ XÁC THỰC',
      value: stats.landlordCount,
      subtitle: 'Đang hoạt động',
      icon: <CheckCircle2 size={20} color="white" />,
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    },
    {
      title: 'GÓI TRẢ PHÍ KÍCH HOẠT',
      value: (packages.basic || 0) + (packages.pro || 0),
      subtitle: 'Basic & Pro',
      icon: <Users size={20} color="white" />,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tổng quan Hệ thống"
        description="Số liệu giám sát thời gian thực các gói cước và chủ nhà trong hệ thống."
        onRefresh={() => fetchStats(true)}
        refreshLoading={refreshLoading}
      />

      {/* Stat Cards */}
      <Row gutter={[24, 24]}>
        {statCards.map((card, i) => (
          <Col xs={24} md={8} key={i}>
            <StatCard {...card} />
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* Package Distribution */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#6366f1" />
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Phân bổ Gói Cước</span>
              </div>
            }
            extra={
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Tổng: <b>{packages.total}</b> chủ nhà
              </span>
            }
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
          >
            <PlanBar label="GÓI CHUYÊN NGHIỆP (PRO)" count={packages.pro} percent={proPercent} color="#6366f1" />
            <PlanBar label="GÓI CƠ BẢN (BASIC)" count={packages.basic} percent={basicPercent} color="#0ea5e9" />
            <PlanBar label="GÓI MIỄN PHÍ (FREE)" count={packages.free} percent={freePercent} color="#94a3b8" />

            {/* Conversion summary */}
            <div style={{
              background: 'linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)',
              padding: '20px', borderRadius: '12px',
              border: '1px solid #e0e7ff',
              display: 'flex', alignItems: 'center', gap: '16px',
              marginTop: '8px',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', fontSize: '20px', color: 'white', flexShrink: 0,
              }}>
                {proPercent + basicPercent}%
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Tỷ lệ Chuyển đổi Trả phí</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Tỷ lệ chủ nhà nâng cấp gói dịch vụ trả phí (Pro & Basic) — cải thiện doanh thu biên.
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Nhật ký gần đây</span>
              </div>
            }
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}
          >
            {recentActivity.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                Chưa có hoạt động nào được ghi nhận
              </div>
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