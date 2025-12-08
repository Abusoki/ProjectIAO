import React, { useState } from 'react';
import { Package, Trash2, ArrowUpDown, Sword, Shield, Apple, Gem, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';

export default function Inventory({ inventory, troops, user, appId }) {
    const [filter, setFilter] = useState('all'); // all, weapon, gear, food, resource
    const [sort, setSort] = useState('name'); // name, type

    // --- ACTIONS ---

    const discardItem = async (itemId) => {
        if (window.confirm("Throw this item away? You cannot get it back.")) {
            const newInv = inventory.filter(i => i.id !== itemId);
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv });
        }
    };

    const useFood = async (item) => {
        // 1. Find the most injured unit (lowest HP percentage)
        let target = null;
        let lowestPct = 1.0;

        troops.forEach(t => {
            const stats = getEffectiveStats(t, t.equipment ? Object.values(t.equipment) : []);
            const pct = t.currentHp / stats.maxHp;
            // Only target if hurt (< 100%) and is the most hurt so far
            if (pct < 1.0 && pct < lowestPct) {
                lowestPct = pct;
                target = t;
            }
        });

        // 2. If nobody needs healing
        if (!target) {
            // Fallback: If everyone is full, maybe heal the one with the lowest max HP just in case?
            // Or just alert.
            // Let's try to find ANYONE not full.
            target = troops.find(t => {
                 const stats = getEffectiveStats(t);
                 return t.currentHp < stats.maxHp;
            });
            
            if (!target) {
                alert("Your squad is already at full health!");
                return;
            }
        }

        // 3. Apply Healing
        const stats = getEffectiveStats(target, target.equipment ? Object.values(target.equipment) : []);
        const healAmount = item.value || 10;
        const newHp = Math.min(stats.maxHp, target.currentHp + healAmount);
        
        // 4. Remove Item
        const newInv = inventory.filter(i => i.id !== item.id);

        await Promise.all([
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', target.uid), { currentHp: newHp }),
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv })
        ]);
    };

    // --- FILTERS & SORTS ---

    const filteredItems = inventory.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'gear') return ['gloves', 'cape', 'boots'].includes(item.type);
        return item.type === filter;
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'type') return a.type.localeCompare(b.type);
        return 0;
    });

    const getTypeIcon = (type) => {
        if (type === 'weapon') return <Sword size={14} className="text-red-400"/>;
        if (['gloves', 'cape', 'boots'].includes(type)) return <Shield size={14} className="text-blue-400"/>;
        if (type === 'food') return <Apple size={14} className="text-green-400"/>;
        return <Gem size={14} className="text-amber-400"/>;
    };

    return (
        <div className="space-y-4 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <Package size={24} className="text-blue-400" /> Inventory
                </h2>
                <div className="text-xs text-slate-500 font-mono">{inventory.length} Items</div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${filter === 'all' ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>All</button>
                <button onClick={() => setFilter('weapon')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${filter === 'weapon' ? 'bg-red-900/50 text-red-200 border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Weapons</button>
                <button onClick={() => setFilter('gear')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${filter === 'gear' ? 'bg-blue-900/50 text-blue-200 border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Gear</button>
                <button onClick={() => setFilter('food')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${filter === 'food' ? 'bg-green-900/50 text-green-200 border-green-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Food</button>
                <button onClick={() => setFilter('resource')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${filter === 'resource' ? 'bg-amber-900/50 text-amber-200 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Resources</button>
            </div>

            <div className="flex justify-end gap-2 mb-2">
                 <button onClick={() => setSort(sort === 'name' ? 'type' : 'name')} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white">
                    <ArrowUpDown size={12} /> Sort: <span className="uppercase">{sort}</span>
                 </button>
            </div>

            {/* Item List */}
            {sortedItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                    Empty...
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sortedItems.map(item => (
                        <div key={item.id} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center border border-slate-600">
                                    {getTypeIcon(item.type)}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-200">{item.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.type}</div>
                                    
                                    {/* Stats Badge */}
                                    {item.stats && (
                                        <div className="text-[10px] text-amber-500 flex gap-2">
                                            {item.stats.ap > 0 && <span>+{item.stats.ap} AP</span>}
                                            {item.stats.def > 0 && <span>+{item.stats.def} DEF</span>}
                                            {item.stats.maxHp !== 0 && item.stats.maxHp && <span>{item.stats.maxHp > 0 ? '+' : ''}{item.stats.maxHp} HP</span>}
                                        </div>
                                    )}
                                    {item.desc && <div className="text-[10px] text-slate-500 italic">{item.desc}</div>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* Use Button (Food Only) */}
                                {item.type === 'food' && (
                                    <button 
                                        onClick={() => useFood(item)}
                                        className="p-2 bg-green-900/40 text-green-400 rounded hover:bg-green-800 transition-colors border border-green-800"
                                        title="Use"
                                    >
                                        <Zap size={16} />
                                    </button>
                                )}
                                
                                {/* Discard Button */}
                                <button 
                                    onClick={() => discardItem(item.id)}
                                    className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-50 group-hover:opacity-100"
                                    title="Discard Item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
