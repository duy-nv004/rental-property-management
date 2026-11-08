import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { countActiveFilters, isFilterActive, formatActiveFilterSummary } from './responsiveFilters.js';

describe('responsiveFilters utility (TDD)', () => {
  describe('isFilterActive', () => {
    test('trả về false cho null, undefined, chuỗi rỗng và giá trị all', () => {
      assert.equal(isFilterActive(null), false);
      assert.equal(isFilterActive(undefined), false);
      assert.equal(isFilterActive(''), false);
      assert.equal(isFilterActive('all'), false);
    });

    test('trả về true cho các giá trị lọc thực sự', () => {
      assert.equal(isFilterActive('pending'), true);
      assert.equal(isFilterActive(1), true);
      assert.equal(isFilterActive(0), true);
      assert.equal(isFilterActive(false), true);
    });
  });

  describe('countActiveFilters', () => {
    test('đếm đúng số bộ lọc đang kích hoạt', () => {
      const filters = {
        buildingId: 2,
        status: 'pending',
        severity: null,
        category: 'all',
        keyword: 'Phòng 101'
      };
      // buildingId (2), status ('pending'), keyword ('Phòng 101') -> 3
      assert.equal(countActiveFilters(filters), 3);
    });

    test('trả về 0 khi tất cả đều trống hoặc all', () => {
      const filters = {
        buildingId: null,
        status: '',
        severity: 'all',
        category: undefined
      };
      assert.equal(countActiveFilters(filters), 0);
    });

    test('xử lý an toàn khi đầu vào null hoặc undefined', () => {
      assert.equal(countActiveFilters(null), 0);
      assert.equal(countActiveFilters(undefined), 0);
    });
  });

  describe('formatActiveFilterSummary', () => {
    test('trả về danh sách nhãn các tiêu chí đang áp dụng', () => {
      const filterDefs = [
        { key: 'status', label: 'Trạng thái', value: 'pending', options: [{ value: 'pending', label: 'Chờ xử lý' }] },
        { key: 'buildingId', label: 'Tòa nhà', value: 1, options: [{ value: 1, label: 'Tòa A' }] },
        { key: 'severity', label: 'Mức độ', value: null }
      ];

      const summary = formatActiveFilterSummary(filterDefs);
      assert.equal(summary.length, 2);
      assert.deepEqual(summary[0], { key: 'status', label: 'Trạng thái', displayValue: 'Chờ xử lý' });
      assert.deepEqual(summary[1], { key: 'buildingId', label: 'Tòa nhà', displayValue: 'Tòa A' });
    });
  });
});

