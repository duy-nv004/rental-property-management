import { useState, useEffect } from 'react';
import { Row, Col, Card, Progress, Tag, Table, Button, Space, Spin, message } from 'antd';
import { 
  Users, Wallet, CheckCircle2, 
  PlusCircle, FileText, ArrowUpRight, MoreVertical 
} from 'lucide-react';
import axiosInstance from '../../utils/axios';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/stats');
      setData(res);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải dữ liệu thống kê quản trị!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu hệ thống..." />
      </div>
    );
  }

  // Phân tích dữ liệu từ API
  const { stats, packages, flagshipAssets, recentActivity } = data;

  const totalLandlords = packages.total || stats.landlordCount || 1;
  const proPercent = Math.round((packages.pro / totalLandlords) * 100) || 0;
  const basicPercent = Math.round((packages.basic / totalLandlords) * 100) || 0;
  const freePercent = Math.round((packages.free / totalLandlords) * 100) || 0;

  const columns = [
    { title: 'PROPERTY ASSET', dataIndex: 'name', key: 'name', render: (text) => <b>{text}</b> },
    { title: 'PRIMARY OWNER', dataIndex: 'owner', key: 'owner' },
    { title: 'STATUS', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'OPERATIONAL' ? 'green' : 'red'}>{status}</Tag> },
    { title: 'OCCUPANCY RATE', dataIndex: 'yield', key: 'yield', render: (rate) => <Tag color="blue">{rate}</Tag> },
    { title: 'ACTIONS', key: 'actions', render: () => <MoreVertical size={16} cursor="pointer" /> },
  ];

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Header Title */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1a3353', marginBottom: '4px' }}>Hệ thống Tổng quan</h1>
          <p style={{ color: '#8c8c8c', fontSize: '14px' }}>Số liệu giám sát thời gian thực toàn bộ danh mục tài sản và gói cước.</p>
        </div>
        <Button onClick={fetchStats} type="default">Làm mới dữ liệu</Button>
      </div>

      {/* Top 3 Stats Cards */}
      <Row gutter={[24, 24]}>
        {[
          { 
            title: 'TỔNG DOANH THU KỲ VỌNG', 
            value: `${Number(stats.totalRevenue).toLocaleString('vi-VN')} VNĐ`, 
            sub: 'Từ hóa đơn', 
            icon: <Wallet color="#1a3353" />, 
            color: 'green' 
          },
          { 
            title: 'CHỦ NHÀ ĐÃ XÁC THỰC', 
            value: stats.landlordCount, 
            sub: 'Đang hoạt động', 
            icon: <CheckCircle2 color="#1a3353" />, 
            color: 'blue' 
          },
          { 
            title: 'NGƯỜI DÙNG HỆ THỐNG', 
            value: stats.userCount, 
            sub: 'Toàn hệ thống', 
            icon: <Users color="#1a3353" />, 
            color: 'cyan' 
          },
        ].map((item, index) => (
          <Col span={8} key={index}>
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: '#f0f2f5', padding: '10px', borderRadius: '8px' }}>{item.icon}</div>
                <Tag color={item.color} style={{ borderRadius: '10px', border: 'none', fontWeight: 'bold' }}>{item.sub}</Tag>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: '600' }}>{item.title}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a3353', marginTop: '4px' }}>{item.value}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* Left Column: Package Tiering */}
        <Col span={16}>
          <Card title={<span style={{fontWeight: '700'}}>Thống kê Phân bổ Gói Cước</span>} extra={<Button type="link" size="small">Tải báo cáo</Button>} bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                <span>GÓI CHUYÊN NGHIỆP (PRO)</span><span style={{ color: '#1a3353' }}>{proPercent}% ({packages.pro} chủ nhà)</span>
              </div>
              <Progress percent={proPercent} strokeColor="#1a3353" showInfo={false} strokeWidth={10} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                <span>GÓI CƠ BẢN (BASIC)</span><span style={{ color: '#1a3353' }}>{basicPercent}% ({packages.basic} chủ nhà)</span>
              </div>
              <Progress percent={basicPercent} strokeColor="#40a9ff" showInfo={false} strokeWidth={10} />
            </div>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>
                <span>GÓI MIỄN PHÍ (FREE)</span><span style={{ color: '#1a3353' }}>{freePercent}% ({packages.free} chủ nhà)</span>
              </div>
              <Progress percent={freePercent} strokeColor="#d9d9d9" showInfo={false} strokeWidth={10} />
            </div>

            {/* Conversion Box */}
            <div style={{ background: '#f8faff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', border: '2px solid #e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#1890ff', marginRight: '16px' }}>{proPercent + basicPercent}%</div>
                <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>Tỷ lệ Chuyển đổi Trả phí</div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Tỷ lệ chủ nhà nâng cấp gói dịch vụ trả phí (Pro & Basic) giúp cải thiện doanh thu biên.</div>
                </div>
            </div>
          </Card>
        </Col>

        {/* Right Column: Recent Activity */}
        <Col span={8}>
          <Card title={<span style={{fontWeight: '700'}}>Hoạt Động Giao Dịch Gần Đây</span>} bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', height: '100%' }}>
            {recentActivity.length === 0 ? (
              <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '40px 0' }}>Chưa có hoạt động hóa đơn nào phát sinh</div>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} style={{ display: 'flex', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '8px', 
                    background: act.isPaid ? '#52c41a' : '#f5222d', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: '12px', 
                    flexShrink: 0 
                  }}>
                    {act.isPaid ? <CheckCircle2 size={16} color="white" /> : <FileText size={16} color="white" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{act.label}</div>
                    <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{act.sub}</div>
                    <div style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold', marginTop: '2px' }}>{act.time}</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Bottom Table */}
      <Card title={<span style={{fontWeight: '700'}}>Danh Sách Tòa Nhà Trực Thuộc Hệ Thống</span>} extra={<Space><Button size="small">Xuất CSV</Button></Space>} bordered={false} style={{ marginTop: '24px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <Table dataSource={flagshipAssets} columns={columns} pagination={false} size="middle" rowKey="id" />
      </Card>
    </div>
  );
};

export default Dashboard;