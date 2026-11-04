import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Modal, Tag, Spin, Alert, Space, message, Segmented } from 'antd';
import { Landmark, Crown, Clock, Calendar, CheckCircle2, Zap, Loader2, AlertTriangle, Sparkles, Building, DoorOpen, Cpu, XCircle } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import PageHeader from '../../components/admin/PageHeader';

const PLAN_TIERS = { free: 0, basic: 1, pro: 2 };
const MAX_POLL_ATTEMPTS = 300; // 300 lần x 2 giây = 10 phút

const PLAN_DETAILS = {
  free: {
    color: '#475569',
    title: 'Gói Miễn phí',
    features: ['Quản lý tối đa 1 tòa nhà', 'Giới hạn 5 phòng mỗi tòa nhà', 'Nhập chỉ số điện nước thủ công', 'Không hỗ trợ AI đọc số'],
  },
  basic: {
    color: '#0F766E',
    title: 'Gói Cơ bản (Basic)',
    features: ['Quản lý tối đa 5 tòa nhà', 'Giới hạn 20 phòng mỗi tòa nhà', 'Quét số điện nước tự động bằng AI', 'Tự động đồng bộ báo cước Telegram'],
  },
  pro: {
    color: '#0369A1',
    title: 'Gói Chuyên nghiệp (Pro)',
    features: ['Không giới hạn số tòa nhà', 'Không giới hạn số phòng trọ', 'Không giới hạn quét số bằng AI', 'Báo cáo doanh thu & VietQR thông minh'],
  },
};

const formatAILimit = (plan) => {
  if (!plan) return 'Không hỗ trợ';
  if (plan.maxAICallsPerMonth === -1) return 'Không giới hạn';
  if (plan.maxAICallsPerMonth === 0) return 'Không hỗ trợ';
  return `${plan.maxAICallsPerMonth} lượt / tháng`;
};

