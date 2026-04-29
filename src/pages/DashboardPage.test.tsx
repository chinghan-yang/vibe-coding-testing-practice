import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '../context/AuthContext';
import { useNavigate, BrowserRouter } from 'react-router-dom';
import { productApi } from '../api/productApi';

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

// Mock productApi
vi.mock('../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    },
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('前端元素', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
        // Default API mock to return empty array immediately to avoid loading state issues in basic renders
        vi.mocked(productApi.getProducts).mockResolvedValue([]);
    });

    it('渲染儀表板基本元素與用戶資訊', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'TestUser', role: 'user' },
            logout: vi.fn(),
        } as any);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        // 檢查標題
        expect(screen.getByRole('heading', { name: '儀表板' })).toBeInTheDocument();
        
        // 檢查頭像字母 (T from TestUser)
        expect(screen.getByText('T')).toBeInTheDocument();
        
        // 檢查歡迎詞
        expect(screen.getByText('Welcome, TestUser 👋')).toBeInTheDocument();
        
        // 檢查角色標籤
        const roleBadge = screen.getByText('一般用戶');
        expect(roleBadge).toBeInTheDocument();
        expect(roleBadge).toHaveClass('role-badge', 'user');
        
        // 檢查商品列表區塊標題
        expect(screen.getByRole('heading', { name: '商品列表' })).toBeInTheDocument();
    });
});

describe('驗證權限', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
        vi.mocked(productApi.getProducts).mockResolvedValue([]);
    });

    it('管理員角色顯示管理後台連結', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'Admin', role: 'admin' },
            logout: vi.fn(),
        } as any);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        const adminLink = screen.getByRole('link', { name: '🛠️ 管理後台' });
        expect(adminLink).toBeInTheDocument();
        expect(adminLink).toHaveAttribute('href', '/admin');
    });

    it('一般用戶不顯示管理後台連結', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'User', role: 'user' },
            logout: vi.fn(),
        } as any);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        const adminLink = screen.queryByRole('link', { name: '🛠️ 管理後台' });
        expect(adminLink).not.toBeInTheDocument();
    });
});

describe('function 邏輯', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
        vi.mocked(productApi.getProducts).mockResolvedValue([]);
    });

    it('點擊登出按鈕', async () => {
        const user = userEvent.setup();
        const logoutMock = vi.fn();
        const navigateMock = vi.fn();
        
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'User', role: 'user' },
            logout: logoutMock,
        } as any);
        vi.mocked(useNavigate).mockReturnValue(navigateMock);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        const logoutButton = screen.getByRole('button', { name: '登出' });
        await user.click(logoutButton);

        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true, state: null });
    });
});

describe('Mock API', () => {
    beforeEach(() => {
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    it('商品列表載入中狀態', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'User', role: 'user' },
            logout: vi.fn(),
        } as any);
        
        // 讓 Promise 不立即 resolve 以便捕捉載入狀態
        let resolvePromise: (value: any) => void;
        const pendingPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        vi.mocked(productApi.getProducts).mockReturnValue(pendingPromise as any);

        renderWithRouter(<DashboardPage />);

        expect(screen.getByText('載入商品中...')).toBeInTheDocument();
        expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
        
        // 清理 promise 以免警告
        act(() => {
            resolvePromise([]);
        });
    });

    it('商品列表載入成功', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'User', role: 'user' },
            logout: vi.fn(),
        } as any);
        
        const mockProducts = [
            { id: 1, name: '測試商品A', description: '這是一個測試商品', price: 1000 },
            { id: 2, name: '測試商品B', description: '這是另一個測試商品', price: 2500 }
        ];
        vi.mocked(productApi.getProducts).mockResolvedValue(mockProducts);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        // 確認載入中狀態消失
        expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
        
        // 確認商品資訊渲染
        expect(screen.getByText('測試商品A')).toBeInTheDocument();
        expect(screen.getByText('這是一個測試商品')).toBeInTheDocument();
        expect(screen.getByText('NT$ 1,000')).toBeInTheDocument(); // .toLocaleString()
        
        expect(screen.getByText('測試商品B')).toBeInTheDocument();
        expect(screen.getByText('這是另一個測試商品')).toBeInTheDocument();
        expect(screen.getByText('NT$ 2,500')).toBeInTheDocument();
    });

    it('商品列表載入失敗', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'User', role: 'user' },
            logout: vi.fn(),
        } as any);
        
        const mockError = {
            response: {
                status: 500,
                data: { message: '伺服器內部錯誤' }
            }
        };
        vi.mocked(productApi.getProducts).mockRejectedValue(mockError);

        await act(async () => {
            renderWithRouter(<DashboardPage />);
        });

        // 確認錯誤訊息渲染
        expect(screen.getByText('伺服器內部錯誤')).toBeInTheDocument();
        
        // 確認載入中狀態和商品列表不顯示
        expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
        expect(document.querySelector('.products-grid')).not.toBeInTheDocument();
    });
});
