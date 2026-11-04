import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal, Empty, Spin, Tag, Divider, Alert, message, Select } from 'antd';
import dayjs from 'dayjs';
import { CreditCard, Eye, Download } from 'lucide-react';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';

const METHOD_LABEL = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  sepay: 'VietQR / SePay',
  deposit: 'Cấn trừ tiền cọc',
};

const TenantInvoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  // Lọc theo phòng khi khách thuê nhiều phòng; 'all' = mọi phòng
  const [roomFilter, setRoomFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await axiosInstance.get('/tenant/invoices');
      setInvoices(data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      message.error('Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchInvoices(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, [fetchInvoices]);

  // Đang mở QR: hỏi lại server mỗi 5 giây; khi hóa đơn đã được xác nhận thì đóng modal và báo thành công
  const pollingId = qrModalVisible ? selectedInvoice?.id : null;
  useEffect(() => {
    if (!pollingId) return undefined;
    const timer = setInterval(async () => {
      try {
        const data = await axiosInstance.get('/tenant/invoices');
        setInvoices(data);
        if (data.find((inv) => inv.id === pollingId)?.isPaid) {
          setQrModalVisible(false);
          setSelectedInvoice(null);
          message.success('Hóa đơn đã được thanh toán thành công!');
        }
      } catch (err) {
        console.error('Error polling invoices:', err);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [pollingId]);

  const closeQR = () => {
    setQrModalVisible(false);
    fetchInvoices();
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // T3.5: Hiển thị trạng thái chi tiết từ dueDate & status
  const renderInvoiceStatusTag = (inv) => {
    const paid = Number(inv.paidAmount || 0);
    const total = Number(inv.totalAmount || 0);
    if (inv.isPaid) {
      const paidDate = inv.paidAt ? formatDate(inv.paidAt) : null;
      const method = METHOD_LABEL[inv.paymentMethod] || null;
      const suffix = [paidDate, method].filter(Boolean).join(' • ');
      return (
        <Tag color="success" className="tag-flat">
          Đã đóng{suffix ? ` (${suffix})` : ''}
        </Tag>
      );
    }
    if (inv.status === 'partial' || (paid > 0 && paid < total)) {
      return (
        <Tag color="processing" className="tag-flat">
          Đã trả một phần ({formatVND(paid)}/{formatVND(total)})
        </Tag>
      );
    }
    if (inv.dueDate) {
      const today = dayjs().startOf('day');
      const due = dayjs(inv.dueDate).startOf('day');
      const diffDays = today.diff(due, 'day');
      if (diffDays > 0) {
        return <Tag color="error" className="tag-flat">Quá hạn {diffDays} ngày</Tag>;
      }
      if (due.diff(today, 'day') <= 3) {
        return <Tag color="warning" className="tag-flat">Sắp đến hạn</Tag>;
      }
    }
    return <Tag color="error" className="tag-flat">Chưa thanh toán</Tag>;
  };

  // Dòng phụ "cũ → mới = tiêu thụ × đơn giá"; hóa đơn cũ không lưu chỉ số thì không hiện
  const usageLine = (oldVal, newVal, price, unit) => (
    newVal != null && oldVal != null ? (
      <div className="invoice-meta">
        {oldVal} → {newVal} = {newVal - oldVal} {unit} × {formatVND(price)}
      </div>
    ) : null
  );

  const handleOpenDetails = (inv) => {
    setSelectedInvoice(inv);
  };

  const handleOpenQR = (inv) => {
    setSelectedInvoice(inv);
    setQrModalVisible(true);
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải danh sách hóa đơn..." />
      </div>
    );
  }

  // Danh sách phòng duy nhất từ hóa đơn (backend kèm roomDetails)
  const rooms = [...new Map(
    invoices.filter((inv) => inv.roomDetails).map((inv) => [inv.roomDetails.id, inv.roomDetails])
  ).values()];
  const hasMultipleRooms = rooms.length > 1;
  const visibleInvoices = roomFilter === 'all'
    ? invoices
    : invoices.filter((inv) => inv.roomDetails?.id === roomFilter);
  const unpaidCount = visibleInvoices.filter((inv) => !inv.isPaid).length;

  return (
    <div className="page-shell tenant-page">

      {/* TIÊU ĐỀ TRANG */}
      <div className="hero">
        <h1 className="hero-title">Hóa đơn của tôi</h1>
        <p className="hero-desc">Xem lịch sử hóa đơn hàng tháng và quét mã VietQR để thanh toán nhanh.</p>
        {hasMultipleRooms && (
          <Select
            aria-label="Lọc theo phòng"
            style={{ minWidth: 200, maxWidth: '100%', marginTop: 12 }}
            value={roomFilter}
            onChange={setRoomFilter}
            options={[
              { value: 'all', label: 'Tất cả phòng' },
              ...rooms.map((r) => ({ value: r.id, label: `Phòng ${r.roomNumber}` }))
            ]}
          />
        )}
        {visibleInvoices.length > 0 && (
          <div className="hero-chips">
            <span className="hero-chip">
              <CreditCard size={14} aria-hidden="true" />
              Tổng <strong>{visibleInvoices.length}</strong> hóa đơn
            </span>
            <span className="hero-chip">
              {unpaidCount > 0 ? (
                <>Còn <strong>{unpaidCount}</strong> hóa đơn chưa thanh toán</>
              ) : (
                <>Đã thanh toán <strong>toàn bộ</strong></>
              )}
            </span>
          </div>
        )}
      </div>

      {visibleInvoices.length === 0 ? (
        <Card className="empty-card" variant="borderless">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa có hóa đơn nào." />
        </Card>
      ) : (
        <div className="list-stack">
          {visibleInvoices.map((inv) => (
            <div key={inv.id} className={`invoice-item ${inv.isPaid ? 'is-paid' : 'is-unpaid'}`}>
              <div className="list-row-head">
                <div className="list-row-main">
                  <div className="list-row-title">
                    Hóa đơn tháng {inv.month}/{inv.year}
                    {hasMultipleRooms && inv.roomDetails && ` · Phòng ${inv.roomDetails.roomNumber}`}
                  </div>
                  <div className="invoice-meta">
                    Mã HĐ: #{inv.id} • Ngày tạo: {new Date(inv.createdAt).toLocaleDateString('vi-VN')}
                    {inv.dueDate && ` • Hạn: ${formatDate(inv.dueDate)}`}
                  </div>
                </div>
                {renderInvoiceStatusTag(inv)}
              </div>

              <div className="amount amount-md">{formatVND(inv.totalAmount)}</div>

              <div className="list-actions">
                <Button icon={<Eye size={14} />} onClick={() => handleOpenDetails(inv)}>
                  Chi tiết
                </Button>
                {!inv.isPaid && (
                  <Button
                    type="primary"
                    className="btn-dark"
                    icon={<CreditCard size={14} />}
                    onClick={() => handleOpenQR(inv)}
                  >
                    Thanh toán
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CHI TIẾT HÓA ĐƠN */}
      <Modal
        title="Chi tiết Hóa đơn"
        open={selectedInvoice !== null && !qrModalVisible}
        onCancel={() => setSelectedInvoice(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedInvoice(null)}>
            Đóng
          </Button>,
          selectedInvoice && !selectedInvoice.isPaid && (
            <Button
              key="pay"
              type="primary"
              className="btn-dark"
              onClick={() => setQrModalVisible(true)}
            >
              Thanh toán ngay
            </Button>
          )
        ]}
        width={460}
        centered
      >
        {selectedInvoice && (
          <div>
            <div className="modal-summary">
              <div className="list-row-sub">
                Tổng hóa đơn Tháng {selectedInvoice.month}/{selectedInvoice.year}
              </div>
              <div className="amount amount-lg">{formatVND(selectedInvoice.totalAmount)}</div>
              <div style={{ marginTop: 8 }}>
                {renderInvoiceStatusTag(selectedInvoice)}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">
                  {selectedInvoice.prorated && selectedInvoice.daysCharged
                    ? `Tiền phòng (${selectedInvoice.daysCharged}/${new Date(selectedInvoice.year, selectedInvoice.month, 0).getDate()} ngày)`
                    : 'Tiền phòng'}
                </span>
                <span className="kv-value amount">{formatVND(selectedInvoice.roomPrice)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">
                  Tiền điện (Chỉ số chênh lệch)
                  {usageLine(selectedInvoice.electricityOld, selectedInvoice.electricityNew, selectedInvoice.electricityPrice, 'kWh')}
                </span>
                <span className="kv-value amount">{formatVND(selectedInvoice.electricityTotal)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">
                  Tiền nước (Chỉ số chênh lệch)
                  {usageLine(selectedInvoice.waterOld, selectedInvoice.waterNew, selectedInvoice.waterPrice, 'm³')}
                </span>
                <span className="kv-value amount">{formatVND(selectedInvoice.waterTotal)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Tiền dịch vụ (Vệ sinh, Internet)</span>
                <span className="kv-value amount">{formatVND(selectedInvoice.serviceTotal)}</span>
              </div>
            </div>

            {/* T3.5: Khối Thông tin thanh toán khi đã đóng hoặc trả một phần */}
            {(selectedInvoice.isPaid || selectedInvoice.status === 'partial' || Number(selectedInvoice.paidAmount) > 0) && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div className="kv-list">
                  <div className="kv-row">
                    <span className="kv-label"><strong>Thông tin thanh toán</strong></span>
                    <span className="kv-value">{METHOD_LABEL[selectedInvoice.paymentMethod] || 'Tiền mặt'}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Số tiền đã đóng</span>
                    <span className="kv-value amount">{formatVND(selectedInvoice.paidAmount || selectedInvoice.totalAmount)}</span>
                  </div>
                  {!selectedInvoice.isPaid && (
                    <div className="kv-row">
                      <span className="kv-label">Số tiền còn thiếu</span>
                      <span className="kv-value amount text-danger">
                        {formatVND(Math.max(0, Number(selectedInvoice.totalAmount || 0) - Number(selectedInvoice.paidAmount || 0)))}
                      </span>
                    </div>
                  )}
                  {selectedInvoice.paidAt && (
                    <div className="kv-row">
                      <span className="kv-label">Ngày thanh toán</span>
                      <span className="kv-value">{formatDate(selectedInvoice.paidAt)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <Divider style={{ margin: '16px 0' }} />

            <Alert
              className="alert-block"
              message="Thời hạn đóng tiền"
              description={selectedInvoice.dueDate
                ? `Vui lòng hoàn tất thanh toán trước ngày ${new Date(`${selectedInvoice.dueDate}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}.`
                : 'Vui lòng hoàn tất thanh toán trong vòng 5 ngày kể từ khi hóa đơn được xuất để tránh chậm trễ.'}
              type="info"
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* MODAL 2: THANH TOÁN QUA VIETQR */}
      <Modal
        title="Quét mã VietQR chuyển khoản"
        open={qrModalVisible}
        onCancel={closeQR}
        footer={[
          <Button key="back" onClick={closeQR}>
            Quay lại
          </Button>,
          <Button
            key="download"
            icon={<Download size={14} />}
            type="primary"
            className="btn-success"
            onClick={() => {
              if (selectedInvoice?.qrCodeUrl) {
                window.open(selectedInvoice.qrCodeUrl, '_blank');
              }
            }}
          >
            Mở ảnh QR mới
          </Button>
        ]}
        width={400}
        centered
      >
        {selectedInvoice && (
          <div className="qr-modal">
            <div className="qr-box">
              <img src={selectedInvoice.qrCodeUrl} alt="VietQR Code" />
            </div>

            <div className="modal-summary">
              <div className="list-row-sub">Số tiền cần chuyển khoản</div>
              <div className="amount amount-lg text-danger">
                {formatVND(Math.max(0, Number(selectedInvoice.totalAmount || 0) - Number(selectedInvoice.paidAmount || 0)))}
              </div>
            </div>

            <div className="guide-box">
              <div className="guide-box-title">Hướng dẫn thanh toán</div>
              <ol>
                <li>Mở ứng dụng ngân hàng di động của bạn.</li>
                <li>Chọn chức năng <strong>Quét mã QR</strong>.</li>
                <li>Quét mã QR phía trên. Hệ thống ngân hàng sẽ tự động điền số tài khoản, số tiền và nội dung chuyển khoản.</li>
                <li>Nhấn chuyển tiền và đợi thông báo từ chủ nhà.</li>
              </ol>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default TenantInvoices;
