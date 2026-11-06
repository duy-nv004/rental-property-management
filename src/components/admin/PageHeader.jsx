import PropTypes from 'prop-types';

/**
 * Component header tái sử dụng cho các trang Admin & Landlord.
 * Hiển thị tiêu đề, mô tả và nội dung mở rộng (bộ lọc, nút tạo mới...).
 */
const PageHeader = ({ title, description, extra }) => (
  <div className="page-header">
    <div className="page-header-main">
      <h1 className="page-header-title">{title}</h1>
      {description && <p className="page-header-desc">{description}</p>}
    </div>

    {extra && (
      <div className="page-header-actions">
        {extra}
      </div>
    )}
  </div>
);

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  extra: PropTypes.node,
};

export default PageHeader;
