import { Input, Badge, Avatar, Space } from 'antd';
import { Search, Bell, HelpCircle } from 'lucide-react';

const AdminHeader = () => (
  <div style={{ height: '64px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
    <Input 
      prefix={<Search size={18} color="#bfbfbf" />} 
      placeholder="Search portfolio..." 
      style={{ width: 300, borderRadius: '8px', background: '#f5f5f5', border: 'none' }}
    />
    <Space size={24}>
      <Badge dot color="red"><Bell size={20} color="#595959" /></Badge>
      <HelpCircle size={20} color="#595959" />
      <Space>
        <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Admin User</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>System Manager</div>
        </div>
        <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" size="large" />
      </Space>
    </Space>
  </div>
);
export default AdminHeader;