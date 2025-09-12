export type HttpMethod = 'GET' | 'POST' | 'DELETE';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function getToken(): string | null {
	try { return localStorage.getItem('token'); } catch { return null; }
}

export async function apiFetch(path: string, options: { method?: HttpMethod; body?: any; isForm?: boolean } = {}) {
	const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
	const headers: Record<string, string> = {};
	const token = getToken();
	if (token) headers['Authorization'] = `Bearer ${token}`;
	let body: BodyInit | undefined;
	if (options.body) {
		if (options.isForm) {
			body = options.body as FormData;
		} else {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(options.body);
		}
	}
	const res = await fetch(url, { method: options.method || 'GET', headers, body });
	if (!res.ok) {
		let message = 'Request failed';
		try { const j = await res.json(); message = j.message || message; } catch {}
		throw new Error(message);
	}
	try { return await res.json(); } catch { return null; }
}
