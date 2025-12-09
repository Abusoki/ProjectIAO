import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { X, Check, Gift, Clock } from 'lucide-react';

export default function CombatResult({ resultId, user, appId, onClose }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!resultId || !user) return;
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'system', 'combatResults', resultId);
                const snap = await getDoc(ref);
                if (!mounted) return;
                setResult(snap.exists() ? snap.data() : null);
            } catch (e) {
                console.error('Failed loading combat result', e);
                setResult(null);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [resultId, user, appId]);

    if (!resultId) return null;
    if (loading) return <div className="text-sm text-slate-400">Loading result...</div>;
    if (!result) return <div className="text-sm text-red-400">Result not found.</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xl font-bold">Mission Result</div>
                    <div className="text-xs text-slate-400">
                        {result.outcome === 'victory' ? <><Check className="inline" /> Victory</> : <><X className="inline" /> Defeat</>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1"><Clock size={12} /> {new Date(result.timestamp).toLocaleString()}</div>
                </div>
                <div>
                    <button onClick={onClose} className="px-3 py-1 rounded bg-slate-700 text-xs">Close</button>
                </div>
            </div>

            <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="font-semibold mb-2">Log</div>
                {result.log && result.log.length > 0 ? (
                    <div className="text-sm text-slate-300 space-y-1">
                        {result.log.map((l, i) => <div key={i} className="text-[13px]">{l}</div>)}
                    </div>
                ) : <div className="text-sm text-slate-500 italic">No log available.</div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="font-semibold mb-2">Survivors</div>
                    {result.survivors && result.survivors.length > 0 ? result.survivors.map(s => (
                        <div key={s.uid} className="flex justify-between text-sm text-slate-300 py-1 border-b last:border-b-0">
                            <div>
                                <div className="font-bold">{s.name}</div>
                                <div className="text-xs text-slate-400">Lvl {s.level || '—'}</div>
                            </div>
                            <div className="text-right">
                                <div>HP: {s.currentHp}</div>
                                <div className="text-xs text-slate-400">Kills: {s.battleKills || 0}</div>
                            </div>
                        </div>
                    )) : <div className="text-sm text-slate-500 italic">No survivors.</div>}
                </div>

                <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <div className="font-semibold mb-2">Loot</div>
                    {result.loot && result.loot.length > 0 ? result.loot.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-1 border-b last:border-b-0">
                            <Gift size={14} className="text-amber-400" />
                            <div>
                                <div className="font-bold">{l.name}</div>
                                <div className="text-xs text-slate-400">{l.type} {l.desc ? `• ${l.desc}` : ''}</div>
                            </div>
                        </div>
                    )) : <div className="text-sm text-slate-500 italic">No loot.</div>}
                </div>
            </div>
        </div>
    );
}