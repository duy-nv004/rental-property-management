import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Tag, Card, Button, Space, message, Modal, Form, Input, InputNumber, Image, Select, Grid, Tooltip } from 'antd';
import { Wrench, CheckCircle2, Play, User } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { sortSupportRequests, filterSupportRequests } from '../../utils/supportRequests';
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
  const [statusFilter, setStatusFilter] = useState(null);
  const [severityFilter, setSeverityFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const isPhone = !Grid.useBreakpoint().md;

  const buildingOptions = useMemo(() => {
    const seen = new Map();
    for (const r of Array.isArray(requests) ? requests : []) {
      const b = r.room?.building;
      if (b?.id != null && !seen.has(b.id)) seen.set(b.id, b.name);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [requests]);
  const visibleRequests = useMemo(
    () => sortSupportRequests(filterSupportRequests(requests, {
      search,
      buildingId,
      status: statusFilter,
      severity: severityFilter,
      category: categoryFilter,
    })),
    [requests, search, buildingId, statusFilter, severityFilter, categoryFilter],
  );

  const fetchRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/support-requests');
      setRequests(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
    } catch (err) {
      console.error('Error fetching support requests:', err);
      if (!isSilent) message.error('Không thể tải danh sách báo cáo sự cố.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    // Tự động kiểm tra và cập nhật ngầm mỗi 10 giây khi có báo cáo mới từ khách thuê
    const timer = setInterval(() => fetchRequests(true), 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchRequests(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [fetchRequests]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchRequests(true); };
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
    {
      title: 'Phòng & Người báo',
      dataIndex: ['room', 'roomNumber'],
      key: 'roomNumber',
      width: 170,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0F172A' }}>
            Phòng {text} <span style={{ fontWeight: 400, color: '#64748B', fontSize: 12 }}>· {record.room?.building?.name}</span>
          </div>
          {record.tenant ? (
            <div style={{ fontSize: 12, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <User size={12} aria-hidden="true" />
              <span>{record.tenant.name}</span>
              {record.tenant.phone && <span style={{ color: '#64748B' }}>({record.tenant.phone})</span>}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Chưa gán khách</span>
          )}
        </div>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'category',
      key: 'category',
      width: 95,
      render: (cat) => <Tag style={{ margin: 0 }}>{CATEGORY_LABELS[cat] || 'Khác'}</Tag>
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      render: (text) => <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{text}</div>
    },
    {
      title: 'Ảnh',
      dataIndex: 'images',
      key: 'images',
      width: 90,
      render: (images, record) => images?.length ? (
        <Image.PreviewGroup>
          <Space size={4} wrap>
            {images.slice(0, 2).map((src) => <SupportImage key={src} requestId={record.id} path={src} width={36} />)}
            {images.length > 2 && <Tag style={{ margin: 0, padding: '0 4px', fontSize: 11 }}>+{images.length - 2}</Tag>}
          </Space>
        </Image.PreviewGroup>
      ) : <span style={{ color: '#94A3B8' }}>—</span>
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 105,
      render: (sev) => {
        const cfg = SEVERITY_TAGS[sev];
        return cfg ? <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.text}</Tag> : <Tag style={{ margin: 0 }}>{sev}</Tag>;
      }
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (date) => (
        <div style={{ fontSize: 12, lineHeight: 1.3 }}>
          <div style={{ color: '#0F172A', fontWeight: 500 }}>{new Date(date).toLocaleDateString('vi-VN')}</div>
          <div style={{ color: '#94A3B8', fontSize: 11 }}>{new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const cfg = STATUS_TAGS[status];
        return cfg ? <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.text}</Tag> : <Tag style={{ margin: 0 }}>{status}</Tag>;
      }
    },
    {
      title: 'Xử lý',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'pending' && (
            <Tooltip title="Bắt đầu sửa chữa">
              <Button
                type="primary"
                size="small"
                loading={actionId === record.id}
                icon={<Play size={14} />}
                onClick={() => handleUpdateStatus(record.id, 'in_progress')}
                aria-label="Bắt đầu sửa chữa"
              >
                Sửa
              </Button>
            </Tooltip>
          )}
          {record.status === 'in_progress' && (
            <Tooltip title="Xác nhận hoàn thành sửa chữa">
              <Button
                type="primary"
                size="small"
                style={{ background: '#10B981', borderColor: '#10B981' }}
                loading={actionId === record.id}
                icon={<CheckCircle2 size={14} />}
                onClick={() => { resolveForm.resetFields(); setResolving(record); }}
                aria-label="Hoàn thành sửa chữa"
              >
                Xong
              </Button>
            </Tooltip>
          )}
          {record.status === 'resolved' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={14} aria-hidden="true" /> Xong
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
      />

      {/* Thanh bộ lọc tách biệt riêng phía trên Card/Bảng */}
      <div className="toolbar-wrap" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Tìm tên khách, SĐT, số phòng, mô tả"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          data-testid="support-building-filter"
          allowClear
          placeholder="Tất cả tòa nhà"
          value={buildingId}
          onChange={(v) => setBuildingId(v ?? null)}
          options={buildingOptions}
          style={{ width: 160 }}
        />
        <Select
          data-testid="support-status-filter"
          allowClear
          placeholder="Tất cả trạng thái"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? null)}
          options={Object.entries(STATUS_TAGS).map(([value, cfg]) => ({ value, label: cfg.text }))}
          style={{ width: 160 }}
        />
        <Select
          allowClear
          placeholder="Tất cả mức độ"
          value={severityFilter}
          onChange={(v) => setSeverityFilter(v ?? null)}
          options={Object.entries(SEVERITY_TAGS).map(([value, cfg]) => ({ value, label: cfg.text }))}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder="Tất cả loại sự cố"
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v ?? null)}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          style={{ width: 160 }}
        />
      </div>

      <Card
        title={<span className="card-title"><Wrench size={18} color="#0F766E" aria-hidden="true" /> Danh sách sự cố</span>}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={visibleRequests}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `Tổng ${total} sự cố` }}
          scroll={{ x: 980 }}
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
