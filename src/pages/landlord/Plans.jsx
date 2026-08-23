import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Tag, Spin, message, Segmented } from 'antd';
import { Landmark, Crown, Clock, Calendar, Sparkles, CheckCircle2, Zap, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const PLAN_TIERS = { free: 0, basic: 1, pro: 2 };

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' hoặc 'annual'
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [userProfile, setUserProfile] = useState(null);
  const [bankConfig, setBankConfig] = useState({ bankId: '', bankAccount: '', bankName: '' });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const [plansData, profileData, configData] = await Promise.all([
        axiosInstance.get('/auth/plans'),
        axiosInstance.get('/auth/profile').catch(err => {
          console.error("Lỗi lấy thông tin profile:", err);
          return null;
        }),
        axiosInstance.get('/sepay/config').catch(err => {
          console.error("Lỗi tải cấu hình SePay ngân hàng:", err);
          return null;
        })
      ]);

      setPlans(plansData);

      if (profileData) {
        setUserProfile(profileData);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...storedUser, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        setUserProfile(user);
      }

      if (configData && configData.bankAccount) {
        setBankConfig(configData);
      }
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

  // ─── TỰ ĐỘNG LẮNG NGHE WEBHOOK SEPAY KHI MỞ MODAL THANH TOÁN ─────────────────
  useEffect(() => {
    let interval = null;
    if (paymentModalVisible && selectedPlan) {
      const initialPlan = userProfile?.plan;
      const initialExpiresAt = userProfile?.planExpiresAt;

      console.log('🔄 Bắt đầu lắng nghe SePay Webhook...', { initialPlan, initialExpiresAt, targetPlan: selectedPlan.name });

      interval = setInterval(async () => {
        try {
          const freshProfile = await axiosInstance.get('/auth/profile');
          if (freshProfile) {
            const isTargetPlanActive = freshProfile.plan?.toLowerCase() === selectedPlan.name.toLowerCase();
            const planChanged = freshProfile.plan?.toLowerCase() !== initialPlan?.toLowerCase();
            const expiresChanged = freshProfile.planExpiresAt !== initialExpiresAt;

            if (isTargetPlanActive && (planChanged || expiresChanged || initialPlan === 'free')) {
              console.log('✅ Đã nhận diện thanh toán SePay tự động thành công!', freshProfile);
              clearInterval(interval);
              setUserProfile(freshProfile);
              
              const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
              const updatedUser = { ...storedUser, ...freshProfile };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              window.dispatchEvent(new Event('storage'));

              message.success(`🎉 Thanh toán thành công! Gói ${freshProfile.plan.toUpperCase()} đã được SePay tự động kích hoạt.`);
              setPaymentModalVisible(false);
              fetchPlans();
            }
          }
        } catch (err) {
          console.error("Lỗi tự động kiểm tra thanh toán:", err);
        }
      }, 2000); // Polling kiểm tra mỗi 2 giây
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentModalVisible, selectedPlan, userProfile]);

  const executeChangePlan = async (plan) => {
    // Gói Miễn phí thì kích hoạt trực tiếp, không cần mở modal QR thanh toán
    if (plan.name.toLowerCase() === 'free' || parseFloat(plan.price) === 0) {
      try {
        const response = await axiosInstance.post('/auth/upgrade-request', {
          planName: 'free',
          billingCycle: 'monthly'
        });
        message.success(response.message || "Đã chuyển về Gói Miễn Phí thành công!");
        
        const updatedUser = { ...user, ...(response.user || {}), plan: 'free', planExpiresAt: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserProfile(response.user || updatedUser);
        
        window.dispatchEvent(new Event('storage'));
        fetchPlans();
      } catch (err) {
        console.error(err);
        message.error(err.response?.data?.message || "Không thể hạ cấp xuống gói Miễn phí.");
      }
      return;
    }

    setSelectedPlan(plan);
    setPaymentModalVisible(true);
  };

  const handleSelectPlan = (plan) => {
    const currentPlanName = (userProfile?.plan || user?.plan || 'free').toLowerCase();
    const targetPlanName = plan.name.toLowerCase();

    if (currentPlanName === targetPlanName && targetPlanName === 'free') {
      message.info("Tài khoản của bạn đang ở Gói Miễn Phí.");
      return;
    }

    const currentStatus = calculateExpiryStatus();

    // Nếu chọn chuyển về gói Free từ bất kỳ gói nào khác
    if (targetPlanName === 'free') {
      Modal.confirm({
        title: '⚠️ Xác nhận chuyển về Gói Miễn Phí',
        icon: <AlertTriangle color="#ef4444" size={24} style={{ marginRight: '8px' }} />,
        content: (
          <div style={{ padding: '8px 0', fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Gói hiện tại <strong>{currentPlanName.toUpperCase()}</strong> ({currentStatus.daysLeftText}).
            </p>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: '600' }}>
              Khi chuyển về Gói Miễn Phí, tài khoản của bạn sẽ bị giảm hạn mức quản lý (tối đa 1 tòa nhà, 5 phòng) và tạm dừng các tính năng nâng cao (AI đọc số điện nước, báo cáo thông minh). Bạn có chắc chắn muốn chuyển không?
            </p>
          </div>
        ),
        okText: 'Xác nhận chuyển gói',
        cancelText: 'Hủy bỏ',
        okButtonProps: { danger: true, style: { borderRadius: '6px', fontWeight: 'bold' } },
        cancelButtonProps: { style: { borderRadius: '6px' } },
        onOk: () => executeChangePlan(plan)
      });
      return;
    }

    const currentTier = PLAN_TIERS[currentPlanName] || 0;
    const targetTier = PLAN_TIERS[targetPlanName] || 0;

    // Kiểm tra xem gói cũ có đang hoạt động và còn thời hạn hay không
    const expiresAt = userProfile?.planExpiresAt || user?.planExpiresAt;
    let isStillActive = false;

    if (expiresAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(expiresAt);
      expDate.setHours(0, 0, 0, 0);
      isStillActive = expDate >= today;
    }

    // Nếu lỡ tay bấm hạ cấp gói thấp hơn khi gói cũ vẫn còn hạn (Ví dụ: Pro -> Basic)
    if (currentTier > targetTier && isStillActive && currentPlanName !== 'free') {
      Modal.confirm({
        title: '⚠️ Cảnh báo hạ cấp gói dịch vụ',
        icon: <AlertTriangle color="#ef4444" size={24} style={{ marginRight: '8px' }} />,
        content: (
          <div style={{ padding: '8px 0', fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Gói <strong>{currentPlanName.toUpperCase()}</strong> của bạn vẫn đang hoạt động ({currentStatus.daysLeftText}).
            </p>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: '600' }}>
              Nếu hạ cấp xuống gói <strong>{plan.name.toUpperCase()}</strong>, bạn sẽ bị giảm hạn mức tòa nhà, số phòng và tính năng AI ngay lập tức. Bạn có chắc chắn muốn hạ cấp không?
            </p>
          </div>
        ),
        okText: 'Vẫn hạ cấp gói',
        cancelText: 'Hủy bỏ (Giữ gói cũ)',
        okButtonProps: { danger: true, style: { borderRadius: '6px', fontWeight: 'bold' } },
        cancelButtonProps: { style: { borderRadius: '6px' } },
        onOk: () => executeChangePlan(plan)
      });
      return;
    }

    executeChangePlan(plan);
  };

  // Kích hoạt thủ công / xác nhận đã chuyển khoản
  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setSubmitLoading(true);
    try {
      const response = await axiosInstance.post('/auth/upgrade-request', {
        planName: selectedPlan.name,
        billingCycle: billingCycle
      });
      message.success(response.message);
      
      const updatedUser = { ...user, plan: response.user.plan, planExpiresAt: response.user.planExpiresAt };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUserProfile(response.user);
      
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
        return { 
          color: '#64748b', 
          bgHeader: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          title: 'GÓI MIỄN PHÍ', 
          features: ['Quản lý tối đa 1 tòa nhà', 'Giới hạn 5 phòng mỗi tòa nhà', 'Nhập chỉ số điện nước thủ công', 'Không hỗ trợ AI đọc số'] 
        };
      case 'basic':
        return { 
          color: '#10b981', 
          bgHeader: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          title: 'GÓI CƠ BẢN (BASIC)', 
          features: ['Quản lý tối đa 5 tòa nhà', 'Giới hạn 20 phòng mỗi tòa nhà', 'Quét số điện nước tự động bằng AI', 'Tự động đồng bộ báo cước Telegram'] 
        };
      case 'pro':
        return { 
          color: '#6366f1', 
          bgHeader: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          title: 'GÓI CHUYÊN NGHIỆP (PRO)', 
          features: ['Không giới hạn số tòa nhà', 'Không giới hạn số phòng trọ', 'Không giới hạn quét số bằng AI', 'Báo cáo doanh thu & VietQR thông minh'] 
        };
      default:
        return { color: '#64748b', bgHeader: '#f8fafc', title: name.toUpperCase(), features: [] };
    }
  };

  const formatPriceVND = (usdPrice) => {
    const rate = 25000;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(usdPrice * rate);
  };

  const calculateExpiryStatus = () => {
    const currentPlan = userProfile?.plan || user?.plan || 'free';
    const expiresAt = userProfile?.planExpiresAt || user?.planExpiresAt;

    if (currentPlan === 'free') {
      return {
        isFree: true,
        text: 'Miễn phí vĩnh viễn (Giới hạn hạn mức)',
        status: 'active',
        badgeColor: 'blue',
        daysLeftText: 'Vô thời hạn'
      };
    }

    if (!expiresAt) {
      return {
        isFree: false,
        text: 'Chưa có thông tin thời hạn',
        status: 'none',
        badgeColor: 'default',
        daysLeftText: 'N/A'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiresAt);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateParts = expiresAt.split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : expiresAt;

    if (diffDays > 0) {
      return {
        isFree: false,
        text: `Đang hoạt động • Hết hạn vào ${formattedDate}`,
        status: 'active',
        badgeColor: 'green',
        daysLeftText: `Còn ${diffDays} ngày`,
        daysCount: diffDays
      };
    } else if (diffDays === 0) {
      return {
        isFree: false,
        text: `Hết hạn vào hôm nay (${formattedDate})`,
        status: 'today',
        badgeColor: 'orange',
        daysLeftText: 'Hết hạn hôm nay',
        daysCount: 0
      };
    } else {
      return {
        isFree: false,
        text: `Đã hết hạn ngày ${formattedDate}`,
        status: 'expired',
        badgeColor: 'red',
        daysLeftText: `Đã quá hạn ${Math.abs(diffDays)} ngày`,
        daysCount: diffDays
      };
    }
  };

  const currentStatus = calculateExpiryStatus();
  const currentPlanName = (userProfile?.plan || user?.plan || 'free').toLowerCase();

  // Tìm object gói cước hiện tại của user để lấy limits
  const currentPlanObj = plans.find(p => p.name.toLowerCase() === currentPlanName);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải danh sách gói dịch vụ..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tài Khoản • Dịch Vụ</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          Gói dịch vụ & Hạn mức vận hành
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
          Quản lý gói cước đang sử dụng, xem thời hạn còn lại và lựa chọn nâng cấp gói để mở rộng tính năng AI thông minh.
        </p>
      </div>

      {/* ─── CARD THÔNG TIN GÓI ĐANG DÙNG VÀ THỜI HẠN CÒN LẠI ─────────────────────── */}
      <Card
        style={{
          borderRadius: '20px',
          border: '1px solid #cbd5e1',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          marginBottom: '32px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          position: 'relative'
        }}
        bodyStyle={{ padding: '28px' }}
      >
        {/* Họa tiết trang trí nền */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <Row gutter={[24, 20]} align="middle">
          <Col xs={24} lg={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                <Crown size={26} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  GÓI DỊCH VỤ HIỆN TẠI
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  GÓI {currentPlanName.toUpperCase()}
                  <Tag color={currentStatus.badgeColor === 'green' ? '#10b981' : currentStatus.badgeColor === 'red' ? '#ef4444' : currentStatus.badgeColor === 'orange' ? '#f59e0b' : '#3b82f6'} style={{ borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', padding: '2px 10px' }}>
                    {currentStatus.daysLeftText}
                  </Tag>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px', color: '#cbd5e1', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '10px' }}>
                <Calendar size={16} color="#38bdf8" />
                <span>Thời hạn: <strong>{currentStatus.text}</strong></span>
              </div>
              
              {!currentStatus.isFree && currentStatus.daysCount !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '10px' }}>
                  <Clock size={16} color="#f43f5e" />
                  <span>Trạng thái: {currentStatus.status === 'expired' ? <strong style={{ color: '#f87171' }}>Đã quá hạn sử dụng</strong> : <strong style={{ color: '#34d399' }}>Đang hoạt động tốt</strong>}</span>
                </div>
              )}
            </div>
          </Col>

          <Col xs={24} lg={10}>
            {/* Hạn mức tính năng của gói hiện tại */}
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '16px 20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HẠN MỨC QUẢN LÝ ĐANG CÓ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Tòa nhà:</span>{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {currentPlanObj ? (currentPlanObj.maxBuildings >= 9999 ? 'Không giới hạn' : `${currentPlanObj.maxBuildings} tòa`) : '1 tòa'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Phòng / Tòa:</span>{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {currentPlanObj ? (currentPlanObj.maxRoomsPerBuilding >= 9999 ? 'Không giới hạn' : `${currentPlanObj.maxRoomsPerBuilding} phòng`) : '5 phòng'}
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#94a3b8' }}>Lượt quét AI:</span>{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {currentPlanObj ? (currentPlanObj.maxAICallsPerMonth === -1 ? 'Không giới hạn' : currentPlanObj.maxAICallsPerMonth === 0 ? 'Không hỗ trợ' : `${currentPlanObj.maxAICallsPerMonth} lượt / tháng`) : 'Không hỗ trợ'}
                  </strong>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ─── THANH CHUYỂN ĐỔI THEO THÁNG / THEO NĂM ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={18} color="#6366f1" /> Chọn chu kỳ thanh toán cho gói của bạn:
        </div>
        
        <Segmented
          value={billingCycle}
          onChange={(val) => setBillingCycle(val)}
          options={[
            {
              label: (
                <div style={{ padding: '6px 16px', fontWeight: '700', fontSize: '14px' }}>
                  Thanh toán theo Tháng
                </div>
              ),
              value: 'monthly',
            },
            {
              label: (
                <div style={{ padding: '6px 16px', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Thanh toán theo Năm</span>
                  <Tag color="#ef4444" style={{ margin: 0, borderRadius: '10px', fontSize: '10px', padding: '0 6px', fontWeight: '800' }}>
                    TIẾT KIỆM 20%
                  </Tag>
                </div>
              ),
              value: 'annual',
            },
          ]}
          style={{
            background: '#e2e8f0',
            padding: '4px',
            borderRadius: '12px'
          }}
        />
      </div>

      {/* ─── DANH SÁCH CÁC GÓI DỊCH VỤ ────────────────────────────────────────────── */}
      <Row gutter={[24, 24]}>
        {plans.map(plan => {
          const details = getPlanDetails(plan.name);
          const isCurrent = currentPlanName === plan.name.toLowerCase();
          
          const isAnnual = billingCycle === 'annual';
          const displayPrice = isAnnual ? parseFloat(plan.annualPrice) : parseFloat(plan.price);
          const monthlyEquivalent = isAnnual && plan.annualPrice > 0 ? (plan.annualPrice / 12).toFixed(0) : null;

          return (
            <Col xs={24} md={8} key={plan.id}>
              <Card 
                style={{ 
                  borderRadius: '20px', 
                  border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0', 
                  position: 'relative', 
                  boxShadow: isCurrent ? '0 12px 30px -10px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                {isCurrent && (
                  <Tag color="#6366f1" style={{ position: 'absolute', top: -12, right: 20, borderRadius: '6px', fontWeight: 'bold', padding: '2px 10px' }}>
                    GÓI ĐANG SỬ DỤNG
                  </Tag>
                )}

                {!isCurrent && plan.name === 'pro' && (
                  <Tag color="#ef4444" style={{ position: 'absolute', top: -12, right: 20, borderRadius: '6px', fontWeight: 'bold', padding: '2px 10px' }}>
                    KHUYÊN DÙNG
                  </Tag>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: details.color, fontWeight: '800', letterSpacing: '0.5px' }}>HẠN MỨC VẬN HÀNH</div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '20px' }}>{details.title}</h2>
                </div>

                {/* Giá tiền gói */}
                <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  {displayPrice === 0 ? (
                    <div>
                      <span style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>Miễn phí</span>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Không tốn chi phí duy trì</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>
                          ${displayPrice.toFixed(0)}
                        </span>
                        <span style={{ color: '#64748b', fontWeight: '600' }}> / {isAnnual ? 'năm' : 'tháng'}</span>
                      </div>
                      
                      {monthlyEquivalent && (
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
                          ⚡ Chỉ tương đương ${monthlyEquivalent}/tháng
                        </div>
                      )}

                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                        (~ {formatPriceVND(displayPrice)})
                      </div>
                    </div>
                  )}
                </div>

                {/* Các tính năng đi kèm */}
                <div style={{ flex: 1, marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TÍNH NĂNG NỔI BẬT
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '2.1' }}>
                    {details.features.map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} color="#10b981" /> {feat}
                      </li>
                    ))}
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} color="#6366f1" />
                      <span>Hạn mức AI: <strong>{plan.maxAICallsPerMonth === -1 ? 'Không giới hạn' : plan.maxAICallsPerMonth === 0 ? 'Không hỗ trợ' : `${plan.maxAICallsPerMonth} quét/tháng`}</strong></span>
                    </li>
                  </ul>
                </div>

                <Button 
                  type={isCurrent ? "default" : "primary"}
                  block 
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent && displayPrice === 0}
                  style={{ 
                    height: '44px', 
                    borderRadius: '10px', 
                    background: isCurrent ? '' : plan.name === 'pro' ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : '#0f172a', 
                    border: 'none', 
                    fontWeight: '700',
                    fontSize: '14px',
                    color: isCurrent ? '#64748b' : '#ffffff',
                    boxShadow: !isCurrent ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none'
                  }}
                >
                  {isCurrent 
                    ? (displayPrice === 0 ? "Đang sử dụng gói Miễn phí" : `Gia hạn gói (${isAnnual ? 'Theo Năm' : 'Theo Tháng'})`)
                    : `Đăng ký gói ${plan.name.toUpperCase()}`}
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ─── MODAL THANH TOÁN VIETQR SEPAY (TỰ ĐỘNG LẮNG NGHE WEBHOOK) ─────────────── */}
      <Modal
        title={
          <span style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={22} color="#10b981" /> Quét mã QR thanh toán gói cước
          </span>
        }
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={440}
        centered
      >
        {selectedPlan && (() => {
          const isAnnual = billingCycle === 'annual';
          const targetPrice = isAnnual ? parseFloat(selectedPlan.annualPrice) : parseFloat(selectedPlan.price);
          const sepayCode = `PLAN ${(userProfile?.id || user?.id)} ${selectedPlan.name.toUpperCase()}${isAnnual ? ' YEAR' : ''}`;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
              <div style={{ width: '100%', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Gói đã chọn:</span>
                  <strong style={{ color: '#0f172a' }}>GÓI {selectedPlan.name.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Chu kỳ đăng ký:</span>
                  <strong style={{ color: '#6366f1' }}>{isAnnual ? 'Đăng ký 1 Năm (365 ngày)' : 'Đăng ký 1 Tháng (30 ngày)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b', fontWeight: 'bold' }}>Số tiền chuyển khoản:</span>
                  <strong style={{ color: '#ef4444', fontSize: '16px' }}>{formatPriceVND(targetPrice)}</strong>
                </div>
              </div>

              {/* Tạo mã QR SePay tự động gạch nợ / nâng cấp */}
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', border: '2px solid #6366f1', marginBottom: '14px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)' }}>
                <img 
                  src={`https://qr.sepay.vn/img?bank=${bankConfig.bankId}&acc=${bankConfig.bankAccount}&template=compact&amount=${targetPrice * 25000}&des=${encodeURIComponent(sepayCode)}`} 
                  alt="SePay VietQR Upgrade Plan" 
                  style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
                />
              </div>

              {/* LẮNG NGHE CHUYỂN KHOẢN TỰ ĐỘNG */}
              <div style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Loader2 size={20} color="#2563eb" style={{ animation: 'spin 1.5s linear infinite' }} />
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>
                  Đang lắng nghe tự động từ SePay Webhook...
                </div>
              </div>

              <div style={{ width: '100%', background: '#f0fdf4', padding: '14px', borderRadius: '10px', fontSize: '12.5px', color: '#166534', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                <div>Ngân hàng: <strong>{bankConfig.bankId}</strong> • STK: <strong>{bankConfig.bankAccount}</strong> ({bankConfig.bankName})</div>
                <div style={{ marginTop: '8px' }}><strong>Nội dung chuyển khoản chuẩn (bắt buộc):</strong></div>
                <div style={{ background: '#ffffff', border: '1px solid #86efac', padding: '8px 12px', borderRadius: '6px', fontWeight: '800', color: '#15803d', fontSize: '14px', margin: '6px 0', textAlign: 'center', letterSpacing: '0.5px' }}>
                  {sepayCode}
                </div>
                <small style={{ color: '#475569', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                  ⚡ Quét mã QR trên bằng ứng dụng ngân hàng. Hệ thống SePay sẽ tự động khớp nội dung và kích hoạt gói cước cho bạn!
                </small>
              </div>

              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Plans;
