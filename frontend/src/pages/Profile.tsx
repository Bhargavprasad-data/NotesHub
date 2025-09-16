import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { motion } from 'framer-motion';

export default function Profile() {
	const { user, token } = useAuth();
	const [notes, setNotes] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [stats, setStats] = useState({ totalNotes: 0, totalSize: 0, categories: {} as Record<string, number> });
	const [toast, setToast] = useState<string | null>(null);
	const statusMapRef = useRef<Record<string, string>>({});
	let toastTimerRef = useRef<number | null>(null);
	
	const showToast = (message: string) => {
		setToast(message);
		if (toastTimerRef.current) {
			window.clearTimeout(toastTimerRef.current);
		}
		toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
	};
	
	const load = async () => {
		setLoading(true);
		try { 
			const userNotes = await apiFetch('/api/notes/mine');
			setNotes(userNotes);
			// prime status map
			const map: Record<string, string> = {};
			userNotes.forEach((n: any) => { if (n && n._id) map[n._id] = n.status; });
			statusMapRef.current = map;
			
			// Calculate stats
			const totalSize = userNotes.reduce((sum: number, note: any) => sum + (note.fileSize || 0), 0);
			const categories = userNotes.reduce((acc: Record<string, number>, note: any) => {
				acc[note.category] = (acc[note.category] || 0) + 1;
				return acc;
			}, {});
			
			setStats({
				totalNotes: userNotes.length,
				totalSize,
				categories
			});
		} finally { 
			setLoading(false); 
		}
	};
	
	useEffect(() => { load(); }, []);
	
	// Poll for status changes (pending -> approved)
	useEffect(() => {
		const interval = window.setInterval(async () => {
			try {
				const latest = await apiFetch('/api/notes/mine');
				let approvedCount = 0;
				for (const n of latest) {
					const prev = statusMapRef.current[n._id];
					if (prev === 'pending' && n.status === 'approved') {
						approvedCount += 1;
					}
				}
				if (approvedCount > 0) {
					showToast(approvedCount === 1 ? 'Your note was approved!' : `${approvedCount} notes were approved!`);
				}
				// update state and status map
				setNotes(latest);
				const map: Record<string, string> = {};
				latest.forEach((n: any) => { if (n && n._id) map[n._id] = n.status; });
				statusMapRef.current = map;
			} catch {}
		}, 10000); // 10s
		return () => window.clearInterval(interval);
	}, []);
	
	useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);
	
	const remove = async (id: string) => {
		if (window.confirm('Are you sure you want to delete this note?')) {
			await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
			setNotes(ns => ns.filter(n => n._id !== id));
			load(); // Reload to update stats
		}
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
	return (
		<div className="p-6 space-y-6">
			{/* Toast */}
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-green-600 text-white shadow-lg">
					{toast}
				</div>
			)}
			{/* User Profile Section */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-6"
			>
				<div className="flex items-center gap-4 mb-4">
					<div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
						{user?.avatarUrl ? (
							<img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
						) : (
							<span>{user?.name?.charAt(0).toUpperCase()}</span>
						)}
					</div>
					<div>
						<h1 className="text-2xl font-bold">{user?.name}</h1>
						<p className="text-gray-400">{user?.email}</p>
						<span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30">
							{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
						</span>
					</div>
				</div>
			</motion.div>

			{/* Statistics Section */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="grid grid-cols-1 md:grid-cols-3 gap-4"
			>
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-4 text-center">
					<div className="text-2xl font-bold text-blue-400">{stats.totalNotes}</div>
					<div className="text-sm text-gray-400">Total Notes</div>
				</div>
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-4 text-center">
					<div className="text-2xl font-bold text-green-400">{formatFileSize(stats.totalSize)}</div>
					<div className="text-sm text-gray-400">Total Size</div>
				</div>
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-4 text-center">
					<div className="text-2xl font-bold text-purple-400">{Object.keys(stats.categories).length}</div>
					<div className="text-sm text-gray-400">Categories</div>
				</div>
			</motion.div>

			{/* Category Breakdown */}
			{Object.keys(stats.categories).length > 0 && (
				<motion.div 
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-4"
				>
					<h3 className="text-lg font-semibold mb-3">Notes by Category</h3>
					<div className="flex flex-wrap gap-2">
						{Object.entries(stats.categories).map(([category, count]) => (
							<span key={category} className="px-3 py-1 rounded-full text-sm bg-blue-600/20 text-blue-300 border border-blue-500/30">
								{category.charAt(0).toUpperCase() + category.slice(1)}: {count}
							</span>
						))}
					</div>
				</motion.div>
			)}

			{/* My Uploads Section */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">My Uploads</h2>
					<button onClick={load} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm border border-white/10">Refresh status</button>
				</div>
				{loading ? (
					<div className="text-center py-8">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
						<p className="mt-2 text-gray-400">Loading your notes...</p>
					</div>
				) : notes.length === 0 ? (
					<div className="text-center py-12 bg-glass-100 backdrop-blur rounded-xl border border-white/10">
						<div className="text-4xl mb-4">📚</div>
						<h3 className="text-lg font-semibold mb-2">No notes uploaded yet</h3>
						<p className="text-gray-400 mb-4">Start sharing your knowledge by uploading your first note!</p>
						<Link to="/upload" className="inline-block px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors">
							Upload Notes
						</Link>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{notes.map((note, index) => (
							<motion.div 
								key={note._id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								className="rounded-xl p-4 bg-glass-100 backdrop-blur border border-white/10 hover:bg-glass-200 transition-colors"
							>
								{/* Header with title and category */}
								<div className="flex items-start justify-between mb-3">
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-white mb-1">{note.subject}</h3>
										<p className="text-sm text-gray-400">{note.institute}</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30">
											{note.category}
										</span>
										{note.status === 'approved' && (
											<span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300 border border-green-500/30">Approved</span>
										)}
										{note.status === 'pending' && (
											<span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">Pending</span>
										)}
										{note.status === 'rejected' && (
											<span className="px-3 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-300 border border-red-500/30">Rejected</span>
										)}
									</div>
								</div>
								
								{/* Description */}
								{note.description && (
									<p className="text-sm text-gray-300 mb-3">{note.description}</p>
								)}
								
								{/* Status notice */}
								{note.status === 'pending' && (
									<div className="mb-3 text-xs text-yellow-300 bg-yellow-600/10 border border-yellow-600/30 rounded px-3 py-2">
										Your note is in the waiting list. It will be visible after admin approval.
									</div>
								)}
								{note.status === 'rejected' && (
									<div className="mb-3 text-xs text-red-300 bg-red-600/10 border border-red-600/30 rounded px-3 py-2">
										Your note was rejected by admin.
									</div>
								)}
								
								{/* Tags and metadata */}
								<div className="flex flex-wrap gap-2 mb-4">
									{note.departments && note.departments.length > 0 && (
										<>
											{note.departments.map((dept: string) => (
												<span key={dept} className="px-2 py-1 rounded-full text-xs bg-gray-600/30 text-gray-300">
													{dept}
												</span>
											))}
										</>
									)}
									{note.semester && (
										<span className="px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-300 border border-green-500/30">
											Semester {note.semester}
										</span>
									)}
									{note.year && (
										<span className="px-2 py-1 rounded-full text-xs bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">
											Year {note.year}
										</span>
									)}
								</div>
								
								{/* File info */}
								<div className="flex items-center justify-between text-xs text-gray-400 mb-3">
									<span>{formatFileSize(note.fileSize || 0)}</span>
									<span>{formatDate(note.createdAt)}</span>
								</div>
								
								{/* Action buttons */}
								<div className="flex gap-2">
									<a 
										href={note.fileUrl || `http://localhost:5000/uploads/${note.fileName}`} 
										target="_blank" 
										rel="noreferrer" 
										className={`flex-1 px-3 py-2 rounded text-sm text-center transition-colors flex items-center justify-center gap-1 ${note.status === 'approved' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600/40 cursor-not-allowed'}`}
										onClick={(e) => {
											if (note.status !== 'approved') {
												e.preventDefault();
												return;
											}
											// Ensure we have a valid URL
											const url = note.fileUrl || `http://localhost:5000/uploads/${note.fileName}`;
											if (!url.startsWith('http')) {
												e.preventDefault();
												window.open(`http://localhost:5000${url}`, '_blank');
											}
										}}
									>
										📄 View
									</a>
									<button 
										onClick={() => remove(note._id)} 
										className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-sm transition-colors flex items-center justify-center gap-1"
									>
										🗑️ Delete
									</button>
								</div>
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	);
}
