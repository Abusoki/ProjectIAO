import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function FriendsInbox({ user, appId, setView, setProfileUid }) {
    const [requests, setRequests] = useState([]); // [{ uid, data, profile }]
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!user) return;
        const friendsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'friends');
        const q = query(friendsRef, where('status', '==', 'pending'));

        let mounted = true;
        const unsub = onSnapshot(q, async (snap) => {
            if (!mounted) return;
            const rows = [];
            const promises = [];
            snap.forEach(d => {
                const requesterUid = d.id;
                const data = d.data();
                // fetch public meta for requester
                const p = getDoc(doc(db, 'artifacts', appId, 'users', requesterUid, 'profile', 'meta'))
                    .then(metaSnap => ({ uid: requesterUid, data, profile: metaSnap.exists() ? metaSnap.data() : {} }))
                    .catch(() => ({ uid: requesterUid, data, profile: {} }));
                promises.push(p);
            });
            const resolved = await Promise.all(promises);
            if (!mounted) return;
            setRequests(resolved);
        }, (e) => {
            console.error('Inbox snapshot error', e);
            if (mounted) setRequests([]);
        });

        return () => { mounted = false; unsub(); };
    }, [user, appId]);

    if (!user) return <div className="text-sm text-slate-400">Please sign in to view incoming requests.</div>;

    const acceptRequest = async (requesterUid) => {
        if (!user) return;
        setBusy(true);
        try {
            // mark both sides accepted
            await Promise.all([
                setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', requesterUid), { status: 'accepted', at: Date.now() }, { merge: true }),
                setDoc(doc(db, 'artifacts', appId, 'users', requesterUid, 'friends', user.uid), { status: 'accepted', at: Date.now() }, { merge: true })
            ]);
        } catch (e) {
            console.error('Accept request failed', e);
            alert('Failed to accept request.');
        } finally {
            setBusy(false);
        }
    };

    const declineRequest = async (requesterUid) => {
        if (!user) return;
        if (!window.confirm('Decline this friend request?')) return;
        setBusy(true);
        try {
            await Promise.all([
                deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'friends', requesterUid)),
                deleteDoc(doc(db, 'artifacts', appId, 'users', requesterUid, 'friends', user.uid))
            ]);
        } catch (e) {
            console.error('Decline failed', e);
            alert('Failed to decline request.');
        } finally {
            setBusy(false);
        }
    };

    const openProfile = (uid) => {
        if (typeof setProfileUid === 'function') setProfileUid(uid);
        setView('profile_public');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Friend Requests</h2>
                <div className="text-xs text-slate-400">Incoming requests to accept or decline</div>
            </div>

            <div className="grid gap-2">
                {requests.length === 0 && <div className="text-sm text-slate-500 italic">No incoming requests.</div>}
                {requests.map(r => (
                    <div key={r.uid} className="bg-slate-800 p-3 rounded border border-slate-700 flex items-center justify-between">
                        <div>
                            <div className="font-bold">{r.profile?.displayName || r.uid}</div>
                            <div className="text-xs text-slate-400">{r.profile?.bio || 'No bio'}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Requested: {r.data?.at ? new Date(r.data.at).toLocaleString() : 'unknown'}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => openProfile(r.uid)} className="px-2 py-1 rounded bg-slate-700 text-xs">View</button>
                            <button onClick={() => acceptRequest(r.uid)} disabled={busy} className="px-2 py-1 rounded bg-emerald-700 text-xs">Accept</button>
                            <button onClick={() => declineRequest(r.uid)} disabled={busy} className="px-2 py-1 rounded bg-red-700 text-xs">Decline</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}