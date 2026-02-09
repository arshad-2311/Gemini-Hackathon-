// ============================================
// SIGN FALLBACK SYSTEM
// Fallback when SignAvatars videos unavailable
// ============================================

import signDatabase from './signDatabase.js';

// Common signs with procedural animation data
const FALLBACK_SIGNS = {
    // Greetings
    'HELLO': {
        description: 'Wave hand at forehead level, palm facing out',
        category: 'greetings',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.5, 0.3, 0], end: [0.6, 0.5, 0.1], wave: true },
            expression: 'smile',
            duration: 1.5
        }
    },
    'GOODBYE': {
        description: 'Wave hand downward, palm facing down',
        category: 'greetings',
        color: '#2196F3',
        animation: {
            rightHand: { start: [0.4, 0.5, 0], end: [0.4, 0.2, 0], wave: true },
            expression: 'neutral',
            duration: 2.0
        }
    },
    'HI': {
        description: 'Quick wave at shoulder height',
        category: 'greetings',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.5, 0.3, 0], end: [0.6, 0.4, 0.1], wave: true },
            expression: 'smile',
            duration: 1.0
        }
    },

    // Common words
    'THANK YOU': {
        description: 'Hand moves from chin outward, palm up',
        category: 'common',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.3, 0.4, 0.1], end: [0.4, 0.3, 0.2] },
            expression: 'smile',
            duration: 1.5
        }
    },
    'PLEASE': {
        description: 'Flat hand circles on chest',
        category: 'common',
        color: '#9C27B0',
        animation: {
            rightHand: { start: [0.25, 0.2, 0.1], end: [0.25, 0.15, 0.1], circular: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'SORRY': {
        description: 'Fist circles on chest',
        category: 'common',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.25, 0.2, 0.1], end: [0.25, 0.15, 0.1], circular: true, fist: true },
            expression: 'sad',
            duration: 1.8
        }
    },
    'YES': {
        description: 'Fist nods up and down like a head nodding',
        category: 'common',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.4, 0.3, 0.1], end: [0.4, 0.25, 0.1], nod: true, fist: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'NO': {
        description: 'Index and middle finger tap thumb',
        category: 'common',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.4, 0.3, 0.1], end: [0.4, 0.3, 0.1], snap: true },
            expression: 'neutral',
            duration: 1.0
        }
    },
    'HELP': {
        description: 'Thumbs-up on palm, lift up together',
        category: 'emergency',
        color: '#FF5722',
        animation: {
            rightHand: { start: [0.3, 0.2, 0.1], end: [0.3, 0.35, 0.1], thumbsUp: true },
            leftHand: { start: [0.2, 0.2, 0.1], end: [0.2, 0.35, 0.1], palmUp: true },
            expression: 'concerned',
            duration: 2.0
        }
    },

    // Questions
    'WHAT': {
        description: 'Palms up, shake side to side',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.15], end: [0.45, 0.25, 0.15], shake: true, palmUp: true },
            leftHand: { start: [0.1, 0.25, 0.15], end: [0.05, 0.25, 0.15], shake: true, palmUp: true },
            expression: 'questioning',
            duration: 1.5
        }
    },
    'WHERE': {
        description: 'Index finger shakes side to side',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.4, 0.3, 0.2], end: [0.45, 0.3, 0.2], shake: true, pointing: true },
            expression: 'questioning',
            duration: 1.3
        }
    },
    'WHEN': {
        description: 'Index fingers circle each other',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.35, 0.3, 0.15], end: [0.35, 0.3, 0.15], circular: true, pointing: true },
            leftHand: { start: [0.15, 0.3, 0.15], end: [0.15, 0.3, 0.15], circular: true, pointing: true },
            expression: 'questioning',
            duration: 1.8
        }
    },
    'WHY': {
        description: 'Touch forehead, pull away into Y handshape',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.35, 0.5, 0.05], end: [0.4, 0.4, 0.15], yShape: true },
            expression: 'questioning',
            duration: 1.5
        }
    },
    'HOW': {
        description: 'Fists together, roll outward',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.35, 0.25, 0.1], end: [0.4, 0.25, 0.15], roll: true, fist: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.1, 0.25, 0.15], roll: true, fist: true },
            expression: 'questioning',
            duration: 1.5
        }
    },
    'WHO': {
        description: 'Index finger circles near mouth',
        category: 'questions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.3, 0.4, 0.1], end: [0.3, 0.4, 0.1], circular: true, pointing: true },
            expression: 'questioning',
            duration: 1.5
        }
    },

    // Pronouns
    'I': {
        description: 'Point to chest with index finger',
        category: 'pronouns',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.4, 0.3, 0.2], end: [0.25, 0.2, 0.1], pointing: true },
            expression: 'neutral',
            duration: 0.8
        }
    },
    'YOU': {
        description: 'Point forward with index finger',
        category: 'pronouns',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.3, 0.25, 0.1], end: [0.4, 0.3, 0.25], pointing: true },
            expression: 'neutral',
            duration: 0.8
        }
    },
    'WE': {
        description: 'Index finger arcs from one shoulder to other',
        category: 'pronouns',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.45, 0.3, 0.1], end: [0.05, 0.3, 0.1], arc: true, pointing: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'THEY': {
        description: 'Point to the side and sweep',
        category: 'pronouns',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.5, 0.3, 0.15], end: [0.6, 0.3, 0.15], sweep: true, pointing: true },
            expression: 'neutral',
            duration: 1.0
        }
    },

    // Feelings
    'HAPPY': {
        description: 'Both hands brush up chest multiple times',
        category: 'emotions',
        color: '#FFEB3B',
        animation: {
            rightHand: { start: [0.35, 0.15, 0.1], end: [0.35, 0.3, 0.1], brushUp: true },
            leftHand: { start: [0.15, 0.15, 0.1], end: [0.15, 0.3, 0.1], brushUp: true },
            expression: 'happy',
            duration: 1.8
        }
    },
    'SAD': {
        description: 'Both hands move down face',
        category: 'emotions',
        color: '#3F51B5',
        animation: {
            rightHand: { start: [0.35, 0.45, 0.05], end: [0.35, 0.3, 0.05] },
            leftHand: { start: [0.15, 0.45, 0.05], end: [0.15, 0.3, 0.05] },
            expression: 'sad',
            duration: 1.8
        }
    },
    'ANGRY': {
        description: 'Claw hands pull down from face',
        category: 'emotions',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.35, 0.45, 0.08], end: [0.35, 0.3, 0.12], claw: true },
            leftHand: { start: [0.15, 0.45, 0.08], end: [0.15, 0.3, 0.12], claw: true },
            expression: 'angry',
            duration: 1.5
        }
    },
    'LOVE': {
        description: 'Cross arms over chest in hug',
        category: 'emotions',
        color: '#E91E63',
        animation: {
            rightHand: { start: [0.5, 0.25, 0.1], end: [0.1, 0.2, 0.1], crossBody: true },
            leftHand: { start: [0, 0.25, 0.1], end: [0.4, 0.2, 0.1], crossBody: true },
            expression: 'loving',
            duration: 2.0
        }
    },
    'I LOVE YOU': {
        description: 'ILY handshape - pinky, index, and thumb extended',
        category: 'emotions',
        color: '#E91E63',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.15], end: [0.45, 0.35, 0.2], ilyShape: true },
            expression: 'loving',
            duration: 2.0
        }
    },

    // Actions
    'EAT': {
        description: 'Bunched fingers tap mouth',
        category: 'actions',
        color: '#795548',
        animation: {
            rightHand: { start: [0.35, 0.35, 0.15], end: [0.33, 0.42, 0.08], tap: true, bunched: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'DRINK': {
        description: 'C-hand tips to mouth',
        category: 'actions',
        color: '#795548',
        animation: {
            rightHand: { start: [0.35, 0.3, 0.15], end: [0.33, 0.4, 0.1], cShape: true, tilt: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'SLEEP': {
        description: 'Hand pulls down over face, eyes close',
        category: 'actions',
        color: '#9E9E9E',
        animation: {
            rightHand: { start: [0.25, 0.5, 0.05], end: [0.25, 0.35, 0.05] },
            expression: 'sleeping',
            duration: 2.0
        }
    },
    'WALK': {
        description: 'Two fingers walk forward on palm',
        category: 'actions',
        color: '#8BC34A',
        animation: {
            rightHand: { start: [0.3, 0.2, 0.1], end: [0.35, 0.2, 0.15], walking: true },
            leftHand: { start: [0.2, 0.2, 0.1], end: [0.2, 0.2, 0.1], palmUp: true },
            expression: 'neutral',
            duration: 2.0
        }
    },
    'LEARN': {
        description: 'Hand grabs from head, pulls to flat hand',
        category: 'education',
        color: '#3F51B5',
        animation: {
            rightHand: { start: [0.35, 0.5, 0.05], end: [0.2, 0.25, 0.1], grab: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.15, 0.25, 0.1], flat: true },
            expression: 'focused',
            duration: 1.8
        }
    },
    'UNDERSTAND': {
        description: 'Index finger flicks up near forehead',
        category: 'communication',
        color: '#009688',
        animation: {
            rightHand: { start: [0.35, 0.45, 0.05], end: [0.38, 0.5, 0.08], flick: true, pointing: true },
            expression: 'understanding',
            duration: 1.2
        }
    },
    'KNOW': {
        description: 'Fingertips tap forehead',
        category: 'communication',
        color: '#009688',
        animation: {
            rightHand: { start: [0.35, 0.45, 0.1], end: [0.35, 0.5, 0.05], tap: true },
            expression: 'neutral',
            duration: 1.0
        }
    },
    'THINK': {
        description: 'Index finger touches forehead',
        category: 'communication',
        color: '#009688',
        animation: {
            rightHand: { start: [0.38, 0.4, 0.12], end: [0.35, 0.5, 0.05], pointing: true },
            expression: 'thinking',
            duration: 1.2
        }
    },

    // Family
    'MOTHER': {
        description: 'Thumb of open hand taps chin',
        category: 'family',
        color: '#E91E63',
        animation: {
            rightHand: { start: [0.3, 0.38, 0.1], end: [0.3, 0.42, 0.08], tap: true, openHand: true },
            expression: 'warm',
            duration: 1.3
        }
    },
    'FATHER': {
        description: 'Thumb of open hand taps forehead',
        category: 'family',
        color: '#2196F3',
        animation: {
            rightHand: { start: [0.3, 0.48, 0.1], end: [0.3, 0.52, 0.08], tap: true, openHand: true },
            expression: 'warm',
            duration: 1.3
        }
    },
    'FRIEND': {
        description: 'Index fingers hook and switch positions',
        category: 'relationships',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.35, 0.25, 0.15], end: [0.15, 0.25, 0.15], hook: true },
            leftHand: { start: [0.15, 0.25, 0.15], end: [0.35, 0.25, 0.15], hook: true },
            expression: 'friendly',
            duration: 1.5
        }
    },

    // Time
    'NOW': {
        description: 'Both Y-hands drop down',
        category: 'time',
        color: '#FFC107',
        animation: {
            rightHand: { start: [0.35, 0.3, 0.12], end: [0.35, 0.22, 0.12], yShape: true },
            leftHand: { start: [0.15, 0.3, 0.12], end: [0.15, 0.22, 0.12], yShape: true },
            expression: 'neutral',
            duration: 1.0
        }
    },
    'LATER': {
        description: 'L-hand rotates forward',
        category: 'time',
        color: '#FFC107',
        animation: {
            rightHand: { start: [0.35, 0.3, 0.1], end: [0.4, 0.3, 0.15], lShape: true, rotate: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'BEFORE': {
        description: 'One hand moves back toward body',
        category: 'time',
        color: '#FFC107',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.2], end: [0.35, 0.25, 0.1] },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'AFTER': {
        description: 'One hand moves forward from other hand',
        category: 'time',
        color: '#FFC107',
        animation: {
            rightHand: { start: [0.3, 0.25, 0.1], end: [0.4, 0.25, 0.2] },
            leftHand: { start: [0.2, 0.25, 0.1], end: [0.2, 0.25, 0.1] },
            expression: 'neutral',
            duration: 1.2
        }
    },

    // Places
    'HOME': {
        description: 'Bunched fingertips touch cheek then chin',
        category: 'places',
        color: '#8D6E63',
        animation: {
            rightHand: { start: [0.32, 0.42, 0.05], end: [0.32, 0.38, 0.05], bunched: true, tap: true },
            expression: 'content',
            duration: 1.5
        }
    },
    'WORK': {
        description: 'S-hand taps on other S-hand',
        category: 'places',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.35, 0.28, 0.12], end: [0.28, 0.25, 0.1], sShape: true, tap: true },
            leftHand: { start: [0.2, 0.25, 0.1], end: [0.2, 0.25, 0.1], sShape: true },
            expression: 'focused',
            duration: 1.5
        }
    },
    'SCHOOL': {
        description: 'Clap hands twice',
        category: 'places',
        color: '#FF5722',
        animation: {
            rightHand: { start: [0.35, 0.25, 0.12], end: [0.25, 0.25, 0.1], clap: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.25, 0.25, 0.1], clap: true },
            expression: 'neutral',
            duration: 1.5
        }
    },

    // Objects
    'BOOK': {
        description: 'Palms together open like a book',
        category: 'objects',
        color: '#795548',
        animation: {
            rightHand: { start: [0.3, 0.25, 0.1], end: [0.35, 0.25, 0.12], palmIn: true, open: true },
            leftHand: { start: [0.2, 0.25, 0.1], end: [0.15, 0.25, 0.12], palmIn: true, open: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'WATER': {
        description: 'W-hand taps chin',
        category: 'objects',
        color: '#03A9F4',
        animation: {
            rightHand: { start: [0.3, 0.35, 0.12], end: [0.3, 0.4, 0.08], wShape: true, tap: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'FOOD': {
        description: 'Bunched fingers tap lips',
        category: 'objects',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.32, 0.38, 0.12], end: [0.32, 0.42, 0.08], bunched: true, tap: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'PHONE': {
        description: 'Y-hand at ear',
        category: 'objects',
        color: '#9C27B0',
        animation: {
            rightHand: { start: [0.4, 0.35, 0.1], end: [0.42, 0.45, 0.02], yShape: true },
            expression: 'neutral',
            duration: 1.5
        }
    },
    'COMPUTER': {
        description: 'C-hand moves up arm',
        category: 'objects',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.15, 0.2, 0.1], end: [0.25, 0.25, 0.1], cShape: true },
            leftHand: { start: [0.1, 0.25, 0.05], end: [0.25, 0.25, 0.05], armExtended: true },
            expression: 'neutral',
            duration: 1.8
        }
    },
    'NAME': {
        description: 'H-fingers tap together twice',
        category: 'identity',
        color: '#673AB7',
        animation: {
            rightHand: { start: [0.35, 0.28, 0.1], end: [0.28, 0.28, 0.1], hShape: true, tap: true },
            leftHand: { start: [0.15, 0.28, 0.1], end: [0.22, 0.28, 0.1], hShape: true },
            expression: 'neutral',
            duration: 1.5
        }
    },

    // Additional common signs to reach 50+
    'GOOD': {
        description: 'Flat hand from chin moves down to palm',
        category: 'common',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.3, 0.4, 0.08], end: [0.25, 0.25, 0.1] },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.15, 0.25, 0.1], palmUp: true },
            expression: 'pleased',
            duration: 1.2
        }
    },
    'BAD': {
        description: 'Flat hand from chin flips down',
        category: 'common',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.3, 0.4, 0.08], end: [0.3, 0.3, 0.15], flip: true },
            expression: 'displeased',
            duration: 1.2
        }
    },
    'WANT': {
        description: 'Claw hands pull toward body',
        category: 'common',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.2], end: [0.35, 0.2, 0.1], claw: true },
            leftHand: { start: [0.1, 0.25, 0.2], end: [0.15, 0.2, 0.1], claw: true },
            expression: 'eager',
            duration: 1.3
        }
    },
    'NEED': {
        description: 'X-hand bends at wrist repeatedly',
        category: 'common',
        color: '#FF5722',
        animation: {
            rightHand: { start: [0.35, 0.28, 0.12], end: [0.35, 0.22, 0.12], xShape: true, bend: true },
            expression: 'earnest',
            duration: 1.4
        }
    },
    'HAVE': {
        description: 'Bent hands touch chest',
        category: 'common',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.15], end: [0.3, 0.18, 0.08], bent: true },
            leftHand: { start: [0.1, 0.25, 0.15], end: [0.2, 0.18, 0.08], bent: true },
            expression: 'neutral',
            duration: 1.0
        }
    },
    'LIKE': {
        description: 'Middle finger and thumb pull away from chest',
        category: 'emotions',
        color: '#E91E63',
        animation: {
            rightHand: { start: [0.3, 0.2, 0.08], end: [0.38, 0.25, 0.15], pull: true },
            expression: 'pleased',
            duration: 1.2
        }
    },
    'DONT_LIKE': {
        description: 'Middle finger flicks away from chest',
        category: 'emotions',
        color: '#9E9E9E',
        animation: {
            rightHand: { start: [0.3, 0.2, 0.08], end: [0.4, 0.25, 0.2], flick: true },
            expression: 'displeased',
            duration: 1.2
        }
    },
    'COME': {
        description: 'Index fingers beckon toward body',
        category: 'actions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.2], end: [0.3, 0.25, 0.1], beckon: true, pointing: true },
            expression: 'inviting',
            duration: 1.3
        }
    },
    'GO': {
        description: 'Index fingers point and move away',
        category: 'actions',
        color: '#00BCD4',
        animation: {
            rightHand: { start: [0.3, 0.25, 0.1], end: [0.45, 0.25, 0.25], pointing: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'STOP': {
        description: 'Flat hand chops into palm',
        category: 'actions',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.4, 0.35, 0.15], end: [0.25, 0.25, 0.1], chop: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.15, 0.25, 0.1], palmUp: true },
            expression: 'firm',
            duration: 1.0
        }
    },
    'WAIT': {
        description: 'Open hands wiggle fingers',
        category: 'actions',
        color: '#FFC107',
        animation: {
            rightHand: { start: [0.4, 0.25, 0.15], end: [0.4, 0.25, 0.15], wiggle: true, openHand: true },
            leftHand: { start: [0.1, 0.25, 0.15], end: [0.1, 0.25, 0.15], wiggle: true, openHand: true },
            expression: 'patient',
            duration: 1.8
        }
    },
    'FINISH': {
        description: 'Open hands flip outward',
        category: 'actions',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.35, 0.28, 0.1], end: [0.45, 0.28, 0.18], flip: true, openHand: true },
            leftHand: { start: [0.15, 0.28, 0.1], end: [0.05, 0.28, 0.18], flip: true, openHand: true },
            expression: 'satisfied',
            duration: 1.2
        }
    },
    'START': {
        description: 'Index finger twists in other hand',
        category: 'actions',
        color: '#8BC34A',
        animation: {
            rightHand: { start: [0.25, 0.28, 0.1], end: [0.25, 0.28, 0.1], twist: true, pointing: true },
            leftHand: { start: [0.2, 0.25, 0.1], end: [0.2, 0.25, 0.1], flat: true },
            expression: 'alert',
            duration: 1.3
        }
    },
    'AGAIN': {
        description: 'Bent hand arcs into flat palm',
        category: 'time',
        color: '#9C27B0',
        animation: {
            rightHand: { start: [0.4, 0.3, 0.15], end: [0.2, 0.25, 0.1], arc: true, bent: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.15, 0.25, 0.1], palmUp: true },
            expression: 'neutral',
            duration: 1.3
        }
    },
    'MORE': {
        description: 'Bunched fingertips tap together',
        category: 'common',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.38, 0.28, 0.12], end: [0.28, 0.28, 0.1], bunched: true, tap: true },
            leftHand: { start: [0.12, 0.28, 0.12], end: [0.22, 0.28, 0.1], bunched: true },
            expression: 'eager',
            duration: 1.2
        }
    },
    'DIFFERENT': {
        description: 'Index fingers cross and separate',
        category: 'common',
        color: '#673AB7',
        animation: {
            rightHand: { start: [0.3, 0.28, 0.1], end: [0.45, 0.28, 0.15], pointing: true },
            leftHand: { start: [0.2, 0.28, 0.1], end: [0.05, 0.28, 0.15], pointing: true },
            expression: 'neutral',
            duration: 1.3
        }
    },
    'SAME': {
        description: 'Y-hands come together',
        category: 'common',
        color: '#607D8B',
        animation: {
            rightHand: { start: [0.4, 0.28, 0.12], end: [0.28, 0.28, 0.1], yShape: true },
            leftHand: { start: [0.1, 0.28, 0.12], end: [0.22, 0.28, 0.1], yShape: true },
            expression: 'neutral',
            duration: 1.2
        }
    },
    'MAYBE': {
        description: 'Flat hands alternate up and down',
        category: 'common',
        color: '#9E9E9E',
        animation: {
            rightHand: { start: [0.38, 0.3, 0.12], end: [0.38, 0.25, 0.12], alternate: true, flat: true },
            leftHand: { start: [0.12, 0.25, 0.12], end: [0.12, 0.3, 0.12], alternate: true, flat: true },
            expression: 'uncertain',
            duration: 1.5
        }
    },
    'IMPORTANT': {
        description: 'F-hands arc up and meet at center',
        category: 'common',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.4, 0.2, 0.12], end: [0.25, 0.35, 0.1], fShape: true, arc: true },
            leftHand: { start: [0.1, 0.2, 0.12], end: [0.25, 0.35, 0.1], fShape: true, arc: true },
            expression: 'earnest',
            duration: 1.5
        }
    },
    'PROBLEM': {
        description: 'Bent V-hands twist while touching',
        category: 'common',
        color: '#FF5722',
        animation: {
            rightHand: { start: [0.35, 0.3, 0.1], end: [0.32, 0.27, 0.1], bentV: true, twist: true },
            leftHand: { start: [0.15, 0.3, 0.1], end: [0.18, 0.27, 0.1], bentV: true, twist: true },
            expression: 'concerned',
            duration: 1.4
        }
    },
    'EASY': {
        description: 'Curved fingers brush up off other fingers',
        category: 'common',
        color: '#4CAF50',
        animation: {
            rightHand: { start: [0.2, 0.25, 0.08], end: [0.22, 0.32, 0.12], brushUp: true, curved: true },
            leftHand: { start: [0.15, 0.25, 0.1], end: [0.15, 0.25, 0.1], curved: true },
            expression: 'relaxed',
            duration: 1.2
        }
    },
    'HARD': {
        description: 'Bent V-hands strike together',
        category: 'common',
        color: '#F44336',
        animation: {
            rightHand: { start: [0.38, 0.32, 0.12], end: [0.28, 0.28, 0.1], bentV: true, strike: true },
            leftHand: { start: [0.12, 0.28, 0.1], end: [0.22, 0.28, 0.1], bentV: true },
            expression: 'strained',
            duration: 1.0
        }
    },
    'TRY': {
        description: 'S-hands push forward and down',
        category: 'actions',
        color: '#FF9800',
        animation: {
            rightHand: { start: [0.38, 0.28, 0.1], end: [0.4, 0.22, 0.18], sShape: true, push: true },
            leftHand: { start: [0.12, 0.28, 0.1], end: [0.1, 0.22, 0.18], sShape: true, push: true },
            expression: 'determined',
            duration: 1.3
        }
    },
    'REMEMBER': {
        description: 'Thumb touches forehead then moves to other thumb',
        category: 'communication',
        color: '#9C27B0',
        animation: {
            rightHand: { start: [0.32, 0.5, 0.05], end: [0.2, 0.28, 0.1], thumbUp: true },
            leftHand: { start: [0.18, 0.28, 0.1], end: [0.18, 0.28, 0.1], thumbUp: true },
            expression: 'thoughtful',
            duration: 1.5
        }
    },
    'FORGET': {
        description: 'Hand wipes across forehead and opens',
        category: 'communication',
        color: '#9E9E9E',
        animation: {
            rightHand: { start: [0.2, 0.52, 0.05], end: [0.45, 0.48, 0.1], wipe: true, openHand: true },
            expression: 'dismissive',
            duration: 1.3
        }
    }
};

