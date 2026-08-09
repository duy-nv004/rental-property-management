import { useState, useEffect } from 'react';
import { Row, Col, Card, InputNumber, Button, Switch, Tag, Form, Radio, message, Spin, Space } from 'antd';
import { ShieldCheck, Cpu, ArrowUpRight, Save } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const PackageCard = ({ plan, onSave }) => {
  const [form] = Form.useForm();
  const [aiLimitType, setAiLimitType] = useState(plan.maxAICallsPerMonth === -1 ? 'unlimited' : 'limited');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      price: plan.price,
      annualPrice: plan.annualPrice,
      maxBuildings: plan.maxBuildings,
      maxRoomsPerBuilding: plan.maxRoomsPerBuilding,
      maxAICallsPerMonth: plan.maxAICallsPerMonth === -1 ? 30 : plan.maxAICallsPerMonth
    });
    setAiLimitType(plan.maxAICallsPerMonth === -1 ? 'unlimited' : 'limited');
  }, [plan]);

  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const payload = {
        price: values.price,
        annualPrice: values.annualPrice,
        maxBuildings: values.maxBuildings,
        maxRoomsPerBuilding: values.maxRoomsPerBuilding,
        maxAICallsPerMonth: aiLimitType === 'unlimited' ? -1 : values.maxAICallsPerMonth
      };
      await onSave(plan.id, payload);
      message.success(`Đã cập nhật cấu hình gói ${plan.name.toUpperCase()} thành công!`);
    } catch (err) {
      console.error(err);
      message.error(`Không thể cập nhật cấu hình gói ${plan.name.toUpperCase()}.`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getTierDetails = (name) => {
    switch (name) {
      case 'free':
        return { tier: 'TIER 01', color: '#64748b', title: 'Gói Miễn Phí' };
      case 'basic':
        return { tier: 'TIER 02', color: '#10b981', title: 'Gói Cơ Bản (Basic)' };
      case 'pro':
        return { tier: 'TIER 03', color: '#6366f1', title: 'Gói Chuyên Nghiệp (Pro)' };
      default:
        return { tier: 'TIER XX', color: '#64748b', title: name.toUpperCase() };
    }
  };

  const details = getTierDetails(plan.name);

  return (
    <Card 
      style={{ borderRadius: '16px', border: plan.name === 'basic' ? '2px solid #10b981' : '1px solid #e2e8f0', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
      bodyStyle={{ padding: '24px' }}
    >
      {plan.name === 'basic' && (
        <Tag color="#10b981" style={{ position: 'absolute', top: -12, right: 20, borderRadius: '4px', fontWeight: 'bold' }}>
          PHỔ BIẾN
        </Tag>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '10px', color: details.color, fontWeight: 'bold', letterSpacing: '1px' }}>{details.tier}</div>
          <h2 style={{ margin: 0, color: '#1a3353', fontWeight: '800' }}>{details.title}</h2>
        </div>
        <ShieldCheck size={24} color={details.color} />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="price"
              label={<span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>GIÁ THÁNG (USD)</span>}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="annualPrice"
              label={<span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>GIÁ NĂM (USD)</span>}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="maxBuildings"
              label={<span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MAX TÒA NHÀ</span>}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxRoomsPerBuilding"
              label={<span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MAX PHÒNG / TÒA</span>}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* CẤU HÌNH AI LIMIT */}
        <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={14} color="#6366f1" />
            GIỚI HẠN AI QUÉT CHỈ SỐ
          </div>
          
          <Radio.Group 
            value={aiLimitType} 
            onChange={(e) => setAiLimitType(e.target.value)}
            style={{ marginBottom: '12px' }}
          >
            <Radio value="unlimited">Không giới hạn</Radio>
            <Radio value="limited">Giới hạn quét</Radio>
          </Radio.Group>

          {aiLimitType === 'limited' && (
            <Form.Item
              name="maxAICallsPerMonth"
              label={<span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>SỐ LƯỢT QUÉT / THÁNG</span>}
              rules={[{ required: true, message: 'Nhập số lượt quét!' }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} />
            </Form.Item>
          )}
        </div>

        <Button 
          type="primary" 
          htmlType="submit"
          loading={submitLoading}
          icon={<Save size={16} />}
          block 
          style={{ height: '40px', borderRadius: '8px', background: plan.name === 'basic' ? '#10b981' : '#1a3353', border: 'none', fontWeight: 'bold' }}
        >
          Lưu Thay Đổi
        </Button>
      </Form>
    </Card>
  );
};

const PackageSettings = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      const data = await axiosInstance.get('/admin/plans');
      setPlans(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải thông tin cấu hình các gói cước.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (id, payload) => {
    await axiosInstance.put(`/admin/plans/${id}`, payload);
    fetchPlans(); // Tải lại dữ liệu mới nhất
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Hệ Thống  •  Gói Cước</div>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Cấu hình các Gói dịch vụ SaaS</h1>
        <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>Điều chỉnh giá cả và giới hạn vận hành (tòa nhà, số phòng, số lượt AI) của từng gói cước.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Spin size="large" tip="Đang tải dữ liệu cấu hình các gói..." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {plans.map(plan => (
            <Col xs={24} md={8} key={plan.id}>
              <PackageCard plan={plan} onSave={handleSavePlan} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default PackageSettings;