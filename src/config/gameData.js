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
    rat_fur_cape: { id: 'rat_fur_cape', name: 'Rat Fur Cape', type: 'cape', stats: { spd: 2, maxHp: -10 }, desc: 'A cape made from rat fur.' },
    ice_boots: { id: 'ice_boots', name: 'Ice Boots', type: 'boots', stats: { spd: 2, def: 1 }, desc: 'Boots of chilled agility.' },
    slime_paste: { id: 'slime_paste', name: 'Slime Paste', type: 'resource', desc: 'Sticky.' },
    iron_ore: { id: 'iron_ore', name: 'Iron Ore', type: 'resource', desc: 'Raw ore for smithing.' },
    slimey_gloves: { id: 'slimey_gloves', name: 'Slimey Gloves', type: 'gloves', stats: { def: 1 }, desc: 'Cooking + Combat Bonus' },
    dull_sword: { id: 'dull_sword', name: 'Dull Sword', type: 'weapon', stats: { ap: 2, maxHp: -5 }, desc: 'Rusty weapon.' },
    // New Drops
    goblin_dagger: { id: 'goblin_dagger', name: 'Goblin Dagger', type: 'weapon', stats: { ap: 3 }, desc: 'Crude but fast.' },
    spider_silk: { id: 'spider_silk', name: 'Spider Silk', type: 'resource', desc: 'Strong and light.' },
    bandit_hood: { id: 'bandit_hood', name: 'Bandit Hood', type: 'helm', stats: { def: 2 }, desc: 'Hides your face.' },
    wolf_fur: { id: 'wolf_fur', name: 'Wolf Fur', type: 'resource', desc: 'Warm and soft.' },
    bone_shield: { id: 'bone_shield', name: 'Bone Shield', type: 'gloves', stats: { def: 4 }, desc: 'Made from sturdy bones.' },
    heavy_axe: { id: 'heavy_axe', name: 'Heavy Axe', type: 'weapon', stats: { ap: 5, spd: -1 }, desc: 'Slow but deadly.' },
    dragon_scale: { id: 'dragon_scale', name: 'Dragon Scale', type: 'resource', desc: 'Hard as diamond.' },
    life_ring: { id: 'life_ring', name: 'Life Ring', type: 'gloves', stats: { maxHp: 20 }, desc: 'Pulses with vitality.' },
    void_essence: { id: 'void_essence', name: 'Void Essence', type: 'resource', desc: 'Dark matter.' },
    fire_sword: { id: 'fire_sword', name: 'Fire Sword', type: 'weapon', stats: { ap: 8 }, desc: 'Burns with eternal flame.' },
    mechanical_gear: { id: 'mechanical_gear', name: 'Mechanical Gear', type: 'resource', desc: 'Precision part.' },
    trident: { id: 'trident', name: 'Trident', type: 'weapon', stats: { ap: 4, def: 2 }, desc: 'Weapon of the deep.' },
    // Dungeon Drops
    frog_leg: { id: 'frog_leg', name: 'Frog Leg', type: 'resource', desc: 'Delicacy?' },
    swamp_slime: { id: 'swamp_slime', name: 'Swamp Slime', type: 'resource', desc: 'Toxic sludge.' },
    croak_crown: { id: 'croak_crown', name: 'Croak Crown', type: 'helm', stats: { maxHp: 30, def: 2 }, desc: 'The King\'s slimy crown.' }
};

