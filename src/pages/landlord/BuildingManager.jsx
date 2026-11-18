import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Modal, Form, Input, InputNumber, Select, 
  message, Popconfirm, Empty, Spin, Tooltip, Alert, Upload, Tag, Space
} from 'antd';
import { 
  Plus, MapPin, Trash2, Building, Settings, Home, 
  User, AlertTriangle, Clock, CheckCircle2, ArrowRight, ArrowLeft, Edit2,
  FileSignature, Zap, Users, Maximize2, RotateCcw, Wrench, Navigation, Image as ImageIcon
} from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import axiosInstance from '../../utils/axios';
import { vndFormatter, vndParser } from '../../utils/formRules';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ROOM_AMENITY_OPTIONS,
  DEFAULT_GEO_FALLBACK,
  buildRoomImageUrl,
  parseJsonArray,
  inferLocationFromAddress,
  resolveAddressCoordinates,
} from '../../utils/publicRooms';
import {
  searchAddressWithFallback,
  reverseGeocodeLocation,
  getGeoPrecisionMeta,
} from '../../utils/buildingMap';

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createBuildingMarkerIcon = ({ label, hasCoords }) => {
  const safeLabel = escapeHtml(label || 'Chưa có địa chỉ');
  const pinColor = hasCoords ? '#e11d48' : '#0284c7';
  return L.divIcon({
    className: 'building-leaflet-div-icon',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    html: `
      <div data-testid="building-map-pin" style="position:relative; width:32px; height:48px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; pointer-events:auto; cursor:grab;">
        <div style="position:absolute; bottom:34px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.92); color:#fff; font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; white-space:nowrap; max-width:260px; overflow:hidden; text-overflow:ellipsis; box-shadow:0 4px 10px rgba(15,23,42,0.28); border:1px solid rgba(255,255,255,0.2);">
          ${safeLabel}
        </div>
        <div style="width:28px; height:28px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); background:${pinColor}; border:2.5px solid #fff; box-shadow:0 6px 14px rgba(15,23,42,0.32); display:flex; align-items:center; justify-content:center;">
          <div style="width:8px; height:8px; border-radius:50%; background:#fff; transform:rotate(45deg);"></div>
        </div>
      </div>
    `,
  });
};

