import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls, Box, Text } from '@react-three/drei';

function Stars() {
	const positions = useMemo(() => {
		const count = 1500;
		const arr = new Float32Array(count * 3);
		for (let i = 0; i < count * 3; i++) {
			arr[i] = (Math.random() - 0.5) * 20;
		}
		return arr;
	}, []);
	return (
		<Points positions={positions} stride={3} frustumCulled>
			<PointMaterial transparent color="#93c5fd" size={0.03} sizeAttenuation depthWrite={false} />
		</Points>
	);
}

function Books() {
	const groupRef = useRef();
	
	useFrame((state) => {
		if (groupRef.current) {
			groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
		}
	});

	return (
		<group ref={groupRef} position={[-3, -1, -2]}>
			{/* Bottom book - dark blue */}
			<Box args={[0.8, 0.1, 1.2]} position={[0, 0, 0]}>
				<meshStandardMaterial color="#1e3a8a" />
			</Box>
			{/* Middle book - red */}
			<Box args={[0.8, 0.1, 1.2]} position={[0, 0.12, 0]}>
				<meshStandardMaterial color="#dc2626" />
			</Box>
			{/* Top book - light blue */}
			<Box args={[0.8, 0.1, 1.2]} position={[0, 0.24, 0]}>
				<meshStandardMaterial color="#3b82f6" />
			</Box>
		</group>
	);
}

function FloatingDocument() {
	const groupRef = useRef();
	
	useFrame((state) => {
		if (groupRef.current) {
			groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
			groupRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.2;
		}
	});

	return (
		<group ref={groupRef} position={[2, 1, -1]}>
			<Box args={[0.6, 0.8, 0.05]} position={[0, 0, 0]}>
				<meshStandardMaterial 
					color="#3b82f6" 
					transparent 
					opacity={0.7}
					emissive="#1e40af"
					emissiveIntensity={0.3}
				/>
			</Box>
			{/* Document lines */}
			<Box args={[0.4, 0.02, 0.01]} position={[0, 0.1, 0.03]}>
				<meshStandardMaterial color="#ffffff" />
			</Box>
			<Box args={[0.4, 0.02, 0.01]} position={[0, 0, 0.03]}>
				<meshStandardMaterial color="#ffffff" />
			</Box>
			<Box args={[0.4, 0.02, 0.01]} position={[0, -0.1, 0.03]}>
				<meshStandardMaterial color="#ffffff" />
			</Box>
		</group>
	);
}

export default function Background3D() {
	const imagePath = process.env.PUBLIC_URL + '/auth-background.png';
	
	return (
		<div className="fixed inset-0 -z-10">
			{/* Same background image as login/signup pages */}
			<div 
				className="absolute inset-0 w-full h-full"
				style={{
					backgroundImage: `url(${imagePath})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
					opacity: 0.3
				}}
			>
				{/* Same overlay as login/signup pages */}
				<div className="absolute inset-0 bg-black/20"></div>
			</div>
			<Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
				<ambientLight intensity={0.4} />
				<pointLight position={[10, 10, 10]} intensity={0.5} />
				<Suspense fallback={null}>
					<Stars />
					<Books />
					<FloatingDocument />
				</Suspense>
				<OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.3} />
			</Canvas>
		</div>
	);
}
