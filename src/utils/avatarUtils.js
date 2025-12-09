import human from '../assets/avatars/human.png';
import elf from '../assets/avatars/elf.png';
import urblosh from '../assets/avatars/urblosh.png';
import bloblin from '../assets/avatars/bloblin.png';
import rat from '../assets/avatars/rat.png';
import iron from '../assets/avatars/iron.png';
import iceimp from '../assets/avatars/iceimp.png';

export const getUnitAvatar = (unit) => {
    if (!unit) return null;

    // Check by specific ID or Name first (if desired)
    const name = (unit.name || '').toLowerCase();

    // Playable Races
    if (unit.race === 'Human') return human;
    if (unit.race === 'Elf') return elf;
    if (unit.race === 'Urblosh') return urblosh;

    // Enemy Types (by type property or inferred from name/id)
    const type = unit.type || '';

    if (type === 'blob' || name.includes('blob') || name.includes('slime')) return bloblin;
    if (type === 'rat' || name.includes('rat')) return rat;
    if (type === 'ice_imp' || name.includes('imp')) return iceimp;
    if (type === 'golem' || name.includes('iron') || name.includes('golem')) return iron;

    // Default Fallbacks
    if (unit.race) return human; // Default character
    return bloblin; // Default monster
};
