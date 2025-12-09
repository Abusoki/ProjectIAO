import React, { useEffect, useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateRecruit } from '../utils/mechanics';
import { TAVERN_REFRESH_MS } from '../config/gameData';
import { generateId } from '../utils/helpers';

export default function Tavern({ tavernState, troops, maxTroops, setView, user, appId }) {
    const [refreshing, setRefreshing] = useState(false);

    const createRecruits = () => Array.from({ length: 8 }, () => generateRecruit());

    const refreshTavern = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const newRecruits = createRecruits();
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), {
                recruits: newRecruits,
                nextRefresh: Date.now() + TAVERN_REFRESH_MS
            });
        } catch (e) {
            console.error('Failed to refresh tavern', e);
        } finally {
            setRefreshing(false);
        }
    };

    // Auto-refresh when nextRefresh is past due (runs client-side for the user's tavern doc)
    useEffect(() => {
        if (!tavernState || !tavernState.nextRefresh || !user) return;
        if (Date.now() >= tavernState.nextRefresh) {
            // debounced guard to avoid duplicate writes
            refreshTavern();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tavernState?.nextRefresh, user]);

    const recruitUnit = async (recruit) => {
        if (troops.length >= maxTroops) return;
        const { id, ...unitData } = recruit;
        try {
            // remove recruit from list and add as troop
            await Promise.all([
                updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'tavern'), {
                    recruits: (tavernState.recruits || []).filter(r => r.id !== recruit.id)
                }),
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'troops', generateId()), unitData)
            ]);
            setView('barracks');
        } catch (e) {
            console.error('Failed to recruit unit', e);
        }
    };

    const minutesToRefresh = tavernState?.nextRefresh ? Math.max(0, Math.floor((tavernState.nextRefresh - Date.now()) / 60000)) : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('barracks')} className="text-slate-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
                    <h2 className="text-xl font-bold">The Rusty Flagon</h2>
                </div>
                <div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {minutesToRefresh !== null ? `New recruits in ${minutesToRefresh}m` : 'Loading...'}
                </div>
            </div>

            <div className="grid gap-4">
                {tavernState?.recruits && tavernState.recruits.length > 0 ? (
                    tavernState.recruits.map(recruit => (
                        <div key={recruit.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold uppercase text-amber-500">{recruit.race} {recruit.class}</span></div>
                                    <h3 className="text-lg font-bold">{recruit.name}</h3>
                                    <div className="text-xs text-slate-400 mt-1 grid grid-cols-4 gap-2 w-full">
                                        <span title="HP">❤️ {recruit.baseStats.hp}</span>
                                        <span title="AP">⚔️ {recruit.baseStats.ap}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => recruitUnit(recruit)}
                                    disabled={troops.length >= maxTroops}
                                    className="bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded font-bold text-sm shadow-lg disabled:opacity-50"
                                >
                                    Hire
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-500 italic">The tavern is empty.</div>
                )}
            </div>
        </div>
    );
}
