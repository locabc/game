// src/utils/data/EntityConfig.js

export const entityConfig = {
    'MiniGold':       { type: 'Basic', mass: 2,    bonus: 50,  bonusType: 'Money' }, // Sửa 'Normal' thành 'Money'
    'NormalGold':     { type: 'Basic', mass: 3.5,  bonus: 100, bonusType: 'Money' }, // Sửa 'Normal' thành 'Money'
    'NormalGoldPlus': { type: 'Basic', mass: 5,    bonus: 250, bonusType: 'Money' }, // Sửa 'Normal' thành 'Money'
    'BigGold':        { type: 'Basic', mass: 7,    bonus: 500, bonusType: 'High'   },
    'MiniRock':       { type: 'Basic', mass: 5.5,  bonus: 11,  bonusType: 'Low'    },
    'NormalRock':     { type: 'Basic', mass: 7,    bonus: 20,  bonusType: 'Low'    },
    'BigRock':        { type: 'Basic', mass: 10,   bonus: 100, bonusType: 'Low'    },
    'Diamond':        { type: 'Basic', mass: 1.5,  bonus: 600, bonusType: 'High'   },
    'Skull':          { type: 'Basic', mass: 2,    bonus: 20,  bonusType: 'Low'    },
    'Bone':           { type: 'Basic', mass: 3,    bonus: 7,   bonusType: 'Low'    },
    'QuestionBag': {
        type: 'RandomEffect', mass: 3, bonus: 0, bonusType: null, // ✅ bonus = 0 để không tự cộng tiền
        randomBonusRatioMin: 1, randomBonusRatioMax: 1, bonusBase: 0, extraEffectChances: 0
    },
    'Mole': {
        type: 'MoveAround', mass: 1.5, bonus: 2, speed: 1, width: 18, height: 13, moveRange: 35, bonusType: 'Low'
    },
    'MoleWithDiamond': {
        type: 'MoveAround', mass: 1.5, bonus: 602, speed: 1, width: 18, height: 13, moveRange: 35, bonusType: 'High'
    },
    'TNT': {
        type: 'Explosive', mass: 1, bonus: 2, bonusType: 'Low'
    }
};