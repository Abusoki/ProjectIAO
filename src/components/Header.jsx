import React, { useState } from 'react';
import { Shield, Backpack, LogOut, MoreVertical, Info, GitCommit } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Header({ playerLevel, gold, inventoryCount, setView, userCount }) {
    const [showMenu, setShowMenu] = useState(false);
    return (
        <header className="bg-slate-800 border-b border-slate-700 p-3 sticky top-0 z-20 flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2 text-amber-500">
                <Shield className="fill-current w-5 h-5" />
                <span className="font-bold tracking-wider">IRON & OIL</span>
                {userCount > 0 && <span className="ml-2 text-xs text-slate-500 font-mono">({userCount} active)</span>}
            </div>
            <div className="flex gap-4 items-center text-sm font-mono">
                <span className="text-slate-400 text-xs">Lvl {playerLevel}</span>
                <span className="text-yellow-400">🪙 {gold}</span>
                <span className="text-blue-300 flex items-center gap-1">
                    <Backpack size={14} /> {inventoryCount}
                </span>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-slate-500 hover:text-white ml-2 p-1"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded shadow-xl py-1 w-48 z-50">
                            <button
                                onClick={() => { setView('about'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2 text-slate-300"
                            >
                                <Info size={16} /> About
                            </button>
                            <button
                                onClick={() => { setView('changelog'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2 text-slate-300"
                            >
                                <GitCommit size={16} /> Change Log
                            </button>
                            <div className="border-t border-slate-700 my-1"></div>
                            <button
                                onClick={() => signOut(auth)}
                                className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2 text-red-400"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
