import { Drawer, Empty, Card, Space, Tag, Button } from 'antd';
import { FileSignature } from 'lucide-react';

const BOOKING_STATUS_MAP = {
  pending: { color: 'gold', text: 'Chờ xác nhận' },
  confirmed: { color: 'cyan', text: 'Đã duyệt lịch hẹn' },
  deposit_paid: { color: 'green', text: 'Đã nhận tiền cọc' },
  deposit_conflict: { color: 'volcano', text: 'Trùng giữ chỗ - Chờ hoàn cọc' },
  contract_created: { color: 'blue', text: 'Đã lập hợp đồng' },
  rejected: { color: 'red', text: 'Đã từ chối' },
  cancelled: { color: 'default', text: 'Đã hủy' },
};

const BookingsDrawer = ({
  open,
  onClose,
  width,
  bookings,
  bookingActionId,
  onUpdateBookingStatus,
  onCreateContractFromBooking,
  formatVND,
}) => (
  <Drawer
    title="Lịch xem phòng & Đặt cọc giữ phòng"
    open={open}
    onClose={onClose}
    width={width}
  >
    {bookings.length === 0 ? (
      <Empty description="Chưa có lịch hẹn xem phòng hay yêu cầu đặt cọc nào từ trang công khai." />
    ) : (
      <div style={{ display: 'grid', gap: 12 }}>
        {bookings.map((b) => {
          const st = BOOKING_STATUS_MAP[b.status] || { color: 'default', text: b.status };
          const roomNum = b.room?.roomNumber || b.roomId;
          const bldName = b.building?.name || b.room?.building?.name || '';
          const dateVal = b.type === 'viewing' ? b.viewingDate : b.moveInDate;
          const isBusy = bookingActionId === b.id;

          return (
            <Card key={b.id} size="small" data-testid={`booking-item-${b.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Space size={6} wrap style={{ marginBottom: 6 }}>
                    <Tag color={b.type === 'deposit' ? 'purple' : 'geekblue'}>
                      {b.type === 'deposit' ? 'Đặt cọc giữ phòng' : 'Đặt lịch xem phòng'}
                    </Tag>
                    <Tag color={st.color}>{st.text}</Tag>
                    {b.paymentStatus === 'reported' && b.status === 'pending' && (
                      <Tag color="orange">Khách báo đã chuyển khoản</Tag>
                    )}
                  </Space>

                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                    {b.guestName} · {b.guestPhone}
                  </div>
                  <div style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>
                    Phòng <strong>{roomNum}</strong>
                    {bldName ? ` — ${bldName}` : ''}
                  </div>
                  {dateVal && (
                    <div style={{ color: '#475569', fontSize: 13 }}>
                      {b.type === 'viewing' ? 'Ngày xem dự kiến:' : 'Ngày dự kiến vào ở:'}{' '}
                      {new Date(dateVal).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {b.type === 'deposit' && (
                    <div style={{ color: '#0f766e', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                      Tiền cọc: {formatVND(b.depositAmount)} {b.transferCode ? `· Mã CK: ${b.transferCode}` : ''}
                    </div>
                  )}
                  {b.note && (
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                      Ghi chú: {b.note}
                    </div>
                  )}
                </div>

                <Space wrap>
                  {b.type === 'viewing' && b.status === 'pending' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={isBusy}
                      onClick={() => onUpdateBookingStatus(b.id, 'confirmed')}
                    >
                      Duyệt lịch hẹn
                    </Button>
                  )}
                  {b.type === 'deposit' && b.status === 'pending' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={isBusy}
                      onClick={() => onUpdateBookingStatus(b.id, 'deposit_paid')}
                    >
                      Xác nhận đã nhận cọc
                    </Button>
                  )}
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <Button
                      size="small"
                      danger
                      loading={isBusy}
                      onClick={() => onUpdateBookingStatus(b.id, 'rejected')}
                    >
                      Từ chối
                    </Button>
                  )}
                  {(b.status === 'confirmed' || b.status === 'deposit_paid') && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<FileSignature size={14} aria-hidden="true" />}
                      onClick={() => onCreateContractFromBooking(b)}
                    >
                      Lập hợp đồng
                    </Button>
                  )}
                </Space>
              </div>
            </Card>
          );
        })}
      </div>
    )}
  </Drawer>
);

export default BookingsDrawer;
