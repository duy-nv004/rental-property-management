import { useState, useEffect } from 'react';
import { Card, Spin, Row, Col, Divider, Tag, Empty, Button, Alert, message, Popconfirm, Input, Modal } from 'antd';
import { FileSignature, ShieldCheck, CheckSquare, Clock, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import SignaturePadModal from '../../components/common/SignaturePadModal';

const TenantContract = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  // Modal từ chối ký
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchContract = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchContract();
  }, []);

  const handleSignContract = async (signatureBase64) => {
    if (!data?.contract?.id) return;
    setSignLoading(true);
    try {
      await axiosInstance.post(`/tenant/contract/${data.contract.id}/sign`, {
        signature: signatureBase64
      });
      message.success('Ký hợp đồng thành công! Hợp đồng thuê phòng của bạn đã chính thức có hiệu lực.');
      setSignatureModalVisible(false);
      fetchContract();
    } catch (err) {
      console.error('Error signing contract:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi ký hợp đồng.');
    } finally {
      setSignLoading(false);
    }
  };

  const handleRejectContract = async () => {
    if (!data?.contract?.id) return;
    setRejectLoading(true);
    try {
      await axiosInstance.post(`/tenant/contract/${data.contract.id}/reject`, {
        reason: rejectReason
      });
      message.success('Bạn đã từ chối ký hợp đồng.');
      setRejectModalVisible(false);
      setRejectReason('');
      fetchContract();
    } catch (err) {
      console.error('Error rejecting contract:', err);
      message.error(err.response?.data?.message || 'Không thể gửi phản hồi từ chối.');
    } finally {
      setRejectLoading(false);
    }
  };

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

  if (!data || (!data.hasActiveContract && !data.hasPendingContract)) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 16px' }}>
        <Card bordered={false} style={{ textAlign: 'center', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <Empty description="Tài khoản hiện chưa có hợp đồng thuê nào." />
        </Card>
      </div>
    );
  }

  const { contract, room, building, landlord, profile, hasPendingContract, hasActiveContract } = data;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Hợp đồng thuê phòng</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Thông tin chi tiết các điều khoản hợp đồng thuê phòng của bạn.</p>
      </div>

      {/* ALERT THÔNG BÁO HỢP ĐỒNG CHỜ KÝ */}
      {hasPendingContract && (
        <Alert
          message="HỢP ĐỒNG ĐANG CHỜ BẠN KÝ NHẬN"
          description="Chủ nhà đã khởi tạo hợp đồng thuê và ký đại diện Bên A. Vui lòng đọc kỹ các điều khoản bên dưới và thực hiện Ký số để hợp đồng chính thức có hiệu lực."
          type="warning"
          showIcon
          icon={<Clock size={22} color="#d97706" />}
          action={
            <Button 
              type="primary" 
              icon={<FileSignature size={15} />}
              style={{ background: '#d97706', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
              onClick={() => setSignatureModalVisible(true)}
            >
              Ký hợp đồng ngay
            </Button>
          }
          style={{ marginBottom: '24px', borderRadius: '14px', padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a' }}
        />
      )}

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
        {/* TAG TRẠNG THÁI HỢP ĐỒNG */}
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          {hasActiveContract ? (
            <Tag color="success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: 'none' }}>
              <ShieldCheck size={14} /> Hợp đồng hiệu lực
            </Tag>
          ) : (
            <Tag color="warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: 'none' }}>
              <Clock size={14} /> Chờ người thuê ký
            </Tag>
          )}
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
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', height: '100%', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#6366f1', marginBottom: '8px' }}>BÊN CHO THUÊ (CHỦ NHÀ)</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{contract.landlordName || landlord?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>SĐT: {contract.landlordPhone || landlord?.phone || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>CCCD: {contract.landlordCccd || 'N/A'}</div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', height: '100%', border: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#10b981', marginBottom: '8px' }}>BÊN THUÊ (KHÁCH THUÊ)</div>
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{contract.tenantName || profile?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>SĐT: {contract.tenantPhone || profile?.phone || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>CCCD: {contract.tenantCccd || 'N/A'}</div>
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
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.electricityPrice)} / kWh (Bắt đầu: {contract.initialElectricity} kWh)</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ color: '#475569' }}>💧 Tiền nước</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatVND(contract.waterPrice)} / m³ (Bắt đầu: {contract.initialWater} m³)</span>
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
        <div style={{ marginBottom: '24px' }}>
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

        <Divider style={{ margin: '20px 0' }} />

        {/* SECTION 5: XÁC NHẬN KÝ SỐ 2 BÊN */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            5. Chữ ký điện tử của các bên ký kết
          </h4>

          <Row gutter={[16, 16]}>
            {/* BÊN A */}
            <Col xs={24} sm={12}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', background: '#f8fafc', height: '100%' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
                  BÊN CHO THUÊ (CHỦ NHÀ)
                </div>
                {contract.landlordSignature ? (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px dashed #94a3b8', display: 'inline-block' }}>
                      <img src={contract.landlordSignature} alt="Chữ ký Bên A" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginTop: '6px' }}>
                      ✓ Đã ký số ({formatDate(contract.landlordSignedAt)})
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                    Chưa cập nhật chữ ký
                  </div>
                )}
                <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
                  {contract.landlordName || landlord?.name || 'N/A'}
                </div>
              </div>
            </Col>

            {/* BÊN B */}
            <Col xs={24} sm={12}>
              <div style={{ 
                border: hasPendingContract ? '2px dashed #f59e0b' : '1px solid #cbd5e1', 
                borderRadius: '12px', 
                padding: '16px', 
                textAlign: 'center', 
                background: hasPendingContract ? '#fffbeb' : '#f8fafc',
                height: '100%' 
              }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
                  BÊN THUÊ (KHÁCH THUÊ)
                </div>

                {hasActiveContract && contract.tenantSignature ? (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px dashed #94a3b8', display: 'inline-block' }}>
                      <img src={contract.tenantSignature} alt="Chữ ký Bên B" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginTop: '6px' }}>
                      ✓ Đã ký số ({formatDate(contract.tenantSignedAt)})
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: '16px 0' }}>
                    <p style={{ fontSize: '12px', color: '#d97706', marginBottom: '12px', fontWeight: '600' }}>
                      Hợp đồng chưa được ký bởi Bên B.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button 
                        type="primary" 
                        icon={<FileSignature size={15} />}
                        onClick={() => setSignatureModalVisible(true)}
                        style={{ background: '#10b981', border: 'none', fontWeight: 'bold', borderRadius: '8px' }}
                      >
                        Vẽ & Ký hợp đồng ngay
                      </Button>
                      <Button 
                        danger 
                        icon={<XCircle size={15} />}
                        onClick={() => setRejectModalVisible(true)}
                        style={{ borderRadius: '8px' }}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                )}

                <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b', marginTop: '8px' }}>
                  {contract.tenantName || profile?.name || 'N/A'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

      </Card>

      {/* MODAL KÝ SỐ CANVAS CHO KHÁCH THUÊ */}
      <SignaturePadModal
        open={signatureModalVisible}
        onCancel={() => setSignatureModalVisible(false)}
        onConfirm={handleSignContract}
        loading={signLoading}
        title="Vẽ chữ ký điện tử xác nhận Hợp đồng thuê phòng"
      />

      {/* MODAL TỪ CHỐI KÝ */}
      <Modal
        title={<span style={{ fontWeight: '800', color: '#ef4444' }}><AlertTriangle size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Từ chối ký hợp đồng thuê phòng</span>}
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRejectModalVisible(false)} style={{ borderRadius: '8px' }}>
            Hủy
          </Button>,
          <Button 
            key="reject" 
            type="primary" 
            danger 
            loading={rejectLoading}
            onClick={handleRejectContract}
            style={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Xác nhận từ chối
          </Button>
        ]}
        width={450}
        centered
      >
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Bạn có chắc chắn muốn từ chối ký hợp đồng này? Vui lòng nhập lý do từ chối để thông báo tới chủ nhà:
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do từ chối (Ví dụ: Đơn giá không đúng thỏa thuận, thông tin phòng sai...)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ borderRadius: '8px' }}
        />
      </Modal>

    </div>
  );
};

export default TenantContract;
