import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Tag, Spin, message, Alert } from 'antd';
import { ShieldCheck, Cpu, ArrowUpRight, CheckCircle2, Landmark } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await axiosInstance.get('/auth/plans');
      setPlans(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải thông tin gói cước.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setSubmitLoading(true);
    try {
      const response = await axiosInstance.post('/auth/upgrade-request', {
        planName: selectedPlan.name
      });
      message.success(response.message);
      
      // Cập nhật lại thông tin user trong localStorage để đồng bộ phân quyền lập tức
      const updatedUser = { ...user, plan: response.user.plan };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Kích hoạt sự kiện để Sidebar & Header cập nhật tức thì
      window.dispatchEvent(new Event('storage'));
      
      setPaymentModalVisible(false);
      fetchPlans();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi nâng cấp gói cước.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getPlanDetails = (name) => {
    switch (name) {
      case 'free':
        return { color: '#64748b', title: 'GÓI MIỄN PHÍ', features: ['Quản lý tối đa 1 tòa nhà', 'Giới hạn 5 phòng mỗi tòa nhà', 'Nhập chỉ số điện nước thủ công', 'Không hỗ trợ AI đọc số'] };
      case 'basic':
        return { color: '#10b981', title: 'GÓI CƠ BẢN (BASIC)', features: ['Quản lý tối đa 5 tòa nhà', 'Giới hạn 20 phòng mỗi tòa nhà', 'Quét số điện nước tự động bằng AI', 'Tự động đồng bộ báo cước Telegram'] };
      case 'pro':
        return { color: '#6366f1', title: 'GÓI CHUYÊN NGHIỆP (PRO)', features: ['Không giới hạn số tòa nhà', 'Không giới hạn số phòng trọ', 'Không giới hạn quét số bằng AI', 'Báo cáo doanh thu & VietQR thông minh'] };
      default:
        return { color: '#64748b', title: name.toUpperCase(), features: [] };
    }
  };

  const formatPriceVND = (usdPrice) => {
    const rate = 25000; // Tỷ giá quy đổi
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(usdPrice * rate);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách gói dịch vụ..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ color: '#8c8c8c', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tài Khoản  •  Dịch Vụ</div>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a3353', margin: 0 }}>Gói dịch vụ vận hành</h1>
        <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>Nâng cấp hạn mức quản lý tòa nhà, phòng trọ và mở khóa các tính năng AI thông minh.</p>
      </div>

      <Row gutter={[24, 24]}>
        {plans.map(plan => {
          const details = getPlanDetails(plan.name);
          const isCurrent = user.plan?.toLowerCase() === plan.name.toLowerCase();

          return (
            <Col xs={24} md={8} key={plan.id}>
              <Card 
                style={{ 
                  borderRadius: '16px', 
                  border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0', 
                  position: 'relative', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  height: '100%'
                }}
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                {isCurrent && (
                  <Tag color="#6366f1" style={{ position: 'absolute', top: -12, right: 20, borderRadius: '4px', fontWeight: 'bold' }}>
                    GÓI HIỆN TẠI
                  </Tag>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: details.color, fontWeight: 'bold' }}>HẠN MỨC CAO</div>
                  <h2 style={{ margin: 0, color: '#1a3353', fontWeight: '800' }}>{details.title}</h2>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
                    ${parseFloat(plan.price).toFixed(0)}
                  </span>
                  <span style={{ color: '#64748b' }}> / tháng</span>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    (~ {formatPriceVND(plan.price)})
                  </div>
                </div>

                {/* Các tính năng đi kèm */}
                <div style={{ flex: 1, marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>TÍNH NĂNG BAO GỒM</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', color: '#475569', lineHeight: '2' }}>
                    {details.features.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {feat}
                      </li>
                    ))}
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#6366f1', fontWeight: 'bold' }}>•</span> Giới hạn AI: {plan.maxAICallsPerMonth === -1 ? 'Không giới hạn' : `${plan.maxAICallsPerMonth} quét/tháng`}
                    </li>
                  </ul>
                </div>

                <Button 
                  type={isCurrent ? "default" : "primary"}
                  disabled={isCurrent}
                  block 
                  onClick={() => handleSelectPlan(plan)}
                  style={{ 
                    height: '42px', 
                    borderRadius: '8px', 
                    background: isCurrent ? '' : '#1a3353', 
                    border: 'none', 
                    fontWeight: 'bold',
                    color: isCurrent ? '#94a3b8' : '#ffffff'
                  }}
                >
                  {isCurrent ? "Đang sử dụng" : "Đăng ký nâng cấp"}
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* MODAL THANH TOÁN VIETQR */}
      <Modal
        title={<span style={{ fontWeight: '800', fontSize: '18px', color: '#1a3353' }}><Landmark size={20} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thanh toán nâng cấp gói cước</span>}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPaymentModalVisible(false)} style={{ borderRadius: '8px' }}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitLoading} 
            style={{ background: '#10b981', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
            onClick={handleConfirmPayment}
          >
            Tôi đã chuyển khoản thành công
          </Button>
        ]}
        width={400}
        centered
      >
        {selectedPlan && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Số tiền chuyển khoản (Quy đổi)</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginBottom: '16px' }}>
              {formatPriceVND(selectedPlan.price)}
            </div>

            {/* Tạo mã VietQR động để quét chuyển khoản */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <img 
                src={`https://img.vietqr.io/image/tcb-19037286392015-compact2.png?amount=${selectedPlan.price * 25000}&addInfo=${encodeURIComponent(`NANG CAP TK ${user.name} GOI ${selectedPlan.name.toUpperCase()}`)}&accountName=NGUYEN%20VAN%20A`} 
                alt="VietQR Upgrade Plan" 
                style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <div style={{ width: '100%', background: '#f0fdf4', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#166534', border: '1px solid #bbf7d0' }}>
              <strong>Hướng dẫn chuyển khoản:</strong>
              <ol style={{ paddingLeft: '16px', margin: '4px 0 0 0' }}>
                <li>Mở app ngân hàng quét mã QR trên hoặc chuyển khoản thủ công.</li>
                <li>Ngân hàng: <strong>Techcombank</strong></li>
                <li>Số tài khoản: <strong>19037286392015</strong></li>
                <li>Sau khi chuyển thành công, click <strong>"Tôi đã chuyển khoản"</strong> để kích hoạt gói cước lập tức.</li>
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Plans;
