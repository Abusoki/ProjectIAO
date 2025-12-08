import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SKILLS } from '../config/gameData';

export default function Skills({ troops, user, appId }) {
    const [savingFor, setSavingFor] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    const elfSkills = SKILLS?.Elf?.row1 || [];

    const selectedUnit = troops.find(t => t.uid === selectedUnitId) || null;

    const canChooseSkill = (unit) => {
        if (!unit) return false;
        if (unit.race !== 'Elf') return false;
        if ((unit.level || 0) < 3) return false;
        return true;
    };

    const applySkill = async (unit, skillId) => {
        if (!user) return;
        if (!canChooseSkill(unit)) {
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

    const buildRaceTree = (unit) => {
        const placeholders = [
            { id: 'race_placeholder_1', name: 'Ancestral Echo', desc: 'Placeholder: passive node' },
            { id: 'race_placeholder_2', name: 'Heritage Strike', desc: 'Placeholder: active node' },
            { id: 'race_placeholder_3', name: 'Sylvan Guard', desc: 'Placeholder: defensive node' },
            { id: 'race_placeholder_4', name: 'Wildstep', desc: 'Placeholder: mobility node' },
            { id: 'race_placeholder_5', name: 'Forest's Favor', desc: 'Placeholder: utility node' }
        ];

        if (unit?.race === 'Elf') {
            // put real elf choices first, then placeholders
            return [
                ...elfSkills,
                ...placeholders
            ];
        }

        // non-elf: show generic placeholders
        return [
            { id: `${unit?.race || 'Race'}_trait_a`, name: `${unit?.race || 'Race'} Trait A`, desc: 'Placeholder' },
            { id: `${unit?.race || 'Race'}_trait_b`, name: `${unit?.race || 'Race'} Trait B`, desc: 'Placeholder' },
            ...placeholders
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

                            <div className="grid gap-2">
                                {buildRaceTree(selectedUnit).map(node => {
                                    const isElfSkill = elfSkills.some(s => s.id === node.id);
                                    const eligible = isElfSkill ? canChooseSkill(selectedUnit) : false;
                                    const current = selectedUnit.skills?.row1 || null;
                                    const isActive = current === node.id;

                                    return (
                                        <div key={node.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-700">
                                            <div>
                                                <div className="font-semibold text-sm">{node.name}</div>
                                                <div className="text-[11px] text-slate-400">{node.desc}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isElfSkill ? (
                                                    <>
                                                        <button
                                                            onClick={() => applySkill(selectedUnit, node.id)}
                                                            disabled={savingFor === selectedUnit.uid || !eligible || isActive}
                                                            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${isActive ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                                        >
                                                            {isActive ? 'Selected' : 'Teach'}
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
                                                    </>
                                                ) : (
                                                    <button className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 cursor-not-allowed" title="Placeholder">Locked</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
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
