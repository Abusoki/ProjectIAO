import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MessageSquare } from 'lucide-react';

export default function ProfilePublic({ profileUid, user, appId, setView }) {
  const [profile, setProfile] = useState(null);
  const [troops, setTroops] = useState([]);
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
        const arr = [];
        snap.forEach(d => arr.push({ uid: d.id, ...d.data() }));
        setTroops(arr.slice(0, 6));
      } catch (e) {
        console.error('Failed loading profile', e);
        setProfile({ displayName: '(Unknown)' });
      } finally {
        setLoading(false);
      }
    })();
  }, [profileUid]);

  if (!profileUid) return null;
  if (loading) return <div className="text-sm text-slate-400">Loading profile...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{profile.displayName || '(Unnamed)'}</h2>
          <div className="text-xs text-slate-400">{profile.bio || ''}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert('Messaging is not implemented yet')} className="px-3 py-1 bg-slate-700 rounded text-xs flex items-center gap-2"><MessageSquare size={14}/>Message</button>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-slate-300 mb-2">Roster Preview</h3>
        {troops.length === 0 ? <div className="text-sm text-slate-500 italic">No units.</div> : (
          <div className="grid grid-cols-2 gap-2">
            {troops.map(t => (
              <div key={t.uid} className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-slate-400">Lvl {t.level}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}