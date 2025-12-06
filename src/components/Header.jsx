import React from 'react';
import { Shield, Backpack, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Header({ playerLevel, gold, inventoryCount }) {
    return (
        <header className="bg-slate-800 border-b border-slate-700 p-3 sticky top-0 z-20 flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2 text-amber-500">
                <Shield className="fill-current w-5 h-5" />
                <span className="font-bold tracking-wider">IRON & OIL</span>
            </div>
            <div className="flex gap-4 items-center text-sm font-mono">
                <span className="text-slate-400 text-xs">Lvl {playerLevel}</span>
                <span className="text-yellow-400">🪙 {gold}</span>
                <span className="text-blue-300 flex items-center gap-1">
                    <Backpack size={14}/> {inventoryCount}
                </span>
                <button 
                    onClick={() => signOut(auth)} 
                    className="text-slate-500 hover:text-red-400 ml-2" 
                    title="Log Out"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}
