import { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, message, Spin, Alert, Popconfirm } from 'antd';
import { Wrench, CheckCircle2, Play, Calendar, AlertTriangle } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const SupportManager = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get('/manage/support-requests');
      setRequests(data);
    } catch (err) {
      console.error('Error fetching support requests:', err);
      message.error('Không thể tải danh sách báo cáo sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosInstance.put(`/manage/support-requests/${id}`, { status });
      message.success('Cập nhật trạng thái sự cố thành công!');
      fetchRequests();
    } catch (err) {
      console.error('Error updating support request:', err);
      const errMsg = err.response?.data?.message || 'Không thể cập nhật trạng thái sự cố.';
      message.error(errMsg);
    }
  };

  const getSeverityTag = (severity) => {
    switch (severity) {
      case 'high':
        return <Tag color="error" style={{ fontWeight: 'bold' }}>Nghiêm trọng</Tag>;
      case 'medium':
        return <Tag color="warning" style={{ fontWeight: 'bold' }}>Trung bình</Tag>;
      case 'low':
        return <Tag color="blue" style={{ fontWeight: 'bold' }}>Thấp</Tag>;
      default:
        return <Tag>{severity}</Tag>;
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="default" style={{ fontWeight: 'bold' }}>Chờ xử lý</Tag>;
      case 'in_progress':
        return <Tag color="processing" style={{ fontWeight: 'bold' }}>Đang sửa chữa</Tag>;
      case 'resolved':
        return <Tag color="success" style={{ fontWeight: 'bold' }}>Đã khắc phục</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    { 
      title: 'MÃ SỰ CỐ', 
      dataIndex: 'id', 
      key: 'id',
      render: (text) => <b>#{text}</b> 
    },
    { 
      title: 'PHÒNG TRỌ', 
      dataIndex: ['room', 'roomNumber'], 
      key: 'roomNumber',
      render: (text, record) => (
        <div>
          <strong>Phòng {text}</strong>
          <br />
          <small style={{ color: '#8c8c8c' }}>{record.room?.building?.name}</small>
        </div>
      )
    },
    { 
      title: 'MÔ TẢ SỰ CỐ', 
      dataIndex: 'description', 
      key: 'description',
      width: '35%'
    },
    { 
      title: 'MỨC ĐỘ', 
      dataIndex: 'severity', 
      key: 'severity',
      render: (sev) => getSeverityTag(sev)
    },
    { 
      title: 'THỜI GIAN BÁO', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => (
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {new Date(date).toLocaleDateString('vi-VN')} {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    { 
      title: 'TRẠNG THÁI', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'THAO TÁC XỬ LÝ',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<Play size={12} />}
              style={{ background: '#1890ff', border: 'none', borderRadius: '6px' }}
              onClick={() => handleUpdateStatus(record.id, 'in_progress')}
            >
              Tiến hành sửa
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircle2 size={12} />}
              style={{ background: '#52c41a', border: 'none', borderRadius: '6px' }}
              onClick={() => handleUpdateStatus(record.id, 'resolved')}
            >
              Hoàn thành
            </Button>
          )}
          {record.status === 'resolved' && (
            <span style={{ color: '#52c41a', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> Xong
            </span>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Hỗ Trợ  •  Sự Cố</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Xử lý sự cố báo hỏng</h1>
          <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>Theo dõi và cập nhật tiến độ khắc phục các báo hỏng cơ sở vật chất từ khách thuê.</p>
        </div>
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        title={<Space><Wrench size={18} color="#1a3353" /> Danh sách sự cố cần khắc phục</Space>}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="Đang tải danh sách báo hỏng..." />
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={requests} 
            rowKey="id" 
            pagination={{ pageSize: 8 }}
            scroll={{ x: true }}
          />
        )}
      </Card>
    </div>
  );
};

export default SupportManager;
