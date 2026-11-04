// Dữ liệu mock thực tế dùng chung cho e2e responsive (và các spec khác muốn tái sử dụng).
// Key = "METHOD /path" (path sau /api, không kèm query string).

const now = new Date();
const M = now.getMonth() + 1;
const Y = now.getFullYear();
const pad = (n) => String(n).padStart(2, '0');
const prevPeriod = M === 1 ? `${Y - 1}-12` : `${Y}-${pad(M - 1)}`;
const iso = (d) => new Date(d).toISOString();

export const buildings = [
  { id: 1, name: 'Tòa nhà Sunrise Riverside Quận 7', address: '123 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh', createdAt: iso('2025-01-10'),
    service: { electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000 } },
  { id: 2, name: 'Nhà trọ Hoa Sen', address: '45 Lê Văn Việt, TP. Thủ Đức', createdAt: iso('2025-03-02'),
    service: { electricityPrice: 3800, waterPrice: 18000, internetPrice: 80000, cleaningPrice: 30000 } },
  { id: 3, name: 'Căn hộ dịch vụ Green Home', address: '9 Phan Xích Long, Phú Nhuận', createdAt: iso('2025-06-20'), service: null },
];

const tenantsBase = [
  { id: 11, name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@example.com', telegramChatId: '123456', status: 'ACTIVE', createdAt: iso('2025-02-01') },
  { id: 12, name: 'Trần Thị Bích Ngọc Phương', phone: '0912345678', email: 'ngoc.tran@example.com', telegramChatId: null, status: 'ACTIVE', createdAt: iso('2025-04-11') },
  { id: 13, name: 'Lê Hoàng Minh', phone: '0987654321', email: 'minh.le@example.com', telegramChatId: null, status: 'LOCKED', lockReason: 'Nợ tiền phòng', createdAt: iso('2025-05-15') },
];

const room = (id, buildingId, roomNumber, status, extra = {}) => ({
  id, buildingId, roomNumber, status, price: 3500000 + id * 100000, area: 25, capacity: 3,
  building: buildings.find((b) => b.id === buildingId),
  readings: [
    { id: id * 10 + 1, type: 'electricity', period: prevPeriod, readingValue: 1200 + id },
    { id: id * 10 + 2, type: 'water', period: prevPeriod, readingValue: 300 + id },
  ],
  invoices: [], contracts: [], ...extra,
});

export const rooms = [
  room(101, 1, 'A101', 'occupied', { contracts: [{ id: 501, status: 'active', tenant: tenantsBase[0] }] }),
  room(102, 1, 'A102', 'occupied', { contracts: [{ id: 502, status: 'active', tenant: tenantsBase[1] }], invoices: [{ id: 901, month: M, year: Y }] }),
  room(103, 1, 'A103', 'empty'),
  room(201, 2, 'B201', 'occupied', { contracts: [{ id: 503, status: 'active', tenant: tenantsBase[2] }] }),
  room(202, 2, 'B202', 'empty'),
  room(301, 3, 'C301', 'empty'),
];

const contract = (id, roomId, tenant, status, extra = {}) => {
  const r = rooms.find((x) => x.id === roomId);
  return {
    id, roomId, status, startDate: iso('2025-03-01'), endDate: iso('2026-12-31'),
    rentPrice: r.price, deposit: 5000000, electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000,
    initialElectricity: 1000, initialWater: 200,
    tenant, tenantName: tenant.name, tenantPhone: tenant.phone, tenantCccd: '079123456789',
    landlordName: 'E2E landlord', landlordPhone: '0909000111', landlordCccd: '079000111222',
    landlordSignature: null, tenantSignature: null, landlordSignedAt: iso('2025-02-28'), tenantSignedAt: null,
    room: { id: r.id, roomNumber: r.roomNumber, price: r.price, building: r.building },
    deposits: [{ id: id, amount: 5000000, status: 'held', deductedAmount: 0, refundedAmount: 0, note: '' }],
    occupants: [], ...extra,
  };
};

export const contracts = [
  contract(501, 101, tenantsBase[0], 'active'),
  contract(502, 102, tenantsBase[1], 'active'),
  contract(503, 201, tenantsBase[2], 'pending_tenant_signature'),
  contract(504, 103, tenantsBase[0], 'rejected'),
  contract(505, 202, tenantsBase[1], 'cancelled'),
  contract(506, 301, tenantsBase[2], 'expired'),
];

export const tenants = tenantsBase.map((t, i) => ({
  ...t, rentals: [{ id: 501 + i, occupants: [{ id: 700 + i, fullName: 'Phạm Thị Hồng', relation: 'Vợ', cccd: '079222333444', isPrimary: false }] }],
}));

export const occupants = [
  { id: 701, fullName: 'Nguyễn Văn An', relation: 'Chủ hợp đồng', cccd: '079123456789', isPrimary: true, residenceStatus: 'registered', registeredAt: iso('2025-03-05') },
  { id: 702, fullName: 'Phạm Thị Hồng', relation: 'Vợ', cccd: '079222333444', isPrimary: false, residenceStatus: 'pending', registeredAt: null },
];

const invoice = (id, roomId, isPaid, monthOffset = 0, extra = {}) => {
  const r = rooms.find((x) => x.id === roomId);
  const m = ((M - 1 - monthOffset + 12) % 12) + 1;
  return {
    id, contractId: r.contracts[0]?.id ?? 501, month: m, year: m > M ? Y - 1 : Y, isPaid, totalAmount: 4285000 + id,
    paymentMethod: isPaid ? 'bank' : null, createdAt: iso(now), dueDate: iso(now),
    roomDetails: { id: r.id, roomNumber: r.roomNumber, building: r.building },
    rentAmount: r.price, electricityUsage: 120, electricityAmount: 420000, waterUsage: 5, waterAmount: 100000,
    internetAmount: 100000, cleaningAmount: 50000, ...extra,
  };
};

export const invoices = [
  invoice(901, 102, true), invoice(902, 101, false), invoice(903, 201, false, 1), invoice(904, 101, true, 1), invoice(905, 102, true, 2),
];

export const supportRequests = [
  { id: 31, category: 'electric', severity: 'high', status: 'pending', description: 'Ổ cắm phòng ngủ bị chập, có mùi khét khi cắm sạc điện thoại vào buổi tối.', images: [], createdAt: iso(now), room: { roomNumber: 'A101', building: buildings[0] } },
  { id: 32, category: 'water', severity: 'medium', status: 'in_progress', description: 'Vòi sen rò rỉ', images: [], landlordNote: 'Đã gọi thợ', createdAt: iso('2026-09-01'), room: { roomNumber: 'A102', building: buildings[0] } },
  { id: 33, category: 'internet', severity: 'low', status: 'resolved', description: 'Wifi chập chờn', images: [], landlordNote: 'Thay router', repairCost: 350000, createdAt: iso('2026-08-12'), room: { roomNumber: 'B201', building: buildings[1] } },
];

export const contractRequests = [
  { id: 41, type: 'move_out', status: 'pending', contractId: 501, desiredDate: iso('2026-12-01'), note: 'Chuyển công tác', shortNotice: false, tenant: tenantsBase[0], contract: { room: { roomNumber: 'A101', building: buildings[0] } }, createdAt: iso(now) },
  { id: 42, type: 'renew', status: 'approved', contractId: 502, desiredDate: iso('2027-01-01'), note: '', responseNote: 'OK', tenant: tenantsBase[1], contract: { room: { roomNumber: 'A102', building: buildings[0] } }, createdAt: iso('2026-09-10') },
];

export const plans = [
  { id: 1, name: 'FREE', price: 0, annualPrice: 0, maxBuildings: 1, maxRoomsPerBuilding: 10, maxAICallsPerMonth: 10 },
  { id: 2, name: 'BASIC', price: 199000, annualPrice: 1990000, maxBuildings: 3, maxRoomsPerBuilding: 30, maxAICallsPerMonth: 100 },
  { id: 3, name: 'PRO', price: 499000, annualPrice: 4990000, maxBuildings: 20, maxRoomsPerBuilding: 200, maxAICallsPerMonth: 1000 },
];

export const landlords = [
  { id: 201, name: 'Phạm Quốc Bảo', email: 'bao.pham.landlord.verylongemail@example.com', phone: '0901112223', status: 'ACTIVE', plan: 'PRO', portfolio: '5 Tòa / 120 Phòng', date: '12/01/2025' },
  { id: 202, name: 'Võ Thị Mai', email: 'mai.vo@example.com', phone: '0903334445', status: 'LOCKED', lockReason: 'Vi phạm điều khoản', plan: 'FREE', portfolio: '1 Tòa / 8 Phòng', date: '03/04/2025' },
  { id: 203, name: 'Đặng Minh Tuấn', email: 'tuan.dang@example.com', phone: '0905556667', status: 'ACTIVE', plan: 'BASIC', portfolio: '2 Tòa / 30 Phòng', date: '20/06/2025' },
];

export const adminStats = {
  stats: { totalRevenue: 12450000, landlordCount: 3 },
  packages: { total: 3, pro: 1, basic: 1, free: 1 },
  recentActivity: [
    { action: 'UPDATE_PLAN', label: 'Nâng cấp gói PRO', sub: 'Phạm Quốc Bảo (bao.pham.landlord.verylongemail@example.com)', time: '2 giờ trước' },
    { action: 'LOCK_USER', label: 'Khóa tài khoản', sub: 'Võ Thị Mai', time: 'Hôm qua' },
    { action: 'UNLOCK_USER', label: 'Mở khóa tài khoản', sub: 'Đặng Minh Tuấn', time: '3 ngày trước' },
  ],
};

export const adminLogs = {
  total: 3,
  items: [
    { id: 1, action: 'LOCK_USER', createdAt: iso(now), admin: { name: 'Super Admin', email: 'admin@example.com' }, description: 'Khóa tài khoản chủ nhà Võ Thị Mai vì vi phạm điều khoản sử dụng dịch vụ nhiều lần liên tiếp' },
    { id: 2, action: 'UNLOCK_USER', createdAt: iso('2026-10-01'), admin: { name: 'Super Admin', email: 'admin@example.com' }, description: 'Mở khóa Đặng Minh Tuấn' },
    { id: 3, action: 'UPDATE_PLAN', createdAt: iso('2026-09-20'), admin: null, description: 'Đổi gói BASIC → PRO' },
  ],
};

export const tickets = [
  { id: 61, createdAt: iso(now), email: 'bao.pham@example.com', title: 'Khiếu nại khóa tài khoản', message: 'Tôi đã thanh toán đầy đủ nhưng tài khoản vẫn bị khóa, mong admin kiểm tra lại giúp.', status: 'pending', landlord: { name: 'Phạm Quốc Bảo', phone: '0901112223' } },
  { id: 62, createdAt: iso('2026-09-02'), email: 'mai.vo@example.com', title: 'Yêu cầu nâng cấp', message: 'Nâng cấp gói', status: 'resolved', landlord: { name: 'Võ Thị Mai' } },
  { id: 63, createdAt: iso('2026-08-02'), email: 'x@example.com', title: 'Spam', message: '...', status: 'rejected', landlord: null },
];

export const notifications = [
  { id: 1, title: 'Hóa đơn mới', content: 'Hóa đơn tháng này đã được tạo.', isRead: false, createdAt: iso(now) },
  { id: 2, title: 'Sự cố đã xử lý', content: 'Wifi đã được sửa.', isRead: true, createdAt: iso('2026-09-01') },
];

export const invoiceStatus = { stats: { totalExpected: 21500000, totalCollected: 12800000, unpaidAmount: 8700000, unpaidRooms: 2, invoiceCount: 5 } };

export const landlordProfile = { id: 7, name: 'E2E landlord', email: 'landlord@example.com', phone: '0909000111', plan: 'BASIC', planExpiresAt: iso('2026-12-31') };

const activeContract = contracts[0];
export const tenantSummary = {
  hasActiveContract: true, hasPendingContract: false, pendingContractIds: [],
  profile: { id: 11, name: 'Nguyễn Văn An', phone: '0901234567', telegramChatId: null },
  room: rooms[0], building: buildings[0],
  landlord: { name: 'E2E landlord', phone: '0909000111', email: 'landlord@example.com' },
  contract: activeContract,
  contracts: [activeContract, contracts[3]],
  invoices: invoices.filter((i) => i.roomDetails.id === 101),
  supportRequests,
};

// Map handler mặc định: "METHOD /path" → body
export const responsiveFixtures = {
  'GET /notifications': notifications,
  'GET /admin/stats': adminStats,
  'GET /admin/landlords': landlords,
  'GET /admin/plans': plans,
  'GET /admin/logs': adminLogs,
  'GET /admin/tickets': tickets,
  'GET /auth/plans': plans,
  'GET /auth/profile': landlordProfile,
  'GET /sepay/config': { bankId: 'MB', bankAccount: '0123456789', bankName: 'MB Bank' },
  'GET /manage/buildings': buildings,
  'GET /manage/rooms': rooms,
  'GET /manage/tenants': tenants,
  'GET /manage/support-requests': supportRequests,
  'GET /contracts': contracts,
  'GET /contracts/requests': contractRequests,
  'GET /invoices': invoices,
  'GET /invoices/status': invoiceStatus,
  'GET /tenant/summary': tenantSummary,
  'GET /tenant/invoices': invoices.slice(0, 3),
  'GET /tenant/requests': contractRequests.slice(0, 1),
  'GET /tenant/support': supportRequests,
};

// Route động: /contracts/:id/occupants, /tenant/contract/:id/occupants, /deposits/contract/:id
export function fixtureFor(method, path) {
  const key = `${method} ${path}`;
  if (key in responsiveFixtures) return responsiveFixtures[key];
  if (method === 'GET' && /\/occupants$/.test(path)) return occupants;
  if (method === 'GET' && /^\/deposits\/contract\/\d+$/.test(path)) return activeContract.deposits;
  return method === 'GET' ? [] : { message: 'OK' };
}
