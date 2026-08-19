import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Space, Popconfirm, Spin, message } from 'antd';
import { Clock, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Sub-components ──────────────────────────────────────────────────────────────

const TicketStatCard = ({ icon, label, value, color, bg }) => (
  <Card
    bordered={false}
    style={{ borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${bg}` }}
    bodyStyle={{ padding: '16px 20px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '10px', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: '900', color }}>{value}</div>
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
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
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

  const handleResolveTicket = async (ticketId, status) => {
    setActionLoading(ticketId);
    try {
      const response = await axiosInstance.put(`/admin/tickets/${ticketId}/resolve`, { status });
      const actionText = status === 'resolved' ? 'phê duyệt và mở khóa' : 'từ chối';
      message.success(response.message || `Đã ${actionText} khiếu nại thành công!`);
      fetchTickets();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi xử lý khiếu nại!');
    } finally {
      setActionLoading(null);
    }
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
                icon={<CheckCircle2 size={13} />}
                style={{
                  background: '#22c55e',
                  borderColor: '#22c55e',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Duyệt
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Từ chối khiếu nại?"
              description="Tài khoản chủ nhà vẫn giữ nguyên trạng thái BỊ KHÓA."
              onConfirm={() => handleResolveTicket(record.id, 'rejected')}
              okText="Từ chối"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                loading={actionLoading === record.id}
                icon={<XCircle size={13} />}
                danger
                style={{
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Từ chối
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản Lý Ticket Khiếu Nại"
        description="Xem xét, phê duyệt hoặc từ chối các yêu cầu mở khóa tài khoản từ đối tác chủ nhà."
        onRefresh={fetchTickets}
        refreshLoading={loading}
      />

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={6}>
          <TicketStatCard icon={<Inbox size={18} color="#64748b" />} label="TỔNG TICKET" value={tickets.length} color="#0f172a" bg="#f1f5f9" />
        </Col>
        <Col xs={24} md={6}>
          <TicketStatCard icon={<Clock size={18} color="#d97706" />} label="ĐANG CHỜ DUYỆT" value={pendingCount} color="#d97706" bg="#fffbeb" />
        </Col>
        <Col xs={24} md={6}>
          <TicketStatCard icon={<CheckCircle2 size={18} color="#16a34a" />} label="ĐÃ DUYỆT MỞ KHÓA" value={resolvedCount} color="#16a34a" bg="#f0fdf4" />
        </Col>
        <Col xs={24} md={6}>
          <TicketStatCard icon={<XCircle size={18} color="#dc2626" />} label="ĐÃ TỪ CHỐI" value={rejectedCount} color="#dc2626" bg="#fef2f2" />
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải danh sách khiếu nại..." />
          </div>
        ) : (
          <Table
            dataSource={tickets}
            columns={columns}
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} ticket` }}
            rowKey="id"
            size="middle"
          />
        )}
      </Card>
    </div>
  );
};

export default TicketManager;
