import { useState, useEffect } from 'react';
import { Card, Table, Spin, message } from 'antd';
import { ShieldOff, ShieldCheck, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  UPDATE_PLAN: { label: 'Cập nhật Gói cước', color: 'blue', bg: '#eff8ff', textColor: '#2563eb' },
  LOCK_USER: { label: 'Khóa Tài khoản', color: 'red', bg: '#fef2f2', textColor: '#dc2626' },
  UNLOCK_USER: { label: 'Mở khóa Tài khoản', color: 'green', bg: '#f0fdf4', textColor: '#16a34a' },
};

const ActionTag = ({ action }) => {
  const cfg = ACTION_CONFIG[action] || { label: action, bg: '#f1f5f9', textColor: '#475569' };
  const Icon = action === 'LOCK_USER' ? ShieldOff : action === 'UNLOCK_USER' ? ShieldCheck : RefreshCw;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: cfg.bg,
      color: cfg.textColor,
      padding: '4px 10px',
      borderRadius: '20px',
      fontWeight: '700',
      fontSize: '11px',
    }}>
      <Icon size={12} />
      {cfg.label}
    </div>
  );
};

ActionTag.propTypes = {
  action: PropTypes.string,
};

// ─── Main Component ──────────────────────────────────────────────────────────────

const ActivityLogs = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/logs');
      setLogs(res);
    } catch (err) {
      console.error(err);
      message.error('Lỗi hệ thống khi tải nhật ký hoạt động!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const columns = [
    {
      title: 'THỜI GIAN',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 175,
      render: (date) => (
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          {new Date(date).toLocaleString('vi-VN')}
        </span>
      ),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
    },
    {
      title: 'HÀNH ĐỘNG',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (action) => <ActionTag action={action} />,
    },
    {
      title: 'NGƯỜI THỰC HIỆN',
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
      title: 'CHI TIẾT THAO TÁC',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <span style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>{text}</span>
      ),
    },
  ];

  // Row highlight theo loại action
  const rowClassName = (record) => {
    if (record.action === 'LOCK_USER') return 'log-row-lock';
    if (record.action === 'UNLOCK_USER') return 'log-row-unlock';
    return '';
  };

  return (
    <div>
      <PageHeader
        title="Nhật Ký Hoạt Động"
        description="Lịch sử lưu vết toàn bộ các thao tác cấu hình hệ thống và điều chỉnh tài khoản của ban quản trị."
        onRefresh={fetchLogs}
        refreshLoading={loading}
      />

      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải dữ liệu nhật ký..." />
          </div>
        ) : (
          <Table
            dataSource={logs}
            columns={columns}
            pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (total) => `${total} bản ghi` }}
            rowKey="id"
            size="middle"
            rowClassName={rowClassName}
          />
        )}
      </Card>

      <style>{`
        .log-row-lock td { background: #fff5f5 !important; }
        .log-row-unlock td { background: #f6ffed !important; }
        .log-row-lock:hover td { background: #fee2e2 !important; }
        .log-row-unlock:hover td { background: #dcfce7 !important; }
      `}</style>
    </div>
  );
};

export default ActivityLogs;
