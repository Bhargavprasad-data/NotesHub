import React, { useEffect, useState } from 'react';

export default function OfflineBanner() {
    const [online, setOnline] = useState<boolean>(navigator.onLine);

    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        const id = setInterval(() => setOnline(navigator.onLine), 5000);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(id); };
    }, []);

    if (online) return null;
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="px-4 py-2 rounded-lg bg-yellow-900/60 border border-yellow-500/40 backdrop-blur text-yellow-200 flex items-center gap-2 shadow-lg">
                <span className="inline-block h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                <span>You are offline. Showing cached UI. Reconnecting…</span>
            </div>
        </div>
    );
}
