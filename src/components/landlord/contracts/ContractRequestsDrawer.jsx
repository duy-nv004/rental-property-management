import { Drawer, Table, Tag, Space, Button } from 'antd';

const ContractRequestsDrawer = ({
  open,
  onClose,
  width,
  requests,
  onRespondRequest,
  onOpenRejectModal,
}) => (
  <Drawer title="Yêu cầu từ khách thuê" open={open} onClose={onClose} width={width}>
    <Table
      rowKey="id"
      size="small"
      dataSource={requests}
      pagination={false}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'Chưa có yêu cầu nào' }}
      columns={[
        { title: 'Phòng', render: (_, r) => r.contract?.room?.roomNumber },
        { title: 'Khách', render: (_, r) => r.tenant?.name },
        { title: 'Loại', dataIndex: 'type', render: (t) => (t === 'move_out' ? 'Trả phòng' : 'Gia hạn') },
        {
          title: 'Ngày',
          render: (_, r) => (
            <>
              {r.desiredDate ? new Date(r.desiredDate).toLocaleDateString('vi-VN') : ''}
              {r.shortNotice && r.status === 'pending' && (
                <div>
                  <Tag color="orange">Báo trước dưới 30 ngày</Tag>
                </div>
              )}
            </>
          ),
        },
        { title: 'Ghi chú', dataIndex: 'note' },
        {
          title: '',
          render: (_, r) =>
            r.status === 'pending' ? (
              <Space>
                <Button size="small" type="primary" onClick={() => onRespondRequest(r, 'approved')}>
                  Duyệt
                </Button>
                <Button size="small" danger onClick={() => onOpenRejectModal(r, 'rejected')}>
                  Từ chối
                </Button>
              </Space>
            ) : (
              <Tag color={r.status === 'approved' ? 'green' : 'red'}>
                {r.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
              </Tag>
            ),
        },
      ]}
    />
  </Drawer>
);

export default ContractRequestsDrawer;
