import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Result,
  Spin,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { VN_PHONE_RULE } from '../../utils/formRules';
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import axiosInstance from '../../utils/axios';
import {
  buildRoomImageUrl,
  formatVND,
  parseJsonArray,
} from '../../utils/publicRooms';
import { ROOM_PLACEHOLDER_SVG } from './PublicRooms';
import '../../styles/public.css';

const saveBookingLookupToken = (booking) => {
  if (booking?.id && booking?.lookupToken) {
    try {
      localStorage.setItem(`booking_token_${booking.id}`, booking.lookupToken);
    } catch {
      // ignore storage error
    }
  }
};

const getBookingLookupToken = (booking) => {
  if (booking?.lookupToken) return booking.lookupToken;
  if (!booking?.id) return '';
  try {
    return localStorage.getItem(`booking_token_${booking.id}`) || '';
  } catch {
    return '';
  }
};

const saveGuestAuthIfEligible = (auth) => {
  if (!auth?.token || auth?.requiresLogin) return;
  const existingToken = localStorage.getItem('accessToken');
  const existingRole = localStorage.getItem('role');
  if (!existingToken || existingRole === 'tenant') {
    localStorage.setItem('accessToken', auth.token);
    localStorage.setItem('role', auth.user?.role || 'tenant');
    localStorage.setItem('username', auth.user?.name || 'Người thuê');
    if (auth.user) {
      localStorage.setItem('user', JSON.stringify(auth.user));
    }
  }
};

