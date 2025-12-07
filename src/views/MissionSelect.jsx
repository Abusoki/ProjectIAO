import React from 'react';
import { ChevronRight, AlertTriangle, Mountain } from 'lucide-react';

export default function MissionSelect({ troops, selectedTroops, setSelectedTroops, setView, startMission }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setView('barracks'); setSelectedTroops([]); }} className="text-slate-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
                <h2 className="text-xl font-bold">Deploy</h2>
            </div>

            {/* Squad Select */}
            <div className="grid gap-2 mb-6">
                {troops.map(t => {
                    const isSelected = selectedTroops.includes(t.uid);
                    const busy = t.activity === 'cooking' || t.activity === 'smithing' || t.inCombat;
                    return (
                        <button 
                            key={t.uid} 
                            disabled={busy}
                            // Cap selection at 3 troops
                            onClick={() => setSelectedTroops(p => isSelected ? p.filter(id => id !== t.uid) : p.length < 3 ? [...p, t.uid] : p)}
                            className={`p-3 rounded-lg border flex justify-between items-center ${isSelected ? 'bg-amber-900/40 border-amber-600' : 'bg-slate-800 border-slate-700'} ${busy ? 'opacity-50' : ''}`}
                        >
                            <div className="text-left"><div className="font-bold">{t.name}</div><div className="text-xs text-slate-500">{busy ? 'Busy' : `${t.race} ${t.class}`}</div></div>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"/>}
                        </button>
                    )
                })}
            </div>

            <div className="space-y-3">
                {/* Forest */}
                <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <div className="font-bold text-green-400 flex items-center gap-2"><AlertTriangle size={16}/> Bloblin Forest</div>
                        <div className="text-xs text-slate-400">Lvl 1 • Easy • Drops Paste</div>
                    </div>
                    <button disabled={selectedTroops.length === 0} onClick={() => startMission('forest')} className="bg-slate-700 hover:bg-green-800 px-4 py-2 rounded font-bold text-sm disabled:opacity-50">Go</button>
                </div>

                {/* Mines */}
                <div className="bg-stone-800/50 border border-stone-600 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <div className="font-bold text-stone-300 flex items-center gap-2"><Mountain size={16}/> Iron Mines</div>
                        <div className="text-xs text-slate-400">Lvl 3 • Hard • Drops Ore</div>
                    </div>
                    <button disabled={selectedTroops.length === 0} onClick={() => startMission('mines')} className="bg-slate-700 hover:bg-stone-600 px-4 py-2 rounded font-bold text-sm disabled:opacity-50">Go</button>
                </div>
            </div>
        </div>
    );
}
