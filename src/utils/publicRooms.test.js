/**
 * Unit test TDD (RED -> GREEN -> REFACTOR) cho tiện ích khám phá & lọc phòng theo vị trí (src/utils/publicRooms.js).
 * Chạy: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VN_LOCATIONS,
  calculateDistanceKm,
  parseJsonArray,
  buildRoomImageUrl,
  filterAndSortPublicRooms,
  extractLocationOptions,
  inferLocationFromAddress,
  mergeLocationOptions,
  resolveAddressCoordinates,
} from './publicRooms.js';

const sampleRooms = [
  {
    id: 1,
    roomNumber: '101',
    price: 3500000,
    depositAmount: 3500000,
    area: 25,
    capacity: 2,
    description: 'Phòng thoáng gần Đại học Quốc Gia',
    amenities: ['Wifi', 'Điều hòa'],
    images: ['room1.jpg'],
    createdAt: '2026-11-01T10:00:00Z',
    building: {
      id: 10,
      name: 'Nhà trọ Xuân Thủy',
      address: '12 Xuân Thủy, Cầu Giấy, Hà Nội',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng Hậu',
      latitude: 21.0368,
      longitude: 105.7825,
    },
  },
  {
    id: 2,
    roomNumber: '202',
    price: 5200000,
    depositAmount: 5200000,
    area: 32,
    capacity: 3,
    description: 'Studio ban công rộng quận Đống Đa',
    amenities: ['Wifi', 'Điều hòa', 'Ban công', 'Máy giặt'],
    images: '["room2.jpg"]',
    createdAt: '2026-11-05T10:00:00Z',
    building: {
      id: 11,
      name: 'Chùa Láng Residence',
      address: '45 Chùa Láng, Đống Đa, Hà Nội',
      city: 'Hà Nội',
      district: 'Đống Đa',
      ward: 'Láng Thượng',
      latitude: 21.0235,
      longitude: 105.8055,
    },
  },
  {
    id: 3,
    roomNumber: '305',
    price: 4000000,
    depositAmount: 4000000,
    area: 28,
    capacity: 2,
    description: 'Gần phố đi bộ Nguyễn Huệ',
    amenities: ['Wifi', 'Ban công'],
    images: [],
    createdAt: '2026-11-03T10:00:00Z',
    building: {
      id: 12,
      name: 'Saigon Central',
      address: '88 Đồng Khởi, Quận 1, TP. Hồ Chí Minh',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Bến Nghé',
      latitude: 10.7757,
      longitude: 106.7004,
    },
  },
];

describe('calculateDistanceKm', () => {
  test('tính đúng khoảng cách Haversine giữa Cầu Giấy và Đống Đa (~2.8 km)', () => {
    const dist = calculateDistanceKm(21.0368, 105.7825, 21.0235, 105.8055);
    assert.ok(dist >= 2.0 && dist <= 3.5);
  });

  test('trả null nếu thiếu hoặc sai tọa độ', () => {
    assert.equal(calculateDistanceKm(null, 105, 21, 105), null);
    assert.equal(calculateDistanceKm('abc', 105, 21, 105), null);
  });
});

describe('parseJsonArray & buildRoomImageUrl', () => {
  test('parseJsonArray đọc mảng, chuỗi JSON hoặc chuỗi ngăn cách dấu phẩy an toàn', () => {
    assert.deepEqual(parseJsonArray('["a.jpg", "b.jpg"]'), ['a.jpg', 'b.jpg']);
    assert.deepEqual(parseJsonArray(['Wifi', '  Điều hòa  ']), ['Wifi', 'Điều hòa']);
    assert.deepEqual(parseJsonArray('Wifi, Ban công'), ['Wifi', 'Ban công']);
    assert.deepEqual(parseJsonArray(null), []);
  });

  test('buildRoomImageUrl trả về endpoint public hoặc giữ nguyên http/data URL', () => {
    assert.equal(buildRoomImageUrl('abc.jpg', 'http://localhost:5000/api'), 'http://localhost:5000/api/public/room-images/abc.jpg');
    assert.equal(buildRoomImageUrl('https://cdn.example.com/1.jpg', '/api'), 'https://cdn.example.com/1.jpg');
  });
});

describe('filterAndSortPublicRooms', () => {
  test('lọc theo thành phố, quận và tìm kiếm không dấu', () => {
    const res = filterAndSortPublicRooms(sampleRooms, {
      city: 'Hà Nội',
      search: 'xuan thuy',
    });
    assert.deepEqual(res.map((r) => r.id), [1]);
  });

  test('lọc theo khoảng giá, diện tích tối thiểu và tiện ích', () => {
    const res = filterAndSortPublicRooms(sampleRooms, {
      minPrice: 3800000,
      maxPrice: 5500000,
      minArea: 30,
      amenities: ['Ban công', 'Máy giặt'],
    });
    assert.deepEqual(res.map((r) => r.id), [2]);
  });

  test('lọc theo bán kính GPS và sắp xếp gần nhất trước', () => {
    const res = filterAndSortPublicRooms(sampleRooms, {
      userLat: 21.024,
      userLng: 105.805,
      radiusKm: 2,
      sort: 'nearest',
    });
    assert.deepEqual(res.map((r) => r.id), [2]);
    assert.ok(res[0].distanceKm <= 1);
  });

  test('sắp xếp giá thấp -> cao', () => {
    const res = filterAndSortPublicRooms(sampleRooms, { sort: 'price_asc' });
    assert.deepEqual(res.map((r) => r.id), [1, 3, 2]);
  });
});

describe('extractLocationOptions', () => {
  test('gom danh mục thành phố và quận/huyện có phòng', () => {
    const locs = extractLocationOptions(sampleRooms);
    assert.deepEqual(locs.cities, ['Hà Nội', 'TP. Hồ Chí Minh']);
    assert.deepEqual(locs.districtsByCity['Hà Nội'], ['Cầu Giấy', 'Đống Đa']);
  });

  test('tự suy luận thành phố và quận từ address khi DB chưa lưu cột city/district', () => {
    const inferred = inferLocationFromAddress('18 Phạm Hùng, Nam Từ Liêm, Hà Nội');
    assert.equal(inferred.city, 'Hà Nội');
    assert.equal(inferred.district, 'Nam Từ Liêm');

    const locs = extractLocationOptions([
      { id: 9, building: { address: '18 Phạm Hùng, Nam Từ Liêm, Hà Nội' } },
    ]);
    assert.deepEqual(locs.cities, ['Hà Nội']);
    assert.deepEqual(locs.districtsByCity['Hà Nội'], ['Nam Từ Liêm']);
  });
});

describe('mergeLocationOptions & city alias filter', () => {
  test('có đủ 63 tỉnh/thành phố Việt Nam, đầy đủ quận/huyện và phường/xã không bị rỗng', () => {
    assert.equal(DEFAULT_VN_LOCATIONS.cities.length, 63);
    assert.ok(DEFAULT_VN_LOCATIONS.cities.includes('Hà Nội'));
    assert.ok(DEFAULT_VN_LOCATIONS.cities.includes('TP.HCM'));
    assert.ok(DEFAULT_VN_LOCATIONS.cities.includes('Cà Mau'));
    assert.ok(DEFAULT_VN_LOCATIONS.wardsByDistrict['Hà Nội|Cầu Giấy'].includes('Dịch Vọng Hậu'));

    for (const city of DEFAULT_VN_LOCATIONS.cities) {
      const districts = DEFAULT_VN_LOCATIONS.districtsByCity[city] || [];
      assert.ok(districts.length > 0, `Thiếu danh sách Quận/Huyện cho ${city}`);
      for (const dist of districts) {
        const wards = DEFAULT_VN_LOCATIONS.wardsByDistrict[`${city}|${dist}`] || [];
        assert.ok(wards.length > 0, `Thiếu danh sách Phường/Xã cho ${city}|${dist}`);
      }
    }

    const inferredAnGiang = inferLocationFromAddress('12 Trần Hưng Đạo, Mỹ Bình, TP. Long Xuyên, An Giang');
    assert.equal(inferredAnGiang.city, 'An Giang');
    assert.equal(inferredAnGiang.district, 'TP. Long Xuyên');

    const noFalseHue = inferLocationFromAddress('Phòng trọ cho thuê đường Láng, Đống Đa, Hà Nội');
    assert.equal(noFalseHue.city, 'Hà Nội');
    assert.equal(noFalseHue.district, 'Đống Đa');

    const merged = mergeLocationOptions(DEFAULT_VN_LOCATIONS, {
      cities: ['TP. Hồ Chí Minh'],
      districtsByCity: { 'TP. Hồ Chí Minh': ['Bình Chánh'] },
      wardsByDistrict: {},
    });
    assert.equal(merged.cities.filter((c) => c === 'TP.HCM').length, 1);
    assert.ok(merged.districtsByCity['TP.HCM'].includes('Bình Chánh'));
    assert.ok(merged.districtsByCity['TP.HCM'].includes('Quận 1'));
  });

  test('chọn TP.HCM khớp được phòng ghi TP. Hồ Chí Minh và ngược lại', () => {
    const res = filterAndSortPublicRooms(sampleRooms, { city: 'TP.HCM' });
    assert.deepEqual(res.map((r) => r.id), [3]);
  });
});

describe('resolveAddressCoordinates', () => {
  test('tự suy luận quận/phường và tọa độ Cầu Giấy từ địa chỉ Hà Nội', () => {
    const loc = resolveAddressCoordinates('12 Đường Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội');
    assert.equal(loc.city, 'Hà Nội');
    assert.equal(loc.district, 'Cầu Giấy');
    assert.equal(loc.ward, 'Dịch Vọng Hậu');
    assert.equal(loc.matchedLevel, 'district');
    assert.ok(loc.latitude > 21.02 && loc.latitude < 21.05, `Lat ngoài khoảng Cầu Giấy: ${loc.latitude}`);
    assert.ok(loc.longitude > 105.77 && loc.longitude < 105.81, `Lng ngoài khoảng Cầu Giấy: ${loc.longitude}`);
  });

  test('tự suy luận quận/phường và tọa độ Quận 1 từ địa chỉ TP.HCM', () => {
    const loc = resolveAddressCoordinates('88 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM');
    assert.equal(loc.city, 'TP.HCM');
    assert.equal(loc.district, 'Quận 1');
    assert.equal(loc.ward, 'Bến Nghé');
    assert.equal(loc.matchedLevel, 'district');
    assert.ok(loc.latitude > 10.76 && loc.latitude < 10.79, `Lat ngoài khoảng Quận 1: ${loc.latitude}`);
    assert.ok(loc.longitude > 106.68 && loc.longitude < 106.72, `Lng ngoài khoảng Quận 1: ${loc.longitude}`);
  });
});
