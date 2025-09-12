import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.ts';
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
	const [error, setError] = useState<string | null>(null);
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
								<input 
									className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
									placeholder="Enter your password" 
									type="password" 
									value={password} 
									onChange={e=>setPassword(e.target.value)} 
								/>
							</div>
						</div>
						
						<button className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium transition-colors">
							Sign In
						</button>
						
						<div className="text-center">
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
							<input 
								className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors" 
								placeholder="Create a password" 
								type="password" 
								value={password} 
								onChange={e=>setPassword(e.target.value)} 
							/>
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
