import React, { useState } from 'react';
import { ChevronRight, AlertTriangle, Mountain, Zap } from 'lucide-react';
import { MISSIONS } from '../config/gameData';

export default function MissionSelect({ troops, selectedTroops, setSelectedTroops, setView, startMission }) {
    const MAX_SELECT = 4;

    const [openCategory, setOpenCategory] = useState(1); // which category panel is open (1..4)

    const toggleSelect = (t) => {
        const isSelected = selectedTroops.includes(t.uid);
        if (isSelected) {
            setSelectedTroops(p => p.filter(id => id !== t.uid));
        } else {
            setSelectedTroops(p => (p.length < MAX_SELECT ? [...p, t.uid] : p));
        }
    };

    const missions = Object.entries(MISSIONS).map(([key, m]) => ({ key, ...m }));

    // CATEGORY RULE: missions are grouped by their "maxParty".
    // A mission with maxParty == N appears in the N-person category.
    const missionsForMax = (size) => missions.filter(m => (m.maxParty || 1) === size);

    // UI card for each mission
    const renderMissionCard = (m) => {
        // can start when at least one character selected and selected count <= mission max
        const canStart = selectedTroops.length > 0 && selectedTroops.length <= (m.maxParty || 1);
        const tooMany = selectedTroops.length > (m.maxParty || 1);
        const btnLabel = canStart ? 'Go' : (selectedTroops.length === 0 ? `Select up to ${m.maxParty}` : `Too many selected`);
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
                    <div className="text-[11px] text-slate-500 mt-2">Allowed: up to {m.maxParty} • Spawns: {m.spawnMin || 1}{m.spawnMax ? `–${m.spawnMax}` : ''}</div>
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
                    {!canStart && selectedTroops.length > 0 && (
                        <div className="text-[11px] text-slate-500">{tooMany ? `Reduce to ${m.maxParty}` : `Selected: ${selectedTroops.length}`}</div>
                    )}
                </div>
            </div>
        );
    };

    // small squad selector UI (allow up to MAX_SELECT)
    const SquadList = () => (
        <div className="grid grid-cols-4 gap-2 mb-6">
            {troops.map(t => {
                const isSelected = selectedTroops.includes(t.uid);
                const busy = t.activity === 'cooking' || t.activity === 'smithing' || t.inCombat;
                return (
                    <button
                        key={t.uid}
                        disabled={busy}
                        onClick={() => toggleSelect(t)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center gap-1 h-20 transition-all ${isSelected ? 'bg-amber-900/40 border-amber-600 ring-1 ring-amber-500 shadow-lg' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'} ${busy ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    >
                        <div className="font-bold text-xs truncate w-full px-1">{t.name}</div>
                        <div className="text-[10px] text-slate-500 truncate w-full px-1">{busy ? 'Busy' : `${t.race} ${t.class}`}</div>
                        {isSelected && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />}
                    </button>
                );
            })}
        </div>
    );

    // Category header component
    const CategoryHeader = ({ size }) => {
        const missionsCount = missionsForMax(size).length;
        const open = openCategory === size;
        return (
            <button
                onClick={() => setOpenCategory(open ? null : size)}
                className="w-full flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-700 hover:border-amber-500"
            >
                <div className="text-left">
                    <div className="font-semibold">{size === 1 ? 'Solo (1)' : `${size} Characters`}</div>
                    <div className="text-xs text-slate-400">Up to {size} characters — {missionsCount} mission{missionsCount !== 1 ? 's' : ''}</div>
                </div>
                <div className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</div>
            </button>
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

            <SquadList />

            <div className="space-y-3">
                {[1, 2, 3, 4].map(size => (
                    <div key={size} className="space-y-2">
                        <CategoryHeader size={size} />
                        {openCategory === size && (
                            <div className="grid grid-cols-2 gap-2">
                                {missionsForMax(size).length === 0 ? (
                                    <div className="text-sm text-slate-500 p-3 bg-slate-800 rounded border border-slate-700">No missions in this category.</div>
                                ) : (
                                    missionsForMax(size).map(renderMissionCard)
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
