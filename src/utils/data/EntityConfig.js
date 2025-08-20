// src/utils/data/EntityConfig.js

const entityConfig = {
    'MiniGold':       { type: 'Basic', mass: 2,    bonus: 50,  bonusType: 'Money' },
    'NormalGold':     { type: 'Basic', mass: 3.5,  bonus: 100, bonusType: 'Money' },
    'NormalGoldPlus': { type: 'Basic', mass: 5,    bonus: 250, bonusType: 'Money' },
    'BigGold':        { type: 'Basic', mass: 7,    bonus: 500, bonusType: 'High'  },
    'MiniRock':       { type: 'Basic', mass: 5.5,  bonus: 11,  bonusType: 'Low'   },
    'NormalRock':     { type: 'Basic', mass: 7,    bonus: 20,  bonusType: 'Low'   },
    'BigRock':        { type: 'Basic', mass: 8.5,   bonus: 100, bonusType: 'Low'   },
    'Diamond':        { type: 'Basic', mass: 1.5,  bonus: 600, bonusType: 'High'  },
    'Skull':          { type: 'Basic', mass: 2,    bonus: 20,  bonusType: 'Low'   },
    'Bone':           { type: 'Basic', mass: 3,    bonus: 7,   bonusType: 'Low'   },
    
    'QuestionBag': {
        type: 'RandomEffect', mass: 6.5, bonus: 0, bonusType: null,
        randomBonusRatioMin: 1, randomBonusRatioMax: 1, bonusBase: 0, extraEffectChances: 0
    },
    
    'Mole': {
        type: 'MoveAround', mass: 1.5, bonus: 2, speed: 1, 
        width: 18, height: 13, moveRange: 35, bonusType: 'Low'
    },
    
    'MoleWithDiamond': {
        type: 'MoveAround', mass: 1.5, bonus: 602, speed: 1, 
        width: 18, height: 13, moveRange: 35, bonusType: 'High'
    },
    
    'TNT': {
        type: 'Explosive', mass: 1, bonus: 2, bonusType: 'Low'
    },
    
    // ✅ Rare Special Items - very low spawn chance
    'GoldenHook': {
        type: 'SpecialEffect', mass: 3.6, bonus: 100, bonusType: 'High',
        effect: 'speed_boost', duration: 30000, spawnChance: 0.5
    },
    
    'TimeCrystal': {
        type: 'SpecialEffect', mass: 3.6, bonus: 200, bonusType: 'High', 
        effect: 'time_bonus', timeAdd: 20, spawnChance: 0.5
    },
    
    'LuckyStar': {
        type: 'SpecialEffect', mass: 3.6, bonus: 300, bonusType: 'High',
        effect: 'lucky_streak', streakCount: 3, spawnChance: 0.5
    },
    
    // ✅ Boss Mole - appears every 5 levels
    'BossMole': {
        type: 'BossMoveAround', mass: 13, bonus: 2500, speed: 2, 
        hp: 3, width: 54, height: 39, moveRange: 100, bonusType: 'High',
        scale: 3, isBoss: true
    }
};

// ✅ NEW: Skin Configuration
const skinConfig = {
    'miner_default': {
        name: 'Thợ Mỏ Cổ Điển',
        price: 0,
        unlockLevel: 1,
        spriteFrame: 0, // Frame 0 from miner_skins.png
        description: 'Trang phục mặc định'
    },
    'miner_explorer': {
        name: 'Nhà Thám Hiểm',
        price: 2000,
        unlockLevel: 5,
        spriteFrame: 1,
        description: 'Trang phục dành cho nhà thám hiểm'
    },
    'miner_professional': {
        name: 'Thợ Mỏ Chuyên Nghiệp',
        price: 5000,
        unlockLevel: 10,
        spriteFrame: 2,
        description: 'Trang phục chuyên nghiệp'
    },
    'miner_advanced': {
        name: 'Thợ Mỏ Cao Cấp',
        price: 8000,
        unlockLevel: 15,
        spriteFrame: 3,
        description: 'Trang phục cao cấp với công nghệ tiên tiến'
    },
    'miner_legendary': {
        name: 'Thợ Mỏ Huyền Thoại',
        price: 15000,
        unlockLevel: 25,
        spriteFrame: 4,
        description: 'Trang phục huyền thoại cho những thợ mỏ xuất sắc'
    }
};

export default entityConfig;
export { skinConfig };