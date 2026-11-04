/**
 * Logic thuần cho khung chat trợ lý ảo.
 * Tách khỏi component để test được bằng `node --test` mà không cần môi trường trình duyệt.
 *
 * Các giới hạn dưới đây phải khớp với backend (src/services/chatService.js):
 * MAX_MESSAGES = 10, MAX_CONTENT_LENGTH = 1000.
 */

// Số tin nhắn tối đa gửi kèm mỗi lượt hỏi — backend chỉ nhận 10 tin gần nhất
export const MAX_HISTORY = 10;

// Độ dài tối đa của một câu hỏi — khớp MAX_CONTENT_LENGTH của backend
export const MAX_MESSAGE_LENGTH = 1000;

// Lời chào mở đầu, khác nhau theo vai trò để gợi ý đúng thứ người dùng quan tâm
const WELCOME_BY_ROLE = {
  tenant: 'Xin chào! Tôi có thể giúp bạn tra cứu phòng đang thuê, hóa đơn và hợp đồng của bạn.',
  landlord: 'Xin chào! Tôi có thể giúp bạn xem tình hình tòa nhà, phòng trống và doanh thu.',
  admin: 'Xin chào! Tôi có thể hướng dẫn bạn cách sử dụng các tính năng quản trị hệ thống.',
};

/**
 * Kiểm tra câu hỏi trước khi gửi.
 * @returns {{ok: true, value: string} | {ok: false, error: string}}
 */
