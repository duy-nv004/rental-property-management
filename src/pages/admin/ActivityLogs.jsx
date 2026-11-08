import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Select, DatePicker, Input, Tabs, Tag, message, Grid } from 'antd';
import { ShieldOff, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';
import ResponsiveFilterBar from '../../components/common/ResponsiveFilterBar';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  UPDATE_PLAN: { label: 'Cập nhật Gói cước', color: 'blue', bg: '#eff8ff', textColor: '#2563eb' },
  LOCK_USER: { label: 'Khóa Tài khoản', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
  UNLOCK_USER: { label: 'Mở khóa Tài khoản', color: 'green', bg: '#f0fdf4', textColor: '#16a34a' },
  UPDATE_PLAN_CONFIG: { label: 'Cấu hình Gói cước', color: 'blue', bg: '#eff8ff', textColor: '#2563eb' },
  TICKET_REJECTED: { label: 'Từ chối khiếu nại', color: 'orange', bg: '#fff7ed', textColor: '#c2410c' },
  PLAN_PAYMENT_REJECTED: { label: 'Từ chối nâng gói (thiếu tiền)', color: 'orange', bg: '#fff7ed', textColor: '#c2410c' },
  INVOICE_PAYMENT_REJECTED: { label: 'Từ chối gạch nợ (thiếu tiền)', color: 'orange', bg: '#fff7ed', textColor: '#c2410c' },
  INVOICE_PARTIAL_PAYMENT: { label: 'Thu một phần hóa đơn', color: 'blue', bg: '#eff8ff', textColor: '#2563eb' },
  INVOICE_OVERPAID: { label: 'Hóa đơn thu thừa tiền', color: 'orange', bg: '#fff7ed', textColor: '#c2410c' },
  INVOICE_DUPLICATE_PAYMENT: { label: 'Hóa đơn thu trùng', color: 'orange', bg: '#fff7ed', textColor: '#c2410c' },
  SEPAY_UNMATCHED: { label: 'SePay sai cú pháp / chủ nhà', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
  UNKNOWN_INVOICE: { label: 'SePay không tìm thấy HĐ', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
  PLAN_INVALID: { label: 'SePay gói không hợp lệ', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
  INVOICE_LANDLORD_MISMATCH: { label: 'SePay lệch mã chủ nhà', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
};

const SEPAY_STATUS_OPTIONS = [
  { value: 'REJECTED', label: 'Bị từ chối (REJECTED)' },
  { value: 'FAILED', label: 'Lỗi xử lý (FAILED)' },
  { value: 'PROCESSED', label: 'Đã xử lý (PROCESSED)' },
  { value: 'PROCESSING', label: 'Đang xử lý (PROCESSING)' },
];

const ActionTag = ({ action }) => {
  const cfg = ACTION_CONFIG[action] || { label: action, bg: '#f1f5f9', textColor: '#475569' };
  const Icon = action === 'LOCK_USER'
    ? ShieldOff
    : action === 'UNLOCK_USER'
      ? ShieldCheck
      : cfg.color === 'red' || cfg.color === 'orange'
        ? AlertCircle
        : RefreshCw;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: cfg.bg,
      color: cfg.textColor,
      padding: '4px 10px',
      borderRadius: 999,
      fontWeight: 600,
      fontSize: 12,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={13} aria-hidden="true" />
      {cfg.label}
    </div>
  );
};

ActionTag.propTypes = {
  action: PropTypes.string,
};

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);

// ─── Main Component ──────────────────────────────────────────────────────────────

const ActivityLogs = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({}); // { action, from, to, q }
  const [searchQ, setSearchQ] = useState('');

  // Trạng thái tab Đối soát SePay (T1.3)
  const [sepayLoading, setSepayLoading] = useState(false);
  const [sepayEvents, setSepayEvents] = useState([]);
  const [sepayTotal, setSepayTotal] = useState(0);
  const [sepayPage, setSepayPage] = useState(1);
  const [sepayPageSize, setSepayPageSize] = useState(20);
  const [sepayFilters, setSepayFilters] = useState({});
  const [sepaySearchQ, setSepaySearchQ] = useState('');

  const isPhone = !Grid.useBreakpoint().md;

  const fetchLogs = useCallback(async (p = 1, size = 20, f = {}, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/logs', { params: { page: p, pageSize: size, ...f } });
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      if (!isSilent) message.error('Lỗi hệ thống khi tải nhật ký hoạt động!');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const fetchSePayEvents = useCallback(async (p = 1, size = 20, f = {}, isSilent = false) => {
    if (!isSilent) setSepayLoading(true);
    try {
      const res = await axiosInstance.get('/admin/sepay-events', { params: { page: p, pageSize: size, ...f } });
      setSepayEvents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      if (!isSilent) message.error('Lỗi hệ thống khi tải danh sách đối soát SePay!');
    } finally {
      if (!isSilent) setSepayLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, pageSize, filters);
  }, [fetchLogs, page, pageSize, filters]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'logs') {
        fetchLogs(page, pageSize, filters, true);
      } else {
        fetchSePayEvents(sepayPage, sepayPageSize, sepayFilters, true);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (activeTab === 'logs') {
          fetchLogs(page, pageSize, filters, true);
        } else {
          fetchSePayEvents(sepayPage, sepayPageSize, sepayFilters, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeTab, fetchLogs, fetchSePayEvents, filters, page, pageSize, sepayFilters, sepayPage, sepayPageSize]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'sepay' && sepayEvents.length === 0) {
      fetchSePayEvents(sepayPage, sepayPageSize, sepayFilters);
    }
  };

  const applyFilters = (patch) => {
    const next = { ...filters, ...patch };
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    setFilters(next);
    setPage(1);
    fetchLogs(1, pageSize, next);
  };

  const applySepayFilters = (patch) => {
    const next = { ...sepayFilters, ...patch };
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    setSepayFilters(next);
    setSepayPage(1);
    fetchSePayEvents(1, sepayPageSize, next);
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 175,
      responsive: ['md'],
      render: (date) => (
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          {new Date(date).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 220,
      render: (action) => <ActionTag action={action} />,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'admin',
      key: 'admin',
      width: 220,
      render: (admin) => (
        <div>
          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
            {admin?.name || 'Super Admin'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {admin?.email || 'admin@system'}
          </div>
        </div>
      ),
    },
    {
      title: 'Chi tiết thao tác',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <span style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>{text}</span>
      ),
    },
  ];

  const sepayColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => (
        <span style={{ color: '#64748b', fontSize: 12 }}>
          {date ? new Date(date).toLocaleString('vi-VN') : '—'}
        </span>
      ),
    },
    {
      title: 'Mã sự kiện',
      dataIndex: 'eventKey',
      key: 'eventKey',
      width: 180,
      render: (val) => <code style={{ fontSize: 12, color: '#0f172a' }}>{val}</code>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'transferAmount',
      key: 'transferAmount',
      width: 140,
      render: (val) => <strong style={{ color: '#0f766e' }}>{formatVND(val)}</strong>,
    },
    {
      title: 'Nội dung CK',
      dataIndex: 'content',
      key: 'content',
      render: (val) => <span style={{ color: '#334155', fontWeight: 500 }}>{val || '—'}</span>,
    },
    {
      title: 'Trạng thái / Phân loại',
      key: 'status',
      width: 210,
      render: (_, r) => {
        const statusColor = r.status === 'REJECTED' || r.status === 'FAILED'
          ? 'error'
          : r.status === 'PROCESSING'
            ? 'processing'
            : 'success';
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag color={statusColor} style={{ fontWeight: 600, margin: 0 }}>{r.status}</Tag>
            {r.resultType && <Tag style={{ margin: 0 }}>{r.resultType}</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Lý do lỗi / Ghi chú',
      dataIndex: 'errorReason',
      key: 'errorReason',
      render: (reason, r) => (
        <div style={{ fontSize: 12, color: reason ? '#dc2626' : '#64748b' }}>
          {reason || (r.invoiceId ? `HĐ #${r.invoiceId}` : r.landlordId ? `Chủ nhà #${r.landlordId}` : 'Hợp lệ')}
        </div>
      ),
    },
  ];

  const rowClassName = (record) => {
    if (record.action === 'LOCK_USER') return 'log-row-lock';
    if (record.action === 'UNLOCK_USER') return 'log-row-unlock';
    return '';
  };

  return (
    <div>
      <PageHeader
        title="Nhật ký hoạt động & Đối soát SePay"
        description="Lịch sử lưu vết thao tác quản trị và hàng đợi đối soát các giao dịch webhook SePay."
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'logs',
            label: 'Nhật ký hệ thống',
            children: (
              <>
                <ResponsiveFilterBar
                  search={{
                    placeholder: 'Tìm theo mô tả',
                    'aria-label': 'Tìm theo mô tả',
                    value: searchQ,
                    onChange: (e) => {
                      const val = e.target.value;
                      setSearchQ(val);
                      if (!val) applyFilters({ q: undefined });
                    },
                    onPressEnter: () => applyFilters({ q: searchQ.trim() }),
                    width: 260,
                  }}
                  filters={[
                    {
                      key: 'action',
                      label: 'Loại hành động',
                      'aria-label': 'Loại hành động',
                      placeholder: 'Loại hành động',
                      value: filters.action,
                      onChange: (action) => applyFilters({ action }),
                      options: Object.entries(ACTION_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
                      width: 240,
                    },
                  ]}
                  extra={
                    <DatePicker.RangePicker
                      style={isPhone ? { width: '100%', minHeight: 40 } : { minHeight: 40 }}
                      format="DD/MM/YYYY"
                      onChange={(range) => applyFilters({ from: range?.[0]?.format('YYYY-MM-DD'), to: range?.[1]?.format('YYYY-MM-DD') })}
                    />
                  }
                  onReset={() => {
                    setSearchQ('');
                    setFilters({});
                    setPage(1);
                    fetchLogs(1, pageSize, {});
                  }}
                />

                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={logs}
                    columns={columns}
                    loading={loading}
                    pagination={{
                      current: page,
                      pageSize,
                      total,
                      showSizeChanger: true,
                      showTotal: (t) => `${t} bản ghi`,
                      onChange: (p, size) => { setPage(p); setPageSize(size); fetchLogs(p, size, filters); },
                    }}
                    rowKey="id"
                    size="middle"
                    rowClassName={rowClassName}
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'sepay',
            label: 'Đối soát SePay',
            children: (
              <>
                <ResponsiveFilterBar
                  search={{
                    placeholder: 'Tìm nội dung CK, mã GD hoặc lý do lỗi',
                    'aria-label': 'Tìm nội dung CK, mã GD hoặc lý do lỗi',
                    value: sepaySearchQ,
                    onChange: (e) => {
                      const val = e.target.value;
                      setSepaySearchQ(val);
                      if (!val) applySepayFilters({ q: undefined });
                    },
                    onPressEnter: () => applySepayFilters({ q: sepaySearchQ.trim() }),
                    width: 300,
                  }}
                  filters={[
                    {
                      key: 'status',
                      label: 'Trạng thái xử lý',
                      'aria-label': 'Trạng thái giao dịch SePay',
                      placeholder: 'Lọc trạng thái xử lý',
                      value: sepayFilters.status,
                      onChange: (status) => applySepayFilters({ status }),
                      options: SEPAY_STATUS_OPTIONS,
                      width: 220,
                    },
                  ]}
                  onReset={() => {
                    setSepaySearchQ('');
                    setSepayFilters({});
                    setSepayPage(1);
                    fetchSePayEvents(1, sepayPageSize, {});
                  }}
                />

                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={sepayEvents}
                    columns={sepayColumns}
                    loading={sepayLoading}
                    pagination={{
                      current: sepayPage,
                      pageSize: sepayPageSize,
                      total: sepayTotal,
                      showSizeChanger: true,
                      showTotal: (t) => `${t} giao dịch`,
                      onChange: (p, size) => {
                        setSepayPage(p);
                        setSepayPageSize(size);
                        fetchSePayEvents(p, size, sepayFilters);
                      },
                    }}
                    rowKey="id"
                    size="middle"
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

      <style>{`
        .log-row-lock td:first-child { box-shadow: inset 3px 0 0 #DC2626; }
        .log-row-unlock td:first-child { box-shadow: inset 3px 0 0 #15803D; }
      `}</style>
    </div>
  );
};

export default ActivityLogs;
