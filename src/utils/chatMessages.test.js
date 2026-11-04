/**
 * Unit test cho logic thuần của khung chat (src/utils/chatMessages.js).
 * Chạy: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HISTORY,
  MAX_MESSAGE_LENGTH,
  appendMessage,
  validateQuestion,
  errorMessage,
  welcomeMessage,
  suggestionsForRole,
} from './chatMessages.js';

describe('validateQuestion', () => {
  test('cắt khoảng trắng và nhận câu hỏi hợp lệ', () => {
    const result = validateQuestion('  Hóa đơn tháng này bao nhiêu?  ');
    assert.equal(result.ok, true);
    assert.equal(result.value, 'Hóa đơn tháng này bao nhiêu?');
  });

  test('từ chối chuỗi rỗng, khoảng trắng hoặc undefined', () => {
    for (const input of ['', '   ', undefined, null]) {
      const result = validateQuestion(input);
      assert.equal(result.ok, false);
      assert.match(result.error, /nhập câu hỏi/i);
    }
  });

  test(`từ chối câu hỏi dài hơn ${MAX_MESSAGE_LENGTH} ký tự`, () => {
    const result = validateQuestion('a'.repeat(MAX_MESSAGE_LENGTH + 1));
    assert.equal(result.ok, false);
    assert.match(result.error, new RegExp(String(MAX_MESSAGE_LENGTH)));
  });

  test('nhận câu hỏi đúng độ dài tối đa', () => {
    assert.equal(validateQuestion('a'.repeat(MAX_MESSAGE_LENGTH)).ok, true);
  });
});

describe('appendMessage', () => {
  test('thêm tin nhắn mới vào cuối', () => {
    const out = appendMessage([{ role: 'user', content: 'a' }], { role: 'assistant', content: 'b' });
    assert.deepEqual(out.map((m) => m.content), ['a', 'b']);
  });

  test(`chỉ giữ ${MAX_HISTORY} tin gần nhất`, () => {
    let history = [];
    for (let i = 0; i < MAX_HISTORY + 4; i += 1) {
      history = appendMessage(history, { role: 'user', content: `tin ${i}` });
    }
    assert.equal(history.length, MAX_HISTORY);
    assert.equal(history.at(-1).content, `tin ${MAX_HISTORY + 3}`);
  });

  test('không sửa mảng gốc', () => {
    const original = [{ role: 'user', content: 'a' }];
    appendMessage(original, { role: 'assistant', content: 'b' });
    assert.equal(original.length, 1);
  });
});

describe('errorMessage', () => {
  test('ưu tiên thông báo từ server', () => {
    const err = { response: { data: { message: 'Bạn đã hỏi quá nhanh.' } } };
    assert.equal(errorMessage(err), 'Bạn đã hỏi quá nhanh.');
  });

  test('không có phản hồi server thì trả thông báo tiếng Việt thân thiện', () => {
    assert.match(errorMessage(new Error('Network Error')), /Không kết nối được trợ lý/);
    assert.match(errorMessage(undefined), /Không kết nối được trợ lý/);
  });
});

describe('welcomeMessage', () => {
  test('mỗi vai trò nhận lời chào riêng, vai trò lạ dùng câu mặc định', () => {
    assert.match(welcomeMessage('tenant'), /phòng|hóa đơn/i);
    assert.match(welcomeMessage('landlord'), /tòa nhà|phòng trống/i);
    assert.match(welcomeMessage('admin'), /hệ thống/i);
    assert.equal(welcomeMessage('unknown'), welcomeMessage('admin'));
  });
});

describe('suggestionsForRole', () => {
  test('mỗi vai trò có 2-3 gợi ý, câu gợi ý không rỗng', () => {
    for (const role of ['tenant', 'landlord', 'admin']) {
      const list = suggestionsForRole(role);
      assert.ok(list.length >= 2 && list.length <= 3, `${role} phải có 2-3 gợi ý`);
      for (const text of list) assert.ok(text.trim().length > 0);
    }
  });

  test('vai trò lạ dùng gợi ý mặc định (admin)', () => {
    assert.deepEqual(suggestionsForRole('unknown'), suggestionsForRole('admin'));
    assert.deepEqual(suggestionsForRole(undefined), suggestionsForRole('admin'));
  });

  test('mỗi lần gọi trả về mảng mới, không cho sửa bản gốc', () => {
    const first = suggestionsForRole('tenant');
    first.push('câu hỏi lạ');
    assert.notEqual(suggestionsForRole('tenant').length, first.length);
  });
});