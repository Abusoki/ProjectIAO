import { useEffect, useRef } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { SKILL_XP_CURVE, MAX_COOKING_LEVEL, SMITHING_RECIPES, ACHIEVEMENTS } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useGameLoop(user, troops, inventory, gameState, profile, setTroops) {
    const troopsRef = useRef(troops);
    const inventoryRef = useRef(inventory);

    useEffect(() => { troopsRef.current = troops; }, [troops]);
    useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

    // 3. ACHIEVEMENT CHECK LOOPS
    useEffect(() => {
        if (!user || !profile) return;

        const unlocked = profile.achievements || [];
        const newUnlocks = [];

        // Helper to check if already unlocked
        const isLocked = (id) => !unlocked.includes(id);

        // 1. First Recruit
        if (isLocked('first_recruit') && troops.length >= 1) newUnlocks.push('first_recruit');

        // 2. Full Squad
        if (isLocked('full_squad') && troops.length >= 4) newUnlocks.push('full_squad');

        // Calculate aggregate stats
        const totalWins = troops.reduce((acc, t) => acc + (t.lore?.missionsWon || 0), 0);

        // 3. First Blood
        if (isLocked('first_blood') && totalWins >= 1) newUnlocks.push('first_blood');

        // 4. Veteran
        if (isLocked('veteran') && totalWins >= 10) newUnlocks.push('veteran');

        // 5. Master Chef
        if (isLocked('master_chef') && troops.some(t => (t.cooking?.level || 1) >= 5)) newUnlocks.push('master_chef');

        // 6. Blacksmith
        if (isLocked('blacksmith') && troops.some(t => (t.smithing?.level || 1) >= 5)) newUnlocks.push('blacksmith');

        if (newUnlocks.length > 0) {
            const updated = [...unlocked, ...newUnlocks];
            updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'meta'), {
                achievements: updated
            });
        }

        // --- TITLES CHECK ---
        const unlockedTitles = profile.unlockedTitles || [];
        const newTitles = [];
        const hasTitle = (id) => unlockedTitles.includes(id);

        if (!hasTitle('Bloblin Slayer') && (profile.totalBloblinKills || 0) >= 1000) newTitles.push('Bloblin Slayer');
        if (!hasTitle('Expendable') && (profile.totalTroopDeaths || 0) >= 5) newTitles.push('Expendable');

        if (newTitles.length > 0) {
            updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'meta'), {
                unlockedTitles: [...unlockedTitles, ...newTitles]
            });
        }
    }, [user, troops, inventory, gameState, profile]);

    // 1. REGEN LOOP (Batched every 5s)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            if (gameState === 'fighting') return;

            const currentTroops = troopsRef.current;

            // Check current troops
            const needsHealing = currentTroops.filter(t =>
                t.currentHp > 0 &&
                t.activity === 'idle' &&
                !t.inCombat &&
                t.currentHp < getEffectiveStats(t).maxHp
            );

            if (needsHealing.length === 0) return;

            // Batch updates
            const batch = writeBatch(db);
            let ops = 0;

            // Local Optimistic Update
            let updatedTroops = [...currentTroops];
            let hasLocalChanges = false;

            needsHealing.forEach(t => {
                const stats = getEffectiveStats(t);
                const newHp = Math.min(stats.maxHp, t.currentHp + 1);

                // Add to batch
                const ref = doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', t.uid);
                batch.update(ref, { currentHp: newHp });
                ops++;

                // Update local state copy
                const idx = updatedTroops.findIndex(ut => ut.uid === t.uid);
                if (idx > -1) {
                    updatedTroops[idx] = { ...updatedTroops[idx], currentHp: newHp };
                    hasLocalChanges = true;
                }
            });

            if (ops > 0) {
                if (hasLocalChanges && setTroops) setTroops(updatedTroops);
                await batch.commit().catch(console.error);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [user, gameState, setTroops]);

    // 2. CRAFTING LOOP (Cooking & Smithing) - Optimistic Local Updates
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            const currentTroops = troopsRef.current;
            const currentInventory = inventoryRef.current;

            const crafters = currentTroops.filter(t => t.activity === 'cooking' || t.activity === 'smithing');
            if (crafters.length === 0) return;

            let workingInventory = [...currentInventory];
            let inventoryDirty = false;
            let localTroops = [...currentTroops];
            let shouldUpdateLocal = false;
            let batch = writeBatch(db);
            let writes = 0;

            for (const crafter of crafters) {
                const idx = localTroops.findIndex(t => t.uid === crafter.uid);
                if (idx === -1) continue;

                // --- COOKING LOGIC ---
                if (crafter.activity === 'cooking') {
                    const slimePasteIdx = workingInventory.findIndex(i => i.name === 'Slime Paste');
                    if (slimePasteIdx === -1) {
                        batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { activity: 'idle', cookingProgress: 0 });
                        writes++;
                        continue;
                    }

                    // Increment Progress Locally
                    let newProgress = (crafter.cookingProgress || 0) + 10;

                    if (newProgress >= 100) {
                        // COMPLETION
                        const hasGloves = crafter.equipment?.gloves?.name === 'Slimey Gloves';
                        const lvl = crafter.cooking?.level || 1;
                        let failChance = Math.max(0, 50 - ((lvl - 1) * 5) - (hasGloves ? 2 : 0));
                        const isSuccess = Math.random() * 100 > failChance;

                        // Consume 1 item from working inventory
                        workingInventory.splice(slimePasteIdx, 1);

                        if (isSuccess) workingInventory.push({ id: generateId(), name: "Slime Bread", type: "food", desc: "Restores 10 HP", value: 10 });
                        inventoryDirty = true;

                        let newXp = (crafter.cooking?.xp || 0) + 10;
                        let newLvl = lvl;
                        if (newXp >= SKILL_XP_CURVE[newLvl] && newLvl < MAX_COOKING_LEVEL) newLvl++;

                        // Troop Update
                        batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), {
                            cookingProgress: 0, "cooking.xp": newXp, "cooking.level": newLvl
                        });
                        writes++;

                        localTroops[idx] = { ...localTroops[idx], cookingProgress: 0, cooking: { ...localTroops[idx].cooking, xp: newXp, level: newLvl } };
                        shouldUpdateLocal = true;

                    } else {
                        localTroops[idx] = { ...localTroops[idx], cookingProgress: newProgress };
                        shouldUpdateLocal = true;
                    }
                }

                // --- SMITHING LOGIC ---
                if (crafter.activity === 'smithing') {
                    const recipeId = crafter.smithingTarget;
                    const recipe = SMITHING_RECIPES.find(r => r.id === recipeId);

                    // Check count in working inventory
                    const count = workingInventory.filter(i => i.name === recipe.input).length;
                    if (count < recipe.count) {
                        batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { activity: 'idle', smithingProgress: 0 });
                        writes++;
                        continue;
                    }

                    const percentPerTick = 100 / (recipe.time / 10);
                    let newProgress = (crafter.smithingProgress || 0) + percentPerTick;

                    if (newProgress >= 100) {
                        // COMPLETION
                        // Consume Ingredients
                        for (let k = 0; k < recipe.count; k++) {
                            const iIdx = workingInventory.findIndex(i => i.name === recipe.input);
                            if (iIdx > -1) workingInventory.splice(iIdx, 1);
                        }

                        if (recipe.id === 'iron_bar') workingInventory.push({ id: generateId(), name: "Iron Bar", type: "resource" });
                        if (recipe.id === 'iron_sword') workingInventory.push({ id: generateId(), name: "Iron Sword", type: "weapon", stats: { ap: 5, spd: -1 } });

                        inventoryDirty = true;

                        let newXp = (crafter.smithing?.xp || 0) + recipe.xp;
                        let newLvl = crafter.smithing?.level || 1;
                        if (newXp >= SKILL_XP_CURVE[newLvl]) newLvl++;

                        batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), {
                            smithingProgress: 0, "smithing.xp": newXp, "smithing.level": newLvl
                        });
                        writes++;

                        localTroops[idx] = { ...localTroops[idx], smithingProgress: 0, smithing: { ...localTroops[idx].smithing, xp: newXp, level: newLvl } };
                        shouldUpdateLocal = true;

                    } else {
                        localTroops[idx] = { ...localTroops[idx], smithingProgress: newProgress };
                        shouldUpdateLocal = true;
                    }
                }
            }

            // Save Inventory ONCE if needed
            if (inventoryDirty) {
                batch.update(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { inventory: workingInventory });
                writes++; // Ensure commit happens even if no troops updated
            }


            // Commit Writes if any (Completions)
            if (writes > 0) {
                await batch.commit();
            }

            // Update UI if changed (Progress or Completion)
            if (shouldUpdateLocal && setTroops) {
                setTroops(localTroops);
            }

        }, 1000);
        return () => clearInterval(interval);
    }, [user, setTroops]);
}
