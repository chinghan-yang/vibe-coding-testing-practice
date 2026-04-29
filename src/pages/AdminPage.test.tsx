import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPage } from './AdminPage';
import { useAuth } from '../context/AuthContext';
import { useNavigate, BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('前端元素', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('渲染管理後台基本元素', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'Admin', role: 'admin' },
            logout: vi.fn(),
        } as any);

        renderWithRouter(<AdminPage />);
        expect(screen.getByRole('heading', { name: '🛠️ 管理後台' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '← 返回' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
        expect(screen.getByText('只有 admin 角色可以訪問')).toBeInTheDocument();
    });

    it('根據角色顯示正確的標籤', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'Admin', role: 'admin' },
            logout: vi.fn(),
        } as any);

        renderWithRouter(<AdminPage />);
        const badge = screen.getByText('管理員');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('role-badge', 'admin');
    });
});

describe('導航功能', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('點擊返回連結導向儀表板', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'Admin', role: 'admin' },
            logout: vi.fn(),
        } as any);

        renderWithRouter(<AdminPage />);
        const link = screen.getByRole('link', { name: '← 返回' });
        expect(link).toHaveAttribute('href', '/dashboard');
    });
});

describe('function 邏輯', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('點擊登出按鈕', async () => {
        const user = userEvent.setup();
        const logoutMock = vi.fn();
        const navigateMock = vi.fn();
        
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'Admin', role: 'admin' },
            logout: logoutMock,
        } as any);
        vi.mocked(useNavigate).mockReturnValue(navigateMock);

        renderWithRouter(<AdminPage />);
        
        const logoutButton = screen.getByRole('button', { name: '登出' });
        await user.click(logoutButton);
        
        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true, state: null });
    });
});
