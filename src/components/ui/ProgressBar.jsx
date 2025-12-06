import React from 'react';

export default function ProgressBar({ current, max, color = "bg-amber-500", bg = "bg-slate-700" }) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    return (
        <div className={`w-full h-1.5 ${bg} rounded-full overflow-hidden`}>
            <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
        </div>
    );
}
