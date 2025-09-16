import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.ts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate, Navigate } from 'react-router-dom';

export default function Upload() {
	const { token, user } = useAuth();
	const navigate = useNavigate();
	const [meta, setMeta] = useState<any>(null);
	const [category, setCategory] = useState('engineering');
	const [institute, setInstitute] = useState('');
	const [stateName, setStateName] = useState('');
	const [district, setDistrict] = useState('');
	const [departments, setDepartments] = useState<string[]>([]);
	const [newDepartment, setNewDepartment] = useState('');
	const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
	const [loadingDepartments, setLoadingDepartments] = useState(false);
	const [stream, setStream] = useState('');
	const [year, setYear] = useState('');
	const [semester, setSemester] = useState('');
	const [classLevel, setClassLevel] = useState('');
	const [subject, setSubject] = useState('');
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const canUpload = Boolean(token); // User is authenticated if token exists

	// Suggestions state
	const [instSuggestions, setInstSuggestions] = useState<string[]>([]);
	const [showInstSuggestions, setShowInstSuggestions] = useState(false);
	const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
	const [showStateSuggestions, setShowStateSuggestions] = useState(false);
	const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([]);
	const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
	const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
	const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);

	// Added: modal state and fields
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [uPhone, setUPhone] = useState<string>(user?.phone || '');
	const [consent, setConsent] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	useEffect(() => { (async () => setMeta(await apiFetch('/api/notes/meta')))(); }, []);

	// Load existing departments for the selected institute + category
	useEffect(() => {
		const fetchDepts = async () => {
			const col = institute.trim();
			if (!col || !category) { setAvailableDepartments([]); return; }
			setLoadingDepartments(true);
			try {
				const params = new URLSearchParams({ category });
				const data = await apiFetch(`/api/notes/departments/${encodeURIComponent(col)}?${params.toString()}`);
				setAvailableDepartments(data?.departments || []);
			} catch (_) {
				setAvailableDepartments([]);
			} finally {
				setLoadingDepartments(false);
			}
		};
		fetchDepts();
	}, [institute, category]);

	const addDepartment = () => {
		if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
			setDepartments([...departments, newDepartment.trim()]);
			setNewDepartment('');
		}
	};

	const addDepartmentFromSelect = (dept: string) => {
		if (dept && !departments.includes(dept)) {
			setDepartments([...departments, dept]);
		}
	};

	const removeDepartment = (dept: string) => {
		setDepartments(departments.filter(d => d !== dept));
	};

	// Suggestion helpers
	const highlightPrefix = (text: string, prefix: string) => {
		if (!prefix) return text;
		const t = String(text);
		const p = String(prefix);
		if (!t.toLowerCase().startsWith(p.toLowerCase())) return text;
		const head = t.slice(0, p.length);
		const tail = t.slice(p.length);
		return (<><span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded-sm">{head}</span>{tail}</>);
	};

	useEffect(() => {
		let active = true;
		const load = async () => {
			const prefix = institute.trim();
			if (!prefix || !category) { setInstSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ category, prefix });
				const data = await apiFetch(`/api/notes/institutes?${params.toString()}`);
				if (active) setInstSuggestions((data?.institutes as string[]) || []);
			} catch (_) { if (active) setInstSuggestions([]); }
		};
		load();
		return () => { active = false; };
	}, [institute, category]);

	useEffect(() => {
		let active = true;
		const load = async () => {
			const prefix = stateName.trim();
			if (!prefix) { setStateSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ prefix, category });
				const data = await apiFetch(`/api/notes/states?${params.toString()}`);
				if (active) setStateSuggestions(data?.states || []);
			} catch (_) { if (active) setStateSuggestions([]); }
		};
		load();
		return () => { active = false; };
	}, [stateName, category]);

	useEffect(() => {
		let active = true;
		const load = async () => {
			const prefix = district.trim();
			if (!prefix) { setDistrictSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ prefix, category, state: stateName });
				const data = await apiFetch(`/api/notes/districts?${params.toString()}`);
				if (active) setDistrictSuggestions(data?.districts || []);
			} catch (_) { if (active) setDistrictSuggestions([]); }
		};
		load();
		return () => { active = false; };
	}, [district, category, stateName]);

	useEffect(() => {
		let active = true;
		const load = async () => {
			const q = subject.trim();
			if (!q) { setSubjectSuggestions([]); return; }
			try {
				const params = new URLSearchParams({ q, category });
				const notes = await apiFetch(`/api/notes?${params.toString()}`) as any[];
				const subs = Array.from(new Set(((notes || []) as any[]).map((n: any)=> n.subject as string).filter(Boolean))) as string[];
				if (active) setSubjectSuggestions((subs.slice(0, 20)) as string[]);
			} catch (_) { if (active) setSubjectSuggestions([]); }
		};
		load();
		return () => { active = false; };
	}, [subject, category]);

	const validate = () => {
		if (!institute.trim()) return 'Institute is required';
		if (!subject.trim()) return 'Subject is required';
		if (!file) return 'Please select a file';
		const okTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
		if (!okTypes.includes(file.type)) return 'Only PDF/DOC/DOCX allowed';
		if (file.size > 25 * 1024 * 1024) return 'File exceeds 25MB';
		return null;
	};

	// Render redirect if not authenticated
	if (!token) {
		return <Navigate to="/auth?redirect=upload" replace />;
	}

	// Added: validate modal fields
	const validateAuthModal = () => {
		if (!uPhone.trim()) return 'Phone number is required for accountability.';
		if (!/^\+?[0-9\s-]{7,15}$/.test(uPhone.trim())) return 'Enter a valid phone number.';
		if (!consent) return 'You must agree to be accountable for uploads.';
		return null;
	};

	// Added: open modal first, then perform actual submit after confirm
	const onPrimarySubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus(null);
		if (!token) {
			setStatus('Authentication required. Please login to upload notes.');
			return;
		}
		const err = validate(); if (err) { setStatus(err); return; }
		// Open modal to collect phone/consent prior to final submit
		setShowAuthModal(true);
	};

	const performUpload = async () => {
		const modalErr = validateAuthModal();
		if (modalErr) { setAuthError(modalErr); return; }
		setAuthError(null);
		const fd = new FormData();
		fd.append('category', category);
		fd.append('institute', institute);
		if (stateName) fd.append('state', stateName);
		if (district) fd.append('district', district);
		if (departments.length) fd.append('departments', departments.join(','));
		if (stream) fd.append('stream', stream);
		if (year) fd.append('year', year);
		if (semester) fd.append('semester', semester);
		if (classLevel) fd.append('classLevel', classLevel);
		fd.append('subject', subject);
		if (description) fd.append('description', description);
		if (tags) fd.append('tags', tags);
		fd.append('file', file as Blob);
		// Added: attach modal fields
		fd.append('uPhone', uPhone.trim());
		fd.append('uConsent', consent ? 'true' : 'false');
		try {
			await apiFetch('/api/notes', { method: 'POST', body: fd, isForm: true });
			setStatus('Upload received. Your note is now in the waiting list for admin approval.');
			setShowAuthModal(false);
			// Notify other components that departments might have been updated
			window.dispatchEvent(new CustomEvent('departmentsUpdated', { 
				detail: { institute, category, departments } 
			}));
		} catch (err: any) { setStatus(err.message); }
	};

	return (
		<motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} onSubmit={onPrimarySubmit} className="p-6 mx-auto max-w-2xl bg-glass-100 backdrop-blur rounded-xl border border-white/10 space-y-3">
			<h2 className="text-xl font-semibold">Upload Notes</h2>
			<div className="p-3 rounded bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
				Authenticated as {user?.name}. You can upload notes.
			</div>
			<select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-2 rounded bg-black/30 border border-white/10">
				<option value="school">School</option>
				<option value="intermediate">Intermediate</option>
				<option value="engineering">Engineering</option>
			</select>
			<div className="relative">
				<input placeholder="Enter full name of the Institute" className="w-full p-2 rounded bg-black/30 border border-white/10" value={institute} onFocus={()=>setShowInstSuggestions(true)} onBlur={()=>setTimeout(()=>setShowInstSuggestions(false), 120)} onChange={e=>setInstitute(e.target.value)} />
				{showInstSuggestions && instSuggestions.length > 0 && (
					<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
						{instSuggestions.map(s => (
							<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { setInstitute(s); setShowInstSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
								{highlightPrefix(s, institute.trim())}
							</button>
						))}
					</div>
				)}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
				<div className="relative">
					<input placeholder="State" className="w-full p-2 rounded bg-black/30 border border-white/10" value={stateName} onFocus={()=>setShowStateSuggestions(true)} onBlur={()=>setTimeout(()=>setShowStateSuggestions(false), 120)} onChange={e=>setStateName(e.target.value)} />
					{showStateSuggestions && stateSuggestions.length > 0 && (
						<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
							{stateSuggestions.map(s => (
								<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { setStateName(s); setShowStateSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
									{highlightPrefix(s, stateName.trim())}
								</button>
							))}
						</div>
					)}
				</div>
				<div className="relative">
					<input placeholder="District" className="w-full p-2 rounded bg-black/30 border border-white/10" value={district} onFocus={()=>setShowDistrictSuggestions(true)} onBlur={()=>setTimeout(()=>setShowDistrictSuggestions(false), 120)} onChange={e=>setDistrict(e.target.value)} />
					{showDistrictSuggestions && districtSuggestions.length > 0 && (
						<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
							{districtSuggestions.map(s => (
								<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { setDistrict(s); setShowDistrictSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
									{highlightPrefix(s, district.trim())}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
			{institute.trim() && (
				<div className="space-y-2">
					<label className="block text-sm text-gray-400">Existing departments for this institute:</label>
					<div className="min-h-[2rem] grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
						{loadingDepartments ? (
							<span className="text-xs text-gray-400">Loading...</span>
						) : (
							(availableDepartments.length ? availableDepartments : []).map((dept: string) => (
								<button
									key={dept}
									type="button"
									onClick={() => !departments.includes(dept) && setDepartments([...departments, dept])}
									className="text-left px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-sm text-gray-200 border border-white/10"
								>
									{dept}
								</button>
							))
						)}
						{!loadingDepartments && availableDepartments.length === 0 && (
							<span className="text-xs text-gray-400">No departments found for this institute.</span>
						)}
					</div>
				</div>
			)}
			{category === 'engineering' && (
				<>
					<div className="space-y-3">
						<label className="block text-sm font-medium">Departments (Select Multiple)</label>
						{/* Custom Department Input */}
						<div className="flex gap-2">
							<input 
								placeholder="Type custom department name" 
								className="flex-1 p-2 rounded bg-black/30 border border-white/10" 
								value={newDepartment} 
								onChange={e=>setNewDepartment(e.target.value)}
								onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
							/>
							<button type="button" onClick={addDepartment} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500">
								Add Custom
							</button>
						</div>
						{/* Predefined Departments Multi-Select */}
						{meta?.engineeringDepartments && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Or select from common departments:</label>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
									{meta.engineeringDepartments.map((dept: string) => (
										<label key={dept} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
											<input 
												type="checkbox" 
												checked={departments.includes(dept)}
												onChange={(e) => {
													if (e.target.checked) {
														addDepartmentFromSelect(dept);
													} else {
														removeDepartment(dept);
													}
												}}
												className="rounded border-white/20 bg-black/30 text-blue-600 focus:ring-blue-500"
											/>
											<span className="text-gray-300">{dept}</span>
										</label>
									))}
								</div>
							</div>
						)}
						{/* Selected Departments Display */}
						{departments.length > 0 && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Selected Departments ({departments.length}):</label>
								<div className="flex flex-wrap gap-2">
									{departments.map(dept => (
										<span key={dept} className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-sm text-white">
											{dept}
											<button 
												type="button" 
												onClick={() => removeDepartment(dept)} 
												className="text-red-300 hover:text-red-100 ml-1 font-bold"
											>
												×
											</button>
										</span>
									))}
								</div>
								<button 
									type="button" 
									onClick={() => setDepartments([])} 
									className="text-xs text-red-400 hover:text-red-300 underline"
								>
									Clear All
								</button>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						<select onChange={e=>setYear(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Year</option>
							{meta?.years?.map((y: string)=> <option key={y} value={y}>{y}</option>)}
						</select>
						<select onChange={e=>setSemester(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Semester</option>
							{Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>Semester {s}</option>)}
						</select>
					</div>
				</>
			)}
			{category === 'intermediate' && (
				<>
					<div className="space-y-3">
						<label className="block text-sm font-medium">Departments (Select Multiple)</label>
						{/* Custom Department Input */}
						<div className="flex gap-2">
							<input 
								placeholder="Type custom department name" 
								className="flex-1 p-2 rounded bg-black/30 border border-white/10" 
								value={newDepartment} 
								onChange={e=>setNewDepartment(e.target.value)}
								onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
							/>
							<button type="button" onClick={addDepartment} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500">
								Add Custom
							</button>
						</div>
						{/* Predefined Departments Multi-Select */}
						{meta?.intermediateDepartments && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Or select from common departments:</label>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
									{meta.intermediateDepartments.map((dept: string) => (
										<label key={dept} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
											<input 
												type="checkbox" 
												checked={departments.includes(dept)}
												onChange={(e) => {
													if (e.target.checked) {
														addDepartmentFromSelect(dept);
													} else {
														removeDepartment(dept);
													}
												}}
												className="rounded border-white/20 bg-black/30 text-blue-600 focus:ring-blue-500"
											/>
											<span className="text-gray-300">{dept}</span>
										</label>
									))}
								</div>
							</div>
						)}
						{/* Selected Departments Display */}
						{departments.length > 0 && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Selected Departments ({departments.length}):</label>
								<div className="flex flex-wrap gap-2">
									{departments.map(dept => (
										<span key={dept} className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-sm text-white">
											{dept}
											<button 
												type="button" 
												onClick={() => removeDepartment(dept)} 
												className="text-red-300 hover:text-red-100 ml-1 font-bold"
											>
												×
											</button>
										</span>
									))}
								</div>
								<button 
									type="button" 
									onClick={() => setDepartments([])} 
									className="text-xs text-red-400 hover:text-red-300 underline"
								>
									Clear All
								</button>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
						<select onChange={e=>setStream(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Stream</option>
							{meta?.streams?.map((s: string)=> <option key={s} value={s}>{s}</option>)}
						</select>
						<select onChange={e=>setYear(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Year</option>
							<option value="1">1</option>
							<option value="2">2</option>
						</select>
						<select onChange={e=>setSemester(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Semester</option>
							{Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>Semester {s}</option>)}
						</select>
					</div>
				</>
			)}
			{category === 'school' && (
				<>
					<div className="space-y-3">
						<label className="block text-sm font-medium">Departments (Select Multiple)</label>
						{/* Custom Department Input */}
						<div className="flex gap-2">
							<input 
								placeholder="Type custom department name" 
								className="flex-1 p-2 rounded bg-black/30 border border-white/10" 
								value={newDepartment} 
								onChange={e=>setNewDepartment(e.target.value)}
								onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
							/>
							<button type="button" onClick={addDepartment} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500">
								Add Custom
							</button>
						</div>
						{/* Predefined Departments Multi-Select */}
						{meta?.schoolDepartments && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Or select from common departments:</label>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
									{meta.schoolDepartments.map((dept: string) => (
										<label key={dept} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
											<input 
												type="checkbox" 
												checked={departments.includes(dept)}
												onChange={(e) => {
													if (e.target.checked) {
														addDepartmentFromSelect(dept);
													} else {
														removeDepartment(dept);
													}
												}}
												className="rounded border-white/20 bg-black/30 text-blue-600 focus:ring-blue-500"
											/>
											<span className="text-gray-300">{dept}</span>
										</label>
									))}
								</div>
							</div>
						)}
						{/* Selected Departments Display */}
						{departments.length > 0 && (
							<div className="space-y-2">
								<label className="block text-sm text-gray-400">Selected Departments ({departments.length}):</label>
								<div className="flex flex-wrap gap-2">
									{departments.map(dept => (
										<span key={dept} className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-sm text-white">
											{dept}
											<button 
												type="button" 
												onClick={() => removeDepartment(dept)} 
												className="text-red-300 hover:text-red-100 ml-1 font-bold"
											>
												×
											</button>
										</span>
									))}
								</div>
								<button 
									type="button" 
									onClick={() => setDepartments([])} 
									className="text-xs text-red-400 hover:text-red-300 underline"
								>
									Clear All
								</button>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						<select onChange={e=>setClassLevel(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Class</option>
							{meta?.classes?.map((c: string)=> <option key={c} value={c}>{c}</option>)}
						</select>
						<select onChange={e=>setSemester(e.target.value)} className="p-2 rounded bg-black/30 border border-white/10">
							<option value="">Semester</option>
							{Array.from({length: 8}, (_, i) => i + 1).map(s => <option key={s} value={s}>Semester {s}</option>)}
						</select>
					</div>
				</>
			)}
			<div className="relative">
				<input placeholder="Subject" className="w-full p-2 rounded bg-black/30 border border-white/10" value={subject} onFocus={()=>setShowSubjectSuggestions(true)} onBlur={()=>setTimeout(()=>setShowSubjectSuggestions(false), 120)} onChange={e=>setSubject(e.target.value)} />
				{showSubjectSuggestions && subjectSuggestions.length > 0 && (
					<div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded bg-black/80 border border-white/10 shadow-lg">
						{subjectSuggestions.map(s => (
							<button key={s} type="button" onMouseDown={(e)=> e.preventDefault()} onClick={() => { setSubject(s); setShowSubjectSuggestions(false); }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm text-gray-200">
								{highlightPrefix(s, subject.trim())}
							</button>
						))}
					</div>
				)}
			</div>
			<textarea placeholder="Description" className="w-full p-2 rounded bg-black/30 border border-white/10" value={description} onChange={e=>setDescription(e.target.value)} />
			<input placeholder="Tags (comma separated)" className="w-full p-2 rounded bg-black/30 border border-white/10" value={tags} onChange={e=>setTags(e.target.value)} />
			<input type="file" accept=".pdf,.doc,.docx" onChange={e=>setFile(e.target.files?.[0] || null)} className="w-full" />
			<button type="button" onClick={onPrimarySubmit} className="w-full p-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60" disabled={!canUpload}>Upload</button>
			{status && <div className="text-sm">{status}</div>}

			{showAuthModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/60" onClick={() => setShowAuthModal(false)} />
					<div className="relative w-full max-w-md p-6 rounded-xl bg-glass-100 backdrop-blur border border-white/10 space-y-4">
						<h3 className="text-lg font-semibold">Upload Authentication</h3>
						<p className="text-sm text-gray-300">For safety, provide your phone number and confirm accountability. This will be stored with your upload and may be shared with authorities in case of misuse.</p>
						<input
							placeholder="Phone number"
							className="w-full p-2 rounded bg-black/30 border border-white/10"
							value={uPhone}
							onChange={e=>setUPhone(e.target.value)}
						/>
						<label className="flex items-start gap-2 text-sm text-gray-200">
							<input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)} />
							<span>I confirm this content is lawful and I accept responsibility for any misuse.</span>
						</label>
						{authError && <div className="text-sm text-red-400">{authError}</div>}
						<div className="flex gap-2 justify-end">
							<button type="button" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20" onClick={()=>setShowAuthModal(false)}>Cancel</button>
							<button type="button" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={performUpload}>Confirm & Upload</button>
						</div>
					</div>
				</div>
			)}
		</motion.form>
	);
}
