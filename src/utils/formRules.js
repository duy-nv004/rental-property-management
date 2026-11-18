/**
 * Quy tắc kiểm tra dữ liệu và định dạng số tiền dùng chung cho các Form trong hệ thống.
 */

export const VN_PHONE_REGEX = /^0\d{9,10}$/;
export const VN_PHONE_RULE = {
  pattern: VN_PHONE_REGEX,
  message: 'Số điện thoại Việt Nam gồm 10-11 số bắt đầu bằng 0!',
};

export const CCCD_REGEX = /^\d{12}$/;
export const CCCD_RULE = {
  pattern: CCCD_REGEX,
  message: 'Số CCCD phải gồm đúng 12 chữ số!',
};

export const DOB_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
export const DOB_RULE = {
  pattern: DOB_REGEX,
  message: 'Ngày sinh phải theo định dạng DD/MM/YYYY!',
};

export const vndFormatter = (val) =>
  val === undefined || val === null || val === '' ? '' : `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const vndParser = (val) =>
  val ? String(val).replace(/\./g, '').replace(/[^\d]/g, '') : '';