const formatLimit = (value, unit, fallback) => {
  if (value === undefined) return fallback;
  return value >= 9999 ? 'Không giới hạn' : `${value} ${unit}`;
};

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState(null);
  const [cancellingUpgrade, setCancellingUpgrade] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' hoặc 'annual'

  const [userProfile, setUserProfile] = useState(null);
  const [pendingUpgrade, setPendingUpgrade] = useState(null);
  const [bankConfig, setBankConfig] = useState({ bankId: '', bankAccount: '', bankName: '' });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, profileData, configData] = await Promise.all([
        axiosInstance.get('/auth/plans'),
        axiosInstance.get('/auth/profile').catch((err) => {
          console.error('Lỗi lấy thông tin profile:', err);
          return null;
        }),
        axiosInstance.get('/sepay/config').catch((err) => {
          console.error('Lỗi tải cấu hình SePay ngân hàng:', err);
          return null;
        }),
      ]);

      setPlans(plansData || []);

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (profileData) {
        const { pendingUpgrade: pending, ...profile } = profileData;
        setUserProfile(profile);
        setPendingUpgrade(pending || null);
        const updatedUser = { ...storedUser, ...profile };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        setUserProfile(storedUser);
      }

      if (configData && configData.bankAccount) {
        setBankConfig(configData);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin gói cước.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ─── TỰ ĐỘNG LẮNG NGHE WEBHOOK SEPAY KHI MỞ MODAL THANH TOÁN (TỐI ĐA 10 PHÚT) ─
  useEffect(() => {
    if (!paymentModalVisible || !selectedPlan) return undefined;

    const initialPlan = userProfile?.plan;
    const initialExpiresAt = userProfile?.planExpiresAt;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        setPollTimedOut(true);
        return;
      }

      try {
        const freshProfile = await axiosInstance.get('/auth/profile');
        if (freshProfile) {
          const isTargetPlanActive = freshProfile.plan?.toLowerCase() === selectedPlan.name.toLowerCase();
          const planChanged = freshProfile.plan?.toLowerCase() !== initialPlan?.toLowerCase();
          const expiresChanged = freshProfile.planExpiresAt !== initialExpiresAt;

          if (isTargetPlanActive && (planChanged || expiresChanged || initialPlan === 'free')) {
            clearInterval(interval);
            const { pendingUpgrade: freshPending, ...cleanProfile } = freshProfile;
            setUserProfile(cleanProfile);
            setPendingUpgrade(freshPending || null);

            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...storedUser, ...cleanProfile };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('storage'));

            message.success(`Thanh toán thành công! Gói ${cleanProfile.plan.toUpperCase()} đã được SePay tự động kích hoạt.`);
            setPaymentModalVisible(false);
            fetchPlans();
          }
        }
      } catch (err) {
        console.error('Lỗi tự động kiểm tra thanh toán:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [paymentModalVisible, selectedPlan, userProfile, fetchPlans]);

  const handleCancelUpgradeRequest = async (reqToCancel = pendingUpgrade) => {
    if (!reqToCancel?.id) return;
    setCancellingUpgrade(true);
    try {
      try {
        await axiosInstance.delete(`/auth/upgrade-request/${reqToCancel.id}`);
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 405) {
          await axiosInstance.post('/auth/upgrade-request/cancel', { id: reqToCancel.id });
        } else {
          throw err;
        }
      }
      message.success(`Đã hủy yêu cầu nâng cấp #${reqToCancel.id}.`);
      setPendingUpgrade(null);
      setPaymentModalVisible(false);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể hủy yêu cầu nâng cấp.');
    } finally {
      setCancellingUpgrade(false);
    }
  };

  const executeChangePlan = async (plan) => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Gói Miễn phí thì kích hoạt trực tiếp, không mở modal QR thanh toán
    if (plan.name.toLowerCase() === 'free' || parseFloat(plan.price) === 0) {
      try {
        const response = await axiosInstance.post('/auth/upgrade-request', {
          planName: 'free',
          billingCycle: 'monthly',
        });
        message.success(response.message || 'Đã chuyển về Gói Miễn Phí thành công!');

        const updatedUser = { ...storedUser, ...(response.user || {}), plan: 'free', planExpiresAt: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserProfile(response.user || updatedUser);
        setPendingUpgrade(null);

        window.dispatchEvent(new Event('storage'));
        fetchPlans();
      } catch (err) {
        console.error(err);
        message.error(err.response?.data?.message || 'Không thể hạ cấp xuống gói Miễn phí.');
      }
      return;
    }

    // T3.7: Chỉ mở modal QR sau khi POST /auth/upgrade-request thành công
    setSubmittingPlan(plan.name);
    setPollTimedOut(false);
    try {
      const response = await axiosInstance.post('/auth/upgrade-request', {
        planName: plan.name,
        billingCycle,
      });
      if (!response?.request) {
        throw new Error('Không nhận được thông tin yêu cầu thanh toán từ hệ thống.');
      }
      setSelectedPlan(plan);
      setPendingUpgrade(response.request);
      setPaymentModalVisible(true);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Không thể tạo yêu cầu nâng cấp gói cước.');
    } finally {
      setSubmittingPlan(null);
    }
  };

  const handleOpenPendingModal = () => {
    if (!pendingUpgrade) return;
    const matchedPlan = plans.find((p) => p.name.toLowerCase() === String(pendingUpgrade.planName || '').toLowerCase());
    if (matchedPlan) {
      setSelectedPlan(matchedPlan);
      if (pendingUpgrade.billingCycle) {
        setBillingCycle(pendingUpgrade.billingCycle);
      }
      setPollTimedOut(false);
      setPaymentModalVisible(true);
    }
  };

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const calculateExpiryStatus = () => {
    const currentPlan = userProfile?.plan || storedUser?.plan || 'free';
    const expiresAt = userProfile?.planExpiresAt || storedUser?.planExpiresAt;

    if (currentPlan === 'free') {
      return { isFree: true, text: 'Miễn phí vĩnh viễn (có giới hạn hạn mức)', status: 'active', badgeColor: 'blue', daysLeftText: 'Vô thời hạn', daysCount: 0 };
    }

    if (!expiresAt) {
      return { isFree: false, text: 'Chưa có thông tin thời hạn', status: 'none', badgeColor: 'default', daysLeftText: 'N/A', daysCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expiresAt);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateParts = String(expiresAt).slice(0, 10).split('-');
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : expiresAt;

    if (diffDays > 0) {
      return {
        isFree: false,
        text: `Đang hoạt động • Hết hạn vào ${formattedDate}`,
        status: 'active',
        badgeColor: 'green',
        daysLeftText: `Còn ${diffDays} ngày`,
        daysCount: diffDays,
      };
    } else if (diffDays === 0) {
      return {
        isFree: false,
        text: `Hết hạn vào hôm nay (${formattedDate})`,
        status: 'today',
        badgeColor: 'orange',
        daysLeftText: 'Hết hạn hôm nay',
        daysCount: 0,
      };
    } else {
      return {
        isFree: false,
        text: `Đã hết hạn ngày ${formattedDate}`,
        status: 'expired',
        badgeColor: 'red',
        daysLeftText: `Đã quá hạn ${Math.abs(diffDays)} ngày`,
        daysCount: diffDays,
      };
    }
  };

  const handleSelectPlan = (plan) => {
    const currentPlanName = (userProfile?.plan || storedUser?.plan || 'free').toLowerCase();
    const targetPlanName = plan.name.toLowerCase();

    if (currentPlanName === targetPlanName && targetPlanName === 'free') {
      message.info('Tài khoản của bạn đang ở Gói Miễn Phí.');
      return;
    }

    const currentStatus = calculateExpiryStatus();
    const remainingDays = Math.max(0, Number(currentStatus.daysCount) || 0);

    // Nếu chọn chuyển về gói Free từ bất kỳ gói nào khác (T1.16: hiển thị rõ số ngày còn lại sẽ mất)
    if (targetPlanName === 'free') {
      Modal.confirm({
        title: 'Xác nhận chuyển về Gói Miễn Phí',
        icon: <AlertTriangle color="#DC2626" size={22} aria-hidden="true" />,
        content: (
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px' }}>
              Gói hiện tại <strong>{currentPlanName.toUpperCase()}</strong> ({currentStatus.daysLeftText}).
            </p>
            <p style={{ margin: 0, color: '#DC2626', fontWeight: 600 }}>
              {remainingDays > 0
                ? `Bạn sẽ mất ${remainingDays} ngày sử dụng còn lại của gói ${currentPlanName.toUpperCase()}. `
                : ''}
              Khi chuyển về Gói Miễn Phí, tài khoản sẽ bị giảm hạn mức (tối đa 1 tòa nhà, 5 phòng) và tạm dừng các tính năng nâng cao (AI đọc số điện nước, báo cáo thông minh). Bạn có chắc chắn muốn chuyển không?
            </p>
          </div>
        ),
        okText: 'Xác nhận chuyển gói',
        cancelText: 'Hủy bỏ',
        okButtonProps: { danger: true },
        onOk: () => executeChangePlan(plan),
      });
      return;
    }

    const currentTier = PLAN_TIERS[currentPlanName] || 0;
    const targetTier = PLAN_TIERS[targetPlanName] || 0;

    // Kiểm tra xem gói cũ có đang hoạt động và còn thời hạn hay không
    const isStillActive = remainingDays > 0;

    // Nếu bấm hạ cấp gói thấp hơn khi gói cũ vẫn còn hạn (Ví dụ: Pro -> Basic)
    if (currentTier > targetTier && isStillActive && currentPlanName !== 'free') {
      const currentPlanItem = plans.find((p) => p.name.toLowerCase() === currentPlanName);
      const oldRate = parseFloat(currentPlanItem?.price) || 200000;
      const newRate = parseFloat(plan.price) || 100000;
      const convertedDays = Math.round(remainingDays * (oldRate / newRate));

      Modal.confirm({
        title: 'Cảnh báo hạ cấp gói dịch vụ',
        icon: <AlertTriangle color="#DC2626" size={22} aria-hidden="true" />,
        content: (
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px' }}>
              Gói <strong>{currentPlanName.toUpperCase()}</strong> của bạn vẫn còn <strong>{remainingDays} ngày</strong> sử dụng.
            </p>
            <p style={{ margin: 0, color: '#DC2626', fontWeight: 600 }}>
              Nếu hạ cấp xuống gói <strong>{plan.name.toUpperCase()}</strong>, <strong>{remainingDays} ngày</strong> còn lại của gói {currentPlanName.toUpperCase()} sẽ được quy đổi theo tỷ lệ giá gói thành <strong>{convertedDays} ngày</strong> gói {plan.name.toUpperCase()} (cộng thêm kỳ mới sau khi thanh toán), và hạn mức tòa nhà/phòng/AI sẽ áp dụng theo gói mới. Bạn có chắc chắn muốn hạ cấp không?
            </p>
          </div>
        ),
        okText: 'Vẫn hạ cấp gói',
        cancelText: 'Hủy bỏ (giữ gói cũ)',
        okButtonProps: { danger: true },
        onOk: () => executeChangePlan(plan),
      });
      return;
    }

    executeChangePlan(plan);
  };

  const getPlanDetails = (name) => PLAN_DETAILS[name] || { color: '#475569', title: name.toUpperCase(), features: [] };

  const formatPriceVND = (vnd) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(vnd) || 0);

  const currentStatus = calculateExpiryStatus();
  const currentPlanName = (userProfile?.plan || storedUser?.plan || 'free').toLowerCase();
  const currentPlanObj = plans.find((p) => p.name.toLowerCase() === currentPlanName);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const isAnnual = billingCycle === 'annual';
  const isPendingExpired = pendingUpgrade?.status === 'expired';

  return (
    <div>
      <PageHeader
        title="Gói dịch vụ & hạn mức vận hành"
        description="Quản lý gói cước đang sử dụng, xem thời hạn còn lại và nâng cấp để mở rộng tính năng AI."
      />

      {/* ─── BANNER YÊU CẦU NÂNG CẤP ĐANG CHỜ THANH TOÁN (T2.12, T3.7) ─────────────── */}
      {pendingUpgrade && pendingUpgrade.status === 'pending' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 12 }}
          message={
            <span>
              Yêu cầu nâng cấp <strong>#{pendingUpgrade.id}</strong> (Gói{' '}
              <strong>{String(pendingUpgrade.planName || '').toUpperCase()}</strong> •{' '}
              {pendingUpgrade.billingCycle === 'annual' ? '1 năm' : '1 tháng'} •{' '}
              <strong>{formatPriceVND(pendingUpgrade.amount)}</strong>) đang chờ thanh toán
            </span>
          }
          description={`Nội dung chuyển khoản: "${pendingUpgrade.transferCode}". Quét mã QR để hoàn tất hoặc hủy nếu bạn muốn chọn lại gói khác.`}
          action={
            <Space direction="vertical" size={6}>
              <Button size="small" type="primary" onClick={handleOpenPendingModal}>
                Mở mã QR thanh toán
              </Button>
              <Button
                size="small"
                danger
                loading={cancellingUpgrade}
                icon={<XCircle size={14} />}
                onClick={() => handleCancelUpgradeRequest(pendingUpgrade)}
              >
                Hủy yêu cầu
              </Button>
            </Space>
          }
        />
      )}

      {/* ─── CARD THÔNG TIN GÓI ĐANG DÙNG VÀ THỜI HẠN CÒN LẠI ─────────────────────── */}
      <Card className="plan-current" styles={{ body: { padding: 28 } }}>
        <Row gutter={[24, 20]} align="middle">
          <Col xs={24} lg={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div className="plan-crown" aria-hidden="true"><Crown size={24} /></div>
              <div>
                <div style={{ fontSize: 12, color: '#99F6E4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Gói dịch vụ hiện tại
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  Gói {currentPlanName.toUpperCase()}
                  <Tag
                    color={currentStatus.badgeColor === 'green' ? '#10b981' : currentStatus.badgeColor === 'red' ? '#ef4444' : currentStatus.badgeColor === 'orange' ? '#f59e0b' : '#3b82f6'}
                    style={{ fontWeight: 600, fontSize: 12 }}
                  >
                    {currentStatus.daysLeftText}
                  </Tag>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <div className="plan-chip">
                <Calendar size={16} color="#5EEAD4" aria-hidden="true" />
                <span>Thời hạn: <strong>{currentStatus.text}</strong></span>
              </div>

              {!currentStatus.isFree && currentStatus.daysCount !== undefined && (
                <div className="plan-chip">
                  <Clock size={16} color="#5EEAD4" aria-hidden="true" />
                  <span>
                    Trạng thái:{' '}
                    {currentStatus.status === 'expired'
                      ? <strong style={{ color: '#FCA5A5' }}>Đã quá hạn sử dụng</strong>
                      : <strong style={{ color: '#5EEAD4' }}>Đang hoạt động</strong>}
                  </span>
                </div>
              )}
            </div>
          </Col>

          <Col xs={24} lg={10}>
            <div className="plan-limits">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#99F6E4', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Hạn mức quản lý đang có
              </div>
              <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building size={15} color="#94A3B8" aria-hidden="true" />
                  <span style={{ color: '#CBD5E1' }}>Tòa nhà:</span>
                  <strong style={{ color: '#F8FAFC' }}>{formatLimit(currentPlanObj?.maxBuildings, 'tòa', '1 tòa')}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DoorOpen size={15} color="#94A3B8" aria-hidden="true" />
                  <span style={{ color: '#CBD5E1' }}>Phòng / tòa:</span>
                  <strong style={{ color: '#F8FAFC' }}>{formatLimit(currentPlanObj?.maxRoomsPerBuilding, 'phòng', '5 phòng')}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={15} color="#94A3B8" aria-hidden="true" />
                  <span style={{ color: '#CBD5E1' }}>Lượt quét AI:</span>
                  <strong style={{ color: '#5EEAD4' }}>{formatAILimit(currentPlanObj)}</strong>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ─── THANH CHUYỂN ĐỔI THEO THÁNG / THEO NĂM ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={18} color="#0F766E" aria-hidden="true" /> Chọn chu kỳ thanh toán
        </div>

        <Segmented
          value={billingCycle}
          onChange={setBillingCycle}
          options={[
            { label: <span style={{ padding: '6px 16px', fontWeight: 600 }}>Theo tháng</span>, value: 'monthly' },
            {
              label: (
                <span style={{ padding: '6px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Theo năm
                  <Tag color="#0F766E" style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>Tiết kiệm 20%</Tag>
                </span>
              ),
              value: 'annual',
            },
          ]}
        />
      </div>

      {/* ─── DANH SÁCH CÁC GÓI DỊCH VỤ ────────────────────────────────────────────── */}
      <Row gutter={[20, 24]}>
        {plans.map((plan) => {
          const details = getPlanDetails(plan.name);
          const isCurrent = currentPlanName === plan.name.toLowerCase();
          const displayPrice = isAnnual ? parseFloat(plan.annualPrice) : parseFloat(plan.price);
          const monthlyEquivalent = isAnnual && plan.annualPrice > 0 ? Math.round(plan.annualPrice / 12) : null;

          return (
            <Col xs={24} md={12} xl={8} key={plan.id}>
              <Card
                style={{
                  height: '100%',
                  position: 'relative',
                  border: isCurrent ? '2px solid #0F766E' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%' } }}
              >
                {isCurrent && (
                  <Tag color="#0F766E" style={{ position: 'absolute', top: -12, right: 20, fontWeight: 600 }}>Đang sử dụng</Tag>
                )}
                {!isCurrent && plan.name === 'pro' && (
                  <Tag color="#0369A1" style={{ position: 'absolute', top: -12, right: 20, fontWeight: 600 }}>Khuyên dùng</Tag>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: details.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Hạn mức vận hành
                  </div>
                  <h2 style={{ margin: 0, color: '#0F172A', fontWeight: 700, fontSize: 20 }}>{details.title}</h2>
                </div>

                {/* Giá tiền gói */}
                <div style={{ marginBottom: 20, background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #EEF2F6' }}>
                  {displayPrice === 0 ? (
                    <>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>Miễn phí</div>
                      <div style={{ fontSize: 13, color: '#64748B' }}>Không tốn chi phí duy trì</div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 30, fontWeight: 800, color: '#0F172A' }}>{formatPriceVND(displayPrice)}</span>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>/ {isAnnual ? 'năm' : 'tháng'}</span>
                      </div>
                      {monthlyEquivalent && (
                        <div style={{ fontSize: 13, color: '#15803D', fontWeight: 600, marginTop: 2 }}>
                          Tương đương {formatPriceVND(monthlyEquivalent)}/tháng
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Các tính năng đi kèm */}
                <div style={{ flex: 1, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Tính năng nổi bật
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, color: '#334155', display: 'grid', gap: 10 }}>
                    {details.features.map((feat) => (
                      <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckCircle2 size={16} color="#0F766E" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" /> {feat}
                      </li>
                    ))}
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Zap size={16} color="#0369A1" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />
                      <span>Hạn mức AI: <strong>{formatAILimit(plan)}</strong></span>
                    </li>
                  </ul>
                </div>

                <Button
                  type={isCurrent ? 'default' : 'primary'}
                  block
                  loading={submittingPlan === plan.name}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent && displayPrice === 0}
                  style={{ height: 44 }}
                >
                  {isCurrent
                    ? (displayPrice === 0 ? 'Đang dùng gói Miễn phí' : `Gia hạn gói (${isAnnual ? 'theo năm' : 'theo tháng'})`)
                    : `Đăng ký gói ${plan.name.toUpperCase()}`}
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ─── MODAL THANH TOÁN VIETQR SEPAY (MỘT NGUỒN SỐ TIỀN, CÓ LỐI THOÁT - T3.7) ── */}
      <Modal
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Landmark size={20} color="#0F766E" aria-hidden="true" /> Quét mã QR thanh toán gói cước</span>}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={440}
        centered
      >
        {selectedPlan && pendingUpgrade && (() => {
          // T3.7: Dùng duy nhất pendingUpgrade.amount cho cả ảnh QR và dòng chữ số tiền
          const amountVnd = Math.round(Number(pendingUpgrade.amount) || 0);
          const sepayCode = pendingUpgrade.transferCode;
          const activeCycle = pendingUpgrade.billingCycle || billingCycle;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
              <div style={{ width: '100%', background: '#F8FAFC', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                  <span style={{ color: '#64748B' }}>Gói đã chọn:</span>
                  <strong style={{ color: '#0F172A' }}>Gói {selectedPlan.name.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                  <span style={{ color: '#64748B' }}>Chu kỳ đăng ký:</span>
                  <strong style={{ color: '#0F766E' }}>{activeCycle === 'annual' ? '1 năm (365 ngày)' : '1 tháng (30 ngày)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 6, borderTop: '1px dashed #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Số tiền chuyển khoản:</span>
                  <strong style={{ color: '#DC2626', fontSize: 16 }}>{formatPriceVND(amountVnd)}</strong>
                </div>
              </div>

              {isPendingExpired || pollTimedOut ? (
                <Alert
                  type="error"
                  showIcon
                  style={{ width: '100%', marginBottom: 14 }}
                  message="Phiên chờ thanh toán đã hết hạn"
                  description="Đã quá thời gian chờ tự động (10 phút) hoặc yêu cầu nâng cấp đã hết hạn. Vui lòng tạo lại yêu cầu nâng cấp để lấy mã QR mới."
                />
              ) : (
                <>
                  {/* Mã QR SePay tự động gạch nợ / nâng cấp */}
                  <div style={{ background: '#fff', padding: 12, borderRadius: 16, border: '2px solid #0F766E', marginBottom: 14 }}>
                    <img
                      src={`https://qr.sepay.vn/img?bank=${bankConfig.bankId}&acc=${bankConfig.bankAccount}&template=compact&amount=${amountVnd}&des=${encodeURIComponent(sepayCode)}`}
                      alt={`Mã VietQR thanh toán ${formatPriceVND(amountVnd)} cho gói ${selectedPlan.name.toUpperCase()}`}
                      style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
                    />
                  </div>

                  {/* LẮNG NGHE CHUYỂN KHOẢN TỰ ĐỘNG */}
                  <div style={{ width: '100%', background: '#F0FDFA', border: '1px solid #CCFBF1', padding: '10px 14px', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Loader2 size={20} className="spin" color="#0F766E" aria-hidden="true" />
                    <div style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>
                      Đã ghi nhận yêu cầu #{pendingUpgrade.id}. Đang chờ xác nhận thanh toán từ SePay...
                    </div>
                  </div>
                </>
              )}

              <div style={{ width: '100%', background: '#F0FDF4', padding: 14, borderRadius: 10, fontSize: 13, color: '#166534', border: '1px solid #BBF7D0', marginBottom: 14 }}>
                <div>Ngân hàng: <strong>{bankConfig.bankId}</strong> · STK: <strong>{bankConfig.bankAccount}</strong> ({bankConfig.bankName})</div>
                <div style={{ marginTop: 8 }}><strong>Nội dung chuyển khoản (bắt buộc):</strong></div>
                <div style={{ background: '#fff', border: '1px solid #86EFAC', padding: '8px 12px', borderRadius: 6, fontWeight: 800, color: '#15803D', fontSize: 14, margin: '6px 0', textAlign: 'center', letterSpacing: 0.5 }}>
                  {sepayCode}
                </div>
                <small style={{ color: '#475569', display: 'block', marginTop: 6, lineHeight: 1.45 }}>
                  Quét mã QR bằng ứng dụng ngân hàng. SePay sẽ tự động khớp nội dung và kích hoạt gói cước cho bạn.
                </small>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Button
                  danger
                  block
                  loading={cancellingUpgrade}
                  onClick={() => handleCancelUpgradeRequest(pendingUpgrade)}
                >
                  Hủy yêu cầu #{pendingUpgrade.id}
                </Button>
                <Button block onClick={() => setPaymentModalVisible(false)}>
                  Đóng tạm
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Plans;
