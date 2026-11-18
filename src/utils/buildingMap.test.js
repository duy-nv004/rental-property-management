import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNominatimDisplayAddress,
  parseNominatimSearchHits,
  parseNominatimReverseResult,
  searchAddressWithFallback,
  reverseGeocodeLocation,
  getGeoPrecisionMeta,
} from './buildingMap.js';

describe('buildingMap helpers (TDD)', () => {
  describe('formatNominatimDisplayAddress', () => {
    it('ghép số nhà, đường, phường, quận, thành phố thành chuỗi địa chỉ tiếng Việt rõ ràng', () => {
      const formatted = formatNominatimDisplayAddress({
        house_number: '88',
        road: 'Nguyễn Huệ',
        quarter: 'Phường Bến Nghé',
        suburb: 'Quận 1',
        city: 'Thành phố Hồ Chí Minh',
      });
      assert.equal(formatted, '88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
    });

    it('trả chuỗi rỗng nếu không có address object hợp lệ', () => {
      assert.equal(formatNominatimDisplayAddress(null), '');
      assert.equal(formatNominatimDisplayAddress({}), '');
    });
  });

  describe('parseNominatimSearchHits', () => {
    it('chuyển danh sách kết quả Nominatim thành các ứng viên tọa độ hợp lệ và loại bỏ bản ghi thiếu tọa độ', () => {
      const rawHits = [
        {
          place_id: 101,
          lat: '21.036812',
          lon: '105.782451',
          display_name: '15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Việt Nam',
          address: {
            house_number: '15',
            road: 'Xuân Thủy',
            suburb: 'Dịch Vọng Hậu',
            city_district: 'Cầu Giấy',
            city: 'Hà Nội',
          },
        },
        {
          place_id: 102,
          lat: 'invalid',
          lon: '105.78',
          display_name: 'Bad hit',
        },
      ];

      const candidates = parseNominatimSearchHits(rawHits);
      assert.equal(candidates.length, 1);
      assert.equal(candidates[0].latitude, 21.036812);
      assert.equal(candidates[0].longitude, 105.782451);
      assert.equal(candidates[0].shortAddress, '15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội');
      assert.equal(candidates[0].precision, 'exact');
      assert.equal(candidates[0].city, 'Hà Nội');
      assert.equal(candidates[0].district, 'Cầu Giấy');
    });
  });

  describe('parseNominatimReverseResult', () => {
    it('trích xuất địa chỉ và đơn vị hành chính từ kết quả reverse geocode', () => {
      const result = parseNominatimReverseResult({
        lat: '10.773456',
        lon: '106.703123',
        display_name: '88 Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam',
        address: {
          house_number: '88',
          road: 'Nguyễn Huệ',
          quarter: 'Bến Nghé',
          suburb: 'Quận 1',
          city: 'Thành phố Hồ Chí Minh',
        },
      });

      assert.equal(result.shortAddress, '88 Nguyễn Huệ, Bến Nghé, Quận 1, Thành phố Hồ Chí Minh');
      assert.equal(result.city, 'TP.HCM');
      assert.equal(result.district, 'Quận 1');
      assert.equal(result.ward, 'Bến Nghé');
    });

    it('trả null khi dữ liệu reverse geocode rỗng hoặc lỗi', () => {
      assert.equal(parseNominatimReverseResult(null), null);
      assert.equal(parseNominatimReverseResult({ error: 'Unable to geocode' }), null);
    });
  });

  describe('searchAddressWithFallback', () => {
    it('trả về danh sách gợi ý chính xác khi fetchImpl thành công', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => [
          {
            place_id: 1,
            lat: '21.036901',
            lon: '105.782512',
            display_name: '15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
            address: {
              house_number: '15',
              road: 'Xuân Thủy',
              quarter: 'Dịch Vọng Hậu',
              city_district: 'Cầu Giấy',
              city: 'Hà Nội',
            },
          },
        ],
      });

      const res = await searchAddressWithFallback('15 Xuân Thủy, Cầu Giấy, Hà Nội', {
        fetchImpl: mockFetch,
      });

      assert.equal(res.precision, 'exact');
      assert.equal(res.primary.latitude, 21.036901);
      assert.equal(res.primary.longitude, 105.782512);
      assert.equal(res.candidates.length, 1);
    });

    it('fallback về resolveAddressCoordinates với precision="estimated" khi mạng lỗi hoặc không có kết quả', async () => {
      const failingFetch = async () => {
        throw new Error('Network blocked');
      };

      const res = await searchAddressWithFallback('15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', {
        fetchImpl: failingFetch,
      });

      assert.equal(res.precision, 'estimated');
      assert.equal(res.candidates.length, 0);
      assert.equal(res.primary.city, 'Hà Nội');
      assert.equal(res.primary.district, 'Cầu Giấy');
      assert.equal(typeof res.primary.latitude, 'number');
      assert.equal(typeof res.primary.longitude, 'number');
    });

    it('tự động fallback sang Photon khi Nominatim lỗi/bị chặn và tìm thấy tòa nhà Việt Nam', async () => {
      const mockFetch = async (url) => {
        if (String(url).includes('nominatim.openstreetmap.org')) {
          throw new Error('OSM blocked');
        }
        return {
          ok: true,
          json: async () => ({
            features: [
              {
                geometry: { coordinates: [105.7871672, 21.0307847] },
                properties: {
                  name: 'Toà nhà Lotus',
                  housenumber: '2',
                  street: 'Phố Duy Tân',
                  locality: 'Dịch Vọng Hậu',
                  district: 'Cầu Giấy',
                  city: 'Hà Nội',
                  countrycode: 'VN',
                },
              },
            ],
          }),
        };
      };

      const res = await searchAddressWithFallback('số 2 Duy Tân', { fetchImpl: mockFetch });
      assert.equal(res.precision, 'exact');
      assert.equal(res.primary.latitude, 21.030785);
      assert.equal(res.primary.longitude, 105.787167);
      assert.match(res.primary.shortAddress, /Duy Tân/);
      assert.equal(res.primary.city, 'Hà Nội');
      assert.equal(res.primary.district, 'Cầu Giấy');
    });
  });

  describe('reverseGeocodeLocation', () => {
    it('trả về địa chỉ tại tọa độ khi API reverse geocode thành công', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          lat: '21.0369',
          lon: '105.7825',
          address: {
            house_number: '15',
            road: 'Xuân Thủy',
            quarter: 'Dịch Vọng Hậu',
            city_district: 'Cầu Giấy',
            city: 'Hà Nội',
          },
        }),
      });

      const res = await reverseGeocodeLocation(21.0369, 105.7825, { fetchImpl: mockFetch });
      assert.equal(res.shortAddress, '15 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội');
    });

    it('tự động fallback sang Photon reverse khi Nominatim lỗi', async () => {
      const mockFetch = async (url) => {
        if (String(url).includes('nominatim.openstreetmap.org')) {
          throw new Error('OSM blocked');
        }
        return {
          ok: true,
          json: async () => ({
            features: [
              {
                geometry: { coordinates: [105.787167, 21.030785] },
                properties: {
                  name: 'Toà nhà Lotus',
                  housenumber: '2',
                  street: 'Phố Duy Tân',
                  locality: 'Dịch Vọng Hậu',
                  district: 'Cầu Giấy',
                  city: 'Hà Nội',
                  countrycode: 'VN',
                },
              },
            ],
          }),
        };
      };

      const res = await reverseGeocodeLocation(21.030785, 105.787167, { fetchImpl: mockFetch });
      assert.match(res.shortAddress, /2 Phố Duy Tân/);
      assert.equal(res.city, 'Hà Nội');
      assert.equal(res.district, 'Cầu Giấy');
    });

    it('trả null an toàn khi reverse geocode thất bại', async () => {
      const res = await reverseGeocodeLocation(21.0369, 105.7825, {
        fetchImpl: async () => ({ ok: false }),
      });
      assert.equal(res, null);
    });
  });

  describe('getGeoPrecisionMeta', () => {
    it('trả nhãn và màu sắc phân biệt cho exact, manual và estimated', () => {
      assert.equal(getGeoPrecisionMeta('exact').color, 'green');
      assert.equal(getGeoPrecisionMeta('manual').color, 'blue');
      assert.equal(getGeoPrecisionMeta('estimated').color, 'orange');
    });
  });
});
