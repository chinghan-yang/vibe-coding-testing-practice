import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

describe('前端元素', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('渲染登入頁面基本元素', () => {
        render(<LoginPage />);
        expect(screen.getByRole('heading', { name: '歡迎回來' })).toBeInTheDocument();
        expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
        expect(screen.getByLabelText('密碼')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    });
});

describe('表單驗證', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('驗證無效的 Email 格式', async () => {
        const user = userEvent.setup();
        const loginMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({
            login: loginMock,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);

        render(<LoginPage />);
        await user.type(screen.getByLabelText('電子郵件'), 'invalid-email');
        await user.type(screen.getByLabelText('密碼'), 'Valid123');
        await user.click(screen.getByRole('button', { name: '登入' }));

        expect(await screen.findByText('請輸入有效的 Email 格式')).toBeInTheDocument();
        expect(loginMock).not.toHaveBeenCalled();
    });

    it('驗證密碼長度不足', async () => {
        const user = userEvent.setup();
        const loginMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({
            login: loginMock,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);

        render(<LoginPage />);
        await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
        await user.type(screen.getByLabelText('密碼'), 'Short1');
        await user.click(screen.getByRole('button', { name: '登入' }));

        expect(await screen.findByText('密碼必須至少 8 個字元')).toBeInTheDocument();
        expect(loginMock).not.toHaveBeenCalled();
    });

    it('驗證密碼未包含英數混合', async () => {
        const user = userEvent.setup();
        const loginMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({
            login: loginMock,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);

        render(<LoginPage />);
        await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
        await user.type(screen.getByLabelText('密碼'), '12345678');
        await user.click(screen.getByRole('button', { name: '登入' }));

        expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
        
        await user.clear(screen.getByLabelText('密碼'));
        await user.type(screen.getByLabelText('密碼'), 'abcdefgh');
        await user.click(screen.getByRole('button', { name: '登入' }));
        
        expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
        expect(loginMock).not.toHaveBeenCalled();
    });
});

describe('Mock API', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('登入成功並導向', async () => {
        const user = userEvent.setup();
        
        // Return a promise that doesn't resolve immediately so we can check loading state
        let resolveLogin: () => void;
        const loginPromise = new Promise<void>((resolve) => {
            resolveLogin = resolve;
        });
        
        const loginMock = vi.fn().mockReturnValue(loginPromise);
        const navigateMock = vi.fn();
        
        vi.mocked(useAuth).mockReturnValue({
            login: loginMock,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);
        vi.mocked(useNavigate).mockReturnValue(navigateMock);

        render(<LoginPage />);
        await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
        await user.type(screen.getByLabelText('密碼'), 'Valid123');
        
        const loginButton = screen.getByRole('button', { name: '登入' });
        await user.click(loginButton);

        // While submitting
        expect(screen.getByRole('button', { name: /登入中/i })).toBeDisabled();
        expect(screen.getByLabelText('電子郵件')).toBeDisabled();
        expect(screen.getByLabelText('密碼')).toBeDisabled();

        // Resolve the login promise
        await act(async () => {
            resolveLogin!();
        });
        
        // Wait for redirect to be called
        await vi.waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
        expect(loginMock).toHaveBeenCalledWith('test@example.com', 'Valid123');
    });

    it('登入失敗顯示錯誤訊息', async () => {
        const user = userEvent.setup();
        const loginMock = vi.fn().mockRejectedValue({
            response: { data: { message: '帳號或密碼錯誤' } }
        });
        
        vi.mocked(useAuth).mockReturnValue({
            login: loginMock,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);

        render(<LoginPage />);
        await user.type(screen.getByLabelText('電子郵件'), 'test@example.com');
        await user.type(screen.getByLabelText('密碼'), 'Wrong123');
        await user.click(screen.getByRole('button', { name: '登入' }));

        const errorMessage = await screen.findByText('帳號或密碼錯誤');
        expect(errorMessage).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登入' })).not.toBeDisabled();
    });
});

describe('狀態邏輯', () => {
    it('已登入狀態直接導向', () => {
        const navigateMock = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(navigateMock);
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            isAuthenticated: true,
            authExpiredMessage: '',
            clearAuthExpiredMessage: vi.fn(),
        } as any);

        render(<LoginPage />);
        expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('顯示登入過期訊息', () => {
        const clearAuthExpiredMessageMock = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            isAuthenticated: false,
            authExpiredMessage: '您的登入已過期',
            clearAuthExpiredMessage: clearAuthExpiredMessageMock,
        } as any);

        render(<LoginPage />);
        expect(screen.getByText('您的登入已過期')).toBeInTheDocument();
        expect(clearAuthExpiredMessageMock).toHaveBeenCalled();
    });
});
