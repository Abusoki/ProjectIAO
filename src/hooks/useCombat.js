// Modified handleVictory to use centralized DROPS + ENEMY_DROPS tables
import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { LEVEL_XP_CURVE, DROPS, ENEMY_DROPS } from '../config/gameData';
import { generateId, randomInt } from '../utils/helpers';

export function useCombat(user, troops, enemies, gameState, setGameState, setEnemies, setView, selectedTroops, inventory, autoBattle, setAutoBattle, setTroops) {
    const [combatLog, setCombatLog] = useState([]);
    const [damageEvents, setDamageEvents] = useState([]);
    const [currentLoot, setCurrentLoot] = useState([]);
    const processingResult = useRef(false);

    // REFACTOR: Use Refs for combat state to prevent dependency cycles
    const enemiesRef = useRef(enemies);
    const troopsRef = useRef(troops);
    const lastSentCombatRef = useRef(null);
    const lastSentTroopsRef = useRef(new Map());

    // Sync refs when entering combat or when props change if NOT fighting (to keep fresh prep data)
    // Sync refs when entering combat or when props change if NOT fighting (to keep fresh prep data)
    useEffect(() => {
        const hasIdsChanged = () => {
            const propIds = enemies.map(e => e.id).join(',');
            const refIds = enemiesRef.current.map(e => e.id).join(',');
            return propIds !== refIds;
        };

        if (gameState !== 'fighting') {
            enemiesRef.current = enemies;
            troopsRef.current = troops;
        } else {
            // FIX: If we just started fighting, OR if the enemies have fundamentally changed (new battle),
            // update the refs! This prevents holding onto "Dead" enemies from the previous battle.
            if ((enemiesRef.current.length === 0 && enemies.length > 0) || hasIdsChanged()) {
                console.log("New Battle Detected or Init. Syncing Refs.");
                enemiesRef.current = enemies;
                // Also reset success flag just in case
                processingResult.current = false;
            }
            // Sync troops if empty OR if we believe we should be fighting but have no fighters in the ref
            // This handles the transition from Idle -> Fighting where the Ref might still hold the "Idle" state troops.
            const hasFighters = troopsRef.current.some(t => t.inCombat);
            if ((troopsRef.current.length === 0 && troops.length > 0) || !hasFighters) {
                console.log("Syncing troops ref for combat start");
                troopsRef.current = troops;
            }
        }
    }, [enemies, troops, gameState]);

    const inventoryRef = useRef(inventory);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

    const addDamageEvent = (targetId, value, type) => {
        setDamageEvents(prev => [...prev.slice(-19), { id: Date.now() + Math.random(), targetId, value, type }]);
    };

    const cleanupInCombatFlags = async () => {
        try {
            const q = query(collection(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops'), where('inCombat', '==', true));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach(d => {
                batch.update(d.ref, { inCombat: false, actionGauge: 0 });
            });
            await batch.commit();
        } catch (e) {
            console.error('Cleanup failed', e);
        }
    };

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

        let lastSaveTime = 0;
        const interval = setInterval(() => {
            if (processingResult.current) return;

            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            let logUpdates = [];
            let battleOver = false;
            let dirtyTroops = new Map();
            let batchOps = 0;

            // REFACTOR: Read from REFS
            let currentTroops = troopsRef.current;
            let currentEnemies = enemiesRef.current;
            if (currentEnemies.length === 0) return;

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

            // FAILSAFE: Check victory condition BEFORE acting. 
            // If all enemies are dead, stop immediately.
            if (currentEnemies.every(e => e.currentHp <= 0)) {
                console.log("FAILSAFE: All enemies dead. Forcing battleOver.");
                battleOver = true;
            } else {

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
                        logUpdates.push({ text: `${target.name} shrugs off the hit!`, source: 'system' });
                        addDamageEvent(target.id || target.uid, 0, 'block');
                        // Do not apply damage or death logic for this hit
                    } else {
                        target.currentHp -= finalDmg;
                        logUpdates.push({ text: `${actor.name} hits ${target.name} for ${finalDmg}`, source: isPlayer ? 'player' : 'enemy' });
                        addDamageEvent(target.id || target.uid, finalDmg, 'damage');

                        if (isPlayer && actor.skills?.row1 === 'oil_refined') {
                            actor.combatHitCount = (actor.combatHitCount || 0) + 1;
                            if (actor.combatHitCount % 5 === 0) {
                                const heal = 5;
                                actor.currentHp = Math.min(stats.maxHp, actor.currentHp + heal);
                                addDamageEvent(actor.uid, heal, 'heal');
                                logUpdates.push({ text: `${actor.name} heals ${heal} HP`, source: 'player' });
                            }
                        }

                        if (target.currentHp <= 0) {
                            logUpdates.push({ text: `☠️ ${target.name} died!`, source: 'system' });
                            if (isPlayer) {
                                actor.battleKills = (actor.battleKills || 0) + 1;
                                // Track specific bloblin kills for this battle
                                if (target.type === 'blob' || target.name.includes('Bloblin')) actor.bloblinKills = (actor.bloblinKills || 0) + 1;
                            }
                        }
                    }

                    // Mark players/targets as dirty for potential DB write
                    if (isPlayer) {
                        dirtyTroops.set(actor.uid, {
                            uid: actor.uid,
                            currentHp: actor.currentHp,
                            actionGauge: actor.actionGauge,
                            battleKills: actor.battleKills || 0,
                            combatHitCount: actor.combatHitCount || 0,
                            combatAttackCount: actor.combatAttackCount || 0,
                            inCombat: true
                        });
                    }
                });
            } // End else (not Failsafe)

            // Update UI/State with new values
            setEnemies([...currentEnemies]);
            if (setTroops) setTroops([...currentTroops]);
            if (logUpdates.length > 0) setCombatLog(prev => [...prev.slice(-30), ...logUpdates]);

            // --- BATCH PERSISTENCE LOGIC ---
            const shouldSave = (Date.now() - lastSaveTime > 5000) || battleOver;

            if (shouldSave) {
                const batch = writeBatch(db);
                const combatSnapshot = `${currentEnemies.map(e => e.currentHp).join('|')}|${!battleOver}`;

                // 1) Conditionally update combat doc only if changed
                if (lastSentCombatRef.current !== combatSnapshot) {
                    batch.update(combatRef, { enemies: currentEnemies, active: !battleOver });
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
                    batch.commit().then(() => {
                        lastSaveTime = Date.now();
                    }).catch(err => {
                        console.error('Combat batch commit failed', err);
                        // On failure, clear lastSentCombat so we'll retry next flush
                        lastSentCombatRef.current = null;
                    });
                }
            }

            // End-of-battle handling:
            const aliveTroops = fighters.filter(t => t.currentHp > 0);
            const aliveEnemies = currentEnemies.filter(e => e.currentHp > 0);

            if (battleOver || aliveTroops.length === 0 || aliveEnemies.length === 0) {
                console.log(`Battle Ending. Over:${battleOver} Troops:${aliveTroops.length} Enemies:${aliveEnemies.length}`);
                if (!processingResult.current) {
                    console.log("Triggering HandleVictory/Defeat");
                    processingResult.current = true;
                    if (aliveTroops.length === 0) handleDefeat(fighters);
                    else handleVictory(fighters);
                } else {
                    console.log("Already processing result.");
                }
            }
        }, 800);
        return () => clearInterval(interval);
    }, [gameState]); // REFACTOR: Dependent ONLY on gameState to start/stop. Loop handles data via Refs.

    const handleVictory = async (survivors) => {
        try {
            console.log("HandleVictory started. Setting state to victory.");
            setGameState('victory');
            setCombatLog(prev => [...prev, { text: "🏆 VICTORY! Processing rewards...", source: 'system' }]);

            const xpGain = 20;
            let newInv = [...inventoryRef.current];
            let dropChance = 0.1;
            let collectedLoot = [];

            if (survivors && survivors.length > 0) {
                const hasGloves = survivors.some(t => t.equipment?.gloves?.name === 'Slimey Gloves');
                if (hasGloves) dropChance *= 2;
            }

            // Determine enemy type by id or name
            const leadEnemy = enemies[0];
            const enemyType = (leadEnemy?.type) || (leadEnemy?.id || '').split('_')[0] || (leadEnemy?.name || '').toLowerCase();

            // Safe Access to Drops
            const dropsLookup = ENEMY_DROPS || {};
            const itemLookup = DROPS || {};

            const pool = dropsLookup[enemyType] || [];

            // Limit pool iteration
            for (const dropRef of pool) {
                try {
                    if (Math.random() < (dropRef.chance || 0)) {
                        const def = itemLookup[dropRef.id];
                        if (!def) continue;

                        const qty = (dropRef.min && dropRef.max) ? randomInt(dropRef.min, dropRef.max) : 1;

                        for (let i = 0; i < qty; i++) {
                            const newItem = { id: generateId(), ...def };
                            newInv.push(newItem);
                            collectedLoot.push(newItem);
                        }

                        setCombatLog(prev => [...prev, { text: `+ ${qty > 1 ? qty + 'x ' : ''}${def.name}`, source: 'system' }]);
                    }
                } catch (e) { console.error('Drop roll failed', e); }
            }

            // Fallback drop logic
            if (pool.length === 0) {
                if (Math.random() < dropChance) {
                    const fallbackItem = itemLookup.slime_paste || { id: generateId(), name: 'Slime Paste', type: 'resource', desc: 'Sticky.' };
                    const newItem = { id: generateId(), ...fallbackItem };
                    newInv.push(newItem);
                    collectedLoot.push(newItem);
                    setCombatLog(prev => [...prev, { text: `+ ${fallbackItem.name}`, source: 'system' }]);
                }
            }

            setCurrentLoot(collectedLoot);

            // Database Updates
            const batch = writeBatch(db);

            // Update Survivors
            survivors.forEach((unit) => {
                const ref = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', unit.uid);
                if (unit.currentHp <= 0) {
                    batch.delete(ref);
                } else {
                    let newXp = (unit.xp || 0) + xpGain;
                    let newLevel = unit.level;
                    if (newLevel < 10 && newXp >= LEVEL_XP_CURVE[newLevel]) newLevel++;

                    // Recalculate stats for safety
                    const effectiveStats = getEffectiveStats({ ...unit, level: newLevel }, unit.equipment ? Object.values(unit.equipment) : []);
                    const isCloseCall = (unit.currentHp / effectiveStats.maxHp) <= 0.05;

                    const isCloseCall = (unit.currentHp / effectiveStats.maxHp) <= 0.05;

                    const newLore = {
                        missionsWon: (unit.lore?.missionsWon || 0) + 1,
                        kills: (unit.lore?.kills || 0) + (unit.battleKills || 0),
                        closeCalls: (unit.lore?.closeCalls || 0) + (isCloseCall ? 1 : 0),
                        bloblinKills: (unit.lore?.bloblinKills || 0) + (unit.bloblinKills || 0)
                    };

                    // Character Title: Bloblin
                    const newTitles = unit.titles || [];
                    if (newLore.bloblinKills >= 100 && !newTitles.includes('Bloblin')) {
                        newTitles.push('Bloblin');
                        setCombatLog(prev => [...prev, { text: `${unit.name} earned title: Bloblin!`, source: 'system' }]);
                    }

                    batch.update(ref, { xp: newXp, level: newLevel, lore: newLore, titles: newTitles, inCombat: false, actionGauge: 0 });
                }
            });

            // Update Profile & Meta (Titles)
            const metaRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'meta');
            // Calculate total bloblin kills from this battle
            const totalBloblinKills = survivors.reduce((acc, s) => acc + (s.bloblinKills || 0), 0);

            if (totalBloblinKills > 0) {
                // We blindly increment. For the Title check, strictly we should read first or use a cloud function,
                // but here we can just do a client-side check if we had the profile loaded. 
                // Since we don't have profile prop here easily (it's in App), we'll do a blind update 
                // and maybe check titles next time or rely on a separate Effect in App.js?
                // Or we can just use setDoc with merge if we want to be safe?
                // increment() is best.
                batch.update(metaRef, {
                    totalBloblinKills: increment(totalBloblinKills)
                });
                // Note: We can't easily check for "Bloblin Slayer" title unlock here without reading meta.
                // We will leave the "Player Title" unlocking to the App.js effect loop which watches profile/meta.
            }

            // Update Profile
            const profileRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data');
            batch.update(profileRef, { gold: (user.gold || 0) + 15, inventory: newInv });

            // Close Combat Session
            const combatRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat');
            batch.update(combatRef, { active: false });

            await batch.commit();

            // Log Result
            try {
                const resultId = `${user.uid}_${Date.now()}`;
                const resultDoc = {
                    id: resultId,
                    timestamp: Date.now(),
                    outcome: 'victory',
                    missionKey: null,
                    survivors: survivors.map(u => ({ uid: u.uid, name: u.name })),
                    loot: collectedLoot,
                    log: combatLog.slice(-20)
                };
                // Fire-and-forget result log
                setDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'combatHistory', resultId), resultDoc).catch(e => console.warn(e));
            } catch (loggingErr) {
                console.warn("Result logging failed", loggingErr);
            }

            // Cleanup
            await cleanupInCombatFlags();

        } catch (err) {
            console.error("CRITICAL ERROR IN HANDLE VICTORY", err);
            setCombatLog(prev => [...prev, `Error processing victory: ${err.message}`]);
            // Force state anyway
            setGameState('victory');
        }
    };

    const handleDefeat = async (party) => {
        setGameState('defeat');
        setAutoBattle(false);
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'system', 'combat'), { active: false });

            party.forEach(u => batch.delete(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', u.uid)));

            // Increment deaths
            const metaRef = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'meta');
            batch.update(metaRef, { totalTroopDeaths: increment(party.length) });

            await batch.commit();
        } catch (e) {
            console.error('Batched defeat commit failed', e);
            // Fallback manually? Simpler to just retry or alert.
        }
        await cleanupInCombatFlags();
    };

    return { combatLog, setCombatLog, damageEvents, currentLoot };
}