// ASL Fingerspelling alphabet
const FINGERSPELLING = {
    'A': { description: 'Fist with thumb beside', handshape: 'fist_thumb_side' },
    'B': { description: 'Flat hand, thumb tucked', handshape: 'flat_thumb_tucked' },
    'C': { description: 'Curved hand, C-shape', handshape: 'c_shape' },
    'D': { description: 'Index up, others touch thumb', handshape: 'd_shape' },
    'E': { description: 'Fingers bent, thumb tucked', handshape: 'bent_fingers' },
    'F': { description: 'Thumb and index circle, others up', handshape: 'ok_sign' },
    'G': { description: 'Index and thumb parallel, pointing', handshape: 'g_shape' },
    'H': { description: 'Index and middle parallel, pointing', handshape: 'h_shape' },
    'I': { description: 'Pinky up only', handshape: 'pinky_up' },
    'J': { description: 'Pinky up, trace J in air', handshape: 'pinky_trace_j' },
    'K': { description: 'Index and middle up, thumb between', handshape: 'k_shape' },
    'L': { description: 'L-shape, thumb and index', handshape: 'l_shape' },
    'M': { description: 'Thumb under 3 fingers', handshape: 'm_shape' },
    'N': { description: 'Thumb under 2 fingers', handshape: 'n_shape' },
    'O': { description: 'Fingers curved to touch thumb', handshape: 'o_shape' },
    'P': { description: 'K-hand pointing down', handshape: 'p_shape' },
    'Q': { description: 'G-hand pointing down', handshape: 'q_shape' },
    'R': { description: 'Index and middle crossed', handshape: 'r_shape' },
    'S': { description: 'Fist with thumb over fingers', handshape: 's_shape' },
    'T': { description: 'Thumb between index and middle', handshape: 't_shape' },
    'U': { description: 'Index and middle up together', handshape: 'u_shape' },
    'V': { description: 'Index and middle in V', handshape: 'v_shape' },
    'W': { description: 'Index, middle, ring up', handshape: 'w_shape' },
    'X': { description: 'Index bent at knuckle', handshape: 'x_shape' },
    'Y': { description: 'Pinky and thumb extended', handshape: 'y_shape' },
    'Z': { description: 'Index traces Z in air', handshape: 'index_trace_z' }
};

