import React from 'react';
import { ChevronRight, Github } from 'lucide-react';

export default function About({ setView, appId }) {
    return (
        <div className="space-y-4 animate-fade-in p-4">
            <div className="flex justify-between items-start">
                <button onClick={() => setView('barracks')} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
                    <ChevronRight className="rotate-180 w-4 h-4" /> Back to Base
                </button>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center">
                <h1 className="text-3xl font-bold text-amber-500 mb-2">Iron & Oil</h1>
                <p className="text-slate-400 mb-6">v0.5.0 Alpha</p>

                <div className="text-left space-y-4 text-slate-300">
                    <p>
                        Iron & Oil is a mercenary management RPG where you command a squad of troops,
                        send them on missions, and craft powerful gear.
                    </p>
                    <p>
                        Built with React, TailwindCSS, and Firebase.
                    </p>
                </div>

                <div className="mt-8 border-t border-slate-700 pt-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Credits</h3>
                    <p className="text-sm">Developed by McQux & Antigravity</p>
                </div>
            </div>
        </div>
    );
}
