import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLatestReading, computeUsageAnomaly } from './utilityAnomaly.js';

describe('utilityAnomaly (Mục 7)', () => {
  const sampleReadings = [
    { type: 'electricity', period: '2026-03', readingValue: 400 },
    { type: 'electricity', period: '2026-02', readingValue: 300 },
    { type: 'electricity', period: '2026-01', readingValue: 200 },
    { type: 'water', period: '2026-03', readingValue: 30 },
    { type: 'water', period: '2026-02', readingValue: 20 },
    { type: 'water', period: '2026-01', readingValue: 10 },
  ];

  describe('getLatestReading', () => {
    it('trả về 0 nếu danh sách rỗng hoặc null', () => {
      assert.equal(getLatestReading([], 'electricity', '2026-04'), 0);
      assert.equal(getLatestReading(null, 'electricity', '2026-04'), 0);
    });

    it('lấy đúng chỉ số kỳ gần nhất trước currentPeriod theo loại', () => {
      const latestElec = getLatestReading(sampleReadings, 'electricity', '2026-04');
      assert.equal(latestElec, 400);

      const latestWater = getLatestReading(sampleReadings, 'water', '2026-04');
      assert.equal(latestWater, 30);
    });

    it('không lấy bản ghi có kỳ >= currentPeriod', () => {
      const readingInFeb = getLatestReading(sampleReadings, 'electricity', '2026-03');
      assert.equal(readingInFeb, 300);
    });
  });

  describe('computeUsageAnomaly', () => {
    it('trả về null nếu giá trị nhập vào trống hoặc âm', () => {
      const res = computeUsageAnomaly({
        currentReadingVal: '',
        roomReadings: sampleReadings,
        type: 'electricity',
        currentPeriod: '2026-04'
      });
      assert.equal(res, null);
    });

    it('trả về null nếu tiêu thụ <= 0', () => {
      const res = computeUsageAnomaly({
        currentReadingVal: 400, // prev là 400, used = 0
        roomReadings: sampleReadings,
        type: 'electricity',
        currentPeriod: '2026-04'
      });
      assert.equal(res, null);
    });

    it('trả về null nếu chưa đủ dữ liệu lịch sử (< 2 kỳ)', () => {
      const shortReadings = [
        { type: 'electricity', period: '2026-03', readingValue: 100 }
      ];
      const res = computeUsageAnomaly({
        currentReadingVal: 200,
        roomReadings: shortReadings,
        type: 'electricity',
        currentPeriod: '2026-04'
      });
      assert.equal(res, null);
    });

    it('trả về null nếu mức dùng bình thường (dưới 150% trung bình)', () => {
      // TB các kỳ trước: (400-300=100), (300-200=100) => avg = 100
      // Kỳ này dùng 120 (chỉ số 520, prev 400) -> 120 <= 150
      const res = computeUsageAnomaly({
        currentReadingVal: 520,
        roomReadings: sampleReadings,
        type: 'electricity',
        currentPeriod: '2026-04'
      });
      assert.equal(res, null);
    });

    it('phát hiện bất thường khi điện tăng > 150% TB và > ngưỡng 30 kWh', () => {
      // TB = 100. Nhập chỉ số 660 -> used = 260 (> 150% của 100)
      const res = computeUsageAnomaly({
        currentReadingVal: 660,
        roomReadings: sampleReadings,
        type: 'electricity',
        currentPeriod: '2026-04'
      });
      assert.ok(res !== null);
      assert.equal(res.used, 260);
      assert.equal(res.avg, 100);
      assert.equal(res.percent, 160);
      assert.match(res.msg, /Tăng 160% so với TB/);
    });

    it('phát hiện bất thường cho nước khi vượt ngưỡng 5 m3 và > 150% TB', () => {
      // Nước: TB = 10 m3. Nhập 60 -> used = 30 m3 (tăng 200%)
      const res = computeUsageAnomaly({
        currentReadingVal: 60,
        roomReadings: sampleReadings,
        type: 'water',
        currentPeriod: '2026-04'
      });
      assert.ok(res !== null);
      assert.equal(res.used, 30);
      assert.equal(res.avg, 10);
      assert.equal(res.percent, 200);
    });

    it('hỗ trợ cờ thay đồng hồ (isReset = true)', () => {
      // Khi thay đồng hồ, số mới chính là sản lượng sử dụng
      const res = computeUsageAnomaly({
        currentReadingVal: 280,
        roomReadings: sampleReadings,
        type: 'electricity',
        currentPeriod: '2026-04',
        isReset: true
      });
      assert.ok(res !== null);
      assert.equal(res.used, 280);
      assert.equal(res.percent, 180);
    });
  });
});

