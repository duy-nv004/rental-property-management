import { useState, useEffect } from 'react';
import { Avatar, Badge, Popover, Button, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Building2, Menu as MenuIcon } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { performLogout } from '../../utils/authSession';

const getNotificationTargetRoute = (notification, profilePath = '') => {
  const type = String(notification?.type || '').toLowerCase();
  const isTenant = String(profilePath).startsWith('/tenant') || localStorage.getItem('role') === 'tenant';

  if (isTenant) {
    if (type.includes('invoice') || type.includes('payment')) return '/tenant/invoices';
    if (type.includes('contract')) return '/tenant/contract';
    if (type.includes('support')) return '/tenant/support';
    if (type.includes('telegram')) return '/tenant/profile';
    return null;
  }

  if (type.includes('support')) return '/landlord/support';
  if (type.includes('invoice') || type.includes('payment')) return '/landlord/invoices';
  if (type.includes('contract')) return '/landlord/contracts';
  if (type.includes('plan')) return '/landlord/plans';
  if (type.includes('telegram')) return '/landlord/profile';
  return null;
};

// Header dùng chung: nút menu (mobile), chuông thông báo, khối người dùng
const AppHeader = ({ isMobile, onMenuClick, roleLabel, profilePath, withNotifications = true }) => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || roleLabel;
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await axiosInstance.get('/notifications');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setNotifications(list);
    } catch (err) {
      console.error('Lỗi lấy thông báo:', err);
    }
  };

  useEffect(() => {
    if (!withNotifications) return undefined;
    fetchNotifications();
    // Tự động kiểm tra thông báo mới mỗi 30 giây
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [withNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id) => {
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markRead(item.id);
    }
    const targetRoute = getNotificationTargetRoute(item, profilePath);
    if (targetRoute) {
      setOpen(false);
      navigate(targetRoute);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    performLogout(axiosInstance, navigate);
  };

  const panel = (
    <div style={{ width: 340, maxWidth: 'calc(100vw - 32px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #EEF2F6', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Thông báo</span>
        {unreadCount > 0 && <Button type="link" size="small" onClick={markAllRead}>Đánh dấu đã đọc</Button>}
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {notifications.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo nào" />
        ) : (
          notifications.map((item) => (
            <button key={item.id} type="button" className={`notif-item${item.isRead ? '' : ' unread'}`} onClick={() => handleNotificationClick(item)}>
              <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A' }}>
                {!item.isRead && <span aria-label="Chưa đọc" style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F766E', flexShrink: 0 }} />}
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 2, lineHeight: 1.45 }}>{item.content}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <header className="app-header">
      {isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onMenuClick && (
            <button type="button" className="icon-btn" aria-label="Mở menu" onClick={onMenuClick}>
              <MenuIcon size={22} />
            </button>
          )}
          <div className="app-brand-mark" style={{ width: 32, height: 32 }}><Building2 size={16} aria-hidden="true" /></div>
          <span className="app-brand-name" style={{ fontSize: 15 }}>HomeSync</span>
        </div>
      ) : (
        <span className="app-header-greeting">Chào mừng trở lại, <b>{username}</b></span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {withNotifications && (
          <Popover content={panel} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight" arrow={false}>
            <button type="button" className="icon-btn" aria-label={`Thông báo, ${unreadCount} chưa đọc`}>
              <Badge count={unreadCount} overflowCount={99} size="small">
                <Bell size={20} />
              </Badge>
            </button>
          </Popover>
        )}

        <button type="button" className="app-user" onClick={() => profilePath && navigate(profilePath)} aria-label="Hồ sơ cá nhân">
          {!isMobile && (
            <span>
              <div className="app-user-name">{username}</div>
              <div className="app-user-role">{roleLabel}</div>
            </span>
          )}
          <Avatar size={36} style={{ background: '#CCFBF1', color: '#0F766E', fontWeight: 700 }}>
            {username.trim().charAt(0).toUpperCase()}
          </Avatar>
        </button>

        {isMobile && (
          <button type="button" className="icon-btn danger" aria-label="Đăng xuất" onClick={logout}>
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
