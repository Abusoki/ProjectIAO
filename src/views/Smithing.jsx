import React from 'react';
import { Hammer, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SMITHING_RECIPES } from '../config/gameData';

export default function Smithing({ troops, inventory, user, appId }) {
    
    const startSmithing = async (unit, recipeId) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { 
            activity: 'smithing', 
            smithingTarget: recipeId,
            cookingProgress: 0 
        });
    };

    const stopSmithing = async (unit) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { 
            activity: 'idle', cookingProgress: 0 
        });
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                <Hammer size={24} className="text-gray-400" /> The Anvil
            </h2>

            {/* Recipes List */}
            <div className="grid grid-cols-2 gap-2">
                {SMITHING_RECIPES.map(r => {
                    const haveMats = inventory.filter(i => i.name === r.input).length >= r.count;
                    return (
                        <div key={r.id} className="bg-slate-800 p-2 rounded border border-slate-600 opacity-90">
                            <div className="font-bold text-sm text-gray-200">{r.name}</div>
                            <div className="text-xs text-slate-400">{r.count}x {r.input}</div>
                            <div className="text-xs text-amber-600">Lvl {r.level} req</div>
                        </div>
                    );
                })}
            </div>

            <div className="text-xs text-center text-slate-500 uppercase tracking-widest mt-4 mb-2">Smiths</div>
            
            <div className="grid gap-2">
                {troops.map(t => {
                    const isSmithing = t.activity === 'smithing';
                    const smithLvl = t.smithing?.level || 1;

                    return (
                        <div key={t.uid} className="bg-slate-900 p-3 rounded border border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">{t.name} <span className="text-xs font-normal text-slate-500">Lvl {smithLvl}</span></span>
                                {isSmithing && <button onClick={() => stopSmithing(t)}><X size={16} className="text-red-500"/></button>}
                            </div>
                            
                            {isSmithing ? (
                                <div>
                                    <div className="text-xs text-amber-500 mb-1">Forging...</div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-600 transition-all duration-1000" style={{width: `${t.cookingProgress}%`}}></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2 overflow-x-auto">
                                    {SMITHING_RECIPES.map(r => {
                                        const count = inventory.filter(i => i.name === r.input).length;
                                        const locked = smithLvl < r.level || count < r.count;
                                        return (
                                            <button 
                                                key={r.id} 
                                                onClick={() => startSmithing(t, r.id)}
                                                disabled={locked}
                                                className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
                                            >
                                                {r.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}