import PropTypes from 'prop-types';
import { Button } from 'antd';
import { RefreshCw } from 'lucide-react';

/**
 * Component header tái sử dụng cho các trang Admin.
 * Hiển thị tiêu đề, mô tả và nút hành động tùy chọn.
 */
const PageHeader = ({ title, description, onRefresh, refreshLoading = false, extra }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
  }}>
    <div>
      <h1 style={{
        fontSize: '26px',
        fontWeight: '800',
        color: '#0f172a',
        margin: '0 0 6px 0',
        letterSpacing: '-0.5px',
      }}>
        {title}
      </h1>
      {description && (
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
          {description}
        </p>
      )}
    </div>

    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
      {extra}
      {onRefresh && (
        <Button
          onClick={onRefresh}
          loading={refreshLoading}
          icon={<RefreshCw size={14} />}
          style={{
            borderRadius: '8px',
            height: '38px',
            fontWeight: '600',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Làm mới
        </Button>
      )}
    </div>
  </div>
);

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  onRefresh: PropTypes.func,
  refreshLoading: PropTypes.bool,
  extra: PropTypes.node,
};

export default PageHeader;
