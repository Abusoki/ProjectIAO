import React, { useState } from 'react';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import {
  collectionGroup,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ProfilesSearch({ user, appId, setView, setProfileUid }) {
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  // Normalization helper
  const normalize = (s) => (s || '').toString().trim().normalize('NFKC').toLowerCase();

  // Chunk helper to throttle parallel fetches
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  // Fallback: read per-user meta documents and filter client-side.
  // Use batching/chunking to avoid blasting Firestore.
  const fallbackFetchAndFilter = async (qLower) => {
    // Try cached results in sessionStorage first (simple cache)
    try {
      const cacheKey = `profiles_meta_cache_v1`;
      const raw = sessionStorage.getItem(cacheKey);
      let usersMeta = null;
      if (raw) usersMeta = JSON.parse(raw);

      if (!usersMeta) {
        // list user docs under artifacts/{appId}/users
        const usersRef = collection(db, 'artifacts', appId, 'users');
        const usersSnap = await getDocs(usersRef);
        const uids = usersSnap.docs.map(d => d.id);

        // fetch meta docs in batches (50 concurrent)
        usersMeta = [];
        const batches = chunk(uids, 50);
        for (const b of batches) {
          const prom = b.map(uid => getDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'meta'))
            .then(s => ({ uid, data: s.exists() ? s.data() : null }))
            .catch(() => ({ uid, data: null }))
          );
          const res = await Promise.all(prom);
          res.forEach(r => {
            if (r.data) usersMeta.push({ uid: r.uid, ...r.data });
          });
          // small pause to reduce burst pressure
          await new Promise(r => setTimeout(r, 100));
        }
        // cache for this session
        try { sessionStorage.setItem(cacheKey, JSON.stringify(usersMeta)); } catch {}
      }

      // filter by normalized name prefix
      const filtered = usersMeta.filter(m => {
        const nameLower = (m.displayNameLower || normalize(m.displayName));
        return nameLower && nameLower.startsWith(qLower);
      }).slice(0, 50);

      setResults(filtered);
    } catch (e) {
      console.error('Fallback search failed', e);
      setResults([]);
    }
  };

  const performSearch = async () => {
    const q = (term || '').trim();
    if (q.length === 0) return setResults([]);
    setLoading(true);
    const qLower = normalize(q);

    // First try the indexed collectionGroup query (fast, but may error if index missing)
    try {
      const cg = collectionGroup(db, 'meta');
      const qUpperBound = qLower + '\uf8ff';
      const qry = query(cg, where('displayNameLower', '>=', qLower), where('displayNameLower', '<=', qUpperBound), orderBy('displayNameLower'), limit(50));
      const snap = await getDocs(qry);
      const rows = [];
      snap.forEach(d => {
        const pathSegments = d.ref.path.split('/');
        const uidIndex = pathSegments.indexOf('users') + 1;
        const uid = uidIndex > 0 ? pathSegments[uidIndex] : null;
        rows.push({ uid, ...d.data() });
      });
      setResults(rows);
    } catch (e) {
      // If index not available (or other errors), fall back to client-side scan
      console.warn('Indexed search failed, falling back to client-side scan:', e.message || e);
      await fallbackFetchAndFilter(qLower);
    } finally {
      setLoading(false);
    }
  };

  const getFriendStatus = async (targetUid) => {
    if (!user) return null;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'friends', targetUid);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data().status : null;
  };

  const sendRequest = async (targetUid) => {
    if (!user) return;
    setBusy(true);
    try {
      const myRef = doc(db, 'artifacts', appId, 'users', user.uid, 'friends', targetUid);
      const theirRef = doc(db, 'artifacts', appId, 'users', targetUid, 'friends', user.uid);
      await Promise.all([
        setDoc(myRef, { status: 'requested', at: Date.now() }, { merge: true }),
        setDoc(theirRef, { status: 'pending', from: user.uid, at: Date.now() }, { merge: true })
      ]);
    } catch (e) {
      console.error('Friend request failed', e);
      alert('Failed to send friend request.');
    } finally {
      setBusy(false);
    }
  };

  const cancelRequestOrUnfriend = async (targetUid) => {
    if (!user) return;
    setBusy(true);
    try {
      const myRef = doc(db, 'artifacts', appId, 'users', user.uid, 'friends', targetUid);
      const theirRef = doc(db, 'artifacts', appId, 'users', targetUid, 'friends', user.uid);
      await Promise.all([ deleteDoc(myRef), deleteDoc(theirRef) ]);
    } catch (e) {
      console.error('Cancel/unfriend failed', e);
      alert('Failed to update friendship.');
    } finally {
      setBusy(false);
    }
  };

  const openProfile = (uid) => {
    setProfileUid(uid);
    setView('profile_public');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Search players by name"
          className="flex-1 bg-slate-800 p-2 rounded border border-slate-700"
        />
        <button onClick={performSearch} className="px-3 py-2 bg-amber-600 rounded text-sm font-bold">
          <Search size={14} /> Search
        </button>
      </div>

      {loading ? <div className="text-sm text-slate-400">Searching...</div> : (
        <div className="grid gap-2">
          {results.length === 0 && <div className="text-sm text-slate-500">No results</div>}
          {results.map(r => (
            <div key={r.uid} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
              <div>
                <div className="font-bold">{r.displayName || '(Unnamed)'}</div>
                <div className="text-xs text-slate-400">{r.bio || ''}</div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openProfile(r.uid)} className="px-2 py-1 rounded bg-slate-700 text-xs">View</button>
                {user && user.uid !== r.uid && (
                  <FriendAction
                    targetUid={r.uid}
                    getFriendStatus={getFriendStatus}
                    sendRequest={sendRequest}
                    cancelRequestOrUnfriend={cancelRequestOrUnfriend}
                    busy={busy}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendAction({ targetUid, getFriendStatus, sendRequest, cancelRequestOrUnfriend, busy }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await getFriendStatus(targetUid);
      setStatus(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { refresh(); }, [targetUid]);

  if (loading) return <div className="text-xs text-slate-400">...</div>;

  if (!status) {
    return <button disabled={busy} onClick={() => sendRequest(targetUid).then(refresh)} className="px-2 py-1 rounded bg-emerald-700 text-xs flex items-center gap-1"><UserPlus size={14}/> Add</button>;
  }

  if (status === 'pending') return <button disabled className="px-2 py-1 rounded bg-yellow-600 text-xs">Pending</button>;
  if (status === 'requested') return <button disabled className="px-2 py-1 rounded bg-slate-600 text-xs">Requested</button>;
  if (status === 'accepted') return <button onClick={() => cancelRequestOrUnfriend(targetUid).then(refresh)} className="px-2 py-1 rounded bg-red-700 text-xs flex items-center gap-1"><UserCheck size={14}/> Friend</button>;

  return <button disabled className="px-2 py-1 rounded bg-slate-600 text-xs">...</button>;
}