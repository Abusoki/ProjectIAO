import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { LEVEL_XP_CURVE } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useCombat(user, troops, enemies, gameState, setGameState, setEnemies, setView, selectedTroops, inventory, autoBattle, setAutoBattle) {
    const [combatLog, setCombatLog] = useState([]);
    const [damageEvents, setDamageEvents] = useState([]); 
    const processingResult = useRef(false);
    
    // Fix: Keep a ref to inventory so we always have the latest version when battle ends
    const inventoryRef = useRef(inventory);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

    const addDamageEvent = (targetId, amount, type = 'damage') => {
        const id = Math.random();
        setDamageEvents(prev => [...prev, { id, targetId, amount, type }]);
        setTimeout(() => {
            setDamageEvents(prev => prev.filter(e => e.id !== id));
        }, 1000);
    };

    useEffect(() => {
        if (gameState !== 'fighting') {
            processingResult.current = false;
            return;
        }
        
        const interval = setInterval(() => {
            if (processingResult.current) return;

            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            let logUpdates = [];
            let battleOver = false;
            let dirtyTroops = new Map();
            
            const fighters = troops.filter(t => t.inCombat);
            if (fighters.length === 0 && enemies.length > 0) return;

            // Increment action gauges — apply Elvish Flicker double speed while remaining
            [...fighters, ...enemies].forEach(u => {
                if (u.currentHp > 0) {
                    let baseSpd = (u.baseStats?.spd || u.spd || 8);

                    // Initialize flicker counter when combat begins (runtime-only)
                    if (u.skills?.row1 === 'elvish_flicker' && u._elvishFlickerRemaining === undefined) {
                        u._elvishFlickerRemaining = 3;
                    }

                    // If flicker active, double the speed contribution
                    if (u.skills?.row1 === 'elvish_flicker' && u._elvishFlickerRemaining > 0) {
                        baseSpd *= 2;
                    }

                    u.actionGauge = (u.actionGauge || 0) + baseSpd;
                }
            });

            const actors = [...fighters, ...enemies].filter(u => u.currentHp > 0 && u.actionGauge >= 100).sort((a, b) => b.actionGauge - a.actionGauge);
            
            actors.forEach(actor => {
                if (battleOver || actor.currentHp <= 0) return;
                actor.actionGauge -= 100;
                const isPlayer = !!actor.uid;
                
                // When a flicker actor acts, consume one flicker charge
                if (actor.skills?.row1 === 'elvish_flicker' && actor._elvishFlickerRemaining > 0) {
                    actor._elvishFlickerRemaining = Math.max(0, (actor._elvishFlickerRemaining || 0) - 1);
                }

                const targets = isPlayer ? enemies.filter(e => e.currentHp > 0) : fighters.filter(t => t.currentHp > 0);
                if (targets.length === 0) { battleOver = true; return; }
                const target = targets[Math.floor(Math.random() * targets.length)];
                
                let dmgMod = 1.0;
                if (isPlayer && actor.skills?.row1 === 'oil_concentrated') {
                    actor.combatAttackCount = (actor.combatAttackCount || 0) + 1;
                    if (actor.combatAttackCount % 3 === 0) dmgMod = 1.1;
                }

                const stats = isPlayer ? getEffectiveStats(actor) : actor;
                const targetStats = isPlayer ? target : getEffectiveStats(target);
                
                let rawDmg = (stats.ap * dmgMod * (0.8 + Math.random() * 0.4)) - (targetStats.def || 0);
                let finalDmg = Math.max(1, Math.floor(rawDmg));

                // Initialize mindset counter for targets that have it (runtime-only)
                if (target.skills?.row1 === 'elvish_mindset' && target._elvishMindsetRemaining === undefined) {
                    target._elvishMindsetRemaining = 3;
                }

                // Elvish Mindset: prevent first N incoming hits
                if (target.skills?.row1 === 'elvish_mindset' && target._elvishMindsetRemaining > 0) {
                    target._elvishMindsetRemaining = Math.max(0, target._elvishMindsetRemaining - 1);
                    logUpdates.push(`${target.name} shrugs off the hit!`);
                    addDamageEvent(target.id || target.uid, 0, 'block');
                    // Do not apply damage or death logic for this hit
                } else {
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
                }
                
                if (isPlayer) dirtyTroops.set(actor.uid, actor);
                if (target.uid) dirtyTroops.set(target.uid, target);
            });

            setEnemies([...enemies]); 
            if (logUpdates.length > 0) setCombatLog(prev => [...prev, ...logUpdates].slice(-8));
            
            updateDoc(combatRef, { enemies: enemies, active: !battleOver }).catch(()=>{});
            dirtyTroops.forEach(t => {
                updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', t.uid), { 
                    currentHp: t.currentHp, actionGauge: t.actionGauge, battleKills: t.battleKills || 0,
                    combatHitCount: t.combatHitCount || 0, combatAttackCount: t.combatAttackCount || 0
                }).catch(()=>{});
            });

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
        setCombatLog(prev => [...prev, "VICTORY! Checking for loot..."]);
        const xpGain = 20;
        
        // Use Ref to get latest inventory
        let newInv = [...inventoryRef.current];
        
        let dropChance = 0.1;
        const hasGloves = survivors.some(t => t.equipment?.gloves?.name === 'Slimey Gloves');
        if (hasGloves) dropChance *= 2; 

        // Determine enemy type by id or name
        const leadEnemy = enemies[0];
        const enemyType = leadEnemy?.id?.split('_')[0] || (leadEnemy?.name || '').toLowerCase();

        if (enemyType.includes('golem') || enemyType.includes('golem')) {
            if (Math.random() < dropChance) {
                newInv.push({ id: generateId(), name: "Iron Ore", type: 'resource' });
                setCombatLog(prev => [...prev, "+ Iron Ore"]);
            }
            if (Math.random() < 0.2) {
                newInv.push({ id: generateId(), name: "Iron Ore", type: 'resource' });
                setCombatLog(prev => [...prev, "+ Iron Ore"]);
            }
        } else if (enemyType.includes('rat')) {
            // Rat drops
            if (Math.random() < 0.15) {
                newInv.push({ id: generateId(), name: "Rat Fur Cape", type: 'cape', desc: "A cape made from rat fur." });
                setCombatLog(prev => [...prev, "+ Rat Fur Cape"]);
            }
        } else if (enemyType.includes('ice_imp') || enemyType.includes('ice')) {
            // Ice Imp drops
            if (Math.random() < 0.12) {
                newInv.push({ id: generateId(), name: "Ice Boots", type: 'boots', stats: { spd: 2, def: 1 }, desc: "Boots of cold speed." });
                setCombatLog(prev => [...prev, "+ Ice Boots"]);
            }
        } else {
             if (Math.random() < dropChance) {
                 newInv.push({ id: generateId(), name: "Slime Paste", type: 'resource', desc: "Sticky." });
                 setCombatLog(prev => [...prev, "+ Slime Paste"]);
             }
             if (Math.random() < 0.05) {
                 newInv.push({ id: generateId(), name: "Slimey Gloves", type: 'gloves', stats: { def: 1 }, desc: "Cooking + Combat Bonus" });
                 setCombatLog(prev => [...prev, "+ Slimey Gloves!"]);
             }
             if (Math.random() < 0.3) {
                 newInv.push({ id: generateId(), name: "Dull Sword", type: 'weapon', stats: { ap: 2, maxHp: -5 } });
                 setCombatLog(prev => [...prev, "+ Dull Sword"]);
             }
        }

        const updates = survivors.map(async (unit) => {
            // PERMADEATH CHECK
            if (unit.currentHp <= 0) {
                console.log(`Unit ${unit.name} died. Deleting...`);
                return deleteDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', unit.uid));
            }
            
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
        setAutoBattle(false);
        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false });
        // Ensure all are deleted
        await Promise.all(party.map(u => deleteDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', u.uid))));
    };

    return { combatLog, setCombatLog, damageEvents };
}
