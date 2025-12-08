import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SKILLS } from '../config/gameData';

export default function Skills({ troops, user, appId }) {
    const [savingFor, setSavingFor] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    const selectedUnit = troops.find(t => t.uid === selectedUnitId) || null;

    const canChooseRaceSkill = (unit) => {
        if (!unit) return false;
        const raceOptions = SKILLS?.[unit.race]?.row1;
        if (!raceOptions || raceOptions.length === 0) return false;
        if ((unit.level || 0) < 3) return false;
        return true;
    };

    const applySkill = async (unit, skillId) => {
        if (!user) return;
        if (!canChooseRaceSkill(unit)) {
            alert('Unit is not eligible for this race skill.');
            return;
        }

        if (!window.confirm(`Teach ${unit.name} "${skillId}"?`)) return;

        try {
            setSavingFor(unit.uid);
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), {
                'skills.row1': skillId
            });
        } catch (e) {
            console.error('Skill assign error', e);
            alert('Failed to assign skill. Check console for details.');
        } finally {
            setSavingFor(null);
        }
    };

    const clearSkill = async (unit) => {
        if (!user) return;
        if (!window.confirm(`Remove skill from ${unit.name}?`)) return;
        try {
            setSavingFor(unit.uid);
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), {
                'skills.row1': null
            });
        } catch (e) {
            console.error('Skill clear error', e);
            alert('Failed to remove skill. Check console for details.');
        } finally {
            setSavingFor(null);
        }
    };

    const buildRacePlaceholders = (unit) => {
        return [
            { id: 'race_placeholder_1', name: 'Ancestral Echo', desc: 'Placeholder: passive node' },
            { id: 'race_placeholder_2', name: 'Heritage Strike', desc: 'Placeholder: active node' },
            { id: 'race_placeholder_3', name: 'Sylvan Guard', desc: 'Placeholder: defensive node' },
            { id: 'race_placeholder_4', name: 'Wildstep', desc: 'Placeholder: mobility node' },
            { id: 'race_placeholder_5', name: "Forest's Favor", desc: 'Placeholder: utility node' }
        ];
    };

    const buildClassTree = (unit) => {
        const cls = unit?.class || 'Class';
        return [
            { id: `${cls.toLowerCase()}_node_1`, name: `${cls} Talent 1`, desc: 'Placeholder class skill' },
            { id: `${cls.toLowerCase()}_node_2`, name: `${cls} Talent 2`, desc: 'Placeholder class skill' },
            { id: `${cls.toLowerCase()}_node_3`, name: `${cls} Talent 3`, desc: 'Placeholder class skill' },
            { id: `${cls.toLowerCase()}_node_4`, name: `${cls} Signature`, desc: 'Placeholder signature skill' },
            { id: `${cls.toLowerCase()}_node_5`, name: `${cls} Finale`, desc: 'Placeholder ultimate' }
        ];
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-200">Skills</h2>
                <div className="text-xs text-slate-400">Select a character to view trees — Race (left) and Class (right)</div>
            </div>

            {!selectedUnit ? (
                <div className="grid gap-2">
                    {troops.map(unit => (
                        <button
                            key={unit.uid}
                            onClick={() => setSelectedUnitId(unit.uid)}
                            className="w-full bg-slate-800 p-3 rounded border border-slate-700 text-left hover:border-amber-500 transition-all"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-bold">{unit.name} <span className="text-xs text-slate-500">Lvl {unit.level}</span></div>
                                    <div className="text-xs text-slate-400">{unit.race} {unit.class}</div>
                                </div>
                                <div className="text-xs text-slate-400">
                                    {unit.skills?.row1 ? `Race: ${unit.skills.row1}` : 'No race selection'}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedUnitId(null)} className="text-slate-400 hover:text-white flex items-center gap-1">
                            <ChevronLeft size={14} /> Back
                        </button>
                        <div>
                            <div className="font-bold text-lg">{selectedUnit.name} <span className="text-xs text-slate-500">Lvl {selectedUnit.level}</span></div>
                            <div className="text-xs text-slate-400">{selectedUnit.race} {selectedUnit.class}</div>
                        </div>
                        <div className="ml-auto text-xs text-slate-400">
                            {selectedUnit.skills?.row1 ? <span className="text-amber-400">Race skill: {selectedUnit.skills.row1}</span> : <span>No race selection</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Race Tree */}
                        <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="font-bold">Race Tree</div>
                                <div className="text-xs text-slate-400">{selectedUnit.race}</div>
                            </div>

                            <div className="mb-3">
                                {/* First row: the two mutually-exclusive choices (if present) */}
                                <div className="flex gap-2">
                                    {(SKILLS?.[selectedUnit.race]?.row1 || []).slice(0, 2).map(option => {
                                        const current = selectedUnit.skills?.row1 || null;
                                        const eligible = canChooseRaceSkill(selectedUnit);
                                        const isActive = current === option.id;
                                        const disabledOtherSelected = current && current !== option.id;
                                        return (
                                            <div key={option.id} className="flex-1 bg-slate-900 p-3 rounded border border-slate-700 flex flex-col justify-between">
                                                <div>
                                                    <div className="font-semibold">{option.name}</div>
                                                    <div className="text-[11px] text-slate-400 mt-1">{option.desc}</div>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        onClick={() => applySkill(selectedUnit, option.id)}
                                                        disabled={savingFor === selectedUnit.uid || !eligible || isActive || disabledOtherSelected}
                                                        className={`flex-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isActive ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                                    >
                                                        {isActive ? 'Selected' : disabledOtherSelected ? 'Locked' : 'Teach'}
                                                    </button>
                                                    {isActive && (
                                                        <button
                                                            onClick={() => clearSkill(selectedUnit)}
                                                            disabled={savingFor === selectedUnit.uid}
                                                            className="px-2 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* If no options present, show two generic locked placeholders */}
                                    {(!SKILLS?.[selectedUnit.race]?.row1 || SKILLS[selectedUnit.race].row1.length === 0) && (
                                        <>
                                            <div className="flex-1 bg-slate-900 p-3 rounded border border-slate-700 flex flex-col justify-between">
                                                <div>
                                                    <div className="font-semibold">Trait A</div>
                                                    <div className="text-[11px] text-slate-400 mt-1">Placeholder</div>
                                                </div>
                                                <div className="mt-3">
                                                    <button className="w-full px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 cursor-not-allowed">Locked</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-slate-900 p-3 rounded border border-slate-700 flex flex-col justify-between">
                                                <div>
                                                    <div className="font-semibold">Trait B</div>
                                                    <div className="text-[11px] text-slate-400 mt-1">Placeholder</div>
                                                </div>
                                                <div className="mt-3">
                                                    <button className="w-full px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 cursor-not-allowed">Locked</button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Remaining placeholder nodes */}
                            <div className="grid gap-2">
                                {buildRacePlaceholders(selectedUnit).map(node => (
                                    <div key={node.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                                        <div>
                                            <div className="font-semibold text-sm">{node.name}</div>
                                            <div className="text-[11px] text-slate-400">{node.desc}</div>
                                        </div>
                                        <div>
                                            <button className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 cursor-not-allowed" title="Placeholder">Locked</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Class Tree */}
                        <div className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="font-bold">Class Tree</div>
                                <div className="text-xs text-slate-400">{selectedUnit.class}</div>
                            </div>

                            <div className="grid gap-2">
                                {buildClassTree(selectedUnit).map(node => (
                                    <div key={node.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                                        <div>
                                            <div className="font-semibold text-sm">{node.name}</div>
                                            <div className="text-[11px] text-slate-400">{node.desc}</div>
                                        </div>
                                        <div>
                                            <button className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 cursor-not-allowed" title="Placeholder">Locked</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
