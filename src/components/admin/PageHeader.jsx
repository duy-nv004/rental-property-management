import PropTypes from 'prop-types';
import { Button } from 'antd';
import { RefreshCw } from 'lucide-react';

/**
 * Component header tái sử dụng cho các trang Admin.
 * Hiển thị tiêu đề, mô tả và nút hành động tùy chọn.
 */
const PageHeader = ({ title, description, onRefresh, refreshLoading = false, extra }) => (
  <div className="page-header">
    <div className="page-header-main">
      <h1 className="page-header-title">{title}</h1>
      {description && <p className="page-header-desc">{description}</p>}
    </div>

    <div className="page-header-actions">
      {extra}
      {onRefresh && (
        <Button onClick={onRefresh} loading={refreshLoading} icon={<RefreshCw size={14} />}>
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
