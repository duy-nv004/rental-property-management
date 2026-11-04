import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Tag, Card, Button, Space, message, Modal, Form, Input, InputNumber, Image, Select, Statistic } from 'antd';
import { Wrench, CheckCircle2, Play } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { sortSupportRequests, supportStats, filterSupportRequests } from '../../utils/supportRequests';
import PageHeader from '../../components/admin/PageHeader';
import { CATEGORY_LABELS } from '../tenant/Support';
import SupportImage from '../../components/common/SupportImage';

const SEVERITY_TAGS = {
  high: { color: 'error', text: 'Nghiêm trọng' },
  medium: { color: 'warning', text: 'Trung bình' },
  low: { color: 'blue', text: 'Thấp' },
};

const SEVERITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_TAGS = {
  pending: { color: 'default', text: 'Chờ xử lý' },
  in_progress: { color: 'processing', text: 'Đang sửa chữa' },
  resolved: { color: 'success', text: 'Đã khắc phục' },
};

const SupportManager = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [actionId, setActionId] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [resolveForm] = Form.useForm();
  const [search, setSearch] = useState('');
  const [buildingId, setBuildingId] = useState(null);

  const stats = useMemo(() => supportStats(requests), [requests]);
  const buildingOptions = useMemo(() => {
    const seen = new Map();
    for (const r of Array.isArray(requests) ? requests : []) {
      const b = r.room?.building;
      if (b?.id != null && !seen.has(b.id)) seen.set(b.id, b.name);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [requests]);
  const visibleRequests = useMemo(
    () => sortSupportRequests(filterSupportRequests(requests, { search, buildingId })),
    [requests, search, buildingId],
  );

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/support-requests');
      setRequests(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
    } catch (err) {
      console.error('Error fetching support requests:', err);
      message.error('Không thể tải danh sách báo cáo sự cố.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchRequests(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, [fetchRequests]);

  const handleUpdateStatus = async (id, status, extra = {}) => {
    setActionId(id);
    try {
      await axiosInstance.put(`/manage/support-requests/${id}`, { status, ...extra });
      message.success('Cập nhật trạng thái sự cố thành công!');
      fetchRequests();
    } catch (err) {
      console.error('Error updating support request:', err);
      const errMsg = err.response?.data?.message || 'Không thể cập nhật trạng thái sự cố.';
      message.error(errMsg);
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', width: 80, render: (text) => <b>#{text}</b> },
    {
      title: 'Phòng trọ',
      dataIndex: ['room', 'roomNumber'],
      key: 'roomNumber',
      width: 160,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>Phòng {text}</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{record.room?.building?.name}</div>
        </div>
      )
    },
    {
      title: 'Khách báo',
      key: 'tenant',
      width: 160,
      render: (_, record) => record.tenant ? (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>{record.tenant.name}</div>
          {record.tenant.phone && <div style={{ fontSize: 12, color: '#64748B' }}>{record.tenant.phone}</div>}
        </div>
      ) : <span style={{ color: '#94A3B8' }}>—</span>
    },
    {
      title: 'Loại',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      filters: Object.entries(CATEGORY_LABELS).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => (record.category || 'other') === value,
      render: (cat) => <Tag>{CATEGORY_LABELS[cat] || 'Khác'}</Tag>
    },
    {
      title: 'Mô tả sự cố',
      dataIndex: 'description',
      key: 'description',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.landlordNote && <div style={{ fontSize: 12, color: '#64748B' }}>Ghi chú: {record.landlordNote}</div>}
          {record.repairCost != null && (
            <div style={{ fontSize: 12, color: '#64748B' }}>Chi phí: {Number(record.repairCost).toLocaleString('vi-VN')} đ</div>
          )}
        </div>
      )
    },
    {
      title: 'Ảnh',
      dataIndex: 'images',
      key: 'images',
      width: 150,
      render: (images, record) => images?.length ? (
        <Image.PreviewGroup>
          <Space size={4}>
            {images.map((src) => <SupportImage key={src} requestId={record.id} path={src} width={48} />)}
          </Space>
        </Image.PreviewGroup>
      ) : <span style={{ color: '#94A3B8' }}>—</span>
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 130,
      filters: Object.entries(SEVERITY_TAGS).map(([value, cfg]) => ({ text: cfg.text, value })),
      onFilter: (value, record) => record.severity === value,
      sorter: (a, b) => (SEVERITY_ORDER[a.severity] || 0) - (SEVERITY_ORDER[b.severity] || 0),
      render: (sev) => {
        const cfg = SEVERITY_TAGS[sev];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{sev}</Tag>;
      }
    },
    {
      title: 'Thời gian báo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: (date) => (
        <span style={{ fontSize: 13, color: '#475569' }}>
          {new Date(date).toLocaleDateString('vi-VN')} {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: Object.entries(STATUS_TAGS).map(([value, cfg]) => ({ text: cfg.text, value })),
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        const cfg = STATUS_TAGS[status];
        return cfg ? <Tag color={cfg.color}>{cfg.text}</Tag> : <Tag>{status}</Tag>;
      }
    },
    {
      title: 'Xử lý',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size={8} wrap>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              loading={actionId === record.id}
              icon={<Play size={14} />}
              onClick={() => handleUpdateStatus(record.id, 'in_progress')}
            >
              Bắt đầu sửa
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button
              type="primary"
              size="small"
              loading={actionId === record.id}
              icon={<CheckCircle2 size={14} />}
              onClick={() => { resolveForm.resetFields(); setResolving(record); }}
            >
              Hoàn thành
            </Button>
          )}
          {record.status === 'resolved' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle2 size={14} aria-hidden="true" /> Đã xong
            </span>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Xử lý sự cố báo hỏng"
        description="Theo dõi và cập nhật tiến độ khắc phục báo hỏng từ khách thuê."
        onRefresh={fetchRequests}
        refreshLoading={loading}
      />

      <div data-testid="support-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Card size="small" data-testid="stat-pending"><Statistic title="Chờ xử lý" value={stats.pending} /></Card>
        <Card size="small" data-testid="stat-in-progress"><Statistic title="Đang sửa chữa" value={stats.inProgress} /></Card>
        <Card size="small" data-testid="stat-high-open">
          <Statistic title="Nghiêm trọng chưa xong" value={stats.highOpen} valueStyle={stats.highOpen ? { color: '#DC2626' } : undefined} />
        </Card>
        <Card size="small" data-testid="stat-resolved"><Statistic title="Đã khắc phục" value={stats.resolved} /></Card>
      </div>

      <Card
        title={<span className="card-title"><Wrench size={18} color="#0F766E" aria-hidden="true" /> Danh sách sự cố</span>}
        extra={(
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Tìm tên khách, SĐT, số phòng, mô tả"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              data-testid="support-building-filter"
              allowClear
              placeholder="Tất cả tòa nhà"
              value={buildingId}
              onChange={(v) => setBuildingId(v ?? null)}
              options={buildingOptions}
              style={{ width: 180 }}
            />
          </Space>
        )}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={visibleRequests}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `Tổng ${total} sự cố` }}
          scroll={{ x: 1150 }}
          locale={{ emptyText: 'Chưa có báo cáo sự cố nào' }}
        />
      </Card>

      <Modal
        title={resolving ? `Hoàn thành sự cố #${resolving.id}` : ''}
        open={!!resolving}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={actionId === resolving?.id}
        onCancel={() => setResolving(null)}
        onOk={() => resolveForm.validateFields().then(async ({ landlordNote, repairCost }) => {
          await handleUpdateStatus(resolving.id, 'resolved', {
            landlordNote: landlordNote || undefined,
            repairCost: repairCost ?? undefined,
          });
          setResolving(null);
        })}
        forceRender
      >
        <Form form={resolveForm} layout="vertical" name="resolveSupport">
          <Form.Item name="landlordNote" label="Ghi chú xử lý">
            <Input.TextArea rows={3} maxLength={1000} placeholder="Ví dụ: Đã thay vòi nước mới" />
          </Form.Item>
          <Form.Item name="repairCost" label="Chi phí sửa (VND)">
            <InputNumber
              min={0}
              step={1000}
              precision={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v) => v.replace(/\./g, '')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupportManager;
