/**
 * Logic thuần cho màn quản lý hợp đồng (ContractManager) và chốt số (UtilityManagement).
 * Tách riêng để unit test bằng node:test.
 */
import { normalizeText } from './supportRequests.js';

const DAY_MS = 86400000;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/**
 * Khóa lọc của một HĐ: trạng thái DB, cộng khóa ảo 'expiring' (còn ≤ 7 ngày)
 * hoặc 'overdue' (đã qua endDate) cho HĐ đang active.
 */
export const contractFilterKeys = (contract, today = new Date()) => {
  const keys = [contract?.status];
  if (contract?.status === 'active' && contract.endDate) {
    const days = Math.round((startOfDay(contract.endDate) - startOfDay(today)) / DAY_MS);
    if (days < 0) keys.push('overdue');
    else if (days <= 7) keys.push('expiring');
  }
  return keys;
};

/** Lọc theo ô tìm kiếm (tên/SĐT khách, số phòng), tòa nhà và danh sách trạng thái. */
export const filterContracts = (list, { search, buildingId, statuses } = {}, today = new Date()) => {
  const q = normalizeText(search);
  const wanted = Array.isArray(statuses) && statuses.length ? statuses : null;
  return (Array.isArray(list) ? list : []).filter((c) => {
    if (buildingId != null && buildingId !== '' && c.room?.building?.id !== buildingId) return false;
    if (wanted && !contractFilterKeys(c, today).some((k) => wanted.includes(k))) return false;
    if (!q) return true;
    const haystack = [c.tenantName, c.tenant?.name, c.tenantPhone, c.tenant?.phone, c.room?.roomNumber]
      .map(normalizeText)
      .join(' ');
    return haystack.includes(q);
  });
};

/** Sorter cột thời hạn: endDate tăng dần, HĐ thiếu endDate xuống cuối. */
export const compareEndDate = (a, b) => {
  const ea = a?.endDate ? new Date(a.endDate).getTime() : Infinity;
  const eb = b?.endDate ? new Date(b.endDate).getTime() : Infinity;
  if (ea === eb) return 0;
  return ea < eb ? -1 : 1;
};

/** Đọc danh sách bàn giao an toàn: chuỗi JSON hỏng hoặc không phải mảng trả []. */
export const parseInventory = (inventory) => {
  if (Array.isArray(inventory)) return inventory;
  if (typeof inventory !== 'string' || !inventory) return [];
  try {
    const parsed = JSON.parse(inventory);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Thống kê số lượng hợp đồng theo trạng thái (T3.2). */
export const contractStats = (list, today = new Date()) => {
  const stats = { total: 0, active: 0, expiring: 0, overdue: 0, pending: 0, ended: 0 };
  if (!Array.isArray(list)) return stats;
  for (const c of list) {
    stats.total++;
    const keys = contractFilterKeys(c, today);
    if (c?.status === 'active') {
      stats.active++;
      if (keys.includes('expiring')) stats.expiring++;
      if (keys.includes('overdue')) stats.overdue++;
    } else if (c?.status === 'pending_tenant_signature') {
      stats.pending++;
    } else if (['terminated', 'renewed', 'cancelled', 'rejected'].includes(c?.status)) {
      stats.ended++;
    }
  }
  return stats;
};

/** T1.8: Đóng gói dữ liệu gửi lên preview / thanh lý hợp đồng (hỗ trợ allowDebt). */
export const buildTerminationPayload = (values = {}) => ({
  terminationDate: values.terminationDate && typeof values.terminationDate.format === 'function'
    ? values.terminationDate.format('YYYY-MM-DD')
    : values.terminationDate || undefined,
  finalElectricity: values.finalElectricity ?? undefined,
  finalWater: values.finalWater ?? undefined,
  damageAmount: Number(values.damageAmount || 0),
  forfeit: Boolean(values.forfeit),
  allowDebt: Boolean(values.allowDebt),
  note: values.note || undefined,
});

/** T1.8: Kiểm tra điều kiện bật nút Xác nhận thanh lý. */
export const canConfirmTermination = (settlement, allowDebt = false) => {
  if (!settlement) return false;
  return !settlement.blocked || Boolean(allowDebt);
};

/** T2.4: Tính lượng tiêu thụ điện/nước khi có hoặc không bật thay đồng hồ (meterReset). */
export const computeMeterUsage = (currentVal, prevVal = 0, meterReset = false) => {
  if (currentVal === undefined || currentVal === null || Number.isNaN(Number(currentVal))) return null;
  const cur = Number(currentVal);
  const prev = Number(prevVal || 0);
  if (meterReset) return cur >= 0 ? cur : null;
  return cur >= prev ? cur - prev : null;
};

/** T2.4: Đóng gói payload gửi lên /manage/meter-readings/sync. */
export const buildMeterSyncPayload = (roomId, input = {}, period) => {
  const payload = {
    roomId,
    electricityValue: input.electricity,
    waterValue: input.water,
    period,
  };
  if (input.electricityReset !== undefined || input.waterReset !== undefined || input.resetReason) {
    payload.electricityReset = Boolean(input.electricityReset);
    payload.waterReset = Boolean(input.waterReset);
    payload.resetReason = (input.resetReason || '').trim();
  }
  return payload;
};
