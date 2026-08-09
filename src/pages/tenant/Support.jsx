import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Tag, Spin, List, Alert, message, Timeline, Row, Col } from 'antd';
import { Wrench, ShieldAlert, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const { TextArea } = Input;

const TenantSupport = () => {
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [form] = Form.useForm();

  const fetchSupportRequests = async () => {
    try {
      const data = await axiosInstance.get('/tenant/support');
      setRequests(data);
    } catch (err) {
      console.error('Error fetching support requests:', err);
      message.error('Không thể tải lịch sử báo sự cố.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportRequests();
  }, []);

  const onFinish = async (values) => {
    setSubmitLoading(true);
    try {
      const response = await axiosInstance.post('/tenant/support', {
        description: values.description,
        severity: values.severity,
      });
      message.success(response.message || 'Gửi sự cố thành công!');
      form.resetFields();
      // Reload danh sách
      fetchSupportRequests();
    } catch (err) {
      console.error('Error submitting support request:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="warning" icon={<Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}>Chờ duyệt</Tag>;
      case 'in_progress':
        return <Tag color="processing" icon={<Wrench size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}>Đang xử lý</Tag>;
      case 'resolved':
        return <Tag color="success" icon={<CheckCircle2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}>Đã giải quyết</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getSeverityTag = (severity) => {
    switch (severity) {
      case 'low':
        return <Tag color="default">Thông thường</Tag>;
      case 'medium':
        return <Tag color="blue">Khá nghiêm trọng</Tag>;
      case 'high':
        return <Tag color="error" icon={<AlertCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}>Khẩn cấp</Tag>;
      default:
        return <Tag>{severity}</Tag>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách sự cố..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Báo sự cố & Sửa chữa</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Gửi thông báo hỏng hóc thiết bị, điện nước trong phòng để chủ nhà xử lý kịp thời.</p>
      </div>

      <Row gutter={[20, 20]}>
        
        {/* CỘT 1: FORM BÁO HỎNG MỚI */}
        <Col xs={24} md={10}>
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '15px' }}>Báo sự cố mới</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              initialValues={{ severity: 'medium' }}
            >
              <Form.Item
                name="description"
                label={<span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Mô tả sự cố</span>}
                rules={[{ required: true, message: 'Vui lòng mô tả chi tiết sự cố!' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Ví dụ: Bóng đèn nhà tắm bị hỏng nhấp nháy, vòi hoa sen bị rò nước yếu..." 
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="severity"
                label={<span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Mức độ khẩn cấp</span>}
              >
                <Select style={{ borderRadius: '8px' }}>
                  <Select.Option value="low">Thông thường (Sửa trong vài ngày)</Select.Option>
                  <Select.Option value="medium">Khá nghiêm trọng (Sửa trong 24-48h)</Select.Option>
                  <Select.Option value="high">Khẩn cấp (Cần xử lý ngay lập tức)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={submitLoading}
                  block
                  style={{
                    height: '44px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: 'none',
                    fontWeight: '700',
                  }}
                >
                  Gửi yêu cầu hỗ trợ
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* CỘT 2: LỊCH SỬ BÁO SỰ CỐ */}
        <Col xs={24} md={14}>
          <Card 
            title={<span style={{ fontWeight: '800', fontSize: '15px' }}>Lịch sử yêu cầu sửa chữa</span>} 
            bordered={false} 
            style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
          >
            {requests.length === 0 ? (
              <Alert 
                message="Chưa có báo cáo sự cố nào"
                description="Lịch sử các sự cố bạn báo cáo sẽ hiển thị tại đây để bạn tiện theo dõi tiến độ xử lý của chủ nhà."
                type="info"
                showIcon
                style={{ borderRadius: '8px' }}
              />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={requests}
                renderItem={(item) => (
                  <List.Item style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{item.id}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', margin: '0 8px' }}>•</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {getSeverityTag(item.severity)}
                          {getStatusTag(item.status)}
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#0f172a', 
                        fontWeight: '500', 
                        background: '#f8fafc', 
                        padding: '12px', 
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9'
                      }}>
                        {item.description}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

      </Row>

    </div>
  );
};

export default TenantSupport;
