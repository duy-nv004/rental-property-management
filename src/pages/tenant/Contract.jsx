import { useState, useEffect, useCallback } from 'react';
import { Card, Spin, Row, Col, Divider, Tag, Empty, Button, Alert, message, Input, Modal, Select, DatePicker, List, Space } from 'antd';
import dayjs from 'dayjs';
import { FileSignature, ShieldCheck, CheckSquare, Clock, AlertTriangle, XCircle, Zap, Droplets, Wifi, Sparkles } from 'lucide-react';
import '../../styles/tenant.css';
import axiosInstance from '../../utils/axios';
import SignaturePadModal from '../../components/common/SignaturePadModal';
import { expiryTag } from '../landlord/ContractManager';

const CONTRACT_STATUS_LABEL = {
  active: 'Đang hiệu lực',
  pending_tenant_signature: 'Chờ ký',
  terminated: 'Đã thanh lý',
};

const TenantContract = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  // Modal từ chối ký
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Hợp đồng đang xem khi khách thuê nhiều phòng; null = để backend chọn mặc định
  const [selectedContractId, setSelectedContractId] = useState(null);

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

  const fetchRequests = useCallback(async () => {
    try {
      setRequests(await axiosInstance.get('/tenant/requests'));
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
      <div className="loading-center">
        <Spin size="large" tip="Đang tải thông tin hợp đồng thuê..." />
      </div>
    );
  }

  if (!data || !data.contract) {
    return (
      <div className="page-shell page-shell-tight">
        <Card className="empty-card" variant="borderless">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Tài khoản hiện chưa có hợp đồng thuê nào."
          />
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
          <Select
            aria-label="Lịch sử hợp đồng"
            style={{ minWidth: 260, maxWidth: '100%' }}
            value={contract?.id}
            onChange={setSelectedContractId}
            options={data.contracts.map(c => ({
              value: c.id,
              label: `HĐ #${c.id} · Phòng ${c.roomNumber} (${c.buildingName}) — ${CONTRACT_STATUS_LABEL[c.status] || c.status}`
            }))}
          />
        )}
      </div>

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

      {/* YÊU CẦU & TIỀN CỌC (C5) */}
      {hasActiveContract && !isTerminated && (
        <Space className="tenant-actions" style={{ marginBottom: 16 }} wrap>
          <Button onClick={() => openRequest('move_out')}>Báo trả phòng</Button>
          <Button onClick={() => openRequest('renewal')}>Đề nghị gia hạn</Button>
        </Space>
      )}
      {requests.length > 0 && (
        <Card title="Yêu cầu của tôi" variant="borderless" style={{ marginBottom: 16 }}>
          <List
            dataSource={requests}
            renderItem={(r) => (
              <List.Item>
                <div>
                  <b>{REQUEST_TYPE_LABELS[r.type] || r.type}</b> · ngày {formatDate(r.desiredDate)}
                  {r.note && <div className="cell-sub">{r.note}</div>}
                  {r.responseNote && <div className="cell-sub">Chủ nhà: {r.responseNote}</div>}
                </div>
                <Tag color={REQUEST_STATUS[r.status]?.color}>{REQUEST_STATUS[r.status]?.text || r.status}</Tag>
              </List.Item>
            )}
          />
        </Card>
      )}
      {contract?.deposits?.length > 0 && (
        <Card title="Tiền cọc" variant="borderless" style={{ marginBottom: 16 }}>
          {contract.deposits.map((d, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Tag color={DEPOSIT_STATUS[d.status]?.color}>{DEPOSIT_STATUS[d.status]?.text || d.status}</Tag>
              {formatVND(d.amount)}
              {d.status !== 'held' && <> · đã hoàn {formatVND(d.refundedAmount)} · khấu trừ {formatVND(d.deductedAmount)}</>}
              {d.note && <div className="cell-sub">{d.note}</div>}
            </div>
          ))}
        </Card>
      )}

      {/* CONTRACT CARD */}
      <Card className="doc-card" variant="borderless">
        <div className="doc-status">
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

        <div className="doc-head">
          <div className="info-icon">
            <FileSignature size={22} aria-hidden="true" />
          </div>
          <div className="doc-head-main">
            <h2 className="doc-title">Hợp đồng thuê phòng</h2>
            <span className="code-chip">Mã số: HĐ-{contract.id}-{room.roomNumber}</span>
          </div>
        </div>

        <Divider className="doc-divider" />

        {/* SECTION 1: CÁC BÊN THAM GIA */}
        <section className="doc-section">
          <h3 className="section-title">1. Các bên ký kết</h3>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className="party-box">
                <div className="party-role landlord">Bên cho thuê (Chủ nhà)</div>
                <div className="party-name">{contract.landlordName || landlord?.name || 'N/A'}</div>
                <div className="party-meta">SĐT: {contract.landlordPhone || landlord?.phone || 'N/A'}</div>
                <div className="party-meta">CCCD: {contract.landlordCccd || 'N/A'}</div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="party-box">
                <div className="party-role tenant">Bên thuê (Khách thuê)</div>
                <div className="party-name">{contract.tenantName || profile?.name || 'N/A'}</div>
                <div className="party-meta">SĐT: {contract.tenantPhone || profile?.phone || 'N/A'}</div>
                <div className="party-meta">CCCD: {contract.tenantCccd || 'N/A'}</div>
              </div>
            </Col>
          </Row>
        </section>

        {/* SECTION 2: THÔNG TIN PHÒNG & THỜI HẠN */}
        <section className="doc-section">
          <h3 className="section-title">2. Thông tin phòng &amp; Thời hạn thuê</h3>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8}>
              <div className="info-cell">
                <div className="info-label">Phòng thuê</div>
                <div className="info-value">Phòng {room.roomNumber}</div>
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <div className="info-cell">
                <div className="info-label">Tòa nhà</div>
                <div className="info-value">{building.name}</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="info-cell">
                <div className="info-label">Giá thuê phòng</div>
                <div className="info-value text-danger">{formatVND(contract.rentPrice ?? room.price)}/tháng</div>
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <div className="info-cell">
                <div className="info-label">Tiền đặt cọc</div>
                <div className="info-value">{formatVND(contract.deposit)}</div>
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <div className="info-cell">
                <div className="info-label">Ngày bắt đầu</div>
                <div className="info-value">{formatDate(contract.startDate)}</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="info-cell">
                <div className="info-label">Ngày hết hạn</div>
                <div className="info-value">{formatDate(contract.endDate)}</div>
              </div>
            </Col>
          </Row>
        </section>

        {/* SECTION 3: BẢNG GIÁ DỊCH VỤ THỎA THUẬN */}
        <section className="doc-section">
          <h3 className="section-title">3. Đơn giá dịch vụ</h3>
          <div className="price-table">
            <div className="price-head">
              <span>Dịch vụ</span>
              <span>Đơn giá thỏa thuận</span>
            </div>

            <div className="price-row">
              <span className="price-name">
                <Zap size={15} aria-hidden="true" /> Tiền điện
              </span>
              <span className="price-value">
                {formatVND(contract.electricityPrice)} / kWh
                <span className="price-note">Bắt đầu: {contract.initialElectricity} kWh</span>
              </span>
            </div>

            <div className="price-row">
              <span className="price-name">
                <Droplets size={15} aria-hidden="true" /> Tiền nước
              </span>
              <span className="price-value">
                {formatVND(contract.waterPrice)} / m³
                <span className="price-note">Bắt đầu: {contract.initialWater} m³</span>
              </span>
            </div>

            <div className="price-row">
              <span className="price-name">
                <Wifi size={15} aria-hidden="true" /> Mạng Internet
              </span>
              <span className="price-value">{formatVND(contract.internetPrice)} / tháng</span>
            </div>

            <div className="price-row">
              <span className="price-name">
                <Sparkles size={15} aria-hidden="true" /> Phí dịch vụ &amp; Vệ sinh chung
              </span>
              <span className="price-value">{formatVND(contract.cleaningPrice)} / tháng</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: NỘI QUY & CAM KẾT CHUNG */}
        <section className="doc-section">
          <h3 className="section-title">4. Nội quy tòa nhà &amp; Cam kết</h3>
          <ul className="rule-list">
            <li className="rule-item">
              <CheckSquare size={15} aria-hidden="true" />
              <span>Đóng tiền phòng đúng kỳ hạn thỏa thuận hàng tháng.</span>
            </li>
            <li className="rule-item">
              <CheckSquare size={15} aria-hidden="true" />
              <span>Giữ gìn vệ sinh chung, vứt rác đúng nơi quy định, hạn chế làm ồn sau 23:00.</span>
            </li>
            <li className="rule-item">
              <CheckSquare size={15} aria-hidden="true" />
              <span>Không tự ý cải tạo kết cấu phòng, đục tường khoan lỗ khi chưa xin phép chủ nhà.</span>
            </li>
            <li className="rule-item">
              <CheckSquare size={15} aria-hidden="true" />
              <span>Tuân thủ khai báo tạm trú tạm vắng theo đúng quy định pháp luật.</span>
            </li>
          </ul>
        </section>

        <Divider className="doc-divider" />

        {/* SECTION 5: XÁC NHẬN KÝ SỐ 2 BÊN */}
        <section className="doc-section doc-section-last">
          <h3 className="section-title">5. Chữ ký điện tử của các bên ký kết</h3>

          <Row gutter={[16, 16]}>
            {/* BÊN A */}
            <Col xs={24} sm={12}>
              <div className="sign-box">
                <div className="sign-role">Bên cho thuê (Chủ nhà)</div>
                {contract.landlordSignature ? (
                  <>
                    <div className="sign-image">
                      <img src={contract.landlordSignature} alt="Chữ ký Bên A" />
                    </div>
                    <div className="sign-status ok">Đã ký số ({formatDate(contract.landlordSignedAt)})</div>
                  </>
                ) : (
                  <div className="sign-box-empty">Chưa cập nhật chữ ký</div>
                )}
                <div className="sign-name">{contract.landlordName || landlord?.name || 'N/A'}</div>
              </div>
            </Col>

            {/* BÊN B */}
            <Col xs={24} sm={12}>
              <div className={`sign-box ${isViewingPending ? 'is-pending' : ''}`}>
                <div className="sign-role">Bên thuê (Khách thuê)</div>

                {(hasActiveContract || isTerminated) && contract.tenantSignature ? (
                  <>
                    <div className="sign-image">
                      <img src={contract.tenantSignature} alt="Chữ ký Bên B" />
                    </div>
                    <div className="sign-status ok">Đã ký số ({formatDate(contract.tenantSignedAt)})</div>
                  </>
                ) : isTerminated ? (
                  <div className="sign-box-empty">Hợp đồng đã thanh lý</div>
                ) : (
                  <div className="sign-pending">
                    <p className="sign-pending-text">Hợp đồng chưa được ký bởi Bên B.</p>
                    <div className="sign-pending-actions">
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
                )}

                <div className="sign-name">{contract.tenantName || profile?.name || 'N/A'}</div>
              </div>
            </Col>
          </Row>
        </section>

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
        title={
          <span className="modal-title-danger">
            <AlertTriangle size={18} aria-hidden="true" /> Từ chối ký hợp đồng thuê phòng
          </span>
        }
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRejectModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="reject"
            type="primary"
            danger
            loading={rejectLoading}
            onClick={handleRejectContract}
          >
            Xác nhận từ chối
          </Button>
        ]}
        width={450}
        centered
      >
        <p className="modal-note">
          Bạn có chắc chắn muốn từ chối ký hợp đồng này? Vui lòng nhập lý do từ chối để thông báo tới chủ nhà:
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do từ chối (Ví dụ: Đơn giá không đúng thỏa thuận, thông tin phòng sai...)"
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

    </div>
  );
};

const REQUEST_TYPE_LABELS = { move_out: 'Báo trả phòng', renewal: 'Đề nghị gia hạn' };
const REQUEST_STATUS = {
  pending: { color: 'gold', text: 'Chờ duyệt' },
  approved: { color: 'green', text: 'Đã đồng ý' },
  rejected: { color: 'red', text: 'Bị từ chối' }
};
const DEPOSIT_STATUS = {
  held: { color: 'blue', text: 'Đang giữ' },
  refunded: { color: 'green', text: 'Đã hoàn' },
  deducted: { color: 'orange', text: 'Khấu trừ' },
  forfeited: { color: 'red', text: 'Mất cọc' }
};

export default TenantContract;
