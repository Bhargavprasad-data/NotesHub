import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_BASE } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { motion } from 'framer-motion';
import AuthBackground3D from '../components/AuthBackground3D.tsx';

const card = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function isEmail(v: string) { return /.+@.+\..+/.test(v); }

export function Login() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [forgotPassword, setForgotPassword] = useState(false);
	const [resetEmail, setResetEmail] = useState('');
	const [resetMessage, setResetMessage] = useState<string | null>(null);
	const submit = async (e: React.FormEvent) => {
		e.preventDefault(); setError(null);
		if (!isEmail(email)) return setError('Enter a valid email');
		if (password.length < 6) return setError('Password must be at least 6 characters');
		try {
			const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
			login(res.token, res.user);
			navigate('/');
		} catch (err: any) { setError(err.message); }
	};

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!isEmail(resetEmail)) return setError('Enter a valid email');
		try {
			await apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email: resetEmail } });
			setResetMessage('Password reset link sent to your email!');
		} catch (err: any) { setError(err.message); }
	};
	if (forgotPassword) {
		return (
			<div className="min-h-screen relative">
				<AuthBackground3D />
				<div className="relative z-10 min-h-screen flex items-center justify-center p-8 pt-24">
					<div className="w-full max-w-md">
						<motion.form {...card} onSubmit={handleForgotPassword} className="p-8 bg-glass-100 backdrop-blur rounded-xl border border-white/10 space-y-6">
							<div className="text-center mb-8">
								<h2 className="text-3xl font-bold mb-2">Reset Password</h2>
								<p className="text-gray-400">Enter your email to receive a reset link</p>
							</div>
							
							{error && (
								<div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
									{error}
								</div>
							)}
							
							{resetMessage && (
								<div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
									{resetMessage}
								</div>
							)}
							
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
								<input 
									className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
									placeholder="Enter your email" 
									value={resetEmail} 
									onChange={e=>setResetEmail(e.target.value)} 
								/>
							</div>
							
							<button className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition-colors">
								Send Reset Link
							</button>
							<div className="text-center text-sm text-gray-400">We'll email you a link to reset your password.</div>
							
							<div className="text-center">
								<button 
									type="button"
									onClick={() => setForgotPassword(false)}
									className="text-blue-400 hover:text-blue-300 underline"
								>
									Back to Login
								</button>
							</div>
						</motion.form>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen relative">
			{/* Full Screen Background */}
			<AuthBackground3D />
			
			{/* Login Form - Centered */}
			<div className="relative z-10 min-h-screen flex items-center justify-center p-8 pt-24">
				<div className="w-full max-w-md">
					<motion.form {...card} onSubmit={submit} className="p-8 bg-glass-100 backdrop-blur rounded-xl border border-white/10 space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
							<p className="text-gray-400">Sign in to your NotesHub account</p>
						</div>
						
						{error && (
							<div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
								{error}
							</div>
						)}
						
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
								<input 
									className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
									placeholder="Enter your email" 
									value={email} 
									onChange={e=>setEmail(e.target.value)} 
								/>
							</div>
							
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
								<div className="relative">
									<input 
										className="w-full p-3 pr-12 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
										placeholder="Enter your password" 
										type={showPassword ? "text" : "password"} 
										value={password} 
										onChange={e=>setPassword(e.target.value)} 
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
									>
										{showPassword ? (
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
											</svg>
										) : (
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										)}
									</button>
								</div>
							</div>
						</div>
						
						<button className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition-colors">
							Sign In
						</button>
						<div className="flex items-center gap-3 my-2">
							<div className="flex-1 h-px bg-white/10" />
							<span className="text-gray-400 text-xs">or continue with</span>
							<div className="flex-1 h-px bg-white/10" />
						</div>
						<div className="grid grid-cols-3 gap-2">
							<a href={`${API_BASE}/api/auth/google`} className="p-2 rounded bg-white/10 hover:bg-white/15 text-center">Google</a>
							<a href={`${API_BASE}/api/auth/github`} className="p-2 rounded bg-white/10 hover:bg-white/15 text-center">GitHub</a>
							<a href={`${API_BASE}/api/auth/linkedin`} className="p-2 rounded bg-white/10 hover:bg-white/15 text-center">LinkedIn</a>
						</div>
						<div className="text-center">
							<button 
								type="button"
								onClick={() => setForgotPassword(true)}
								className="text-blue-400 hover:text-blue-300 underline text-sm mb-2 block"
							>
								Forgot Password?
							</button>
							<p className="text-gray-400 text-sm">
								Don't have an account?{' '}
								<a href="/register" className="text-blue-400 hover:text-blue-300 underline">
									Sign up here
								</a>
							</p>
						</div>
					</motion.form>
				</div>
			</div>
		</div>
	);
}

export function Register() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [role, setRole] = useState<'student'|'faculty'>('student');
	const [error, setError] = useState<string | null>(null);
	const submit = async (e: React.FormEvent) => {
		e.preventDefault(); setError(null);
		if (name.trim().length < 2) return setError('Name is too short');
		if (!isEmail(email)) return setError('Enter a valid email');
		if (phone.trim().length < 10) return setError('Enter a valid phone number');
		if (password.length < 6) return setError('Password must be at least 6 characters');
		try {
			const res = await apiFetch('/api/auth/register', { method: 'POST', body: { name, email, phone, password, role } });
			login(res.token, res.user);
			navigate('/');
		} catch (err: any) { setError(err.message); }
	};
	return (
		<div className="min-h-screen relative">
			{/* Full Screen Background */}
			<AuthBackground3D />
			
			{/* Register Form - Centered */}
			<div className="relative z-10 min-h-screen flex items-center justify-center p-8 pt-24">
				<div className="w-full max-w-md">
					<motion.form {...card} onSubmit={submit} className="p-8 bg-glass-100 backdrop-blur rounded-xl border border-white/10 space-y-6">
						<div className="text-center mb-8">
							<h2 className="text-3xl font-bold mb-2">Join NotesHub</h2>
							<p className="text-gray-400">Create your account to start sharing knowledge</p>
						</div>
						
						{error && (
							<div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
								{error}
							</div>
						)}
						
						<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
							<input 
								className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
								placeholder="Enter your full name" 
								value={name} 
								onChange={e=>setName(e.target.value)} 
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
							<input 
								className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
								placeholder="Enter your email" 
								value={email} 
								onChange={e=>setEmail(e.target.value)} 
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
							<input 
								className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
								placeholder="Enter your phone number" 
								value={phone} 
								onChange={e=>setPhone(e.target.value)} 
							/>
						</div>
						
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
							<div className="relative">
								<input 
									className="w-full p-3 pr-12 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
									placeholder="Create a password" 
									type={showPassword ? "text" : "password"} 
									value={password} 
									onChange={e=>setPassword(e.target.value)} 
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
								>
									{showPassword ? (
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
										</svg>
									) : (
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									)}
								</button>
							</div>
						</div>
							
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
								<select 
									className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
									value={role} 
									onChange={e=>setRole(e.target.value as any)}
								>
									<option value="student">Student</option>
									<option value="faculty">Faculty</option>
								</select>
							</div>
						</div>
						
						<button className="w-full p-3 rounded-lg bg-green-600 hover:bg-green-500 font-medium transition-colors">
							Create Account
						</button>
                        
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                Already have an account?{' '}
                                <a href="/login" className="text-blue-400 hover:text-blue-300 underline">
                                    Sign in here
                                </a>
                            </p>
                        </div>
					</motion.form>
				</div>
			</div>
		</div>
	);
}
