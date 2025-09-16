import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { API_BASE } from '../lib/api.ts';

export default function ViewNote() {
    const { id } = useParams();
    const { state } = useLocation() as { state?: any };
    const note = state?.note;
    // Prefer direct file URL to avoid frame/redirect issues; fall back to API view route
    // Use embed endpoint to avoid redirects inside iframes
    const baseSrc = `${API_BASE}/api/notes/${id}` + '/embed';
    const src = `${baseSrc}#toolbar=0`;
    return (
        <div className="p-4">
            <div className="max-w-7xl mx-auto bg-black/20 border border-white/10 rounded-lg overflow-hidden" style={{ height: '80vh' }}>
                <iframe title="note" src={src} className="w-full h-full" />
            </div>
            <div className="text-center text-xs text-gray-400 mt-2">View only. Downloads are available from the card (if eligible).</div>
        </div>
    );
}


