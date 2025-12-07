import React from 'react';
import { User, GraduationCap, ChefHat, Sword, Hammer, Package } from 'lucide-react';

export default function Navbar({ currentView, setView, gameState }) {
    const NavBtn = ({ view, icon: Icon, label, color }) => (
        <button 
            onClick={() => setView(view)} 
            className={`p-2 rounded flex flex-col items-center gap-1 text-xs ${currentView === view ? color : 'text-slate-500'}`}
        >
            <Icon size={20} /> {label}
        </button>
    );

    return (
        <nav className="fixed bottom-0 w-full bg-slate-800 border-t border-slate-700 flex justify-between px-2 py-2 pb-safe z-50 overflow-x-auto no-scrollbar">
            <NavBtn view="barracks" icon={User} label="Base" color="text-amber-500" />
            <NavBtn view="inventory" icon={Package} label="Bag" color="text-blue-400" />
            <NavBtn view="skills" icon={GraduationCap} label="Skills" color="text-purple-500" />
            <NavBtn view="kitchen" icon={ChefHat} label="Cook" color="text-orange-500" />
            <NavBtn view="smithing" icon={Hammer} label="Smith" color="text-gray-400" />
            <button 
                onClick={() => setView(gameState === 'fighting' ? 'combat' : 'mission_select')} 
                className={`p-2 rounded flex flex-col items-center gap-1 text-xs ${['mission_select', 'combat'].includes(currentView) ? 'text-red-500' : 'text-slate-500'}`}
            >
                <div className="relative">
                    <Sword size={20} />
                    {gameState === 'fighting' && <span className="animate-ping absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-400 opacity-75"></span>}
                </div>
                Battle
            </button>
        </nav>
    );
}
