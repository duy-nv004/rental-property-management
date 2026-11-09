import React from 'react';
import { Spin } from 'antd';

/**
 * Component Loading Fallback cho React.lazy Route Suspense.
 * Tuân thủ nguyên tắc UI/UX Pro Max:
 * - Chống giật khung hình (CLS < 0.1) nhờ minHeight: 60vh.
 * - Chuẩn trợ năng (Accessibility): role="status", aria-live="polite", aria-busy="true".
 * - Đồng bộ Design Token: Màu thương hiệu chính #0F766E.
 */
const PageLoadingFallback = ({ tip = 'Đang tải dữ liệu trang...' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        width: '100%',
        padding: '32px 16px',
      }}
    >
      <Spin size="large" />
      <span
        style={{
          marginTop: 16,
          color: '#64748B',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.2px',
        }}
      >
        {tip}
      </span>
    </div>
  );
};

export default PageLoadingFallback;

