import { useEffect } from 'react';
import { notification } from 'antd';
import { playNotificationSound } from '../../utils/audioAlert';

const SSE_EVENT_HANDLERS = {
  payment_success: {
    level: 'success',
    sound: true,
    title: 'Thanh toán thành công 🎉',
    describe: (d) =>
      d.message || `Hóa đơn #${d.invoiceId || ''} (phòng ${d.roomNumber || ''}) đã được thanh toán.`,
  },
  new_support_request: {
    level: 'info',
    sound: true,
    title: 'Báo cáo sự cố mới 🚨',
    describe: (d) =>
      d.message || `Phòng ${d.roomNumber || ''} (${d.buildingName || ''}): "${d.description || ''}"`,
  },
  booking_created: {
    level: 'info',
    sound: true,
    title: 'Yêu cầu đặt/xem phòng mới',
    describe: (d) =>
      d.message || `Có yêu cầu đặt phòng mới${d.roomNumber ? ` cho phòng ${d.roomNumber}` : ''}.`,
  },
  booking_updated: {
    level: 'info',
    sound: false,
    title: 'Cập nhật đặt phòng',
    describe: (d) =>
      d.message || `Đơn đặt phòng #${d.bookingId || d.id || ''} vừa được cập nhật.`,
  },
  booking_deposit_paid: {
    level: 'success',
    sound: true,
    title: 'Đã nhận tiền cọc giữ phòng',
    describe: (d) =>
      d.message || `Đơn đặt cọc #${d.bookingId || d.id || ''} đã được thanh toán thành công.`,
  },
  booking_deposit_conflict: {
    level: 'error',
    sound: true,
    title: 'Cảnh báo trùng giữ chỗ đặt cọc',
    describe: (d) =>
      d.message ||
      `Đơn #${d.bookingId || d.id || ''} phát sinh giao dịch trùng giữ chỗ và đang chờ đối soát hoàn tiền.`,
  },
  contract_created: {
    level: 'info',
    sound: true,
    title: 'Hợp đồng thuê phòng mới',
    describe: (d) =>
      d.message || `Hợp đồng #${d.contractId || d.id || ''} vừa được tạo.`,
  },
  contract_signed: {
    level: 'success',
    sound: true,
    title: 'Hợp đồng đã được ký',
    describe: (d) =>
      d.message || `Hợp đồng #${d.contractId || d.id || ''} đã hoàn tất ký điện tử.`,
  },
  invoice_created: {
    level: 'info',
    sound: false,
    title: 'Hóa đơn mới',
    describe: (d) =>
      d.message || `Hóa đơn #${d.invoiceId || d.id || ''} vừa được phát hành.`,
  },
  invoice_paid: {
    level: 'success',
    sound: true,
    title: 'Hóa đơn đã thanh toán',
    describe: (d) =>
      d.message || `Hóa đơn #${d.invoiceId || d.id || ''} đã được thanh toán.`,
  },
};

const RealtimeNotificationListener = () => {
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;

    let eventSource;
    try {
      eventSource = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

      Object.entries(SSE_EVENT_HANDLERS).forEach(([eventType, cfg]) => {
        eventSource.addEventListener(eventType, (e) => {
          try {
            const data = e.data ? JSON.parse(e.data) : {};
            if (cfg.sound) {
              playNotificationSound();
            }
            const notifier = notification[cfg.level] || notification.info;
            notifier({
              message: cfg.title,
              description: cfg.describe(data),
              placement: typeof window !== 'undefined' && window.innerWidth < 768 ? 'top' : 'topRight',
              duration: 6,
            });
            window.dispatchEvent(new CustomEvent('app:data-changed', { detail: { type: eventType, data } }));
          } catch (err) {
            console.error(`Error handling ${eventType} SSE:`, err);
          }
        });
      });

      eventSource.onerror = () => {
        // Trình duyệt tự động kết nối lại khi có mạng
      };
    } catch (err) {
      console.warn('Cannot initialize EventSource:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return null;
};

export default RealtimeNotificationListener;

