import { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Spin, Empty, Alert } from 'antd';
import {
  Building, Phone, Mail, FileText,
  CreditCard, ShieldAlert, CheckCircle2, ChevronRight, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';

const StatCard = ({ label, value, note, icon, tone, action }) => (
  <Card className="stat-card stat-card-tight mobile-compact">
    <div className="stat-head">
      <div className="stat-head-main">
        <div className="stat-label">{label}</div>
        <div className={`stat-value stat-value-sm text-${tone}`}>{value}</div>
        {note && <div className="stat-sub stat-note">{note}</div>}
      </div>
      <div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div>
    </div>
    {action}
  </Card>
);

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
      <div className="loading-center">
        <Spin size="large" tip="Đang tải dữ liệu phòng trọ..." />
      </div>
    );
  }

  // Trường hợp người thuê chưa có cả hợp đồng active lẫn hợp đồng chờ ký
  if (!data || (!data.hasActiveContract && !data.hasPendingContract)) {
    return (
      <div className="page-shell-tight">
        <Card className="empty-card" variant="borderless">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Tài khoản chưa được kích hoạt phòng"
          />
          <h2 className="empty-title">Chưa có thông tin phòng thuê</h2>
          <p className="empty-desc">
            Tài khoản của bạn đã được tạo trên hệ thống nhưng chưa được gán vào hợp đồng thuê phòng nào. Vui lòng liên hệ với chủ nhà của bạn để tiến hành làm hợp đồng.
          </p>
          <div className="empty-note">
            <div className="empty-note-title">Thông tin tài khoản của bạn</div>
            <div className="empty-note-row">Họ tên: <strong>{data?.profile?.name}</strong></div>
            <div className="empty-note-row">SĐT đăng ký: <strong>{data?.profile?.phone}</strong></div>
          </div>
          <Button type="primary" block className="btn-dark" onClick={() => { localStorage.clear(); navigate('/login'); }}>
            Đăng xuất
          </Button>
        </Card>
      </div>
    );
  }

  const { profile, room, building, landlord, invoices, supportRequests } = data;

  // Tính số tiền chưa đóng
  const unpaidInvoices = invoices.filter(inv => !inv.isPaid);
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  return (
    <div className="page-shell tenant-page">

      {/* 1. HERO BANNER - CHÀO MỪNG */}
      <div className="hero">
        <h1 className="hero-title">Xin chào, {profile.name}</h1>
        <p className="hero-desc">Địa chỉ: {building.address}</p>
        <div className="hero-chips">
          <span className="hero-chip">
            <Building size={14} aria-hidden="true" />
            Phòng <strong>{room.roomNumber}</strong> • {building.name}
          </span>
          <span className="hero-chip">
            <CheckCircle2 size={14} aria-hidden="true" />
            Đang hoạt động
          </span>
        </div>
      </div>

      {/* Hợp đồng chờ ký */}
      {data.hasPendingContract && (
        <Alert
          className="alert-block"
          type="warning"
          showIcon
          icon={<FileText size={20} />}
          message="Bạn có hợp đồng thuê phòng chờ ký nhận"
          description="Chủ nhà đã khởi tạo hợp đồng thuê và đính kèm chữ ký điện tử. Vui lòng đọc kỹ các điều khoản và thực hiện ký số để kích hoạt hợp đồng."
          action={
            <Button type="primary" className="btn-warning" onClick={() => navigate('/tenant/contract')}>
              Ký hợp đồng ngay
            </Button>
          }
        />
      )}

      {/* Nhắc kết nối Telegram */}
      {!profile.telegramChatId && (
        <Alert
          className="alert-block"
          type="warning"
          showIcon
          message="Chưa kết nối Telegram"
          description="Kết nối ngay với Telegram Bot để nhận tự động hóa đơn tiền phòng và hóa đơn dịch vụ hàng tháng tức thời."
          action={
            <Button size="small" onClick={() => navigate('/tenant/profile')}>
              Kết nối ngay
            </Button>
          }
        />
      )}

      {/* 2. CHỈ SỐ KPI CHÍNH */}
      <Row gutter={[16, 16]}>

        {/* DƯ NỢ / SỐ TIỀN CẦN THANH TOÁN */}
        <Col xs={12} sm={12} md={8}>
          <StatCard
            label="Cần thanh toán"
            value={formatVND(totalUnpaid)}
            note={unpaidInvoices.length > 0 ? `Còn lại ${unpaidInvoices.length} hóa đơn chưa đóng` : 'Đã hoàn thành mọi khoản phí'}
            tone={totalUnpaid > 0 ? 'danger' : 'ok'}
            icon={totalUnpaid > 0 ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
            action={totalUnpaid > 0 && (
              <Button
                type="primary"
                block
                className="stat-action"
                icon={<CreditCard size={15} />}
                onClick={() => navigate('/tenant/invoices')}
              >
                Thanh toán ngay
              </Button>
            )}
          />
        </Col>

        {/* GIÁ THUÊ PHÒNG */}
        <Col xs={12} sm={12} md={8}>
          <StatCard
            label="Giá thuê phòng"
            value={formatVND(room.price)}
            note="Hạn đóng: theo chu kỳ hợp đồng"
            tone="neutral"
            icon={<FileText size={20} />}
            action={
              <Button block className="stat-action" onClick={() => navigate('/tenant/contract')}>
                Xem chi tiết hợp đồng
              </Button>
            }
          />
        </Col>

        {/* THÔNG TIN CHỦ NHÀ */}
        <Col xs={24} md={8}>
          <Card className="stat-card stat-card-tight">
            <div className="card-title">Thông tin chủ nhà</div>
            <div className="contact-list">
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><User size={15} /></span>
                <strong>{landlord?.name || 'Chủ trọ'}</strong>
              </div>
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><Phone size={15} /></span>
                <a href={`tel:${landlord?.phone}`}>{landlord?.phone || 'Chưa cập nhật'}</a>
              </div>
              <div className="contact-row">
                <span className="info-icon" aria-hidden="true"><Mail size={15} /></span>
                <span className="contact-break">{landlord?.email || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </Card>
        </Col>

      </Row>

      {/* 3. HÓA ĐƠN & SỰ CỐ GẦN ĐÂY */}
      <Row gutter={[16, 16]}>

        {/* LỊCH SỬ HÓA ĐƠN GẦN ĐÂY */}
        <Col xs={24} md={16}>
          <Card
            className="stat-card"
            variant="borderless"
            title={
              <div className="card-title-row">
                <span className="card-title-text">Hóa đơn gần đây</span>
                <Button type="link" size="small" className="link-accent" onClick={() => navigate('/tenant/invoices')}>
                  Tất cả <ChevronRight size={14} aria-hidden="true" />
                </Button>
              </div>
            }
          >
            {invoices.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hóa đơn nào được xuất." />
            ) : (
              <div className="list-stack">
                {invoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="list-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/tenant/invoices')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/tenant/invoices');
                      }
                    }}
                  >
                    <div className="list-row-main">
                      <div className="list-row-title">Hóa đơn tháng {inv.month}/{inv.year}</div>
                      <div className="list-row-sub amount">{formatVND(inv.totalAmount)}</div>
                    </div>
                    {inv.isPaid ? (
                      <Tag color="success" className="tag-flat">Đã đóng</Tag>
                    ) : (
                      <Tag color="error" className="tag-flat">Chưa đóng</Tag>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* TRẠNG THÁI SỰ CỐ / BÁO HỎNG GẦN ĐÂY */}
        <Col xs={24} md={8}>
          <Card
            className="stat-card"
            variant="borderless"
            title={
              <div className="card-title-row">
                <span className="card-title-text">Báo hỏng / sự cố</span>
                <Button type="link" size="small" className="link-accent" onClick={() => navigate('/tenant/support')}>
                  Gửi yêu cầu
                </Button>
              </div>
            }
          >
            {supportRequests.length === 0 ? (
              <div className="empty-inline">
                <p className="empty-inline-text">Mọi thiết bị trong phòng đều hoạt động tốt.</p>
                <Button type="dashed" block onClick={() => navigate('/tenant/support')}>
                  Báo hỏng mới
                </Button>
              </div>
            ) : (
              <div className="list-stack">
                {supportRequests.slice(0, 2).map((req) => (
                  <div key={req.id} className="list-row-static">
                    <div className="list-row-head">
                      <span className="list-row-sub">Mã #{req.id}</span>
                      {req.status === 'pending' ? (
                        <Tag color="warning" className="tag-flat">Chờ duyệt</Tag>
                      ) : req.status === 'in_progress' ? (
                        <Tag color="processing" className="tag-flat">Đang sửa</Tag>
                      ) : (
                        <Tag color="success" className="tag-flat">Đã xong</Tag>
                      )}
                    </div>
                    <p className="list-row-title truncate">{req.description}</p>
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
