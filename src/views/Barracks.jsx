import React from 'react';
import { UserPlus, Heart, Sword, ChevronRight } from 'lucide-react';
import { getEffectiveStats } from '../utils/mechanics';

export default function Barracks({ troops, profile, maxTroops, setView, setSelectedUnitId }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-300">
                    {profile?.displayName || 'Player'}'s Roster ({troops.length}/{maxTroops})
                </h2>
                <button 
                    onClick={() => setView('tavern')} 
                    disabled={troops.length >= maxTroops}
                    className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"
                >
                    <UserPlus size={16} /> Recruit
                </button>
            </div>

            <div className="grid gap-3">
                {troops.map(t => {
                    const stats = getEffectiveStats(t);
                    return (
                        <div 
                            key={t.uid} 
                            onClick={() => { setSelectedUnitId(t.uid); setView('character_sheet'); }}
                            className={`bg-slate-800 p-3 rounded-lg border ${t.inCombat ? 'border-red-500/50' : 'border-slate-700'} hover:border-amber-500/50 cursor-pointer transition-all flex justify-between items-center`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold bg-slate-700 px-1.5 rounded text-slate-300">{t.race} {t.class}</span>
                                    <span className="text-xs text-amber-500 font-mono">Lvl {t.level}</span>
                                    {t.inCombat && <span className="text-xs bg-red-900 text-red-200 px-1.5 rounded animate-pulse">Fighting</span>}
                                </div>
                                <h3 className="font-bold">{t.name}</h3>
                                <div className="flex gap-3 text-xs text-slate-400 mt-1">
                                    <span className="flex items-center gap-1"><Heart size={10} className="text-red-400"/> {t.currentHp}/{stats.maxHp}</span>
                                    <span className="flex items-center gap-1"><Sword size={10} className="text-yellow-500"/> {stats.ap}</span>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-600" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
