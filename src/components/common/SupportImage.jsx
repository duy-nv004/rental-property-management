import { useEffect, useState } from 'react';
import { Image } from 'antd';
import axiosInstance from '../../utils/axios';

/**
 * Ảnh sự cố là dữ liệu riêng (R4): phải tải qua axios để gửi kèm Bearer token — thẻ <img>
 * không tự gửi token được. Hiển thị bằng blob URL và thu hồi khi unmount.
 */
const SupportImage = ({ requestId, path, width = 64 }) => {
  const [src, setSrc] = useState(null);
  const filename = String(path || '').split('/').pop();

  useEffect(() => {
    let url = null;
    let cancelled = false;
    axiosInstance
      .get(`/support/${requestId}/images/${encodeURIComponent(filename)}`, { responseType: 'blob' })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch((err) => console.error('Không tải được ảnh sự cố:', err));

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [requestId, filename]);

  if (!src) return <div style={{ width, height: width, borderRadius: 6, background: '#F1F5F9' }} aria-hidden="true" />;
  return <Image width={width} src={src} alt="Ảnh sự cố" />;
};

export default SupportImage;
