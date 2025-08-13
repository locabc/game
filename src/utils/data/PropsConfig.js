export const propsOrder = ['Dynamite', 'StrengthDrink', 'LuckyClover', 'RockCollectorsBook', 'GemPolish'];

export const propsConfig = {
    'Dynamite': {
        description: 'After you grabed onto something with your\nclaw, press UP to throw a piece of dynamite\nat it and blow it up.',
        getPrice: (level) => Math.floor(Math.random() * 300) + 1 + level * 2,
    },
    'StrengthDrink': {
        description: 'Strength drink. The Miner will reel up objects\na little faster on the next level.\nThe drink only lasts for one level.',
        getPrice: (level) => Math.floor(Math.random() * 300) + 100,
    },
    'LuckyClover': {
        description: 'Lucky Clover. This will increase the chances\nof getting something good out of the\ngrab bags onthe next level.\nThis is only good for one level.',
        getPrice: (level) => Math.floor(Math.random() * level * 50) + 1 + level * 2,
    },
    'RockCollectorsBook': {
        description: 'Rock Collectors book. Rocks will be worth\nthree times as much money on the next level.\nThis is only good for one level.',
        getPrice: (level) => Math.floor(Math.random() * 150) + 1,
    },
    'GemPolish': {
        description: 'Gem Polish. During the next level gems and\ndiamonds will be worth more money.\nOnly good for one level.',
        getPrice: (level) => Math.floor(Math.random() * level * 100) + 201,
    },
};