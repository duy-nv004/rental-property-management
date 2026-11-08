/* eslint-disable react-refresh/only-export-components */
import { Table, Tag, Card, Button, Space, Modal, Form, Select, DatePicker, InputNumber, message, Popconfirm, Spin, Row, Col, Checkbox, Upload, Input, Alert, Descriptions, Drawer, Badge, Grid, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { FileSignature, Plus, Eye, UploadCloud, Printer, UserPlus, RotateCcw, Trash2, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../../components/admin/PageHeader';
import axiosInstance from '../../utils/axios';
import { contractFilterKeys, filterContracts, compareEndDate, parseInventory, buildTerminationPayload, canConfirmTermination } from '../../utils/contracts';

import { useState, useEffect } from 'react';
import SignaturePadModal from '../../components/common/SignaturePadModal';
import ResponsiveFilterBar from '../../components/common/ResponsiveFilterBar';

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

const ContractManager = () => {
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  // Bộ lọc danh sách HĐ (tách khỏi selectedBuildingId của form lập HĐ)
  const [search, setSearch] = useState('');
  const [filterBuildingId, setFilterBuildingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  // State tạo nhanh khách thuê trong modal hợp đồng
  const [quickTenantModalVisible, setQuickTenantModalVisible] = useState(false);
  const [quickTenantLoading, setQuickTenantLoading] = useState(false);
  const [quickTenantForm] = Form.useForm();
  
  // State bật/tắt thiết lập đơn giá thỏa thuận riêng
  const [hasCustomPrices, setHasCustomPrices] = useState(false);
  
  // State quét CCCD bằng AI
  const [scanningCccd, setScanningCccd] = useState(false);
  
  // State hiển thị Modal lập hợp đồng và Modal chi tiết hợp đồng
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  // State Ký số Chủ nhà (Bên A)
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [landlordSignature, setLandlordSignature] = useState(null);

  // State Danh sách đồ dùng bàn giao động
  const [inventoryList, setInventoryList] = useState([
    { name: 'Giường ngủ', quantity: 1, status: 'Bình thường' },
    { name: 'Tủ quần áo', quantity: 1, status: 'Bình thường' },
    { name: 'Điều hòa + điều khiển', quantity: 1, status: 'Bình thường' },
    { name: 'Bình nóng lạnh', quantity: 1, status: 'Bình thường' },
    { name: 'Bàn bếp + bồn rửa', quantity: 1, status: 'Bình thường' }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsData, roomsData, tenantsData, buildingsData] = await Promise.all([
        axiosInstance.get('/contracts'),
        axiosInstance.get('/manage/rooms'),
        axiosInstance.get('/manage/tenants'),
        axiosInstance.get('/manage/buildings')
      ]);
      setContracts(contractsData);
      setRooms(roomsData.filter(r => r.status === 'empty')); // Chỉ lấy phòng trống để làm hợp đồng mới
      setTenants(tenantsData);
      setBuildings(buildingsData);
    } catch (err) {
      console.error('Error fetching contracts data:', err);
      message.error('Không thể tải danh sách dữ liệu hợp đồng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRequests();
    // Tự động kiểm tra hợp đồng và yêu cầu mới mỗi 12 giây hoặc khi chuyển tab
    const timer = setInterval(() => {
      fetchData();
      fetchRequests();
    }, 12000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
        fetchRequests();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, []);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchData(); fetchRequests(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  });

  // ─── YÊU CẦU TỪ KHÁCH (C5) ─────────────────────────────────────────────────
  // Tải riêng để lỗi API yêu cầu không làm hỏng danh sách hợp đồng
  const [requests, setRequests] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const fetchRequests = async () => {
    try {
      const data = await axiosInstance.get('/contracts/requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
  };

  // Modal phản hồi: { request, status }; từ chối bắt buộc lý do, duyệt thì ghi chú tùy chọn
  const [respondTarget, setRespondTarget] = useState(null);
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondForm] = Form.useForm();
  const openRespond = (r, status) => {
    respondForm.resetFields();
    setRespondTarget({ request: r, status });
  };
  const submitRespond = async () => {
    const { responseNote } = await respondForm.validateFields();
    setRespondLoading(true);
    try {
      await handleRespondRequest(respondTarget.request, respondTarget.status, responseNote?.trim());
      setRespondTarget(null);
    } finally {
      setRespondLoading(false);
    }
  };

  const handleRespondRequest = async (r, status, responseNote) => {
    try {
      const body = responseNote ? { status, responseNote } : { status };
      const res = await axiosInstance.put(`/contracts/requests/${r.id}`, body);
      message.success(res.message || 'Đã cập nhật yêu cầu');
      fetchRequests();
      if (status !== 'approved') return;
      // Duyệt chỉ đổi trạng thái; chủ nhà làm tiếp bằng luồng thanh lý / gia hạn có sẵn
      const target = contracts.find(c => c.id === r.contractId && c.status === 'active');
      if (!target) return;
      setRequestsOpen(false);
      if (r.type === 'move_out') {
        handleOpenTerminate(target, r.desiredDate);
      } else {
        handleOpenRenew(target);
        renewForm.setFieldsValue({ dates: [dayjs(target.endDate).add(1, 'day'), dayjs(r.desiredDate)] });
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật yêu cầu.');
    }
  };
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  useEffect(() => {
    if (location.state?.createForRoomId && buildings.length > 0) {
      const targetRoomId = location.state.createForRoomId;
      const targetBuildingId = location.state.buildingId;
      
      handleOpenCreateModal(targetBuildingId, targetRoomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, buildings]);

  // Mở sẵn modal gia hạn khi được chuyển tới từ thẻ phòng "Sắp hết hạn HĐ"
  useEffect(() => {
    const renewId = location.state?.renewContractId;
    if (!renewId || contracts.length === 0) return;
    const target = contracts.find(c => c.id === renewId && c.status === 'active');
    if (target) handleOpenRenew(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, contracts]);

  // Hồ sơ chủ nhà lấy từ server: localStorage 'user' lúc đăng nhập không có cccd/dob/hometown
  // và không cập nhật khi sửa hồ sơ. Lỗi mạng thì dùng tạm bản trong localStorage.
  const loadLandlordInfo = async () => {
    const local = JSON.parse(localStorage.getItem('user')) || {};
    try {
      const profile = await axiosInstance.get('/auth/profile');
      return profile?.id ? { ...local, ...profile } : local;
    } catch {
      return local;
    }
  };

  const landlordFields = (info) => ({
    landlordName: info.name || '',
    landlordPhone: info.phone || '',
    landlordCccd: info.cccd || '',
    landlordDob: info.dob || '',
    landlordHometown: info.hometown || ''
  });

  // Nạp thông tin mặc định của Chủ nhà từ Hồ sơ
  const handleFillDefaultLandlordInfo = async () => {
    const landlordInfo = await loadLandlordInfo();
    const chosenBuilding = buildings.find(b => b.id === form.getFieldValue('buildingId'));
    const landlordAddress = chosenBuilding ? (chosenBuilding.address || chosenBuilding.name) : (landlordInfo.address || '');

    form.setFieldsValue({ ...landlordFields(landlordInfo), landlordAddress });
    message.info('Đã nạp thông tin mặc định của Chủ nhà từ Hồ sơ tài khoản.');
  };

  // Mở Modal Tạo hợp đồng mới
  const handleOpenCreateModal = (buildingId = null, roomId = null) => {
    setHasCustomPrices(false);
    form.resetFields();
    
    const landlordInfo = JSON.parse(localStorage.getItem('user')) || {};
    const initialBuildingId = buildingId || (buildings.length > 0 ? buildings[0].id : undefined);
    const chosenBuilding = buildings.find(b => b.id === initialBuildingId);
    const landlordAddress = chosenBuilding ? (chosenBuilding.address || chosenBuilding.name) : '';

    setSelectedBuildingId(initialBuildingId);
    form.setFieldsValue({
      buildingId: initialBuildingId,
      roomId: roomId,
      rentPrice: rooms.find(r => r.id === roomId)?.price,
      ...landlordFields(landlordInfo),
      landlordAddress: landlordAddress,
      electricityPrice: chosenBuilding?.service ? parseFloat(chosenBuilding.service.electricityPrice) : 3500,
      waterPrice: chosenBuilding?.service ? parseFloat(chosenBuilding.service.waterPrice) : 20000,
      internetPrice: chosenBuilding?.service ? parseFloat(chosenBuilding.service.internetPrice) : 100000,
      cleaningPrice: chosenBuilding?.service ? parseFloat(chosenBuilding.service.cleaningPrice) : 50000,
      numTenants: 1,
      paymentDay: 30,
      firstLastMonthPolicy: 'full',
      initialElectricity: 0,
      initialWater: 0
    });

    setInventoryList([
      { name: 'Giường ngủ', quantity: 1, status: 'Bình thường' },
      { name: 'Tủ quần áo', quantity: 1, status: 'Bình thường' },
      { name: 'Điều hòa + điều khiển', quantity: 1, status: 'Bình thường' },
      { name: 'Bình nóng lạnh', quantity: 1, status: 'Bình thường' },
      { name: 'Bàn bếp + bồn rửa', quantity: 1, status: 'Bình thường' }
    ]);
    setLandlordSignature(null);
    setModalVisible(true);
    // Điền lại Bên A bằng hồ sơ mới nhất từ server (đủ CCCD, ngày sinh, HKTT)
    loadLandlordInfo().then((info) => form.setFieldsValue(landlordFields(info)));
  };

  // Quét 1 hoặc 2 mặt CCCD bằng AI
  const handleCccdUpload = async (fileOrList) => {
    setScanningCccd(true);
    const formData = new FormData();
    if (Array.isArray(fileOrList)) {
      fileOrList.forEach(file => {
        formData.append('cccdImages', file.originFileObj || file);
      });
    } else if (fileOrList) {
      formData.append('cccdImages', fileOrList.originFileObj || fileOrList);
    }

    try {
      const response = await axiosInstance.post('/ai/scan-cccd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ocrResult = response;
      if (ocrResult && ocrResult.data) {
        const { name, dob, cccdNumber, hometown } = ocrResult.data;
        form.setFieldsValue({
          tenantName: name || form.getFieldValue('tenantName') || '',
          tenantCccd: cccdNumber || form.getFieldValue('tenantCccd') || '',
          tenantDob: dob || form.getFieldValue('tenantDob') || '',
          tenantHometown: hometown || form.getFieldValue('tenantHometown') || ''
        });
        // BE để trống ô đọc không chắc (CCCD sai độ dài, ngày sinh sai) và trả kèm cảnh báo
        if (Array.isArray(ocrResult.warnings) && ocrResult.warnings.length > 0) {
          message.warning(`Vui lòng kiểm tra lại: ${ocrResult.warnings.join(' ')}`);
        } else {
          message.success('AI quét trích xuất thông tin Căn cước công dân thành công!');
        }
      } else {
        message.warning('AI không tìm thấy thông tin phù hợp, vui lòng nhập thủ công.');
      }
    } catch (err) {
      console.error('CCCD OCR upload error:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi phân tích ảnh CCCD.');
    } finally {
      setScanningCccd(false);
    }
  };

  const handleQuickCreateTenant = async (values) => {
    setQuickTenantLoading(true);
    try {
      const response = await axiosInstance.post('/auth/create-tenant', {
        name: values.name,
        phone: values.phone,
        password: values.password || '123456'
      });
      message.success('Đã tạo tài khoản khách thuê mới thành công!');
      quickTenantForm.resetFields();
      setQuickTenantModalVisible(false);
      
      const freshTenants = await axiosInstance.get('/manage/tenants');
      setTenants(freshTenants);
      
      // authService.createTenant trả về { message, tenantId } — không có `user`
      const createdId = response.tenantId || freshTenants.find(t => t.phone === values.phone)?.id;
      if (createdId) {
        form.setFieldsValue({
          tenantId: createdId,
          tenantName: values.name,
          tenantPhone: values.phone
        });
      }
    } catch (err) {
      console.error('Error creating quick tenant:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản khách thuê.');
    } finally {
      setQuickTenantLoading(false);
    }
  };

  const handleCreateContract = async (values) => {
    if (!landlordSignature) {
      message.error('Vui lòng thực hiện vẽ chữ ký đại diện Bên A (Chủ nhà) trước khi bấm Tạo hợp đồng!');
      return;
    }

    setSubmitLoading(true);
    try {
      let finalPrices = {};
      if (hasCustomPrices) {
        finalPrices = {
          electricityPrice: values.electricityPrice,
          waterPrice: values.waterPrice,
          internetPrice: values.internetPrice,
          cleaningPrice: values.cleaningPrice
        };
      } else {
        const chosenBuilding = buildings.find(b => b.id === values.buildingId);
        const s = chosenBuilding?.service || {
          electricityPrice: 3500,
          waterPrice: 20000,
          internetPrice: 100000,
          cleaningPrice: 50000
        };
        finalPrices = {
          electricityPrice: parseFloat(s.electricityPrice),
          waterPrice: parseFloat(s.waterPrice),
          internetPrice: parseFloat(s.internetPrice),
          cleaningPrice: parseFloat(s.cleaningPrice)
        };
      }

      const payload = {
        tenantId: values.tenantId,
        roomId: values.roomId,
        startDate: values.dates[0].format('YYYY-MM-DD'),
        endDate: values.dates[1].format('YYYY-MM-DD'),
        deposit: values.deposit,
        rentPrice: values.rentPrice,
        initialElectricity: values.initialElectricity,
        initialWater: values.initialWater,

        // Thông tin Bên A (Nhận tay hoặc tự động)
        landlordName: values.landlordName,
        landlordPhone: values.landlordPhone,
        landlordCccd: values.landlordCccd,
        landlordDob: values.landlordDob,
        landlordHometown: values.landlordHometown,
        landlordAddress: values.landlordAddress,
        landlordSignature: landlordSignature,

        // Thông tin Bên B (tenantName chỉ dùng để hiển thị trên form;
        // backend lấy tên từ tài khoản liên kết qua tenantId nên không gửi lên)
        tenantCccd: values.tenantCccd,
        tenantDob: values.tenantDob,
        tenantHometown: values.tenantHometown,
        tenantPhone: values.tenantPhone,
        
        numTenants: values.numTenants || 1,
        paymentDay: values.paymentDay || 30,
        firstLastMonthPolicy: values.firstLastMonthPolicy || 'full',
        inventory: JSON.stringify(inventoryList),

        ...finalPrices
      };
      // Multipart để gửi kèm 2 ảnh CCCD (minh chứng tạm trú); bỏ qua field rỗng để backend dùng mặc định
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') formData.append(k, v);
      });
      formData.append('cccdFront', values.cccdFront[0].originFileObj);
      formData.append('cccdBack', values.cccdBack[0].originFileObj);
      // axiosInstance mặc định ép Content-Type JSON, phải ghi đè để FormData không bị đổi sang JSON
      await axiosInstance.post('/contracts/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success('Khởi tạo hợp đồng thuê thành công! Hợp đồng đang chờ khách thuê đăng nhập ký xác nhận.');
      form.resetFields();
      setLandlordSignature(null);
      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error creating contract:', err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo hợp đồng.';
      message.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── THANH LÝ HỢP ĐỒNG (C1): quyết toán cọc tính ở server ───────────────────
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [allowDebtChecked, setAllowDebtChecked] = useState(false);
  const [terminateForm] = Form.useForm();

  const handleOpenTerminate = (contract, terminationDate = null) => {
    terminateForm.resetFields();
    terminateForm.setFieldsValue({ terminationDate: terminationDate ? dayjs(terminationDate) : dayjs(), damageAmount: 0, forfeit: false, allowDebt: false });
    setAllowDebtChecked(false);
    setSettlement(null);
    setTerminateTarget(contract);
  };

  const terminationBody = () => buildTerminationPayload(terminateForm.getFieldsValue());

  const handlePreviewSettlement = async () => {
    setSubmitLoading(true);
    try {
      setSettlement(await axiosInstance.post(`/contracts/${terminateTarget.id}/settlement-preview`, terminationBody()));
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tính quyết toán.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTerminateContract = async () => {
    setSubmitLoading(true);
    try {
      const response = await axiosInstance.post(`/contracts/${terminateTarget.id}/terminate`, terminationBody());
      message.success(response.message || 'Thanh lý hợp đồng thành công!');
      setTerminateTarget(null);
      fetchData();
    } catch (err) {
      console.error('Error terminating contract:', err);
      message.error(err.response?.data?.message || 'Không thể thanh lý hợp đồng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── NGƯỜI Ở CÙNG & TẠM TRÚ (C6) ─────────────────────────────────────────────
  const [occupantTarget, setOccupantTarget] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [occupantForm] = Form.useForm();

  const fetchOccupants = async (contractId) => {
    try {
      setOccupants(await axiosInstance.get(`/contracts/${contractId}/occupants`));
    } catch (err) {
      setOccupants([]);
      message.error(err.response?.data?.message || 'Không thể tải danh sách người ở.');
    }
  };

  const handleOpenOccupants = (contract) => {
    occupantForm.resetFields();
    setOccupantTarget(contract);
    fetchOccupants(contract.id);
  };

  const handleAddOccupant = async (values) => {
    try {
      const res = await axiosInstance.post(`/contracts/${occupantTarget.id}/occupants`, occupantFormData(values), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(res.message || 'Đã thêm người ở cùng');
      occupantForm.resetFields();
      fetchOccupants(occupantTarget.id);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể thêm người ở.');
    }
  };

  const handleUpdateOccupant = async (id, body) => {
    try {
      const res = await axiosInstance.put(`/contracts/occupants/${id}`, body);
      message.success(res.message || 'Đã cập nhật người ở');
      fetchOccupants(occupantTarget.id);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật người ở.');
    }
  };

  // Xem ảnh CCCD (không public): tải blob qua API có token rồi hiện bằng object URL
  const [cccdPreview, setCccdPreview] = useState(null);
  const handleViewCccd = async (contractId, title, files) => {
    const names = files.filter(Boolean);
    if (!names.length) return message.info('Chưa có ảnh CCCD.');
    try {
      const blobs = await Promise.all(names.map((f) =>
        axiosInstance.get(`/contracts/${contractId}/cccd-images/${encodeURIComponent(f)}`, { responseType: 'blob' })));
      setCccdPreview({ title, urls: blobs.map((b) => URL.createObjectURL(b)) });
    } catch {
      message.error('Không tải được ảnh CCCD.');
    }
  };
  const closeCccdPreview = () => {
    cccdPreview?.urls.forEach((u) => URL.revokeObjectURL(u));
    setCccdPreview(null);
  };

  const handleRemoveOccupant = async (id) => {
    try {
      const res = await axiosInstance.delete(`/contracts/occupants/${id}`);
      message.success(res.message || 'Đã xóa người ở');
      fetchOccupants(occupantTarget.id);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa người ở.');
    }
  };

  // ─── XỬ LÝ CỌC CHO HĐ ĐÃ KẾT THÚC (dữ liệu cũ thanh lý trước khi có quyết toán) ─
  const [depositTarget, setDepositTarget] = useState(null);
  const [depositRecords, setDepositRecords] = useState([]);
  const [depositForm] = Form.useForm();
  const heldTotal = (records) => (records || [])
    .filter((d) => d.status === 'held')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const handleOpenDeposit = async (contract) => {
    depositForm.resetFields();
    setDepositTarget(contract);
    try {
      const records = await axiosInstance.get(`/deposits/contract/${contract.id}`);
      setDepositRecords(records);
      // Backend yêu cầu hoàn + khấu trừ = đúng số cọc đang giữ: điền sẵn hoàn toàn bộ.
      depositForm.setFieldsValue({ amount: heldTotal(records), deductAmount: 0 });
    } catch {
      setDepositRecords([]);
      message.error('Không thể tải lịch sử tiền cọc.');
    }
  };

  const handleRefundDeposit = async (values) => {
    setSubmitLoading(true);
    try {
      const held = heldTotal(depositRecords);
      const deductAmount = Number(values.deductAmount || 0);
      const amount = values.amount == null ? held - deductAmount : Number(values.amount);
      if (amount + deductAmount !== held) {
        message.error(`Số tiền hoàn + khấu trừ phải bằng tiền cọc đang giữ (${formatVND(held)}).`);
        return;
      }
      const response = await axiosInstance.post(`/deposits/contract/${depositTarget.id}/refund`, {
        amount, deductAmount, note: values.note
      });
      message.success(response.message || 'Xử lý tiền cọc thành công.');
      handleOpenDeposit(depositTarget);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xử lý tiền cọc.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── GIA HẠN HỢP ĐỒNG ──────────────────────────────────────────────────────
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewForm] = Form.useForm();

  const handleOpenRenew = (contract) => {
    renewForm.resetFields();
    setRenewTarget(contract);
  };

  // Điền sẵn giá thuê hiện tại sau khi modal gia hạn đã mount form.
  // API trả DECIMAL dạng chuỗi ("2500000.00"), phải ép số nếu không rule type:'number' sẽ báo lỗi.
  useEffect(() => {
    if (!renewTarget) return;
    const price = Number(renewTarget.rentPrice ?? renewTarget.room?.price);
    renewForm.setFieldsValue({
      rentPrice: Number.isFinite(price) ? price : undefined,
      // T2.3: mặc định giữ cách tính của HĐ cũ; API không trả trường này thì để trống, backend tự giữ
      firstLastMonthPolicy: renewTarget.firstLastMonthPolicy || undefined
    });
    // Backend chỉ nhận ngày bắt đầu sau ngày kết thúc HĐ cũ: gợi ý ngày kế tiếp (không ghi đè nếu đã điền từ yêu cầu gia hạn).
    if (!renewForm.getFieldValue('dates') && renewTarget.endDate) {
      const start = dayjs(renewTarget.endDate).add(1, 'day');
      renewForm.setFieldsValue({ dates: [start, start.add(1, 'year').subtract(1, 'day')] });
    }
  }, [renewTarget, renewForm]);

  const handleRenewContract = async (values) => {
    setSubmitLoading(true);
    try {
      const response = await axiosInstance.post(`/contracts/${renewTarget.id}/renew`, {
        startDate: values.dates[0].format('YYYY-MM-DD'),
        endDate: values.dates[1].format('YYYY-MM-DD'),
        rentPrice: values.rentPrice,
        ...(values.firstLastMonthPolicy ? { firstLastMonthPolicy: values.firstLastMonthPolicy } : {})
      });
      message.success(response.message || 'Đã tạo hợp đồng gia hạn, chờ khách thuê ký.');
      setRenewTarget(null);
      fetchData();
    } catch (err) {
      console.error('Error renewing contract:', err);
      message.error(err.response?.data?.message || 'Không thể gia hạn hợp đồng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelContract = async (id) => {
    try {
      const response = await axiosInstance.put(`/contracts/${id}/cancel`);
      message.success(response.message || 'Hủy hợp đồng chờ thành công!');
      fetchData();
    } catch (err) {
      console.error('Error cancelling contract:', err);
      const errMsg = err.response?.data?.message || 'Không thể hủy hợp đồng.';
      message.error(errMsg);
    }
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const columns = [
    { 
      title: 'KHÁCH THUÊ (BÊN B)', 
      key: 'tenantName',
      width: 170,
      render: (_, record) => (
        <div>
          <strong>{record.tenantCccd ? record.tenantName || record.tenant?.name : record.tenant?.name || 'Chưa gán khách'}</strong>
          <br />
          <small className="cell-sub">{record.tenantPhone || record.tenant?.phone || 'N/A'}</small>
        </div>
      )
    },
    { 
      title: 'PHÒNG', 
      key: 'roomNumber',
      width: 150,
      render: (_, record) => {
        if (!record.room) return 'Không xác định';
        return `Phòng ${record.room.roomNumber} (${record.room.building?.name || ''})`;
      }
    },
    {
      title: 'THỜI HẠN THUÊ',
      key: 'period',
      width: 160,
      responsive: ['md'],
      render: (_, record) => {
        if (!record.startDate || !record.endDate) return 'N/A';
        const start = new Date(record.startDate).toLocaleDateString('vi-VN');
        const end = new Date(record.endDate).toLocaleDateString('vi-VN');
        return `${start} - ${end}`;
      }
    },
    { 
      title: 'TIỀN ĐẶT CỌ', 
      dataIndex: 'deposit', 
      key: 'deposit',
      width: 120,
      responsive: ['sm'],
      render: (deposit) => <b>{formatVND(deposit)}</b> 
    },
    { 
      title: 'TRẠNG THÁI', 
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status, record) => {
        let color = 'default';
        let text = status;
        if (status === 'active') { color = 'green'; text = 'Đang hoạt động'; }
        else if (status === 'pending_tenant_signature') { color = 'orange'; text = 'Chờ khách ký'; }
        else if (status === 'rejected') { color = 'red'; text = 'Bị từ chối'; }
        else if (status === 'cancelled') { color = 'default'; text = 'Đã hủy'; }
        else if (status === 'terminated') { color = 'gray'; text = 'Đã thanh lý'; }
        else if (status === 'renewed') { color = 'blue'; text = 'Đã gia hạn'; }
        // HĐ quá hạn vẫn 'active' ở DB, chỉ tính hiển thị theo endDate
        const expiry = status === 'active' ? expiryTag(record.endDate) : null;
        return (
          <Space size={4} wrap>
            <Tag color={color} className="tag-flat">{text}</Tag>
            {expiry && <Tag color={expiry.color} className="tag-flat">{expiry.text}</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'HÀNH ĐỘNG',
      key: 'action',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space size={4} wrap>
          <Tooltip title="Xem chi tiết hợp đồng">
            <Button 
              type="default" 
              icon={<Eye size={14} />} 
              size="small" 
              onClick={() => {
                setSelectedContract(record);
                setDetailModalVisible(true);
              }}
              aria-label="Xem HĐ"
            />
          </Tooltip>
          {record.status === 'pending_tenant_signature' && (
            <Popconfirm
              title="Hủy hợp đồng chờ"
              description="Hành động này sẽ hủy hợp đồng đang chờ khách ký và giải phóng phòng về Trống. Bạn chắc chắn chứ?"
              okText="Xác nhận"
              cancelText="Hủy"
              onConfirm={() => handleCancelContract(record.id)}
            >
              <Tooltip title="Hủy hợp đồng chờ ký">
                <Button type="primary" danger size="small" aria-label="Hủy HĐ">
                  Hủy
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === 'active' && (
            <Tooltip title="Gia hạn hợp đồng">
              <Button
                size="small"
                icon={<RotateCcw size={14} aria-hidden="true" />}
                onClick={() => handleOpenRenew(record)}
                aria-label="Gia hạn"
              />
            </Tooltip>
          )}
          {record.status === 'active' && (
            <Tooltip title="Thanh lý hợp đồng">
              <Button
                type="primary"
                danger
                size="small"
                icon={<Trash2 size={14} />}
                onClick={() => handleOpenTerminate(record)}
                aria-label="Thanh lý"
              />
            </Tooltip>
          )}
          {['active', 'pending_tenant_signature'].includes(record.status) && (
            <Tooltip title="Danh sách người ở cùng">
              <Button
                size="small"
                icon={<Users size={14} />}
                onClick={() => handleOpenOccupants(record)}
                aria-label="Người ở"
              />
            </Tooltip>
          )}
          {['terminated', 'cancelled', 'rejected'].includes(record.status) && Number(record.deposit) > 0 && (
            <Tooltip title="Xử lý hoàn trả tiền cọc">
              <Button size="small" onClick={() => handleOpenDeposit(record)}>
                Tiền cọc
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const numFormatter = (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const numParser = (value) => value.replace(/\$\s?|(,*)/g, '');

  return (
    <div className="page-shell">
      <PageHeader
        title="Quản lý hợp đồng"
        description="Lập hợp đồng thuê, theo dõi trạng thái ký và thanh lý hợp đồng."
        extra={
          <Space wrap>
            <Badge count={pendingRequests}>
              <Button size="large" onClick={() => setRequestsOpen(true)}>Yêu cầu từ khách</Button>
            </Badge>
            <Button
              type="primary"
              size="large"
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => handleOpenCreateModal()}
              disabled={tenants.length === 0 || rooms.length === 0}
            >
              Lập hợp đồng mới
            </Button>
          </Space>
        }
      />

      {/* Thanh bộ lọc đáp ứng chuẩn UI/UX Pro Max */}
      <ResponsiveFilterBar
        search={{
          placeholder: 'Tìm tên khách, SĐT, số phòng',
          value: search,
          onChange: (e) => setSearch(e.target.value),
          'data-testid': 'contract-search-input'
        }}
        filters={[
          {
            key: 'buildingId',
            label: 'Tất cả tòa nhà',
            placeholder: 'Tất cả tòa nhà',
            value: filterBuildingId,
            onChange: (v) => setFilterBuildingId(v ?? null),
            options: buildings.map((b) => ({ value: b.id, label: b.name })),
            'data-testid': 'contract-building-filter',
            width: 180
          },
          {
            key: 'status',
            label: 'Tất cả trạng thái',
            placeholder: 'Tất cả trạng thái',
            value: filterStatus,
            onChange: (v) => setFilterStatus(v ?? null),
            options: [
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'expiring', label: 'Sắp hết hạn' },
              { value: 'overdue', label: 'Quá hạn' },
              { value: 'pending_tenant_signature', label: 'Chờ khách ký' },
              { value: 'renewed', label: 'Đã gia hạn' },
              { value: 'terminated', label: 'Đã thanh lý' },
              { value: 'cancelled', label: 'Đã hủy' },
              { value: 'rejected', label: 'Bị từ chối' },
            ],
            'data-testid': 'contract-status-filter',
            width: 180
          }
        ]}
        onReset={() => {
          setSearch('');
          setFilterBuildingId(null);
          setFilterStatus(null);
        }}
      />

      <Card
        variant="borderless"
        className="stat-card"
        title={<span className="card-title"><FileSignature size={18} color="#0F766E" aria-hidden="true" /> Danh sách hợp đồng thuê phòng</span>}
      >
        {loading ? (
          <div className="loading-block">
            <Spin size="large" tip="Đang tải danh sách hợp đồng..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filterContracts(contracts, { search, buildingId: filterBuildingId, statuses: filterStatus ? [filterStatus] : null })}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>

      {/* MODAL THÊM HỢP ĐỒNG MỚI - GIAO DIỆN HỢP ĐỒNG TRỰC TIẾP (LIVE PAPER CONTRACT) */}
      <Modal
        title={<span className="modal-title"><FileSignature size={18} aria-hidden="true" /> Lập Hợp đồng thuê phòng mới (Bản thảo trực tiếp)</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => form.submit()}>
            Khởi tạo & Ký hợp đồng
          </Button>
        ]}
        width={900}
        centered
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateContract}
          requiredMark={false}
          className="modal-form"
          initialValues={{
            electricityPrice: 3500,
            waterPrice: 20000,
            internetPrice: 100000,
            cleaningPrice: 50000,
            numTenants: 1,
            paymentDay: 30,
            firstLastMonthPolicy: 'full',
            initialElectricity: 0,
            initialWater: 0
          }}
        >
          {/* BAR CHỌN NHANH TÒA NHÀ & PHÒNG & THỜI HẠN */}
          <Card size="small" className="contract-bar">
            <Row gutter={[16, 12]}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="buildingId"
                  label="Chọn Tòa nhà cho thuê"
                  rules={[{ required: true, message: 'Vui lòng chọn tòa nhà!' }]}
                >
                  <Select
                    placeholder="Chọn tòa nhà"
                    onChange={(val) => {
                      setSelectedBuildingId(val);
                      form.setFieldsValue({ roomId: undefined });

                      const chosenBuilding = buildings.find(b => b.id === val);
                      if (chosenBuilding) {
                        const s = chosenBuilding.service || {
                          electricityPrice: 3500,
                          waterPrice: 20000,
                          internetPrice: 100000,
                          cleaningPrice: 50000
                        };
                        form.setFieldsValue({
                          electricityPrice: parseFloat(s.electricityPrice),
                          waterPrice: parseFloat(s.waterPrice),
                          internetPrice: parseFloat(s.internetPrice),
                          cleaningPrice: parseFloat(s.cleaningPrice),
                          landlordAddress: chosenBuilding.address || chosenBuilding.name || ''
                        });
                      }
                    }}
                  >
                    {buildings.map(b => (
                      <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="roomId"
                  label="Chọn Phòng trống"
                  rules={[{ required: true, message: 'Chọn phòng trống!' }]}
                >
                  <Select
                    placeholder="Chọn phòng trống"
                    disabled={!selectedBuildingId}
                    onChange={(val) => form.setFieldsValue({ rentPrice: Number(rooms.find(r => r.id === val)?.price) || undefined })}
                  >
                    {rooms
                      .filter(r => r.buildingId === selectedBuildingId)
                      .map(r => (
                        <Select.Option key={r.id} value={r.id}>Phòng {r.roomNumber} ({formatVND(r.price)}/tháng)</Select.Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  name="dates"
                  label="Thời hạn thuê phòng"
                  rules={[{ required: true, message: 'Chọn thời hạn thuê!' }]}
                >
                  <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* CHÍNH THỨC: BẢN HỢP ĐỒNG THUÊ PHÒNG TRỌ TRỰC TIẾP (LIVE PAPER CONTRACT FORM) */}
          <div className="paper paper-form">

            {/* QUỐC HIỆU TIÊU NGỮ */}
            <div className="paper-national">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
              <strong>Độc lập - Tự do - Hạnh phúc</strong>
              <div className="paper-national-line" />
            </div>

            <div className="paper-heading">
              <h2 className="paper-title">HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ</h2>
              <small className="paper-basis">Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</small>
            </div>

            {/* SECTION BÊN A */}
            <div className="paper-party">
              <div className="paper-party-head">
                <strong className="paper-party-title is-a">BÊN A: BÊN CHO THUÊ (PHÒNG TRỌ)</strong>
                <Button type="link" size="small" className="link-a" icon={<RotateCcw size={12} aria-hidden="true" />} onClick={handleFillDefaultLandlordInfo}>
                  Nạp mặc định từ tài khoản chủ nhà
                </Button>
              </div>

              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="landlordName" label="Họ và tên Bên A:" rules={[{ required: true, message: 'Nhập tên chủ nhà!' }]}>
                    <Input placeholder="Nhập tay hoặc tự điền..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="landlordPhone" label="Điện thoại Bên A:" rules={[{ required: true, message: 'Nhập SĐT chủ nhà!' }]}>
                    <Input placeholder="SĐT liên hệ..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="landlordCccd" label="Số CCCD:">
                    <Input placeholder="Số CCCD chủ nhà..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="landlordDob" label="Ngày sinh:">
                    <Input placeholder="DD/MM/YYYY..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="landlordHometown" label="Quê quán / HKTT:">
                    <Input placeholder="Quê quán..." />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="landlordAddress" label="Địa chỉ bàn giao phòng thuê:">
                    <Input placeholder="Địa chỉ chi tiết tòa nhà / phòng trọ..." />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* SECTION BÊN B */}
            <div className="paper-party">
              <div className="paper-party-head">
                <strong className="paper-party-title is-b">BÊN B: BÊN THUÊ (PHÒNG TRỌ)</strong>
                <div className="party-tools">
                  <Form.Item name="tenantId" noStyle rules={[{ required: true, message: 'Chọn khách thuê!' }]}>
                    <Select
                      placeholder="Chọn tài khoản khách thuê liên kết"
                      className="tenant-select"
                      size="small"
                      aria-label="Chọn tài khoản khách thuê liên kết"
                      onChange={(val) => {
                        const matched = tenants.find(t => t.id === val);
                        if (matched) {
                          form.setFieldsValue({
                            tenantName: matched.name,
                            tenantPhone: matched.phone
                          });
                        }
                      }}
                    >
                      {tenants.map(t => (
                        <Select.Option key={t.id} value={t.id}>{t.name} ({t.phone})</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Button type="link" size="small" className="link-b" icon={<UserPlus size={12} aria-hidden="true" />} onClick={() => setQuickTenantModalVisible(true)}>
                    Tạo khách
                  </Button>
                </div>
              </div>

              {/* Ảnh CCCD 2 mặt bắt buộc (minh chứng tạm trú); quét AI chỉ để điền sẵn, không bắt buộc */}
              <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong>Ảnh CCCD Bên B <span style={{ color: '#DC2626' }}>*</span></strong>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Bắt buộc 2 mặt, lưu làm minh chứng khai báo tạm trú.</div>
                  </div>
                  <Button
                    size="small" icon={<UploadCloud size={14} aria-hidden="true" />} loading={scanningCccd}
                    onClick={() => {
                      const imgs = [...(form.getFieldValue('cccdFront') || []), ...(form.getFieldValue('cccdBack') || [])];
                      if (!imgs.length) return message.warning('Hãy chọn ảnh CCCD trước khi quét.');
                      handleCccdUpload(imgs);
                    }}
                  >
                    {scanningCccd ? 'AI đang quét...' : 'Quét AI điền thông tin (tùy chọn)'}
                  </Button>
                </div>
                <CccdUploadFields />
              </div>

              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="tenantName" label="Họ và tên Bên B:" rules={[{ required: true, message: 'Nhập tên khách thuê!' }]}>
                    <Input placeholder="AI tự điền từ CCCD hoặc nhập tay..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="tenantPhone" label="Điện thoại Bên B:" rules={[{ required: true, message: 'Nhập SĐT khách thuê!' }]}>
                    <Input placeholder="Số điện thoại..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="tenantCccd" label="Số CCCD Bên B:" rules={[{ required: true, message: 'Nhập CCCD!' }]}>
                    <Input placeholder="12 chữ số" inputMode="numeric" style={{ fontVariantNumeric: 'tabular-nums' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="tenantDob" label="Ngày tháng năm sinh:" rules={[{ required: true, message: 'Nhập ngày sinh!' }]}>
                    <Input placeholder="DD/MM/YYYY..." />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="tenantHometown" label="Hộ khẩu thường trú (HKTT):" rules={[{ required: true, message: 'Nhập HKTT!' }]}>
                    <Input placeholder="AI tự điền hoặc nhập tay..." />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* ĐIỀU 1 */}
            <div className="paper-section">
              <strong>ĐIỀU 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG & THỜI HẠN THUÊ</strong>
              <div className="paper-inline">
                <span>Mục đích thuê để lưu trú sinh hoạt với số lượng người ở thực tế là:</span>
                <Form.Item name="numTenants" noStyle rules={[{ required: true, message: 'Nhập số người!' }]}>
                  <InputNumber min={1} size="small" className="w-80" aria-label="Số người ở" />
                </Form.Item>
                <span>người.</span>
              </div>
            </div>

            {/* ĐIỀU 2 */}
            <div className="paper-section">
              <strong>ĐIỀU 2: GIÁ THUÊ, ĐẶT CỌC & CHỈ SỐ TIỆN ÍCH BAN ĐẦU</strong>
              <Row gutter={[16, 0]} className="modal-form">
                <Col xs={24} sm={12}>
                  <Form.Item name="rentPrice" label="Giá thuê/tháng (VND):" rules={[{ required: true, message: 'Nhập giá thuê!' }]}>
                    <InputNumber min={0} step={100000} formatter={numFormatter} parser={numParser} className="w-full" placeholder="Mặc định là giá phòng" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="deposit" label="Số tiền đặt cọc (VND):" rules={[{ required: true, message: 'Nhập tiền cọc!' }]}>
                    <InputNumber min={0} formatter={numFormatter} parser={numParser} className="w-full" placeholder="Tiền đặt cọc phòng..." />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="paymentDay" label="Ngày đóng tiền hàng tháng:" rules={[{ required: true, message: 'Nhập ngày đóng!' }]}>
                    <InputNumber min={1} max={31} className="w-full" placeholder="Ngày đóng tiền (vd: 30)" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="firstLastMonthPolicy" label="Tiền phòng tháng đầu/cuối:">
                    <Select
                      options={[
                        { value: 'full', label: 'Tính tròn tháng' },
                        { value: 'prorated', label: 'Tính theo số ngày ở' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="initialElectricity" label="Chỉ số ĐIỆN ban đầu (kWh):" rules={[{ required: true, message: 'Nhập số điện!' }]}>
                    <InputNumber min={0} className="w-full" placeholder="Ví dụ: 10450" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="initialWater" label="Chỉ số NƯỚC ban đầu (m³):" rules={[{ required: true, message: 'Nhập số nước!' }]}>
                    <InputNumber min={0} className="w-full" placeholder="Ví dụ: 120" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="hasCustomPrices" valuePropName="checked">
                <Checkbox onChange={(e) => {
                  const checked = e.target.checked;
                  setHasCustomPrices(checked);
                  if (checked) {
                    const chosenBuilding = buildings.find(b => b.id === form.getFieldValue('buildingId'));
                    if (chosenBuilding) {
                      const s = chosenBuilding.service || { electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000 };
                      form.setFieldsValue({
                        electricityPrice: parseFloat(s.electricityPrice),
                        waterPrice: parseFloat(s.waterPrice),
                        internetPrice: parseFloat(s.internetPrice),
                        cleaningPrice: parseFloat(s.cleaningPrice)
                      });
                    }
                  }
                }}>
                  Thiết lập đơn giá dịch vụ thỏa thuận riêng cho phòng này
                </Checkbox>
              </Form.Item>

              {hasCustomPrices && (
                <Row gutter={[12, 12]} className="custom-prices">
                  <Col xs={12} sm={6}>
                    <Form.Item name="electricityPrice" label="Giá Điện (VND/kWh)">
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="waterPrice" label="Giá Nước (VND/m³)">
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="internetPrice" label="Mạng Internet (/tháng)">
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="cleaningPrice" label="Phí vệ sinh (/tháng)">
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </div>

            {/* ĐIỀU 3: ĐỒ DÙNG BÀN GIAO */}
            <div className="paper-section">
              <div className="paper-section-head">
                <strong>ĐIỀU 3: DANH SÁCH ĐỒ DÙNG & THIẾT BỊ BÀN GIAO KÈM PHÒNG TRỌ</strong>
                <Button
                  type="dashed"
                  size="small"
                  icon={<Plus size={12} aria-hidden="true" />}
                  onClick={() => setInventoryList([...inventoryList, { name: '', quantity: 1, status: 'Bình thường' }])}
                >
                  Thêm đồ dùng
                </Button>
              </div>

              <table className="inv-table is-edit">
                <thead>
                  <tr>
                    <th className="c col-stt">STT</th>
                    <th>Tên loại thiết bị / đồ dùng</th>
                    <th className="c col-qty">Số lượng</th>
                    <th className="col-state">Tình trạng bàn giao</th>
                    <th className="c col-del">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.map((item, idx) => (
                    <tr key={idx}>
                      <td className="c">{idx + 1}</td>
                      <td>
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...inventoryList];
                            updated[idx].name = e.target.value;
                            setInventoryList(updated);
                          }}
                          placeholder="Tên thiết bị..."
                          size="small"
                          variant="borderless"
                          aria-label={`Tên thiết bị dòng ${idx + 1}`}
                        />
                      </td>
                      <td className="c">
                        <InputNumber
                          min={1}
                          value={item.quantity}
                          onChange={(val) => {
                            const updated = [...inventoryList];
                            updated[idx].quantity = val || 1;
                            setInventoryList(updated);
                          }}
                          size="small"
                          className="w-60"
                          aria-label={`Số lượng dòng ${idx + 1}`}
                        />
                      </td>
                      <td>
                        <Input
                          value={item.status}
                          onChange={(e) => {
                            const updated = [...inventoryList];
                            updated[idx].status = e.target.value;
                            setInventoryList(updated);
                          }}
                          size="small"
                          variant="borderless"
                          aria-label={`Tình trạng dòng ${idx + 1}`}
                        />
                      </td>
                      <td className="c">
                        <Button
                          type="text"
                          danger
                          size="small"
                          aria-label={`Xóa dòng ${idx + 1}`}
                          icon={<Trash2 size={14} aria-hidden="true" />}
                          onClick={() => setInventoryList(inventoryList.filter((_, i) => i !== idx))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CHỮ KÝ 2 BÊN TRÊN BẢN GIẤY */}
            <div className="paper-signs">
              <div className="paper-sign">
                <strong>ĐẠI DIỆN BÊN A (CHỦ NHÀ)</strong><br />
                <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
                {landlordSignature ? (
                  <div className="paper-sign-slot">
                    <img src={landlordSignature} alt="Chữ ký bên A" className="paper-sign-img" /><br />
                    <Button size="small" type="link" onClick={() => setSignatureModalVisible(true)}>Ký lại</Button>
                  </div>
                ) : (
                  <div className="paper-sign-slot">
                    <Button type="primary" icon={<FileSignature size={14} aria-hidden="true" />} onClick={() => setSignatureModalVisible(true)}>
                      Vẽ chữ ký số Bên A
                    </Button>
                  </div>
                )}
              </div>

              <div className="paper-sign">
                <strong>ĐẠI DIỆN BÊN B (KHÁCH THUÊ)</strong><br />
                <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
                <div className="paper-sign-wait">
                  (Người thuê sẽ đăng nhập và ký nốt sau khi hợp đồng được khởi tạo)
                </div>
              </div>
            </div>

          </div>

        </Form>
      </Modal>

      {/* MODAL CHI TIẾT HỢP ĐỒNG IN / XEM */}
      <Modal
        title={<span className="modal-title"><FileSignature size={18} aria-hidden="true" /> Bản Hợp đồng thuê phòng trọ chi tiết</span>}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={850}
        centered
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" className="btn-success" icon={<Printer size={14} aria-hidden="true" />} onClick={() => window.print()}>
            In hợp đồng
          </Button>
        ]}
      >
        {selectedContract && (
          <div className="printable-contract">

            <div className="paper-national">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
              <strong>Độc lập - Tự do - Hạnh phúc</strong>
              <div className="paper-national-line" />
            </div>

            <div className="paper-heading">
              <h2 className="paper-title">HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ</h2>
              <small className="paper-basis">Căn cứ Bộ luật Dân sự nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</small>
            </div>

            <p>Hôm nay, ngày {new Date(selectedContract.startDate).getDate()} tháng {new Date(selectedContract.startDate).getMonth() + 1} năm {new Date(selectedContract.startDate).getFullYear()}, chúng tôi gồm có:</p>

            <div className="paper-section">
              <strong>BÊN A: BÊN CHO THUÊ (PHÒNG TRỌ)</strong><br />
              - Họ và Tên: {selectedContract.landlordName || selectedContract.room?.building?.landlord?.name || 'N/A'}<br />
              - Điện thoại: {selectedContract.landlordPhone || selectedContract.room?.building?.landlord?.phone || 'N/A'}<br />
              - CCCD số: {selectedContract.landlordCccd || 'Chưa cung cấp'}<br />
              - HK thường trú: {selectedContract.landlordHometown || 'N/A'}<br />
              - Địa chỉ bàn giao phòng thuê: {selectedContract.landlordAddress || selectedContract.room?.building?.address || 'N/A'}
            </div>

            <div className="paper-section">
              <strong>BÊN B: BÊN THUÊ (PHÒNG TRỌ)</strong><br />
              - Họ và Tên: {selectedContract.tenantName || selectedContract.tenant?.name || 'N/A'}<br />
              - Điện thoại: {selectedContract.tenantPhone || selectedContract.tenant?.phone || 'N/A'}<br />
              - CCCD số: {selectedContract.tenantCccd || 'Chưa cung cấp'} {selectedContract.tenantDob && ` - Ngày sinh: ${selectedContract.tenantDob}`}<br />
              - HK thường trú: {selectedContract.tenantHometown || 'N/A'}
            </div>

            <div className="paper-section">
              <strong>ĐIỀU 1: ĐỐI TƯỢNG CỦA HỢP ĐỒNG</strong><br />
              Bên A đồng ý cho bên B thuê phòng trọ số <strong>{selectedContract.room?.roomNumber}</strong> thuộc tòa nhà <strong>{selectedContract.room?.building?.name}</strong>.<br />
              - Thời hạn thuê phòng là tính từ ngày {new Date(selectedContract.startDate).toLocaleDateString('vi-VN')} đến ngày {new Date(selectedContract.endDate).toLocaleDateString('vi-VN')}.<br />
              - Mục đích thuê để lưu trú sinh hoạt với số lượng người ở thực tế là: {selectedContract.numTenants || 1} người.
            </div>

            <div className="paper-section">
              <strong>ĐIỀU 2: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</strong><br />
              - Hai bên nhất trí giá thuê phòng trọ là: <strong>{formatVND(selectedContract.rentPrice ?? selectedContract.room?.price)} / tháng</strong>.<br />
              - Tiền đặt cọc phòng: <strong>{formatVND(selectedContract.deposit)}</strong> (Được hoàn trả lại đầy đủ khi kết thúc hợp đồng theo quy định).<br />
              - Đơn giá dịch vụ tiện ích áp dụng:<br />
              &nbsp;&nbsp;+ Tiền điện: {formatVND(selectedContract.electricityPrice)} / kWh (Chỉ số đầu: {selectedContract.initialElectricity || 0} kWh)<br />
              &nbsp;&nbsp;+ Tiền nước: {formatVND(selectedContract.waterPrice)} / m³ (Chỉ số đầu: {selectedContract.initialWater || 0} m³)<br />
              &nbsp;&nbsp;+ Phí Internet: {formatVND(selectedContract.internetPrice)} / tháng<br />
              &nbsp;&nbsp;+ Phí vệ sinh dịch vụ: {formatVND(selectedContract.cleaningPrice)} / tháng<br />
              - Kỳ thanh toán: Bên B có nghĩa vụ thanh toán đầy đủ tiền phòng trọ và dịch vụ vào ngày {selectedContract.paymentDay || 30} hàng tháng.
            </div>

            <div className="paper-section">
              <strong>ĐIỀU 3: DANH SÁCH ĐỒ DÙNG VÀ THIẾT BỊ BÊN A BÀN GIAO</strong><br />
              {parseInventory(selectedContract.inventory).length > 0 ? (
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th className="c col-stt">STT</th>
                      <th>Tên loại thiết bị</th>
                      <th className="c col-qty">Số lượng</th>
                      <th>Tình trạng bàn giao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseInventory(selectedContract.inventory).map((item, index) => (
                      <tr key={index}>
                        <td className="c">{index + 1}</td>
                        <td>{item.name}</td>
                        <td className="c">{item.quantity}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span>Không bàn giao thiết bị đặc biệt nào kèm theo.</span>
              )}
            </div>

            {selectedContract.status === 'terminated' && (
              <div className="paper-section">
                <strong>BIÊN BẢN THANH LÝ</strong><br />
                Ngày thanh lý: {selectedContract.terminatedAt ? new Date(selectedContract.terminatedAt).toLocaleDateString('vi-VN') : 'N/A'}<br />
                Ghi chú: {selectedContract.terminationNote || 'Không có'}
              </div>
            )}

            <div className="paper-signs">
              <div className="paper-sign">
                <strong>Đại diện Bên A</strong><br />
                <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
                {selectedContract.landlordSignature ? (
                  <div className="paper-sign-slot">
                    <img src={selectedContract.landlordSignature} alt="Chữ ký bên A" className="paper-sign-img" /><br />
                    <small className="paper-sign-hint">Ký ngày: {selectedContract.landlordSignedAt ? new Date(selectedContract.landlordSignedAt).toLocaleDateString('vi-VN') : 'N/A'}</small>
                  </div>
                ) : <div className="paper-sign-gap" />}
                <strong>{selectedContract.landlordName || selectedContract.room?.building?.landlord?.name || 'N/A'}</strong>
              </div>
              <div className="paper-sign">
                <strong>Đại diện Bên B</strong><br />
                <small className="paper-sign-hint">(Ký và ghi rõ họ tên)</small>
                {selectedContract.tenantSignature ? (
                  <div className="paper-sign-slot">
                    <img src={selectedContract.tenantSignature} alt="Chữ ký bên B" className="paper-sign-img" /><br />
                    <small className="paper-sign-hint">Ký ngày: {selectedContract.tenantSignedAt ? new Date(selectedContract.tenantSignedAt).toLocaleDateString('vi-VN') : 'N/A'}</small>
                  </div>
                ) : (
                  <div className="paper-sign-wait">(Chờ người thuê ký xác nhận)</div>
                )}
                <strong>{selectedContract.tenantName || selectedContract.tenant?.name || 'N/A'}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẠO NHANH TÀI KHOẢN KHÁCH THUÊ */}
      <Modal
        title={<span className="modal-title"><UserPlus size={18} aria-hidden="true" /> Tạo nhanh tài khoản khách thuê mới</span>}
        open={quickTenantModalVisible}
        onCancel={() => setQuickTenantModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setQuickTenantModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" className="btn-success" loading={quickTenantLoading} onClick={() => quickTenantForm.submit()}>
            Tạo & Chọn khách này
          </Button>
        ]}
        width={420}
        centered
      >
        <Form
          form={quickTenantForm}
          layout="vertical"
          onFinish={handleQuickCreateTenant}
          requiredMark={false}
          initialValues={{ password: '123456' }}
          className="modal-form"
        >
          <Form.Item
            name="name"
            label="Họ và tên khách thuê"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên khách thuê!' }]}
          >
            <Input size="large" placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại (tên đăng nhập)"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại gồm 10 chữ số!' }
            ]}
          >
            <Input size="large" inputMode="tel" placeholder="Ví dụ: 0987654321" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu đăng nhập ban đầu"
            rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
          >
            <Input.Password size="large" placeholder="Mặc định: 123456" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL GIA HẠN HỢP ĐỒNG */}
      <Modal
        title={<span className="modal-title"><RotateCcw size={18} aria-hidden="true" /> Gia hạn hợp đồng #{renewTarget?.id}</span>}
        open={!!renewTarget}
        onCancel={() => setRenewTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setRenewTarget(null)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => renewForm.submit()}>Tạo hợp đồng gia hạn</Button>
        ]}
        width={450}
        centered
      >
        {renewTarget && (
          <p className="cell-sub">
            Hợp đồng hiện tại kết thúc ngày {new Date(renewTarget.endDate).toLocaleDateString('vi-VN')}.
            Hợp đồng mới có thể đổi giá thuê và giữ nguyên thông tin hai bên, tiền cọc {formatVND(renewTarget.deposit)} được chuyển sang hợp đồng mới, sau đó chờ khách thuê ký xác nhận.
          </p>
        )}
        <Form form={renewForm} layout="vertical" onFinish={handleRenewContract} requiredMark={false} className="modal-form">
          <Form.Item name="dates" label="Thời hạn thuê mới" rules={[{ required: true, message: 'Chọn thời hạn thuê mới!' }]}>
            <DatePicker.RangePicker
              className="w-full"
              format="DD/MM/YYYY"
              disabledDate={(d) => !!renewTarget?.endDate && !d.isAfter(dayjs(renewTarget.endDate), 'day')}
            />
          </Form.Item>
          <Form.Item name="rentPrice" label="Giá thuê mới (đ/tháng)" rules={[{ required: true, message: 'Nhập giá thuê mới!' }, { type: 'number', min: 0, message: 'Giá thuê không được âm!' }]}>
            <InputNumber min={0} step={100000} formatter={numFormatter} parser={numParser} className="w-full" />
          </Form.Item>
          <Form.Item name="firstLastMonthPolicy" label="Tiền phòng tháng đầu/cuối">
            <Select
              placeholder="Giữ như hợp đồng cũ"
              options={[
                { value: 'full', label: 'Tính tròn tháng' },
                { value: 'prorated', label: 'Tính theo số ngày ở' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* DRAWER YÊU CẦU TỪ KHÁCH (C5) */}
      <Drawer title="Yêu cầu từ khách thuê" open={requestsOpen} onClose={() => setRequestsOpen(false)} width={screens.md ? 760 : '100%'}>
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
              title: 'Ngày', render: (_, r) => (
                <>
                  {r.desiredDate ? new Date(r.desiredDate).toLocaleDateString('vi-VN') : ''}
                  {r.shortNotice && r.status === 'pending' && <div><Tag color="orange">Báo trước dưới 30 ngày</Tag></div>}
                </>
              )
            },
            { title: 'Ghi chú', dataIndex: 'note' },
            {
              title: '', render: (_, r) => (r.status === 'pending' ? (
                <Space>
                  <Button size="small" type="primary" onClick={() => handleRespondRequest(r, 'approved')}>Duyệt</Button>
                  <Button size="small" danger onClick={() => openRespond(r, 'rejected')}>Từ chối</Button>
                </Space>
              ) : (
                <Tag color={r.status === 'approved' ? 'green' : 'red'}>{r.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}</Tag>
              ))
            }
          ]}
        />
      </Drawer>

      {/* MODAL PHẢN HỒI YÊU CẦU: hiện dùng cho từ chối (bắt buộc lý do); duyệt gọi thẳng để mở luồng thanh lý/gia hạn */}
      <Modal
        title={respondTarget?.status === 'rejected' ? 'Từ chối yêu cầu' : 'Duyệt yêu cầu'}
        open={!!respondTarget}
        onCancel={() => setRespondTarget(null)}
        onOk={submitRespond}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: respondTarget?.status === 'rejected' }}
        confirmLoading={respondLoading}
        destroyOnHidden
      >
        <Form form={respondForm} layout="vertical">
          <Form.Item
            name="responseNote"
            label={respondTarget?.status === 'rejected' ? 'Lý do từ chối' : 'Ghi chú cho khách (tùy chọn)'}
            rules={respondTarget?.status === 'rejected'
              ? [{ required: true, whitespace: true, message: 'Vui lòng nhập lý do từ chối' }]
              : []}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL THANH LÝ HỢP ĐỒNG (C1) */}
      <Modal
        title={<span className="modal-title"><FileSignature size={18} aria-hidden="true" /> Thanh lý hợp đồng #{terminateTarget?.id}</span>}
        open={!!terminateTarget}
        onCancel={() => setTerminateTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setTerminateTarget(null)}>Hủy</Button>,
          <Button key="preview" loading={submitLoading} onClick={handlePreviewSettlement}>Tính quyết toán</Button>,
          <Button key="submit" type="primary" danger loading={submitLoading} disabled={!canConfirmTermination(settlement, allowDebtChecked)} onClick={handleTerminateContract}>
            Xác nhận thanh lý
          </Button>
        ]}
        width={560}
        centered
        destroyOnHidden
      >
        <p className="cell-sub">
          Khách ở tới hết kỳ thanh toán, không tính tiền phòng theo ngày. Nếu tháng trả phòng chưa có hóa đơn,
          nhập chỉ số cuối để hệ thống xuất hóa đơn tháng cuối. Hoàn cọc = cọc − hóa đơn chưa trả − hư hỏng.
        </p>
        <Form form={terminateForm} layout="vertical" requiredMark={false} className="modal-form" onValuesChange={(changed, all) => { setAllowDebtChecked(Boolean(all.allowDebt)); if (!('allowDebt' in changed)) setSettlement(null); }}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="terminationDate" label="Ngày trả phòng" rules={[{ required: true, message: 'Chọn ngày trả phòng!' }]}>
                <DatePicker className="w-full" format="DD/MM/YYYY" allowClear={false} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="damageAmount" label="Tiền hư hỏng">
                <InputNumber className="w-full" min={0} step={10000} formatter={numFormatter} parser={numParser} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="finalElectricity" label="Chỉ số điện cuối">
                <InputNumber className="w-full" min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="finalWater" label="Chỉ số nước cuối">
                <InputNumber className="w-full" min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="forfeit" valuePropName="checked" style={{ marginBottom: 4 }}>
            <Checkbox>Mất cọc (khách trả phòng sớm không báo trước)</Checkbox>
          </Form.Item>
          <Form.Item name="allowDebt" valuePropName="checked">
            <Checkbox>Thanh lý và ghi nợ phần còn thiếu (khi công nợ vượt tiền cọc)</Checkbox>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>

        {settlement && (
          <>
            {settlement.needsReadings && (
              <Alert type="info" showIcon style={{ marginBottom: 12 }}
                message="Tháng trả phòng chưa có hóa đơn: khi xác nhận, hệ thống ghi chỉ số cuối và xuất hóa đơn tháng cuối rồi cấn trừ vào cọc." />
            )}
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Cọc đang giữ">{formatVND(settlement.held)}</Descriptions.Item>
              <Descriptions.Item label="Hóa đơn chưa trả">
                {settlement.unpaidInvoices.length === 0 ? 'Không có' : settlement.unpaidInvoices.map((i) => (
                  <div key={i.id}>Hóa đơn #{i.id} ({i.month}/{i.year}): {formatVND(i.totalAmount)}</div>
                ))}
              </Descriptions.Item>
              {settlement.finalInvoiceEstimate !== null && settlement.finalInvoiceEstimate !== undefined && (
                <Descriptions.Item label="Hóa đơn tháng cuối (ước tính)">{formatVND(settlement.finalInvoiceEstimate)}</Descriptions.Item>
              )}
              <Descriptions.Item label="Tiền hư hỏng">{formatVND(settlement.damageAmount)}</Descriptions.Item>
              <Descriptions.Item label="Tổng khấu trừ">{formatVND(settlement.deduct)}</Descriptions.Item>
              <Descriptions.Item label="Hoàn lại cho khách"><b>{formatVND(settlement.refund)}</b>{settlement.forfeit ? ' (mất cọc)' : ''}</Descriptions.Item>
              {Number(settlement.outstandingAmount) > 0 && (
                <Descriptions.Item label="Công nợ còn thiếu sau cấn trừ"><b style={{ color: '#cf1322' }}>{formatVND(settlement.outstandingAmount)}</b></Descriptions.Item>
              )}
            </Descriptions>
            {settlement.blocked && <Alert type="error" showIcon style={{ marginTop: 12 }} message={settlement.blockMessage} />}
          </>
        )}
      </Modal>

      {/* MODAL NGƯỜI Ở CÙNG & TẠM TRÚ (C6) */}
      <Modal
        title={`Người ở cùng & tạm trú - HĐ #${occupantTarget?.id || ''}`}
        open={!!occupantTarget}
        onCancel={() => setOccupantTarget(null)}
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
            { title: 'Họ tên', render: (_, o) => <>{o.fullName}{o.isPrimary && <Tag style={{ marginLeft: 6 }}>Khách chính</Tag>}</> },
            { title: 'CCCD', dataIndex: 'cccd', render: (v) => <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v}</span> },
            {
              title: 'Ảnh CCCD', render: (_, o) => (o.cccdFrontImage || o.cccdBackImage
                ? <Button size="small" icon={<Eye size={14} aria-hidden="true" />}
                    onClick={() => handleViewCccd(occupantTarget.id, `CCCD - ${o.fullName}`, [o.cccdFrontImage, o.cccdBackImage])}>Xem</Button>
                : <Tag>Chưa có ảnh</Tag>)
            },
            { title: 'Quan hệ', dataIndex: 'relation' },
            {
              title: 'Tạm trú', render: (_, o) => (o.residenceStatus === 'registered'
                ? <Tag color="green">Đã khai báo{o.registeredAt ? ` (${new Date(o.registeredAt).toLocaleDateString('vi-VN')})` : ''}</Tag>
                : <Tag color="orange">Chưa khai báo</Tag>)
            },
            {
              title: '', render: (_, o) => (
                <Space>
                  {o.residenceStatus === 'registered' ? (
                    <Button size="small" onClick={() => handleUpdateOccupant(o.id, { residenceStatus: 'not_registered', registeredAt: null })}>Bỏ đánh dấu</Button>
                  ) : (
                    <Button size="small" type="primary" onClick={() => handleUpdateOccupant(o.id, { residenceStatus: 'registered', registeredAt: dayjs().format('YYYY-MM-DD') })}>
                      Đánh dấu đã tạm trú
                    </Button>
                  )}
                  {!o.isPrimary && (
                    <Popconfirm title="Xóa người ở này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => handleRemoveOccupant(o.id)}>
                      <Button size="small" danger aria-label={`Xóa ${o.fullName}`} icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          ]}
        />
        <Form form={occupantForm} name="occupantForm" layout="vertical" onFinish={handleAddOccupant} requiredMark={false} className="modal-form" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="cccd" label="CCCD"><Input /></Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="relation" label="Quan hệ"><Input /></Form.Item>
            </Col>
          </Row>
          <CccdUploadFields />
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Ảnh CCCD 2 mặt bắt buộc, dùng làm minh chứng khai báo tạm trú.</div>
          <Button type="primary" htmlType="submit">Thêm người ở</Button>
        </Form>
      </Modal>

      {/* MODAL XEM ẢNH CCCD */}
      <Modal title={cccdPreview?.title} open={!!cccdPreview} onCancel={closeCccdPreview} footer={null} width={760} centered destroyOnHidden>
        <Row gutter={[12, 12]}>
          {cccdPreview?.urls.map((u, i) => (
            <Col xs={24} sm={12} key={u}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{i === 0 ? 'Mặt trước' : 'Mặt sau'}</div>
              <a href={u} target="_blank" rel="noreferrer">
                <img src={u} alt={`Ảnh CCCD ${i === 0 ? 'mặt trước' : 'mặt sau'}`} style={{ width: '100%', borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </a>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* MODAL TIỀN CỌC HĐ ĐÃ KẾT THÚC */}
      <Modal
        title={`Tiền cọc hợp đồng #${depositTarget?.id || ''}`}
        open={!!depositTarget}
        onCancel={() => setDepositTarget(null)}
        footer={null}
        width={520}
        centered
        destroyOnHidden
      >
        {depositRecords.length === 0 && <p className="cell-sub">Chưa có bản ghi tiền cọc.</p>}
        {depositRecords.map((d) => (
          <div key={d.id} style={{ marginBottom: 8 }}>
            <Tag color={{ held: 'blue', refunded: 'green', deducted: 'orange', forfeited: 'red' }[d.status]}>
              {{ held: 'Đang giữ', refunded: 'Đã hoàn', deducted: 'Khấu trừ', forfeited: 'Mất cọc' }[d.status] || d.status}
            </Tag>
            {formatVND(d.amount)} · hoàn {formatVND(d.refundedAmount)} · trừ {formatVND(d.deductedAmount)}
            {d.note && <div className="cell-sub">{d.note}</div>}
          </div>
        ))}
        {depositRecords.some((d) => d.status === 'held') && (
          <Form form={depositForm} layout="vertical" onFinish={handleRefundDeposit} requiredMark={false} className="modal-form">
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item name="amount" label="Số tiền hoàn trả"><InputNumber className="w-full" min={0} formatter={numFormatter} parser={numParser} /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="deductAmount" label="Số tiền khấu trừ"><InputNumber className="w-full" min={0} formatter={numFormatter} parser={numParser} /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={submitLoading}>Xử lý cọc</Button>
          </Form>
        )}
      </Modal>

      {/* MODAL KÝ SỐ CHỦ NHÀ (BÊN A) */}
      <SignaturePadModal
        open={signatureModalVisible}
        onCancel={() => setSignatureModalVisible(false)}
        onConfirm={(sigBase64) => {
          setLandlordSignature(sigBase64);
          setSignatureModalVisible(false);
          message.success('Đã lưu chữ ký số của Bên A (Chủ nhà)');
        }}
        title="Vẽ chữ ký điện tử đại diện Bên A (Chủ nhà)"
      />
    </div>
  );
};

export default ContractManager;
