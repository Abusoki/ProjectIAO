import { RACES, CLASSES, NAMES, BASE_STATS_RANGE } from '../config/gameData';
import { generateId, randomInt } from './helpers';

export const getEffectiveStats = (unit) => {
    if (!unit) return {};
    const levelBonus = (unit.level - 1);
    let stats = {
        maxHp: Math.floor(unit.baseStats.hp + (levelBonus * 10)),
        ap: Math.floor(unit.baseStats.ap + (levelBonus * 2)),
        def: Math.floor(unit.baseStats.def + (levelBonus * 1)),
        spd: Math.floor(unit.baseStats.spd + (levelBonus * 1)),
    };

    const slots = ['mainHand', 'helm', 'body', 'legs', 'gloves', 'boots', 'cape'];
    slots.forEach(slot => {
        const item = unit.equipment?.[slot];
        if (item && item.stats) {
            if (item.stats.maxHp) stats.maxHp += item.stats.maxHp;
            if (item.stats.ap) stats.ap += item.stats.ap;
            if (item.stats.def) stats.def += item.stats.def;
            if (item.stats.spd) stats.spd += item.stats.spd;
        }
    });
    stats.maxHp = Math.max(1, stats.maxHp);
    stats.ap = Math.max(1, stats.ap);
    return stats;
};

export const generateRecruit = () => {
    const races = Object.keys(RACES);
    const classes = Object.keys(CLASSES);
    const raceKey = races[Math.floor(Math.random() * races.length)];
    const classKey = classes[Math.floor(Math.random() * classes.length)];
    const rMod = RACES[raceKey];
    const cMod = CLASSES[classKey];
    const rawHp = randomInt(BASE_STATS_RANGE.hp[0], BASE_STATS_RANGE.hp[1]);
    const rawAp = randomInt(BASE_STATS_RANGE.ap[0], BASE_STATS_RANGE.ap[1]);
    const rawDef = randomInt(BASE_STATS_RANGE.def[0], BASE_STATS_RANGE.def[1]);
    const rawSpd = randomInt(BASE_STATS_RANGE.spd[0], BASE_STATS_RANGE.spd[1]);

    return {
        id: generateId(),
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        race: raceKey,
        class: classKey,
        level: 1,
        xp: 0,
        currentHp: Math.floor(rawHp * rMod.hpMod * cMod.hpMod),
        baseStats: {
            hp: Math.floor(rawHp * rMod.hpMod * cMod.hpMod),
            ap: Math.floor(rawAp * rMod.apMod * cMod.apMod),
            def: Math.floor(rawDef * rMod.defMod * cMod.defMod),
            spd: Math.floor(rawSpd * rMod.spdMod * cMod.spdMod)
        },
        equipment: { mainHand: null, gloves: null, cape: null, boots: null },
        lore: { missionsWon: 0, kills: 0, closeCalls: 0 },
        cooking: { level: 1, xp: 0 },
        skills: { row1: null },
        activity: 'idle',
        cookingProgress: 0,
        inCombat: false
    };
};
