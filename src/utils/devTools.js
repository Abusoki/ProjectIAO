import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function resetAllUsersCombat(appId) {
    if (!confirm("DEV TOOL WARNING: This will iterate ALL users and reset their combat state. Continue?")) return;

    console.log("Starting global combat reset...");
    try {
        const usersRef = collection(db, 'artifacts', appId, 'users');
        const snap = await getDocs(usersRef);
        console.log(`Found ${snap.size} users.`);

        let processed = 0;
        const batchSize = 500;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const userDoc of snap.docs) {
            const uid = userDoc.id;

            // 1. Reset System Combat Flag
            const combatRef = doc(db, 'artifacts', appId, 'users', uid, 'system', 'combat');
            batch.update(combatRef, { active: false });
            batchCount++;

            // 2. Reset Troops InCombat Flag (Need sub-collection fetch - expensive!)
            // Optimally we should just fix the system flag first as that gates the UI loop.
            // But let's do a shallow fetch for troops if needed. 
            // Actually, for a quick fix, resetting 'active: false' on system/combat is usually enough to break the loop UI-side.
            // Marking troops as available again requires fetching them.
            // Let's do it properly for the requested "push out of combat".

            const troopsRef = collection(db, 'artifacts', appId, 'users', uid, 'troops');
            const troopsSnap = await getDocs(troopsRef); // Warning: N+1 queries here. Very expensive for many users.

            troopsSnap.forEach(t => {
                if (t.data().inCombat) {
                    batch.update(t.ref, { inCombat: false, actionGauge: 0 });
                    batchCount++;
                }
            });

            if (batchCount >= batchSize) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
                console.log(`Committed batch...`);
            }

            processed++;
            if (processed % 10 === 0) console.log(`Processed ${processed} users...`);
        }

        if (batchCount > 0) await batch.commit();
        alert(`Finished resetting combat for ${processed} users.`);

    } catch (e) {
        console.error("Global Reset Failed", e);
        alert("Global Reset Failed: " + e.message);
    }
}
