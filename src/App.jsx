import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, updateDoc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { Shield, Backpack, LogOut } from 'lucide-react';
import { getEffectiveStats, generateRecruit } from './utils/mechanics';
import { generateId } from './utils/helpers';
import { TAVERN_REFRESH_MS, LEVEL_XP_CURVE, COOKING_XP_CURVE, MAX_LEVEL, MAX_COOKING_LEVEL } from './config/gameData';

// Component Imports
import AuthScreen from './components/AuthScreen';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Barracks from './views/Barracks';
import CharacterSheet from './views/CharacterSheet';
import Tavern from './views/Tavern';
import Skills from './views/Skills';
import Kitchen from './views/Kitchen';
import MissionSelect from './views/MissionSelect';
import Combat from './views/Combat';

const appId = 'iron-and-oil-web';

export default function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [view, setView] = useState('barracks'); 
    const [troops, setTroops] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [gold, setGold] = useState(0);
    const [tavernState, setTavernState] = useState({ recruits: [], nextRefresh: 0 });
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [combatLog, setCombatLog] = useState([]);
    const [gameState, setGameState] = useState('idle');
    const [selectedTroops, setSelectedTroops] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [autoBattle, setAutoBattle] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [newName, setNewName] = useState("");

    // Refs to avoid stale closures in loops
    const troopsRef = useRef(troops);
    const inventoryRef = useRef(inventory);
    const gameStateRef = useRef(gameState);
    const processingResult = useRef(false); // Prevents double victory triggers

    useEffect(() => { troopsRef.current = troops; }, [troops]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const playerLevel = troops.reduce((acc, t) => acc + t.level, 0);
    const maxTroops = playerLevel >= 10 ? 4 : 3;

    // --- Helper Functions ---
    const applyOfflineRegen = (ticks) => {
        setTimeout(() => {
            const currentTroops = troopsRef.current;
            currentTroops.forEach(t => {
                if (t.currentHp > 0 && t.currentHp < t.baseStats.hp) {
                        const stats = getEffectiveStats(t);
                        const healAmt = ticks; 
                        const newHp = Math.min(stats.maxHp, t.currentHp + healAmt);
                        if (newHp > t.currentHp) {
                            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', t.uid), { currentHp: newHp });
                        }
                }
            });
        }, 2000); 
    };

    const saveName = async () => {
        if (!newName.trim()) return;
        const p = { displayName: newName };
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'meta'), p, { merge: true });
        setProfile(p);
        setShowNameModal(false);
    };

    // --- Auth & Data ---
    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const profRef = doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'meta');
                const snap = await getDoc(profRef);
                if (!snap.exists() || !snap.data().displayName) setShowNameModal(true);
                else setProfile(snap.data());
            }
        });
    }, []);

    // --- Listeners ---
    useEffect(() => {
        if (!user) return;
        
        // TROOPS LISTENER
        const unsubTroops = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'troops'), (snap) => {
            // Important: Don't update local state during combat to prevent rubber-banding health
            if (gameStateRef.current === 'fighting') return;
            const t = [];
            snap.forEach(doc => t.push({ ...doc.data(), uid: doc.id }));
            setTroops(t);
        });

        // PROFILE LISTENER
        const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (snap) => {
            if (snap.exists()) {
                setInventory(snap.data().inventory || []);
                setGold(snap.data().gold || 100);
                const lastOnline = snap.data().lastOnline;
                if (lastOnline) {
                    const elapsedSeconds = Math.floor((Date.now() - lastOnline) / 1000);
                    const regenTicks = Math.floor(elapsedSeconds / 5);
                    if (regenTicks > 0) applyOfflineRegen(regenTicks);
                }
            } else {
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: [], gold: 100 });
            }
        });

        // COMBAT STATE LISTENER
        const unsubBattle = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.active) {
                    // Restore state from DB so we can resume fighting
                    setEnemies(data.enemies);
                    if (data.troopIds) setSelectedTroops(data.troopIds); // Restore selection for auto-battle
                    setGameState('fighting');
                    processingResult.current = false; // Reset lock
                } else {
                    if (gameStateRef.current === 'fighting') {
                        // DB says fight is over, update local UI
                        setGameState('victory'); 
                        processingResult.current = false;
                    }
                }
            }
        });

        const unsubTavern = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), (snap) => {
            if (snap.exists()) setTavernState(snap.data());
            else {
                const newRecruits = Array.from({ length: 5 }, () => generateRecruit());
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), { recruits: newRecruits, nextRefresh: Date.now() + TAVERN_REFRESH_MS });
            }
        });

        const heartbeat = setInterval(() => {
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { lastOnline: Date.now() }).catch(()=>{});
        }, 10000);

        return () => { unsubTroops(); unsubProfile(); unsubTavern(); unsubBattle(); clearInterval(heartbeat); };
    }, [user]);

    // --- Loops (Regen, Cooking) ---
    
    // Regen
    useEffect(() => {
        if (!user) return;
        const regenInterval = setInterval(() => {
            if (gameState === 'fighting') return;
            troopsRef.current.forEach(t => {
                if (t.currentHp > 0 && t.activity !== 'fighting' && !t.inCombat) {
                    const stats = getEffectiveStats(t);
                    if (t.currentHp < stats.maxHp) {
                        updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', t.uid), {
                            currentHp: Math.min(stats.maxHp, t.currentHp + 1)
                        }).catch(()=>{});
                    }
                }
            });
        }, 5000);
        return () => clearInterval(regenInterval);
    }, [user, gameState]);

    // Cooking
    useEffect(() => {
        if (!user) return;
        const cookingInterval = setInterval(async () => {
            const chefs = troopsRef.current.filter(t => t.activity === 'cooking');
            if (chefs.length === 0) return;
            const inv = inventoryRef.current;
            const slimePaste = inv.find(i => i.name === 'Slime Paste');

            for (const chef of chefs) {
                if (!slimePaste) {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', chef.uid), { activity: 'idle', cookingProgress: 0 });
                    continue;
                }
                let newProgress = (chef.cookingProgress || 0) + 10;
                if (newProgress >= 100) {
                    const hasGloves = chef.equipment?.gloves?.name === 'Slimey Gloves';
                    const cookingLvl = chef.cooking?.level || 1;
                    let failChance = Math.max(0, 50 - ((cookingLvl - 1) * 5));
                    if (hasGloves) failChance = Math.max(0, failChance - 2);

                    const isSuccess = Math.random() * 100 > failChance;
                    let newInv = inventoryRef.current.filter(i => i.id !== slimePaste.id);
                    if (isSuccess) newInv.push({ id: generateId(), name: "Slime Bread", type: "food", desc: "Restores 10 HP", value: 10 });
                    
                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: newInv });
                    
                    let newXp = (chef.cooking?.xp || 0) + 10;
                    let newLvl = cookingLvl;
                    if (newXp >= COOKING_XP_CURVE[newLvl] && newLvl < MAX_COOKING_LEVEL) newLvl++;

                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', chef.uid), { cookingProgress: 0, "cooking.xp": newXp, "cooking.level": newLvl });
                } else {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', chef.uid), { cookingProgress: newProgress });
                }
            }
        }, 1000);
        return () => clearInterval(cookingInterval);
    }, [user]);

    // --- COMBAT LOGIC ---

    const setupAndStartMission = async () => {
        // Use troopsRef to make sure we have latest data
        const currentTroops = troopsRef.current;
        // Ensure selectedTroops contains valid IDs (filtering out any that might have died)
        const validSelectedIds = selectedTroops.filter(id => currentTroops.find(t => t.uid === id));
        
        if (validSelectedIds.length === 0) { 
            setAutoBattle(false); 
            setCombatLog(p => [...p, "Auto-battle stopped: No valid troops."]);
            return; 
        }
        
        // 1. Mark troops as inCombat
        const updates = validSelectedIds.map(uid => 
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', uid), { 
                inCombat: true, 
                actionGauge: 0, 
                battleKills: 0,
                combatHitCount: 0,
                combatAttackCount: 0
            })
        );
        await Promise.all(updates);

        // 2. Create Combat Session
        const enemyCount = Math.floor(Math.random() * 4) + 1;
        const newEnemies = Array.from({ length: enemyCount }, (_, i) => ({
            id: `blob_${i}`, name: `Bloblin ${i+1}`, maxHp: 40, currentHp: 40, ap: 8, def: 0, spd: 8, actionGauge: Math.random() * 50
        }));
        
        const battleData = {
            active: true,
            enemies: newEnemies,
            troopIds: validSelectedIds, // Save IDs so we can resume if refreshed
            log: ["Combat Started!"],
            tick: 0
        };

        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), battleData);
        
        // 3. Update Local State immediately
        setEnemies(newEnemies);
        setGameState('fighting');
        processingResult.current = false; // Reset lock
        setView('combat');
    };

    // COMBAT LOOP
    useEffect(() => {
        if (gameState !== 'fighting') return;
        
        const interval = setInterval(() => {
            if (processingResult.current) return; // Don't tick if we are ending the fight

            const combatRef = doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat');
            let logUpdates = [];
            let battleOver = false;
            let dirtyTroops = new Map();
            
            // Filter troops that are marked as inCombat in local state
            const fighters = troopsRef.current.filter(t => t.inCombat);
            
            // Safety: If logic breaks and no fighters, abort
            if (fighters.length === 0 && enemies.length > 0) return;

            // Tick
            [...fighters, ...enemies].forEach(u => {
                if (u.currentHp > 0) u.actionGauge = (u.actionGauge || 0) + (u.baseStats?.spd || u.spd || 8);
            });

            // Act
            const actors = [...fighters, ...enemies].filter(u => u.currentHp > 0 && u.actionGauge >= 100).sort((a, b) => b.actionGauge - a.actionGauge);
            
            actors.forEach(actor => {
                if (battleOver || actor.currentHp <= 0) return;
                actor.actionGauge -= 100;
                const isPlayer = !!actor.uid;
                
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
                
                target.currentHp -= finalDmg;
                logUpdates.push(`${actor.name} hits ${target.name} for ${finalDmg}`);

                if (isPlayer && actor.skills?.row1 === 'oil_refined') {
                    actor.combatHitCount = (actor.combatHitCount || 0) + 1;
                    if (actor.combatHitCount % 5 === 0) {
                        actor.currentHp = Math.min(stats.maxHp, actor.currentHp + 5);
                        logUpdates.push(`${actor.name} heals 5 HP (Oil Refined)`);
                    }
                }

                if (target.currentHp <= 0) {
                    logUpdates.push(`☠️ ${target.name} died!`);
                    if (isPlayer) actor.battleKills = (actor.battleKills || 0) + 1;
                }
                
                if (isPlayer) dirtyTroops.set(actor.uid, actor);
                if (target.uid) dirtyTroops.set(target.uid, target);
            });

            // Update UI
            setEnemies([...enemies]); 
            if (logUpdates.length > 0) setCombatLog(prev => [...prev, ...logUpdates].slice(-10));
            
            // Sync to DB
            updateDoc(combatRef, { enemies: enemies, active: !battleOver }).catch(()=>{});
            dirtyTroops.forEach(t => {
                updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', t.uid), { 
                    currentHp: t.currentHp, 
                    actionGauge: t.actionGauge,
                    battleKills: t.battleKills || 0,
                    combatHitCount: t.combatHitCount || 0,
                    combatAttackCount: t.combatAttackCount || 0
                }).catch(()=>{});
            });

            // Win/Loss Condition
            const aliveTroops = fighters.filter(t => t.currentHp > 0);
            const aliveEnemies = enemies.filter(e => e.currentHp > 0);
            
            if (battleOver || aliveTroops.length === 0 || aliveEnemies.length === 0) {
                // Prevent double execution
                if (!processingResult.current) {
                    processingResult.current = true; // LOCK
                    if (aliveTroops.length === 0) handleDefeat(fighters);
                    else handleVictory(fighters);
                }
            }
        }, 800);
        return () => clearInterval(interval);
    }, [gameState, enemies]);

    // --- Auto Battle Trigger ---
    useEffect(() => {
        if (gameState === 'victory' && autoBattle) {
            const timer = setTimeout(() => { 
                if (view === 'combat' && autoBattle) {
                    setupAndStartMission(); 
                }
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [gameState, autoBattle, view]);

    // --- Result Handlers ---
    const handleVictory = async (survivors) => {
        setGameState('victory');
        setCombatLog(prev => [...prev, "VICTORY! Found Rewards."]);
        const xpGain = 20;
        let newInv = [...inventoryRef.current];
        
        let dropChance = 0.1;
        const hasGloves = survivors.some(t => t.equipment?.gloves?.name === 'Slimey Gloves');
        if (hasGloves) dropChance *= 2; 
        
        if (Math.random() < dropChance) newInv.push({ id: generateId(), name: "Slime Paste", type: 'resource', desc: "Sticky. Cookable." });
        if (Math.random() < 0.05) newInv.push({ id: generateId(), name: "Slimey Gloves", type: 'gloves', stats: { def: 1 }, desc: "Sticky. Good for cooking." });
        if (Math.random() < 0.3) newInv.push({ id: generateId(), name: "Dull Sword", type: 'weapon', stats: { ap: 2, maxHp: -5 } });

        const updates = survivors.map(async (unit) => {
            if (unit.currentHp <= 0) return deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid));
            
            let newXp = (unit.xp || 0) + xpGain;
            let newLevel = unit.level;
            if (newLevel < MAX_LEVEL && newXp >= LEVEL_XP_CURVE[newLevel]) newLevel++;
            
            const effectiveStats = getEffectiveStats({ ...unit, level: newLevel });
            const currentLore = unit.lore || { missionsWon: 0, kills: 0, closeCalls: 0 };
            const isCloseCall = (unit.currentHp / effectiveStats.maxHp) <= 0.05;
            const newLore = { 
                missionsWon: (currentLore.missionsWon || 0) + 1, 
                kills: (currentLore.kills || 0) + (unit.battleKills || 0), 
                closeCalls: (currentLore.closeCalls || 0) + (isCloseCall ? 1 : 0) 
            };
            
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', unit.uid), { 
                xp: newXp, level: newLevel, lore: newLore, inCombat: false, actionGauge: 0 
            });
        });
        
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { gold: gold + 15, inventory: newInv });
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), { active: false });
        await Promise.all(updates);
    };

    const handleDefeat = async (party) => {
        setGameState('defeat');
        setAutoBattle(false);
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), { active: false });
        await Promise.all(party.map(u => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', u.uid))));
    };

    if (!user) return <AuthScreen />;

    const selectedUnit = troops.find(t => t.uid === selectedUnitId);

    return (
        <div className="h-full w-full bg-slate-900 text-slate-100 font-sans selection:bg-amber-900 pb-20 overflow-y-auto">
            <Header playerLevel={playerLevel} gold={gold} inventoryCount={inventory.length} />

            {showNameModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-600 max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">Identify Yourself</h2>
                        <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mb-4" placeholder="Warlord Name" />
                        <button onClick={saveName} className="w-full bg-amber-700 py-2 rounded font-bold">Confirm</button>
                    </div>
                </div>
            )}

            <main className="p-4 max-w-2xl mx-auto min-h-full">
                {view === 'barracks' && <Barracks troops={troops} profile={profile} maxTroops={maxTroops} setView={setView} setSelectedUnitId={setSelectedUnitId} />}
                {view === 'character_sheet' && <CharacterSheet user={user} unit={selectedUnit} inventory={inventory} setView={setView} appId={appId} />}
                {view === 'tavern' && <Tavern tavernState={tavernState} troops={troops} maxTroops={maxTroops} setView={setView} user={user} appId={appId} />}
                {view === 'skills' && <Skills troops={troops} user={user} appId={appId} />}
                {view === 'kitchen' && <Kitchen troops={troops} inventory={inventory} user={user} appId={appId} />}
                {view === 'mission_select' && <MissionSelect troops={troops} selectedTroops={selectedTroops} setSelectedTroops={setSelectedTroops} setView={setView} user={user} appId={appId} setEnemies={setEnemies} setGameState={setGameState} setCombatLog={setCombatLog} setAutoBattle={setAutoBattle} />}
                {view === 'combat' && <Combat troops={troops} enemies={enemies} gameState={gameState} setGameState={setGameState} setView={setView} autoBattle={autoBattle} setAutoBattle={setAutoBattle} combatLog={combatLog} />}
            </main>

            <Navbar currentView={view} setView={setView} gameState={gameState} />
        </div>
    );
}
