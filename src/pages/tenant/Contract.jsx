import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spin, Row, Col, Tag, Empty, Button, Alert, message, Input, Modal, Select, DatePicker, List, Space } from 'antd';
import dayjs from 'dayjs';
import { FileSignature, ShieldCheck, Clock, AlertTriangle, XCircle, Printer, History, CalendarCheck, Building2, UploadCloud } from 'lucide-react';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';
import SignaturePadModal from '../../components/common/SignaturePadModal';
import { expiryTag } from '../landlord/ContractManager';
import { parseInventory } from '../../utils/contracts';

const CONTRACT_STATUS_LABEL = {
  active: 'Đang hiệu lực',
  pending_tenant_signature: 'Chờ ký',
  terminated: 'Đã thanh lý',
};

const TenantContract = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  // Modal từ chối ký
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Hợp đồng đang xem khi khách thuê nhiều phòng; null = để backend chọn mặc định
  const [selectedContractId, setSelectedContractId] = useState(null);

  // Tải lên CCCD 2 mặt & AI OCR khi tự ký hợp đồng
  const [cccdFrontFile, setCccdFrontFile] = useState(null);
  const [cccdBackFile, setCccdBackFile] = useState(null);
  const [cccdFrontPreview, setCccdFrontPreview] = useState('');
  const [cccdBackPreview, setCccdBackPreview] = useState('');
  const [tenantCccdInput, setTenantCccdInput] = useState('');
  const [tenantDobInput, setTenantDobInput] = useState('');
  const [tenantHometownInput, setTenantHometownInput] = useState('');
  const [cccdScanLoading, setCccdScanLoading] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/tenant/summary', {
        params: selectedContractId ? { contractId: selectedContractId } : {}
      });
      setData(response);
    } catch (err) {
      console.error('Error fetching contract:', err);
      message.error('Không thể tải thông tin hợp đồng.');
    } finally {
      setLoading(false);
    }
  }, [selectedContractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  // ─── YÊU CẦU TRẢ PHÒNG / GIA HẠN (C5) ───────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [requestType, setRequestType] = useState(null);
  const [requestDate, setRequestDate] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setRequests(await axiosInstance.get('/tenant/requests'));
    } catch {
      setRequests([]);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const list = await axiosInstance.get('/tenant/bookings');
      setBookings(Array.isArray(list) ? list : []);
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchBookings();
  }, [fetchRequests, fetchBookings]);

  useEffect(() => {
    const onDataChanged = () => {
      fetchContract();
      fetchRequests();
      fetchBookings();
    };
    window.addEventListener('app:data-changed', onDataChanged);
    return () => window.removeEventListener('app:data-changed', onDataChanged);
  }, [fetchContract, fetchRequests, fetchBookings]);

  const handleSelectCccdFile = (side, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (side === 'front') {
      if (cccdFrontPreview) URL.revokeObjectURL(cccdFrontPreview);
      setCccdFrontFile(file);
      setCccdFrontPreview(previewUrl);
    } else {
      if (cccdBackPreview) URL.revokeObjectURL(cccdBackPreview);
      setCccdBackFile(file);
      setCccdBackPreview(previewUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (cccdFrontPreview) URL.revokeObjectURL(cccdFrontPreview);
      if (cccdBackPreview) URL.revokeObjectURL(cccdBackPreview);
    };
  }, [cccdFrontPreview, cccdBackPreview]);

  const handleScanCccdByAi = async () => {
    if (!cccdFrontFile && !cccdBackFile) {
      return message.warning('Vui lòng chọn ít nhất một ảnh CCCD trước khi quét AI.');
    }
    setCccdScanLoading(true);
    try {
      const fd = new FormData();
      if (cccdFrontFile) fd.append('cccdImages', cccdFrontFile);
      if (cccdBackFile) fd.append('cccdImages', cccdBackFile);
      const res = await axiosInstance.post('/ai/scan-cccd', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.data) {
        const { cccdNumber, dob, hometown } = res.data;
        if (cccdNumber) setTenantCccdInput(cccdNumber);
        if (dob) setTenantDobInput(dob);
        if (hometown) setTenantHometownInput(hometown);
        if (Array.isArray(res.warnings) && res.warnings.length > 0) {
          message.warning(`Vui lòng kiểm tra lại: ${res.warnings.join(' ')}`);
        } else {
          message.success('AI đã trích xuất thông tin CCCD thành công!');
        }
      } else {
        message.warning('AI không trích xuất được thông tin, bạn có thể nhập tay bên dưới.');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể quét ảnh CCCD lúc này.');
    } finally {
      setCccdScanLoading(false);
    }
  };

  const openRequest = (type) => {
    // Khách ở tới hết kỳ thanh toán: mặc định trả phòng ngày cuối tháng hiện tại
    setRequestDate(type === 'move_out' ? dayjs().endOf('month') : null);
    setRequestNote('');
    setRequestType(type);
  };

  const handleSendRequest = async () => {
    if (!requestDate) return message.warning('Vui lòng chọn ngày.');
    setRequestLoading(true);
    try {
      const res = await axiosInstance.post(`/tenant/contract/${data.contract.id}/requests`, {
        type: requestType, desiredDate: requestDate.format('YYYY-MM-DD'), note: requestNote || undefined
      });
      message.success(res.message || 'Đã gửi yêu cầu tới chủ nhà');
      setRequestType(null);
      fetchRequests();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleSignContract = async (signatureBase64) => {
    if (!data?.contract?.id) return;
    setSignLoading(true);
    try {
      const hasCccdOrFields =
        cccdFrontFile ||
        cccdBackFile ||
        tenantCccdInput.trim() ||
        tenantDobInput.trim() ||
        tenantHometownInput.trim();
      if (hasCccdOrFields) {
        const fd = new FormData();
        fd.append('signature', signatureBase64);
        if (cccdFrontFile) fd.append('cccdFront', cccdFrontFile);
        if (cccdBackFile) fd.append('cccdBack', cccdBackFile);
        if (tenantCccdInput.trim()) fd.append('tenantCccd', tenantCccdInput.trim());
        if (tenantDobInput.trim()) fd.append('tenantDob', tenantDobInput.trim());
        if (tenantHometownInput.trim()) fd.append('tenantHometown', tenantHometownInput.trim());
        await axiosInstance.post(`/tenant/contract/${data.contract.id}/sign`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post(`/tenant/contract/${data.contract.id}/sign`, {
          signature: signatureBase64,
        });
      }
      message.success('Ký hợp đồng thành công! Hợp đồng thuê phòng của bạn đã chính thức có hiệu lực.');
      setSignatureModalVisible(false);
      setCccdFrontFile(null);
      setCccdBackFile(null);
      setCccdFrontPreview('');
      setCccdBackPreview('');
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
    if (rejectReason.trim().length < 5) {
      message.warning('Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự)!');
      return;
    }
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

  const bookingStatusMap = {
    pending: { color: 'gold', text: 'Chờ chủ nhà xác nhận' },
    confirmed: { color: 'cyan', text: 'Đã xác nhận lịch hẹn' },
    deposit_paid: { color: 'green', text: 'Đã nhận cọc — Chờ chủ nhà lập HĐ' },
    deposit_conflict: { color: 'volcano', text: 'Trùng giữ chỗ — Chờ hoàn cọc' },
    contract_created: { color: 'blue', text: 'Đã lập hợp đồng' },
    rejected: { color: 'red', text: 'Đã từ chối' },
    cancelled: { color: 'default', text: 'Đã hủy' },
  };

  const renderBookingsCard = () => {
    if (!bookings.length) return null;
    return (
      <Card
        title={
          <Space size={8}>
            <CalendarCheck size={18} color="#0F766E" aria-hidden="true" />
            <span>Lịch hẹn xem phòng &amp; Đặt cọc của tôi</span>
          </Space>
        }
        extra={
          <Button size="small" icon={<Building2 size={14} aria-hidden="true" />} onClick={() => navigate('/rooms')}>
            Khám phá thêm phòng trống
          </Button>
        }
        style={{ marginBottom: 18 }}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          {bookings.map((b) => {
            const st = bookingStatusMap[b.status] || { color: 'default', text: b.status };
            const roomNum = b.room?.roomNumber || b.roomId;
            const bldName = b.building?.name || b.room?.building?.name || '';
            const bldAddr = [b.building?.address, b.building?.district, b.building?.city].filter(Boolean).join(', ');
            const dateVal = b.type === 'viewing' ? b.viewingDate : b.moveInDate;

            return (
              <div
                key={b.id}
                data-testid={`tenant-booking-${b.id}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <Space size={6} wrap style={{ marginBottom: 4 }}>
                    <Tag color={b.type === 'deposit' ? 'purple' : 'geekblue'}>
                      {b.type === 'deposit' ? 'Đặt cọc giữ phòng' : 'Đặt lịch xem phòng'}
                    </Tag>
                    <Tag color={st.color}>{st.text}</Tag>
                  </Space>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    Phòng {roomNum}{bldName ? ` · ${bldName}` : ''}
                  </div>
                  {bldAddr && <div style={{ fontSize: 13, color: '#475569' }}>{bldAddr}</div>}
                  {dateVal && (
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      {b.type === 'viewing' ? 'Ngày hẹn xem:' : 'Dự kiến dọn vào:'} {formatDate(dateVal)}
                    </div>
                  )}
                  {b.type === 'deposit' && (
                    <div style={{ fontSize: 13, color: '#0f766e', fontWeight: 600 }}>
                      Tiền cọc: {formatVND(b.depositAmount)} {b.transferCode ? `· Nội dung CK: ${b.transferCode}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải thông tin hợp đồng thuê..." />
      </div>
    );
  }

  if (!data || !data.contract) {
    return (
      <div className="page-shell page-shell-tight">
        {renderBookingsCard()}
        <Card className="empty-card" variant="borderless">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              bookings.length > 0
                ? 'Bạn chưa có hợp đồng chính thức. Khi chủ nhà lập hợp đồng từ lịch đặt cọc, hợp đồng sẽ hiển thị tại đây để bạn ký.'
                : 'Tài khoản hiện chưa có hợp đồng thuê nào.'
            }
          >
            <Button type="primary" onClick={() => navigate('/rooms')}>
              Khám phá phòng trống
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  const { contract, room, building, landlord, profile, hasPendingContract, hasActiveContract } = data;
  const pendingContractIds = data.pendingContractIds || [];
  const isViewingPending = !!contract && pendingContractIds.includes(contract.id);
  const isTerminated = contract.status === 'terminated';
  const latestDeposit = contract.deposits?.[0] || null;

  return (
    <div className="page-shell page-shell-doc tenant-page">

      {/* HEADER & LỊCH SỬ HỢP ĐỒNG */}
      <div className="page-header">
        <div className="page-header-main">
          <h1 className="page-header-title">Hợp đồng thuê phòng</h1>
          <p className="page-header-desc">Thông tin chi tiết các điều khoản và lịch sử hợp đồng thuê phòng của bạn.</p>
        </div>
        {data.contracts?.length > 0 && (
          <div style={{ width: '100%', maxWidth: 360, minWidth: 0 }}>
            <Select
              aria-label="Lịch sử hợp đồng"
              style={{ width: '100%' }}
              value={contract?.id}
              onChange={setSelectedContractId}
              options={data.contracts.map(c => ({
                value: c.id,
                label: `HĐ #${c.id} · Phòng ${c.roomNumber} (${c.buildingName}) — ${CONTRACT_STATUS_LABEL[c.status] || c.status}`
              }))}
            />
          </div>
        )}
      </div>

      {renderBookingsCard()}

      {/* Có hợp đồng chờ ký ở phòng khác: cho chuyển sang xem thay vì ký nhầm hợp đồng đang hiển thị */}
      {hasPendingContract && !isViewingPending && (
        <Alert
          className="alert-block"
          type="warning"
          showIcon
          icon={<Clock size={20} />}
          message="Bạn có hợp đồng khác đang chờ ký"
          action={
            <Button type="primary" className="btn-warning" onClick={() => setSelectedContractId(pendingContractIds[0])}>
              Xem hợp đồng chờ ký
            </Button>
          }
        />
      )}

      {/* ALERT THÔNG BÁO HỢP ĐỒNG CHỜ KÝ */}
      {isViewingPending && (
        <Alert
          className="alert-block"
          type="warning"
          showIcon
          icon={<Clock size={20} />}
          message="Hợp đồng đang chờ bạn ký nhận"
          description="Chủ nhà đã khởi tạo hợp đồng thuê và ký đại diện Bên A. Vui lòng đọc kỹ các điều khoản bên dưới và thực hiện Ký số để hợp đồng chính thức có hiệu lực."
          action={
            <Button
              type="primary"
              className="btn-warning"
              icon={<FileSignature size={15} />}
              onClick={() => setSignatureModalVisible(true)}
            >
              Ký hợp đồng ngay
            </Button>
          }
        />
      )}

      {/* BẢNG QUYẾT TOÁN & BÀN GIAO PHÒNG KHI HỢP ĐỒNG ĐÃ THANH LÝ (T2.8) */}
      {isTerminated && (
        <Card title="Quyết toán & Bàn giao phòng" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={6}>
              <div className="info-cell">
                <div className="info-label">Ngày trả phòng</div>
                <div className="info-value">{formatDate(contract.terminatedAt)}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="info-cell">
                <div className="info-label">Chỉ số điện cuối</div>
                <div className="info-value">{contract.finalElectricity != null ? `${contract.finalElectricity} kWh` : '—'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="info-cell">
                <div className="info-label">Chỉ số nước cuối</div>
                <div className="info-value">{contract.finalWater != null ? `${contract.finalWater} m³` : '—'}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="info-cell">
                <div className="info-label">Tiền cọc hoàn lại</div>
                <div className="info-value">{formatVND(latestDeposit?.refundedAmount || 0)}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="info-cell">
                <div className="info-label">Tiền cọc đã khấu trừ</div>
                <div className="info-value">{formatVND(latestDeposit?.deductedAmount || 0)}</div>
              </div>
            </Col>
            {Number(contract.outstandingAmount) > 0 && (
              <Col xs={12} sm={6}>
                <div className="info-cell">
                  <div className="info-label">Công nợ còn lại</div>
                  <div className="info-value text-danger">{formatVND(contract.outstandingAmount)}</div>
                </div>
              </Col>
            )}
            {(contract.terminationNote || latestDeposit?.note) && (
              <Col xs={24}>
                <div className="info-cell">
                  <div className="info-label">Ghi chú quyết toán</div>
                  <div className="info-value">{contract.terminationNote || latestDeposit?.note}</div>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* THAO TÁC HỢP ĐỒNG & YÊU CẦU CỦA KHÁCH */}
      <Space className="tenant-actions" style={{ marginBottom: 16 }} wrap>
        {hasActiveContract && !isTerminated && (
          <>
            <Button onClick={() => openRequest('move_out')}>Báo trả phòng</Button>
            <Button onClick={() => openRequest('renewal')}>Đề nghị gia hạn</Button>
          </>
        )}
        <Button
          icon={<History size={15} aria-hidden="true" />}
          onClick={() => setRequestsModalVisible(true)}
        >
          Yêu cầu của tôi {requests.length > 0 ? `(${requests.length})` : ''}
        </Button>
      </Space>

      {/* KHUNG TRẠNG THÁI & NÚT IN HỢP ĐỒNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isTerminated ? (
            <Tag color="default" className="tag-flat tag-icon">
              Đã thanh lý
            </Tag>
          ) : hasActiveContract ? (
            <Tag color="success" className="tag-flat tag-icon">
              <ShieldCheck size={13} aria-hidden="true" /> Hợp đồng hiệu lực
            </Tag>
          ) : (
            <Tag color="warning" className="tag-flat tag-icon">
              <Clock size={13} aria-hidden="true" /> Chờ người thuê ký
            </Tag>
          )}
          {contract.status === 'active' && expiryTag(contract.endDate) && (
            <Tag color={expiryTag(contract.endDate).color} className="tag-flat">{expiryTag(contract.endDate).text}</Tag>
          )}
        </div>

        <Button
          type="default"
          icon={<Printer size={15} aria-hidden="true" />}
          onClick={() => window.print()}
          style={{ minHeight: 40 }}
        >
          In hợp đồng
        </Button>
      </div>

      {/* BẢN HỢP ĐỒNG DẠNG GIẤY (LIVE PAPER CONTRACT) */}
      <div className="printable-contract paper doc-paper" style={{ marginBottom: 24 }}>

        <div className="paper-national">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
          <strong>Độc lập - Tự do - Hạnh phúc</strong>
          <div className="paper-national-line" />
        </div>

        <div className="paper-heading">
          <h2 className="paper-title">HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ</h2>
          <small className="paper-basis">Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</small>
        </div>

        <p>Hôm nay, ngày {contract.startDate ? new Date(contract.startDate).getDate() : '...'} tháng {contract.startDate ? new Date(contract.startDate).getMonth() + 1 : '...'} năm {contract.startDate ? new Date(contract.startDate).getFullYear() : '...'}, chúng tôi gồm có:</p>

        <div className="paper-section">
          <strong>BÊN A: BÊN CHO THUÊ (PHÒNG TRỌ)</strong><br />
          - Họ và Tên: {contract.landlordName || landlord?.name || 'N/A'}<br />
          - Điện thoại: {contract.landlordPhone || landlord?.phone || 'N/A'}<br />
          - CCCD số: {contract.landlordCccd || 'Chưa cung cấp'}<br />
          - HK thường trú: {contract.landlordHometown || 'N/A'}<br />
          - Địa chỉ bàn giao phòng thuê: {contract.landlordAddress || building?.address || 'N/A'}
        </div>

        <div className="paper-section">
          <strong>BÊN B: BÊN THUÊ (PHÒNG TRỌ)</strong><br />
          - Họ và Tên: {contract.tenantName || profile?.name || 'N/A'}<br />
          - Điện thoại: {contract.tenantPhone || profile?.phone || 'N/A'}<br />
          - CCCD số: {contract.tenantCccd || 'Chưa cung cấp'} {contract.tenantDob && ` - Ngày sinh: ${contract.tenantDob}`}<br />
          - HK thường trú: {contract.tenantHometown || 'N/A'}
          {(contract.cccdFrontUrl || contract.cccdBackUrl) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {contract.cccdFrontUrl && (
                <a href={contract.cccdFrontUrl} target="_blank" rel="noreferrer">
                  <img
                    src={contract.cccdFrontUrl}
                    alt="CCCD mặt trước"
                    style={{ width: 132, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </a>
              )}
              {contract.cccdBackUrl && (
                <a href={contract.cccdBackUrl} target="_blank" rel="noreferrer">
                  <img
                    src={contract.cccdBackUrl}
                    alt="CCCD mặt sau"
                    style={{ width: 132, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="paper-section">
          <strong>ĐIỀU 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG</strong><br />
          Bên A đồng ý cho bên B thuê phòng trọ số <strong>{room?.roomNumber}</strong> thuộc tòa nhà <strong>{building?.name}</strong>.<br />
          - Thời hạn thuê phòng là tính từ ngày {formatDate(contract.startDate)} đến ngày {formatDate(contract.endDate)}.<br />
          - Mục đích thuê để lưu trú sinh hoạt với số lượng người ở thực tế là: {contract.numTenants || 1} người.
        </div>

        <div className="paper-section">
          <strong>ĐIỀU 2: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</strong><br />
          - Hai bên nhất trí giá thuê phòng trọ là: <strong>{formatVND(contract.rentPrice ?? room?.price)}/tháng</strong>.<br />
          - Tiền đặt cọc phòng: <strong>{formatVND(contract.deposit)}</strong> (Được hoàn trả lại đầy đủ khi kết thúc hợp đồng theo quy định).<br />
          - Đơn giá dịch vụ tiện ích áp dụng:<br />
          &nbsp;&nbsp;+ Tiền điện: {formatVND(contract.electricityPrice)} / kWh (Chỉ số đầu: {contract.initialElectricity || 0} kWh)<br />
          &nbsp;&nbsp;+ Tiền nước: {formatVND(contract.waterPrice)} / m³ (Chỉ số đầu: {contract.initialWater || 0} m³)<br />
          &nbsp;&nbsp;+ Phí Internet: {formatVND(contract.internetPrice)} / tháng<br />
          &nbsp;&nbsp;+ Phí vệ sinh dịch vụ: {formatVND(contract.cleaningPrice)} / tháng<br />
          - Kỳ thanh toán: Bên B có nghĩa vụ thanh toán đầy đủ tiền phòng trọ và dịch vụ vào ngày {contract.paymentDay || 30} hàng tháng.
        </div>

        <div className="paper-section">
          <strong>ĐIỀU 3: DANH SÁCH ĐỒ DÙNG VÀ THIẾT BỊ BÊN A BÀN GIAO</strong><br />
          {parseInventory(contract.inventory).length > 0 ? (
            <div className="scroll-x">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th className="c col-stt">STT</th>
                    <th>Tên loại thiết bị</th>
                    <th className="c col-qty">Số lượng</th>
                    <th>Tình trạng bàn giao</th>
                  </tr>
                </thead>
                <tbody>
                  {parseInventory(contract.inventory).map((item, index) => (
                    <tr key={index}>
                      <td className="c">{index + 1}</td>
                      <td>{item.name}</td>
                      <td className="c">{item.quantity}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <span>Không bàn giao thiết bị đặc biệt nào kèm theo.</span>
          )}
        </div>

        <div className="paper-section">
          <strong>ĐIỀU 4: NỘI QUY VÀ CAM KẾT CHUNG</strong><br />
          - Bên B có nghĩa vụ thanh toán tiền thuê phòng và các chi phí dịch vụ đúng hạn định.<br />
          - Giữ gìn vệ sinh chung, nếp sống văn minh đô thị, giữ gìn trật tự và hạn chế tiếng ồn sau 23:00.<br />
          - Tuân thủ nghiêm ngặt các quy định về an toàn phòng cháy chữa cháy (PCCC).<br />
          - Không tự ý đục phá, sửa chữa hoặc làm thay đổi kết cấu hiện trạng phòng khi chưa có sự đồng ý của Bên A.<br />
          - Thực hiện nghiêm túc việc khai báo tạm trú tạm vắng theo đúng quy định pháp luật.
        </div>

        {isTerminated && (
          <div className="paper-section">
            <strong>BIÊN BẢN THANH LÝ</strong><br />
            Ngày thanh lý: {contract.terminatedAt ? formatDate(contract.terminatedAt) : 'N/A'}<br />
            Tình trạng: Hợp đồng đã hoàn tất thủ tục trả phòng và thanh lý.
          </div>
        )}

        {isViewingPending && (!contract.tenantCccdFront || !contract.tenantCccdBack) && (
          <Card
            size="small"
            className="no-print"
            style={{
              marginTop: 18,
              marginBottom: 14,
              borderColor: '#99f6e4',
              background: '#f0fdfa',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UploadCloud size={17} color="#0f766e" aria-hidden="true" />
                  Bổ sung ảnh CCCD 2 mặt trước khi ký hợp đồng
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Hợp đồng chưa có đủ 2 mặt CCCD từ chủ nhà. Vui lòng tải lên mặt trước &amp; mặt sau (có thể bấm Quét AI để tự điền).
                </div>
              </div>
              <Button
                size="small"
                loading={cccdScanLoading}
                disabled={!cccdFrontFile && !cccdBackFile}
                onClick={handleScanCccdByAi}
              >
                Quét CCCD bằng AI
              </Button>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  CCCD Mặt trước
                </label>
                <div style={{ border: '1px dashed #0f766e', borderRadius: 8, padding: 10, background: '#fff' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    data-testid="tenant-cccd-front"
                    onChange={(e) => handleSelectCccdFile('front', e.target.files?.[0])}
                  />
                  {cccdFrontPreview && (
                    <img
                      src={cccdFrontPreview}
                      alt="Xem trước CCCD mặt trước"
                      style={{ marginTop: 8, width: '100%', maxHeight: 110, objectFit: 'cover', borderRadius: 6 }}
                    />
                  )}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  CCCD Mặt sau
                </label>
                <div style={{ border: '1px dashed #0f766e', borderRadius: 8, padding: 10, background: '#fff' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    data-testid="tenant-cccd-back"
                    onChange={(e) => handleSelectCccdFile('back', e.target.files?.[0])}
                  />
                  {cccdBackPreview && (
                    <img
                      src={cccdBackPreview}
                      alt="Xem trước CCCD mặt sau"
                      style={{ marginTop: 8, width: '100%', maxHeight: 110, objectFit: 'cover', borderRadius: 6 }}
                    />
                  )}
                </div>
              </Col>
            </Row>

            <Row gutter={[12, 10]} style={{ marginTop: 12 }}>
              <Col xs={24} sm={8}>
                <label htmlFor="tenant-cccd-input" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số CCCD
                </label>
                <Input
                  id="tenant-cccd-input"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12 chữ số (tự điền AI)"
                  value={tenantCccdInput}
                  onChange={(e) => setTenantCccdInput(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={8}>
                <label htmlFor="tenant-dob-input" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Ngày sinh
                </label>
                <Input
                  id="tenant-dob-input"
                  placeholder="DD/MM/YYYY"
                  value={tenantDobInput}
                  onChange={(e) => setTenantDobInput(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={8}>
                <label htmlFor="tenant-hometown-input" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Quê quán / Thường trú
                </label>
                <Input
                  id="tenant-hometown-input"
                  placeholder="Nhập địa chỉ thường trú"
                  value={tenantHometownInput}
                  onChange={(e) => setTenantHometownInput(e.target.value)}
                />
              </Col>
            </Row>
          </Card>
        )}

        <div className="paper-signs">
          <div className="paper-sign">
            <strong>Đại diện Bên A</strong><br />
            <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
            {contract.landlordSignature ? (
              <div className="paper-sign-slot">
                <img src={contract.landlordSignature} alt="Chữ ký bên A" className="paper-sign-img" /><br />
                <small className="paper-sign-hint">Ký ngày: {contract.landlordSignedAt ? formatDate(contract.landlordSignedAt) : 'N/A'}</small>
              </div>
            ) : <div className="paper-sign-gap" />}
            <strong>{contract.landlordName || landlord?.name || 'N/A'}</strong>
          </div>

          <div className="paper-sign">
            <strong>Đại diện Bên B</strong><br />
            <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
            {contract.tenantSignature ? (
              <div className="paper-sign-slot">
                <img src={contract.tenantSignature} alt="Chữ ký bên B" className="paper-sign-img" /><br />
                <small className="paper-sign-hint">Ký ngày: {contract.tenantSignedAt ? formatDate(contract.tenantSignedAt) : 'N/A'}</small>
              </div>
            ) : isViewingPending ? (
              <div className="paper-sign-wait" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span>(Hợp đồng chưa được ký bởi Bên B)</span>
                <div className="sign-pending-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button
                    type="primary"
                    className="btn-success"
                    icon={<FileSignature size={15} />}
                    onClick={() => setSignatureModalVisible(true)}
                  >
                    Vẽ &amp; Ký hợp đồng ngay
                  </Button>
                  <Button
                    danger
                    icon={<XCircle size={15} />}
                    onClick={() => setRejectModalVisible(true)}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ) : isTerminated ? (
              <div className="paper-sign-wait">(Hợp đồng đã thanh lý)</div>
            ) : (
              <div className="paper-sign-wait">(Chờ người thuê ký xác nhận)</div>
            )}
            <strong>{contract.tenantName || profile?.name || 'N/A'}</strong>
          </div>
        </div>

      </div>

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
        title={
          <span className="modal-title-danger">
            <AlertTriangle size={18} aria-hidden="true" /> Từ chối ký hợp đồng thuê phòng
          </span>
        }
        open={rejectModalVisible}
        onCancel={() => { setRejectModalVisible(false); setRejectReason(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setRejectModalVisible(false); setRejectReason(''); }}>
            Hủy
          </Button>,
          <Button
            key="reject"
            type="primary"
            danger
            loading={rejectLoading}
            disabled={rejectReason.trim().length < 5}
            onClick={handleRejectContract}
          >
            Xác nhận từ chối
          </Button>
        ]}
        width={450}
        centered
        destroyOnHidden
      >
        <p className="modal-note">
          Bạn có chắc chắn muốn từ chối ký hợp đồng này? Vui lòng nhập lý do từ chối để thông báo tới chủ nhà:
        </p>
        <label htmlFor="contract-reject-reason" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
          Lý do từ chối <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <Input.TextArea
          id="contract-reject-reason"
          rows={3}
          maxLength={500}
          showCount
          placeholder="Nhập lý do từ chối (tối thiểu 5 ký tự, VD: Đơn giá không đúng thỏa thuận...)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* MODAL GỬI YÊU CẦU (C5) */}
      <Modal
        title={requestType === 'move_out' ? 'Báo trả phòng' : 'Đề nghị gia hạn'}
        open={!!requestType}
        onCancel={() => setRequestType(null)}
        footer={[
          <Button key="cancel" onClick={() => setRequestType(null)}>Hủy</Button>,
          <Button key="send" type="primary" loading={requestLoading} onClick={handleSendRequest}>Gửi yêu cầu</Button>
        ]}
        width={450}
        centered
        destroyOnHidden
      >
        <p className="modal-note">
          {requestType === 'move_out'
            ? 'Mặc định trả phòng vào cuối kỳ thanh toán hiện tại. Nên báo trước ít nhất 30 ngày.'
            : 'Chọn ngày kết thúc hợp đồng mong muốn.'}
        </p>
        <DatePicker className="w-full" format="DD/MM/YYYY" value={requestDate} onChange={setRequestDate} style={{ width: '100%', marginBottom: 12 }} />
        <Input.TextArea rows={3} placeholder="Ghi chú cho chủ nhà" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} maxLength={500} />
      </Modal>

      {/* MODAL DANH SÁCH YÊU CẦU CỦA TÔI */}
      <Modal
        title={
          <span className="modal-title">
            <History size={18} aria-hidden="true" style={{ marginRight: 8, color: '#0F766E' }} />
            Yêu cầu của tôi
          </span>
        }
        open={requestsModalVisible}
        onCancel={() => setRequestsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setRequestsModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={560}
        centered
      >
        {requests.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa gửi yêu cầu nào tới chủ nhà." />
        ) : (
          <List
            dataSource={requests}
            renderItem={(r) => (
              <List.Item>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
                    {REQUEST_TYPE_LABELS[r.type] || r.type} · ngày {formatDate(r.desiredDate)}
                  </div>
                  {r.note && <div className="cell-sub" style={{ color: '#475569', marginTop: 4 }}>Ghi chú: {r.note}</div>}
                  {r.responseNote && <div className="cell-sub" style={{ color: '#0F766E', marginTop: 2 }}>Phản hồi của chủ nhà: {r.responseNote}</div>}
                </div>
                <Tag color={REQUEST_STATUS[r.status]?.color}>{REQUEST_STATUS[r.status]?.text || r.status}</Tag>
              </List.Item>
            )}
          />
        )}
      </Modal>

    </div>
  );
};

const REQUEST_TYPE_LABELS = { move_out: 'Báo trả phòng', renewal: 'Đề nghị gia hạn' };
const REQUEST_STATUS = {
  pending: { color: 'gold', text: 'Chờ duyệt' },
  approved: { color: 'green', text: 'Đã đồng ý' },
  rejected: { color: 'red', text: 'Bị từ chối' }
};

export default TenantContract;
