import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export default function OAuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = params.get('token');
        const name = params.get('name') || '';
        const email = params.get('email') || '';
        const role = (params.get('role') as any) || 'student';
        if (token) {
            login(token, { id: 'me', name, email, phone: '', role });
            navigate('/');
        } else {
            navigate('/login');
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-gray-300">Signing you in...</div>
        </div>
    );
}


