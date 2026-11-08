import { useEffect } from 'react';
import { notification } from 'antd';
import { playNotificationSound } from '../../utils/audioAlert';

const RealtimeNotificationListener = () => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let eventSource;
    try {
      eventSource = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

      eventSource.addEventListener('payment_success', (e) => {
        try {
          const data = JSON.parse(e.data);
          playNotificationSound();
          notification.success({
            message: 'Thanh toán thành công 🎉',
            description: data.message || `Hóa đơn #${data.invoiceId} (phòng ${data.roomNumber}) đã được thanh toán.`,
            placement: typeof window !== 'undefined' && window.innerWidth < 768 ? 'top' : 'topRight',
            duration: 6
          });
          window.dispatchEvent(new CustomEvent('app:data-changed'));
        } catch (err) {
          console.error('Error handling payment_success SSE:', err);
        }
      });

      eventSource.addEventListener('new_support_request', (e) => {
        try {
          const data = JSON.parse(e.data);
          playNotificationSound();
          notification.info({
            message: 'Báo cáo sự cố mới 🚨',
            description: `Phòng ${data.roomNumber} (${data.buildingName}): "${data.description}"`,
            placement: typeof window !== 'undefined' && window.innerWidth < 768 ? 'top' : 'topRight',
            duration: 6
          });
          window.dispatchEvent(new CustomEvent('app:data-changed'));
        } catch (err) {
          console.error('Error handling new_support_request SSE:', err);
        }
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

