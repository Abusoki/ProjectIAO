import React from 'react';
import { ChevronRight, GitCommit } from 'lucide-react';

const CHANGES = [
    {
        version: "0.5.0",
        date: "2025-12-08",
        changes: [
            "Fixed Smithing XP bug: Mechanics now correctly award smithing XP.",
            "Added Smithing skill bar to Character Sheet.",
            "Added 'About' and 'Change Log' pages."
        ]
    },
    {
        version: "0.4.5",
        date: "2025-12-05",
        changes: [
            "Introduced Jobs system (Cooking).",
            "Added Inventory management.",
            "Balanced combat stats for Golems."
        ]
    },
    {
        version: "0.1.0",
        date: "2025-11-20",
        changes: [
            "Initial Alpha Release.",
            "Basic combat loop.",
            "Barracks and Recruitment."
        ]
    }
];

export default function ChangeLog({ setView }) {
    return (
        <div className="space-y-4 animate-fade-in p-4">
            <div className="flex justify-between items-start">
                <button onClick={() => setView('barracks')} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
                    <ChevronRight className="rotate-180 w-4 h-4" /> Back to Base
                </button>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <GitCommit className="text-emerald-500" /> Change Log
            </h2>

            <div className="space-y-4">
                {CHANGES.map((release, i) => (
                    <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-baseline mb-2 border-b border-slate-700 pb-2">
                            <span className="text-lg font-bold text-amber-500">v{release.version}</span>
                            <span className="text-xs text-slate-500">{release.date}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                            {release.changes.map((change, j) => (
                                <li key={j}>{change}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
