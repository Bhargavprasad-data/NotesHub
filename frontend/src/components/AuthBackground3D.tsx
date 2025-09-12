import React from 'react';

export default function AuthBackground3D() {
	const imagePath = process.env.PUBLIC_URL + '/auth-background.png';
	
	return (
		<div 
			className="fixed inset-0 w-full h-full -z-10"
			style={{
				backgroundImage: `url(${imagePath})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				opacity: 0.3
			}}
		>
			{/* Optional overlay for better text readability if needed */}
			<div className="absolute inset-0 bg-black/20"></div>
		</div>
	);
}
