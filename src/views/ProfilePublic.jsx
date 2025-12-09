import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MessageSquare, Edit, User, Users, Sword, Shield, Utensils, Hammer, Lock, Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../config/gameData';

export default function ProfilePublic({ profileUid, user, appId, setView, setProfileUid }) {
    const [profile, setProfile] = useState(null);
    const [troopsPreview, setTroopsPreview] = useState([]); // top N for preview
    const [totalMissions, setTotalMissions] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profileUid) return;
        setLoading(true);
        (async () => {
            try {
                const metaRef = doc(db, 'artifacts', appId, 'users', profileUid, 'profile', 'meta');
                const metaSnap = await getDoc(metaRef);
                setProfile(metaSnap.exists() ? metaSnap.data() : { displayName: '(Unknown)' });

                const troopsRef = collection(db, 'artifacts', appId, 'users', profileUid, 'troops');
                const q = query(troopsRef, orderBy('level', 'desc'));
                const snap = await getDocs(q);
                const all = [];
                snap.forEach(d => all.push({ uid: d.id, ...d.data() }));

                // preview top 6
                setTroopsPreview(all.slice(0, 6));

                // total missions completed across all troops
                const total = all.reduce((acc, t) => acc + (t.lore?.missionsWon || 0), 0);
                setTotalMissions(total);
            } catch (e) {
                console.error('Failed loading profile', e);
                setProfile({ displayName: '(Unknown)' });
                setTroopsPreview([]);
                setTotalMissions(0);
            } finally {
                setLoading(false);
            }
        })();
    }, [profileUid]);

    if (!profileUid) return null;
    if (loading) return <div className="text-sm text-slate-400">Loading profile...</div>;

    const isMe = user && user.uid === profileUid;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">{profile.displayName || '(Unnamed)'}</h2>
                    <div className="text-xs text-slate-400">{profile.bio || ''}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Missions Completed: <span className="font-semibold text-amber-400">{totalMissions}</span></div>
                </div>
                <div className="flex gap-2">
                    {isMe && (
                        <button onClick={() => { setProfileUid(profileUid); setView('profile_edit'); }} className="px-3 py-1 bg-slate-700 rounded text-xs flex items-center gap-2">
                            <Edit size={14} /> Edit
                        </button>
                    )}
                    <button onClick={() => alert('Messaging is not implemented yet')} className="px-3 py-1 bg-slate-700 rounded text-xs flex items-center gap-2"><MessageSquare size={14} />Message</button>
                </div>
            </div>

            <div>
                <h3 className="text-sm text-slate-300 mb-2">Roster Preview</h3>
                {troopsPreview.length === 0 ? <div className="text-sm text-slate-500 italic">No units.</div> : (
                    <div className="grid grid-cols-2 gap-2">
                        {troopsPreview.map(t => (
                            <div key={t.uid} className="bg-slate-800 p-3 rounded border border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold">{t.name}</div>
                                        <div className="text-xs text-slate-400">Lvl {t.level}   {t.race} {t.class}</div>
                                        <div className="text-[11px] text-slate-400 mt-2">Kills: <span className="font-semibold">{t.lore?.kills || 0}</span></div>
                                        <div className="text-[11px] text-slate-400">Missions: <span className="font-semibold">{t.lore?.missionsWon || 0}</span></div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {/* quick stats block */}
                                        <div className="text-right">HP: {t.currentHp}/{t.baseStats?.maxHp || '-'}</div>
                                        <div className="text-right mt-2">{t.equipment ? Object.keys(t.equipment).length : 0} gear</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm text-slate-300 mb-2 flex items-center gap-2"><Award size={16} /> Achievements</h3>
                <div className="grid grid-cols-2 gap-2">
                    {ACHIEVEMENTS.map(ach => {
                        const unlocked = (profile.achievements || []).includes(ach.id);
                        const Icon = { User, Users, Sword, Shield, Utensils, Hammer }[ach.icon] || Award;

                        return (
                            <div key={ach.id} className={`p-2 rounded border flex items-center gap-3 ${unlocked ? 'bg-slate-800 border-amber-900/50' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                                <div className={`p-2 rounded-full ${unlocked ? 'bg-amber-900/30 text-amber-500' : 'bg-slate-800 text-slate-600'}`}>
                                    {unlocked ? <Icon size={18} /> : <Lock size={18} />}
                                </div>
                                <div>
                                    <div className={`text-sm font-bold ${unlocked ? 'text-amber-100' : 'text-slate-500'}`}>{ach.name}</div>
                                    <div className="text-xs text-slate-500 leading-tight">{ach.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
