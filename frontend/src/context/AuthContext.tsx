import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type User = { id: string; name: string; email: string; phone: string; role: 'student'|'faculty'; avatarUrl?: string } | null;

type AuthContextType = {
	user: User;
	token: string | null;
	login: (token: string, user: NonNullable<User>) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User>(null);

	useEffect(() => {
		try {
			const t = localStorage.getItem('token');
			const u = localStorage.getItem('user');
			if (t) setToken(t);
			if (u) setUser(JSON.parse(u));
		} catch {}
	}, []);

	const api = useMemo(() => ({
		user,
		token,
		login: (t: string, u: NonNullable<User>) => {
			setToken(t); setUser(u);
			try { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); } catch {}
		},
		logout: () => {
			setToken(null); setUser(null);
			try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
		},
	}), [user, token]);

	return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
