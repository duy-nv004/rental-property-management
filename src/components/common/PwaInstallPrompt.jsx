import { useState, useEffect } from 'react';
import { Button, Modal, Tag, Space, Alert, Typography } from 'antd';
import { Download, Smartphone, Share, PlusSquare, WifiOff, X, CheckCircle2, ShieldAlert } from 'lucide-react';

const { Text, Paragraph } = Typography;

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth < 768;
  });

  useEffect(() => {
    // 1. Kiểm tra ứng dụng đã chạy dưới dạng PWA Standalone hay chưa
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkStandalone();

    // 2. Kiểm tra thiết bị iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIos(isAppleDevice);

    // 3. Kiểm tra môi trường Secure Context (HTTPS hoặc localhost)
    const secure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsSecure(secure);

    // 4. Bắt sự kiện beforeinstallprompt (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Đã bắt được prompt cài đặt gốc của trình duyệt
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Lắng nghe trạng thái Online / Offline
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 6. Lắng nghe yêu cầu mở modal từ các nút khác trong ứng dụng
    const handleOpenModalEvent = () => setModalOpen(true);
    window.addEventListener('pwa:open-install-modal', handleOpenModalEvent);

    // 7. Theo dõi kích thước màn hình: chỉ hiển thị popup gợi ý trên màn hình điện thoại (< 768px), loại bỏ trên laptop
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        const matches = window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth < 768;
        setIsMobile(matches);
      }
    };
    checkMobile();

    const mql = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
    const handleMqlChange = (e) => setIsMobile(e.matches);
    if (mql) {
      if (mql.addEventListener) mql.addEventListener('change', handleMqlChange);
      else if (mql.addListener) mql.addListener(handleMqlChange);
    }
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa:open-install-modal', handleOpenModalEvent);
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener('change', handleMqlChange);
        else if (mql.removeListener) mql.removeListener(handleMqlChange);
      }
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Nếu người dùng đã cài và đang mở app trong chế độ Standalone, chỉ hiện cảnh báo khi mất mạng
  if (isStandalone) {
    if (!isOffline) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 9999,
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <WifiOff size={15} color="#DC2626" />
        <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>Chế độ ngoại tuyến (Offline PWA)</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setModalOpen(false);
      }
    } else {
      // Mở hướng dẫn cài đặt thủ công (cho iOS, hoặc khi truy cập qua IP HTTP)
      setModalOpen(true);
    }
  };

  const role = typeof localStorage !== 'undefined' ? localStorage.getItem('role') : null;
  const hasBottomNav = typeof window !== 'undefined' && window.innerWidth < 768 && role === 'tenant';

  return (
    <>
      {/* Banner / Floating Pill gợi ý cài đặt PWA - chỉ hiển thị trên màn hình điện thoại (< 768px), ẩn trên màn hình laptop */}
      {!dismissed && isMobile && (
        <div
          className="pwa-install-mobile-banner"
          style={{
            position: 'fixed',
            bottom: hasBottomNav ? 76 : 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 950,
            background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
            color: '#FFFFFF',
            borderRadius: 30,
            padding: '6px 12px 6px 14px',
            boxShadow: '0 6px 20px rgba(15, 118, 110, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: 'max-content',
            maxWidth: 'calc(100vw - 24px)',
            animation: 'fadeInUp 0.3s ease-out'
          }}
          role="region"
          aria-label="Cài đặt ứng dụng SmartRental"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}
            >
              <Smartphone size={14} color="#FFFFFF" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Cài đặt SmartRental</span>
              <span style={{ fontSize: 10.5, color: '#CCFBF1', lineHeight: 1.2, whiteSpace: 'nowrap' }}>Mở nhanh như app điện thoại</span>
            </div>
          </div>

          <Space size={4} style={{ flexShrink: 0 }}>
            <Button
              type="primary"
              size="small"
              icon={<Download size={12} />}
              onClick={handleInstallClick}
              style={{
                background: '#FFFFFF',
                color: '#0F766E',
                borderColor: '#FFFFFF',
                fontWeight: 700,
                borderRadius: 14,
                fontSize: 11.5,
                height: 26,
                padding: '0 10px'
              }}
            >
              Cài đặt
            </Button>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#99F6E4',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                padding: 4
              }}
              title="Đóng thông báo"
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </Space>
        </div>
      )}

      {/* MODAL HƯỚNG DẪN CÀI ĐẶT CHI TIẾT */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F766E' }}>
            <Smartphone size={20} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Cài Đặt Ứng Dụng SmartRental</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setModalOpen(false)} style={{ background: '#0F766E' }} block>
            Đã hiểu
          </Button>
        ]}
        centered
        width={420}
      >
        <div style={{ padding: '4px 0' }}>
          {!isSecure && (
            <Alert
              type="warning"
              showIcon
              icon={<ShieldAlert size={16} />}
              style={{ marginBottom: 14, padding: '8px 12px' }}
              message={<span style={{ fontSize: 13, fontWeight: 700 }}>Đang truy cập qua IP (HTTP)</span>}
              description={<span style={{ fontSize: 12 }}>Trình duyệt di động yêu cầu kết nối bảo mật để tự động bật pop-up. Bạn có thể cài đặt thủ công vào màn hình chính theo các bước bên dưới!</span>}
            />
          )}

          {isIos ? (
            <div>
              <Paragraph style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
                Để cài đặt SmartRental lên màn hình chính <b>iPhone / iPad</b> (Safari):
              </Paragraph>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#E0F2FE', display: 'grid', placeItems: 'center', color: '#0284C7', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Bấm nút Chia sẻ (Share)</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Nhấn vào biểu tượng <Share size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> ở thanh menu dưới đáy trình duyệt Safari.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#CCFBF1', display: 'grid', placeItems: 'center', color: '#0F766E', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Chọn &quot;Thêm vào MH chính&quot;</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Cuộn xuống danh sách tùy chọn và nhấn vào dòng <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> <b>&quot;Thêm vào MH chính&quot; (Add to Home Screen)</b>.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#DCFCE7', display: 'grid', placeItems: 'center', color: '#16A34A', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Xác nhận Thêm</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Nhấn nút <b>&quot;Thêm&quot; (Add)</b> ở góc trên bên phải. Biểu tượng SmartRental sẽ xuất hiện trên màn hình điện thoại!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Paragraph style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
                Để cài đặt SmartRental lên màn hình chính <b>Android / Chrome</b>:
              </Paragraph>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#E0F2FE', display: 'grid', placeItems: 'center', color: '#0284C7', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Mở Menu trình duyệt Chrome</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Nhấn vào dấu <b>3 chấm (⋮)</b> ở góc trên bên phải màn hình trình duyệt.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#CCFBF1', display: 'grid', placeItems: 'center', color: '#0F766E', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Chọn &quot;Cài đặt ứng dụng&quot; hoặc &quot;Thêm vào MH chính&quot;</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Nhấn vào dòng <b>&quot;Cài đặt ứng dụng&quot; (Install app)</b> hoặc <b>&quot;Thêm vào màn hình chính&quot;</b>.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F8FAFC', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: '#DCFCE7', display: 'grid', placeItems: 'center', color: '#16A34A', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Mở ứng dụng độc lập</Text>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Ứng dụng sẽ mở toàn màn hình (không có thanh URL), giao diện mượt mà và hỗ trợ offline.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <Tag color="cyan" icon={<CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />}>
              PWA Standalone • Offline Cache Ready • 192px / 512px
            </Tag>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PwaInstallPrompt;
