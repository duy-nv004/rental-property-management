import { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Button, Space, Select, Avatar, Tooltip, message, Modal, Form, Input, Checkbox, Radio, Grid } from 'antd';
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
  FREE: { color: '#475569', bg: '#F1F5F9' },
  BASIC: { color: '#0369A1', bg: '#F0F9FF' },
  PRO: { color: '#0F766E', bg: '#F0FDFA' },
};

const getTodayDateOnly = () => {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vnTime.getFullYear();
  const m = String(vnTime.getMonth() + 1).padStart(2, '0');
  const d = String(vnTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isPlanExpired = (planExpiresAt) => {
  if (!planExpiresAt) return false;
  return String(planExpiresAt).slice(0, 10) < getTodayDateOnly();
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return '—';
  const parts = String(dateStr).slice(0, 10).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

// ─── Sub-components ──────────────────────────────────────────────────────────────

const SummaryCard = ({ icon, label, value, color }) => (
  <Card className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div className="stat-icon" style={{ background: color + '14', color }} aria-hidden="true">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: 24, marginTop: 2 }}>{value}</div>
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
  const [statusTarget, setStatusTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [statusForm] = Form.useForm();
  const isPhone = !Grid.useBreakpoint().md;

  const fetchLandlords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/landlords');
      setLandlords(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      if (!isSilent) message.error('Lỗi hệ thống khi tải danh sách chủ nhà!');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLandlords();
    const interval = setInterval(() => {
      fetchLandlords(true);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLandlords(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchLandlords]);

  const confirmPlanChange = (record, newPlan) => {
    if (newPlan === record.plan) return;
    const toPaid = newPlan !== 'FREE';
    let billingCycle = record.billingCycle || 'monthly';
    Modal.confirm({
      title: `Đổi gói của ${record.name} từ ${record.plan} sang ${newPlan}?`,
      content: toPaid ? (
        <div style={{ marginTop: 8 }}>
          <Radio.Group
            defaultValue={billingCycle}
            onChange={(e) => { billingCycle = e.target.value; }}
            options={[
              { value: 'monthly', label: 'Theo tháng (30 ngày)' },
              { value: 'annual', label: 'Theo năm (365 ngày)' },
            ]}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>
            Đây là cấp gói thủ công (nguồn Admin), không cộng vào doanh thu thực thu SePay.
          </div>
        </div>
      ) : null,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => handlePlanChange(record.id, newPlan, billingCycle),
    });
  };

  const handlePlanChange = async (landlordId, newPlan, billingCycle) => {
    try {
      const response = await axiosInstance.put(`/admin/landlords/${landlordId}/plan`, { plan: newPlan, billingCycle });
      message.success(response.message || 'Đã cập nhật gói dịch vụ thành công!');
      fetchLandlords();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi cập nhật gói cước!');
    }
  };

  const openStatusModal = (record) => {
    statusForm.resetFields();
    setStatusTarget(record);
  };

  const handleToggleStatus = async () => {
    const record = statusTarget;
    const isLocked = record.status === 'LOCKED';
    const values = await statusForm.validateFields();
    const body = isLocked
      ? { status: 'active', resetPassword: !!values.resetPassword }
      : { status: 'locked', reason: values.reason.trim() };
    setActionLoading(record.id);
    try {
      const response = await axiosInstance.put(`/admin/landlords/${record.id}/status`, body);
      message.success(response.message || 'Đã cập nhật trạng thái tài khoản!');
      setStatusTarget(null);
      fetchLandlords();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi thay đổi trạng thái tài khoản!');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLandlords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return landlords.filter((l) => {
      if (planFilter && l.plan !== planFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      const nameMatch = (l.name || '').toLowerCase().includes(q);
      const emailMatch = (l.email || '').toLowerCase().includes(q);
      const phoneMatch = (l.phone || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch;
    });
  }, [landlords, searchQuery, planFilter, statusFilter]);

  const columns = [
    {
      title: 'Chủ nhà',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar size={36} style={{ flexShrink: 0, background: '#CCFBF1', color: '#0F766E', fontWeight: 700 }}>
            {(text || record.email || '?').trim().charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>{text}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => <span style={{ color: '#475569' }}>{phone}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status, record) => {
        const isActive = status === 'ACTIVE';
        return (
          <Tooltip title={!isActive && record.lockReason ? `Lý do: ${record.lockReason}` : undefined}>
            <Tag color={isActive ? 'success' : 'error'} style={{ fontWeight: 600 }}>
              {isActive ? 'Hoạt động' : 'Bị khóa'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Gói cước',
      dataIndex: 'plan',
      key: 'plan',
      width: 140,
      render: (plan, record) => {
        const style = PLAN_STYLES[plan] || PLAN_STYLES.FREE;
        return (
          <Select
            value={plan}
            variant="borderless"
            onChange={(value) => confirmPlanChange(record, value)}
            options={PLAN_OPTIONS.map(opt => ({
              ...opt,
              label: (
                <span style={{ color: PLAN_STYLES[opt.value]?.color, fontWeight: 600 }}>
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
      title: 'Hạn gói',
      key: 'planExpiresAt',
      width: 180,
      render: (_, record) => {
        if (record.plan === 'FREE') {
          return <Tag color="default">Không thời hạn</Tag>;
        }
        if (!record.planExpiresAt) {
          return <Tag color="processing">Chưa cập nhật</Tag>;
        }
        const expired = isPlanExpired(record.planExpiresAt);
        const cycleLabel = record.billingCycle === 'annual' ? 'Năm' : 'Tháng';
        return (
          <Space size={4} wrap>
            <Tag color={expired ? 'error' : 'success'} style={{ fontWeight: 600, margin: 0 }}>
              {formatDateVN(record.planExpiresAt)}
            </Tag>
            <Tag color={record.billingCycle === 'annual' ? 'cyan' : 'blue'} style={{ margin: 0 }}>
              {cycleLabel}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Quy mô',
      dataIndex: 'portfolio',
      key: 'portfolio',
      render: (portfolio) => <span style={{ color: '#475569', fontSize: 13 }}>{portfolio}</span>,
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <span style={{ color: '#64748B', fontSize: 13 }}>{date}</span>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      render: (_, record) => {
        const isLocked = record.status === 'LOCKED';

        return (
          <Tooltip title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}>
            <Button
              onClick={() => openStatusModal(record)}
              size="small"
              danger={!isLocked}
              color={isLocked ? 'green' : undefined}
              variant="outlined"
              loading={actionLoading === record.id}
              icon={isLocked ? <Unlock size={14} /> : <Lock size={14} />}
              style={{ height: isPhone ? 44 : 32 }}
            >
              {isLocked ? 'Mở khóa' : 'Khóa'}
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  // Summary stats (T3.4: chỉ đếm gói trả phí đang ACTIVE và chưa hết hạn)
  const totalPartners = landlords.length;
  const activeSubs = landlords.filter(
    (l) => l.status === 'ACTIVE' && l.plan !== 'FREE' && (!l.planExpiresAt || !isPlanExpired(l.planExpiresAt))
  ).length;
  const totalRooms = landlords.reduce((acc, l) => {
    const match = (l.portfolio || '').match(/\/ (\d+) Phòng/);
    return acc + (match ? parseInt(match[1], 10) : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Danh sách chủ nhà"
        description="Giám sát đối tác vận hành và quản lý gói cước của từng chủ nhà."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <SummaryCard icon={<Users size={20} />} label="Tổng chủ nhà" value={totalPartners} color="#0F766E" />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <SummaryCard icon={<CreditCard size={20} />} label="Gói trả phí đang hoạt động" value={activeSubs} color="#0369A1" />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <SummaryCard icon={<BarChart2 size={20} />} label="Tổng số phòng quản lý" value={totalRooms} color="#15803D" />
        </Col>
      </Row>

      <div className="toolbar-wrap" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm theo tên, email hoặc SĐT"
          allowClear
          style={{ width: isPhone ? '100%' : 280 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          placeholder="Lọc gói cước"
          allowClear
          style={{ width: isPhone ? '100%' : 160 }}
          value={planFilter}
          onChange={setPlanFilter}
          options={PLAN_OPTIONS}
        />
        <Select
          placeholder="Lọc trạng thái"
          allowClear
          style={{ width: isPhone ? '100%' : 180 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ACTIVE', label: 'Đang hoạt động' },
            { value: 'LOCKED', label: 'Bị khóa' },
          ]}
        />
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={filteredLandlords}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Tổng ${total} chủ nhà` }}
          rowKey="id"
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        open={!!statusTarget}
        title={statusTarget?.status === 'LOCKED' ? 'Mở khóa tài khoản này?' : 'Khóa tài khoản này?'}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: statusTarget?.status !== 'LOCKED', loading: actionLoading === statusTarget?.id }}
        onOk={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical" name="landlord-status">
          {statusTarget?.status === 'LOCKED' ? (
            <Form.Item name="resetPassword" valuePropName="checked" initialValue={false}
              extra="Chỉ chọn khi chủ nhà quên mật khẩu. Mật khẩu chỉ đổi nếu gửi email thành công.">
              <Checkbox>Cấp mật khẩu mới qua email</Checkbox>
            </Form.Item>
          ) : (
            <Form.Item name="reason" label="Lý do khóa" extra="Chủ nhà sẽ không thể đăng nhập; lý do hiển thị khi họ đăng nhập."
              rules={[{ required: true, transform: (v) => (v || '').trim(), min: 5, message: 'Vui lòng nhập lý do khóa (tối thiểu 5 ký tự)' }]}>
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default LandlordList;
