import { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Empty, Spin, Tag, Row, Col, Space, Divider, message } from 'antd';
import { CreditCard, Eye, Calendar, DollarSign, Download, ExternalLink, ArrowLeft, ArrowUpRight } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const TenantInvoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await axiosInstance.get('/tenant/invoices');
        setInvoices(data);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        message.error('Không thể tải danh sách hóa đơn.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const handleOpenDetails = (inv) => {
    setSelectedInvoice(inv);
  };

  const handleOpenQR = (inv) => {
    setSelectedInvoice(inv);
    setQrModalVisible(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách hóa đơn..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Hóa đơn của tôi</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Xem lịch sử hóa đơn hàng tháng và quét mã VietQR để thanh toán nhanh.</p>
      </div>

      {invoices.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: '12px', textAlign: 'center', padding: '30px' }}>
          <Empty description="Bạn chưa có hóa đơn nào." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {invoices.map((inv) => (
            <Card 
              key={inv.id} 
              bordered={false} 
              style={{ 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                borderLeft: inv.isPaid ? '4px solid #10b981' : '4px solid #ef4444'
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      Tháng {inv.month}/{inv.year}
                    </span>
                    {inv.isPaid ? (
                      <Tag color="success" style={{ margin: 0, borderRadius: '4px', fontWeight: 'bold' }}>Đã đóng</Tag>
                    ) : (
                      <Tag color="error" style={{ margin: 0, borderRadius: '4px', fontWeight: 'bold' }}>Chưa thanh toán</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '6px 0' }}>
                    {formatVND(inv.totalAmount)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Mã HĐ: #{inv.id} • Ngày tạo: {new Date(inv.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', width: '100%', sm: 'auto', marginTop: '12px', justifyContent: 'flex-end' }}>
                  <Button 
                    icon={<Eye size={14} />} 
                    style={{ borderRadius: '8px', flex: 1, sm: 'none' }}
                    onClick={() => handleOpenDetails(inv)}
                  >
                    Chi tiết
                  </Button>
                  {!inv.isPaid && (
                    <Button 
                      type="primary" 
                      icon={<CreditCard size={14} />} 
                      style={{ background: '#0f172a', border: 'none', borderRadius: '8px', flex: 1, sm: 'none' }}
                      onClick={() => handleOpenQR(inv)}
                    >
                      Thanh toán
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL 1: CHI TIẾT HÓA ĐƠN */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px' }}>Chi tiết Hóa đơn</span>}
        open={selectedInvoice !== null && !qrModalVisible}
        onCancel={() => setSelectedInvoice(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedInvoice(null)} style={{ borderRadius: '8px' }}>
            Đóng
          </Button>,
          selectedInvoice && !selectedInvoice.isPaid && (
            <Button 
              key="pay" 
              type="primary" 
              style={{ background: '#0f172a', border: 'none', borderRadius: '8px' }}
              onClick={() => setQrModalVisible(true)}
            >
              Thanh toán ngay
            </Button>
          )
        ]}
        width={450}
        centered
      >
        {selectedInvoice && (
          <div style={{ padding: '10px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Tổng hóa đơn Tháng {selectedInvoice.month}/{selectedInvoice.year}</span>
              <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                {formatVND(selectedInvoice.totalAmount)}
              </h2>
              <div style={{ marginTop: '8px' }}>
                {selectedInvoice.isPaid ? (
                  <Tag color="success">Đã hoàn thành</Tag>
                ) : (
                  <Tag color="error">Chờ thanh toán</Tag>
                )}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Tiền phòng</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(selectedInvoice.roomPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Tiền điện (Chỉ số chênh lệch)</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(selectedInvoice.electricityTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Tiền nước (Chỉ số chênh lệch)</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(selectedInvoice.waterTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Tiền dịch vụ (Vệ sinh, Internet)</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(selectedInvoice.serviceTotal)}</span>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />
            
            <Alert 
              message="Thời hạn đóng tiền"
              description="Vui lòng hoàn tất thanh toán trong vòng 5 ngày kể từ khi hóa đơn được xuất để tránh chậm trễ."
              type="info"
              showIcon
              style={{ borderRadius: '8px' }}
            />
          </div>
        )}
      </Modal>

      {/* MODAL 2: THANH TOÁN QUA VIETQR */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px' }}>Quét mã VietQR chuyển khoản</span>}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="back" style={{ borderRadius: '8px' }} onClick={() => setQrModalVisible(false)}>
            Quay lại
          </Button>,
          <Button 
            key="download"
            icon={<Download size={14} />} 
            type="primary" 
            style={{ background: '#10b981', border: 'none', borderRadius: '8px' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <img 
                src={selectedInvoice.qrCodeUrl} 
                alt="VietQR Code" 
                style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
              />
            </div>
            
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Số tiền cần chuyển khoản</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', marginBottom: '12px' }}>
                {formatVND(selectedInvoice.totalAmount)}
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', width: '100%' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Hướng dẫn thanh toán
              </div>
              <ol style={{ fontSize: '13px', color: '#1e3a8a', paddingLeft: '16px', margin: 0, lineHeight: '1.5' }}>
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
