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

    // ✅ Gift Box - New special item with same size as NormalGold
    'GiftBox': {
        type: 'SpecialEffect', mass: 3.5, bonus: 150, bonusType: 'High',
        effect: 'gift', spawnChance: 1
    },
    
    // ✅ Boss Mole - appears every 5 levels
    'BossMole': {
        type: 'BossMoveAround', mass: 13, bonus: 2500, speed: 2, 
        hp: 3, width: 54, height: 39, moveRange: 100, bonusType: 'High',
        scale: 3, isBoss: true
    }
};

export default entityConfig;