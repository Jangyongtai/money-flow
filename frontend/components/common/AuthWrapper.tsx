'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// 이 토큰은 사용자님이 나중에 바꾸셔도 됩니다!
const SECRET_TOKEN = 'money-flow-key-2025';

function AuthContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const tokenInUrl = searchParams.get('token');
        const savedToken = localStorage.getItem('money_flow_token');

        if (tokenInUrl === SECRET_TOKEN) {
            localStorage.setItem('money_flow_token', SECRET_TOKEN);
            setIsAuthenticated(true);

            // URL에서 토큰을 지워줍니다 (보안 및 미관상)
            const params = new URLSearchParams(searchParams.toString());
            params.delete('token');
            const newUrl = pathname + (params.toString() ? `?${params.toString()}` : '');
            router.replace(newUrl);
        } else if (savedToken === SECRET_TOKEN) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [searchParams, pathname, router]);

    if (isAuthenticated === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-pulse text-blue-600 font-medium">보안 확인 중...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <div className="text-4xl">🔐</div>
                    <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
                    <p className="text-gray-600">
                        이 사이트는 허용된 사용자만 접근할 수 있습니다.<br />
                        비밀 토큰이 포함된 URL로 접속해 주세요.
                    </p>
                    <div className="pt-4 text-xs text-gray-400">
                        Internal Secure Access Only
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthContent>{children}</AuthContent>
        </Suspense>
    );
}