const BuildingAddressMapPicker = ({ form, open }) => {
  const watchedAddress = Form.useWatch('address', form);
  const watchedCity = Form.useWatch('city', form);
  const watchedDistrict = Form.useWatch('district', form);
  const watchedWard = Form.useWatch('ward', form);
  const watchedLat = Form.useWatch('latitude', form);
  const watchedLng = Form.useWatch('longitude', form);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const lastGeocodedAddressRef = useRef('');
  const wasOpenRef = useRef(false);
  const pinActionSeqRef = useRef(0);
  const handleManualPinRef = useRef(null);

  const [geocoding, setGeocoding] = useState(false);
  const [precision, setPrecision] = useState('estimated');
  const [candidates, setCandidates] = useState([]);
  const [reverseAddress, setReverseAddress] = useState('');
  const [reverseAdmin, setReverseAdmin] = useState(null);

  const applyCandidate = useCallback(
    (candidate, { notify = false } = {}) => {
      if (!candidate) return;
      pinActionSeqRef.current += 1;
      setPrecision(candidate.precision || 'exact');
      setReverseAddress('');
      setReverseAdmin(null);
      form.setFieldsValue({
        city: candidate.city || form.getFieldValue('city') || undefined,
        district: candidate.district || form.getFieldValue('district') || undefined,
        ward: candidate.ward || form.getFieldValue('ward') || undefined,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([candidate.latitude, candidate.longitude], 17, { animate: true });
      }
      if (notify) {
        message.success(`Đã ghim tại: ${candidate.shortAddress || candidate.label || 'vị trí đã chọn'}`);
      }
    },
    [form]
  );

  const handleManualPin = useCallback(
    async (lat, lng) => {
      const nLat = Number(Number(lat).toFixed(6));
      const nLng = Number(Number(lng).toFixed(6));
      if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;

      const reqSeq = ++pinActionSeqRef.current;
      setPrecision('manual');
      setCandidates([]);
      const addr = String(form.getFieldValue('address') || '').trim();
      const inferred = inferLocationFromAddress(addr);
      form.setFieldsValue({
        latitude: nLat,
        longitude: nLng,
        city: form.getFieldValue('city') || inferred.city || undefined,
        district: form.getFieldValue('district') || inferred.district || undefined,
        ward: form.getFieldValue('ward') || inferred.ward || undefined,
      });

      const rev = await reverseGeocodeLocation(nLat, nLng);
      if (reqSeq !== pinActionSeqRef.current) return;
      if (rev) {
        setReverseAddress(rev.shortAddress);
        setReverseAdmin({ city: rev.city, district: rev.district, ward: rev.ward });
        form.setFieldsValue({
          city: rev.city || form.getFieldValue('city') || undefined,
          district: rev.district || form.getFieldValue('district') || undefined,
          ward: rev.ward || form.getFieldValue('ward') || undefined,
        });
      }
    },
    [form]
  );

  handleManualPinRef.current = handleManualPin;

  const applyGeocodedAddress = useCallback(
    async (rawAddress, { notify = false, tryOnline = true } = {}) => {
      const trimmed = String(rawAddress || '').trim();
      lastGeocodedAddressRef.current = trimmed;
      const reqSeq = ++pinActionSeqRef.current;

      if (!tryOnline || !trimmed) {
        const localResult = resolveAddressCoordinates(trimmed);
        setPrecision('estimated');
        setCandidates([]);
        setReverseAddress('');
        setReverseAdmin(null);
        form.setFieldsValue({
          city: localResult.city || undefined,
          district: localResult.district || undefined,
          ward: localResult.ward || undefined,
          latitude: localResult.latitude,
          longitude: localResult.longitude,
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([localResult.latitude, localResult.longitude], 15, { animate: true });
        }
        if (notify) {
          message.info(
            trimmed
              ? `Đang ước lượng theo khu vực (${localResult.label})`
              : `Đã đặt ghim mặc định tại ${DEFAULT_GEO_FALLBACK.label}`
          );
        }
        return;
      }

      setGeocoding(true);
      try {
        const result = await searchAddressWithFallback(trimmed);
        if (reqSeq !== pinActionSeqRef.current) return;
        setPrecision(result.precision);
        setCandidates(result.candidates);
        setReverseAddress('');
        setReverseAdmin(null);
        form.setFieldsValue({
          city: result.primary.city || undefined,
          district: result.primary.district || undefined,
          ward: result.primary.ward || undefined,
          latitude: result.primary.latitude,
          longitude: result.primary.longitude,
        });
        if (mapInstanceRef.current) {
          const targetZoom = result.precision === 'exact' ? 17 : 15;
          mapInstanceRef.current.setView([result.primary.latitude, result.primary.longitude], targetZoom, {
            animate: true,
          });
        }
        if (notify) {
          if (result.precision === 'exact') {
            message.success(`Đã ghim chính xác: ${result.primary.shortAddress}`);
          } else {
            message.warning(
              `Không tìm thấy số nhà/đường cụ thể, tạm ước lượng theo khu vực (${result.primary.label}). Bạn có thể kéo ghim để chỉnh.`
            );
          }
        }
      } finally {
        if (reqSeq === pinActionSeqRef.current) setGeocoding(false);
      }
    },
    [form]
  );

  // Khởi tạo / hủy bản đồ Leaflet khi mở hoặc đóng modal
  useEffect(() => {
    if (!open) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return undefined;
    }

    const el = mapContainerRef.current;
    if (!el || mapInstanceRef.current) return undefined;

    const latVal = Number(form.getFieldValue('latitude'));
    const lngVal = Number(form.getFieldValue('longitude'));
    const initLat = Number.isFinite(latVal) && latVal !== 0 ? latVal : DEFAULT_GEO_FALLBACK.lat;
    const initLng = Number.isFinite(lngVal) && lngVal !== 0 ? lngVal : DEFAULT_GEO_FALLBACK.lng;
    const initAddr = String(form.getFieldValue('address') || '').trim();

    const map = L.map(el, {
      center: [initLat, initLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    const primaryTileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    let switchedToFallback = false;
    primaryTileLayer.on('tileerror', () => {
      if (switchedToFallback) return;
      switchedToFallback = true;
      map.removeLayer(primaryTileLayer);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
    });
    primaryTileLayer.addTo(map);

    const marker = L.marker([initLat, initLng], {
      draggable: true,
      icon: createBuildingMarkerIcon({ label: initAddr, hasCoords: Number.isFinite(latVal) }),
    }).addTo(map);

    map.on('click', (e) => {
      handleManualPinRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      handleManualPinRef.current?.(pos.lat, pos.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const refreshSize = () => {
      map.invalidateSize({ pan: false });
    };
    const resizeTimer1 = setTimeout(refreshSize, 120);
    const resizeTimer2 = setTimeout(refreshSize, 360);
    let observer = null;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(refreshSize);
      observer.observe(el);
    }

    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      observer?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [open, form]);

  // Đồng bộ tâm bản đồ khi mở modal Thêm / Sửa tòa nhà
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const addr = String(form.getFieldValue('address') || '').trim();
      const lat = form.getFieldValue('latitude');
      const lng = form.getFieldValue('longitude');
      lastGeocodedAddressRef.current = addr;
      setCandidates([]);
      setReverseAddress('');
      setReverseAdmin(null);

      if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        setPrecision('exact');
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([numLat, numLng], 16);
        }
        if (addr && (!form.getFieldValue('city') || !form.getFieldValue('district'))) {
          const inferred = inferLocationFromAddress(addr);
          form.setFieldsValue({
            city: form.getFieldValue('city') || inferred.city || undefined,
            district: form.getFieldValue('district') || inferred.district || undefined,
            ward: form.getFieldValue('ward') || inferred.ward || undefined,
          });
        }
      } else if (addr) {
        applyGeocodedAddress(addr, { notify: false, tryOnline: true });
      } else {
        setPrecision('estimated');
      }
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [open, form, applyGeocodedAddress]);

  // Tự động định vị theo địa chỉ khi người dùng nhập / chỉnh sửa địa chỉ (debounce 450ms)
  useEffect(() => {
    if (!open) return;
    const trimmed = String(watchedAddress || '').trim();
    if (!trimmed || trimmed === lastGeocodedAddressRef.current) return;

    const timer = setTimeout(() => {
      applyGeocodedAddress(trimmed, { notify: false, tryOnline: true });
    }, 450);

    return () => clearTimeout(timer);
  }, [watchedAddress, open, applyGeocodedAddress]);

  const handleUseMyGPS = () => {
    const applyCoords = (lat, lng, fallbackNotice) => {
      const nLat = Number(Number(lat).toFixed(6));
      const nLng = Number(Number(lng).toFixed(6));
      handleManualPin(nLat, nLng);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([nLat, nLng], 17, { animate: true });
      }
      if (fallbackNotice) {
        message.info(fallbackNotice);
      } else {
        message.success('Đã ghim theo vị trí GPS hiện tại của bạn!');
      }
    };

    if (!navigator?.geolocation) {
      applyCoords(
        DEFAULT_GEO_FALLBACK.lat,
        DEFAULT_GEO_FALLBACK.lng,
        `Trình duyệt chưa hỗ trợ GPS, đã đặt ghim tại ${DEFAULT_GEO_FALLBACK.label}.`
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude),
      () =>
        applyCoords(
          DEFAULT_GEO_FALLBACK.lat,
          DEFAULT_GEO_FALLBACK.lng,
          `Không lấy được GPS thiết bị, đã đặt ghim gợi ý (${DEFAULT_GEO_FALLBACK.label}).`
        ),
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  const hasCoords =
    watchedLat !== null &&
    watchedLat !== undefined &&
    watchedLat !== '' &&
    watchedLng !== null &&
    watchedLng !== undefined &&
    watchedLng !== '' &&
    Number.isFinite(Number(watchedLat)) &&
    Number.isFinite(Number(watchedLng));

  const activeLat = hasCoords ? Number(watchedLat) : DEFAULT_GEO_FALLBACK.lat;
  const activeLng = hasCoords ? Number(watchedLng) : DEFAULT_GEO_FALLBACK.lng;
  const displayMapAddress =
    reverseAddress || String(watchedAddress || '').trim() || 'Chưa nhập địa chỉ tòa nhà';

  // Đồng bộ vị trí marker và nhãn địa chỉ hiển thị trên ghim Leaflet
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setLatLng([activeLat, activeLng]);
    marker.setIcon(createBuildingMarkerIcon({ label: displayMapAddress, hasCoords }));
  }, [activeLat, activeLng, displayMapAddress, hasCoords]);

  const areaLabel = [watchedWard, watchedDistrict, watchedCity].filter(Boolean).join(', ');
  const precisionMeta = getGeoPrecisionMeta(precision);

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Trường ẩn lưu tọa độ & khu vực hành chính suy luận cho payload API */}
      <Form.Item name="city" hidden><Input /></Form.Item>
      <Form.Item name="district" hidden><Input /></Form.Item>
      <Form.Item name="ward" hidden><Input /></Form.Item>
      <Form.Item name="latitude" hidden><InputNumber /></Form.Item>
      <Form.Item name="longitude" hidden><InputNumber /></Form.Item>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
            Ghim vị trí tòa nhà trên bản đồ
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Kéo bản đồ, chạm hoặc kéo thả ghim đến đúng vị trí tòa nhà
          </div>
        </div>
        <Space size={6}>
          <Button
            size="small"
            type="primary"
            ghost
            loading={geocoding}
            data-testid="btn-geocode-address"
            icon={<MapPin size={14} aria-hidden="true" />}
            onClick={() => applyGeocodedAddress(form.getFieldValue('address'), { notify: true, tryOnline: true })}
          >
            Ghim theo địa chỉ
          </Button>
          <Button
            size="small"
            data-testid="btn-map-my-gps"
            icon={<Navigation size={14} aria-hidden="true" />}
            onClick={handleUseMyGPS}
          >
            GPS hiện tại
          </Button>
        </Space>
      </div>

      {/* Khung bản đồ Leaflet tương tác */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        <div
          ref={mapContainerRef}
          role="application"
          aria-label="Bản đồ ghim tọa độ tòa nhà"
          data-testid="building-map-canvas"
          style={{
            height: 240,
            minHeight: 240,
            width: '100%',
            background: '#eef2f6',
          }}
        />

        {/* Điều khiển thu phóng & căn giữa */}
        <div
          data-map-control="true"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Button
            size="small"
            data-map-control="true"
            aria-label="Phóng to bản đồ"
            onClick={(e) => {
              e.stopPropagation();
              mapInstanceRef.current?.zoomIn();
            }}
            style={{ width: 28, height: 28, padding: 0, fontWeight: 700 }}
          >
            +
          </Button>
          <Button
            size="small"
            data-map-control="true"
            aria-label="Thu nhỏ bản đồ"
            onClick={(e) => {
              e.stopPropagation();
              mapInstanceRef.current?.zoomOut();
            }}
            style={{ width: 28, height: 28, padding: 0, fontWeight: 700 }}
          >
            −
          </Button>
          <Button
            size="small"
            data-map-control="true"
            aria-label="Căn giữa ghim"
            onClick={(e) => {
              e.stopPropagation();
              mapInstanceRef.current?.setView([activeLat, activeLng], 17, { animate: true });
            }}
            icon={<RotateCcw size={12} aria-hidden="true" />}
            style={{ width: 28, height: 28, padding: 0 }}
          />
        </div>
      </div>

      {/* Địa chỉ hiển thị rõ ràng gắn với điểm ghim trên bản đồ */}
      <div
        data-testid="building-map-address-label"
        style={{
          marginTop: 8,
          padding: '6px 10px',
          borderRadius: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          fontSize: 12.5,
          color: '#1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <MapPin size={14} color="#e11d48" style={{ flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>
            {reverseAddress ? `Vị trí ghim: ${reverseAddress}` : `Địa chỉ trên map: ${displayMapAddress}`}
          </span>
        </div>
        {reverseAddress && reverseAddress !== String(watchedAddress || '').trim() && (
          <Button
            size="small"
            type="link"
            data-testid="btn-apply-reverse-address"
            style={{ padding: 0, height: 'auto', fontSize: 12 }}
            onClick={() => {
              lastGeocodedAddressRef.current = reverseAddress;
              form.setFieldsValue({
                address: reverseAddress,
                city: reverseAdmin?.city || form.getFieldValue('city') || undefined,
                district: reverseAdmin?.district || form.getFieldValue('district') || undefined,
                ward: reverseAdmin?.ward || form.getFieldValue('ward') || undefined,
              });
              message.success('Đã cập nhật ô địa chỉ theo điểm ghim!');
            }}
          >
            Dùng địa chỉ này
          </Button>
        )}
      </div>

      {/* Gợi ý địa chỉ khi Nominatim trả về nhiều kết quả */}
      {candidates.length > 1 && (
        <div
          data-testid="building-map-suggestions"
          style={{
            marginTop: 6,
            padding: '6px 8px',
            borderRadius: 8,
            background: '#fff',
            border: '1px solid #cbd5e1',
          }}
        >
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4 }}>
            Chọn đúng vị trí gợi ý từ bản đồ:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {candidates.map((item) => {
              const isSelected =
                Math.abs(item.latitude - activeLat) < 0.00001 &&
                Math.abs(item.longitude - activeLng) < 0.00001;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyCandidate(item, { notify: true })}
                  style={{
                    textAlign: 'left',
                    border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  {item.shortAddress}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thanh tóm tắt tọa độ đã ghim, độ chính xác & khu vực suy luận */}
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <Space size={6} wrap>
          <Tag
            color={hasCoords ? 'blue' : 'default'}
            data-testid="building-pinned-coords"
            style={{ margin: 0, borderRadius: 6, padding: '2px 8px' }}
          >
            {hasCoords
              ? `Tọa độ đã ghim: ${activeLat.toFixed(6)}, ${activeLng.toFixed(6)}`
              : 'Chưa ghim tọa độ — hãy nhập địa chỉ hoặc chạm vào bản đồ'}
          </Tag>
          <Tag
            color={precisionMeta.color}
            data-testid="building-geo-precision"
            style={{ margin: 0, borderRadius: 6, padding: '2px 8px' }}
          >
            {precisionMeta.label}
          </Tag>
        </Space>
        {areaLabel ? (
          <Tag
            color="green"
            data-testid="building-inferred-area"
            style={{ margin: 0, borderRadius: 6, padding: '2px 8px' }}
          >
            Khu vực: {areaLabel}
          </Tag>
        ) : (
          <span style={{ fontSize: 12, color: '#94a3b8' }} data-testid="building-inferred-area">
            Ghi rõ Quận/Huyện, Tỉnh/TP trong địa chỉ để lọc khu vực tốt hơn
          </span>
        )}
      </div>
    </div>
  );
};

const formatVND = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

// Trạng thái phòng: dùng chung cho bộ lọc, chú thích và thẻ phòng (T2.19: thêm maintenance)
const ROOM_STATUSES = [
  { key: 'available', label: 'Còn trống', Icon: CheckCircle2 },
  { key: 'reserved', label: 'Chờ ký HĐ', Icon: FileSignature },
  { key: 'occupied', label: 'Đang thuê', Icon: User },
  { key: 'overdue', label: 'Chưa thanh toán', Icon: AlertTriangle },
  { key: 'expiring', label: 'Sắp hết hạn HĐ', Icon: Clock },
  { key: 'expired', label: 'Quá hạn HĐ', Icon: AlertTriangle },
  { key: 'maintenance', label: 'Đang bảo trì', Icon: Wrench },
];
const STATUS_BY_KEY = Object.fromEntries(ROOM_STATUSES.map(s => [s.key, s]));

const BuildingManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Tòa nhà đang được chọn để xem danh sách phòng (nếu null -> hiển thị danh sách tòa nhà)
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const selectedBuildingIdRef = useRef(null);
  selectedBuildingIdRef.current = selectedBuilding?.id || null;

  // Modals
  const [buildingModalVisible, setBuildingModalVisible] = useState(false);
  const [editBuildingModalVisible, setEditBuildingModalVisible] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  // Tòa nhà đang sửa đơn giá dịch vụ. Trước đây dùng selectedBuilding nên mở modal
  // từ danh sách (selectedBuilding = null) thì lưu không chạy.
  const [serviceBuilding, setServiceBuilding] = useState(null);
  const [editRoomModalVisible, setEditRoomModalVisible] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomFileList, setRoomFileList] = useState([]);
  const [editRoomFileList, setEditRoomFileList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [buildingForm] = Form.useForm();
  const [editBuildingForm] = Form.useForm();
  const [roomForm] = Form.useForm();
  const [editRoomForm] = Form.useForm();
  const [serviceForm] = Form.useForm();

  const defaultImages = [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=500',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=500'
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [buildingsData, roomsData] = await Promise.all([
        axiosInstance.get('/manage/buildings'),
        axiosInstance.get('/manage/rooms')
      ]);

      setBuildings(buildingsData);
      setRooms(roomsData);

      // Cập nhật thông tin selectedBuilding nếu đang ở trong view xem phòng
      if (selectedBuildingIdRef.current) {
        const updatedSelected = buildingsData.find(b => b.id === selectedBuildingIdRef.current);
        setSelectedBuilding(updatedSelected || null);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      message.error('Không thể tải danh sách tòa nhà và phòng trọ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chatbot vừa thay đổi dữ liệu (ChatWidget phát 'app:data-changed') thì tải lại
  useEffect(() => {
    const onChanged = () => { fetchData(); };
    window.addEventListener('app:data-changed', onChanged);
    return () => window.removeEventListener('app:data-changed', onChanged);
  }, [fetchData]);

  // ─── TẠO TÒA NHÀ MỚI ────────────────────────────────────────────────────────
  const handleCreateBuilding = async (values) => {
    setSubmitLoading(true);
    try {
      const resolved = resolveAddressCoordinates(values.address);
      const hasCoords =
        values.latitude !== undefined &&
        values.latitude !== null &&
        values.latitude !== '' &&
        values.longitude !== undefined &&
        values.longitude !== null &&
        values.longitude !== '';
      const payload = {
        name: values.name,
        address: values.address,
        city: values.city || resolved.city || undefined,
        district: values.district || resolved.district || undefined,
        ward: values.ward || resolved.ward || undefined,
        latitude: hasCoords ? Number(values.latitude) : resolved.latitude,
        longitude: hasCoords ? Number(values.longitude) : resolved.longitude,
      };
      const res = await axiosInstance.post('/manage/buildings', payload);
      message.success('Đã thêm tòa nhà mới thành công!');
      buildingForm.resetFields();
      setBuildingModalVisible(false);
      await fetchData();
      if (res && res.id) {
        const newB = { ...payload, id: res.id, createdAt: new Date() };
        setSelectedBuilding(newB);
      }
    } catch (err) {
      console.error('Error creating building:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tòa nhà.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── SỬA THÔNG TIN & VỊ TRÍ TÒA NHÀ ────────────────────────────────────────
  const handleOpenEditBuildingModal = (b) => {
    setEditingBuilding(b);
    const hasCoords =
      b.latitude !== null &&
      b.latitude !== undefined &&
      b.longitude !== null &&
      b.longitude !== undefined;
    const resolved = resolveAddressCoordinates(b.address);
    editBuildingForm.setFieldsValue({
      name: b.name,
      address: b.address,
      city: b.city || resolved.city || undefined,
      district: b.district || resolved.district || undefined,
      ward: b.ward || resolved.ward || undefined,
      latitude: hasCoords ? Number(b.latitude) : resolved.latitude,
      longitude: hasCoords ? Number(b.longitude) : resolved.longitude,
    });
    setEditBuildingModalVisible(true);
  };

  const handleUpdateBuilding = async (values) => {
    if (!editingBuilding) return;
    setSubmitLoading(true);
    try {
      const resolved = resolveAddressCoordinates(values.address);
      const hasCoords =
        values.latitude !== undefined &&
        values.latitude !== null &&
        values.latitude !== '' &&
        values.longitude !== undefined &&
        values.longitude !== null &&
        values.longitude !== '';
      const payload = {
        name: values.name,
        address: values.address,
        city: values.city || resolved.city || null,
        district: values.district || resolved.district || null,
        ward: values.ward || resolved.ward || null,
        latitude: hasCoords ? Number(values.latitude) : resolved.latitude,
        longitude: hasCoords ? Number(values.longitude) : resolved.longitude,
      };
      const updated = await axiosInstance.put(`/manage/buildings/${editingBuilding.id}`, payload);
      message.success('Đã cập nhật vị trí & thông tin tòa nhà!');
      setEditBuildingModalVisible(false);
      await fetchData();
      if (selectedBuilding?.id === editingBuilding.id) {
        setSelectedBuilding((prev) => ({ ...prev, ...(updated || payload) }));
      }
    } catch (err) {
      console.error('Error updating building:', err);
      message.error(err.response?.data?.message || 'Không thể cập nhật thông tin tòa nhà.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── XÓA TÒA NHÀ ─────────────────────────────────────────────────────────────
  const handleDeleteBuilding = async (id) => {
    try {
      const response = await axiosInstance.delete(`/manage/buildings/${id}`);
      message.success(response.message || 'Xóa tòa nhà thành công!');
      if (selectedBuilding && selectedBuilding.id === id) {
        setSelectedBuilding(null);
      }
      fetchData();
    } catch (err) {
      console.error('Error deleting building:', err);
      message.error(err.response?.data?.message || 'Không thể xóa tòa nhà.');
    }
  };

  // ─── ĐƠN GIÁ DỊCH VỤ (T2.18: đồng bộ waterPrice 30000) ───────────────────────
  const handleOpenServiceModal = (building) => {
    if (!building) return;
    setServiceBuilding(building);
    const s = building.service || {
      electricityPrice: 3500,
      waterPrice: 30000,
      internetPrice: 100000,
      cleaningPrice: 50000
    };
    serviceForm.setFieldsValue({
      electricityPrice: parseFloat(s.electricityPrice),
      waterPrice: parseFloat(s.waterPrice),
      internetPrice: parseFloat(s.internetPrice),
      cleaningPrice: parseFloat(s.cleaningPrice)
    });
    setServiceModalVisible(true);
  };

  const handleUpdateService = async (values) => {
    if (!serviceBuilding) return;
    setSubmitLoading(true);
    try {
      await axiosInstance.put(`/manage/buildings/${serviceBuilding.id}/service`, values);
      message.success('Đã cập nhật đơn giá dịch vụ tòa nhà!');
      setServiceModalVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể cập nhật đơn giá dịch vụ.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── TẠO PHÒNG TRỌ MỚI ─────────────────────────────────────────────────────
  const handleCreateRoom = async (values) => {
    setSubmitLoading(true);
    try {
      const bId = values.buildingId || selectedBuilding?.id;
      const newFiles = roomFileList.filter((f) => f.originFileObj).map((f) => f.originFileObj);
      const amenitiesVal = Array.isArray(values.amenities) ? values.amenities : [];

      if (newFiles.length > 0) {
        const formData = new FormData();
        formData.append('buildingId', bId);
        formData.append('roomNumber', values.roomNumber);
        formData.append('price', values.price);
        formData.append('capacity', values.capacity);
        formData.append('area', values.area);
        if (values.depositAmount !== undefined && values.depositAmount !== null && values.depositAmount !== '') {
          formData.append('depositAmount', values.depositAmount);
        }
        if (values.description) {
          formData.append('description', values.description);
        }
        formData.append('amenities', JSON.stringify(amenitiesVal));
        newFiles.slice(0, 5).forEach((file) => formData.append('roomImages', file));
        await axiosInstance.post('/manage/rooms', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axiosInstance.post('/manage/rooms', {
          roomNumber: values.roomNumber,
          price: values.price,
          capacity: values.capacity,
          area: values.area,
          buildingId: bId,
          depositAmount: values.depositAmount !== undefined && values.depositAmount !== null ? values.depositAmount : undefined,
          amenities: amenitiesVal,
          description: values.description || undefined,
        });
      }
      message.success('Thêm phòng trọ mới thành công!');
      roomForm.resetFields();
      setRoomFileList([]);
      setRoomModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error creating room:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi thêm phòng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── SỬA THÔNG TIN PHÒNG ────────────────────────────────────────────────────
  const isRoomOccupiedOrReserved = (room) => {
    if (!room) return false;
    if (['occupied', 'reserved'].includes(room.status)) return true;
    return Array.isArray(room.contracts) && room.contracts.length > 0;
  };

  const handleOpenEditRoomModal = (room) => {
    setSelectedRoom(room);
    const existingImgs = parseJsonArray(room.images);
    setEditRoomFileList(
      existingImgs.map((filename, idx) => ({
        uid: `existing-${idx}-${filename}`,
        name: filename,
        status: 'done',
        url: buildRoomImageUrl(filename),
        serverFilename: filename,
      }))
    );
    editRoomForm.setFieldsValue({
      roomNumber: room.roomNumber,
      price: parseFloat(room.price),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      capacity: room.capacity || 2,
      area: room.area ? parseFloat(room.area) : 20,
      amenities: parseJsonArray(room.amenities),
      description: room.description || '',
      status: room.status === 'maintenance' ? 'maintenance' : 'empty'
    });
    setEditRoomModalVisible(true);
  };

  const handleUpdateRoom = async (values) => {
    if (!selectedRoom) return;
    setSubmitLoading(true);
    try {
      const keptImages = editRoomFileList
        .filter((f) => !f.originFileObj && f.serverFilename)
        .map((f) => f.serverFilename);
      const newFiles = editRoomFileList.filter((f) => f.originFileObj).map((f) => f.originFileObj);
      const amenitiesVal = Array.isArray(values.amenities) ? values.amenities : [];

      if (newFiles.length > 0) {
        const formData = new FormData();
        formData.append('roomNumber', values.roomNumber);
        formData.append('price', values.price);
        formData.append('capacity', values.capacity);
        formData.append('area', values.area);
        if (values.depositAmount !== undefined && values.depositAmount !== null && values.depositAmount !== '') {
          formData.append('depositAmount', values.depositAmount);
        }
        formData.append('description', values.description || '');
        formData.append('amenities', JSON.stringify(amenitiesVal));
        formData.append('existingImages', JSON.stringify(keptImages));
        if (!isRoomOccupiedOrReserved(selectedRoom) && values.status) {
          formData.append('status', values.status);
        }
        newFiles.slice(0, 5).forEach((file) => formData.append('roomImages', file));
        await axiosInstance.put(`/manage/rooms/${selectedRoom.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          roomNumber: values.roomNumber,
          price: values.price,
          capacity: values.capacity,
          area: values.area,
          depositAmount: values.depositAmount !== undefined && values.depositAmount !== null ? values.depositAmount : null,
          amenities: amenitiesVal,
          description: values.description || '',
          existingImages: keptImages,
          images: keptImages,
        };
        if (!isRoomOccupiedOrReserved(selectedRoom) && values.status) {
          payload.status = values.status;
        }
        await axiosInstance.put(`/manage/rooms/${selectedRoom.id}`, payload);
      }
      message.success('Cập nhật thông tin phòng thành công!');
      setEditRoomModalVisible(false);
      setEditRoomFileList([]);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể cập nhật phòng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── XÓA PHÒNG ──────────────────────────────────────────────────────────────
  const handleDeleteRoom = async (roomId) => {
    try {
      const response = await axiosInstance.delete(`/manage/rooms/${roomId}`);
      message.success(response.message || 'Xóa phòng thành công!');
      fetchData();
      return true;
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xóa phòng.');
      return false;
    }
  };

  // ─── LOGIC TRẠNG THÁI PHÒNG (T2.19: hỗ trợ maintenance) ─────────────────────
  const getRoomStatusDetails = (room) => {
    if (room.status === 'maintenance') {
      return { key: 'maintenance', tenantName: null, contractId: null };
    }
    const activeContract = room.contracts && room.contracts.find(c => c.status === 'active');
    const tenantName = activeContract?.tenant?.name || null;
    // Chỉ tính hóa đơn của hợp đồng hiện tại: nợ của khách cũ không làm phòng bị đánh dấu "Chưa thanh toán".
    const hasUnpaidInvoice = !!activeContract && (room.invoices || []).some(inv => !inv.isPaid && inv.contractId === activeContract.id);

    let diffDays = null;
    if (activeContract && activeContract.endDate) {
      diffDays = Math.ceil((new Date(activeContract.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    }

    const contractId = activeContract?.id || null;
    if (diffDays !== null && diffDays < 0) return { key: 'expired', tenantName, contractId };
    if (hasUnpaidInvoice) return { key: 'overdue', tenantName, contractId };
    if (diffDays !== null && diffDays <= 30) return { key: 'expiring', tenantName, contractId };
    if (activeContract || room.status === 'occupied') return { key: 'occupied', tenantName, contractId };
    // Đã lập hợp đồng, đang chờ khách ký (backend giữ chỗ phòng ở trạng thái 'reserved')
    if (room.status === 'reserved') return { key: 'reserved', tenantName: null, contractId: null };
    return { key: 'available', tenantName: null, contractId: null };
  };

  // ─── GOM PHÒNG THEO TẦNG ────────────────────────────────────────────────────
  const getFloorNumber = (roomNumberStr) => {
    const cleanStr = String(roomNumberStr || '').replace(/\D/g, '');
    if (!cleanStr) return 1;
    const num = parseInt(cleanStr, 10);
    if (num >= 100) {
      return Math.floor(num / 100);
    }
    return 1;
  };

  const currentBuildingRooms = selectedBuilding 
    ? rooms.filter(r => r.buildingId === selectedBuilding.id)
    : [];

  const roomsWithStatus = currentBuildingRooms.map(room => ({ room, status: getRoomStatusDetails(room) }));

  const statusCounts = roomsWithStatus.reduce((acc, { status }) => {
    acc[status.key] = (acc[status.key] || 0) + 1;
    return acc;
  }, {});
  const totalRooms = currentBuildingRooms.length;
  const occupancyRate = totalRooms
    ? Math.round(((totalRooms - (statusCounts.available || 0) - (statusCounts.maintenance || 0)) / totalRooms) * 100)
    : 0;

  const visibleRooms = statusFilter === 'all'
    ? roomsWithStatus
    : roomsWithStatus.filter(r => r.status.key === statusFilter);

  const groupedRoomsByFloor = visibleRooms.reduce((acc, item) => {
    const floor = getFloorNumber(item.room.roomNumber);
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(item);
    return acc;
  }, {});

  const sortedFloors = Object.keys(groupedRoomsByFloor)
    .map(Number)
    .sort((a, b) => b - a);


  const modalTitle = (icon, text) => <span className="modal-title">{icon} {text}</span>;

  // Form đơn giá dịch vụ dùng chung cho cả 2 view (T2.18: thêm chú thích lưu ý)
  const serviceFormItems = (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Lưu ý: Đơn giá mới chỉ áp dụng cho các hợp đồng tạo mới, không làm thay đổi hợp đồng đang hiệu lực."
      />
      <Form.Item name="electricityPrice" label="Đơn giá Điện (VND/kWh)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="waterPrice" label="Đơn giá Nước (VND/m³)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="internetPrice" label="Internet / tháng (VND)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
      <Form.Item name="cleaningPrice" label="Phí vệ sinh / tháng (VND)" rules={[{ required: true }]}>
        <InputNumber min={0} className="w-full" />
      </Form.Item>
    </>
  );

  if (loading && buildings.length === 0) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải danh sách tòa nhà..." />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: TRANG DANH SÁCH TÒA NHÀ
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedBuilding) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Quản lý Tòa nhà"
          description="Danh mục tòa nhà, số phòng và đơn giá dịch vụ chung."
          extra={
            <Button
              type="primary"
              size="large"
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => {
                buildingForm.resetFields();
                setBuildingModalVisible(true);
              }}
            >
              Thêm tòa nhà mới
            </Button>
          }
        />

        {buildings.length === 0 ? (
          <Card variant="borderless" className="stat-card empty-card">
            <Empty description="Bạn chưa thêm tòa nhà nào" />
            <Button type="dashed" onClick={() => setBuildingModalVisible(true)}>
              Thêm ngay
            </Button>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {buildings.map((b, i) => {
              const buildingRoomCount = rooms.filter(r => r.buildingId === b.id).length;
              return (
                <Col xs={24} sm={12} lg={8} key={b.id}>
                  <Card
                    variant="borderless"
                    className="stat-card building-card"
                    hoverable
                    cover={
                      <img
                        alt={`Ảnh tòa nhà ${b.name}`}
                        src={defaultImages[i % defaultImages.length]}
                        className="building-cover"
                        loading="lazy"
                        onClick={() => setSelectedBuilding(b)}
                      />
                    }
                  >
                    <div className="building-head">
                      <button type="button" className="building-name" onClick={() => setSelectedBuilding(b)}>
                        {b.name}
                      </button>
                      <Space size={2}>
                        <Tooltip title="Sửa thông tin & vị trí tòa nhà">
                          <Button
                            type="text"
                            size="small"
                            aria-label={`Sửa tòa nhà ${b.name}`}
                            icon={<Edit2 size={15} aria-hidden="true" />}
                            onClick={() => handleOpenEditBuildingModal(b)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Xóa tòa nhà"
                          description="Bạn có chắc chắn muốn xóa tòa nhà này không? Chỉ xóa được khi tòa nhà không còn phòng trọ nào."
                          okText="Xóa"
                          cancelText="Hủy"
                          onConfirm={() => handleDeleteBuilding(b.id)}
                        >
                          <Button type="text" danger size="small" aria-label={`Xóa tòa nhà ${b.name}`} icon={<Trash2 size={16} aria-hidden="true" />} />
                        </Popconfirm>
                      </Space>
                    </div>

                    <div className="building-addr" title={[b.address, b.ward, b.district, b.city].filter(Boolean).join(', ')}>
                      <MapPin size={14} aria-hidden="true" />
                      <span>{[b.address, b.ward, b.district, b.city].filter(Boolean).join(', ')}</span>
                    </div>

                    <div className="building-stats">
                      <div>
                        <div className="building-stat-label">SỐ PHÒNG</div>
                        <div className="building-stat-value">{buildingRoomCount} phòng</div>
                      </div>
                      <div>
                        <div className="building-stat-label">NGÀY TẠO</div>
                        <div className="building-stat-value">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>

                    <div className="building-actions">
                      <Button type="primary" block className="btn-dark" icon={<ArrowRight size={14} aria-hidden="true" />} onClick={() => setSelectedBuilding(b)}>
                        Xem sơ đồ phòng
                      </Button>
                      <Button type="dashed" block icon={<Settings size={14} aria-hidden="true" />} onClick={() => handleOpenServiceModal(b)}>
                        Đơn giá dịch vụ chung
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* MODAL THÊM TÒA NHÀ MỚI */}
        <Modal
          title={modalTitle(<Building size={18} aria-hidden="true" />, 'Thêm Tòa nhà mới')}
          open={buildingModalVisible}
          onCancel={() => setBuildingModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setBuildingModalVisible(false)}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} onClick={() => buildingForm.submit()}>Lưu lại</Button>
          ]}
          width={580}
          centered
          destroyOnHidden
        >
          <Form form={buildingForm} layout="vertical" onFinish={handleCreateBuilding} requiredMark={false} className="modal-form">
            <Form.Item name="name" label="Tên tòa nhà" rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà!' }]}>
              <Input size="large" placeholder="Ví dụ: Sunshine House, Chung cư cao cấp Láng" />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
              <Input.TextArea rows={2} placeholder="Ví dụ: 15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội" />
            </Form.Item>
            <BuildingAddressMapPicker form={buildingForm} open={buildingModalVisible} />
          </Form>
        </Modal>

        {/* MODAL SỬA THÔNG TIN & VỊ TRÍ TÒA NHÀ */}
        <Modal
          title={modalTitle(<Edit2 size={18} aria-hidden="true" />, `Sửa tòa nhà: ${editingBuilding?.name || ''}`)}
          open={editBuildingModalVisible}
          onCancel={() => setEditBuildingModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setEditBuildingModalVisible(false)}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} onClick={() => editBuildingForm.submit()}>Lưu thay đổi</Button>
          ]}
          width={580}
          centered
          destroyOnHidden
        >
          <Form form={editBuildingForm} layout="vertical" onFinish={handleUpdateBuilding} requiredMark={false} className="modal-form">
            <Form.Item name="name" label="Tên tòa nhà" rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà!' }]}>
              <Input size="large" placeholder="Ví dụ: Sunshine House" />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
              <Input.TextArea rows={2} placeholder="Ví dụ: 15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội" />
            </Form.Item>
            <BuildingAddressMapPicker form={editBuildingForm} open={editBuildingModalVisible} />
          </Form>
        </Modal>

        {/* MODAL ĐƠN GIÁ DỊCH VỤ CHUNG */}
        <Modal
          title={modalTitle(<Building size={18} aria-hidden="true" />, `Cấu hình dịch vụ: ${serviceBuilding?.name || ''}`)}
          open={serviceModalVisible}
          onCancel={() => setServiceModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setServiceModalVisible(false)}>Hủy</Button>,
            <Button key="submit" type="primary" loading={submitLoading} onClick={() => serviceForm.submit()}>Lưu thay đổi</Button>
          ]}
          width={450}
          centered
          destroyOnHidden
        >
          <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} className="modal-form">
            {serviceFormItems}
          </Form>
        </Modal>
      </div>
    );
  }

  const openCreateRoom = () => {
    roomForm.resetFields();
    setRoomFileList([]);
    roomForm.setFieldsValue({ buildingId: selectedBuilding.id });
    setRoomModalVisible(true);
  };

  const priceFormatter = vndFormatter;
  const priceParser = vndParser;

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: SƠ ĐỒ PHÒNG CỦA 1 TÒA NHÀ ("THE ROOM MATRIX")
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">
      <div className="page-header room-page-header">
        <div className="page-header-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Tooltip title="Quay lại danh sách tòa nhà">
                <Button
                  type="text"
                  shape="circle"
                  aria-label="Quay lại danh sách tòa nhà"
                  icon={<ArrowLeft size={20} aria-hidden="true" />}
                  onClick={() => setSelectedBuilding(null)}
                />
              </Tooltip>
              <h1 className="page-header-title" style={{ margin: 0 }}>{selectedBuilding.name}</h1>
            </div>
            <Button type="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={openCreateRoom}>
              Thêm phòng mới
            </Button>
          </div>
        </div>

        {/* Bộ lọc theo trạng thái, kiêm tổng quan số phòng */}
        <div className="room-summary" role="group" aria-label="Lọc phòng theo trạng thái">
          <button
            type="button"
            className={`summary-tile is-all${statusFilter === 'all' ? ' is-active' : ''}`}
            aria-pressed={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            title={`Lấp đầy ${occupancyRate}%`}
          >
            <Home size={14} aria-hidden="true" />
            <span className="summary-label">Tất cả</span>
            <span className="summary-value">{totalRooms}</span>
            <span className="summary-sub">· {occupancyRate}% lấp đầy</span>
          </button>
          {ROOM_STATUSES.filter(({ key }) => key !== 'overdue').map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`summary-tile is-${key}${statusFilter === key ? ' is-active' : ''}`}
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="summary-label">{label}</span>
              <span className="summary-value">{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <Card variant="borderless" className="stat-card">
        {currentBuildingRooms.length > 0 && visibleRooms.length === 0 ? (
          <div className="matrix-empty">
            <Empty description="Không có phòng nào ở trạng thái này" />
          </div>
        ) : currentBuildingRooms.length === 0 ? (
          <div className="matrix-empty">
            <Empty description="Tòa nhà này chưa có phòng trọ nào" />
            <Button type="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={openCreateRoom}>
              Thêm phòng đầu tiên
            </Button>
          </div>
        ) : (
          <div className="floor-list">
            {sortedFloors.map(floorNum => {
              const floorRooms = groupedRoomsByFloor[floorNum] || [];

              return (
                <section key={floorNum} aria-label={`Tầng ${floorNum}`}>
                  <div className="floor-head">
                    <h3 className="floor-title">Tầng {floorNum}</h3>
                    <span className="floor-count">{floorRooms.length} phòng</span>
                    <div className="floor-line" aria-hidden="true" />
                  </div>

                  <Row gutter={[16, 16]}>
                    {floorRooms.map(({ room, status }) => {
                      const { label, Icon } = STATUS_BY_KEY[status.key];
                      const roomImgs = parseJsonArray(room.images);

                      return (
                        <Col xs={24} sm={12} lg={8} xl={6} key={room.id}>
                          <div className={`room-card is-${status.key}`}>
                            <div>
                              <div className="room-top">
                                <div>
                                  <div className="room-number">Phòng {room.roomNumber}</div>
                                  <span className="room-status">
                                    <Icon size={12} aria-hidden="true" /> {label}
                                  </span>
                                </div>
                                <div className="room-tools">
                                  <Tooltip title="Sửa thông tin phòng">
                                    <Button
                                      type="text"
                                      size="small"
                                      aria-label={`Sửa phòng ${room.roomNumber}`}
                                      icon={<Edit2 size={15} color="#64748B" aria-hidden="true" />}
                                      onClick={() => handleOpenEditRoomModal(room)}
                                    />
                                  </Tooltip>
                                </div>
                              </div>

                              {roomImgs.length > 0 && (
                                <div
                                  style={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '16 / 9',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    marginBottom: 10,
                                    background: '#f1f5f9',
                                  }}
                                >
                                  <img
                                    src={buildRoomImageUrl(roomImgs[0])}
                                    alt={`Ảnh phòng ${room.roomNumber}`}
                                    loading="lazy"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                  <Tag
                                    color="rgba(15,23,42,0.78)"
                                    style={{ position: 'absolute', bottom: 6, right: 6, margin: 0, color: '#fff', fontSize: 11 }}
                                  >
                                    <ImageIcon size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
                                    {roomImgs.length} ảnh
                                  </Tag>
                                </div>
                              )}

                              <div className="room-specs">
                                <div className="room-spec">
                                  <span className="room-spec-label">Giá thuê</span>
                                  <span className="room-price">{formatVND(room.price)}<small>/tháng</small></span>
                                </div>
                                <div className="room-spec">
                                  <span className="room-spec-label"><Users size={13} aria-hidden="true" /> Sức chứa</span>
                                  <span>{room.capacity || 2} người</span>
                                </div>
                                <div className="room-spec">
                                  <span className="room-spec-label"><Maximize2 size={13} aria-hidden="true" /> Diện tích</span>
                                  <span>{room.area || 20} m²</span>
                                </div>
                              </div>

                              <div className="room-tenant">
                                <User size={13} aria-hidden="true" />
                                {status.tenantName || {
                                  available: 'Sẵn sàng cho thuê',
                                  reserved: 'Đang chờ khách ký hợp đồng',
                                  maintenance: 'Đang tạm ngưng để bảo trì',
                                }[status.key] || 'Chưa có thông tin khách thuê'}
                              </div>
                            </div>

                            <div className="room-actions">
                              {status.key === 'available' && (
                                <Button
                                  type="primary"
                                  size="small"
                                  className="btn-success"
                                  icon={<FileSignature size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts', { state: { createForRoomId: room.id, buildingId: room.buildingId } })}
                                >
                                  Tạo hợp đồng
                                </Button>
                              )}
                              {status.key === 'reserved' && (
                                <Button
                                  size="small"
                                  icon={<FileSignature size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts')}
                                >
                                  Xem hợp đồng
                                </Button>
                              )}
                              {(status.key === 'expiring' || status.key === 'expired') && status.contractId && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<RotateCcw size={14} aria-hidden="true" />}
                                  onClick={() => navigate('/landlord/contracts', { state: { renewContractId: status.contractId } })}
                                >
                                  Gia hạn
                                </Button>
                              )}
                              {status.key !== 'available' && status.key !== 'reserved' && status.key !== 'maintenance' && (
                              <Button
                                size="small"
                                className="btn-meter"
                                icon={<Zap size={14} color="#D97706" aria-hidden="true" />}
                                onClick={() => navigate('/landlord/utilities', { state: { selectedRoomId: room.id, buildingId: room.buildingId } })}
                              >
                                Chốt số điện
                              </Button>
                              )}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </section>
              );
            })}
          </div>
        )}
      </Card>

      {/* MODAL THÊM PHÒNG TRỌ MỚI */}
      <Modal
        title={modalTitle(<Home size={18} aria-hidden="true" />, 'Thêm Phòng trọ mới')}
        open={roomModalVisible}
        onCancel={() => setRoomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRoomModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => roomForm.submit()}>Thêm phòng</Button>
        ]}
        width={560}
        centered
        destroyOnHidden
      >
        <Form form={roomForm} layout="vertical" onFinish={handleCreateRoom} requiredMark={false} scrollToFirstError className="modal-form">
          <Form.Item name="buildingId" label="Tòa nhà" rules={[{ required: true, message: 'Chọn tòa nhà!' }]}>
            <Select placeholder="Chọn tòa nhà">
              {buildings.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="roomNumber" label="Số phòng / Mã phòng" rules={[{ required: true, message: 'Vui lòng nhập số phòng!' }]}>
                <Input placeholder="Ví dụ: 101, 202, 301" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="price" label="Giá thuê (VND/tháng)" rules={[{ required: true, message: 'Vui lòng nhập giá thuê!' }]}>
                <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" placeholder="3,500,000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="depositAmount" label="Tiền cọc (VND)">
                <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" placeholder="Mặc định = 1 tháng thuê" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="capacity" label="Sức chứa (Người)" rules={[{ required: true, message: 'Nhập sức chứa!' }]} initialValue={2}>
                <InputNumber min={1} max={50} className="w-full" placeholder="2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="area" label="Diện tích (m²)" rules={[{ required: true, message: 'Nhập diện tích!' }]} initialValue={20}>
                <InputNumber min={1} className="w-full" placeholder="20" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="amenities" label="Tiện ích phòng">
            <Select
              mode="tags"
              placeholder="Chọn hoặc nhập tiện ích (Wifi, Điều hòa...)"
              options={ROOM_AMENITY_OPTIONS.map((a) => ({ label: a, value: a }))}
            />
          </Form.Item>
          <Form.Item label="Ảnh phòng (tối đa 5 ảnh)">
            <Upload
              listType="picture-card"
              multiple
              maxCount={5}
              accept="image/*"
              beforeUpload={() => false}
              fileList={roomFileList}
              onChange={({ fileList }) => setRoomFileList(fileList.slice(0, 5))}
            >
              {roomFileList.length < 5 && '+ Tải ảnh'}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL SỬA PHÒNG TRỌ */}
      <Modal
        title={modalTitle(<Edit2 size={18} aria-hidden="true" />, `Quản lý phòng: ${selectedRoom?.roomNumber || ''}`)}
        open={editRoomModalVisible}
        onCancel={() => setEditRoomModalVisible(false)}
        footer={[
          <Popconfirm
            key="delete"
            title="Xóa phòng trọ này?"
            description="Bạn có chắc chắn muốn xóa phòng trọ này không?"
            okText="Xóa phòng"
            cancelText="Hủy"
            onConfirm={async () => {
              const ok = await handleDeleteRoom(selectedRoom?.id);
              if (ok) setEditRoomModalVisible(false);
            }}
          >
            <Button danger className="footer-left">Xóa phòng</Button>
          </Popconfirm>,
          <Button key="cancel" onClick={() => setEditRoomModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => editRoomForm.submit()}>Cập nhật</Button>
        ]}
        width={560}
        centered
        destroyOnHidden
      >
        <Form form={editRoomForm} layout="vertical" onFinish={handleUpdateRoom} requiredMark={false} scrollToFirstError className="modal-form">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="roomNumber" label="Số phòng / Tên phòng" rules={[{ required: true, message: 'Nhập số phòng!' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="price" label="Giá thuê phòng (VND)" rules={[{ required: true, message: 'Nhập giá phòng!' }]}>
                <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="depositAmount" label="Tiền cọc (VND)">
                <InputNumber min={0} formatter={priceFormatter} parser={priceParser} className="w-full" placeholder="Mặc định = 1 tháng thuê" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="capacity" label="Sức chứa (Người)" rules={[{ required: true, message: 'Nhập sức chứa!' }]}>
                <InputNumber min={1} max={50} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="area" label="Diện tích (m²)" rules={[{ required: true, message: 'Nhập diện tích!' }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="amenities" label="Tiện ích phòng">
            <Select
              mode="tags"
              placeholder="Chọn hoặc nhập tiện ích"
              options={ROOM_AMENITY_OPTIONS.map((a) => ({ label: a, value: a }))}
            />
          </Form.Item>
          <Form.Item label="Ảnh phòng (tối đa 5 ảnh)">
            <Upload
              listType="picture-card"
              multiple
              maxCount={5}
              accept="image/*"
              beforeUpload={() => false}
              fileList={editRoomFileList}
              onChange={({ fileList }) => setEditRoomFileList(fileList.slice(0, 5))}
            >
              {editRoomFileList.length < 5 && '+ Tải ảnh'}
            </Upload>
          </Form.Item>

          {!isRoomOccupiedOrReserved(selectedRoom) && (
            <Form.Item name="status" label="Trạng thái phòng">
              <Select>
                <Select.Option value="empty">Còn trống</Select.Option>
                <Select.Option value="maintenance">Đang bảo trì</Select.Option>
              </Select>
            </Form.Item>
          )}

          {selectedRoom?.contracts && selectedRoom.contracts.length > 0 && (
            <div className="tenant-box">
              <div className="tenant-box-label">Khách thuê đang ở</div>
              <div className="tenant-box-value">
                {selectedRoom.contracts[0]?.tenant?.name} ({selectedRoom.contracts[0]?.tenant?.phone})
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* MODAL CẤU HÌNH DỊCH VỤ CHUNG CỦA TÒA NHÀ */}
      <Modal
        title={modalTitle(<Building size={18} aria-hidden="true" />, `Cấu hình dịch vụ: ${serviceBuilding?.name || ''}`)}
        open={serviceModalVisible}
        onCancel={() => setServiceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setServiceModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={submitLoading} onClick={() => serviceForm.submit()}>Lưu đơn giá</Button>
        ]}
        width={450}
        centered
      >
        <Form form={serviceForm} layout="vertical" onFinish={handleUpdateService} requiredMark={false} className="modal-form">
          {serviceFormItems}
        </Form>
      </Modal>
    </div>
  );
};

export default BuildingManager;
