// Modified handleVictory to use centralized DROPS + ENEMY_DROPS tables
import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { LEVEL_XP_CURVE, DROPS, ENEMY_DROPS } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useCombat(user, troops, enemies, gameState, setGameState, setEnemies, setView, selectedTroops, inventory, autoBattle, setAutoBattle) {
    const [combatLog, setCombatLog] = useState([]);
    const [damageEvents, setDamageEvents] = useState([]);
    const processingResult = useRef(false);

    // REFACTOR: Use Refs for combat state to prevent dependency cycles
    const enemiesRef = useRef(enemies);
    const troopsRef = useRef(troops);

    // Sync refs when entering combat or when props change if NOT fighting (to keep fresh prep data)
    useEffect(() => {
        if (gameState !== 'fighting') {
            enemiesRef.current = enemies;
            troopsRef.current = troops;
        }
    }, [enemies, troops, gameState]);

    const inventoryRef = useRef(inventory);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

    // ... (keep addDamageEvent and cleanupInCombatFlags as is) ...

    useEffect(() => {
        if (gameState !== 'fighting') {
            processingResult.current = false;
            return;
        }

        // Initialize refs one last time at start of combat to ensure we have the starting state
        // (This might be redundant with the effect above, but safe)
        if (!processingResult.current) {
            // We trust the refs are primed by the idle state sync
        }

        const interval = setInterval(() => {
            if (processingResult.current) return;

            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            let logUpdates = [];
            let battleOver = false;
            let dirtyTroops = new Map();

            // REFACTOR: Read from REFS
            let currentTroops = troopsRef.current;
            let currentEnemies = enemiesRef.current;

            const fighters = currentTroops.filter(t => t.inCombat);
            if (fighters.length === 0 && currentEnemies.length > 0) return;

            // Increment action gauges — apply Elvish Flicker double speed while remaining
            [...fighters, ...currentEnemies].forEach(u => {
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

            const actors = [...fighters, ...currentEnemies].filter(u => u.currentHp > 0 && u.actionGauge >= 100).sort((a, b) => b.actionGauge - a.actionGauge);

            actors.forEach(actor => {
                if (battleOver || actor.currentHp <= 0) return;
                actor.actionGauge -= 100;
                const isPlayer = !!actor.uid;

                // When a flicker actor acts, consume one flicker charge
                if (actor.skills?.row1 === 'elvish_flicker' && actor._elvishFlickerRemaining > 0) {
                    actor._elvishFlickerRemaining = Math.max(0, (actor._elvishFlickerRemaining || 0) - 1);
                }

                const targets = isPlayer ? currentEnemies.filter(e => e.currentHp > 0) : fighters.filter(t => t.currentHp > 0);
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

                // Mark players/targets as dirty for potential DB write
                if (isPlayer) dirtyTroops.set(actor.uid, {
                    uid: actor.uid,
                    currentHp: actor.currentHp,
                    actionGauge: actor.actionGauge,
                    battleKills: actor.battleKills || 0,
                    combatHitCount: actor.combatHitCount || 0,
                    combatAttackCount: actor.combatAttackCount || 0,
                    inCombat: actor.inCombat || false
                });
                if (target.uid) dirtyTroops.set(target.uid, {
                    uid: target.uid,
                    currentHp: target.currentHp,
                    actionGauge: target.actionGauge,
                    battleKills: target.battleKills || 0,
                    combatHitCount: target.combatHitCount || 0,
                    combatAttackCount: target.combatAttackCount || 0,
                    inCombat: target.inCombat || false
                });
            });

            // Apply local state updates for UI immediately
            // We update the refs (they are mutable so they are already updated), then trigger a render
            setEnemies([...currentEnemies]);
            // setTroops is passed as prop 'troops' which we can't set directly, 
            // but the parent updates troops from DB. 
            // However, for the UI to reflect HP updates instantly without waiting for DB roundtrip, 
            // we might need a way to force update or rely on the props updating from DB eventually?
            // Actually, we are modifying the objects inside troopsRef.current. 
            // If these objects are references to the props, we are mutating props (bad practice but works for Ref holding).
            // But 'troops' from props comes from App state.
            // Ideally we should have setTroops here? No, App.jsx controls troops via DB listener.
            // This is a bit disjointed. 
            // BUT: For combat visual feedback, enemies is the main one we set locally.
            // Troops HP bars rely on 'troops' prop.
            // If we mutate 'troopsRef.current', does it reflect in UI? 
            // Only if 'troops' prop changes or we force update.
            // But we don't have setTroops.
            // However, the DB writes happen below, which trigger the onSnapshot in App.jsx, which updates troops prop.
            // So visual latency for troops might be 1 tick + DB RTT.
            // That's acceptable for now to fix the specific "infinite loop" bug which is about enemies.

            if (logUpdates.length > 0) setCombatLog(prev => [...prev, ...logUpdates].slice(-8));

            // Throttle writes: only attempt to write every WRITE_INTERVAL_TICKS intervals.
            writeTickCounter.current = (writeTickCounter.current + 1) % WRITE_INTERVAL_TICKS;
            const shouldFlushWrites = writeTickCounter.current === 0;

            // Combat doc snapshot for comparison
            const combatSnapshot = JSON.stringify({ enemies: currentEnemies.map(e => ({ id: e.id, currentHp: e.currentHp })), active: !battleOver });

            if (shouldFlushWrites) {
                // Build a batch for troop updates and conditional combat update
                const batch = writeBatch(db);
                let batchOps = 0;

                // 1) Conditionally update combat doc only if changed
                if (lastSentCombatRef.current !== combatSnapshot) {
                    batch.update(combatRef, { enemies: currentEnemies, active: !battleOver }).catch(() => { });
                    // Note: writeBatch doesn't return Promise for update calls here; we'll commit below.
                    batchOps++;
                    lastSentCombatRef.current = combatSnapshot;
                }

                // 2) For each dirty troop check lastSentTroopsRef to avoid redundant writes
                dirtyTroops.forEach((t) => {
                    const key = t.uid;
                    const last = lastSentTroopsRef.current.get(key);
                    // compare relevant fields
                    const snapshot = `${t.currentHp}|${t.actionGauge}|${t.battleKills}|${t.combatHitCount}|${t.combatAttackCount}|${t.inCombat}`;
                    if (last !== snapshot) {
                        const troopRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', key);
                        batch.update(troopRef, {
                            currentHp: t.currentHp,
                            actionGauge: t.actionGauge,
                            battleKills: t.battleKills || 0,
                            combatHitCount: t.combatHitCount || 0,
                            combatAttackCount: t.combatAttackCount || 0,
                            inCombat: t.inCombat || false
                        });
                        lastSentTroopsRef.current.set(key, snapshot);
                        batchOps++;
                    }
                });

                // Commit batch if we added operations
                if (batchOps > 0) {
                    batch.commit().catch(err => {
                        console.error('Combat batch commit failed', err);
                        // On failure, clear lastSentCombat so we'll retry next flush
                        lastSentCombatRef.current = null;
                    });
                }
            } else {
                // Even when not flushing, update local lastSentTroopsRef for troops we just wrote in-memory
                // (do not mark as sent — keep previous state so flush will send changes)
            }

            // Finally update combat active flag locally (so onSnapshot listeners see it change promptly)
            // Note: DB write may be throttled; local UI remains responsive.
            // We still rely on the combat system to set active flag in DB at lower frequency.
            // End-of-battle handling:
            const aliveTroops = fighters.filter(t => t.currentHp > 0);
            const aliveEnemies = currentEnemies.filter(e => e.currentHp > 0);

            if (battleOver || aliveTroops.length === 0 || aliveEnemies.length === 0) {
                if (!processingResult.current) {
                    processingResult.current = true;
                    if (aliveTroops.length === 0) handleDefeat(fighters);
                    else handleVictory(fighters);
                }
            }
        }, 800);
        return () => clearInterval(interval);
    }, [gameState]); // REFACTOR: Dependent ONLY on gameState to start/stop. Loop handles data via Refs.

    const handleVictory = async (survivors) => {
        setCombatLog(prev => [...prev, "🏆 VICTORY! Processing rewards..."]);
        setGameState('victory');
        setCombatLog(prev => [...prev, "VICTORY! Checking for loot..."]);
        const xpGain = 20;

        let newInv = [...inventoryRef.current];

        let dropChance = 0.1;
        const hasGloves = survivors.some(t => t.equipment?.gloves?.name === 'Slimey Gloves');
        if (hasGloves) dropChance *= 2;

        // Determine enemy type by id or name
        const leadEnemy = enemies[0];
        const enemyType = (leadEnemy?.id || '').split('_')[0] || (leadEnemy?.name || '').toLowerCase();

        // Use centralized ENEMY_DROPS mapping
        const pool = ENEMY_DROPS[enemyType] || [];
        for (const dropRef of pool) {
            try {
                if (Math.random() < (dropRef.chance || 0)) {
                    const def = DROPS[dropRef.id];
                    if (!def) continue;
                    newInv.push({ id: generateId(), ...def });
                    setCombatLog(prev => [...prev, `+ ${def.name}`]);
                }
            } catch (e) { console.error('Drop roll failed', e); }
        }

        // As a fallback for old enemyType cases (if no pool found) keep a generic small chance for resources
        if (pool.length === 0) {
            if (Math.random() < dropChance) {
                const def = DROPS.slime_paste || { id: generateId(), name: 'Slime Paste', type: 'resource', desc: 'Sticky.' };
                newInv.push({ id: generateId(), ...def });
                setCombatLog(prev => [...prev, `+ ${def.name}`]);
            }
        }

        // Batch survivors updates to minimize writes
        try {
            const batch = writeBatch(db);
            survivors.forEach((unit) => {
                const ref = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', unit.uid);
                if (unit.currentHp <= 0) {
                    batch.delete(ref);
                } else {
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
                    batch.update(ref, { xp: newXp, level: newLevel, lore: newLore, inCombat: false, actionGauge: 0 });
                }
            });
            const profileRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data');
            batch.update(profileRef, { gold: (user.gold || 0) + 15, inventory: newInv });
            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            batch.update(combatRef, { active: false });
            await batch.commit();

            // New result logging:
            const resultId = `${user.uid}_${Date.now()}`;
            const resultDoc = {
                id: resultId,
                timestamp: Date.now(),
                outcome: 'victory',
                missionKey: null,
                enemySnapshot: enemies.map(e => ({ id: e.id, name: e.name, currentHp: e.currentHp, maxHp: e.maxHp })),
                survivors: survivors.map(u => ({ uid: u.uid, name: u.name, currentHp: u.currentHp, level: u.level, battleKills: u.battleKills || 0 })),
                loot: newInv.filter(i => i.id.startsWith('drop_')).map(l => ({ id: l.id, name: l.name, type: l.type, desc: l.desc, stats: l.stats })),
                xpPerSurvivor: xpGain,
                log: combatLog.slice(-40)
            };
            const resultRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combatResults', resultId);
            await setDoc(resultRef, resultDoc);
        } catch (e) {
            console.error('Error logging combat result', e);
        }

        // Final safety cleanup to ensure no troop remains flagged as inCombat
        await cleanupInCombatFlags();
    };

    const handleDefeat = async (party) => {
        setGameState('defeat');
        setAutoBattle(false);
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false });
            party.forEach(u => batch.delete(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', u.uid)));
            await batch.commit();
        } catch (e) {
            console.error('Batched defeat commit failed', e);
            await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false }).catch(() => { });
            await Promise.all(party.map(u => deleteDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', u.uid))));
        }
        await cleanupInCombatFlags();
    };

    return { combatLog, setCombatLog, damageEvents };
}