class SignFallbackSystem {
    constructor() {
        this.db = signDatabase;
        this.fallbackSigns = FALLBACK_SIGNS;
        this.fingerspelling = FINGERSPELLING;
    }

    /**
     * Get sign data with fallback chain:
     * 1. Try SignAvatars video
     * 2. Fallback to procedural animation
     * 3. Last resort: fingerspelling
     */
    async getSign(signGloss, dialect = 'ASL', quality = '720p') {
        const upperGloss = signGloss.toUpperCase();

        // 1. Try to get from SignAvatars dataset first
        const videoPath = this.db.getSignVideo(upperGloss, dialect, quality);

        if (videoPath) {
            const metadata = this.db.getSignMetadata(upperGloss, dialect);
            return {
                type: 'video',
                gloss: upperGloss,
                source: videoPath,
                thumbnail: this.db.getSignThumbnail(upperGloss, dialect),
                duration: metadata?.duration || 2,
                format: 'signavatars',
                fallback: false
            };
        }

        // 2. Fallback to procedural animation
        if (this.fallbackSigns[upperGloss]) {
            const fallback = this.fallbackSigns[upperGloss];
            return {
                type: 'procedural',
                gloss: upperGloss,
                description: fallback.description,
                category: fallback.category,
                color: fallback.color,
                animation: this.generateProceduralAnimation(upperGloss, fallback.animation),
                duration: fallback.animation.duration,
                fallback: true
            };
        }

        // 3. Last resort: fingerspelling
        return {
            type: 'fingerspelling',
            gloss: upperGloss,
            letters: this.generateFingerspelling(upperGloss),
            duration: upperGloss.replace(/\s/g, '').length * 0.8, // 0.8s per letter
            fallback: true
        };
    }

