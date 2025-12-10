export const BASE_STATS_RANGE = { hp: [90, 110], ap: [8, 12], def: [1, 3], spd: [8, 12] };

export const RACES = {
    Human: { hpMod: 1.0, apMod: 1.0, defMod: 1.0, spdMod: 1.0, desc: "Balanced." },
    Elf: { hpMod: 0.8, apMod: 1.2, defMod: 0.8, spdMod: 1.4, desc: "Fast, fragile." },
    Urblosh: { hpMod: 1.5, apMod: 1.0, defMod: 1.5, spdMod: 0.6, desc: "Tanky, slow." }
};

export const CLASSES = {
    Warrior: { hpMod: 1.2, apMod: 1.0, defMod: 1.2, spdMod: 0.9 },
    Archer: { hpMod: 0.9, apMod: 1.3, defMod: 0.8, spdMod: 1.1 },
    Assassin: { hpMod: 0.8, apMod: 1.2, defMod: 0.8, spdMod: 1.5 },
    Mage: { hpMod: 0.5, apMod: 1.8, defMod: 0.5, spdMod: 1.0 },
    Tank: { hpMod: 1.8, apMod: 0.2, defMod: 1.5, spdMod: 0.4 }
};

export const SKILLS = {
    Human: {
        row1: [
            { id: 'rage', name: 'Rage', desc: 'Start of combat: Deal 5 damage to ALL enemies. Costs 10 HP.' },
            { id: 'looter', name: 'Looter', desc: 'Start of combat: Stunned for 5s. Double drop rate.' }
        ]
    },
    Urblosh: {
        row1: [
            { id: 'oil_refined', name: 'Oil Refined', desc: 'Passive: Heal 5 HP every 5th hit dealt.' },
            { id: 'oil_concentrated', name: 'Oil Concentrated', desc: 'Passive: +10% DMG on every 3rd hit.' }
        ]
    },
    Elf: {
        row1: [
            { id: 'elvish_flicker', name: 'Elvish Flicker', desc: 'Start of combat: Speed doubled for first 3 attacks.' },
            { id: 'elvish_mindset', name: 'Elvish Mindset', desc: 'First 3 incoming damage hits are prevented.' }
        ]
    }
};

// Centralized drop definitions - monsters and missions reference these by id.
// Add/adjust items here; easier to manage and localize drop metadata.
export const DROPS = {
    rat_fur_cape: { id: 'rat_fur_cape', name: 'Rat Fur Cape', type: 'cape', stats: { spd: 2, maxHp: -1 }, desc: 'A cape made from rat fur.' },
    ice_boots: { id: 'ice_boots', name: 'Ice Boots', type: 'boots', stats: { spd: 2, def: 1 }, desc: 'Boots of chilled agility.' },
    slime_paste: { id: 'slime_paste', name: 'Slime Paste', type: 'resource', desc: 'Sticky.' },
    iron_ore: { id: 'iron_ore', name: 'Iron Ore', type: 'resource', desc: 'Raw ore for smithing.' },
    slimey_gloves: { id: 'slimey_gloves', name: 'Slimey Gloves', type: 'gloves', stats: { def: 1 }, desc: 'Cooking + Combat Bonus' },
    dull_sword: { id: 'dull_sword', name: 'Dull Sword', type: 'weapon', stats: { ap: 2, maxHp: -5 }, desc: 'Rusty weapon.' }
};

export const ENEMY_DROPS = {
    rat: [{ id: 'rat_fur_cape', chance: 0.15 }],
    ice_imp: [{ id: 'ice_boots', chance: 0.12 }],
    golem: [{ id: 'iron_ore', chance: 0.1 }, { id: 'iron_ore', chance: 0.2 }],
    blob: [{ id: 'slime_paste', chance: 0.1 }, { id: 'slimey_gloves', chance: 0.05 }, { id: 'dull_sword', chance: 0.3 }]
};

export const MISSIONS = {
    training_dummy: {
        name: "Training Dummy",
        level: 1,
        desc: "Practice on a stationary dummy. Does 1 damage back. No exp or loot.",
        enemyType: "dummy",
        minParty: 1,
        maxParty: 1,
        spawnMin: 1,
        spawnMax: 1,
        noXp: true,
        noLoot: true
    },
    rat_showdown: {
        name: "Rat Showdown",
        level: 2,
        desc: "Face 2-3 aggressive rats. Small chance for a Rat Fur Cape.",
        enemyType: "rat",
        minParty: 1,
        maxParty: 2,
        spawnMin: 2,
        spawnMax: 3
    },
    forest: {
        name: "Bloblin Forest",
        level: 1,
        desc: "Sticky enemies. Drops Paste.",
        enemyType: "blob",
        minParty: 1,
        maxParty: 3,
        spawnMin: 1,
        spawnMax: 4
    },
    mines: {
        name: "Iron Mines",
        level: 3,
        desc: "Hard enemies. Drops Ore.",
        enemyType: "golem",
        minParty: 1,
        maxParty: 3,
        spawnMin: 1,
        spawnMax: 4
    },
    ice_cave: {
        name: "Ice Cave of the Southern Pond",
        level: 5,
        desc: "Face 3-5 Ice Imps. Drops Ice Boots with +2 SPD, +1 DEF.",
        enemyType: "ice_imp",
        minParty: 1,
        maxParty: 4,
        spawnMin: 3,
        spawnMax: 5
    }
};

export const SMITHING_RECIPES = [
    { id: 'iron_bar', name: 'Iron Bar', input: 'Iron Ore', count: 1, level: 1, xp: 10, time: 50 },
    { id: 'iron_sword', name: 'Iron Sword', input: 'Iron Bar', count: 2, level: 3, xp: 50, time: 100 }
];

export const MAX_LEVEL = 10;
export const MAX_COOKING_LEVEL = 10;
export const MAX_SMITHING_LEVEL = 10;

export const LEVEL_XP_CURVE = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 99999];

export const SKILL_XP_CURVE = [0, 50, 150, 300, 600, 1200, 2500, 5000, 10000, 99999];

export const COOKING_XP_CURVE = SKILL_XP_CURVE;
export const SMITHING_XP_CURVE = SKILL_XP_CURVE;

// Tavern refresh set to 2 hours now
export const TAVERN_REFRESH_MS = 2 * 60 * 60 * 1000;
export const NAMES = ["Kael", "Thar", "Olg", "Brim", "Syl", "Vex", "Dorn", "Lira", "Mok", "Zed", "Grom", "Fae", "Urk", "Zil"];

export const ACHIEVEMENTS = [
    { id: 'first_recruit', name: 'First Recruit', desc: 'Recruit your first troop.', icon: 'User' },
    { id: 'full_squad', name: 'Full Squad', desc: 'Have a full party of 4 troops.', icon: 'Users' },
    { id: 'first_blood', name: 'First Blood', desc: 'Win your first battle.', icon: 'Sword' },
    { id: 'veteran', name: 'Veteran', desc: 'Win 10 battles.', icon: 'Shield' },
    { id: 'master_chef', name: 'Master Chef', desc: 'Reach Cooking Level 5 on any unit.', icon: 'Utensils' },
    { id: 'blacksmith', name: 'Blacksmith', desc: 'Reach Smithing Level 5 on any unit.', icon: 'Hammer' }
];
