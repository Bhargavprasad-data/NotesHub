import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, API_BASE } from '../lib/api.ts';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

function useQuery() {
	const { search } = useLocation();
	return useMemo(() => new URLSearchParams(search), [search]);
}

type Note = {
	_id: string;
	subject: string;
	institute: string;
	category: string;
	fileUrl: string;
	fileName?: string;
	fileSize?: number;
	createdAt?: string;
	description?: string;
	departments?: string[];
	year?: string;
	semester?: string;
	stream?: string;
	classLevel?: string;
	tags?: string[];
	views?: number; // Added views property
};

export default function Browse() {
	const query = useQuery();
	const { token } = useAuth();
	const navigate = useNavigate();
	const [meta, setMeta] = useState<any>(null);
	const [notes, setNotes] = useState<Note[]>([]);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState<Record<string,string>>({ category: query.get('category') || 'engineering' });
	const [q, setQ] = useState('');
	const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
	const [loadingDepartments, setLoadingDepartments] = useState(false);
	const [instituteSuggestions, setInstituteSuggestions] = useState<string[]>([]);
	const [showInstituteSuggestions, setShowInstituteSuggestions] = useState(false);
	const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
	const [showStateSuggestions, setShowStateSuggestions] = useState(false);
	const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([]);
	const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
	const institutePrefix = (filters.institute || '').trim();
	const statePrefix = (filters.state || '').trim();
	const districtPrefix = (filters.district || '').trim();
	// Added: uploads count and message for gating downloads
	const [uploadCount, setUploadCount] = useState<number>(0);
	const [downloadMessage, setDownloadMessage] = useState<string>('');

	const visibleNotes = useMemo(() => {
		if (!institutePrefix) return notes;
		const prefixLower = institutePrefix.toLowerCase();
		return notes.filter(n => (n.institute || '').toLowerCase().startsWith(prefixLower));
	}, [notes, institutePrefix]);

	useEffect(() => { (async () => setMeta(await apiFetch('/api/notes/meta')))(); }, []);

	// Added: load user's upload count to gate downloads
	useEffect(() => {
		let active = true;
		const loadUploads = async () => {
			if (!token) { setUploadCount(0); return; }
			try {
				const mine = await apiFetch('/api/notes/mine');
				if (active) setUploadCount(Array.isArray(mine) ? mine.length : 0);
			} catch (_) {
				if (active) setUploadCount(0);
			}
		};
		loadUploads();
		return () => { active = false; };
	}, [token]);

	// Fetch available departments for the selected college
	const fetchAvailableDepartments = async (college: string, category: string) => {
		if (!college || !category) {
			setAvailableDepartments([]);
			return;
		}

		setLoadingDepartments(true);
		try {
			const params = new URLSearchParams({ category });
			const data = await apiFetch(`/api/notes/departments/${encodeURIComponent(college)}?${params.toString()}`);
			setAvailableDepartments(data.departments || []);
		} catch (error) {
			console.error('Error fetching departments:', error);
			setAvailableDepartments([]);
		} finally {
			setLoadingDepartments(false);
		}
	};

	// Load state suggestions when typing
	useEffect(() => {
		let active = true;
		const loadStates = async () => {
			if (!statePrefix) { setStateSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ prefix: statePrefix, category: filters.category || '' });
				const data = await apiFetch(`/api/notes/states?${params.toString()}`);
				if (active) setStateSuggestions(data?.states || []);
			} catch (_) { if (active) setStateSuggestions([]); }
		};
		loadStates();
		return () => { active = false; };
	}, [statePrefix, filters.category]);

	// Load district suggestions when typing
	useEffect(() => {
		let active = true;
		const loadDistricts = async () => {
			if (!districtPrefix) { setDistrictSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ prefix: districtPrefix, category: filters.category || '', state: filters.state || '' });
				const data = await apiFetch(`/api/notes/districts?${params.toString()}`);
				if (active) setDistrictSuggestions(data?.districts || []);
			} catch (_) { if (active) setDistrictSuggestions([]); }
		};
		loadDistricts();
		return () => { active = false; };
	}, [districtPrefix, filters.category, filters.state]);

	const apply = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ ...filters });
			if (q) params.set('q', q);
			const data = await apiFetch(`/api/notes?${params.toString()}`);
			setNotes(data);
		} finally { setLoading(false); }
	};

	useEffect(() => { if (filters.category) apply(); }, [filters.category]);
	useEffect(() => { if (q) apply(); }, [q]);

	// Fetch departments when college or category changes
	useEffect(() => {
		if (filters.institute && filters.category) {
			fetchAvailableDepartments(filters.institute, filters.category);
		} else {
			setAvailableDepartments([]);
		}
	}, [filters.institute, filters.category]);

	// Listen for department updates from uploads
	useEffect(() => {
		const handleDepartmentsUpdated = (event: CustomEvent) => {
			const { institute: updatedInstitute, category: updatedCategory } = event.detail;
			// Refresh departments if the update is for the currently selected college and category
			if (filters.institute && filters.category && 
				filters.institute.toLowerCase() === updatedInstitute.toLowerCase() && 
				filters.category === updatedCategory) {
				fetchAvailableDepartments(filters.institute, filters.category);
			}
		};

		window.addEventListener('departmentsUpdated', handleDepartmentsUpdated as EventListener);
		return () => {
			window.removeEventListener('departmentsUpdated', handleDepartmentsUpdated as EventListener);
		};
	}, [filters.institute, filters.category]);

	const onChange = (k: string, v: string) => {
		setFilters(f => {
			const newFilters = { ...f, [k]: v };
			// Clear department filter when college changes
			if (k === 'institute') {
				newFilters.department = '';
			}
			return newFilters;
		});
	};

	// Load institute suggestions based on prefix and category
	useEffect(() => {
		let active = true;
		const load = async () => {
			if (!filters.category || !institutePrefix) { setInstituteSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ category: filters.category, prefix: institutePrefix });
				const data = await apiFetch(`/api/notes/institutes?${params.toString()}`);
				if (active) setInstituteSuggestions(data?.institutes || []);
			} catch (_) {
				if (active) setInstituteSuggestions([]);
			}
		};
		load();
		return () => { active = false; };
	}, [filters.category, institutePrefix]);

	const highlightPrefix = (text: string, prefix: string) => {
		if (!text) return null;
		if (!prefix) return text;
		const t = String(text);
		const p = String(prefix);
		if (!t.toLowerCase().startsWith(p.toLowerCase())) return text;
		const head = t.slice(0, p.length);
		const tail = t.slice(p.length);
		return (<><span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded-sm">{head}</span>{tail}</>);
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};
	
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const renderInstitute = (name: string) => {
		if (!name) return null;
		if (!institutePrefix) return name;
		const prefix = institutePrefix;
		const nameLower = name.toLowerCase();
		const prefixLower = prefix.toLowerCase();
		if (!nameLower.startsWith(prefixLower)) return name;
		const head = name.slice(0, prefix.length);
		const tail = name.slice(prefix.length);
		return (
			<>
				<span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded-sm">{head}</span>
				{tail}
			</>
		);
	};

	const handleDownload = async (note: Note) => {
		setDownloadMessage('');
		if (!token) {
			setDownloadMessage('Please login to download.');
			return;
		}
		if (uploadCount < 2) {
			setDownloadMessage('To download notes, please upload at least 2 notes.');
			return;
		}
		try {
			const res = await fetch(`${API_BASE}/api/notes/${note._id}/download`, {
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) {
				const msg = res.status === 403 ? 'To download notes, please upload at least 2 notes.' : `Download failed (${res.status})`;
				setDownloadMessage(msg);
				return;
			}
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = note.fileName || `${note.subject || 'note'}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
			// Optimistically bump local downloads
			(note as any).downloads = (typeof (note as any).downloads === 'number' ? (note as any).downloads : 0) + 1;
		} catch (err) {
			setDownloadMessage('Download failed. Please try again.');
		}
	};

	return (
		<div className="p-6 grid gap-6 md:grid-cols-[260px_1fr]">
			<aside className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-4 space-y-3 h-max">
				<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search" className="w-full p-2 rounded bg-black/30 border border-white/10" />
				<select value={filters.category} onChange={e=>onChange('category', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
					<option value="">All Categories</option>
					<option value="school">School</option>
					<option value="intermediate">Intermediate</option>
					<option value="engineering">Engineering</option>
				</select>
				{/* State with suggestions */}
				<div className="relative">
					<input placeholder="State" value={filters.state || ''} className="w-full p-2 rounded bg-black/30 border border-white/10" onFocus={() => setShowStateSuggestions(true)} onBlur={() => setTimeout(() => setShowStateSuggestions(false), 100)} onChange={e=>onChange('state', e.target.value)} />
					{showStateSuggestions && stateSuggestions.length > 0 && (
						<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
							{stateSuggestions.map(s => (
								<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { onChange('state', s); setShowStateSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
									{highlightPrefix(s, statePrefix)}
								</button>
							))}
						</div>
					)}
				</div>
				{/* District with suggestions */}
				<div className="relative">
					<input placeholder="District" value={filters.district || ''} className="w-full p-2 rounded bg-black/30 border border-white/10" onFocus={() => setShowDistrictSuggestions(true)} onBlur={() => setTimeout(() => setShowDistrictSuggestions(false), 100)} onChange={e=>onChange('district', e.target.value)} />
					{showDistrictSuggestions && districtSuggestions.length > 0 && (
						<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
							{districtSuggestions.map(s => (
								<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { onChange('district', s); setShowDistrictSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
									{highlightPrefix(s, districtPrefix)}
								</button>
							))}
						</div>
					)}
				</div>
				{filters.category === 'engineering' && (
					<>
						<div className="relative">
							<input placeholder="College" value={filters.institute || ''} className="w-full p-2 rounded bg-black/30 border border-white/10" onFocus={() => setShowInstituteSuggestions(true)} onBlur={() => setTimeout(() => setShowInstituteSuggestions(false), 100)} onChange={e=>onChange('institute', e.target.value)} />
							{showInstituteSuggestions && instituteSuggestions.length > 0 && (
								<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
									{instituteSuggestions.map(s => {
										const sLower = s.toLowerCase();
										const pLower = institutePrefix.toLowerCase();
										const head = s.slice(0, institutePrefix.length);
										const tail = s.slice(institutePrefix.length);
										return (
											<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { onChange('institute', s); setShowInstituteSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
											{sLower.startsWith(pLower) ? (<span><span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded-sm">{head}</span>{tail}</span>) : s}
											</button>
										);
									})}
								</div>
							)}
						</div>
						<select value={filters.department || ''} onChange={e=>onChange('department', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10" disabled={loadingDepartments}>
							<option value="">{loadingDepartments ? 'Loading departments...' : 'Department'}</option>
							{availableDepartments.map((d: string)=> <option key={d} value={d}>{d}</option>)}
						</select>
						<select value={filters.year || ''} onChange={e=>onChange('year', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
							<option value="">Year</option>
							{meta?.years?.map((y: string)=> <option key={y} value={y}>{y}</option>)}
						</select>
						<select value={filters.semester || ''} onChange={e=>onChange('semester', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
							<option value="">Semester</option>
							{Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>Semester {s}</option>)}
						</select>
					</>
				)}
				{filters.category === 'intermediate' && (
					<>
						<input placeholder="College" value={filters.institute || ''} className="w-full p-2 rounded bg-black/30 border border-white/10" onChange={e=>onChange('institute', e.target.value)} />
						{/* Intermediate: remove Department filter */}
						<select value={filters.stream || ''} onChange={e=>onChange('stream', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
							<option value="">Stream</option>
							{meta?.streams?.map((s: string)=> <option key={s} value={s}>{s}</option>)}
						</select>
						{/* Intermediate: limit to 2 years */}
						<select value={filters.year || ''} onChange={e=>onChange('year', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
							<option value="">Year</option>
							<option value="1">1</option>
							<option value="2">2</option>
						</select>
						{/* Intermediate: remove Semester filter */}
					</>
				)}
				{filters.category === 'school' && (
					<>
						<input placeholder="School" value={filters.institute || ''} className="w-full p-2 rounded bg-black/30 border border-white/10" onChange={e=>onChange('institute', e.target.value)} />
						<select value={filters.classLevel || ''} onChange={e=>onChange('classLevel', e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
							<option value="">Class</option>
							{meta?.classes?.map((c: string)=> <option key={c} value={c}>{c}</option>)}
						</select>
					</>
				)}
				<button onClick={apply} className="w-full p-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60" disabled={loading}>{loading ? 'Loading...' : 'Apply Filters'}</button>
			</aside>
			<main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{loading && visibleNotes.length === 0 && (
					<>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={`skeleton-${i}`} className="relative rounded-xl bg-glass-100 backdrop-blur border border-white/10 overflow-hidden animate-pulse">
								<div className="p-4 space-y-3">
									<div className="h-5 w-2/3 bg-white/10 rounded" />
									<div className="h-4 w-1/3 bg-white/10 rounded" />
									<div className="h-3 w-full bg-white/10 rounded" />
									<div className="h-3 w-5/6 bg-white/10 rounded" />
									<div className="flex gap-2 pt-2">
										<div className="h-6 w-16 bg-white/10 rounded-full" />
										<div className="h-6 w-20 bg-white/10 rounded-full" />
										<div className="h-6 w-14 bg-white/10 rounded-full" />
									</div>
									<div className="h-10 w-full bg-white/10 rounded mt-4" />
									<div className="h-10 w-full bg-white/10 rounded mt-2" />
								</div>
							</div>
						))}
					</>
				)}
				{visibleNotes.map(n => (
					<div key={n._id} className="group relative rounded-xl bg-glass-100 backdrop-blur border border-white/10 hover:bg-glass-200 transition overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
						<div className="relative z-10 p-4 pb-0 flex flex-col h-full">
							{/* Header with title and category */}
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<h3 className="text-lg font-semibold text-white mb-1">{n.subject}</h3>
									<p className="text-sm text-gray-400">{renderInstitute(n.institute)}</p>
								</div>
								<span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30">
									{n.category}
								</span>
							</div>
							
							{/* Description */}
							{n.description && (
								<p className="text-sm text-gray-300 mb-3">{n.description}</p>
							)}
							
							{/* Tags and metadata */}
							<div className="flex flex-wrap gap-2 mb-4">
								{n.departments && n.departments.length > 0 && (
									<>
										{n.departments.map((dept: string) => (
											<span key={dept} className="px-2 py-1 rounded-full text-xs bg-gray-600/30 text-gray-300">
												{dept}
											</span>
										))}
									</>
								)}
								{n.semester && (
									<span className="px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-300 border border-green-500/30">
										Semester {n.semester}
									</span>
								)}
								{n.year && (
									<span className="px-2 py-1 rounded-full text-xs bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">
										Year {n.year}
									</span>
								)}
								{n.stream && (
									<span className="px-2 py-1 rounded-full text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30">
										{n.stream}
									</span>
								)}
								{n.classLevel && (
									<span className="px-2 py-1 rounded-full text-xs bg-orange-600/20 text-orange-300 border border-orange-500/30">
										{n.classLevel}
									</span>
								)}
								{n.tags && n.tags.map(tag => (
									<span key={tag} className="px-2 py-1 rounded-full text-xs bg-gray-600/30 text-gray-300">
										#{tag}
									</span>
								))}
							</div>
							
							{/* File info */}
							<div className="flex items-center justify-between text-xs text-gray-400 mb-3">
								<span>{formatFileSize(n.fileSize || 0)}</span>
								<span>{n.createdAt ? formatDate(n.createdAt) : 'Unknown date'}</span>
							</div>
							
							{/* Action button - only View, no Delete */}
							<div className="mt-3 -mx-4 -mb-4">
								{/* View Button */}
								<button 
									className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2"
									onClick={async () => {
										try { await apiFetch(`/api/notes/${n._id}/view`, { method: 'POST' }); } catch {}
										(n as any).views = (typeof (n as any).views === 'number' ? (n as any).views : 0) + 1;
										navigate(`/view/${n._id}`, { state: { note: n } });
									}}
								>
									📄 View
								</button>
								{/* Download Button - gated */}
								<button
									onClick={() => handleDownload(n)}
									className="block w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 border-t border-white/10 disabled:opacity-60"
								>
									⬇️ Download
								</button>
								{!token && (
									<div className="w-full px-4 py-2 text-xs text-gray-300 text-center border-t border-white/5 bg-black/10">
										Login required to download
									</div>
								)}
								{downloadMessage && (
									<div className="w-full px-4 py-2 text-xs text-yellow-300 text-center border-t border-white/5 bg-yellow-900/20">
										{downloadMessage}
									</div>
								)}
								{/* Views count */}
								<div className="w-full px-4 py-2 text-xs text-gray-400 text-center border-t border-white/5 bg-black/10">
									<span>Views: {typeof (n as any).views === 'number' ? (n as any).views : 0}</span>
									<span className="mx-2">•</span>
									<span>Downloads: {typeof (n as any).downloads === 'number' ? (n as any).downloads : 0}</span>
								</div>
								{/* Uploader */}
								<div className="w-full px-4 py-2 text-xs text-gray-400 text-center bg-black/5 border-t border-white/5">
									Added by {((n as any).owner && ((n as any).owner.name || (n as any).owner.email)) || 'Unknown'}
								</div>
								<div className="w-full px-4 py-2 text-xs text-gray-400 text-center bg-black/5 border-t border-white/5">
									📚Materials
								</div>
								{/* Book decoration */}
								{/* <div className="flex justify-center items-center pb-2">
									<div className="text-2xl opacity-30">📚</div>
								</div> */}
							</div>
						</div>
					</div>
				))}
			</main>
		</div>
	);
}