    /**
     * Get multiple signs with fallbacks
     */
    async getSignSequence(glossArray, dialect = 'ASL', quality = '720p') {
        const results = [];

        for (const gloss of glossArray) {
            const sign = await this.getSign(gloss, dialect, quality);
            results.push(sign);
        }

        return results;
    }

    /**
     * Generate procedural animation keyframes for Three.js avatar
     */
    generateProceduralAnimation(signGloss, animationData) {
        const { rightHand, leftHand, expression, duration } = animationData;

        const keyframes = {
            duration: duration,
            fps: 60,
            totalFrames: Math.ceil(duration * 60),
            expression: expression || 'neutral',
            tracks: []
        };

        // Generate right hand track
        if (rightHand) {
            keyframes.tracks.push({
                target: 'rightHand',
                keyframes: this.generateHandKeyframes(rightHand, duration)
            });
        }

        // Generate left hand track
        if (leftHand) {
            keyframes.tracks.push({
                target: 'leftHand',
                keyframes: this.generateHandKeyframes(leftHand, duration)
            });
        }

        // Add expression track
        keyframes.tracks.push({
            target: 'face',
            keyframes: [
                { time: 0, expression: 'neutral' },
                { time: 0.1, expression: expression },
                { time: duration - 0.1, expression: expression },
                { time: duration, expression: 'neutral' }
            ]
        });

        return keyframes;
    }

