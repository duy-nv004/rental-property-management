import { useState, useEffect } from 'react';
import { Card, Spin, Row, Col, Divider, Tag, Empty, message } from 'antd';
import { FileSignature, ShieldCheck, User, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import axiosInstance from '../../utils/axios';

const TenantContract = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await axiosInstance.get('/tenant/summary');
        setData(response);
      } catch (err) {
        console.error('Error fetching contract:', err);
        message.error('Không thể tải thông tin hợp đồng.');
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, []);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang tải thông tin hợp đồng thuê..." />
      </div>
    );
  }

  if (!data || !data.hasActiveContract) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 16px' }}>
        <Card bordered={false} style={{ textAlign: 'center', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <Empty description="Tài khoản chưa có hợp đồng thuê nào." />
        </Card>
      </div>
    );
  }

  const { contract, room, building, landlord, profile } = data;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Hợp đồng thuê phòng</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Thông tin chi tiết các điều khoản hợp đồng thuê phòng đang ký kết.</p>
      </div>

      {/* CONTRACT CARD */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        {/* Subtle Watermark/Icon in Background */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <Tag color="success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: 'none' }}>
            <ShieldCheck size={14} /> Hợp đồng hiệu lực
          </Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '10px' }}>
            <FileSignature size={24} color="#0f172a" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>HỢP ĐỒNG THUÊ PHÒNG</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mã số: HĐ-{contract.id}-{room.roomNumber}</span>
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* SECTION 1: CÁC BÊN THAM GIA */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            1. Các bên ký kết
          </h4>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#6366f1', marginBottom: '8px' }}>BÊN CHO THUÊ (CHỦ NHÀ)</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{landlord?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>SĐT: {landlord?.phone || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Email: {landlord?.email || 'N/A'}</div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#10b981', marginBottom: '8px' }}>BÊN THUÊ (KHÁCH THUÊ)</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{profile?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>SĐT: {profile?.phone || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Email: {profile?.email || 'N/A'}</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* SECTION 2: THÔNG TIN PHÒNG & THỜI HẠN */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            2. Thông tin phòng & Thời hạn thuê
          </h4>
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Phòng thuê</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>Phòng {room.roomNumber}</div>
            </Col>
            <Col xs={12} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Tòa nhà</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{building.name}</div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Giá thuê phòng</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{formatVND(room.price)}/tháng</div>
            </Col>
            
            <Col xs={12} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Tiền đặt cọc</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{formatVND(contract.deposit)}</div>
            </Col>
            <Col xs={12} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Ngày bắt đầu</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{formatDate(contract.startDate)}</div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Ngày hết hạn</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{formatDate(contract.endDate)}</div>
            </Col>
          </Row>
        </div>

        {/* SECTION 3: BẢNG GIÁ DỊCH VỤ THỎA THUẬN */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            3. Đơn giá dịch vụ
          </h4>
          <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', fontWeight: '700', fontSize: '12px', color: '#64748b' }}>
              <span>DỊCH VỤ</span>
              <span>ĐƠN GIÁ THỎA THUẬN</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>⚡ Tiền điện</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.electricityPrice)} / kWh</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>💧 Tiền nước</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.waterPrice)} / m³</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>🌐 Mạng Internet</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.internetPrice)} / tháng</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>🧹 Phí dịch vụ & Vệ sinh chung</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.cleaningPrice)} / tháng</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: NỘI QUY & CAM KẾT CHUNG */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            4. Nội quy tòa nhà & Cam kết
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <CheckSquare size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>Đóng tiền phòng đúng kỳ hạn thỏa thuận hàng tháng.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <CheckSquare size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>Giữ gìn vệ sinh chung, vứt rác đúng nơi quy định, hạn chế làm ồn sau 23:00.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <CheckSquare size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>Không tự ý cải tạo kết cấu phòng, đục tường khoan lỗ khi chưa xin phép chủ nhà.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <CheckSquare size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>Tuân thủ khai báo tạm trú tạm vắng theo đúng quy định pháp luật.</span>
            </div>
          </div>
        </div>

      </Card>

    </div>
  );
};

export default TenantContract;
