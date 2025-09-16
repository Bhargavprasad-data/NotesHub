import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Background3D from './components/Background3D.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import Browse from './pages/Browse.tsx';
import Upload from './pages/Upload.tsx';
import Profile from './pages/Profile.tsx';
import { Login, Register } from './pages/Auth.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import OAuthCallback from './pages/OAuthCallback.tsx';
import ViewNote from './pages/ViewNote.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import OfflineBanner from './components/OfflineBanner.tsx';

function Home() {
	const { user } = useAuth();
	const [stats, setStats] = useState<{ totalNotes: number; colleges: number; departments: number } | null>(null);
	const [loadingStats, setLoadingStats] = useState<boolean>(true);

	const formatNumber = (n: number) => {
		if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M+`;
		if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+`;
		return `${n}`;
	};

	useEffect(() => {
		(async () => {
			try {
				const apiBase = (window as any).REACT_APP_API_URL || 'http://localhost:5000';
				const res = await fetch(`${apiBase}/api/notes/stats`);
				if (res.ok) {
					const data = await res.json();
					setStats(data);
				}
			} catch (_) {}
			finally { setLoadingStats(false); }
		})();
	}, []);
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
			{/* Hero Section */}
			<div className="text-center space-y-6 max-w-4xl">
				<h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
					NotesHub
				</h1>
				<p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
					Your Digital Academic Library
				</p>
				<p className="text-center max-w-3xl text-gray-400 text-lg">
					Discover, share, and organize academic notes across School, Intermediate, and Engineering levels. 
					Connect with students and faculty to build a comprehensive knowledge base.
				</p>
			</div>

			{/* Features Section */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl my-8">
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-6 text-center hover:bg-glass-200 transition">
					<div className="text-3xl mb-3">📚</div>
					<h3 className="text-lg font-semibold mb-2">Smart Organization</h3>
					<p className="text-gray-400 text-sm">Dynamic department filtering based on actual uploaded content</p>
				</div>
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-6 text-center hover:bg-glass-200 transition">
					<div className="text-3xl mb-3">🔍</div>
					<h3 className="text-lg font-semibold mb-2">Advanced Search</h3>
					<p className="text-gray-400 text-sm">Find notes by subject, department, college, or keywords</p>
				</div>
				<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-6 text-center hover:bg-glass-200 transition">
					<div className="text-3xl mb-3">📤</div>
					<h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
					<p className="text-gray-400 text-sm">Share your notes with detailed categorization and tags</p>
				</div>
			</div>

			{user ? (
				<>
					{/* Quick Search */}
					<div className="w-full max-w-2xl space-y-4">
						<h2 className="text-2xl font-semibold text-center">Quick Search</h2>
						<div className="flex gap-2">
							<input 
								placeholder="Search subjects, descriptions, or tags..." 
								className="flex-1 p-4 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none" 
							/>
							<Link to="/browse" className="px-6 py-4 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium">
								Search
							</Link>
						</div>
					</div>

					{/* Category Cards */}
					<div className="w-full max-w-4xl">
						<h2 className="text-2xl font-semibold text-center mb-6">Browse by Category</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Link 
								to="/browse?category=school" 
								className="group rounded-xl p-8 bg-glass-100 backdrop-blur border border-white/10 hover:bg-glass-200 transition-all duration-300 hover:scale-105"
							>
								<div className="text-center space-y-4">
									<div className="text-4xl">🎒</div>
									<h3 className="text-xl font-semibold">School</h3>
									<p className="text-gray-400">Class 1-10 notes and study materials</p>
									<div className="text-blue-400 group-hover:text-blue-300">Browse School Notes →</div>
								</div>
							</Link>
							<Link 
								to="/browse?category=intermediate" 
								className="group rounded-xl p-8 bg-glass-100 backdrop-blur border border-white/10 hover:bg-glass-200 transition-all duration-300 hover:scale-105"
							>
								<div className="text-center space-y-4">
									<div className="text-4xl">🎓</div>
									<h3 className="text-xl font-semibold">Intermediate</h3>
									<p className="text-gray-400">MPC, BiPC, MEC stream materials</p>
									<div className="text-blue-400 group-hover:text-blue-300">Browse Intermediate Notes →</div>
								</div>
							</Link>
							<Link 
								to="/browse?category=engineering" 
								className="group rounded-xl p-8 bg-glass-100 backdrop-blur border border-white/10 hover:bg-glass-200 transition-all duration-300 hover:scale-105"
							>
								<div className="text-center space-y-4">
									<div className="text-4xl">⚙️</div>
									<h3 className="text-xl font-semibold">Engineering</h3>
									<p className="text-gray-400">CSE, ECE, ME, CE and more departments</p>
									<div className="text-blue-400 group-hover:text-blue-300">Browse Engineering Notes →</div>
								</div>
							</Link>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="flex gap-4 mt-8">
						<Link 
							to="/upload" 
							className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 font-medium transition"
						>
							📤 Upload Notes
						</Link>
						<Link 
							to="/profile" 
							className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-medium transition"
						>
							👤 My Profile
						</Link>
					</div>
				</>
			) : (
				<div className="text-center space-y-6">
					<div className="bg-glass-100 backdrop-blur rounded-xl border border-white/10 p-8 max-w-md">
						<h2 className="text-2xl font-semibold mb-4">Get Started</h2>
						<p className="text-gray-400 mb-6">
							Join our community of students and educators sharing knowledge
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link 
								to="/login" 
								className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition"
							>
								Login
							</Link>
							<Link 
								to="/register" 
								className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-500 font-medium transition"
							>
								Register
							</Link>
						</div>
					</div>
					
					{/* Stats */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-400">
								{loadingStats ? <span className="inline-block w-16 h-6 bg-white/10 animate-pulse rounded" /> : formatNumber(stats?.totalNotes || 0)}
							</div>
							<div className="text-gray-400 text-sm">Notes Available</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-400">
								{loadingStats ? <span className="inline-block w-12 h-6 bg-white/10 animate-pulse rounded" /> : formatNumber(stats?.colleges || 0)}
							</div>
							<div className="text-gray-400 text-sm">Colleges</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-400">
								{loadingStats ? <span className="inline-block w-12 h-6 bg-white/10 animate-pulse rounded" /> : formatNumber(stats?.departments || 0)}
							</div>
							<div className="text-gray-400 text-sm">Departments</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function Nav() {
	const { user, logout } = useAuth();
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-black/10 backdrop-blur-sm border-b border-white/5">
			{/* Left side - Logo and Navigation Links */}
			<div className="flex items-center gap-8">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
						<span className="text-white text-xl font-bold">📚</span>
					</div>
					<div className="text-white">
						<h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
							NotesHub
						</h1>
						<p className="text-xs text-gray-400 -mt-1">Academic Library</p>
					</div>
				</Link>
				
				{/* Navigation Links */}
				<div className="flex items-center gap-6 ml-8">
					<Link to="/" className="text-white hover:text-blue-400 transition-colors font-medium">Home</Link>
					<Link to="/browse" className="text-white hover:text-blue-400 transition-colors font-medium">Browse</Link>
					<Link to="/upload" className="text-white hover:text-blue-400 transition-colors font-medium">Upload</Link>
					<Link to="/profile" className="text-white hover:text-blue-400 transition-colors font-medium">Profile</Link>
				</div>
			</div>
			
			{/* Right side - Login/Register or User Info */}
			<div className="text-white">
				{user ? (
					<div className="flex items-center gap-4">
						<span className="text-sm text-gray-300">{user.name} ({user.role})</span>
						<button 
							onClick={logout} 
							className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 hover:text-red-200 transition-colors"
						>
							Logout
						</button>
						<a href="https://bhargavprasad-portfolio.vercel.app/" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 hover:border-white/40 p-0.5">
							<img src="/profile-avatar.png" alt="Profile" title="Profile" className="w-8 h-8 rounded-full object-cover" />
						</a>
					</div>
				) : (
					<div className="flex items-center gap-4">
						<Link to="/login" className="text-white hover:text-blue-400 transition-colors font-medium">
							Login
						</Link>
						<span className="text-gray-400">/</span>
						<Link to="/register" className="text-white hover:text-blue-400 transition-colors font-medium">
							Register
						</Link>
						<a href="https://bhargavprasad-portfolio.vercel.app/" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 hover:border-white/40 p-0.5">
							<img src="/profile-avatar.png" alt="Profile" title="Profile" className="w-8 h-8 rounded-full object-cover" />
						</a>
					</div>
				)}
			</div>
		</nav>
	);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, token } = useAuth();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Check if we have token in localStorage but user is not loaded yet
		const storedToken = localStorage.getItem('token');
		const storedUser = localStorage.getItem('user');
		
		if (storedToken && storedUser && !user) {
			// User data exists in localStorage, set it
			try {
				const parsedUser = JSON.parse(storedUser);
				// We need to trigger a re-render, but the AuthContext should handle this
				setIsLoading(false);
			} catch {
				setIsLoading(false);
			}
		} else {
			setIsLoading(false);
		}
	}, [user]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	return (user && token) ? <>{children}</> : <Navigate to="/login" replace />;
}

function AnimatedRoutes() {
	const location = useLocation();
	return (
		<AnimatePresence mode="wait">
			<motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
				<Routes location={location}>
					<Route path="/" element={<div className="pt-20"><Home /></div>} />
					<Route path="/browse" element={<div className="pt-20"><Browse /></div>} />
					<Route path="/upload" element={<ProtectedRoute><div className="pt-20"><Upload /></div></ProtectedRoute>} />
					<Route path="/profile" element={<ProtectedRoute><div className="pt-20"><Profile /></div></ProtectedRoute>} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route path="/oauth/callback" element={<OAuthCallback />} />
					<Route path="/view/:id" element={<div className="pt-20"><ViewNote /></div>} />
				</Routes>
			</motion.div>
		</AnimatePresence>
	);
}

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Background3D />
				<OfflineBanner />
				<Nav />
				<AnimatedRoutes />
			</BrowserRouter>
		</AuthProvider>
	);
}
