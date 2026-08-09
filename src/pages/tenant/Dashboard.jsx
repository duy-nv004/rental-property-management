import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Button, Spin, Empty, Alert, Badge } from 'antd';
import { 
  Building, Phone, Mail, FileText, 
  CreditCard, ShieldAlert, CheckCircle2, ChevronRight, User 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axios';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axiosInstance.get('/tenant/summary');
        setData(response);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu phòng trọ..." />
      </div>
    );
  }

  // Trường hợp người thuê chưa được gán phòng
  if (!data || !data.hasActiveContract) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 16px' }}>
        <Card bordered={false} style={{ textAlign: 'center', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Tài khoản chưa được kích hoạt phòng" 
          />
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginTop: '16px', color: '#0f172a' }}>
            Chưa có thông tin phòng thuê
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 24px' }}>
            Tài khoản của bạn đã được tạo trên hệ thống nhưng chưa được gán vào hợp đồng thuê phòng nào. Vui lòng liên hệ với chủ nhà của bạn để tiến hành làm hợp đồng.
          </p>
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Thông tin tài khoản của bạn:</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Họ tên: <strong>{data?.profile?.name}</strong></div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>SĐT đăng ký: <strong>{data?.profile?.phone}</strong></div>
          </div>
          <Button type="primary" block style={{ background: '#0f172a', border: 'none', height: '44px', borderRadius: '8px' }} onClick={() => navigate('/login')}>
            Quay lại trang Đăng nhập
          </Button>
        </Card>
      </div>
    );
  }

  const { profile, contract, room, building, landlord, invoices, supportRequests } = data;

  // Tính số tiền chưa đóng
  const unpaidInvoices = invoices.filter(inv => !inv.isPaid);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. HERO BANNER - CHÀO MỪNG */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '24px',
        borderRadius: '16px',
        color: '#ffffff',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%', right: '-10%',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>
          Xin chào, {profile.name}! 👋
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', opacity: 0.9 }}>
          <Building size={16} color="#38bdf8" />
          <span style={{ fontSize: '15px', fontWeight: '600' }}>
            Phòng {room.roomNumber} • {building.name}
          </span>
          <Tag color="cyan" style={{ borderRadius: '4px', border: 'none', fontWeight: 'bold', margin: 0 }}>
            Đang hoạt động
          </Tag>
        </div>
        <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Địa chỉ: {building.address}
        </p>
      </div>

      {/* Telegram Connection Alert if not connected */}
      {!profile.telegramChatId && (
        <Alert
          message="Chưa kết nối Telegram"
          description="Kết nối ngay với Telegram Bot để nhận tự động hóa đơn tiền phòng và hóa đơn dịch vụ hàng tháng tức thời."
          type="warning"
          showIcon
          action={
            <Button size="small" type="primary" ghost onClick={() => navigate('/tenant/profile')}>
              Kết nối ngay
            </Button>
          }
          style={{ marginBottom: '24px', borderRadius: '12px' }}
        />
      )}

      {/* 2. CHỈ SỐ KPI CHÍNH */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        
        {/* DƯ NỢ / SỐ TIỀN CẦN THANH TOÁN */}
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cần thanh toán
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '8px 0 4px 0', color: totalUnpaid > 0 ? '#ef4444' : '#10b981' }}>
                  {formatVND(totalUnpaid)}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {unpaidInvoices.length > 0 ? `Còn lại ${unpaidInvoices.length} hóa đơn chưa đóng` : 'Đã hoàn thành mọi khoản phí'}
                </span>
              </div>
              <div style={{ 
                background: totalUnpaid > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' 
              }}>
                {totalUnpaid > 0 ? <ShieldAlert size={20} color="#ef4444" /> : <CheckCircle2 size={20} color="#10b981" />}
              </div>
            </div>
            {totalUnpaid > 0 && (
              <Button 
                type="primary" 
                block 
                icon={<CreditCard size={15} />}
                style={{ marginTop: '16px', background: '#0f172a', border: 'none', borderRadius: '8px', height: '36px' }}
                onClick={() => navigate('/tenant/invoices')}
              >
                Thanh toán ngay
              </Button>
            )}
          </Card>
        </Col>

        {/* GIÁ THUÊ PHÒNG */}
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Giá thuê phòng
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '8px 0 4px 0', color: '#0f172a' }}>
                  {formatVND(room.price)}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Hạn đóng: Theo chu kỳ hợp đồng
                </span>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.04)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                <FileText size={20} color="#0f172a" />
              </div>
            </div>
            <Button 
              type="default" 
              block 
              style={{ marginTop: '16px', borderRadius: '8px', height: '36px' }}
              onClick={() => navigate('/tenant/contract')}
            >
              Xem chi tiết hợp đồng
            </Button>
          </Card>
        </Col>

        {/* THÔNG TIN CHỦ NHÀ */}
        <Col xs={24} md={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', marginBottom: '14px' }}>
              Thông tin Chủ nhà
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                  <User size={14} color="#64748b" />
                </div>
                <strong>{landlord?.name || 'Chủ trọ'}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                  <Phone size={14} color="#64748b" />
                </div>
                <a href={`tel:${landlord?.phone}`} style={{ color: '#475569', textDecoration: 'none' }}>
                  {landlord?.phone || 'Chưa cập nhật'}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                  <Mail size={14} color="#64748b" />
                </div>
                <span style={{ wordBreak: 'break-all' }}>{landlord?.email || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </Card>
        </Col>

      </Row>

      {/* 3. DÀNH CHO DI ĐỘNG & BÁO CÁO NHANH */}
      <Row gutter={[16, 16]}>
        
        {/* LỊCH SỬ HÓA ĐƠN GẦN ĐÂY */}
        <Col xs={24} md={16}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontWeight: '800', fontSize: '15px' }}>Hóa đơn gần đây</span>
                <Button type="link" size="small" style={{ color: '#6366f1', display: 'flex', alignItems: 'center', padding: 0 }} onClick={() => navigate('/tenant/invoices')}>
                  Tất cả <ChevronRight size={14} />
                </Button>
              </div>
            }
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            {invoices.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hóa đơn nào được xuất." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invoices.slice(0, 3).map((inv) => (
                  <div 
                    key={inv.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate('/tenant/invoices')}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Hóa đơn tháng {inv.month}/{inv.year}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{formatVND(inv.totalAmount)}</div>
                    </div>
                    <div>
                      {inv.isPaid ? (
                        <Badge count="Đã đóng" style={{ backgroundColor: '#10b981' }} />
                      ) : (
                        <Badge count="Chưa đóng" style={{ backgroundColor: '#ef4444' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* TRẠNG THÁI SỰ CỐ / BÁO HỎNG GẦN ĐÂY */}
        <Col xs={24} md={8}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontWeight: '800', fontSize: '15px' }}>Báo hỏng / Sự cố</span>
                <Button type="link" size="small" style={{ color: '#6366f1', padding: 0 }} onClick={() => navigate('/tenant/support')}>
                  Gửi yêu cầu
                </Button>
              </div>
            }
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            {supportRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px 0' }}>Mọi thiết bị trong phòng đều hoạt động tốt.</p>
                <Button type="dashed" block onClick={() => navigate('/tenant/support')}>
                  Báo hỏng mới
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {supportRequests.slice(0, 2).map((req) => (
                  <div key={req.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mã #{req.id}</span>
                      {req.status === 'pending' ? (
                        <Tag color="warning" style={{ margin: 0, borderRadius: '4px' }}>Chờ duyệt</Tag>
                      ) : req.status === 'in_progress' ? (
                        <Tag color="processing" style={{ margin: 0, borderRadius: '4px' }}>Đang sửa</Tag>
                      ) : (
                        <Tag color="success" style={{ margin: 0, borderRadius: '4px' }}>Đã xong</Tag>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

      </Row>

    </div>
  );
};

export default TenantDashboard;