export const ENEMY_DROPS = {
    rat: [{ id: 'rat_fur_cape', chance: 0.15 }],
    ice_imp: [{ id: 'ice_boots', chance: 0.12 }],
    golem: [{ id: 'iron_ore', chance: 0.1 }, { id: 'iron_ore', chance: 0.2 }],
    blob: [{ id: 'slime_paste', chance: 0.1 }, { id: 'slimey_gloves', chance: 0.05 }, { id: 'dull_sword', chance: 0.3 }],
    // New Enemy Drops
    goblin: [{ id: 'goblin_dagger', chance: 0.1 }, { id: 'iron_ore', chance: 0.05 }],
    spider: [{ id: 'spider_silk', chance: 0.3 }],
    bandit: [{ id: 'bandit_hood', chance: 0.08 }, { id: 'dull_sword', chance: 0.2 }],
    wolf: [{ id: 'wolf_fur', chance: 0.25 }],
    skeleton: [{ id: 'bone_shield', chance: 0.05 }, { id: 'dull_sword', chance: 0.1 }],
    merfolk: [{ id: 'trident', chance: 0.05 }, { id: 'slime_paste', chance: 0.2 }],
    orc: [{ id: 'heavy_axe', chance: 0.1 }, { id: 'iron_ore', chance: 0.15 }],
    vampire: [{ id: 'life_ring', chance: 0.02 }],
    robot: [{ id: 'mechanical_gear', chance: 0.4 }, { id: 'iron_ore', chance: 0.2 }],
    wyvern: [{ id: 'dragon_scale', chance: 0.1 }, { id: 'goblin_dagger', chance: 0.05 }],
    voidling: [{ id: 'void_essence', chance: 0.5 }],
    demon: [{ id: 'fire_sword', chance: 0.05 }, { id: 'void_essence', chance: 0.2 }],
    // Dungeon Enemies
    frog: [{ id: 'frog_leg', chance: 0.4 }],
    toad: [{ id: 'swamp_slime', chance: 0.3 }],
    bullfrog: [{ id: 'frog_leg', chance: 0.5 }, { id: 'bone_shield', chance: 0.1 }],
    king_croak: [{ id: 'croak_crown', chance: 0.5 }, { id: 'trident', chance: 0.2 }]
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
    },
    // Leveled Missions
    goblin_outpost: {
        name: "Goblin Outpost",
        level: 2,
        desc: "A small camp of nasty goblins.",
        enemyType: "goblin",
        minParty: 1,
        maxParty: 3,
        spawnMin: 2,
        spawnMax: 4
    },
    spider_nest: {
        name: "Spider Nest",
        level: 3,
        desc: "Webs everywhere. Watch out for poison.",
        enemyType: "spider",
        minParty: 1,
        maxParty: 3,
        spawnMin: 3,
        spawnMax: 6
    },
    bandit_camp: {
        name: "Bandit Camp",
        level: 4,
        desc: "Thieves and cutthroats hiding in the woods.",
        enemyType: "bandit",
        minParty: 2,
        maxParty: 4,
        spawnMin: 2,
        spawnMax: 5
    },
    wolf_pack: {
        name: "Wolf Pack",
        level: 4,
        desc: "A pack of hungry wolves stalking the road.",
        enemyType: "wolf",
        minParty: 2,
        maxParty: 4,
        spawnMin: 3,
        spawnMax: 6
    },
    haunted_crypt: {
        name: "Haunted Crypt",
        level: 5,
        desc: "Restless skeletons guard ancient treasures.",
        enemyType: "skeleton",
        minParty: 2,
        maxParty: 4,
        spawnMin: 3,
        spawnMax: 5
    },
    sunken_temple: {
        name: "Sunken Temple",
        level: 6,
        desc: "Underwater ruins guarded by Merfolk.",
        enemyType: "merfolk",
        minParty: 2,
        maxParty: 4,
        spawnMin: 2,
        spawnMax: 4
    },
    orc_stronghold: {
        name: "Orc Stronghold",
        level: 7,
        desc: "Well-armed orcs preparing for war.",
        enemyType: "orc",
        minParty: 3,
        maxParty: 4,
        spawnMin: 2,
        spawnMax: 5
    },
    vampire_mansion: {
        name: "Vampire Mansion",
        level: 8,
        desc: "A dark estate on the hill.",
        enemyType: "vampire",
        minParty: 3,
        maxParty: 4,
        spawnMin: 1,
        spawnMax: 2
    },
    mechanist_lab: {
        name: "Mechanist's Lab",
        level: 9,
        desc: "Rogue automatons running wild.",
        enemyType: "robot",
        minParty: 3,
        maxParty: 4,
        spawnMin: 3,
        spawnMax: 6
    },
    wyvern_peak: {
        name: "Wyvern's Peak",
        level: 9,
        desc: "Scaling the mountain to face the beasts.",
        enemyType: "wyvern",
        minParty: 3,
        maxParty: 4,
        spawnMin: 1,
        spawnMax: 3
    },
    abyssal_void: {
        name: "Abyssal Void",
        level: 10,
        desc: "The fabric of reality is tearing.",
        enemyType: "voidling",
        minParty: 4,
        maxParty: 4,
        spawnMin: 5,
        spawnMax: 10
    },
    demon_throne: {
        name: "Demon Lord's Throne",
        level: 10,
        desc: "The ultimate challenge.",
        enemyType: "demon",
        minParty: 4,
        maxParty: 4,
        spawnMin: 1,
        spawnMax: 1
    }
};

export const DUNGEONS = {
    frog_swamp: {
        id: 'frog_swamp',
        name: "Evil Frog Swamp",
        desc: "5 Stages. Defeat King Croak. Party Size: 3.",
        level: 5,
        maxParty: 3,
        stages: [
            { name: "Swamp Edge", enemyType: 'frog', spawnMin: 2, spawnMax: 3 },
            { name: "Murky Waters", enemyType: 'toad', spawnMin: 2, spawnMax: 3 },
            { name: "Deep Mud", enemyType: 'bullfrog', spawnMin: 2, spawnMax: 3 },
            { name: "Royal Guard", enemyType: 'bullfrog', spawnMin: 3, spawnMax: 4 },
            { name: "King's Throne", enemyType: 'king_croak', spawnMin: 1, spawnMax: 1, boss: true }
        ]
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