export function validateQuestion(input) {
  const value = typeof input === 'string' ? input.trim() : '';

  if (!value) {
    return { ok: false, error: 'Vui lòng nhập câu hỏi.' };
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Câu hỏi tối đa ${MAX_MESSAGE_LENGTH} ký tự.` };
  }
  return { ok: true, value };
}

/**
 * Thêm tin nhắn vào lịch sử, chỉ giữ MAX_HISTORY tin gần nhất.
 * Trả về mảng mới, không sửa mảng đầu vào.
 */
export function appendMessage(history, message) {
  const next = [...(Array.isArray(history) ? history : []), message];
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
}

/**
 * Chuyển lỗi từ axios thành thông báo tiếng Việt hiển thị cho người dùng.
 * Ưu tiên thông báo server trả về (ví dụ khi bị giới hạn tần suất).
 */
export function errorMessage(error) {
  const fromServer = error?.response?.data?.message;
  if (typeof fromServer === 'string' && fromServer.trim()) {
    return fromServer;
  }
  return 'Không kết nối được trợ lý. Vui lòng kiểm tra mạng và thử lại.';
}

/** Lời chào theo vai trò; vai trò không xác định dùng câu mặc định. */
export function welcomeMessage(role) {
  const key = typeof role === 'string' ? role.toLowerCase() : '';
  return WELCOME_BY_ROLE[key] || WELCOME_BY_ROLE.admin;
}

// Gợi ý mở đầu — mỗi vai trò chỉ hỏi được về dữ liệu của chính mình (admin hỏi hướng dẫn sử dụng hệ thống)
const SUGGESTIONS_BY_ROLE = {
  tenant: ['Hóa đơn nào tôi chưa thanh toán?', 'Hợp đồng của tôi khi nào hết hạn?', 'Yêu cầu hỗ trợ của tôi đang xử lý chưa?'],
  landlord: ['Tòa nhà của tôi còn bao nhiêu phòng trống?', 'Doanh thu tháng này thế nào?', 'Có yêu cầu hỗ trợ nào chưa xử lý?'],
  admin: [
    'Hướng dẫn cách duyệt yêu cầu nâng cấp gói dịch vụ?',
    'Làm sao để khóa hoặc mở khóa tài khoản chủ nhà?',
    'Cách xử lý phiếu hỗ trợ trong trang Quản trị?',
  ],
};

/** Danh sách câu hỏi gợi ý theo vai trò (trả về mảng mới mỗi lần gọi). */
export function suggestionsForRole(role) {
  const key = typeof role === 'string' ? role.toLowerCase() : '';
  return [...(SUGGESTIONS_BY_ROLE[key] || SUGGESTIONS_BY_ROLE.admin)];
}

// ─── Thẻ xác nhận hành động (pendingAction từ bot) ──────────────────────────

// Nhãn tiếng Việt cho từng tool; tool không nằm ở đây sẽ không hiện thẻ
const ACTION_LABELS = {
  create_room: { title: 'Tạo phòng mới' },
  update_room: { title: 'Cập nhật phòng' },
  delete_room: { title: 'Xóa phòng' },
  create_building: { title: 'Tạo tòa nhà mới' },
  delete_building: { title: 'Xóa tòa nhà' },
  update_meter_readings: { title: 'Chốt số điện nước' },
  generate_invoice: { title: 'Xuất hóa đơn' },
  update_invoice_payment: { title: 'Cập nhật thanh toán' },
  cancel_contract: { title: 'Hủy hợp đồng chờ ký' },
  terminate_contract: { title: 'Thanh lý hợp đồng' },
  update_support_status: { title: 'Cập nhật trạng thái sửa chữa' },
  create_support_request: { title: 'Gửi báo sự cố' },
};

/** Tiêu đề thẻ xác nhận theo tool. Tool lạ -> null (không hiện thẻ). */
export function actionCardLabels(tool) {
  const entry = ACTION_LABELS[tool];
  return entry ? { ...entry } : null;
}

const formatVND = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

/**
 * Các dòng tóm tắt thông số hiển thị trên thẻ xác nhận.
 * Tham số thiếu -> ẩn dòng (không hiện "undefined").
 * Tool lạ -> mảng rỗng.
 */
export function formatActionSummary(tool, params = {}) {
  const has = (k) => params[k] != null && params[k] !== '';
  const rows = [];
  const push = (label, value) => rows.push({ label, value });

  switch (tool) {
    case 'create_room':
    case 'update_room': {
      const priceLabel = tool === 'create_room' ? 'Giá thuê' : 'Giá thuê mới';
      if (has('roomId')) push('ID phòng', String(params.roomId));
      if (has('roomNumber')) push('Số phòng', String(params.roomNumber));
      if (has('price')) push(priceLabel, `${formatVND(params.price)} VND/tháng`);
      if (has('buildingId')) push('Tòa nhà (ID)', String(params.buildingId));
      if (has('capacity')) push('Sức chứa', `${params.capacity} người`);
      if (has('area')) push('Diện tích', `${params.area} m²`);
      if (has('status')) push('Trạng thái mới', params.status === 'empty' ? 'Trống' : 'Bảo trì');
      return rows;
    }
    case 'delete_room':
    case 'delete_building': {
      if (has('roomId')) push('ID phòng', String(params.roomId));
      if (has('buildingId')) push('ID tòa nhà', String(params.buildingId));
      return rows;
    }
    case 'create_building':
      if (has('name')) push('Tên tòa nhà', String(params.name));
      if (has('address')) push('Địa chỉ', String(params.address));
      return rows;
    case 'update_meter_readings':
      if (has('roomId')) push('ID phòng', String(params.roomId));
      if (has('electricityValue')) push('Chỉ số điện', `${formatVND(params.electricityValue)} kWh`);
      if (has('waterValue')) push('Chỉ số nước', `${formatVND(params.waterValue)} m³`);
      if (has('period')) push('Kỳ', String(params.period));
      return rows;
    case 'generate_invoice':
      if (has('roomId')) push('ID phòng', String(params.roomId));
      if (has('month') && has('year')) push('Kỳ hóa đơn', `${params.month}/${params.year}`);
      return rows;
    case 'update_invoice_payment':
      if (has('invoiceId')) push('ID hóa đơn', String(params.invoiceId));
      if (has('isPaid')) push('Trạng thái', params.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán');
      return rows;
    case 'cancel_contract':
    case 'terminate_contract':
      if (has('contractId')) push('ID hợp đồng', String(params.contractId));
      if (has('finalElectricity')) push('Chỉ số điện cuối', `${formatVND(params.finalElectricity)} kWh`);
      if (has('finalWater')) push('Chỉ số nước cuối', `${formatVND(params.finalWater)} m³`);
      if (has('terminationDate')) push('Ngày trả phòng', String(params.terminationDate));
      if (has('damageAmount')) push('Tiền hư hỏng', `${formatVND(params.damageAmount)} VND`);
      if (has('forfeitDeposit')) push('Quyết toán cọc', params.forfeitDeposit ? 'Mất cọc' : 'Hoàn cọc theo công nợ');
      if (has('note')) push('Ghi chú', String(params.note));
      return rows;
    case 'update_support_status':
      if (has('requestId')) push('ID yêu cầu', String(params.requestId));
      if (has('status')) push('Trạng thái mới', { pending: 'Chờ duyệt', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết' }[params.status] || params.status);
      return rows;
    case 'create_support_request': {
      const sev = { low: 'Thông thường', medium: 'Khá nghiêm trọng', high: 'Khẩn cấp' };
      if (has('description')) push('Mô tả', String(params.description));
      if (has('severity')) push('Mức độ', sev[params.severity] || params.severity);
      return rows;
    }
    default:
      return rows;
  }
}