    /**
     * Generate keyframes for a hand movement
     */
    generateHandKeyframes(handData, duration) {
        const { start, end, wave, circular, nod, shake, tap } = handData;
        const keyframes = [];
        const numFrames = Math.ceil(duration * 60);

        for (let i = 0; i <= numFrames; i++) {
            const t = i / numFrames;
            let position = this.lerp3(start, end, t);

            // Apply modifiers
            if (wave) {
                position[0] += Math.sin(t * Math.PI * 4) * 0.05;
            }
            if (circular) {
                position[0] += Math.cos(t * Math.PI * 2) * 0.03;
                position[1] += Math.sin(t * Math.PI * 2) * 0.03;
            }
            if (nod) {
                position[1] += Math.sin(t * Math.PI * 4) * 0.03;
            }
            if (shake) {
                position[0] += Math.sin(t * Math.PI * 6) * 0.04;
            }
            if (tap && t > 0.4 && t < 0.6) {
                position[2] -= 0.02;
            }

            keyframes.push({
                time: t * duration,
                position: position,
                handshape: handData.fist ? 'fist' :
                    handData.pointing ? 'point' :
                        handData.palmUp ? 'open_palm' : 'relaxed'
            });
        }

        return keyframes;
    }

    /**
     * Linear interpolation for 3D vectors
     */
    lerp3(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    /**
     * Generate fingerspelling sequence
     */
    generateFingerspelling(word) {
        const letters = word.replace(/\s/g, '').toUpperCase().split('');

        return letters.map((letter, index) => {
            const letterData = this.fingerspelling[letter];
            return {
                letter: letter,
                index: index,
                handshape: letterData?.handshape || 'unknown',
                description: letterData?.description || `Letter ${letter}`,
                duration: 0.8,
                startTime: index * 0.8
            };
        });
    }

    /**
     * Check if a sign has a video or needs fallback
     */
    checkSignAvailability(signGloss, dialect = 'ASL') {
        const upperGloss = signGloss.toUpperCase();

        return {
            gloss: upperGloss,
            hasVideo: this.db.hasSign(upperGloss, dialect),
            hasProcedural: !!this.fallbackSigns[upperGloss],
            canFingerspell: true
        };
    }

    /**
     * Get all available fallback signs
     */
    getAvailableFallbacks() {
        return Object.keys(this.fallbackSigns);
    }

    /**
     * Get signs by category
     */
    getSignsByCategory(category) {
        return Object.entries(this.fallbackSigns)
            .filter(([_, data]) => data.category === category)
            .map(([gloss, data]) => ({
                gloss,
                description: data.description,
                color: data.color
            }));
    }

    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set();
        Object.values(this.fallbackSigns).forEach(sign => {
            categories.add(sign.category);
        });
        return Array.from(categories);
    }
}

// Singleton instance
const signFallback = new SignFallbackSystem();

export { SignFallbackSystem, FALLBACK_SIGNS, FINGERSPELLING };
export default signFallback;
