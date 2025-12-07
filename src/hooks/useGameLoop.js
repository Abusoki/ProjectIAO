import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getEffectiveStats } from '../utils/mechanics';
import { SKILL_XP_CURVE, MAX_COOKING_LEVEL, SMITHING_RECIPES } from '../config/gameData';
import { generateId } from '../utils/helpers';

export function useGameLoop(user, troops, inventory, gameState) {
    
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
                        }).catch(()=>{});
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
                        // Success Check
                        const hasGloves = crafter.equipment?.gloves?.name === 'Slimey Gloves';
                        const lvl = crafter.cooking?.level || 1;
                        let failChance = Math.max(0, 50 - ((lvl - 1) * 5) - (hasGloves ? 2 : 0));
                        const isSuccess = Math.random() * 100 > failChance;

                        let newInv = inventory.filter(i => i.id !== slimePaste.id);
                        if (isSuccess) newInv.push({ id: generateId(), name: "Slime Bread", type: "food", desc: "Restores 10 HP", value: 10 });

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { inventory: newInv });
                        
                        // XP
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
                    
                    // Check ingredients
                    const ingredients = inventory.filter(i => i.name === recipe.input);
                    if (ingredients.length < recipe.count) {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { activity: 'idle', cookingProgress: 0 });
                        continue;
                    }

                    let newProgress = (crafter.cookingProgress || 0) + 10; // +10 per second
                    // Some items take longer (time is total ticks needed * 10, or just direct ticks. Let's say progress is % based on time)
                    // If recipe time is 100 (10s), +10 is 10%. If recipe time is 50 (5s), +20 is 20%.
                    const progressTick = 1000 / recipe.time; // Simplified: recipe.time is ticks? Let's say recipe.time is TOTAL TICKS (100 for 10s)
                    
                    // Let's standard: 1 tick = 1 second. Progress goes 0 to 100.
                    // Increment = 100 / (recipe.time / 10). 
                    // Let's simplify: recipe.time is "Ticks until done".
                    // Actually, let's stick to % for the UI.
                    // We increment progress by a fixed amount? No, different items take different times.
                    // Let's say recipe.time is 50 (5 seconds). We update every 1s.
                    // So we add (100 / (50/10)) = 20% per tick.
                    
                    const percentPerTick = 100 / (recipe.time / 10);
                    
                    if (newProgress + percentPerTick >= 100 + percentPerTick) { // Finished
                        // Consume Items
                        let newInv = [...inventory];
                        for(let k=0; k<recipe.count; k++) {
                            const idx = newInv.findIndex(i => i.name === recipe.input);
                            if(idx > -1) newInv.splice(idx, 1);
                        }

                        // Add Result
                        if (recipe.id === 'iron_bar') newInv.push({ id: generateId(), name: "Iron Bar", type: "resource" });
                        if (recipe.id === 'iron_sword') newInv.push({ id: generateId(), name: "Iron Sword", type: "weapon", stats: { ap: 5, spd: -1 } });

                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'profile', 'data'), { inventory: newInv });

                         // XP
                         let newXp = (crafter.smithing?.xp || 0) + recipe.xp;
                         let newLvl = crafter.smithing?.level || 1;
                         if (newXp >= SKILL_XP_CURVE[newLvl]) newLvl++;
 
                         await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { 
                             cookingProgress: 0, "smithing.xp": newXp, "smithing.level": newLvl 
                         });

                    } else {
                        await updateDoc(doc(db, 'artifacts', 'iron-and-oil-web', 'users', user.uid, 'troops', crafter.uid), { 
                            cookingProgress: (crafter.cookingProgress || 0) + percentPerTick 
                        });
                    }
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [user, troops, inventory]);
  }