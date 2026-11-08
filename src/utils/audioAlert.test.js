import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { playNotificationSound } from './audioAlert.js';

describe('audioAlert (Mục 8)', () => {
  const originalWindow = global.window;

  afterEach(() => {
    global.window = originalWindow;
  });

  it('hoạt động an toàn và không ném ngoại lệ khi môi trường không có AudioContext', () => {
    global.window = {};
    assert.doesNotThrow(() => {
      playNotificationSound();
    });
  });

  it('tạo 2 nốt hòa âm Web Audio khi có AudioContext', () => {
    let oscCount = 0;
    let gainCount = 0;
    let started = 0;
    let stopped = 0;

    class MockAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
      }
      createOscillator() {
        oscCount++;
        return {
          type: '',
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => { started++; },
          stop: () => { stopped++; },
        };
      }
      createGain() {
        gainCount++;
        return {
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {}
          },
          connect: () => {}
        };
      }
    }

    global.window = {
      AudioContext: MockAudioContext
    };

    assert.doesNotThrow(() => {
      playNotificationSound();
    });

    assert.equal(oscCount, 2, 'Cần tạo 2 oscillator cho nốt đôi');
    assert.equal(gainCount, 2, 'Cần tạo 2 gain node');
    assert.equal(started, 2, 'Cả 2 oscillator phải được start');
    assert.equal(stopped, 2, 'Cả 2 oscillator phải được stop');
  });
});

