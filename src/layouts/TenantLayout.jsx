import { useState, useEffect } from 'react';
import { Layout, Avatar, Space, Badge, Popover } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, FileSignature, 
  Wrench, User, Bell, LogOut, Building 
} from 'lucide-react';
import TenantSidebar from './partials/TenantSidebar';
import axiosInstance from '../utils/axios';

const { Sider, Content } = Layout;

const TenantLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const username = localStorage.getItem('username') || 'Người thuê';
  
  const [notifications, setNotifications] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await axiosInstance.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error("Lỗi lấy thông báo:", err);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    fetchNotifications();
    // Tự động kiểm tra thông báo mới mỗi 30 giây
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { path: '/tenant/dashboard', icon: <LayoutDashboard size={20} />, label: 'Trang chủ' },
    { path: '/tenant/invoices', icon: <FileText size={20} />, label: 'Hóa đơn' },
    { path: '/tenant/contract', icon: <FileSignature size={20} />, label: 'Hợp đồng' },
    { path: '/tenant/support', icon: <Wrench size={20} />, label: 'Báo sự cố' },
    { path: '/tenant/profile', icon: <User size={20} />, label: 'Cá nhân' },
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const notificationContent = (
    <div style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold' }}>Thông báo</span>
        {unreadCount > 0 && (
          <span 
            style={{ color: '#1677ff', cursor: 'pointer', fontSize: '12px' }}
            onClick={handleMarkAllRead}
          >
            Đọc tất cả
          </span>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#8c8c8c' }}>
          Không có thông báo nào
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleMarkAsRead(item.id)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: item.isRead ? 'transparent' : '#f0f7ff',
                cursor: 'pointer',
                transition: 'background 0.2s',
                position: 'relative',
                borderBottom: '1px solid #f8f9fa'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1f1f1f' }}>
                {!item.isRead && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4d4f' }} />}
                {item.title}
              </div>
              <div style={{ fontSize: '12px', color: '#595959', marginTop: '4px', lineHeight: '1.4' }}>
                {item.content}
              </div>
              <div style={{ fontSize: '10px', color: '#bfbfbf', marginTop: '4px' }}>
                {new Date(item.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 1. DESKTOP SIDEBAR */}
      {!isMobile && (
        <Sider width={260} theme="light" style={{ position: 'fixed', height: '100vh', left: 0, zIndex: 100 }}>
          <TenantSidebar />
        </Sider>
      )}

      {/* 2. MAIN LAYOUT CONTAINER */}
      <Layout style={{ marginLeft: isMobile ? 0 : 260, background: '#f8f9fa', minHeight: '100vh' }}>
        
        {/* TOP HEADER */}
        <div style={{
          height: '64px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 99
        }}>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#0f172a', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Building size={16} color="#38bdf8" />
              </div>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', letterSpacing: '0.5px' }}>EXECUTIVE LENS</span>
            </div>
          ) : (
            <span style={{ color: '#64748b', fontSize: '14px' }}>Chào mừng trở lại!</span>
          )}

          <Space size={16}>
            <Popover
              content={notificationContent}
              trigger="click"
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              placement="bottomRight"
            >
              <Badge count={unreadCount} overflowCount={99} size="small" style={{ cursor: 'pointer' }}>
                <Bell size={20} color="#64748b" style={{ cursor: 'pointer' }} />
              </Badge>
            </Popover>

            <Space style={{ cursor: 'pointer' }} onClick={() => navigate('/tenant/profile')}>
              <div style={{ textAlign: 'right', lineHeight: '1.2', display: isMobile ? 'none' : 'block' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{username}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Thành viên</div>
              </div>
              <Avatar 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`} 
                size="medium" 
                style={{ border: '2px solid #e2e8f0', background: '#f1f5f9' }}
              />
            </Space>
            {isMobile && (
              <LogOut 
                size={20} 
                color="#ef4444" 
                style={{ cursor: 'pointer', marginLeft: '4px' }} 
                onClick={() => {
                  localStorage.clear();
                  navigate('/login');
                }}
              />
            )}
          </Space>
        </div>

        {/* PAGE CONTENT */}
        <Content style={{ 
          padding: isMobile ? '16px' : '24px', 
          background: '#f8f9fa',
          paddingBottom: isMobile ? '80px' : '24px' // Thừa khoảng trống để tránh đè Bottom Nav
        }}>
          <Outlet />
        </Content>

        {/* 3. MOBILE BOTTOM NAVIGATION */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 100,
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
            paddingBottom: 'safe-area-inset-bottom'
          }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flex: 1,
                    height: '100%',
                    color: isActive ? '#0f172a' : '#94a3b8',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <div style={{ 
                    color: isActive ? '#0f172a' : '#94a3b8',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s ease'
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    marginTop: '4px',
                    fontWeight: isActive ? '700' : '500' 
                  }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Layout>
    </Layout>
  );
};

export default TenantLayout;
