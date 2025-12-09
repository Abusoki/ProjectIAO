import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, getDoc, setDoc, deleteDoc, updateDoc, getCountFromServer, writeBatch } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import { generateRecruit } from './utils/mechanics';
import { TAVERN_REFRESH_MS, MISSIONS } from './config/gameData';

// Hooks
import { useGameLoop } from './hooks/useGameLoop';
import { useCombat } from './hooks/useCombat';

// Components
import AuthScreen from './components/AuthScreen';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Barracks from './views/Barracks';
import CharacterSheet from './views/CharacterSheet';
import Tavern from './views/Tavern';
import Skills from './views/Skills';
import MissionSelect from './views/MissionSelect';
import Combat from './views/Combat';
import Inventory from './views/Inventory';
import Jobs from './views/Jobs';
import ProfilesSearch from './views/ProfilesSearch';
import ProfilePublic from './views/ProfilePublic';
import ProfileEdit from './views/ProfileEdit';

import FriendsInbox from './views/FriendsInbox';
import About from './views/About';
import ChangeLog from './views/ChangeLog';

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
    const [profileUid, setProfileUid] = useState(null);
    const [userCount, setUserCount] = useState(0);

    // Combat State
    const [gameState, setGameState] = useState('idle');
    const [selectedTroops, setSelectedTroops] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [autoBattle, setAutoBattle] = useState(false);

    // Auto-battle tracking
    const [lastMissionKey, setLastMissionKey] = useState(null);

    const [showNameModal, setShowNameModal] = useState(false);
    const [newName, setNewName] = useState("");

    const troopsRef = useRef(troops);
    const gameStateRef = useRef(gameState);

    useEffect(() => { troopsRef.current = troops; }, [troops]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const playerLevel = troops.reduce((acc, t) => acc + t.level, 0);
    // Grant a 5th slot once total player level reaches 20.
    const maxTroops = playerLevel >= 20 ? 5 : (playerLevel >= 10 ? 4 : 3);

    // --- State Wrapper for Cleanup ---
    const handleGameStateChange = async (newState) => {
        setGameState(newState);
        if (newState === 'idle') {
            const activeTroops = troopsRef.current.filter(t => t.inCombat);

            const batch = writeBatch(db);
            let ops = 0;

            if (activeTroops.length > 0) {
                activeTroops.forEach(t => {
                    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'troops', t.uid);
                    batch.update(ref, { inCombat: false, actionGauge: 0 });
                    ops++;
                });
            }

            const combatRef = doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat');
            batch.update(combatRef, { active: false });
            ops++;

            if (ops > 0) await batch.commit().catch(e => console.error("Cleanup error", e));
        }
    };

    // --- Hooks Logic ---
    useGameLoop(user, troops, inventory, gameState, profile, setTroops);

    const { combatLog, setCombatLog, damageEvents, currentLoot } = useCombat(
        user, troops, enemies, gameState, handleGameStateChange, setEnemies, setView, selectedTroops, inventory, autoBattle, setAutoBattle, setTroops
    );

    // --- MAIN COMBAT START FUNCTION ---
    const startCombat = async (missionKey) => {
        try {
            const currentTroops = troopsRef.current;
            let validSelectedIds = selectedTroops.filter(id => currentTroops.find(t => t.uid === id));

            const mission = MISSIONS[missionKey];
            if (!mission) {
                console.error("Unknown mission key:", missionKey);
                return;
            }

            // Party size checks
            if (validSelectedIds.length < (mission.minParty || 1)) {
                alert(`This mission requires at least ${mission.minParty} character(s).`);
                setAutoBattle(false);
                return;
            }
            if (validSelectedIds.length > (mission.maxParty || 4)) {
                // Trim to allowed party size
                validSelectedIds = validSelectedIds.slice(0, mission.maxParty);
            }

            if (validSelectedIds.length === 0) {
                setAutoBattle(false);
                return;
            }

            setLastMissionKey(missionKey);

            // Determine enemy count from mission if provided
            const minSpawn = mission.spawnMin || 1;
            const maxSpawn = mission.spawnMax || Math.max(1, Math.floor(Math.random() * 4) + 1);
            const enemyCount = Math.floor(Math.random() * (maxSpawn - minSpawn + 1)) + minSpawn;

            const newEnemies = Array.from({ length: enemyCount }, (_, i) => {
                const mk = mission.enemyType;
                if (mk === 'golem') {
                    return { type: mk, id: `golem_${i}`, name: `Rock Golem ${i + 1}`, maxHp: 80, currentHp: 80, ap: 15, def: 5, spd: 4, actionGauge: Math.random() * 20 };
                }
                if (mk === 'blob') {
                    return { type: mk, id: `blob_${i}`, name: `Bloblin ${i + 1}`, maxHp: 40, currentHp: 40, ap: 8, def: 0, spd: 8, actionGauge: Math.random() * 50 };
                }
                if (mk === 'rat') {
                    return { type: mk, id: `rat_${i}`, name: `Giant Rat ${i + 1}`, maxHp: 22, currentHp: 22, ap: 4, def: 0, spd: 10, actionGauge: Math.random() * 50 };
                }
                if (mk === 'ice_imp') {
                    return { type: mk, id: `ice_imp_${i}`, name: `Ice Imp ${i + 1}`, maxHp: 50, currentHp: 50, ap: 10, def: 2, spd: 10, actionGauge: Math.random() * 40 };
                }
                if (mk === 'dummy') {
                    return { type: mk, id: `dummy_0`, name: `Training Dummy`, maxHp: 100, currentHp: 100, ap: 1, def: 9999, spd: 0, actionGauge: 0 };
                }
                // fallback
                return { id: `mob_${i}`, name: `Foe ${i + 1}`, maxHp: 30, currentHp: 30, ap: 6, def: 0, spd: 8, actionGauge: Math.random() * 50 };
            });

            // Batch Updates
            const batch = writeBatch(db);

            // 1. Mark troops as inCombat
            validSelectedIds.forEach(uid => {
                const tRef = doc(db, 'artifacts', appId, 'users', user.uid, 'troops', uid);
                batch.update(tRef, { inCombat: true, actionGauge: 0, battleKills: 0, combatHitCount: 0, combatAttackCount: 0 });
            });

            // 2. Create Combat Session
            const combatRef = doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat');
            batch.set(combatRef, {
                active: true, enemies: newEnemies, troopIds: validSelectedIds, log: [`Deployed to ${mission.name}`], tick: 0
            });

            await batch.commit();

            // 3. Update Local State
            // We rely entirely on the snapshot listener to switch state to 'fighting'
            // This prevents "Fighting -> False -> Victory" loops and race conditions.
            setCombatLog([`Deployed to ${mission.name}`]);
        } catch (e) {
            console.error("Combat Start Error", e);
            alert("Failed to start combat. Please check console.");
            setGameState('idle');
        }
    };

    // --- Auto Battle Trigger ---
    useEffect(() => {
        if (gameState === 'victory' && autoBattle && lastMissionKey) {
            const timer = setTimeout(() => {
                if (view === 'combat' && autoBattle) {
                    startCombat(lastMissionKey);
                }
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [gameState, autoBattle, view, lastMissionKey]);

    // --- Auth & Data ---
    useEffect(() => {
        return onAuthStateChanged(auth, async (u) => {
            setUser(u);
        });
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'meta'), (snap) => {
            if (!snap.exists() || !snap.data().displayName) {
                setShowNameModal(true);
            } else {
                setProfile(snap.data());
            }
        });
        return () => unsub();
    }, [user]);

    const saveName = async () => {
        if (!newName.trim()) return;
        const p = { displayName: newName };
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'meta'), p, { merge: true });
        setProfile(p);
        setShowNameModal(false);
    };

    // --- Listeners ---
    useEffect(() => {
        if (!user) return;

        const unsubTroops = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'troops'), (snap) => {
            if (gameStateRef.current === 'fighting') return;
            const t = [];
            snap.forEach(doc => t.push({ ...doc.data(), uid: doc.id }));
            setTroops(t);
        });

        const unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), (snap) => {
            if (snap.exists()) {
                setInventory(snap.data().inventory || []);
                setGold(snap.data().gold || 100);
            } else {
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { inventory: [], gold: 100 });
            }
        });

        const unsubBattle = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.active) {
                    console.log("COMBAT LISTENER: Active=true. GameStateRef:", gameStateRef.current);
                    // FIX v2: STRICTER CHECK. Only start fighting if we are IDLE or VICTORY.
                    // Allowing 'victory' lets Auto-Battle restart the loop.
                    if (gameStateRef.current === 'idle' || gameStateRef.current === 'victory') {
                        setEnemies(data.enemies);
                        if (data.troopIds) {
                            setSelectedTroops(data.troopIds);
                            // ATOMIC SYNC: Force update troops to combat mode so useCombat sees them immediately,
                            // ignoring the race condition with the main troops listener.
                            setTroops(prev => prev.map(t =>
                                data.troopIds.includes(t.uid) ? { ...t, inCombat: true, actionGauge: 0 } : t
                            ));
                        }
                        console.log("COMBAT LISTENER: Setting fighting state");
                        setGameState('fighting');
                        setView('combat'); // Force view switch if not already
                    }
                } else if (gameStateRef.current === 'fighting') {
                    console.log("COMBAT LISTENER: Active=false but State=fighting. Triggering victory.");
                    // If DB says not active, but we are fighting, it means we won/lost elsewhere or need to finish
                    setGameState('victory');
                }
            }
        });

        const unsubTavern = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), (snap) => {
            if (snap.exists()) setTavernState(snap.data());
            else {
                const newRecruits = Array.from({ length: 8 }, () => generateRecruit());
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), { recruits: newRecruits, nextRefresh: Date.now() + TAVERN_REFRESH_MS });
            }
        });

        const heartbeat = setInterval(() => {
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { lastOnline: Date.now() }).catch(() => { });
        }, 300000);

        return () => { unsubTroops(); unsubProfile(); unsubTavern(); unsubBattle(); clearInterval(heartbeat); };
    }, [user]);

    // useEffect(() => {
    //     getCountFromServer(collection(db, 'artifacts', appId, 'users')).then(snap => {
    //         setUserCount(snap.data().count);
    //     }).catch(err => console.error("Failed to get user count", err));
    // }, []);


    if (!user) return <AuthScreen />;

    const selectedUnit = troops.find(t => t.uid === selectedUnitId);

    return (
        <div className="h-full w-full bg-slate-900 text-slate-100 font-sans selection:bg-amber-900 pb-20 overflow-y-auto">
            <Header playerLevel={playerLevel} gold={gold} inventoryCount={inventory.length} setView={setView} userCount={userCount} />

            {showNameModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-600 max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">Identify Yourself</h2>
                        <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mb-4" placeholder="Warlord Name" />
                        <button onClick={saveName} className="w-full bg-amber-700 py-2 rounded font-bold">Confirm</button>
                    </div>
                </div>
            )}

            <main className="p-4 max-w-2xl mx-auto min-h-full relative">
                {view === 'barracks' && <Barracks troops={troops} profile={profile} maxTroops={maxTroops} setView={setView} setSelectedUnitId={setSelectedUnitId} />}
                {view === 'character_sheet' && <CharacterSheet user={user} unit={selectedUnit} inventory={inventory} setView={setView} appId={appId} />}
                {view === 'inventory' && <Inventory inventory={inventory} troops={troops} user={user} appId={appId} />}
                {view === 'tavern' && <Tavern tavernState={tavernState} troops={troops} maxTroops={maxTroops} setView={setView} user={user} appId={appId} />}
                {view === 'skills' && <Skills troops={troops} user={user} appId={appId} />}
                {view === 'kitchen' && <Kitchen troops={troops} inventory={inventory} user={user} appId={appId} />}
                {view === 'smithing' && <Smithing troops={troops} inventory={inventory} user={user} appId={appId} />}

                {view === 'mission_select' && <MissionSelect
                    troops={troops}
                    selectedTroops={selectedTroops}
                    setSelectedTroops={setSelectedTroops}
                    setView={setView}
                    user={user}
                    appId={appId}
                    setEnemies={setEnemies}
                    setGameState={setGameState}
                    setCombatLog={setCombatLog}
                    setAutoBattle={setAutoBattle}
                    startMission={startCombat}
                />}

                {view === 'combat' && <Combat
                    troops={troops}
                    enemies={enemies}
                    gameState={gameState}
                    setGameState={handleGameStateChange}
                    setView={setView}
                    autoBattle={autoBattle}
                    setAutoBattle={setAutoBattle}
                    combatLog={combatLog}
                    damageEvents={damageEvents}
                    currentLoot={currentLoot}
                />}

                {view === 'jobs' && <Jobs troops={troops} inventory={inventory} user={user} appId={appId} />}
                {view === 'profiles_search' && <ProfilesSearch user={user} appId={appId} setView={setView} setProfileUid={setProfileUid} />}
                {view === 'friends_inbox' && <FriendsInbox user={user} appId={appId} setView={setView} setProfileUid={setProfileUid} />}
                {view === 'profile_public' && profileUid && <ProfilePublic profileUid={profileUid} user={user} appId={appId} setView={setView} setProfileUid={setProfileUid} />}
                {view === 'profile_edit' && <ProfileEdit user={user} appId={appId} setView={setView} setProfileUid={setProfileUid} />}
                {view === 'about' && <About setView={setView} appId={appId} />}
                {view === 'changelog' && <ChangeLog setView={setView} />}
            </main>

            <Navbar currentView={view} setView={setView} gameState={gameState} user={user} setProfileUid={setProfileUid} />
        </div>
    );
}
