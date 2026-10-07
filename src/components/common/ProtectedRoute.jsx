import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

/**
 * Chặn truy cập trang theo vai trò đọc từ localStorage.
 *
 * Trước đây không có guard nào: gõ thẳng /admin/dashboard khi chưa đăng nhập vẫn
 * render được giao diện (dữ liệu thì API trả 401, nhưng người dùng thấy màn hình
 * trống thay vì được đưa về trang đăng nhập).
 *
 * Đây chỉ là lớp bảo vệ phía UI. Phân quyền thật vẫn nằm ở middleware `protect`
 * + `authorize` phía Backend — guard này không thay thế được chúng.
 */
const ProtectedRoute = ({ allow, children }) => {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allow && allow.length > 0 && !allow.includes(role)) {
    // Đã đăng nhập nhưng sai vai trò -> đưa về đúng khu vực của vai trò đó
    const homeByRole = {
      admin: "/admin/dashboard",
      landlord: "/landlord/dashboard",
      tenant: "/tenant/dashboard",
    };
    return <Navigate to={homeByRole[role] || "/login"} replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  allow: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
