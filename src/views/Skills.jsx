import React, { useState } from 'react';
import { Doc } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SKILLS } from '../config/gameData';

export default function Skills({ troops, user, appId }) {
    const [savingFor, setSavingFor] = useState(null);

    const elfSkills = SKILLS?.Elf?.row1 || [];

    const canChooseSkill = (unit) => {
        if (!unit) return false;
        if (unit.race !== 'Elf') return false;
        if ((unit.level || 0) < 3) return false;
        return true;
    };

    const applySkill = async (unit, skillId) => {
        if (!user) return;
        if (!canChooseSkill(unit)) {
            alert('Unit is not eligible for Elf skills.');
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

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-200">Skills</h2>
                <div className="text-xs text-slate-400">Elves unlock row1 at Level 3</div>
            </div>

            <div className="grid gap-3">
                {troops.map(unit => {
                    const eligible = canChooseSkill(unit);
                    const current = unit.skills?.row1 || null;

                    return (
                        <div key={unit.uid} className="bg-slate-800 p-3 rounded border border-slate-700">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <div className="font-bold">{unit.name} <span className="text-xs text-slate-500">Lvl {unit.level}</span></div>
                                    <div className="text-xs text-slate-400">{unit.race} {unit.class}</div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        {eligible ? 'Eligible for Elf row1 skills' : (unit.race !== 'Elf' ? 'Not an Elf' : 'Requires level 3')}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    {current ? (
                                        <div className="text-xs text-amber-400">Current: {current}</div>
                                    ) : (
                                        <div className="text-xs text-slate-400">No selection</div>
                                    )}
                                    <div className="flex gap-2">
                                        {eligible && elfSkills.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => applySkill(unit, s.id)}
                                                disabled={savingFor === unit.uid || current === s.id}
                                                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${current === s.id ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                                title={s.desc}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                        {current && (
                                            <button
                                                onClick={() => clearSkill(unit)}
                                                disabled={savingFor === unit.uid}
                                                className="px-2 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Skill descriptions */}
                            <div className="mt-3 text-xs text-slate-400">
                                {current ? (
                                    <div className="italic">Selected: {elfSkills.find(s => s.id === current)?.desc || current}</div>
                                ) : (
                                    <div className="grid gap-1">
                                        {elfSkills.map(s => (
                                            <div key={`desc-${s.id}`} className="text-[12px]">
                                                <span className="font-semibold">{s.name}:</span> <span className="text-slate-400">{s.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
