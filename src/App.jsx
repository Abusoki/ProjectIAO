    import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
import Kitchen from './views/Kitchen';
import Smithing from './views/Smithing';
import MissionSelect from './views/MissionSelect';
import Combat from './views/Combat';
import Inventory from './views/Inventory';
import Jobs from './views/Jobs';

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
    const maxTroops = playerLevel >= 10 ? 4 : 3;

    // --- State Wrapper for Cleanup ---
    const handleGameStateChange = (newState) => {
        setGameState(newState);
        if (newState === 'idle') {
            const activeTroops = troopsRef.current.filter(t => t.inCombat);
            if (activeTroops.length > 0) {
                activeTroops.forEach(t => {
                    updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', t.uid), {
                        inCombat: false, actionGauge: 0
                    }).catch(e => console.error("Cleanup error", e));
                });
            }
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), { active: false })
                .catch(e => console.error("Cleanup error", e));
        }
    };

    // --- Hooks Logic ---
    useGameLoop(user, troops, inventory, gameState);

    const { combatLog, setCombatLog, damageEvents } = useCombat(
        user, troops, enemies, gameState, handleGameStateChange, setEnemies, setView, selectedTroops, inventory, autoBattle, setAutoBattle
    );

    // --- MAIN COMBAT START FUNCTION ---
    const startCombat = async (missionKey) => {
        const currentTroops = troopsRef.current;
        const validSelectedIds = selectedTroops.filter(id => currentTroops.find(t => t.uid === id));

        if (validSelectedIds.length === 0) {
            setAutoBattle(false);
            return;
        }

        setLastMissionKey(missionKey);

        const mission = MISSIONS[missionKey];

        // 1. Mark troops as inCombat
        const updates = validSelectedIds.map(uid =>
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', uid), {
                inCombat: true, actionGauge: 0, battleKills: 0, combatHitCount: 0, combatAttackCount: 0
            })
        );
        await Promise.all(updates);

        // 2. Create Combat Session in DB
        const enemyCount = Math.floor(Math.random() * 4) + 1;
        const newEnemies = Array.from({ length: enemyCount }, (_, i) => {
            if (mission.enemyType === 'golem') {
                return { id: `golem_${i}`, name: `Rock Golem ${i+1}`, maxHp: 80, currentHp: 80, ap: 15, def: 5, spd: 4, actionGauge: Math.random() * 20 };
            }
            return { id: `blob_${i}`, name: `Bloblin ${i+1}`, maxHp: 40, currentHp: 40, ap: 8, def: 0, spd: 8, actionGauge: Math.random() * 50 };
        });

        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combat'), {
            active: true, enemies: newEnemies, troopIds: validSelectedIds, log: [`Deployed to ${mission.name}`], tick: 0
        });

        // 3. Update Local State
        setEnemies(newEnemies);
        setGameState('fighting');
        setCombatLog([`Deployed to ${mission.name}`]);
        setView('combat');
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
            if (u) {
                const profRef = doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'meta');
                const snap = await getDoc(profRef);
                if (!snap.exists() || !snap.data().displayName) setShowNameModal(true);
                else setProfile(snap.data());
            }
        });
    }, []);

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
                    setEnemies(data.enemies);
                    if (data.troopIds) setSelectedTroops(data.troopIds);
                    setGameState('fighting');
                } else if (gameStateRef.current === 'fighting') {
                    setGameState('victory');
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
            updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), { lastOnline: Date.now() }).catch(() => { });
        }, 15000);

        return () => { unsubTroops(); unsubProfile(); unsubTavern(); unsubBattle(); clearInterval(heartbeat); };
    }, [user]);

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

            <main className="p-4 max-w-2xl mx-auto min-h-full relative">
                {view === 'barracks' && <Barracks troops={troops} profile={profile} maxTroops={maxTroops} setView={setView} setSelectedUnitId={setSelectedUnitId} />}
                {view === 'character_sheet' && <CharacterSheet user={user} unit={selectedUnit} inventory={inventory} setView={setView} appId={appId} />}
                {view === 'inventory' && <Inventory inventory={inventory} user={user} appId={appId} />}
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
                />}

                {view === 'jobs' && <Jobs troops={troops} inventory={inventory} user={user} appId={appId} />}
            </main>

            <Navbar currentView={view} setView={setView} gameState={gameState} />
        </div>
    );
}
