import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Tag, Button, Space, Select, Segmented, Modal, Form, Radio, InputNumber, Input, Popconfirm, Drawer, Descriptions, message } from 'antd';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const formatVND = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const todayStr = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD theo giờ máy

const METHOD_LABEL = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', sepay: 'SePay', deposit: 'Cấn trừ cọc' };

const statusTag = (inv) => {
  if (inv.isPaid) return <Tag color="success">Đã thu</Tag>;
  if (inv.status === 'partial' || (!inv.isPaid && Number(inv.paidAmount) > 0)) {
    return <Tag color="processing">Đã thu một phần</Tag>;
  }
  if (inv.dueDate && inv.dueDate < todayStr()) return <Tag color="error">Quá hạn</Tag>;
  return <Tag color="warning">Chưa thu</Tag>;
};

const currentYear = new Date().getFullYear();

const InvoiceManager = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payForm] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (month !== 'all') params.month = month;
      if (year !== 'all') params.year = year;
      setInvoices(await axiosInstance.get('/invoices', { params }));
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [status, month, year]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchInvoices(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, [fetchInvoices]);

  const openPay = (inv) => {
    setPaying(inv);
    const remaining = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
    payForm.setFieldsValue({ paymentMethod: 'cash', paidAmount: remaining || Number(inv.totalAmount) });
  };

  const updatePayment = async (inv, body) => {
    setSubmitting(true);
    try {
      const res = await axiosInstance.post(`/invoices/${inv.id}/payment`, body);
      message.success(res.message);
      setPaying(null);
      fetchInvoices();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật thanh toán.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (inv) => {
    try {
      const res = await axiosInstance.delete(`/invoices/${inv.id}`);
      message.success(res.message);
      fetchInvoices();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa hóa đơn.');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return true;
    const roomNum = String(inv.roomDetails?.roomNumber || '').toLowerCase();
    const tenantName = String(inv.tenant?.name || '').toLowerCase();
    return roomNum.includes(kw) || tenantName.includes(kw);
  });

  const columns = [
    { title: 'Phòng', render: (_, r) => r.roomDetails?.roomNumber },
    { title: 'Tòa', render: (_, r) => r.roomDetails?.building?.name },
    { title: 'Người thuê', render: (_, r) => r.tenant?.name || '—' },
    { title: 'Kỳ', render: (_, r) => `${r.month}/${r.year}` },
    { title: 'Tổng tiền', align: 'right', render: (_, r) => formatVND(r.totalAmount) },
    { title: 'Hạn', render: (_, r) => formatDate(r.dueDate) },
    { title: 'Trạng thái', render: (_, r) => statusTag(r) },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => setViewing(r)}>Xem</Button>
          {!r.isPaid && <Button size="small" type="primary" onClick={() => openPay(r)}>Xác nhận đã thu</Button>}
          {/* Hóa đơn cấn trừ tiền cọc khi thanh lý (C1) không được hủy ở đây */}
          {r.isPaid && r.paymentMethod !== 'deposit' && (
            <Popconfirm title="Hủy xác nhận thanh toán của hóa đơn này?" okText="Hủy xác nhận" cancelText="Không"
              onConfirm={() => updatePayment(r, { isPaid: false })}>
              <Button size="small" danger>Hủy xác nhận</Button>
            </Popconfirm>
          )}
          {!r.isPaid && Number(r.paidAmount || 0) === 0 && (
            <Popconfirm title="Xóa hóa đơn này để xuất lại?" okText="Xóa" cancelText="Không" onConfirm={() => handleDelete(r)}>
              <Button size="small" danger type="text">Xóa</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hóa đơn"
        description="Theo dõi công nợ từng phòng và xác nhận khi đã thu tiền."
        extra={
          <div className="toolbar-wrap">
            <Input.Search
              allowClear
              placeholder="Tìm số phòng hoặc tên khách..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <Select aria-label="Chọn tháng" value={month} style={{ minWidth: 120 }} onChange={setMonth}
              options={[{ value: 'all', label: 'Mọi tháng' }, ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))]} />
            <Select aria-label="Chọn năm" value={year} style={{ minWidth: 120 }} onChange={setYear}
              options={[{ value: 'all', label: 'Mọi năm' }, ...[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => ({ value: y, label: `${y}` }))]} />
          </div>
        }
      />

      <Card>
        <Segmented
          value={status}
          onChange={setStatus}
          style={{ marginBottom: 16 }}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'unpaid', label: 'Chưa thu' },
            { value: 'partial', label: 'Đã thu một phần' },
            { value: 'overdue', label: 'Quá hạn' },
            { value: 'paid', label: 'Đã thu' },
          ]}
        />
        <Table rowKey="id" loading={loading} columns={columns} dataSource={filteredInvoices} scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có hóa đơn nào' }} />
      </Card>

      <Modal
        title={paying ? `Xác nhận đã thu - Phòng ${paying.roomDetails?.roomNumber} (${paying.month}/${paying.year})` : ''}
        open={!!paying}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={submitting}
        onCancel={() => setPaying(null)}
        onOk={() => payForm.validateFields().then((v) => {
          const total = Number(paying?.totalAmount || 0);
          const isFull = Number(v.paidAmount) >= total;
          return updatePayment(paying, { isPaid: isFull, allowPartial: !isFull, ...v });
        })}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item name="paymentMethod" label="Cách thu">
            <Radio.Group>
              <Radio value="cash">Tiền mặt</Radio>
              <Radio value="bank_transfer">Chuyển khoản</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="paidAmount" label="Số tiền đã thu (VND)" rules={[{ required: true, message: 'Vui lòng nhập số tiền!' }]}>
            <InputNumber min={0} step={1000} precision={0} style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => v.replace(/\./g, '')} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={viewing ? `Hóa đơn #${viewing.id} - Phòng ${viewing.roomDetails?.roomNumber}` : ''}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={420}
        extra={
          viewing?.qrCodeUrl && (
            <Button size="small" type="primary" onClick={() => setQrPreview(viewing)}>
              Xem lại QR
            </Button>
          )
        }
      >
        {viewing && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Kỳ">{viewing.month}/{viewing.year}</Descriptions.Item>
            <Descriptions.Item label="Người thuê">{viewing.tenant?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label={viewing.prorated && viewing.daysCharged
              ? `Tiền phòng (${viewing.daysCharged}/${new Date(viewing.year, viewing.month, 0).getDate()} ngày)`
              : 'Tiền phòng'}>{formatVND(viewing.roomPrice)}</Descriptions.Item>
            <Descriptions.Item label="Tiền điện">
              {formatVND(viewing.electricityTotal)}
              {viewing.electricityNew != null && <div style={{ fontSize: 12, color: '#64748B' }}>
                {viewing.electricityOld} → {viewing.electricityNew} = {viewing.electricityNew - viewing.electricityOld} kWh × {formatVND(viewing.electricityPrice)}</div>}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền nước">
              {formatVND(viewing.waterTotal)}
              {viewing.waterNew != null && <div style={{ fontSize: 12, color: '#64748B' }}>
                {viewing.waterOld} → {viewing.waterNew} = {viewing.waterNew - viewing.waterOld} m³ × {formatVND(viewing.waterPrice)}</div>}
            </Descriptions.Item>
            <Descriptions.Item label="Dịch vụ">{formatVND(viewing.serviceTotal)}</Descriptions.Item>
            <Descriptions.Item label="Tổng cộng"><b>{formatVND(viewing.totalAmount)}</b></Descriptions.Item>
            <Descriptions.Item label="Hạn đóng">{formatDate(viewing.dueDate)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{statusTag(viewing)}</Descriptions.Item>
            {(viewing.isPaid || Number(viewing.paidAmount) > 0) && (
              <Descriptions.Item label="Đã thu">
                {formatVND(viewing.paidAmount)} • {METHOD_LABEL[viewing.paymentMethod] || '—'} • {formatDate(viewing.paidAt)}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title={qrPreview ? `Mã VietQR - Hóa đơn #${qrPreview.id} (Phòng ${qrPreview.roomDetails?.roomNumber})` : ''}
        open={!!qrPreview}
        onCancel={() => setQrPreview(null)}
        footer={[
          <Button key="close" onClick={() => setQrPreview(null)}>Đóng</Button>,
        ]}
        width={380}
        centered
      >
        {qrPreview?.qrCodeUrl && (
          <div style={{ textAlign: 'center' }}>
            <img src={qrPreview.qrCodeUrl} alt="VietQR" style={{ maxWidth: '100%', borderRadius: 8 }} />
            <div style={{ marginTop: 8, fontWeight: 600 }}>
              Số tiền: {formatVND(Math.max(0, Number(qrPreview.totalAmount || 0) - Number(qrPreview.paidAmount || 0)))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManager;
