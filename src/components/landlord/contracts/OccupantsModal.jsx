import { Modal, Table, Tag, Button, Space, Popconfirm, Form, Row, Col, Input } from 'antd';
import { Eye, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { CccdUploadFields } from './contractHelpers';
import { CCCD_RULE } from '../../../utils/formRules';

const OccupantsModal = ({
  target,
  occupants,
  form,
  onCancel,
  onAddOccupant,
  onUpdateOccupant,
  onRemoveOccupant,
  onViewCccd,
}) => (
  <Modal
    title={`Người ở cùng & tạm trú - HĐ #${target?.id || ''}`}
    open={!!target}
    onCancel={onCancel}
    footer={null}
    width={820}
    centered
    destroyOnHidden
  >
    <Table
      rowKey="id"
      size="small"
      dataSource={occupants}
      pagination={false}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'Chưa có người ở nào' }}
      columns={[
        {
          title: 'Họ tên',
          render: (_, o) => (
            <>
              {o.fullName}
              {o.isPrimary && <Tag style={{ marginLeft: 6 }}>Khách chính</Tag>}
            </>
          ),
        },
        {
          title: 'CCCD',
          dataIndex: 'cccd',
          render: (v) => <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
        },
        {
          title: 'Ảnh CCCD',
          render: (_, o) =>
            o.cccdFrontUrl || o.cccdBackUrl || o.cccdFrontImage || o.cccdBackImage ? (
              <Button
                size="small"
                icon={<Eye size={14} aria-hidden="true" />}
                onClick={() =>
                  onViewCccd(
                    target.id,
                    `CCCD - ${o.fullName}`,
                    [o.cccdFrontImage, o.cccdBackImage],
                    [o.cccdFrontUrl, o.cccdBackUrl]
                  )
                }
              >
                Xem
              </Button>
            ) : (
              <Tag>Chưa có ảnh</Tag>
            ),
        },
        { title: 'Quan hệ', dataIndex: 'relation' },
        {
          title: 'Tạm trú',
          render: (_, o) =>
            o.residenceStatus === 'registered' ? (
              <Tag color="green">
                Đã khai báo{o.registeredAt ? ` (${new Date(o.registeredAt).toLocaleDateString('vi-VN')})` : ''}
              </Tag>
            ) : (
              <Tag color="orange">Chưa khai báo</Tag>
            ),
        },
        {
          title: '',
          render: (_, o) => (
            <Space>
              {o.residenceStatus === 'registered' ? (
                <Button
                  size="small"
                  onClick={() => onUpdateOccupant(o.id, { residenceStatus: 'not_registered', registeredAt: null })}
                >
                  Bỏ đánh dấu
                </Button>
              ) : (
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    onUpdateOccupant(o.id, {
                      residenceStatus: 'registered',
                      registeredAt: dayjs().format('YYYY-MM-DD'),
                    })
                  }
                >
                  Đánh dấu đã tạm trú
                </Button>
              )}
              {!o.isPrimary && (
                <Popconfirm
                  title="Xóa người ở này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onRemoveOccupant(o.id)}
                >
                  <Button size="small" danger aria-label={`Xóa ${o.fullName}`} icon={<Trash2 size={14} />} />
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ]}
    />
    <Form
      form={form}
      name="occupantForm"
      layout="vertical"
      onFinish={onAddOccupant}
      requiredMark={false}
      className="modal-form"
      style={{ marginTop: 16 }}
    >
      <Row gutter={12}>
        <Col xs={24} sm={8}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="cccd" label="CCCD" rules={[CCCD_RULE]}>
            <Input placeholder="12 chữ số" inputMode="numeric" maxLength={12} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="relation" label="Quan hệ">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <CccdUploadFields />
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
        Ảnh CCCD 2 mặt bắt buộc, dùng làm minh chứng khai báo tạm trú.
      </div>
      <Button type="primary" htmlType="submit">
        Thêm người ở
      </Button>
    </Form>
  </Modal>
);

export default OccupantsModal;
