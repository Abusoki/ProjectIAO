import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { LEVEL_XP_CURVE } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useCombat(user, troops, enemies, gameState, setGameState, setEnemies, inventory) {
    const [combatLog, setCombatLog] = useState([]);
    const [damageEvents, setDamageEvents] = useState([]); 
    const processingResult = useRef(false);

    // Visual Juice Helper
    const addDamageEvent = (targetId, amount, type = 'damage') => {
        const id = Math.random();
        setDamageEvents(prev => [...prev, { id, targetId, amount, type }]);
        setTimeout(() => {
            setDamageEvents(prev => prev.filter(e => e.id !== id));
        }, 1000);
    };

    // COMBAT LOOP
    useEffect(() => {
        if (gameState !== 'fighting') {
            processingResult.current = false; // Reset lock when not fighting
            return;
        }
        
        const interval = setInterval(() => {
            if (processingResult.current) return;

            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            let logUpdates = [];
            let battleOver = false;
            let dirtyTroops = new Map();
            
            // Filter troops that are marked as inCombat in local state
            const fighters = troops.filter(t => t.inCombat);
            
            // Safety check
            if (fighters.length === 0 && enemies.length > 0) return;

            // 1. Tick Action Gauges
            [...fighters, ...enemies].forEach(u => {
                if (u.currentHp > 0) u.actionGauge = (u.actionGauge || 0) + (u.baseStats?.spd || u.spd || 8);
            });

            // 2. Determine Actors (Turn Order)
            const actors = [...fighters, ...enemies]
                .filter(u => u.currentHp > 0 && u.actionGauge >= 100)
                .sort((a, b) => b.actionGauge - a.actionGauge);
            
            actors.forEach(actor => {
                if (battleOver || actor.currentHp <= 0) return;
                actor.actionGauge -= 100;
                const isPlayer = !!actor.uid;
                
                const targets = isPlayer ? enemies.filter(e => e.currentHp > 0) : fighters.filter(t => t.currentHp > 0);
                if (targets.length === 0) { battleOver = true; return; }
                const target = targets[Math.floor(Math.random() * targets.length)];
                
                // Skills & Damage Calc
                let dmgMod = 1.0;
                if (isPlayer && actor.skills?.row1 === 'oil_concentrated') {
                    actor.combatAttackCount = (actor.combatAttackCount || 0) + 1;
                    if (actor.combatAttackCount % 3 === 0) dmgMod = 1.1;
                }

                const stats = isPlayer ? getEffectiveStats(actor) : actor;
                const targetStats = isPlayer ? target : getEffectiveStats(target);
                
                let rawDmg = (stats.ap * dmgMod * (0.8 + Math.random() * 0.4)) - (targetStats.def || 0);
                let finalDmg = Math.max(1, Math.floor(rawDmg));
                
                target.currentHp -= finalDmg;
                logUpdates.push(`${actor.name} hits ${target.name} for ${finalDmg}`);
                addDamageEvent(target.id || target.uid, finalDmg, 'damage');

                if (isPlayer && actor.skills?.row1 === 'oil_refined') {
                    actor.combatHitCount = (actor.combatHitCount || 0) + 1;
                    if (actor.combatHitCount % 5 === 0) {
                        const heal = 5;
                        actor.currentHp = Math.min(stats.maxHp, actor.currentHp + heal);
                        addDamageEvent(actor.uid, heal, 'heal');
                        logUpdates.push(`${actor.name} heals ${heal} HP`);
                    }
                }

                if (target.currentHp <= 0) {
                    logUpdates.push(`☠️ ${target.name} died!`);
                    if (isPlayer) actor.battleKills = (actor.battleKills || 0) + 1;
                }
                
                if (isPlayer) dirtyTroops.set(actor.uid, actor);
                if (target.uid) dirtyTroops.set(target.uid, target);
            });

            // 3. Update State & DB
            setEnemies([...enemies]); 
            if (logUpdates.length > 0) setCombatLog(prev => [...prev, ...logUpdates].slice(-8));
            
            updateDoc(combatRef, { enemies: enemies, active: !battleOver }).catch(()=>{});
            
            dirtyTroops.forEach(t => {
                updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', t.uid), { 
                    currentHp: t.currentHp, 
                    actionGauge: t.actionGauge,
                    battleKills: t.battleKills || 0,
                    combatHitCount: t.combatHitCount || 0,
                    combatAttackCount: t.combatAttackCount || 0
                }).catch(()=>{});
            });

            // 4. Check Win/Loss
            const aliveTroops = fighters.filter(t => t.currentHp > 0);
            const aliveEnemies = enemies.filter(e => e.currentHp > 0);
            
            if (battleOver || aliveTroops.length === 0 || aliveEnemies.length === 0) {
                if (!processingResult.current) {
                    processingResult.current = true;
                    if (aliveTroops.length === 0) handleDefeat(fighters);
                    else handleVictory(fighters);
                }
            }
        }, 800);
        return () => clearInterval(interval);
    }, [gameState, enemies]);

    const handleVictory = async (survivors) => {
        setGameState('victory');
        setCombatLog(prev => [...prev, "VICTORY! Found Rewards."]);
        const xpGain = 20;
        let newInv = [...inventory];
        
        let dropChance = 0.1;
        const hasGloves = survivors.some(t => t.equipment?.gloves?.name === 'Slimey Gloves');
        if (hasGloves) dropChance *= 2; 

        // Detect Map type by enemy name (simple hack for now)
        const isMines = enemies[0]?.name.includes("Golem");

        if(isMines) {
            if (Math.random() < dropChance) newInv.push({ id: generateId(), name: "Iron Ore", type: 'resource' });
            if (Math.random() < 0.2) newInv.push({ id: generateId(), name: "Iron Ore", type: 'resource' });
        } else {
             if (Math.random() < dropChance) newInv.push({ id: generateId(), name: "Slime Paste", type: 'resource', desc: "Sticky." });
             if (Math.random() < 0.05) newInv.push({ id: generateId(), name: "Slimey Gloves", type: 'gloves', stats: { def: 1 }, desc: "Cooking + Combat Bonus" });
             if (Math.random() < 0.3) newInv.push({ id: generateId(), name: "Dull Sword", type: 'weapon', stats: { ap: 2, maxHp: -5 } });
        }

        const updates = survivors.map(async (unit) => {
            if (unit.currentHp <= 0) return deleteDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', unit.uid));
            
            let newXp = (unit.xp || 0) + xpGain;
            let newLevel = unit.level;
            if (newLevel < 10 && newXp >= LEVEL_XP_CURVE[newLevel]) newLevel++;
            
            const effectiveStats = getEffectiveStats({ ...unit, level: newLevel }, unit.equipment ? Object.values(unit.equipment) : []);
            const isCloseCall = (unit.currentHp / effectiveStats.maxHp) <= 0.05;
            const newLore = { 
                missionsWon: (unit.lore?.missionsWon || 0) + 1, 
                kills: (unit.lore?.kills || 0) + (unit.battleKills || 0), 
                closeCalls: (unit.lore?.closeCalls || 0) + (isCloseCall ? 1 : 0) 
            };
            
            await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', unit.uid), { 
                xp: newXp, level: newLevel, lore: newLore, inCombat: false, actionGauge: 0 
            });
        });
        
        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { gold: (user.gold || 0) + 15, inventory: newInv });
        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false });
        await Promise.all(updates);
    };

    const handleDefeat = async (party) => {
        setGameState('defeat');
        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false });
        await Promise.all(party.map(u => deleteDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', u.uid))));
    };

    return { combatLog, setCombatLog, damageEvents };
}
