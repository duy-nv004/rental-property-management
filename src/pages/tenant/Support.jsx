import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Tag, Spin, List, Alert, message, Row, Col, Upload, Image } from 'antd';
import { Wrench, Clock, CheckCircle2, AlertCircle, History, ImagePlus } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SupportImage from '../../components/common/SupportImage';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';

const { TextArea } = Input;

// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_LABELS = {
  electric: 'Điện',
  water: 'Nước',
  furniture: 'Nội thất',
  appliance: 'Thiết bị',
  internet: 'Internet',
  other: 'Khác',
};


const TenantSupport = () => {
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [form] = Form.useForm();

  // Khách thuê nhiều phòng phải chọn phòng gặp sự cố (backend trả 400 nếu thiếu)
  useEffect(() => {
    axiosInstance.get('/tenant/summary')
      .then((data) => {
        const rooms = (data?.contracts || []).filter((c) => c.status === 'active' && c.roomId);
        setActiveRooms(rooms);
      })
      .catch((err) => console.error('Error fetching tenant rooms:', err));
  }, []);

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

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchSupportRequests(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  });

  const onFinish = async (values) => {
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', values.description);
      formData.append('severity', values.severity);
      formData.append('category', values.category);
      if (values.roomId) formData.append('roomId', values.roomId);
      (values.images || []).forEach((f) => f.originFileObj && formData.append('images', f.originFileObj));
      // axiosInstance mặc định ép Content-Type JSON, phải ghi đè để FormData không bị đổi sang JSON
      const response = await axiosInstance.post('/tenant/support', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
        return <Tag color="warning" className="tag-flat" icon={<Clock size={12} aria-hidden="true" />}>Chờ duyệt</Tag>;
      case 'in_progress':
        return <Tag color="processing" className="tag-flat" icon={<Wrench size={12} aria-hidden="true" />}>Đang xử lý</Tag>;
      case 'resolved':
        return <Tag color="success" className="tag-flat" icon={<CheckCircle2 size={12} aria-hidden="true" />}>Đã giải quyết</Tag>;
      default:
        return <Tag className="tag-flat">{status}</Tag>;
    }
  };

  const getSeverityTag = (severity) => {
    switch (severity) {
      case 'low':
        return <Tag color="default" className="tag-flat">Thông thường</Tag>;
      case 'medium':
        return <Tag color="blue" className="tag-flat">Khá nghiêm trọng</Tag>;
      case 'high':
        return <Tag color="error" className="tag-flat" icon={<AlertCircle size={12} aria-hidden="true" />}>Khẩn cấp</Tag>;
      default:
        return <Tag className="tag-flat">{severity}</Tag>;
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải danh sách sự cố..." />
      </div>
    );
  }

  return (
    <div className="page-shell page-shell-wide tenant-page">
      <PageHeader
        title="Báo sự cố & Sửa chữa"
        description="Gửi thông báo hỏng hóc thiết bị, điện nước trong phòng để chủ nhà xử lý kịp thời."
      />

      <Row gutter={[20, 20]}>

        {/* CỘT 1: FORM BÁO HỎNG MỚI */}
        <Col xs={24} xl={10}>
          <Card
            variant="borderless"
            className="stat-card"
            title={<span className="card-title"><Wrench size={18} color="#0F766E" aria-hidden="true" /> Báo sự cố mới</span>}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              initialValues={{ severity: 'medium', category: 'other' }}
            >
              {activeRooms.length > 1 && (
                <Form.Item
                  name="roomId"
                  label="Phòng gặp sự cố"
                  rules={[{ required: true, message: 'Vui lòng chọn phòng gặp sự cố!' }]}
                >
                  <Select
                    size="large"
                    placeholder="Chọn phòng"
                    options={activeRooms.map((c) => ({
                      value: c.roomId,
                      label: `Phòng ${c.roomNumber}${c.buildingName ? ` - ${c.buildingName}` : ''}`,
                    }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="description"
                label="Mô tả sự cố"
                rules={[{ required: true, message: 'Vui lòng mô tả chi tiết sự cố!' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Ví dụ: Bóng đèn nhà tắm bị hỏng nhấp nháy, vòi hoa sen bị rò nước yếu..."
                />
              </Form.Item>

              <Form.Item name="category" label="Loại sự cố">
                <Select size="large" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
              </Form.Item>

              <Form.Item
                name="images"
                label="Ảnh minh họa (tối đa 2 ảnh, mỗi ảnh ≤ 5MB)"
                valuePropName="fileList"
                getValueFromEvent={(e) => e?.fileList}
              >
                <Upload listType="picture-card" beforeUpload={() => false} maxCount={2} accept="image/jpeg,image/png,image/webp">
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <ImagePlus size={18} aria-hidden="true" /> Thêm ảnh
                  </span>
                </Upload>
              </Form.Item>

              <Form.Item name="severity" label="Mức độ khẩn cấp">
                <Select size="large">
                  <Select.Option value="low">Thông thường (Sửa trong vài ngày)</Select.Option>
                  <Select.Option value="medium">Khá nghiêm trọng (Sửa trong 24-48h)</Select.Option>
                  <Select.Option value="high">Khẩn cấp (Cần xử lý ngay lập tức)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" size="large" loading={submitLoading} block className="btn-dark">
                  Gửi yêu cầu hỗ trợ
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* CỘT 2: LỊCH SỬ BÁO SỰ CỐ */}
        <Col xs={24} xl={14}>
          <Card
            variant="borderless"
            className="stat-card"
            title={<span className="card-title"><History size={18} color="#0F766E" aria-hidden="true" /> Lịch sử yêu cầu sửa chữa</span>}
          >
            {requests.length === 0 ? (
              <Alert
                message="Chưa có báo cáo sự cố nào"
                description="Lịch sử các sự cố bạn báo cáo sẽ hiển thị tại đây để bạn tiện theo dõi tiến độ xử lý của chủ nhà."
                type="info"
                showIcon
              />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={requests}
                renderItem={(item) => (
                  <List.Item className="support-item">
                    <div className="support-main">
                      <div className="support-head">
                        <div className="support-meta">
                          <span>#{item.id}</span>
                          <span aria-hidden="true">•</span>
                          {item.room && (
                            <>
                              <span>Phòng {item.room.roomNumber}{item.room.building?.name ? ` - ${item.room.building.name}` : ''}</span>
                              <span aria-hidden="true">•</span>
                            </>
                          )}
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                        <div className="support-tags">
                          <Tag className="tag-flat">{CATEGORY_LABELS[item.category] || 'Khác'}</Tag>
                          {getSeverityTag(item.severity)}
                          {getStatusTag(item.status)}
                        </div>
                      </div>
                      <div className="support-desc">{item.description}</div>
                      {item.images?.length > 0 && (
                        <Image.PreviewGroup>
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {item.images.map((src) => (
                              <SupportImage key={src} requestId={item.id} path={src} width={64} />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      )}
                      {(item.landlordNote || item.repairCost != null) && (
                        <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
                          {item.landlordNote && <div>Phản hồi của chủ nhà: {item.landlordNote}</div>}
                          {item.repairCost != null && <div>Chi phí sửa: {Number(item.repairCost).toLocaleString('vi-VN')} đ</div>}
                        </div>
                      )}
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
