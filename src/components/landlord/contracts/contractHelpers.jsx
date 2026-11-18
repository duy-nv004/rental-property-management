/* eslint-disable react-refresh/only-export-components */
import { Row, Col, Form, Upload } from 'antd';

// 2 ô ảnh CCCD bắt buộc (minh chứng tạm trú), dùng chung cho form thêm người ở của chủ nhà và khách
export const CccdUploadFields = () => (
  <Row gutter={12}>
    {[['cccdFront', 'Mặt trước'], ['cccdBack', 'Mặt sau']].map(([name, label]) => (
      <Col xs={12} key={name}>
        <Form.Item
          name={name} label={`CCCD ${label.toLowerCase()}`} valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
          rules={[{ required: true, message: `Tải ảnh CCCD ${label.toLowerCase()}!` }]}
        >
          <Upload listType="picture-card" maxCount={1} accept="image/jpeg,image/png,image/webp" beforeUpload={() => false}>
            {label}
          </Upload>
        </Form.Item>
      </Col>
    ))}
  </Row>
);

// Đóng gói form người ở thành multipart: các field chữ + 2 ảnh CCCD
export const occupantFormData = ({ cccdFront, cccdBack, ...fields }) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, v);
  });
  fd.append('cccdFront', cccdFront[0].originFileObj);
  fd.append('cccdBack', cccdBack[0].originFileObj);
  return fd;
};

// Tag phụ cho HĐ active theo endDate (C3): đã quá hạn hoặc còn <= 7 ngày
export const expiryTag = (endDate) => {
  if (!endDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  const days = Math.round((end - today) / 86400000);
  if (days < 0) return { color: 'red', text: 'Quá hạn' };
  if (days <= 7) return { color: 'orange', text: 'Sắp hết hạn' };
  return null;
};
