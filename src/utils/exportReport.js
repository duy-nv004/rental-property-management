const escapeCsvCell = (val) => {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const toCsv = (rows) => `\uFEFF${rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')}`;

const escapeHtml = (val) =>
  String(val ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

const formatVND = (val) =>
  `${Number(val || 0).toLocaleString('vi-VN')} đ`;

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Tạo nội dung CSV báo cáo tài chính (UTF-8 BOM cho Excel).
 */
export const buildFinancialCsv = (stats = {}, year, month = 'all') => {
  const periodLabel = month === 'all' ? `Cả năm ${year}` : `Tháng ${month}/${year}`;
  const rows = [
    ['BÁO CÁO TÀI CHÍNH HOMESYNC', periodLabel],
    [],
    ['Chỉ tiêu', 'Giá trị'],
    ['Tổng doanh thu kỳ vọng (VND)', Number(stats.totalExpected || 0)],
    ['Đã thu thực tế (VND)', Number(stats.totalCollected || 0)],
    ['Tiền phòng nợ đọng (VND)', Number(stats.unpaidAmount || 0)],
    ['Chi phí sửa chữa/bảo dưỡng (VND)', Number(stats.totalRepairCost || 0)],
    ['Lợi nhuận ròng (VND)', Number(stats.netProfit || 0)],
    ['Tỷ lệ lấp đầy (%)', Number(stats.occupancyRate || 0)],
  ];

  if (Array.isArray(stats.trend12Months) && stats.trend12Months.length > 0) {
    rows.push([]);
    rows.push([`XU HƯỚNG 12 THÁNG NĂM ${year}`]);
    rows.push(['Tháng', 'Kỳ vọng (VND)', 'Đã thu (VND)', 'Chi phí sửa chữa (VND)', 'Lợi nhuận ròng (VND)']);
    for (const item of stats.trend12Months) {
      rows.push([
        `Tháng ${item.month}`,
        Number(item.expected || 0),
        Number(item.collected || 0),
        Number(item.repairCost || 0),
        Number(item.profit || 0),
      ]);
    }
  }

  return toCsv(rows);
};

/**
 * Tạo nội dung CSV danh sách hóa đơn chi tiết.
 */
export const buildInvoicesCsv = (invoices = []) => {
  const rows = [
    [
      'Mã HĐ',
      'Kỳ',
      'Tòa nhà',
      'Phòng',
      'Khách thuê',
      'Tiền phòng (VND)',
      'Tiền điện (VND)',
      'Tiền nước (VND)',
      'Dịch vụ (VND)',
      'Sửa chữa (VND)',
      'Tổng cộng (VND)',
      'Đã thu (VND)',
      'Trạng thái',
      'Hạn thanh toán',
    ],
  ];

  for (const inv of invoices) {
    const statusText = inv.isPaid
      ? 'Đã thu'
      : inv.status === 'partial' || Number(inv.paidAmount) > 0
        ? 'Đã thu một phần'
        : 'Chưa thu';

    rows.push([
      inv.id,
      `${inv.month}/${inv.year}`,
      inv.roomDetails?.building?.name || '',
      inv.roomDetails?.roomNumber || '',
      inv.tenant?.name || '',
      Number(inv.roomPrice || 0),
      Number(inv.electricityTotal || 0),
      Number(inv.waterTotal || 0),
      Number(inv.serviceTotal || 0),
      Number(inv.repairFee || 0),
      Number(inv.totalAmount || 0),
      Number(inv.paidAmount || (inv.isPaid ? inv.totalAmount : 0)),
      statusText,
      inv.dueDate || '',
    ]);
  }

  return toCsv(rows);
};

/**
 * Tải xuống file CSV trên trình duyệt.
 */
export const downloadCsvFile = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const PRINT_STYLES = `
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 28px; line-height: 1.55; font-size: 13px; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 4px; text-transform: uppercase; }
  .subtitle { text-align: center; color: #475569; margin-bottom: 20px; font-size: 12px; }
  .section { margin-bottom: 16px; }
  .section-title { font-weight: 700; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  .right { text-align: right; }
  .total-row { font-weight: 700; background: #f1f5f9; }
  .signatures { display: flex; justify-content: space-between; margin-top: 32px; gap: 24px; }
  .sig-box { flex: 1; text-align: center; }
  .sig-box img { max-height: 80px; margin-top: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; background: #e2e8f0; }
  @media print { body { margin: 12mm; } }
`;

/**
 * Tạo HTML chuẩn A4 để in / xuất PDF Hợp đồng thuê phòng.
 */
export const buildPrintableContractHtml = (contract = {}) => {
  const roomNumber = escapeHtml(contract.room?.roomNumber || contract.roomNumber || '—');
  const buildingName = escapeHtml(contract.room?.building?.name || '—');
  const buildingAddress = escapeHtml(contract.room?.building?.address || '—');
  const tenantName = escapeHtml(contract.tenant?.name || contract.tenantName || '—');
  const tenantPhone = escapeHtml(contract.tenant?.phone || contract.tenantPhone || '—');
  const tenantCccd = escapeHtml(contract.tenant?.cccd || contract.tenantCccd || '—');
  const landlordName = escapeHtml(contract.landlord?.name || 'Bên cho thuê');

  const safeImg = (src) =>
    typeof src === 'string' && src.startsWith('data:image/')
      ? `<img src="${escapeHtml(src)}" alt="Chữ ký" />`
      : '<div style="height:60px;color:#94a3b8;">(Chưa ký)</div>';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /><title>Hợp đồng thuê phòng #${escapeHtml(contract.id || '')}</title><style>${PRINT_STYLES}</style></head>
<body>
  <h1>HỢP ĐỒNG THUÊ PHÒNG</h1>
  <div class="subtitle">Mã hợp đồng: #${escapeHtml(contract.id || '—')} • Ngày xuất bản: ${formatDate(new Date())}</div>

  <div class="section">
    <div class="section-title">1. Thông tin phòng & thời hạn</div>
    <table>
      <tr><th>Tòa nhà</th><td>${buildingName}</td><th>Phòng số</th><td>${roomNumber}</td></tr>
      <tr><th>Địa chỉ</th><td colspan="3">${buildingAddress}</td></tr>
      <tr><th>Ngày bắt đầu</th><td>${formatDate(contract.startDate)}</td><th>Ngày kết thúc</th><td>${formatDate(contract.endDate)}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">2. Thông tin bên thuê</div>
    <table>
      <tr><th>Họ và tên</th><td>${tenantName}</td><th>Số điện thoại</th><td>${tenantPhone}</td></tr>
      <tr><th>Số CCCD</th><td colspan="3">${tenantCccd}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">3. Chi phí & điều khoản thanh toán</div>
    <table>
      <tr><th>Tiền thuê phòng/tháng</th><td class="right">${formatVND(contract.rentPrice)}</td><th>Tiền đặt cọc</th><td class="right">${formatVND(contract.deposit)}</td></tr>
      <tr><th>Đơn giá điện</th><td class="right">${formatVND(contract.electricityPrice)} / kWh</td><th>Đơn giá nước</th><td class="right">${formatVND(contract.waterPrice)} / m³</td></tr>
      <tr><th>Phí Internet</th><td class="right">${formatVND(contract.internetPrice)}</td><th>Phí vệ sinh</th><td class="right">${formatVND(contract.cleaningPrice)} / người</td></tr>
      <tr><th>Ngày đóng tiền hàng tháng</th><td colspan="3">Ngày ${escapeHtml(contract.paymentDay || 5)} hàng tháng</td></tr>
    </table>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div><b>ĐẠI DIỆN BÊN CHO THUÊ</b></div>
      <div>${landlordName}</div>
      ${safeImg(contract.landlordSignature)}
    </div>
    <div class="sig-box">
      <div><b>ĐẠI DIỆN BÊN THUÊ</b></div>
      <div>${tenantName}</div>
      ${safeImg(contract.tenantSignature)}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Tạo HTML chuẩn A4 để in / xuất PDF Hóa đơn tiền phòng.
 */
export const buildPrintableInvoiceHtml = (invoice = {}) => {
  const roomNumber = escapeHtml(invoice.roomDetails?.roomNumber || invoice.roomNumber || '—');
  const buildingName = escapeHtml(invoice.roomDetails?.building?.name || '—');
  const tenantName = escapeHtml(invoice.tenant?.name || '—');
  const tenantPhone = escapeHtml(invoice.tenant?.phone || '—');
  const statusLabel = invoice.isPaid
    ? 'Đã thanh toán'
    : invoice.status === 'partial' || Number(invoice.paidAmount) > 0
      ? `Đã thu một phần (${formatVND(invoice.paidAmount)})`
      : 'Chưa thanh toán';
  const eUsage = Math.max(0, Number(invoice.electricityNew || 0) - Number(invoice.electricityOld || 0));
  const wUsage = Math.max(0, Number(invoice.waterNew || 0) - Number(invoice.waterOld || 0));

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /><title>Hóa đơn tháng ${escapeHtml(invoice.month)}/${escapeHtml(invoice.year)}</title><style>${PRINT_STYLES}</style></head>
<body>
  <h1>HÓA ĐƠN TIỀN PHÒNG</h1>
  <div class="subtitle">Mã hóa đơn: #${escapeHtml(invoice.id || '—')} • Kỳ: ${escapeHtml(invoice.month)}/${escapeHtml(invoice.year)} • Trạng thái: <span class="badge">${escapeHtml(statusLabel)}</span></div>

  <div class="section">
    <table>
      <tr><th>Tòa nhà / Phòng</th><td>${buildingName} — Phòng ${roomNumber}</td><th>Hạn thanh toán</th><td>${formatDate(invoice.dueDate)}</td></tr>
      <tr><th>Khách thuê</th><td>${tenantName}</td><th>Số điện thoại</th><td>${tenantPhone}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Chi tiết các khoản phí</div>
    <table>
      <thead>
        <tr><th>Khoản mục</th><th>Chi tiết chỉ số / Định mức</th><th class="right">Thành tiền</th></tr>
      </thead>
      <tbody>
        <tr><td>Tiền thuê phòng</td><td>${invoice.prorated ? `Tính theo ngày (${escapeHtml(invoice.daysCharged)} ngày)` : 'Trọn tháng'}</td><td class="right">${formatVND(invoice.roomPrice)}</td></tr>
        <tr><td>Tiền điện</td><td>${escapeHtml(invoice.electricityOld ?? 0)} → ${escapeHtml(invoice.electricityNew ?? 0)} (${eUsage} kWh × ${formatVND(invoice.electricityPrice)})</td><td class="right">${formatVND(invoice.electricityTotal)}</td></tr>
        <tr><td>Tiền nước</td><td>${escapeHtml(invoice.waterOld ?? 0)} → ${escapeHtml(invoice.waterNew ?? 0)} (${wUsage} m³ × ${formatVND(invoice.waterPrice)})</td><td class="right">${formatVND(invoice.waterTotal)}</td></tr>
        <tr><td>Dịch vụ (Internet, vệ sinh...)</td><td>Theo hợp đồng</td><td class="right">${formatVND(invoice.serviceTotal)}</td></tr>
        ${Number(invoice.repairFee) > 0 ? `<tr><td>Phí sửa chữa phát sinh</td><td>Theo phiếu sự cố</td><td class="right">${formatVND(invoice.repairFee)}</td></tr>` : ''}
        <tr class="total-row"><td colspan="2">TỔNG CỘNG THANH TOÁN</td><td class="right">${formatVND(invoice.totalAmount)}</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

/**
 * Mở cửa sổ in / lưu PDF chuẩn A4 không bị dính layout dashboard.
 */
export const openPrintDocument = (html) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    window.print();
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
  return true;
};
