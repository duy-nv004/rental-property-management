import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Select, Empty, Spin, Tag, Popover, Badge, message } from 'antd';
import {
  Building2,
  MapPin,
  Navigation,
  Search,
  Maximize2,
  Users,
  SlidersHorizontal,
  RotateCcw,
  LogIn,
  UserPlus,
  LayoutDashboard,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import axiosInstance from '../../utils/axios';
import {
  ROOM_AMENITY_OPTIONS,
  DEFAULT_GEO_FALLBACK,
  DEFAULT_VN_LOCATIONS,
  normalizeText,
  canonicalCityName,
  buildRoomImageUrl,
  formatVND,
  filterAndSortPublicRooms,
  extractLocationOptions,
  mergeLocationOptions,
} from '../../utils/publicRooms';
import '../../styles/public.css';

export const ROOM_PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" fill="none">
      <rect width="800" height="500" fill="#F1F5F9"/>
      <rect x="60" y="60" width="680" height="380" rx="20" fill="#E2E8F0"/>
      <path d="M180 340L320 205L430 305L515 235L620 340H180Z" fill="#0F766E" fill-opacity="0.22"/>
      <circle cx="290" cy="175" r="34" fill="#0F766E" fill-opacity="0.35"/>
      <text x="400" y="395" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="600" fill="#475569">HomeSync · Phòng cho thuê</text>
    </svg>`
  );

const vnFilterOption = (input, option) =>
  normalizeText(option?.label ?? '').includes(normalizeText(input));

const PublicRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState(DEFAULT_VN_LOCATIONS);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);

  // Bộ lọc tìm kiếm & vị trí
  const [city, setCity] = useState(undefined);
  const [district, setDistrict] = useState(undefined);
  const [ward, setWard] = useState(undefined);
  const [searchText, setSearchText] = useState('');
  const [maxPrice, setMaxPrice] = useState(undefined);
  const [minArea, setMinArea] = useState(undefined);
  const [capacity, setCapacity] = useState(undefined);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sort, setSort] = useState('newest');
  const [geoCoords, setGeoCoords] = useState(null); // { lat, lng, label }
  const [radiusKm, setRadiusKm] = useState('5');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const accessToken = localStorage.getItem('accessToken');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const dashboardPath =
    role === 'landlord'
      ? '/landlord/dashboard'
      : role === 'admin'
        ? '/admin/dashboard'
        : '/tenant/contract';

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/public/locations');
      if (res && Array.isArray(res.cities)) {
        setLocations(mergeLocationOptions(DEFAULT_VN_LOCATIONS, res));
      }
    } catch {
      // Giữ danh mục mặc định nếu endpoint locations lỗi; sẽ bổ sung thêm từ danh sách phòng
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 48, sort };
      if (city) params.city = city;
      if (district) params.district = district;
      if (ward) params.ward = ward;
      if (searchText.trim()) params.search = searchText.trim();
      if (maxPrice) params.maxPrice = maxPrice;
      if (minArea) params.minArea = minArea;
      if (capacity) params.capacity = capacity;
      if (selectedAmenities.length > 0) params.amenity = selectedAmenities.join(',');
      if (geoCoords) {
        params.lat = geoCoords.lat;
        params.lng = geoCoords.lng;
        if (radiusKm && radiusKm !== 'all') params.radiusKm = radiusKm;
      }

      const res = await axiosInstance.get('/public/rooms', { params });
      const fetched = Array.isArray(res?.rooms) ? res.rooms : Array.isArray(res) ? res : [];
      setRooms(fetched);

      // Hợp nhất địa điểm suy luận từ danh sách phòng vào danh mục khu vực
      const fromRooms = extractLocationOptions(fetched);
      if (fromRooms.cities.length > 0) {
        setLocations((prev) => mergeLocationOptions(DEFAULT_VN_LOCATIONS, prev, fromRooms));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phòng công khai:', err);
      message.error('Không thể tải danh sách phòng lúc này.');
    } finally {
      setLoading(false);
    }
  }, [city, district, ward, searchText, maxPrice, minArea, capacity, selectedAmenities, sort, geoCoords, radiusKm]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRooms();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchRooms]);

  const districtOptions = useMemo(() => {
    const sortVi = (arr) => arr.sort((a, b) => a.localeCompare(b, 'vi'));
    if (city) {
      if (locations.districtsByCity?.[city]) {
        return locations.districtsByCity[city];
      }
      const cityCanon = canonicalCityName(city);
      const matched = Object.entries(locations.districtsByCity || {})
        .filter(([c]) => canonicalCityName(c) === cityCanon)
        .flatMap(([, ds]) => ds);
      return sortVi(Array.from(new Set(matched)));
    }
    const all = Object.values(locations.districtsByCity || {}).flat();
    return sortVi(Array.from(new Set(all)));
  }, [city, locations]);

  const wardOptions = useMemo(() => {
    const sortVi = (arr) => arr.sort((a, b) => a.localeCompare(b, 'vi'));
    const wardsMap = locations.wardsByDistrict || {};
    if (city && district) {
      const directKey = `${city}|${district}`;
      if (wardsMap[directKey]?.length) {
        return wardsMap[directKey];
      }
      const cityCanon = canonicalCityName(city);
      const matched = Object.entries(wardsMap)
        .filter(([k]) => {
          const [kCity, kDist] = k.split('|');
          return canonicalCityName(kCity) === cityCanon && kDist === district;
        })
        .flatMap(([, list]) => list);
      return sortVi(Array.from(new Set(matched)));
    }
    if (district) {
      const matched = Object.entries(wardsMap)
        .filter(([k]) => k.endsWith(`|${district}`))
        .flatMap(([, list]) => list);
      return sortVi(Array.from(new Set(matched)));
    }
    if (city) {
      const cityCanon = canonicalCityName(city);
      const matched = Object.entries(wardsMap)
        .filter(([k]) => canonicalCityName(k.split('|')[0]) === cityCanon)
        .flatMap(([, list]) => list);
      return sortVi(Array.from(new Set(matched)));
    }
    return sortVi(Array.from(new Set(Object.values(wardsMap).flat())));
  }, [city, district, locations]);

  const displayedRooms = useMemo(
    () =>
      filterAndSortPublicRooms(rooms, {
        city,
        district,
        ward,
        search: searchText,
        maxPrice,
        minArea,
        capacity,
        amenities: selectedAmenities,
        userLat: geoCoords?.lat,
        userLng: geoCoords?.lng,
        radiusKm: geoCoords && radiusKm !== 'all' ? radiusKm : undefined,
        sort,
      }),
    [rooms, city, district, ward, searchText, maxPrice, minArea, capacity, selectedAmenities, geoCoords, radiusKm, sort]
  );

  const handleFindNearMe = () => {
    setGeoLoading(true);
    const applyCoords = (lat, lng, label) => {
      setGeoCoords({ lat, lng, label });
      setSort('nearest');
      setGeoLoading(false);
    };

    if (!navigator?.geolocation) {
      message.info(`Trình duyệt không hỗ trợ GPS, sử dụng vị trí mặc định (${DEFAULT_GEO_FALLBACK.label}).`);
      applyCoords(DEFAULT_GEO_FALLBACK.lat, DEFAULT_GEO_FALLBACK.lng, DEFAULT_GEO_FALLBACK.label);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, 'Vị trí hiện tại của bạn');
        message.success('Đã xác định vị trí của bạn để tìm phòng lân cận.');
      },
      () => {
        message.info(`Chưa lấy được GPS thiết bị, hiển thị phòng gần ${DEFAULT_GEO_FALLBACK.label}.`);
        applyCoords(DEFAULT_GEO_FALLBACK.lat, DEFAULT_GEO_FALLBACK.lng, DEFAULT_GEO_FALLBACK.label);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  };

  const toggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
    );
  };

  const handleResetFilters = () => {
    setCity(undefined);
    setDistrict(undefined);
    setWard(undefined);
    setSearchText('');
    setMaxPrice(undefined);
    setMinArea(undefined);
    setCapacity(undefined);
    setSelectedAmenities([]);
    setGeoCoords(null);
    setRadiusKm('5');
    setSort('newest');
  };

  const hasActiveFilters = Boolean(
    city ||
      district ||
      ward ||
      searchText ||
      maxPrice ||
      minArea ||
      capacity ||
      selectedAmenities.length ||
      geoCoords ||
      sort !== 'newest'
  );

  const advancedFilterCount = [
    Boolean(ward),
    Boolean(maxPrice),
    Boolean(minArea),
    Boolean(capacity),
    selectedAmenities.length > 0,
    sort !== 'newest' && !(geoCoords && sort === 'nearest'),
  ].filter(Boolean).length;

  const filterPopoverContent = (
    <div className="public-filter-popover" data-testid="advanced-filter-popover">
      <div className="public-filter-popover-grid">
        <div>
          <label className="public-field-label" htmlFor="filter-ward">
            Phường / Xã
          </label>
          <Select
            id="filter-ward"
            aria-label="Phường / Xã"
            size="large"
            style={{ width: '100%' }}
            placeholder="Tất cả Phường/Xã"
            allowClear
            showSearch
            virtual={wardOptions.length > 80}
            filterOption={vnFilterOption}
            getPopupContainer={(trigger) => trigger.parentElement}
            notFoundContent="Chưa có dữ liệu Phường/Xã phù hợp"
            value={ward}
            onChange={(val) => setWard(val)}
            options={wardOptions.map((w) => ({ label: w, value: w }))}
          />
        </div>

        <div>
          <label className="public-field-label" htmlFor="filter-price">
            Mức giá tối đa
          </label>
          <Select
            id="filter-price"
            aria-label="Mức giá tối đa"
            size="large"
            style={{ width: '100%' }}
            allowClear
            placeholder="Mọi mức giá"
            getPopupContainer={(trigger) => trigger.parentElement}
            value={maxPrice}
            onChange={setMaxPrice}
            options={[
              { label: 'Dưới 3 triệu/tháng', value: '3000000' },
              { label: 'Dưới 5 triệu/tháng', value: '5000000' },
              { label: 'Dưới 8 triệu/tháng', value: '8000000' },
              { label: 'Dưới 12 triệu/tháng', value: '12000000' },
            ]}
          />
        </div>

        <div>
          <label className="public-field-label" htmlFor="filter-area">
            Diện tích tối thiểu
          </label>
          <Select
            id="filter-area"
            aria-label="Diện tích tối thiểu"
            size="large"
            style={{ width: '100%' }}
            allowClear
            placeholder="Mọi diện tích"
            getPopupContainer={(trigger) => trigger.parentElement}
            value={minArea}
            onChange={setMinArea}
            options={[
              { label: 'Từ 15 m²', value: '15' },
              { label: 'Từ 20 m²', value: '20' },
              { label: 'Từ 30 m²', value: '30' },
            ]}
          />
        </div>

        <div>
          <label className="public-field-label" htmlFor="filter-capacity">
            Sức chứa
          </label>
          <Select
            id="filter-capacity"
            aria-label="Sức chứa"
            size="large"
            style={{ width: '100%' }}
            allowClear
            placeholder="Mọi sức chứa"
            getPopupContainer={(trigger) => trigger.parentElement}
            value={capacity}
            onChange={setCapacity}
            options={[
              { label: 'Từ 1 người', value: '1' },
              { label: 'Từ 2 người', value: '2' },
              { label: 'Từ 3 người trở lên', value: '3' },
            ]}
          />
        </div>

        <div>
          <label className="public-field-label" htmlFor="filter-sort">
            Sắp xếp theo
          </label>
          <Select
            id="filter-sort"
            aria-label="Sắp xếp theo"
            size="large"
            style={{ width: '100%' }}
            getPopupContainer={(trigger) => trigger.parentElement}
            value={sort}
            onChange={setSort}
            options={[
              { label: 'Phòng mới đăng', value: 'newest' },
              { label: 'Gần vị trí của tôi', value: 'nearest', disabled: !geoCoords },
              { label: 'Giá thấp đến cao', value: 'price_asc' },
              { label: 'Giá cao đến thấp', value: 'price_desc' },
            ]}
          />
        </div>

        {geoCoords && (
          <div>
            <label className="public-field-label" htmlFor="filter-radius">
              Bán kính GPS
            </label>
            <Select
              id="filter-radius"
              aria-label="Bán kính tìm kiếm"
              size="large"
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement}
              value={radiusKm}
              onChange={setRadiusKm}
              options={[
                { label: 'Bán kính 2 km', value: '2' },
                { label: 'Bán kính 5 km', value: '5' },
                { label: 'Bán kính 10 km', value: '10' },
                { label: 'Mọi khoảng cách', value: 'all' },
              ]}
            />
          </div>
        )}
      </div>

      <div className="public-filter-popover-section">
        <span className="public-field-label">Tiện ích phòng</span>
        <div className="public-amenity-pills" role="group" aria-label="Lọc theo tiện ích phòng">
          {ROOM_AMENITY_OPTIONS.map((amenity) => {
            const active = selectedAmenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                aria-pressed={active}
                className={`public-amenity-chip${active ? ' is-active' : ''}`}
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      <div className="public-filter-popover-footer">
        {hasActiveFilters && (
          <Button
            icon={<RotateCcw size={14} aria-hidden="true" />}
            onClick={() => {
              handleResetFilters();
              setFilterPopoverOpen(false);
            }}
          >
            Đặt lại bộ lọc
          </Button>
        )}
        <Button type="primary" onClick={() => setFilterPopoverOpen(false)}>
          Áp dụng
        </Button>
      </div>
    </div>
  );

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-container public-header-inner">
          <Link to="/rooms" className="public-brand">
            <span className="public-brand-mark" aria-hidden="true">
              <Building2 size={20} />
            </span>
            <span>HomeSync · Tìm phòng trọ</span>
          </Link>

          <nav className="public-header-actions" aria-label="Điều hướng chính">
            {accessToken ? (
              <>
                <Button
                  type="primary"
                  className="public-btn-touch"
                  icon={<LayoutDashboard size={16} aria-hidden="true" />}
                  onClick={() => navigate(dashboardPath)}
                >
                  {role === 'tenant' ? 'Hợp đồng & Lịch hẹn' : 'Trang quản lý'}
                </Button>
                <Button
                  className="public-btn-touch"
                  icon={<LogOut size={16} aria-hidden="true" />}
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="public-btn-touch"
                  icon={<LogIn size={16} aria-hidden="true" />}
                  onClick={() => navigate('/login')}
                >
                  Đăng nhập
                </Button>
                <Button
                  type="primary"
                  className="public-btn-touch"
                  icon={<UserPlus size={16} aria-hidden="true" />}
                  onClick={() => navigate('/register?role=tenant')}
                >
                  Đăng ký
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-container">
          <div className="public-hero-compact-head">
            <h1 className="public-hero-title">Tìm phòng trọ &amp; căn hộ phù hợp</h1>
            <p className="public-hero-subtitle">
              Giá điện nước niêm yết · Lọc theo khu vực hoặc GPS · Đặt cọc giữ phòng &amp; ký hợp đồng online
            </p>
          </div>

          <div className="public-search-panel">
            <div className="public-search-grid">
              <Select
                id="filter-city"
                aria-label="Tỉnh / Thành phố"
                size="large"
                style={{ width: '100%' }}
                placeholder="Tỉnh / Thành phố"
                allowClear
                showSearch
                virtual={false}
                filterOption={vnFilterOption}
                notFoundContent="Không tìm thấy Tỉnh/Thành phù hợp"
                value={city}
                onChange={(val) => {
                  setCity(val);
                  setDistrict(undefined);
                  setWard(undefined);
                }}
                options={locations.cities.map((c) => ({ label: c, value: c }))}
              />

              <Select
                id="filter-district"
                aria-label="Quận / Huyện"
                size="large"
                style={{ width: '100%' }}
                placeholder="Quận / Huyện"
                allowClear
                showSearch
                virtual={districtOptions.length > 80}
                filterOption={vnFilterOption}
                notFoundContent="Không tìm thấy Quận/Huyện phù hợp"
                value={district}
                onChange={(val) => {
                  setDistrict(val);
                  setWard(undefined);
                }}
                options={districtOptions.map((d) => ({ label: d, value: d }))}
              />

              <Input
                id="filter-keyword"
                aria-label="Tìm theo đường, tên tòa nhà"
                size="large"
                allowClear
                prefix={<Search size={16} color="#64748b" aria-hidden="true" />}
                placeholder="Tìm tên đường, khu vực, tòa nhà..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <div className="public-search-actions">
                <Button
                  data-testid="btn-near-me"
                  type={geoCoords ? 'primary' : 'default'}
                  className="public-btn-touch"
                  loading={geoLoading}
                  icon={<Navigation size={16} aria-hidden="true" />}
                  onClick={handleFindNearMe}
                >
                  Tìm quanh vị trí của tôi
                </Button>

                <Popover
                  trigger="click"
                  placement="bottomRight"
                  open={filterPopoverOpen}
                  onOpenChange={setFilterPopoverOpen}
                  content={filterPopoverContent}
                >
                  <Badge count={advancedFilterCount} size="small" offset={[-4, 4]}>
                    <Button
                      data-testid="btn-more-filters"
                      aria-label="Bộ lọc nâng cao"
                      aria-expanded={filterPopoverOpen}
                      type={advancedFilterCount > 0 ? 'primary' : 'default'}
                      className="public-btn-touch"
                      icon={<SlidersHorizontal size={16} aria-hidden="true" />}
                    >
                      Bộ lọc
                    </Button>
                  </Badge>
                </Popover>

                {hasActiveFilters && (
                  <Button
                    className="public-btn-touch"
                    icon={<RotateCcw size={15} aria-hidden="true" />}
                    onClick={handleResetFilters}
                  >
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>
            </div>

            {geoCoords && (
              <div className="public-geo-bar">
                <div className="public-geo-actions">
                  <Tag color="cyan" style={{ margin: 0, padding: '6px 10px', borderRadius: 8 }}>
                    Đang lọc quanh: {geoCoords.label}
                  </Tag>
                  <Select
                    aria-label="Bán kính tìm kiếm"
                    size="middle"
                    value={radiusKm}
                    onChange={setRadiusKm}
                    style={{ minWidth: 150 }}
                    options={[
                      { label: 'Bán kính 2 km', value: '2' },
                      { label: 'Bán kính 5 km', value: '5' },
                      { label: 'Bán kính 10 km', value: '10' },
                      { label: 'Mọi khoảng cách', value: 'all' },
                    ]}
                  />
                  <Button
                    size="middle"
                    onClick={() => {
                      setGeoCoords(null);
                      if (sort === 'nearest') setSort('newest');
                    }}
                  >
                    Xóa vị trí
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="public-container">
        <div className="public-results-toolbar">
          <div className="public-results-count">
            Tìm thấy <strong>{displayedRooms.length}</strong> phòng trống sẵn sàng cho thuê
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '72px 0', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: '#475569' }}>Đang tải danh sách phòng...</div>
          </div>
        ) : displayedRooms.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 48, border: '1px solid #e2e8f0', marginBottom: 48 }}>
            <Empty
              description="Chưa có phòng trống nào khớp với bộ lọc vị trí và tiêu chí hiện tại."
            >
              <Button type="primary" className="public-btn-touch" onClick={handleResetFilters}>
                Xem tất cả phòng trống
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="public-grid">
            {displayedRooms.map((room) => {
              const b = room.building || {};
              const coverSrc =
                room.images && room.images.length > 0
                  ? buildRoomImageUrl(room.images[0])
                  : ROOM_PLACEHOLDER_SVG;
              const fullAddress = [b.address, b.ward, b.district, b.city].filter(Boolean).join(', ');
              const amenitiesList = room.amenities || [];
              const visibleAmenities = amenitiesList.slice(0, 4);
              const extraCount = amenitiesList.length - visibleAmenities.length;

              return (
                <article key={room.id} className="public-room-card" data-testid={`room-card-${room.id}`}>
                  <div className="public-room-media">
                    <img
                      src={coverSrc}
                      alt={`Phòng ${room.roomNumber} tại ${b.name || 'HomeSync'}`}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = ROOM_PLACEHOLDER_SVG;
                      }}
                    />
                    <div className="public-room-media-badges">
                      <span className="public-badge-status">Còn trống</span>
                      {room.distanceKm !== null && room.distanceKm !== undefined && (
                        <span className="public-badge-distance">
                          <Navigation size={12} aria-hidden="true" />
                          Cách bạn {room.distanceKm} km
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="public-room-body">
                    <div className="public-room-price-row">
                      <span className="public-room-price">{formatVND(room.price)}/tháng</span>
                      <span className="public-room-deposit">Cọc {formatVND(room.depositAmount || room.price)}</span>
                    </div>

                    <h2 className="public-room-title">
                      Phòng {room.roomNumber} · {b.name || 'Tòa nhà HomeSync'}
                    </h2>

                    <div className="public-room-address">
                      <MapPin size={15} color="#0F766E" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <span>{fullAddress || 'Đang cập nhật địa chỉ'}</span>
                    </div>

                    <div className="public-room-specs">
                      <span className="public-room-spec-item">
                        <Maximize2 size={14} aria-hidden="true" />
                        {room.area || 20} m²
                      </span>
                      <span className="public-room-spec-item">
                        <Users size={14} aria-hidden="true" />
                        Tối đa {room.capacity || 2} người
                      </span>
                    </div>

                    {visibleAmenities.length > 0 && (
                      <div className="public-room-amenities">
                        {visibleAmenities.map((item) => (
                          <span key={item} className="public-amenity-tag">
                            {item}
                          </span>
                        ))}
                        {extraCount > 0 && <span className="public-amenity-tag">+{extraCount}</span>}
                      </div>
                    )}

                    <div className="public-room-footer">
                      <Button
                        type="primary"
                        block
                        className="public-btn-touch"
                        icon={<ArrowRight size={16} aria-hidden="true" />}
                        iconPlacement="end"
                        onClick={() => navigate(`/rooms/${room.id}`)}
                      >
                        Xem chi tiết &amp; Đặt phòng
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicRooms;
