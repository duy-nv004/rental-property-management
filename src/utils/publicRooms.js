/**
 * Các hàm thuần xử lý dữ liệu phòng công khai, tính khoảng cách Haversine GPS,
 * lọc theo vị trí hành chính & tiện ích, và định dạng ảnh/tiền tệ.
 */

import {
  DEFAULT_VN_LOCATIONS,
  PRIORITY_VN_CITIES,
  VN_CITY_ALIASES,
} from './vnAdminData.js';

export { DEFAULT_VN_LOCATIONS };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

export const ROOM_AMENITY_OPTIONS = [
  'Wifi',
  'Điều hòa',
  'Nóng lạnh',
  'Ban công',
  'Máy giặt',
  'Tủ lạnh',
  'Chỗ để xe',
  'Khóa vân tay',
];

export const DEFAULT_GEO_FALLBACK = {
  lat: 21.0285,
  lng: 105.8542,
  label: 'Trung tâm Hà Nội',
};

export const normalizeText = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsToken = (haystack, needle) => {
  if (!haystack || !needle) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:$|[^a-z0-9])`);
  return re.test(haystack);
};

export const canonicalCityName = (str) => {
  const cleaned = normalizeText(str)
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(thanh pho|tp|tinh)\s+/, '');
  if (!cleaned) return '';
  if (['hcm', 'tphcm', 'tp hcm', 'ho chi minh', 'sai gon'].includes(cleaned)) {
    return 'ho chi minh';
  }
  if (['hn', 'ha noi'].includes(cleaned)) {
    return 'ha noi';
  }
  if (['hue', 'thua thien hue'].includes(cleaned)) {
    return 'thua thien hue';
  }
  return cleaned;
};

const CITY_ADDRESS_PATTERNS = DEFAULT_VN_LOCATIONS.cities.map((city) => {
  const baseNorm = normalizeText(city).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const extraAliases = VN_CITY_ALIASES[city] || [];
  const patterns = Array.from(new Set([baseNorm, ...extraAliases]));
  return { city, patterns };
});

const stripAdminPrefix = (name) =>
  normalizeText(name)
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(tp|thanh pho|thi xa|tx|huyen)\s+/, '');

const districtMatchesAddress = (normAddr, districtName) => {
  const full = normalizeText(districtName).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (containsToken(normAddr, full)) return true;
  const stripped = stripAdminPrefix(districtName);
  return stripped !== full && stripped.length >= 3 && containsToken(normAddr, stripped);
};

export const inferLocationFromAddress = (address) => {
  const raw = String(address || '').trim();
  if (!raw) return { city: '', district: '', ward: '' };

  const normAddr = normalizeText(raw).replace(/[.,-]/g, ' ').replace(/\s+/g, ' ').trim();
  let city = '';
  for (const entry of CITY_ADDRESS_PATTERNS) {
    if (entry.patterns.some((p) => containsToken(normAddr, p))) {
      city = entry.city;
      break;
    }
  }

  let district = '';
  if (city) {
    const candidates = [...(DEFAULT_VN_LOCATIONS.districtsByCity[city] || [])].sort(
      (a, b) => b.length - a.length
    );
    district = candidates.find((d) => districtMatchesAddress(normAddr, d)) || '';
  } else {
    const allCandidates = Object.entries(DEFAULT_VN_LOCATIONS.districtsByCity)
      .flatMap(([c, ds]) => ds.map((d) => ({ c, d })))
      .sort((a, b) => b.d.length - a.d.length);
    const hit = allCandidates.find((item) => districtMatchesAddress(normAddr, item.d));
    if (hit) {
      city = hit.c;
      district = hit.d;
    }
  }

  let ward = '';
  if (city && district) {
    const wards = [...(DEFAULT_VN_LOCATIONS.wardsByDistrict[`${city}|${district}`] || [])].sort(
      (a, b) => b.length - a.length
    );
    ward =
      wards.find((w) => containsToken(normAddr, normalizeText(w).replace(/\s+/g, ' '))) || '';
  }

  // Fallback tách chuỗi phân cách dấu phẩy (ví dụ: "12 Đường X, Phường Y, Quận Z, Tỉnh W")
  if (!city || !district) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && !city) {
      const last = parts[parts.length - 1];
      const lastNorm = normalizeText(last).replace(/[.,-]/g, ' ').replace(/\s+/g, ' ').trim();
      const matched = CITY_ADDRESS_PATTERNS.find((entry) =>
        entry.patterns.some((p) => containsToken(lastNorm, p))
      );
      if (matched) city = matched.city;
      else if (parts.length >= 3) city = last;
    }
    if (parts.length >= 3 && !district) {
      district = parts[parts.length - 2];
    }
    if (parts.length >= 4 && !ward) {
      ward = parts[parts.length - 3];
    }
  }

  return { city, district, ward };
};

export const parseJsonArray = (val) => {
  if (Array.isArray(val)) {
    return val.map((x) => String(x || '').trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean);
      }
    } catch {
      return trimmed.split(',').map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
};

export const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  if (
    lat1 === null || lat1 === undefined || lat1 === '' ||
    lng1 === null || lng1 === undefined || lng1 === '' ||
    lat2 === null || lat2 === undefined || lat2 === '' ||
    lng2 === null || lng2 === undefined || lng2 === ''
  ) {
    return null;
  }
  const nums = [lat1, lng1, lat2, lng2].map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [aLat, aLng, bLat, bLng] = nums;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  const dist = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(dist * 10) / 10;
};

export const buildRoomImageUrl = (filename, apiBaseUrl) => {
  const raw = String(filename || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(raw)) return raw;
  const base = (
    apiBaseUrl ??
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ??
    '/api'
  ).replace(/\/+$/, '');
  return `${base}/public/room-images/${encodeURIComponent(raw)}`;
};

export const formatVND = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

export const filterAndSortPublicRooms = (rooms = [], filters = {}) => {
  if (!Array.isArray(rooms)) return [];
  const {
    city,
    district,
    ward,
    search,
    minPrice,
    maxPrice,
    minArea,
    capacity,
    amenities,
    userLat,
    userLng,
    radiusKm,
    sort = 'newest',
  } = filters;

  const hasUserCoords =
    userLat !== null && userLat !== undefined && userLat !== '' &&
    userLng !== null && userLng !== undefined && userLng !== '' &&
    Number.isFinite(Number(userLat)) &&
    Number.isFinite(Number(userLng));

  const cityNorm = normalizeText(city);
  const cityCanonical = canonicalCityName(city);
  const districtNorm = normalizeText(district);
  const wardNorm = normalizeText(ward);
  const searchNorm = normalizeText(search);
  const reqAmenities = parseJsonArray(amenities).map(normalizeText);

  const enriched = rooms
    .map((room) => {
      const b = room.building || {};
      const computedDist =
        room.distanceKm != null
          ? Number(room.distanceKm)
          : hasUserCoords
            ? calculateDistanceKm(userLat, userLng, b.latitude, b.longitude)
            : null;
      return {
        ...room,
        images: parseJsonArray(room.images),
        amenities: parseJsonArray(room.amenities),
        price: Number(room.price || 0),
        depositAmount: Number(room.depositAmount || 0) || Number(room.price || 0),
        area: Number(room.area || 20),
        capacity: Number(room.capacity || 2),
        distanceKm: computedDist,
      };
    })
    .filter((room) => {
      const b = room.building || {};
      const inferred = (!b.city || !b.district || !b.ward) ? inferLocationFromAddress(b.address) : {};
      const roomCity = b.city || inferred.city || '';
      const roomDistrict = b.district || inferred.district || '';
      const roomWard = b.ward || inferred.ward || '';

      if (cityNorm) {
        const bCityMatch =
          normalizeText(roomCity).includes(cityNorm) ||
          normalizeText(b.address).includes(cityNorm) ||
          (cityCanonical && canonicalCityName(roomCity) === cityCanonical);
        if (!bCityMatch) return false;
      }
      if (
        districtNorm &&
        !normalizeText(roomDistrict).includes(districtNorm) &&
        !normalizeText(b.address).includes(districtNorm)
      ) {
        return false;
      }
      if (
        wardNorm &&
        !normalizeText(roomWard).includes(wardNorm) &&
        !normalizeText(b.address).includes(wardNorm)
      ) {
        return false;
      }
      if (searchNorm) {
        const haystack = normalizeText(
          `${room.roomNumber} ${room.description || ''} ${b.name || ''} ${b.address || ''} ${roomWard} ${roomDistrict} ${roomCity}`
        );
        if (!haystack.includes(searchNorm)) return false;
      }
      if (minPrice !== undefined && minPrice !== null && minPrice !== '' && room.price < Number(minPrice)) {
        return false;
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && room.price > Number(maxPrice)) {
        return false;
      }
      if (minArea !== undefined && minArea !== null && minArea !== '' && room.area < Number(minArea)) {
        return false;
      }
      if (capacity !== undefined && capacity !== null && capacity !== '' && room.capacity < Number(capacity)) {
        return false;
      }
      if (reqAmenities.length > 0) {
        const roomAms = room.amenities.map(normalizeText);
        if (!reqAmenities.every((req) => roomAms.some((a) => a.includes(req)))) {
          return false;
        }
      }
      if (hasUserCoords && radiusKm !== undefined && radiusKm !== null && radiusKm !== '' && Number(radiusKm) > 0) {
        if (room.distanceKm === null || room.distanceKm > Number(radiusKm)) {
          return false;
        }
      }
      return true;
    });

  const activeSort = hasUserCoords && sort === 'nearest' ? 'nearest' : sort;
  enriched.sort((a, b) => {
    if (activeSort === 'nearest') {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    }
    if (activeSort === 'price_asc') return a.price - b.price;
    if (activeSort === 'price_desc') return b.price - a.price;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return enriched;
};

export const extractLocationOptions = (rooms = []) => {
  const citiesSet = new Set();
  const districtsMap = {};
  const wardsMap = {};

  for (const room of rooms || []) {
    const b = room.building || {};
    const inferred = (!b.city || !b.district || !b.ward) ? inferLocationFromAddress(b.address) : {};
    const city = String(b.city || inferred.city || '').trim();
    const district = String(b.district || inferred.district || '').trim();
    const ward = String(b.ward || inferred.ward || '').trim();
    if (city) {
      citiesSet.add(city);
      if (!districtsMap[city]) districtsMap[city] = new Set();
      if (district) districtsMap[city].add(district);
    }
    if (city && district && ward) {
      const key = `${city}|${district}`;
      if (!wardsMap[key]) wardsMap[key] = new Set();
      wardsMap[key].add(ward);
    }
  }

  const sortVi = (arr) => arr.sort((a, b) => a.localeCompare(b, 'vi'));
  const cities = sortVi(Array.from(citiesSet));
  const districtsByCity = {};
  for (const [c, set] of Object.entries(districtsMap)) {
    districtsByCity[c] = sortVi(Array.from(set));
  }
  const wardsByDistrict = {};
  for (const [k, set] of Object.entries(wardsMap)) {
    wardsByDistrict[k] = sortVi(Array.from(set));
  }
  return { cities, districtsByCity, wardsByDistrict };
};

export const mergeLocationOptions = (...sources) => {
  const canonicalCityLabel = new Map();
  const districtsMap = {};
  const wardsMap = {};

  const resolveCityLabel = (rawCity) => {
    const label = String(rawCity || '').trim();
    if (!label) return '';
    const canon = canonicalCityName(label);
    if (!canonicalCityLabel.has(canon)) {
      canonicalCityLabel.set(canon, canon === 'ho chi minh' ? 'TP.HCM' : label);
    }
    return canonicalCityLabel.get(canon);
  };

  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const c of src.cities || []) {
      const label = resolveCityLabel(c);
      if (label && !districtsMap[label]) districtsMap[label] = new Set();
    }
    for (const [c, ds] of Object.entries(src.districtsByCity || {})) {
      const label = resolveCityLabel(c);
      if (!label) continue;
      if (!districtsMap[label]) districtsMap[label] = new Set();
      for (const d of ds || []) {
        const dTrim = String(d || '').trim();
        if (dTrim) districtsMap[label].add(dTrim);
      }
    }
    for (const [k, ws] of Object.entries(src.wardsByDistrict || {})) {
      const [rawCity, rawDistrict] = k.split('|');
      const label = resolveCityLabel(rawCity);
      const dTrim = String(rawDistrict || '').trim();
      if (!label || !dTrim) continue;
      const mergedKey = `${label}|${dTrim}`;
      if (!wardsMap[mergedKey]) wardsMap[mergedKey] = new Set();
      for (const w of ws || []) {
        const wTrim = String(w || '').trim();
        if (wTrim) wardsMap[mergedKey].add(wTrim);
      }
    }
  }

  const sortVi = (arr) => arr.sort((a, b) => a.localeCompare(b, 'vi'));
  const cities = Object.keys(districtsMap).sort((a, b) => {
    const idxA = PRIORITY_VN_CITIES.indexOf(a);
    const idxB = PRIORITY_VN_CITIES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'vi');
  });
  const districtsByCity = {};
  for (const [c, set] of Object.entries(districtsMap)) {
    districtsByCity[c] = sortVi(Array.from(set));
  }
  const wardsByDistrict = {};
  for (const [k, set] of Object.entries(wardsMap)) {
    wardsByDistrict[k] = sortVi(Array.from(set));
  }
  return { cities, districtsByCity, wardsByDistrict };
};

export const VN_CITY_COORDS = {
  'Hà Nội': [21.0285, 105.8542],
  'TP.HCM': [10.7769, 106.7009],
  'Đà Nẵng': [16.0544, 108.2022],
  'Hải Phòng': [20.8449, 106.6881],
  'Cần Thơ': [10.0452, 105.7469],
  'Bình Dương': [10.9804, 106.6519],
  'Đồng Nai': [10.9574, 106.8427],
  'An Giang': [10.3864, 105.4352],
  'Bà Rịa - Vũng Tàu': [10.4114, 107.1362],
  'Bắc Giang': [21.2731, 106.1946],
  'Bắc Kạn': [22.1470, 105.8348],
  'Bạc Liêu': [9.2940, 105.7216],
  'Bắc Ninh': [21.1861, 106.0763],
  'Bến Tre': [10.2434, 106.3756],
  'Bình Định': [13.7830, 109.2197],
  'Bình Phước': [11.5349, 106.8832],
  'Bình Thuận': [10.9289, 108.1021],
  'Cà Mau': [9.1768, 105.1524],
  'Cao Bằng': [22.6657, 106.2579],
  'Đắk Lắk': [12.6667, 108.0500],
  'Đắk Nông': [12.0042, 107.6907],
  'Điện Biên': [21.3860, 103.0230],
  'Đồng Tháp': [10.4552, 105.6363],
  'Gia Lai': [13.9833, 108.0000],
  'Hà Giang': [22.8233, 104.9836],
  'Hà Nam': [20.5453, 105.9122],
  'Hà Tĩnh': [18.3428, 105.9057],
  'Hải Dương': [20.9373, 106.3146],
  'Hậu Giang': [9.7845, 105.4701],
  'Hòa Bình': [20.8133, 105.3383],
  'Hưng Yên': [20.6464, 106.0511],
  'Khánh Hòa': [12.2388, 109.1967],
  'Kiên Giang': [10.0125, 105.0809],
  'Kon Tum': [14.3545, 108.0076],
  'Lai Châu': [22.3964, 103.4582],
  'Lâm Đồng': [11.9404, 108.4583],
  'Lạng Sơn': [21.8537, 106.7615],
  'Lào Cai': [22.4856, 103.9707],
  'Long An': [10.5330, 106.4050],
  'Nam Định': [20.4388, 106.1621],
  'Nghệ An': [18.6796, 105.6813],
  'Ninh Bình': [20.2506, 105.9745],
  'Ninh Thuận': [11.5643, 108.9886],
  'Phú Thọ': [21.3227, 105.4020],
  'Phú Yên': [13.0955, 109.3209],
  'Quảng Bình': [17.4689, 106.6223],
  'Quảng Nam': [15.5736, 108.4740],
  'Quảng Ngãi': [15.1205, 108.7923],
  'Quảng Ninh': [20.9599, 107.0425],
  'Quảng Trị': [16.8163, 107.1003],
  'Sóc Trăng': [9.6037, 105.9800],
  'Sơn La': [21.3256, 103.9188],
  'Tây Ninh': [11.3100, 106.0983],
  'Thái Bình': [20.4463, 106.3366],
  'Thái Nguyên': [21.5942, 105.8482],
  'Thanh Hóa': [19.8067, 105.7852],
  'Thừa Thiên Huế': [16.4637, 107.5909],
  'Tiền Giang': [10.3600, 106.3600],
  'Trà Vinh': [9.9347, 106.3453],
  'Tuyên Quang': [21.8236, 105.2142],
  'Vĩnh Long': [10.2537, 105.9722],
  'Vĩnh Phúc': [21.3089, 105.6049],
  'Yên Bái': [21.7168, 104.8986],
};

export const VN_DISTRICT_COORDS = {
  // Hà Nội
  'Hà Nội|Cầu Giấy': [21.0362, 105.7906],
  'Hà Nội|Đống Đa': [21.0180, 105.8290],
  'Hà Nội|Thanh Xuân': [20.9938, 105.8049],
  'Hà Nội|Nam Từ Liêm': [21.0168, 105.7616],
  'Hà Nội|Bắc Từ Liêm': [21.0667, 105.7667],
  'Hà Nội|Ba Đình': [21.0341, 105.8195],
  'Hà Nội|Hoàn Kiếm': [21.0285, 105.8542],
  'Hà Nội|Hai Bà Trưng': [21.0058, 105.8576],
  'Hà Nội|Hà Đông': [20.9714, 105.7788],
  'Hà Nội|Tây Hồ': [21.0689, 105.8226],
  'Hà Nội|Hoàng Mai': [20.9749, 105.8565],
  'Hà Nội|Long Biên': [21.0453, 105.8891],
  'Hà Nội|Gia Lâm': [21.0191, 105.9377],
  'Hà Nội|Đông Anh': [21.1370, 105.8477],
  'Hà Nội|Thanh Trì': [20.9416, 105.8442],
  'Hà Nội|Hoài Đức': [21.0235, 105.7024],
  // TP.HCM
  'TP.HCM|Quận 1': [10.7756, 106.7019],
  'TP.HCM|Quận 3': [10.7844, 106.6844],
  'TP.HCM|Quận 4': [10.7578, 106.7050],
  'TP.HCM|Quận 5': [10.7540, 106.6634],
  'TP.HCM|Quận 6': [10.7481, 106.6352],
  'TP.HCM|Quận 7': [10.7340, 106.7218],
  'TP.HCM|Quận 8': [10.7241, 106.6286],
  'TP.HCM|Quận 10': [10.7746, 106.6669],
  'TP.HCM|Quận 11': [10.7629, 106.6501],
  'TP.HCM|Quận 12': [10.8672, 106.6413],
  'TP.HCM|Bình Thạnh': [10.8106, 106.7091],
  'TP.HCM|Phú Nhuận': [10.7992, 106.6803],
  'TP.HCM|Tân Bình': [10.8015, 106.6526],
  'TP.HCM|Tân Phú': [10.7915, 106.6281],
  'TP.HCM|Bình Tân': [10.7652, 106.6038],
  'TP.HCM|Gò Vấp': [10.8387, 106.6653],
  'TP.HCM|TP. Thủ Đức': [10.8494, 106.7537],
  'TP.HCM|Bình Chánh': [10.6874, 106.5938],
  'TP.HCM|Nhà Bè': [10.6952, 106.7049],
  // Đà Nẵng
  'Đà Nẵng|Hải Châu': [16.0678, 108.2208],
  'Đà Nẵng|Thanh Khê': [16.0616, 108.1806],
  'Đà Nẵng|Sơn Trà': [16.0860, 108.2398],
  'Đà Nẵng|Ngũ Hành Sơn': [16.0125, 108.2512],
  'Đà Nẵng|Liên Chiểu': [16.0777, 108.1497],
  'Đà Nẵng|Cẩm Lệ': [16.0102, 108.1912],
  // Hải Phòng, Cần Thơ, Bình Dương, Đồng Nai, An Giang
  'Hải Phòng|Ngô Quyền': [20.8586, 106.6976],
  'Hải Phòng|Lê Chân': [20.8442, 106.6780],
  'Hải Phòng|Hồng Bàng': [20.8626, 106.6710],
  'Cần Thơ|Ninh Kiều': [10.0342, 105.7876],
  'Cần Thơ|Cái Răng': [10.0040, 105.7745],
  'Bình Dương|Thủ Dầu Một': [10.9804, 106.6519],
  'Bình Dương|Dĩ An': [10.9068, 106.7695],
  'Bình Dương|Thuận An': [10.9163, 106.7176],
  'Đồng Nai|Biên Hòa': [10.9574, 106.8427],
  'An Giang|TP. Long Xuyên': [10.3864, 105.4352],
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Suy luận Tỉnh/TP, Quận/Huyện, Phường/Xã và tọa độ gợi ý từ chuỗi địa chỉ Tiếng Việt.
 * Dùng làm công cụ định vị offline/tức thì khi chủ nhà nhập địa chỉ tòa nhà trước khi ghim chi tiết trên bản đồ.
 */
export const resolveAddressCoordinates = (address) => {
  const raw = String(address || '').trim();
  const { city, district, ward } = inferLocationFromAddress(raw);

  let baseCoords = null;
  if (city && district && VN_DISTRICT_COORDS[`${city}|${district}`]) {
    baseCoords = VN_DISTRICT_COORDS[`${city}|${district}`];
  } else if (city && VN_CITY_COORDS[city]) {
    baseCoords = VN_CITY_COORDS[city];
  } else if (city) {
    const canon = canonicalCityName(city);
    const matchedKey = Object.keys(VN_CITY_COORDS).find((c) => canonicalCityName(c) === canon);
    if (matchedKey) baseCoords = VN_CITY_COORDS[matchedKey];
  }

  const matchedLevel =
    city && district && VN_DISTRICT_COORDS[`${city}|${district}`]
      ? 'district'
      : baseCoords
        ? 'city'
        : 'fallback';

  const [baseLat, baseLng] = baseCoords || [DEFAULT_GEO_FALLBACK.lat, DEFAULT_GEO_FALLBACK.lng];

  // Tạo độ lệch nhỏ ổn định (~<= 250m) theo phần số nhà/đường/phường để các địa chỉ khác nhau trong cùng quận tách điểm trên bản đồ
  let latOffset = 0;
  let lngOffset = 0;
  if (raw) {
    const h = hashString(normalizeText(raw));
    latOffset = (((h % 501) - 250) / 100000);
    lngOffset = ((((Math.floor(h / 501)) % 501) - 250) / 100000);
  }

  const latitude = Number((baseLat + latOffset).toFixed(6));
  const longitude = Number((baseLng + lngOffset).toFixed(6));
  const label = [ward, district, city].filter(Boolean).join(', ') || DEFAULT_GEO_FALLBACK.label;

  return {
    latitude,
    longitude,
    city,
    district,
    ward,
    matchedLevel,
    label,
  };
};
