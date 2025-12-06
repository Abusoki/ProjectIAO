import React from 'react';
import { Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SKILLS } from '../config/gameData';

export default function Skills({ troops, user, appId }) {
    const learnSkill = async (unit, skillId) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { "skills.row1": skillId });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2"><Sparkles size={20}/> Academy</h2>
            </div>
            <div className="grid gap-3">
                {troops.map(t => (
                    <div key={t.uid} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold">{t.name}</h3>
                                <div className="text-xs text-slate-400">{t.race} Lvl {t.level}</div>
                            </div>
                            {t.level < 3 && <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">Lvl 3 Required</span>}
                        </div>
                        
                        {t.race === 'Urblosh' ? (
                            t.level >= 3 ? (
                                t.skills?.row1 ? (
                                    <div className="bg-amber-900/20 border border-amber-600/50 p-2 rounded text-sm text-amber-200">
                                        <div className="font-bold">{SKILLS.Urblosh.row1.find(s => s.id === t.skills.row1)?.name}</div>
                                        <div className="text-xs opacity-75">{SKILLS.Urblosh.row1.find(s => s.id === t.skills.row1)?.desc}</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {SKILLS.Urblosh.row1.map(skill => (
                                            <button key={skill.id} onClick={() => learnSkill(t, skill.id)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded border border-slate-600 text-left hover:border-amber-500 transition-colors">
                                                <div className="font-bold text-xs text-amber-400 mb-1">{skill.name}</div>
                                                <div className="text-[10px] text-slate-400 leading-tight">{skill.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                )
                            ) : <div className="text-xs text-slate-500 italic">Train this unit to unlock their potential.</div>
                        ) : <div className="text-xs text-slate-500 italic">No advanced techniques available for {t.race}s yet.</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
