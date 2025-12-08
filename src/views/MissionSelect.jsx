import React from 'react';
import { ChevronRight, AlertTriangle, Mountain, Zap } from 'lucide-react';
import { MISSIONS } from '../config/gameData';

export default function MissionSelect({ troops, selectedTroops, setSelectedTroops, setView, startMission }) {
    // allow selection up to 4 here (missions support up to 4)
    const MAX_SELECT = 4;

    const toggleSelect = (t) => {
        const isSelected = selectedTroops.includes(t.uid);
        if (isSelected) {
            setSelectedTroops(p => p.filter(id => id !== t.uid));
        } else {
            setSelectedTroops(p => (p.length < MAX_SELECT ? [...p, t.uid] : p));
        }
    };

    const missions = Object.entries(MISSIONS).map(([key, m]) => ({ key, ...m }));

    const missionsForSize = (size) => missions.filter(m => (m.minParty || 1) <= size && (m.maxParty || 1) >= size);

    const renderMissionCard = (m) => {
        const canStart = selectedTroops.length >= (m.minParty || 1) && selectedTroops.length <= (m.maxParty || 4);
        const btnLabel = canStart ? 'Go' : `Requires ${m.minParty} slot${m.minParty > 1 ? 's' : ''}`;
        const note = m.noXp ? 'No XP' : `Lvl ${m.level} • ${m.desc}`;
        return (
            <div key={m.key} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                    <div className="font-bold flex items-center gap-2">
                        {m.key === 'forest' && <AlertTriangle size={16} />}
                        {m.key === 'mines' && <Mountain size={16} />}
                        {m.key === 'training_dummy' && <Zap size={16} />}
                        <span className="text-slate-200">{m.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{note}</div>
                    <div className="text-[11px] text-slate-500 mt-2">Party: {m.minParty}-{m.maxParty} • Spawns: {m.spawnMin || 1}{m.spawnMax ? `–${m.spawnMax}` : ''}</div>
                    {m.drops && m.drops.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-1">Possible drops: {m.drops.map(d => d.name).join(', ')}</div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button
                        disabled={!canStart}
                        onClick={() => startMission(m.key)}
                        className={`px-4 py-2 rounded font-bold text-sm ${canStart ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}
                    >
                        {btnLabel}
                    </button>
                    {!canStart && <div className="text-[11px] text-slate-500">Selected: {selectedTroops.length}</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setView('barracks'); setSelectedTroops([]); }} className="text-slate-400 hover:text-white">
                    <ChevronRight className="rotate-180" />
                </button>
                <h2 className="text-xl font-bold">Deploy</h2>
                <div className="ml-auto text-xs text-slate-400">Select up to {MAX_SELECT} units</div>
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
                            onClick={() => toggleSelect(t)}
                            className={`p-3 rounded-lg border flex justify-between items-center ${isSelected ? 'bg-amber-900/40 border-amber-600' : 'bg-slate-800 border-slate-700'} ${busy ? 'opacity-50' : ''}`}
                        >
                            <div className="text-left">
                                <div className="font-bold">{t.name}</div>
                                <div className="text-xs text-slate-500">{busy ? 'Busy' : `${t.race} ${t.class}`}</div>
                            </div>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </button>
                    );
                })}
            </div>

            {/* Mission Groups */}
            <div className="space-y-3">
                {/* Solo (1) */}
                <div>
                    <div className="text-sm font-semibold mb-2">Solo (1)</div>
                    <div className="grid gap-2">
                        {missionsForSize(1).map(renderMissionCard)}
                    </div>
                </div>

                {/* Duo (2) */}
                <div>
                    <div className="text-sm font-semibold mb-2">Two Characters (2)</div>
                    <div className="grid gap-2">
                        {missionsForSize(2).map(renderMissionCard)}
                    </div>
                </div>

                {/* Trio (3) */}
                <div>
                    <div className="text-sm font-semibold mb-2">Three Characters (3)</div>
                    <div className="grid gap-2">
                        {missionsForSize(3).map(renderMissionCard)}
                    </div>
                </div>

                {/* Four (4) */}
                <div>
                    <div className="text-sm font-semibold mb-2">Four Characters (4)</div>
                    <div className="grid gap-2">
                        {missionsForSize(4).map(renderMissionCard)}
                    </div>
                </div>
            </div>
        </div>
    );
}
