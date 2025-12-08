import React, { useState, useEffect } from 'react';
import { ChevronRight, UserMinus, Heart, Sword, Shield, Zap, Utensils, Scroll, Skull, Hand, Shirt, Footprints } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { LEVEL_XP_CURVE, COOKING_XP_CURVE } from '../config/gameData';
import ProgressBar from '../components/ui/ProgressBar';

export default function CharacterSheet({ user, unit, inventory, setView, appId }) {
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        if (unit) setNameInput(unit.name || '');
    }, [unit]);

    if (!unit) return null;

    const stats = getEffectiveStats(unit);

    const dismissUnit = async () => {
        if (window.confirm("Are you sure? This unit will be gone forever.")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid));
            setView('barracks');
        }
    };

    const equipItem = async (item) => {
        let slot = 'mainHand';
        if (item.type === 'gloves') slot = 'gloves';
        if (item.type === 'cape') slot = 'cape';
        if (item.type === 'boots') slot = 'boots';
        
        let newInv = inventory.filter(i => i.id !== item.id);
        if (unit.equipment?.[slot]) newInv.push(unit.equipment[slot]);
        
        await Promise.all([
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { [`equipment.${slot}`]: item }),
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv })
        ]);
    };

    const unequipSlot = async (slot) => {
        if (!unit.equipment?.[slot]) return;
        let newInv = [...inventory, unit.equipment[slot]];
        await Promise.all([
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { [`equipment.${slot}`]: null }),
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv })
        ]);
    };

    const consumeItem = async (item) => {
        if (unit.currentHp >= stats.maxHp) return;
        const newHp = Math.min(stats.maxHp, unit.currentHp + item.value);
        const newInv = inventory.filter(i => i.id !== item.id);
        await Promise.all([
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { currentHp: newHp }),
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv })
        ]);
    };

    const saveName = async () => {
        const trimmed = (nameInput || '').trim();
        if (!trimmed) {
            alert('Name cannot be empty.');
            return;
        }
        if (!user) return;
        try {
            setSavingName(true);
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { name: trimmed });
            setEditingName(false);
        } catch (e) {
            console.error('Failed to save name', e);
            alert('Failed to save name. See console for details.');
        } finally {
            setSavingName(false);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header / Nav */}
            <div className="flex justify-between">
                <button onClick={() => setView('barracks')} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
                    <ChevronRight className="rotate-180 w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    {editingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                className="bg-slate-900 p-1 rounded border border-slate-700 text-sm"
                                maxLength={32}
                                placeholder="Unit name"
                            />
                            <button
                                onClick={saveName}
                                disabled={savingName}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm font-bold"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setEditingName(false); setNameInput(unit.name || ''); }}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setEditingName(true)} className="text-sm bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                                Rename
                            </button>
                            <button onClick={dismissUnit} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1">
                                <UserMinus size={12}/> Dismiss
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Stats Card */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-900/50 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">{unit.name}</h2>
                    <p className="text-slate-400 text-sm">{unit.race} {unit.class}</p>
                    
                    {/* XP Bars */}
                    <div className="space-y-2 mt-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-amber-500 font-bold">Combat Lvl {unit.level}</span>
                                <span className="text-slate-500">{unit.xp || 0} / {LEVEL_XP_CURVE[unit.level]} XP</span>
                            </div>
                            <ProgressBar current={unit.xp || 0} max={LEVEL_XP_CURVE[unit.level]} color="bg-amber-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-orange-400 font-bold flex items-center gap-1"><Utensils size={10}/> Cooking Lvl {unit.cooking?.level || 1}</span>
                                <span className="text-slate-500">{unit.cooking?.xp || 0} / {COOKING_XP_CURVE[unit.cooking?.level || 1]} XP</span>
                            </div>
                            <ProgressBar current={unit.cooking?.xp || 0} max={COOKING_XP_CURVE[unit.cooking?.level || 1]} color="bg-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-2 rounded border border-slate-700"><div className="text-xs text-slate-500 uppercase">Health</div><div className="font-bold text-red-400">{unit.currentHp}/{stats.maxHp}</div></div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-700"><div className="text-xs text-slate-500 uppercase">Attack</div><div className="font-bold text-orange-400">{stats.ap}</div></div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-700"><div className="text-xs text-slate-500 uppercase">Defense</div><div className="font-bold text-blue-400">{stats.def}</div></div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-700"><div className="text-xs text-slate-500 uppercase">Speed</div><div className="font-bold text-yellow-400">{stats.spd}</div></div>
                </div>
            </div>

            {/* Equipment */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Shirt size={16}/> Equipment</h3>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { slot: 'mainHand', icon: <Sword size={16}/> },
                        { slot: 'gloves', icon: <Hand size={16}/> },
                        { slot: 'cape', icon: <Shirt size={16}/> },
                        { slot: 'boots', icon: <Footprints size={16}/> }
                    ].map(({slot, icon}) => {
                        const item = unit.equipment?.[slot];
                        return (
                            <div key={slot} className="aspect-square bg-slate-900 border border-slate-600 rounded flex flex-col items-center justify-center relative group">
                                {item ? <div onClick={() => unequipSlot(slot)} className="cursor-pointer hover:opacity-75 text-amber-200 text-xs text-center p-1 leading-tight">{item.name}</div> : <div className="text-slate-600">{icon}</div>}
                            </div>
                        );
                    })}
                </div>
                
                {/* Inventory List */}
                <div className="mt-4">
                    <div className="text-xs text-slate-500 mb-2 uppercase">Inventory</div>
                    <div className="space-y-1">
                        {inventory.filter(i => ['weapon', 'gloves', 'cape', 'boots'].includes(i.type)).map((item, i) => (
                            <button key={i} onClick={() => equipItem(item)} className="w-full text-left bg-slate-900 hover:bg-slate-700 p-2 rounded flex justify-between items-center border border-slate-700">
                                <span className="text-sm">{item.name} <span className="text-xs text-slate-500 capitalize">({item.type})</span></span>
                                <span className="text-xs text-green-400">Equip</span>
                            </button>
                        ))}
                        {inventory.filter(i => ['weapon', 'gloves', 'cape', 'boots'].includes(i.type)).length === 0 && <div className="text-xs text-slate-600 italic">No equipment available.</div>}
                    </div>
                </div>
            </div>

            {/* Service Record */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Scroll size={16}/> Service Record</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900 p-2 rounded border border-slate-700">
                        <div className="text-lg font-bold text-white">{unit.lore?.missionsWon || 0}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Missions</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-700">
                        <div className="text-lg font-bold text-red-400">{unit.lore?.kills || 0}</div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1"><Skull size={10}/> Kills</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-700">
                        <div className="text-lg font-bold text-amber-500">{unit.lore?.closeCalls || 0}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Close Calls</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
