import { inferLocationFromAddress, resolveAddressCoordinates } from './publicRooms.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE = 'https://photon.komoot.io';

const normalizeGeoSearchQuery = (raw) =>
  String(raw || '')
    .trim()
    .replace(/^(số|so)\s+/i, '')
    .trim();

const pickFirst = (obj, keys) => {
  for (const k of keys) {
    if (obj?.[k]) return String(obj[k]).trim();
  }
  return '';
};

/**
 * Ghép các thành phần địa chỉ Nominatim thành chuỗi tiếng Việt gọn, dễ đọc.
 */
export const formatNominatimDisplayAddress = (addr) => {
  if (!addr || typeof addr !== 'object') return '';
  const houseNumber = pickFirst(addr, ['house_number']);
  const road = pickFirst(addr, ['road', 'pedestrian', 'street', 'residential', 'hamlet']);
  const streetPart = [houseNumber, road].filter(Boolean).join(' ').trim();
  const ward = pickFirst(addr, ['quarter', 'suburb', 'village', 'town', 'neighbourhood']);
  const district =
    pickFirst(addr, ['city_district', 'district', 'county']) ||
    (addr.quarter && addr.suburb && addr.suburb !== ward ? String(addr.suburb).trim() : '');
  const city = pickFirst(addr, ['city', 'state', 'province']);

  const parts = [streetPart, ward, district, city].filter(Boolean);
  // Loại bỏ phần trùng lặp liên tiếp
  const deduped = [];
  for (const part of parts) {
    if (deduped[deduped.length - 1] !== part) deduped.push(part);
  }
  return deduped.join(', ');
};

const inferAdminFromNominatim = (addr, fallbackText) => {
  const formatted = formatNominatimDisplayAddress(addr);
  const inferred = inferLocationFromAddress([formatted, fallbackText].filter(Boolean).join(', '));
  return {
    city: inferred.city || '',
    district: inferred.district || '',
    ward: inferred.ward || '',
    formatted,
  };
};

/**
 * Chuyển danh sách kết quả Nominatim search thành danh sách ứng viên tọa độ hợp lệ.
 */
export const parseNominatimSearchHits = (hits) => {
  if (!Array.isArray(hits)) return [];
  const results = [];
  for (const hit of hits) {
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const latitude = Number(lat.toFixed(6));
    const longitude = Number(lng.toFixed(6));
    const displayName = String(hit?.display_name || '').trim();
    const admin = inferAdminFromNominatim(hit?.address, displayName);
    const shortAddress = admin.formatted || displayName.split(',').slice(0, 4).join(',').trim();

    results.push({
      id: hit?.place_id ?? `${latitude},${longitude}`,
      latitude,
      longitude,
      displayName: displayName || shortAddress,
      shortAddress: shortAddress || `${latitude}, ${longitude}`,
      city: admin.city,
      district: admin.district,
      ward: admin.ward,
      precision: 'exact',
    });
  }
  return results;
};

/**
 * Chuyển kết quả Nominatim reverse thành địa chỉ ngắn và đơn vị hành chính.
 */
export const parseNominatimReverseResult = (data) => {
  if (!data || typeof data !== 'object' || data.error) return null;
  const displayName = String(data.display_name || '').trim();
  const admin = inferAdminFromNominatim(data.address, displayName);
  const shortAddress = admin.formatted || displayName.split(',').slice(0, 4).join(',').trim();
  if (!shortAddress) return null;

  return {
    shortAddress,
    displayName: displayName || shortAddress,
    city: admin.city,
    district: admin.district,
    ward: admin.ward,
  };
};

export const parsePhotonFeatures = (features) => {
  if (!Array.isArray(features)) return [];
  const vnFeatures = features.filter(
    (f) => !f?.properties?.countrycode || String(f.properties.countrycode).toUpperCase() === 'VN'
  );
  const pool = vnFeatures.length > 0 ? vnFeatures : features;
  const results = [];

  for (const f of pool) {
    const coords = f?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const p = f?.properties || {};
    const streetPart = [p.housenumber, p.street].filter(Boolean).join(' ').trim();
    const parts = [streetPart || p.name, p.locality, p.district, p.city || p.state].filter(Boolean);
    const deduped = [];
    for (const part of parts) {
      if (deduped[deduped.length - 1] !== part) deduped.push(part);
    }
    const shortAddress = deduped.join(', ');
    const inferred = inferLocationFromAddress(shortAddress);
    const latitude = Number(lat.toFixed(6));
    const longitude = Number(lng.toFixed(6));

    results.push({
      id: p.osm_id ?? `${latitude},${longitude}`,
      latitude,
      longitude,
      displayName: p.name && streetPart ? `${p.name}, ${shortAddress}` : shortAddress,
      shortAddress: shortAddress || `${latitude}, ${longitude}`,
      city: inferred.city || '',
      district: inferred.district || '',
      ward: inferred.ward || '',
      precision: 'exact',
    });
  }
  return results;
};

