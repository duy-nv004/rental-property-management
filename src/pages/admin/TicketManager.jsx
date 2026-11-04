import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Space, Popconfirm, Modal, Input, message, Grid } from 'antd';
import { Clock, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Sub-components ──────────────────────────────────────────────────────────────

const TicketStatCard = ({ icon, label, value, color, bg }) => (
  <Card className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="stat-icon" style={{ background: bg, color }} aria-hidden="true">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ fontSize: 22, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  </Card>
);

TicketStatCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string,
  value: PropTypes.number,
  color: PropTypes.string,
  bg: PropTypes.string,
};

const StatusBadge = ({ status }) => {
  const configs = {
    pending: { label: 'Đang chờ', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    resolved: { label: 'Đã duyệt', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  };
  const cfg = configs[status] || configs.pending;

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

// ─── Main Component ──────────────────────────────────────────────────────────────

const TicketManager = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  // T2.17: từ chối bắt buộc nhập lý do (gửi email cho chủ nhà)
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const isPhone = !Grid.useBreakpoint().md; // phone: vùng chạm 44px

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/tickets');
      setTickets(res);
    } catch (err) {
      console.error(err);
      message.error('Lỗi hệ thống khi tải danh sách ticket khiếu nại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleResolveTicket = async (ticketId, status, reason) => {
    setActionLoading(ticketId);
    try {
      const body = status === 'rejected' ? { status, reason } : { status };
      const response = await axiosInstance.put(`/admin/tickets/${ticketId}/resolve`, body);
      const actionText = status === 'resolved' ? 'phê duyệt và mở khóa' : 'từ chối';
      message.success(response.message || `Đã ${actionText} khiếu nại thành công!`);
      fetchTickets();
      return true;
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi xử lý khiếu nại!');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (ticketId) => {
    setRejectReason('');
    setRejectTarget(ticketId);
  };

  const trimmedReason = rejectReason.trim();
  const submitReject = async () => {
    if (trimmedReason.length < 5) return;
    const ok = await handleResolveTicket(rejectTarget, 'rejected', trimmedReason);
    if (ok) setRejectTarget(null);
  };

  // Computed stats
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const rejectedCount = tickets.filter(t => t.status === 'rejected').length;

  const columns = [
    {
      title: 'THỜI GIAN GỬI',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => (
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          {new Date(date).toLocaleString('vi-VN')}
        </span>
      ),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
    },
    {
      title: 'CHỦ NHÀ',
      dataIndex: 'email',
      key: 'landlord',
      width: 230,
      render: (email, record) => (
        <div>
          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
            {record.landlord?.name || 'Chủ nhà'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{email}</div>
          {record.landlord?.phone && (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>SĐT: {record.landlord.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: 'TIÊU ĐỀ KHIẾU NẠI',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text) => <span style={{ fontWeight: '700', color: '#0f172a' }}>{text}</span>,
    },
    {
      title: 'NỘI DUNG',
      dataIndex: 'message',
      key: 'message',
      render: (text) => (
        <span style={{ color: '#475569', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{text}</span>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'actions',
      width: 195,
      render: (_, record) => {
        if (record.status !== 'pending') {
          return (
            <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
              Đã xử lý xong
            </span>
          );
        }

        return (
          <Space size={6}>
            <Popconfirm
              title="Phê duyệt khiếu nại?"
              description="Tài khoản chủ nhà sẽ được MỞ KHÓA và nhận mật khẩu mới qua email."
              onConfirm={() => handleResolveTicket(record.id, 'resolved')}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="small"
                loading={actionLoading === record.id}
                icon={<CheckCircle2 size={14} />}
                style={{ height: isPhone ? 44 : 32 }}
              >
                Duyệt
              </Button>
            </Popconfirm>

            <Button
              size="small"
              loading={actionLoading === record.id}
              icon={<XCircle size={14} />}
              danger
              style={{ height: isPhone ? 44 : 32 }}
              onClick={() => openReject(record.id)}
            >
              Từ chối
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý ticket khiếu nại"
        description="Xem xét, phê duyệt hoặc từ chối các yêu cầu mở khóa tài khoản từ đối tác chủ nhà."
        onRefresh={fetchTickets}
        refreshLoading={loading}
      />

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <TicketStatCard icon={<Inbox size={20} />} label="Tổng ticket" value={tickets.length} color="#475569" bg="#F1F5F9" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TicketStatCard icon={<Clock size={20} />} label="Đang chờ duyệt" value={pendingCount} color="#B45309" bg="#FFFBEB" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TicketStatCard icon={<CheckCircle2 size={20} />} label="Đã duyệt mở khóa" value={resolvedCount} color="#15803D" bg="#F0FDF4" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <TicketStatCard icon={<XCircle size={20} />} label="Đã từ chối" value={rejectedCount} color="#DC2626" bg="#FEF2F2" />
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={tickets}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} ticket` }}
          rowKey="id"
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title="Từ chối khiếu nại"
        open={rejectTarget !== null}
        onCancel={() => setRejectTarget(null)}
        onOk={submitReject}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: trimmedReason.length < 5, loading: actionLoading === rejectTarget }}
        destroyOnHidden
      >
        <p style={{ color: '#475569', marginTop: 0 }}>
          Tài khoản chủ nhà vẫn giữ nguyên trạng thái BỊ KHÓA. Lý do sẽ được gửi qua email cho chủ nhà.
        </p>
        <Input.TextArea
          rows={4}
          maxLength={1000}
          showCount
          placeholder="Nhập lý do từ chối (tối thiểu 5 ký tự)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          aria-label="Lý do từ chối"
        />
      </Modal>
    </div>
  );
};

export default TicketManager;
