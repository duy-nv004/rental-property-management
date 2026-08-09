import { useState, useEffect } from 'react';
import { Avatar, Space, Badge, Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Building, Menu as MenuIcon } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const LandlordHeader = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const username = localStorage.getItem('username') || 'Chủ nhà';
  
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MenuIcon 
            size={24} 
            color="#0f172a" 
            style={{ cursor: 'pointer' }} 
            onClick={onMenuClick} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#0f172a', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Building size={16} color="#38bdf8" />
            </div>
            <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', letterSpacing: '0.5px' }}>EXECUTIVE LENS</span>
          </div>
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

        <Space style={{ cursor: 'pointer' }} onClick={() => navigate('/landlord/profile')}>
          <div style={{ textAlign: 'right', lineHeight: '1.2', display: isMobile ? 'none' : 'block' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{username}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Chủ nhà</div>
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
  );
};

export default LandlordHeader;
