import React, { useState } from 'react';
import { Hammer, ChefHat, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SMITHING_RECIPES } from '../config/gameData';

export default function Jobs({ troops, inventory, user, appId }) {
    const [activeTab, setActiveTab] = useState('kitchen'); // 'kitchen' or 'smithing'

    // --- SHARED HELPERS ---
    const stopJob = async (unit) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { 
            activity: 'idle', cookingProgress: 0 
        });
    };

    // --- KITCHEN LOGIC ---
    const toggleCooking = async (unit) => {
        const newActivity = unit.activity === 'cooking' ? 'idle' : 'cooking';
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { activity: newActivity, cookingProgress: 0 });
    };

    // --- SMITHING LOGIC ---
    const startSmithing = async (unit, recipeId) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { 
            activity: 'smithing', 
            smithingTarget: recipeId,
            cookingProgress: 0 
        });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Tabs Header */}
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setActiveTab('kitchen')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-bold transition-all ${activeTab === 'kitchen' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <ChefHat size={18} /> Kitchen
                </button>
                <button 
                    onClick={() => setActiveTab('smithing')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-bold transition-all ${activeTab === 'smithing' ? 'bg-gray-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Hammer size={18} /> Anvil
                </button>
            </div>

            {/* KITCHEN CONTENT */}
            {activeTab === 'kitchen' && (
                <div className="space-y-4">
                     <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-600">
                                <img src="https://api.iconify.design/lucide:flask-conical.svg?color=%2310b981" className="w-6 h-6" alt="Paste" />
                            </div>
                            <div>
                                <div className="font-bold">Slime Paste</div>
                                <div className="text-xs text-slate-400">Owned: {inventory.filter(i => i.name === 'Slime Paste').length}</div>
                            </div>
                        </div>
                        <div className="text-2xl text-slate-600">➔</div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-600">
                                <img src="https://api.iconify.design/lucide:croissant.svg?color=%23f59e0b" className="w-6 h-6" alt="Bread" />
                            </div>
                            <div>
                                <div className="font-bold text-amber-500">Slime Bread</div>
                                <div className="text-xs text-slate-400">Heals 10 HP</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        {troops.map(t => {
                            const isCooking = t.activity === 'cooking';
                            const hasGloves = t.equipment?.gloves?.name === 'Slimey Gloves';
                            const failChance = Math.max(0, 50 - (((t.cooking?.level || 1) - 1) * 5) - (hasGloves ? 2 : 0));
                            
                            // Hide troops busy with OTHER jobs
                            if (t.activity !== 'idle' && t.activity !== 'cooking') return null;

                            return (
                                <div key={t.uid} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold">{t.name} <span className="text-xs text-slate-500">Lvl {t.cooking?.level || 1}</span></div>
                                        <div className="text-xs text-slate-400">{failChance}% Fail {hasGloves && <span className="text-green-400">(-2%)</span>}</div>
                                    </div>
                                    {isCooking ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 transition-all duration-1000" style={{width: `${t.cookingProgress}%`}}></div>
                                            </div>
                                            <button onClick={() => toggleCooking(t)} className="text-red-400 hover:text-red-300"><X size={20}/></button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => toggleCooking(t)} 
                                            disabled={inventory.filter(i => i.name === 'Slime Paste').length === 0}
                                            className="bg-slate-700 hover:bg-orange-700 disabled:opacity-30 disabled:hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold transition-colors"
                                        >
                                            Cook
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SMITHING CONTENT */}
            {activeTab === 'smithing' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {SMITHING_RECIPES.map(r => (
                            <div key={r.id} className="bg-slate-800 p-2 rounded border border-slate-600 opacity-90">
                                <div className="font-bold text-sm text-gray-200">{r.name}</div>
                                <div className="text-xs text-slate-400">{r.count}x {r.input}</div>
                                <div className="text-xs text-amber-600">Lvl {r.level} req</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-2">
                        {troops.map(t => {
                            const isSmithing = t.activity === 'smithing';
                            const smithLvl = t.smithing?.level || 1;

                            // Hide troops busy with OTHER jobs
                            if (t.activity !== 'idle' && t.activity !== 'smithing') return null;

                            return (
                                <div key={t.uid} className="bg-slate-900 p-3 rounded border border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm">{t.name} <span className="text-xs font-normal text-slate-500">Lvl {smithLvl}</span></span>
                                        {isSmithing && <button onClick={() => stopJob(t)}><X size={16} className="text-red-500"/></button>}
                                    </div>
                                    
                                    {isSmithing ? (
                                        <div>
                                            <div className="text-xs text-amber-500 mb-1">Forging...</div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-600 transition-all duration-1000" style={{width: `${t.cookingProgress}%`}}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                            {SMITHING_RECIPES.map(r => {
                                                const count = inventory.filter(i => i.name === r.input).length;
                                                const locked = smithLvl < r.level || count < r.count;
                                                return (
                                                    <button 
                                                        key={r.id} 
                                                        onClick={() => startSmithing(t, r.id)}
                                                        disabled={locked}
                                                        className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:border-slate-500 transition-colors"
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
            )}
        </div>
    );
}
