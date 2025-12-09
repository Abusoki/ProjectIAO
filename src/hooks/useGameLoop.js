import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { SKILL_XP_CURVE, MAX_COOKING_LEVEL, SMITHING_RECIPES, ACHIEVEMENTS } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useGameLoop(user, troops, inventory, gameState, profile) {
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
            // We update meta which is listened to by App.jsx, refreshing 'profile'
            updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'meta'), {
                achievements: updated
            });
        }
    }, [user, troops, inventory, gameState, profile]);

    // 1. REGEN LOOP
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            if (gameState === 'fighting') return;
            troops.forEach(t => {
                if (t.currentHp > 0 && t.activity === 'idle' && !t.inCombat) {
                    const stats = getEffectiveStats(t);
                    if (t.currentHp < stats.maxHp) {
                        updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', t.uid), {
                            currentHp: Math.min(stats.maxHp, t.currentHp + 1)
                        }).catch(() => { });
                    }
                }
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [user, troops, gameState]);

    // 2. CRAFTING LOOP (Cooking & Smithing)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            const crafters = troops.filter(t => t.activity === 'cooking' || t.activity === 'smithing');
            if (crafters.length === 0) return;

            for (const crafter of crafters) {
                // --- COOKING LOGIC ---
                if (crafter.activity === 'cooking') {
                    const slimePaste = inventory.find(i => i.name === 'Slime Paste');
                    if (!slimePaste) {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { activity: 'idle', cookingProgress: 0 });
                        continue;
                    }
                    let newProgress = (crafter.cookingProgress || 0) + 10;
                    if (newProgress >= 100) {
                        const hasGloves = crafter.equipment?.gloves?.name === 'Slimey Gloves';
                        const lvl = crafter.cooking?.level || 1;
                        let failChance = Math.max(0, 50 - ((lvl - 1) * 5) - (hasGloves ? 2 : 0));
                        const isSuccess = Math.random() * 100 > failChance;

                        let newInv = inventory.filter(i => i.id !== slimePaste.id);
                        if (isSuccess) newInv.push({ id: generateId(), name: "Slime Bread", type: "food", desc: "Restores 10 HP", value: 10 });

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { inventory: newInv });

                        let newXp = (crafter.cooking?.xp || 0) + 10;
                        let newLvl = lvl;
                        if (newXp >= SKILL_XP_CURVE[newLvl] && newLvl < MAX_COOKING_LEVEL) newLvl++;

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), {
                            cookingProgress: 0, "cooking.xp": newXp, "cooking.level": newLvl
                        });
                    } else {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { cookingProgress: newProgress });
                    }
                }

                // --- SMITHING LOGIC ---
                if (crafter.activity === 'smithing') {
                    const recipeId = crafter.smithingTarget;
                    const recipe = SMITHING_RECIPES.find(r => r.id === recipeId);

                    const ingredients = inventory.filter(i => i.name === recipe.input);
                    if (ingredients.length < recipe.count) {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { activity: 'idle', smithingProgress: 0 });
                        continue;
                    }

                    const percentPerTick = 100 / (recipe.time / 10);
                    let newProgress = (crafter.smithingProgress || 0) + percentPerTick;

                    if (newProgress >= 100) {
                        let newInv = [...inventory];
                        for (let k = 0; k < recipe.count; k++) {
                            const idx = newInv.findIndex(i => i.name === recipe.input);
                            if (idx > -1) newInv.splice(idx, 1);
                        }

                        if (recipe.id === 'iron_bar') newInv.push({ id: generateId(), name: "Iron Bar", type: "resource" });
                        if (recipe.id === 'iron_sword') newInv.push({ id: generateId(), name: "Iron Sword", type: "weapon", stats: { ap: 5, spd: -1 } });

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { inventory: newInv });

                        let newXp = (crafter.smithing?.xp || 0) + recipe.xp;
                        let newLvl = crafter.smithing?.level || 1;
                        if (newXp >= SKILL_XP_CURVE[newLvl]) newLvl++;

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), {
                            smithingProgress: 0, "smithing.xp": newXp, "smithing.level": newLvl
                        });

                    } else {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), {
                            smithingProgress: newProgress
                        });
                    }
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [user, troops, inventory]);
}
