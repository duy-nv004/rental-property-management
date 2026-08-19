import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Button, Space, Select, Avatar, Tooltip, Spin, message, Popconfirm } from 'antd';
import { Lock, Unlock, Users, CreditCard, BarChart2 } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Constants ──────────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { value: 'FREE', label: 'Free' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
];

const PLAN_STYLES = {
  FREE: { color: '#64748b', bg: '#f1f5f9' },
  BASIC: { color: '#0ea5e9', bg: '#eff8ff' },
  PRO: { color: '#6366f1', bg: '#eff6ff' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────────

const SummaryCard = ({ icon, label, value, color }) => (
  <Card
    bordered={false}
    style={{ borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    bodyStyle={{ padding: '20px 24px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '12px',
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  </Card>
);

SummaryCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

// ─── Main Component ──────────────────────────────────────────────────────────────

const LandlordList = () => {
  const [loading, setLoading] = useState(true);
  const [landlords, setLandlords] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchLandlords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/landlords');
      setLandlords(res);
    } catch (err) {
      console.error(err);
      message.error('Lỗi hệ thống khi tải danh sách chủ nhà!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLandlords(); }, []);

  const handlePlanChange = async (landlordId, newPlan) => {
    try {
      const response = await axiosInstance.put(`/admin/landlords/${landlordId}/plan`, { plan: newPlan });
      message.success(response.message || 'Đã cập nhật gói dịch vụ thành công!');
      fetchLandlords();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi cập nhật gói cước!');
    }
  };

  const handleToggleStatus = async (landlordId, currentStatus) => {
    setActionLoading(landlordId);
    try {
      const nextStatus = currentStatus === 'LOCKED' ? 'active' : 'locked';
      const response = await axiosInstance.put(`/admin/landlords/${landlordId}/status`, { status: nextStatus });
      message.success(response.message || 'Đã cập nhật trạng thái tài khoản!');
      fetchLandlords();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi thay đổi trạng thái tài khoản!');
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      title: 'CHỦ NHÀ',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(text || record.email)}&backgroundColor=0ea5e9`}
            size={36}
            style={{ flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>{text}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => <span style={{ color: '#475569' }}>{phone}</span>,
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const isActive = status === 'ACTIVE';
        return (
          <Tag
            style={{
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '11px',
              padding: '2px 10px',
              border: 'none',
              background: isActive ? '#f0fdf4' : '#fef2f2',
              color: isActive ? '#16a34a' : '#dc2626',
            }}
          >
            {isActive ? '● Hoạt động' : '● Bị khóa'}
          </Tag>
        );
      },
    },
    {
      title: 'GÓI CƯỚC',
      dataIndex: 'plan',
      key: 'plan',
      width: 140,
      render: (plan, record) => {
        const style = PLAN_STYLES[plan] || PLAN_STYLES.FREE;
        return (
          <Select
            value={plan}
            variant="borderless"
            onChange={(value) => handlePlanChange(record.id, value)}
            options={PLAN_OPTIONS.map(opt => ({
              ...opt,
              label: (
                <span style={{ color: PLAN_STYLES[opt.value]?.color, fontWeight: '700' }}>
                  {opt.label}
                </span>
              ),
            }))}
            style={{
              background: style.bg,
              borderRadius: '8px',
              width: 110,
            }}
          />
        );
      },
    },
    {
      title: 'TỔNG QUAN',
      dataIndex: 'portfolio',
      key: 'portfolio',
      render: (portfolio) => <span style={{ color: '#64748b', fontSize: '13px' }}>{portfolio}</span>,
    },
    {
      title: 'NGÀY THAM GIA',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{date}</span>,
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'actions',
      width: 110,
      render: (_, record) => {
        const isLocked = record.status === 'LOCKED';
        const confirmTitle = isLocked
          ? 'Mở khóa tài khoản này?'
          : 'Khóa tài khoản này?';
        const confirmDesc = isLocked
          ? 'Hệ thống sẽ tự động gửi mật khẩu mới qua email cho chủ nhà.'
          : 'Chủ nhà sẽ không thể đăng nhập hệ thống.';

        return (
          <Tooltip title={isLocked ? 'Mở khóa & gửi mật khẩu mới' : 'Khóa tài khoản'}>
            <Popconfirm
              title={confirmTitle}
              description={confirmDesc}
              onConfirm={() => handleToggleStatus(record.id, record.status)}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: !isLocked }}
            >
              <Button
                type={isLocked ? 'default' : 'default'}
                size="small"
                loading={actionLoading === record.id}
                icon={isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                style={{
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: isLocked ? '#22c55e' : '#ef4444',
                  color: isLocked ? '#16a34a' : '#dc2626',
                }}
              >
                {isLocked ? 'Mở khóa' : 'Khóa'}
              </Button>
            </Popconfirm>
          </Tooltip>
        );
      },
    },
  ];

  // Summary stats
  const totalPartners = landlords.length;
  const activeSubs = landlords.filter(l => l.plan !== 'FREE').length;
  const totalRooms = landlords.reduce((acc, l) => {
    const match = l.portfolio.match(/\/ (\d+) Phòng/);
    return acc + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Danh Sách Chủ Nhà"
        description="Giám sát đối tác vận hành căn hộ dịch vụ và quản lý nâng cấp gói cước hệ thống."
        onRefresh={fetchLandlords}
        refreshLoading={loading}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={8}>
          <SummaryCard icon={<Users size={20} color="#6366f1" />} label="TỔNG CHỦ NHÀ" value={totalPartners} color="#6366f1" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard icon={<CreditCard size={20} color="#0ea5e9" />} label="GÓI TRẢ PHÍ ĐANG HOẠT ĐỘNG" value={activeSubs} color="#0ea5e9" />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard icon={<BarChart2 size={20} color="#10b981" />} label="TỔNG SỐ PHÒNG QUẢN LÝ" value={totalRooms} color="#10b981" />
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
        bodyStyle={{ padding: loading ? '60px 24px' : '0' }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Spin size="large" tip="Đang tải danh sách chủ nhà..." />
          </div>
        ) : (
          <Table
            dataSource={landlords}
            columns={columns}
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Tổng ${total} chủ nhà` }}
            rowKey="id"
            size="middle"
          />
        )}
      </Card>

      <style>{`
        .ant-table-row:hover td { background: #f8faff !important; }
      `}</style>
    </div>
  );
};

export default LandlordList;