const getSavedUserDefaults = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const PublicRoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Modal đặt lịch xem phòng
  const [viewingOpen, setViewingOpen] = useState(false);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingResult, setViewingResult] = useState(null);
  const [viewingForm] = Form.useForm();

  // Modal đặt cọc giữ phòng
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositSession, setDepositSession] = useState(null); // { booking, payment }
  const [depositLiveStatus, setDepositLiveStatus] = useState(null);
  const [reportedTransfer, setReportedTransfer] = useState(false);
  const [requiresLoginNotice, setRequiresLoginNotice] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [depositForm] = Form.useForm();

  const fetchRoomDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get(`/public/rooms/${id}`);
      setRoom(data);
      setActiveImageIdx(0);
    } catch (err) {
      console.error('Lỗi tải chi tiết phòng:', err);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoomDetail();
  }, [fetchRoomDetail]);

  // Cập nhật trạng thái phòng & đơn đặt phòng theo SSE app:data-changed + fallback 60s
  useEffect(() => {
    const handleDataChanged = () => {
      fetchRoomDetail();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    const bgTimer = setInterval(fetchRoomDetail, 60000);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
      clearInterval(bgTimer);
    };
  }, [fetchRoomDetail]);

  // Poll trạng thái thanh toán VietQR cọc phòng mỗi 3 giây khi modal QR đang mở
  useEffect(() => {
    const bookingId = depositSession?.booking?.id;
    const isPaid =
      depositLiveStatus?.status === 'deposit_paid' ||
      depositLiveStatus?.paymentStatus === 'paid';
    const isConflict = depositLiveStatus?.status === 'deposit_conflict';
    if (!depositOpen || !bookingId || isPaid || isConflict) return undefined;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        const tok = getBookingLookupToken(depositSession?.booking);
        const statusUrl = tok
          ? `/public/bookings/${bookingId}/status?token=${encodeURIComponent(tok)}`
          : `/public/bookings/${bookingId}/status`;
        const res = await axiosInstance.get(statusUrl);
        if (cancelled || !res) return;
        setDepositLiveStatus(res);
        if (res.status === 'deposit_paid' || res.paymentStatus === 'paid') {
          message.success('Đã xác nhận nhận tiền cọc! Phòng đã được giữ cho bạn.');
          fetchRoomDetail();
        } else if (res.status === 'deposit_conflict') {
          message.warning('Phòng vừa có giao dịch giữ chỗ khác trước đó. Tiền cọc đang chờ đối soát hoàn trả.');
          fetchRoomDetail();
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc polling
      }
    };

    const handleSseSync = () => {
      checkStatus();
    };
    window.addEventListener('app:data-changed', handleSseSync);
    const timer = setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      window.removeEventListener('app:data-changed', handleSseSync);
      clearInterval(timer);
    };
  }, [depositOpen, depositSession, depositLiveStatus, fetchRoomDetail]);

  const openViewingModal = () => {
    const saved = getSavedUserDefaults();
    viewingForm.setFieldsValue({
      guestName: saved.name || '',
      guestPhone: saved.phone || '',
      guestEmail: saved.email || '',
      viewingDate: null,
      note: '',
    });
    setViewingResult(null);
    setRequiresLoginNotice(false);
    setGeneratedPassword(null);
    setCopiedPassword(false);
    setViewingOpen(true);
  };

  const openDepositModal = () => {
    const saved = getSavedUserDefaults();
    depositForm.setFieldsValue({
      guestName: saved.name || '',
      guestPhone: saved.phone || '',
      guestEmail: saved.email || '',
      moveInDate: null,
      note: '',
    });
    setDepositSession(null);
    setDepositLiveStatus(null);
    setReportedTransfer(false);
    setRequiresLoginNotice(false);
    setGeneratedPassword(null);
    setCopiedPassword(false);
    setDepositOpen(true);
  };

  const handleCopyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPassword);
      }
      setCopiedPassword(true);
      message.success('Đã sao chép mật khẩu tạm thời!');
    } catch {
      setCopiedPassword(true);
    }
  };

  const handleViewingSubmit = async (values) => {
    setViewingSubmitting(true);
    try {
      const res = await axiosInstance.post('/public/bookings', {
        roomId: room.id,
        type: 'viewing',
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail || undefined,
        viewingDate: values.viewingDate ? values.viewingDate.toISOString() : undefined,
        note: values.note || undefined,
        password: values.password || undefined,
      });
      const createdBooking = res?.booking || res;
      saveBookingLookupToken(createdBooking);
      setRequiresLoginNotice(Boolean(res?.auth?.requiresLogin));
      setGeneratedPassword(res?.auth?.generatedPassword || null);
      setCopiedPassword(false);
      saveGuestAuthIfEligible(res?.auth);
      setViewingResult(createdBooking);
      message.success('Đặt lịch xem phòng thành công!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đặt lịch xem phòng.');
    } finally {
      setViewingSubmitting(false);
    }
  };

  const handleDepositSubmit = async (values) => {
    setDepositSubmitting(true);
    try {
      const res = await axiosInstance.post('/public/bookings', {
        roomId: room.id,
        type: 'deposit',
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail || undefined,
        moveInDate: values.moveInDate ? values.moveInDate.format('YYYY-MM-DD') : undefined,
        note: values.note || undefined,
        password: values.password || undefined,
      });
      const createdBooking = res?.booking || res;
      saveBookingLookupToken(createdBooking);
      setRequiresLoginNotice(Boolean(res?.auth?.requiresLogin));
      setGeneratedPassword(res?.auth?.generatedPassword || null);
      setCopiedPassword(false);
      saveGuestAuthIfEligible(res?.auth);
      setDepositSession({
        booking: createdBooking,
        payment: res?.payment || null,
      });
      setDepositLiveStatus({
        status: createdBooking?.status || 'pending',
        paymentStatus: createdBooking?.paymentStatus || 'unpaid',
      });
      message.success('Đã tạo mã giữ phòng! Vui lòng quét VietQR để hoàn tất đặt cọc.');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tạo yêu cầu đặt cọc.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleMarkTransferred = async () => {
    if (!depositSession?.booking?.id) return;
    try {
      const tok = getBookingLookupToken(depositSession?.booking);
      const url = tok
        ? `/public/bookings/${depositSession.booking.id}/mark-transferred?token=${encodeURIComponent(tok)}`
        : `/public/bookings/${depositSession.booking.id}/mark-transferred`;
      const res = await axiosInstance.post(url);
      setReportedTransfer(true);
      setDepositLiveStatus((prev) => ({
        ...prev,
        paymentStatus: res?.paymentStatus || 'reported',
      }));
      message.success(res?.message || 'Đã ghi nhận thông báo chuyển khoản.');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gửi thông báo chuyển khoản.');
    }
  };

  if (loading) {
    return (
      <div className="public-shell">
        <div style={{ padding: '120px 20px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 14, color: '#475569' }}>Đang tải thông tin phòng...</div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="public-shell">
        <div className="public-container" style={{ paddingTop: 48 }}>
          <Result
            status="404"
            title="Không tìm thấy phòng"
            subTitle="Phòng này không tồn tại hoặc đã được gỡ khỏi danh sách cho thuê."
            extra={
              <Button type="primary" className="public-btn-touch" onClick={() => navigate('/rooms')}>
                Quay lại danh sách phòng trống
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const building = room.building || {};
  const service = building.service || {};
  const landlord = building.landlord || {};
  const images = parseJsonArray(room.images).map((img) => buildRoomImageUrl(img)).filter(Boolean);
  const gallery = images.length > 0 ? images : [ROOM_PLACEHOLDER_SVG];
  const activeSrc = gallery[activeImageIdx] || gallery[0];
  const amenities = parseJsonArray(room.amenities);
  const depositAmount = Number(room.depositAmount || 0) || Number(room.price || 0);
  const fullAddress = [building.address, building.ward, building.district, building.city].filter(Boolean).join(', ');

  const generatedPasswordAlert = generatedPassword ? (
    <Alert
      type="warning"
      showIcon
      data-testid="guest-generated-password-alert"
      style={{ marginBottom: 14, textAlign: 'left' }}
      message="Tài khoản theo dõi hợp đồng đã được tạo tự động"
      description={
        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <div>
            Lưu lại mật khẩu tạm thời dưới đây (chỉ hiển thị 1 lần) để đăng nhập bằng SĐT của bạn:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <code
              data-testid="guest-generated-password-value"
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.03em',
              }}
            >
              {generatedPassword}
            </code>
            <Button
              size="small"
              icon={copiedPassword ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              onClick={handleCopyGeneratedPassword}
              data-testid="btn-copy-generated-password"
              aria-label="Sao chép mật khẩu tạm thời"
              style={{ minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {copiedPassword ? 'Đã sao chép!' : 'Sao chép mật khẩu'}
            </Button>
          </div>
        </div>
      }
    />
  ) : null;

  const hasCoords = building.latitude !== null && building.latitude !== undefined && building.longitude !== null && building.longitude !== undefined;
  const latNum = Number(building.latitude);
  const lngNum = Number(building.longitude);
  const osmEmbedUrl =
    hasCoords && Number.isFinite(latNum) && Number.isFinite(lngNum)
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - 0.008}%2C${latNum - 0.006}%2C${lngNum + 0.008}%2C${latNum + 0.006}&layer=mapnik&marker=${latNum}%2C${lngNum}`
      : null;
  const googleMapsUrl =
    hasCoords && Number.isFinite(latNum) && Number.isFinite(lngNum)
      ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress || building.name || 'Hà Nội')}`;

  const isAvailable = room.status === 'empty';
  const statusLabel =
    room.status === 'empty'
      ? 'Còn trống'
      : room.status === 'reserved'
        ? 'Đã đặt cọc giữ phòng'
        : room.status === 'occupied'
          ? 'Đã có người thuê'
          : 'Đang bảo trì';

  const isDepositPaid =
    depositLiveStatus?.status === 'deposit_paid' ||
    depositLiveStatus?.paymentStatus === 'paid';
  const isDepositConflict = depositLiveStatus?.status === 'deposit_conflict';

  const loggedIn = Boolean(localStorage.getItem('accessToken'));

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Link to="/rooms" className="public-brand">
            <span className="public-brand-mark" aria-hidden="true">
              <Building2 size={20} />
            </span>
            <span>HomeSync · Tìm phòng trọ</span>
          </Link>

          <div className="public-header-actions">
            <Button
              className="public-btn-touch"
              icon={<ArrowLeft size={16} aria-hidden="true" />}
              onClick={() => navigate('/rooms')}
            >
              Danh sách phòng
            </Button>
            {loggedIn ? (
              <Button
                type="primary"
                className="public-btn-touch"
                onClick={() =>
                  navigate(localStorage.getItem('role') === 'landlord' ? '/landlord/dashboard' : '/tenant/contract')
                }
              >
                {localStorage.getItem('role') === 'landlord' ? 'Trang quản lý' : 'Lịch hẹn & Hợp đồng'}
              </Button>
            ) : (
              <Button type="primary" className="public-btn-touch" onClick={() => navigate('/login')}>
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="public-container public-detail-wrap">
        <div className="public-detail-layout">
          <div>
            {/* Bộ sưu tập ảnh phòng */}
            <div className="public-gallery-main">
              <img
                src={activeSrc}
                alt={`Ảnh phòng ${room.roomNumber} (${activeImageIdx + 1}/${gallery.length})`}
                onError={(e) => {
                  e.currentTarget.src = ROOM_PLACEHOLDER_SVG;
                }}
              />
            </div>

            {gallery.length > 1 && (
              <div className="public-gallery-thumbs" role="group" aria-label="Ảnh thu nhỏ của phòng">
                {gallery.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    aria-label={`Xem ảnh ${idx + 1}`}
                    className={`public-gallery-thumb-btn${idx === activeImageIdx ? ' is-active' : ''}`}
                    onClick={() => setActiveImageIdx(idx)}
                  >
                    <img
                      src={src}
                      alt={`Ảnh thu nhỏ ${idx + 1} phòng ${room.roomNumber}`}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = ROOM_PLACEHOLDER_SVG;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Thông tin tổng quan & mô tả */}
            <section className="public-detail-section">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <Tag color={isAvailable ? 'cyan' : 'gold'} style={{ margin: 0, fontWeight: 600 }}>
                  {statusLabel}
                </Tag>
                <span style={{ color: '#475569', fontSize: '0.875rem', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                  <Maximize2 size={15} aria-hidden="true" />
                  {room.area || 20} m²
                </span>
                <span style={{ color: '#475569', fontSize: '0.875rem', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                  <Users size={15} aria-hidden="true" />
                  Tối đa {room.capacity || 2} người
                </span>
              </div>

              <h1 style={{ margin: '0 0 8px', fontSize: '1.625rem', fontWeight: 700, color: '#0f172a' }}>
                Phòng {room.roomNumber} · {building.name || 'Tòa nhà HomeSync'}
              </h1>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#475569', marginBottom: 16 }}>
                <MapPin size={17} color="#0F766E" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <span>{fullAddress || 'Đang cập nhật địa chỉ cụ thể'}</span>
              </div>

              {room.description && (
                <p style={{ margin: '0 0 16px', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                  {room.description}
                </p>
              )}

              {amenities.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Tiện ích sẵn có</div>
                  <div className="public-room-amenities">
                    {amenities.map((item) => (
                      <span key={item} className="public-amenity-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Chi phí dịch vụ minh bạch */}
            <section className="public-detail-section">
              <h2 className="public-detail-section-title">
                <Zap size={18} color="#0F766E" aria-hidden="true" />
                Chi phí dịch vụ tòa nhà niêm yết
              </h2>
              <div className="public-service-grid">
                <div className="public-service-item">
                  <div className="public-service-label">Giá điện</div>
                  <div className="public-service-val">
                    {service.electricityPrice ? `${formatVND(service.electricityPrice)}/kWh` : 'Theo đơn giá nhà nước'}
                  </div>
                </div>
                <div className="public-service-item">
                  <div className="public-service-label">Giá nước</div>
                  <div className="public-service-val">
                    {service.waterPrice ? `${formatVND(service.waterPrice)}/m³` : 'Theo hóa đơn thực tế'}
                  </div>
                </div>
                <div className="public-service-item">
                  <div className="public-service-label">Internet / Wifi</div>
                  <div className="public-service-val">
                    {service.internetPrice ? `${formatVND(service.internetPrice)}/tháng` : 'Thỏa thuận'}
                  </div>
                </div>
                <div className="public-service-item">
                  <div className="public-service-label">Vệ sinh &amp; Dịch vụ chung</div>
                  <div className="public-service-val">
                    {service.cleaningPrice ? `${formatVND(service.cleaningPrice)}/tháng` : 'Thỏa thuận'}
                  </div>
                </div>
              </div>
            </section>

            {/* Vị trí & Bản đồ */}
            <section className="public-detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <h2 className="public-detail-section-title" style={{ margin: 0 }}>
                  <MapPin size={18} color="#0F766E" aria-hidden="true" />
                  Vị trí trên bản đồ
                </h2>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0F766E', fontWeight: 600 }}
                >
                  <span>Mở trên Google Maps</span>
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </div>

              {osmEmbedUrl ? (
                <iframe
                  title={`Bản đồ vị trí phòng ${room.roomNumber}`}
                  src={osmEmbedUrl}
                  className="public-map-frame"
                  loading="lazy"
                />
              ) : (
                <Alert
                  type="info"
                  showIcon
                  title="Tọa độ GPS chưa được cập nhật"
                  description={`Địa chỉ hiện tại: ${fullAddress || 'Chưa có địa chỉ chi tiết'}. Bạn vẫn có thể mở chỉ đường qua nút Google Maps bên trên.`}
                />
              )}
            </section>
          </div>

          {/* Cột hành động đặt lịch & đặt cọc */}
          <aside className="public-sticky-sidebar" aria-label="Đặt lịch và đặt cọc phòng">
            <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>Giá thuê hàng tháng</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f766e', margin: '4px 0 6px' }}>
              {formatVND(room.price)}
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#475569' }}>/tháng</span>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600, marginBottom: 16 }}>
              Tiền cọc giữ phòng: {formatVND(depositAmount)}
            </div>

            {!isAvailable && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                title="Phòng hiện không nhận đặt mới"
                description={`Trạng thái hiện tại: ${statusLabel}. Vui lòng chọn phòng trống khác.`}
              />
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <Button
                type="primary"
                block
                size="large"
                className="public-btn-touch"
                disabled={!isAvailable}
                icon={<CreditCard size={17} aria-hidden="true" />}
                onClick={openDepositModal}
              >
                Đặt cọc giữ phòng ngay
              </Button>

              <Button
                block
                size="large"
                className="public-btn-touch"
                disabled={!isAvailable}
                icon={<CalendarCheck size={17} aria-hidden="true" />}
                onClick={openViewingModal}
              >
                Đặt lịch xem phòng
              </Button>
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gap: 10,
                fontSize: '0.875rem',
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={17} color="#0F766E" aria-hidden="true" />
                <span>Chủ nhà trực tiếp: <strong>{landlord.name || 'Chủ quản HomeSync'}</strong></span>
              </div>
              {landlord.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} color="#0F766E" aria-hidden="true" />
                  <span>Liên hệ: <strong>{landlord.phone}</strong></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#0F766E" aria-hidden="true" />
                <span>Tự động tạo tài khoản theo dõi &amp; ký hợp đồng online bằng SĐT.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL ĐẶT LỊCH XEM PHÒNG */}
      <Modal
        title="Đặt lịch xem phòng miễn phí"
        open={viewingOpen}
        onCancel={() => { setViewingOpen(false); setViewingResult(null); }}
        footer={null}
        width={500}
        centered
        destroyOnHidden
      >
        {viewingResult ? (
          <div>
            {requiresLoginNotice && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 14 }}
                message="Số điện thoại đã có tài khoản HomeSync"
                description={
                  <span>
                    Vui lòng{' '}
                    <Link to="/login" style={{ fontWeight: 600 }}>
                      đăng nhập ngay
                    </Link>{' '}
                    bằng SĐT và mật khẩu hiện có để theo dõi lịch hẹn &amp; ký hợp đồng.
                  </span>
                }
              />
            )}
            {generatedPasswordAlert}
            <Result
              status="success"
              title="Đã gửi lịch hẹn xem phòng!"
              subTitle={`Mã yêu cầu #${viewingResult.id}. Chủ nhà sẽ xác nhận lịch hẹn cho bạn sớm nhất.`}
              extra={[
                <Button
                  key="track"
                  type="primary"
                  className="public-btn-touch"
                  onClick={() => navigate(requiresLoginNotice && !loggedIn ? '/login' : '/tenant/contract')}
                >
                  {requiresLoginNotice && !loggedIn ? 'Đăng nhập để theo dõi' : 'Theo dõi lịch hẹn & Hợp đồng'}
                </Button>,
                <Button key="close" className="public-btn-touch" onClick={() => setViewingOpen(false)}>
                  Đóng
                </Button>,
              ]}
            />
          </div>
        ) : (
          <Form form={viewingForm} layout="vertical" onFinish={handleViewingSubmit} requiredMark={false}>
            <Form.Item
              name="guestName"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
            >
              <Input size="large" placeholder="Nguyễn Văn A" />
            </Form.Item>
            <Form.Item
              name="guestPhone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                VN_PHONE_RULE,
              ]}
            >
              <Input size="large" inputMode="numeric" placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="guestEmail" label="Email (tùy chọn)" rules={[{ type: 'email', message: 'Email không đúng định dạng!' }]}>
              <Input size="large" placeholder="email@example.com" />
            </Form.Item>
            <Form.Item name="viewingDate" label="Thời gian dự kiến xem phòng">
              <DatePicker
                size="large"
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn ngày và giờ xem phòng"
                disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {!loggedIn && (
              <Form.Item
                name="password"
                label="Mật khẩu tài khoản người thuê (tùy chọn)"
                extra="Dùng SĐT và mật khẩu này để đăng nhập xem lịch hẹn & ký hợp đồng sau."
              >
                <Input.Password size="large" placeholder="Tối thiểu 6 ký tự (hoặc để trống)" />
              </Form.Item>
            )}
            <Form.Item name="note" label="Ghi chú cho chủ nhà">
              <Input.TextArea rows={2} placeholder="Ví dụ: Mình muốn xem phòng vào cuối tuần buổi sáng" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              className="public-btn-touch"
              loading={viewingSubmitting}
            >
              Xác nhận đặt lịch xem phòng
            </Button>
          </Form>
        )}
      </Modal>

      {/* MODAL ĐẶT CỌC GIỮ PHÒNG QUA VIETQR SEPAY */}
      <Modal
        title="Đặt cọc giữ phòng ngay qua VietQR"
        open={depositOpen}
        onCancel={() => { setDepositOpen(false); setDepositSession(null); }}
        footer={null}
        width={520}
        centered
        destroyOnHidden
      >
        {!depositSession ? (
          <Form form={depositForm} layout="vertical" onFinish={handleDepositSubmit} requiredMark={false}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title={`Số tiền cọc giữ phòng: ${formatVND(depositAmount)}`}
              description="Sau khi thanh toán qua VietQR thành công, hệ thống tự động giữ phòng và mở bước lập hợp đồng thuê."
            />
            <Form.Item
              name="guestName"
              label="Họ và tên người thuê"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
            >
              <Input size="large" placeholder="Nguyễn Văn A" />
            </Form.Item>
            <Form.Item
              name="guestPhone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                VN_PHONE_RULE,
              ]}
            >
              <Input size="large" inputMode="numeric" placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="moveInDate" label="Ngày dự kiến dọn vào ở">
              <DatePicker
                size="large"
                format="DD/MM/YYYY"
                placeholder="Chọn ngày dự kiến dọn vào"
                disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {!loggedIn && (
              <Form.Item name="password" label="Mật khẩu tài khoản người thuê (tùy chọn)">
                <Input.Password size="large" placeholder="Tối thiểu 6 ký tự (hoặc để trống)" />
              </Form.Item>
            )}
            <Form.Item name="note" label="Ghi chú thêm">
              <Input.TextArea rows={2} placeholder="Thông tin bổ sung cho chủ nhà (nếu có)" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              className="public-btn-touch"
              loading={depositSubmitting}
            >
              Tạo mã QR đặt cọc giữ phòng
            </Button>
          </Form>
        ) : isDepositConflict ? (
          <div>
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 14 }}
              message="Giao dịch xảy ra trùng giữ chỗ (deposit_conflict)"
              description="Phòng vừa được giữ chỗ bởi giao dịch khác trước đó. Tiền cọc bạn đã chuyển đã được ghi nhận ở trạng thái chờ đối soát & hoàn trả."
            />
            <Result
              status="warning"
              title="Phòng đã được giữ chỗ trước đó"
              subTitle={`Đơn đặt cọc #${depositSession.booking.id} đang chờ chủ nhà / quản trị viên đối soát hoàn tiền.`}
              extra={[
                <Button key="rooms" type="primary" className="public-btn-touch" onClick={() => navigate('/rooms')}>
                  Tìm phòng trống khác
                </Button>,
                <Button key="close" className="public-btn-touch" onClick={() => setDepositOpen(false)}>
                  Đóng
                </Button>,
              ]}
            />
          </div>
        ) : isDepositPaid ? (
          <div>
            {requiresLoginNotice && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 14 }}
                message="Số điện thoại đã có tài khoản HomeSync"
                description={
                  <span>
                    Vui lòng{' '}
                    <Link to="/login" style={{ fontWeight: 600 }}>
                      đăng nhập ngay
                    </Link>{' '}
                    bằng SĐT và mật khẩu hiện có để theo dõi &amp; ký hợp đồng.
                  </span>
                }
              />
            )}
            {generatedPasswordAlert}
            <Result
              status="success"
              icon={<CheckCircle2 size={56} color="#0F766E" />}
              title="Đã nhận tiền cọc & Giữ phòng thành công!"
              subTitle={`Phòng ${room.roomNumber} đã được giữ chỗ cho bạn (Mã đơn #${depositSession.booking.id}). Chủ nhà sẽ tạo hợp đồng để bạn ký trực tuyến.`}
              extra={[
                <Button
                  key="contract"
                  type="primary"
                  className="public-btn-touch"
                  onClick={() => navigate(requiresLoginNotice && !loggedIn ? '/login' : '/tenant/contract')}
                >
                  {requiresLoginNotice && !loggedIn ? 'Đăng nhập & Ký hợp đồng' : 'Theo dõi & Ký hợp đồng'}
                </Button>,
                <Button key="close" className="public-btn-touch" onClick={() => setDepositOpen(false)}>
                  Đóng
                </Button>,
              ]}
            />
          </div>
        ) : (
          <div className="sepay-qr-card">
            {requiresLoginNotice && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12, textAlign: 'left' }}
                message="Số điện thoại đã có tài khoản HomeSync"
                description={
                  <span>
                    Bạn có thể quét QR thanh toán ngay bên dưới, sau đó{' '}
                    <Link to="/login" style={{ fontWeight: 600 }}>
                      đăng nhập
                    </Link>{' '}
                    bằng SĐT hiện có để ký hợp đồng.
                  </span>
                }
              />
            )}
            {generatedPasswordAlert}
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: 6 }}>
              Quét mã VietQR để đặt cọc {formatVND(depositSession.payment?.amount || depositAmount)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 14 }}>
              Hệ thống tự động kiểm tra giao dịch mỗi 3 giây và khóa giữ phòng tạm thời trong 15 phút trong lúc chờ chuyển khoản.
            </div>

            {depositSession.payment?.qrCodeUrl && (
              <img
                src={depositSession.payment.qrCodeUrl}
                alt="Mã QR chuyển khoản đặt cọc VietQR"
                className="sepay-qr-image"
              />
            )}

            <div className="sepay-transfer-meta">
              <div>
                <strong>Ngân hàng:</strong> {depositSession.payment?.bankId || 'MB'} — {depositSession.payment?.bankName || 'HomeSync'}
              </div>
              <div>
                <strong>Số tài khoản:</strong> {depositSession.payment?.bankAccount}
              </div>
              <div>
                <strong>Số tiền:</strong> {formatVND(depositSession.payment?.amount || depositAmount)}
              </div>
              <div>
                <strong>Nội dung chuyển khoản bắt buộc:</strong>{' '}
                <span className="sepay-transfer-code" data-testid="transfer-code">
                  {depositSession.payment?.transferCode || depositSession.booking?.transferCode}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <Button
                type="primary"
                block
                className="public-btn-touch"
                disabled={reportedTransfer || depositLiveStatus?.paymentStatus === 'reported'}
                onClick={handleMarkTransferred}
              >
                {reportedTransfer || depositLiveStatus?.paymentStatus === 'reported'
                  ? 'Đã báo chuyển khoản — Đang chờ xác nhận'
                  : 'Tôi đã chuyển khoản'}
              </Button>
              <Button
                block
                className="public-btn-touch"
                onClick={() => navigate('/tenant/contract')}
              >
                Theo dõi lịch hẹn &amp; Ký hợp đồng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicRoomDetail;