const fetchJsonWithTimeout = async (fetchImpl, url, timeoutMs) => {
  let timer = null;
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    if (controller) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }
    const res = await fetchImpl(url, {
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res?.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Tìm kiếm tọa độ theo địa chỉ qua Nominatim (tối đa 5 gợi ý),
 * tự động fallback sang Photon nếu Nominatim lỗi/không có kết quả,
 * và cuối cùng fallback về resolveAddressCoordinates nếu offline.
 */
export const searchAddressWithFallback = async (
  rawAddress,
  { fetchImpl = globalThis.fetch, limit = 5, timeoutMs = 4500 } = {}
) => {
  const trimmed = String(rawAddress || '').trim();
  const normalizedQuery = normalizeGeoSearchQuery(trimmed);
  const localResult = resolveAddressCoordinates(trimmed);

  if (!trimmed || typeof fetchImpl !== 'function') {
    return {
      precision: 'estimated',
      primary: { ...localResult, shortAddress: trimmed || localResult.label, precision: 'estimated' },
      candidates: [],
    };
  }

  const nominatimUrl = `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=${limit}&countrycodes=vn&q=${encodeURIComponent(normalizedQuery || trimmed)}`;
  const hits = await fetchJsonWithTimeout(fetchImpl, nominatimUrl, timeoutMs);
  const nominatimCandidates = parseNominatimSearchHits(hits);
  if (nominatimCandidates.length > 0) {
    return {
      precision: 'exact',
      primary: nominatimCandidates[0],
      candidates: nominatimCandidates,
    };
  }

  const photonUrl = `${PHOTON_BASE}/api/?q=${encodeURIComponent(normalizedQuery || trimmed)}&limit=${limit}`;
  const photonData = await fetchJsonWithTimeout(fetchImpl, photonUrl, timeoutMs);
  const photonCandidates = parsePhotonFeatures(photonData?.features);
  if (photonCandidates.length > 0) {
    return {
      precision: 'exact',
      primary: photonCandidates[0],
      candidates: photonCandidates,
    };
  }

  return {
    precision: 'estimated',
    primary: { ...localResult, shortAddress: trimmed || localResult.label, precision: 'estimated' },
    candidates: [],
  };
};

/**
 * Reverse geocode tọa độ (lat, lng) ra địa chỉ thực tế (Nominatim -> Photon fallback).
 */
export const reverseGeocodeLocation = async (
  lat,
  lng,
  { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}
) => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng) || typeof fetchImpl !== 'function') {
    return null;
  }

  const nominatimUrl = `${NOMINATIM_BASE}/reverse?format=json&addressdetails=1&zoom=18&lat=${encodeURIComponent(nLat)}&lon=${encodeURIComponent(nLng)}`;
  const nominatimData = await fetchJsonWithTimeout(fetchImpl, nominatimUrl, timeoutMs);
  const parsedNominatim = parseNominatimReverseResult(nominatimData);
  if (parsedNominatim) return parsedNominatim;

  const photonUrl = `${PHOTON_BASE}/reverse?lat=${encodeURIComponent(nLat)}&lon=${encodeURIComponent(nLng)}`;
  const photonData = await fetchJsonWithTimeout(fetchImpl, photonUrl, timeoutMs);
  const photonParsed = parsePhotonFeatures(photonData?.features);
  if (photonParsed.length > 0) {
    const first = photonParsed[0];
    return {
      shortAddress: first.shortAddress,
      displayName: first.displayName,
      city: first.city,
      district: first.district,
      ward: first.ward,
    };
  }

  return null;
};

/**
 * Metadata hiển thị trạng thái độ chính xác của tọa độ ghim.
 */
export const getGeoPrecisionMeta = (precision) => {
  switch (precision) {
    case 'exact':
      return { color: 'green', label: 'Chính xác theo địa chỉ' };
    case 'manual':
      return { color: 'blue', label: 'Đã ghim thủ công trên bản đồ' };
    default:
      return { color: 'orange', label: 'Ước lượng theo khu vực — hãy kéo ghim để chỉnh' };
  }
};
