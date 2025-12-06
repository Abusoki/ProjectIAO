import React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { X } from 'lucide-react';

export default function Kitchen({ troops, inventory, user, appId }) {
    const toggleCooking = async (unit) => {
        const newActivity = unit.activity === 'cooking' ? 'idle' : 'cooking';
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { activity: newActivity, cookingProgress: 0 });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4"><h2 className="text-xl font-bold">The Kitchen</h2></div>
            <div className="grid gap-2">
                {troops.map(t => {
                    const isCooking = t.activity === 'cooking';
                    const hasGloves = t.equipment?.gloves?.name === 'Slimey Gloves';
                    const failChance = Math.max(0, 50 - (((t.cooking?.level || 1) - 1) * 5) - (hasGloves ? 2 : 0));
                    return (
                        <div key={t.uid} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
                            <div>
                                <div className="font-bold">{t.name} <span className="text-xs text-slate-500">Lvl {t.cooking?.level || 1}</span></div>
                                <div className="text-xs text-slate-400">{failChance}% Fail {hasGloves && <span className="text-green-400">(Gloves -2%)</span>}</div>
                            </div>
                            {isCooking ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${t.cookingProgress}%`}}></div>
                                    </div>
                                    <button onClick={() => toggleCooking(t)} className="text-red-400 hover:text-red-300"><X size={20}/></button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => toggleCooking(t)} 
                                    disabled={inventory.filter(i => i.name === 'Slime Paste').length === 0}
                                    className="bg-slate-700 hover:bg-amber-700 disabled:opacity-30 disabled:hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold"
                                >
                                    Cook
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
