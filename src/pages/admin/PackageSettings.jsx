import { useState, useEffect } from 'react';
import { Row, Col, Card, InputNumber, Button, Form, Radio, message, Spin, Tag, Grid } from 'antd';
import { ShieldCheck, Cpu, Save } from 'lucide-react';
import PropTypes from 'prop-types';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const TIERS = {
  free: { tier: 'Tier 01', color: '#475569', title: 'Gói Miễn phí' },
  basic: { tier: 'Tier 02', color: '#0F766E', title: 'Gói Cơ bản (Basic)' },
  pro: { tier: 'Tier 03', color: '#0369A1', title: 'Gói Chuyên nghiệp (Pro)' },
};

const PackageCard = ({ plan, onSave }) => {
  const [form] = Form.useForm();
  const [aiLimitType, setAiLimitType] = useState(plan.maxAICallsPerMonth === -1 ? 'unlimited' : 'limited');
  const [submitLoading, setSubmitLoading] = useState(false);
  const isPhone = !Grid.useBreakpoint().md;

  useEffect(() => {
    form.setFieldsValue({
      price: Number(plan.price),
      annualPrice: Number(plan.annualPrice),
      maxBuildings: plan.maxBuildings,
      maxRoomsPerBuilding: plan.maxRoomsPerBuilding,
      maxAICallsPerMonth: plan.maxAICallsPerMonth === -1 ? 30 : plan.maxAICallsPerMonth
    });
    setAiLimitType(plan.maxAICallsPerMonth === -1 ? 'unlimited' : 'limited');
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const details = TIERS[plan.name] || { tier: 'Tier', color: '#475569', title: plan.name.toUpperCase() };
  const featured = plan.name === 'basic';
  const isFree = plan.name === 'free';
  const numberInput = (min) => <InputNumber min={min} style={{ width: '100%' }} />;
  // Giá VND: bước 1000đ, có dấu phân cách hàng nghìn. Gói Free luôn 0đ nên khóa ô giá.
  const priceInput = (
    <InputNumber
      min={0}
      step={1000}
      precision={0}
      disabled={isFree}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
      parser={(v) => (v || '').replace(/\./g, '')}
      style={{ width: '100%' }}
    />
  );

  return (
    <Card style={{ height: '100%', position: 'relative', border: featured ? '2px solid #0F766E' : undefined }}>
      {featured && (
        <Tag color="#0F766E" style={{ position: 'absolute', top: -12, right: 20, fontWeight: 600 }}>Phổ biến</Tag>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: details.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{details.tier}</div>
          <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{details.title}</h2>
        </div>
        <div className="stat-icon" style={{ background: details.color + '14', color: details.color }} aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
      </div>

      <Form form={form} name={`plan-${plan.id}`} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="price" label="Giá tháng (VND)" rules={[{ required: true, message: 'Bắt buộc' }]}>{priceInput}</Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="annualPrice" label="Giá năm (VND)" rules={[{ required: true, message: 'Bắt buộc' }]}>{priceInput}</Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="maxBuildings" label="Tối đa tòa nhà" rules={[{ required: true, message: 'Bắt buộc' }]}>{numberInput(1)}</Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="maxRoomsPerBuilding" label="Tối đa phòng / tòa" rules={[{ required: true, message: 'Bắt buộc' }]}>{numberInput(1)}</Form.Item>
          </Col>
        </Row>

        <div style={{ marginBottom: 20, background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #EEF2F6' }}>
          <div id={`ai-limit-${plan.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={16} color="#0F766E" aria-hidden="true" /> Giới hạn AI quét chỉ số
          </div>
          <Radio.Group
            aria-labelledby={`ai-limit-${plan.id}`}
            value={aiLimitType}
            onChange={(e) => setAiLimitType(e.target.value)}
            style={{ marginBottom: aiLimitType === 'limited' ? 12 : 0 }}
          >
            <Radio value="unlimited">Không giới hạn</Radio>
            <Radio value="limited">Giới hạn</Radio>
          </Radio.Group>

          {aiLimitType === 'limited' && (
            <Form.Item
              name="maxAICallsPerMonth"
              label="Số lượt quét / tháng"
              rules={[{ required: true, message: 'Nhập số lượt quét!' }]}
              style={{ marginBottom: 0 }}
            >
              {numberInput(0)}
            </Form.Item>
          )}
        </div>

        <Button type={featured ? 'primary' : 'default'} htmlType="submit" loading={submitLoading} icon={<Save size={16} />} block size={isPhone ? 'large' : 'middle'}>
          Lưu thay đổi
        </Button>
      </Form>
    </Card>
  );
};

PackageCard.propTypes = {
  plan: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    annualPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxBuildings: PropTypes.number,
    maxRoomsPerBuilding: PropTypes.number,
    maxAICallsPerMonth: PropTypes.number,
  }),
  onSave: PropTypes.func,
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
      <PageHeader
        title="Cấu hình gói dịch vụ"
        description="Điều chỉnh giá và giới hạn vận hành (tòa nhà, số phòng, lượt AI) của từng gói cước."
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[20, 24]}>
          {plans.map(plan => (
            <Col xs={24} md={12} xl={8} key={plan.id}>
              <PackageCard plan={plan} onSave={handleSavePlan} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default PackageSettings;
