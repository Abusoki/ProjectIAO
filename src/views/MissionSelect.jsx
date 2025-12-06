import React from 'react';
import { ChevronRight } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function MissionSelect({ troops, selectedTroops, setSelectedTroops, setView, user, appId, setEnemies, setGameState, setCombatLog, setAutoBattle }) {
    
    const startMission = async () => {
        const validSelectedIds = selectedTroops.filter(id => troops.find(t => t.uid === id));
        if (validSelectedIds.length === 0) { 
            setAutoBattle(false); 
            return; 
        }
        
        // 1. Mark troops
        const updates = validSelectedIds.map(uid => 
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', uid), { 
                inCombat: true, actionGauge: 0, battleKills: 0, combatHitCount: 0, combatAttackCount: 0
            })
        );
        await Promise.all(updates);

        // 2. Create Combat
        const enemyCount = Math.floor(Math.random() * 4) + 1;
        const newEnemies = Array.from({ length: enemyCount }, (_, i) => ({
            id: `blob_${i}`, name: `Bloblin ${i+1}`, maxHp: 40, currentHp: 40, ap: 8, def: 0, spd: 8, actionGauge: Math.random() * 50
        }));
        
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), {
            active: true, enemies: newEnemies, troopIds: validSelectedIds, log: ["Combat Started!"], tick: 0
        });

        setEnemies(newEnemies);
        setGameState('fighting');
        setCombatLog(["Combat Started!"]);
        setView('combat');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setView('barracks'); setSelectedTroops([]); }} className="text-slate-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
                <h2 className="text-xl font-bold">Deploy</h2>
            </div>
            <div className="grid gap-2">
                {troops.map(t => {
                    const isSelected = selectedTroops.includes(t.uid);
                    const busy = t.activity === 'cooking' || t.inCombat;
                    return (
                        <button 
                            key={t.uid} 
                            disabled={busy}
                            onClick={() => setSelectedTroops(p => isSelected ? p.filter(id => id !== t.uid) : p.length < 2 ? [...p, t.uid] : p)}
                            className={`p-3 rounded-lg border flex justify-between items-center ${isSelected ? 'bg-amber-900/40 border-amber-600' : 'bg-slate-800 border-slate-700'} ${busy ? 'opacity-50' : ''}`}
                        >
                            <div className="text-left"><div className="font-bold">{t.name}</div><div className="text-xs text-slate-500">{busy ? 'Busy' : `${t.race} ${t.class}`}</div></div>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"/>}
                        </button>
                    )
                })}
            </div>
            <button disabled={selectedTroops.length === 0} onClick={startMission} className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-lg mt-6 shadow-lg">START OPERATION</button>
        </div>
    );
}
