export const BASE_STATS_RANGE = { hp: [90, 110], ap: [8, 12], def: [1, 3], spd: [8, 12] };

export const RACES = {
    Human: { hpMod: 1.0, apMod: 1.0, defMod: 1.0, spdMod: 1.0, desc: "Balanced." },
    Elf: { hpMod: 0.8, apMod: 1.2, defMod: 0.8, spdMod: 1.4, desc: "Fast, fragile." },
    Urblosh: { hpMod: 1.5, apMod: 1.0, defMod: 1.5, spdMod: 0.4, desc: "Tanky, slow." }

};

export const CLASSES = {
    Warrior: { hpMod: 1.2, apMod: 1.0, defMod: 1.2, spdMod: 0.9 },
    Archer: { hpMod: 0.9, apMod: 1.7, defMod: 0.5, spdMod: 1.0 },
    Assassin: { hpMod: 0.4, apMod: 1.2, defMod: 0.8, spdMod: 2.0 },
    Mage: { hpMod: 0.5, apMod: 1.8, defMod: 0.5, spdMod: 1.0 },
    Tank: { hpMod: 1.8, apMod: 0.2, defMod: 1.5, spdMod: 0.4 }
};

export const SKILLS = {
    Urblosh: {
        row1: [
            { id: 'oil_refined', name: 'Oil Refined', desc: 'Passive: Heal 5 HP every 5th hit dealt.' },
            { id: 'oil_concentrated', name: 'Oil Concentrated', desc: 'Passive: +10% DMG on every 3rd hit.' }
        ]
    }
};

export const MAX_LEVEL = 5;
export const MAX_COOKING_LEVEL = 5;
export const LEVEL_XP_CURVE = [0, 100, 250, 500, 1000, 9999];
export const COOKING_XP_CURVE = [0, 50, 150, 300, 600, 9999];
export const TAVERN_REFRESH_MS = 4 * 60 * 60 * 1000;
export const NAMES = ["Kael", "Thar", "Olg", "Brim", "Syl", "Vex", "Dorn", "Lira", "Mok", "Zed", "Grom", "Fae", "Urk", "Zil"];
