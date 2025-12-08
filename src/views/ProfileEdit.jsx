import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ProfileEdit({ user, appId, setView, setProfileUid }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'meta');
                const snap = await getDoc(ref);
                if (!mounted) return;
                const data = snap.exists() ? snap.data() : {};
                setDisplayName(data.displayName || '');
                setBio(data.bio || '');
                setAvatar(data.avatar || '');
            } catch (e) {
                console.error('Failed to load profile meta', e);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [user, appId]);

    const save = async () => {
        if (!displayName.trim()) {
            alert('Display name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'meta');
            await setDoc(ref, { displayName: displayName.trim(), bio: bio.trim(), avatar: avatar.trim() }, { merge: true });
            // After saving open the public profile view for this user
            if (typeof setProfileUid === 'function') setProfileUid(user.uid);
            setView('profile_public');
        } catch (e) {
            console.error('Failed to save profile', e);
            alert('Failed to save profile. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    if (!user) return <div className="text-sm text-slate-400">Please sign in to edit your profile.</div>;
    if (loading) return <div className="text-sm text-slate-400">Loading profile...</div>;

    return (
        <div className="space-y-4 animate-fade-in max-w-lg">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <div className="text-xs text-slate-400">Public info other players see</div>
            </div>

            <div className="bg-slate-800 p-4 rounded border border-slate-700 space-y-3">
                <label className="text-xs text-slate-400">Display Name</label>
                <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-slate-900 p-2 rounded border border-slate-700"
                    maxLength={32}
                />

                <label className="text-xs text-slate-400">Bio</label>
                <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-slate-900 p-2 rounded border border-slate-700"
                    rows={4}
                    maxLength={280}
                    placeholder="A short bio shown on your public profile"
                />

                <label className="text-xs text-slate-400">Avatar URL (optional)</label>
                <input
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    className="w-full bg-slate-900 p-2 rounded border border-slate-700"
                    placeholder="https://..."
                />

                <div className="flex gap-2 justify-end">
                    <button onClick={() => setView('profile_public')} className="px-3 py-2 bg-slate-700 rounded text-sm">Cancel</button>
                    <button onClick={save} disabled={saving} className="px-3 py-2 bg-amber-600 rounded text-sm font-bold">{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </div>
        </div>
    );
}