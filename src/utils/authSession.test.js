import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isAuthEndpoint, createRefreshQueue, performLogout } from './authSession.js';

describe('authSession helpers (TDD)', () => {
    test('isAuthEndpoint nhận biết các endpoint không được tự động refresh lặp vô tận', () => {
        assert.equal(isAuthEndpoint('/auth/login'), true);
        assert.equal(isAuthEndpoint('/auth/refresh-token'), true);
        assert.equal(isAuthEndpoint('http://localhost:5000/api/auth/refresh-token'), true);
        assert.equal(isAuthEndpoint('/buildings'), false);
        assert.equal(isAuthEndpoint('/invoices/123'), false);
    });

    test('createRefreshQueue xếp hàng và giải phóng các request khi refresh thành công', async () => {
        const queue = createRefreshQueue();
        assert.equal(queue.isRefreshing(), false);

        queue.startRefreshing();
        assert.equal(queue.isRefreshing(), true);

        let resolved1 = null;
        let resolved2 = null;

        const p1 = new Promise((resolve, reject) => queue.enqueue(resolve, reject)).then(t => { resolved1 = t; });
        const p2 = new Promise((resolve, reject) => queue.enqueue(resolve, reject)).then(t => { resolved2 = t; });

        queue.resolveAll('new_access_token_123');
        await Promise.all([p1, p2]);

        assert.equal(resolved1, 'new_access_token_123');
        assert.equal(resolved2, 'new_access_token_123');
        assert.equal(queue.isRefreshing(), false);
    });

    test('createRefreshQueue từ chối tất cả request trong hàng đợi khi refresh thất bại', async () => {
        const queue = createRefreshQueue();
        queue.startRefreshing();

        let error1 = null;
        let error2 = null;

        const p1 = new Promise((resolve, reject) => queue.enqueue(resolve, reject)).catch(e => { error1 = e; });
        const p2 = new Promise((resolve, reject) => queue.enqueue(resolve, reject)).catch(e => { error2 = e; });

        const failureErr = new Error('Refresh token revoked');
        queue.rejectAll(failureErr);
        await Promise.all([p1, p2]);

        assert.equal(error1, failureErr);
        assert.equal(error2, failureErr);
        assert.equal(queue.isRefreshing(), false);
    });

    test('performLogout gọi API /auth/logout và navigate về /login', async () => {
        let calledEndpoint = null;
        const mockClient = {
            async post(url) {
                calledEndpoint = url;
                return { success: true };
            }
        };

        // Mock localStorage
        globalThis.localStorage = {
            storage: { accessToken: '123' },
            removeItem(k) { delete this.storage[k]; },
            clear() { this.storage = {}; }
        };

        let navigatedPath = null;
        const mockNavigate = (path) => { navigatedPath = path; };

        await performLogout(mockClient, mockNavigate);

        assert.equal(calledEndpoint, '/auth/logout');
        assert.equal(navigatedPath, '/login');
    });
});
