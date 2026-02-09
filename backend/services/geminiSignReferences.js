// backend/services/geminiSignReferences.js
// ASL reference image sources and generation service

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Curated list of publicly available ASL reference sources
 */
const ASL_REFERENCE_SOURCES = {
    lifeprint: {
        name: 'Lifeprint / ASL University',
        url: 'https://www.lifeprint.com/asl101/',
        description: 'Dr. Bill Vicars\' comprehensive ASL resource',
        imageBase: 'https://www.lifeprint.com/asl101/images-layout/',
        features: ['Dictionary', 'Lessons', 'Fingerspelling', 'Video examples'],
        license: 'Educational use'
    },
    signingsavvy: {
        name: 'Signing Savvy',
        url: 'https://www.signingsavvy.com/',
        description: 'ASL video dictionary with multiple sign variations',
        features: ['Video dictionary', 'Word lists', 'Quizzes'],
        license: 'Subscription required for full access'
    },
    spreadthesign: {
        name: 'Spread The Sign',
        url: 'https://www.spreadthesign.com/',
        description: 'International sign language dictionary',
        features: ['Multiple sign languages', 'Video examples', 'Categories'],
        license: 'Free educational resource'
    },
    handspeak: {
        name: 'HandSpeak',
        url: 'https://www.handspeak.com/',
        description: 'ASL dictionary and learning resources',
        features: ['Video dictionary', 'ASL grammar', 'Deaf culture'],
        license: 'Educational use'
    },
    aslpro: {
        name: 'ASL Pro',
        url: 'https://www.aslpro.com/',
        description: 'Free ASL video dictionary',
        features: ['Video dictionary', 'Religious signs', 'Main dictionary'],
        license: 'Free'
    }
};

/**
 * Common ASL signs with descriptions for reference generation
 */
const SIGN_DESCRIPTIONS = {
    // Greetings
    'HELLO': 'Hand at forehead in salute position, moves outward. Open palm, fingers together.',
    'GOODBYE': 'Open hand waves side to side, palm facing outward.',
    'THANK-YOU': 'Flat hand touches chin then moves forward and down, like blowing a kiss.',
    'PLEASE': 'Open palm circles on chest clockwise.',
    'SORRY': 'Fist (A-hand) circles on chest.',
    'YES': 'Fist (S-hand) nods like a head nodding yes.',
    'NO': 'Index and middle fingers snap against thumb.',

    // Introduction
    'NAME': 'Two H-hands (index and middle extended) tap together at middle fingers.',
    'ME': 'Point index finger to chest.',
    'YOU': 'Point index finger forward toward person.',
    'NICE': 'Right flat hand slides across left flat palm, palms facing each other.',
    'MEET': 'Two 1-hands (index fingers pointing up) come together.',

    // Family
    'MOTHER': 'Open hand, thumb touches chin.',
    'FATHER': 'Open hand, thumb touches forehead.',
    'SISTER': 'A-hand at chin moves down to two 1-hands tapping.',
    'BROTHER': 'A-hand at forehead moves down to two 1-hands tapping.',
    'FAMILY': 'Two F-hands (thumb and index touching) circle outward to form family shape.',

    // Questions
    'WHAT': 'Palms up, shrug, eyebrows furrowed.',
    'WHO': 'Index finger circles near mouth, eyebrows furrowed.',
    'WHERE': 'Index finger shakes side to side, eyebrows furrowed.',
    'WHEN': 'Index finger circles then touches other index finger, eyebrows furrowed.',
    'WHY': 'Touch forehead, hand moves to Y-hand, eyebrows furrowed.',
    'HOW': 'Two fists, thumbs up, twist to palms up, eyebrows furrowed.',

    // Emotions
    'HAPPY': 'Two flat hands brush up chest repeatedly.',
    'SAD': 'Two hands in front of face, palms in, move downward.',
    'ANGRY': 'Claw hand in front of face, pulls outward with tense expression.',
    'SCARED': 'Two fists at sides, shake while moving inward, scared expression.',
    'LOVE': 'Crossed arms over chest, like hugging.',

    // Common
    'HELP': 'A-hand (fist) on flat palm, both rise.',
    'WANT': 'Two claw hands pull toward body.',
    'LIKE': 'Middle finger and thumb on chest, pull out while closing.',
    'UNDERSTAND': 'Fist at forehead, index finger flicks up.',
    'LEARN': 'Fingers grab from flat palm to forehead.',
    'TEACH': 'Two O-hands at temples move forward.'
};

/**
 * Generate reference image for a sign using Gemini
 * Note: Requires gemini-2.0-flash with image generation capabilities
 */
async function generateSignReferenceImage(signName, customDescription = null) {
    const description = customDescription || SIGN_DESCRIPTIONS[signName.toUpperCase()] ||
        `The ASL sign for "${signName}"`;

    // Note: Image generation may require specific model version
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp"
    });

    const prompt = `
Create a clear, educational reference image for the ASL sign: "${signName}"

SIGN DESCRIPTION: ${description}

REQUIREMENTS:
- Show a person performing the sign from front view
- Clear hand position and shape visible
- Include arrows showing movement direction if there is motion
- Include side-view diagram if the sign requires depth perception
- Educational illustration style (clean, simple, not photorealistic)
- High contrast for visibility
- Neutral background
- Show both starting and ending positions if sign involves movement
- Label key elements (hand shape, palm orientation, location)

STYLE:
- Professional educational illustration
- Similar to sign language textbook diagrams
- Accessibility-focused (clear, high contrast)
`;

    try {
        const result = await model.generateContent(prompt);
        return {
            success: true,
            sign: signName,
            description,
            result: result.response
        };
    } catch (error) {
        console.error('Image generation error:', error);
        return {
            success: false,
            sign: signName,
            error: error.message,
            fallback: getSignReferenceUrl(signName)
        };
    }
}

/**
 * Get URL to external sign reference
 */
function getSignReferenceUrl(signName) {
    const normalized = signName.toLowerCase().replace(/[^a-z]/g, '');

    return {
        lifeprint: `https://www.lifeprint.com/asl101/pages-signs/${normalized[0]}/${normalized}.htm`,
        signingsavvy: `https://www.signingsavvy.com/sign/${normalized.toUpperCase()}`,
        handspeak: `https://www.handspeak.com/word/${normalized}`
    };
}

/**
 * Generate a visual guide for a sign with text descriptions
 */
async function generateSignGuide(signName, language = "ASL") {
    const description = SIGN_DESCRIPTIONS[signName.toUpperCase()];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
Create a detailed visual guide for the ${language} sign: "${signName}"
${description ? `Known description: ${description}` : ''}

OUTPUT (JSON):
{
  "sign": "${signName}",
  "language": "${language}",
  "visual_guide": {
    "preparation": "How to prepare for the sign",
    "handshape": {
      "right_hand": "Detailed description",
      "left_hand": "Detailed description or 'not used'",
      "visual_analogy": "What it looks like (e.g., 'like holding a ball')"
    },
    "location": {
      "description": "Where the sign is performed",
      "body_reference": "Chin/forehead/chest/neutral space",
      "height": "High/middle/low in signing space"
    },
    "movement": {
      "type": "Type of movement",
      "direction": "Direction of travel",
      "path": "Straight/arc/circular/etc",
      "repetitions": 1,
      "speed": "Quick/moderate/slow"
    },
    "palm_orientation": {
      "start": "Which way palm faces at start",
      "end": "Which way palm faces at end"
    },
    "facial_expression": {
      "required": true/false,
      "description": "What expression to use",
      "grammar_note": "Why this expression matters"
    }
  },
  "step_by_step": [
    "Step 1: Detailed instruction",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "common_mistakes": [
    "What learners often do wrong"
  ],
  "memory_tip": "Easy way to remember this sign",
  "practice_drill": "Simple exercise to practice"
}
`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Create ASCII art representation of hand position (for text-based reference)
 */
function getHandshapeAscii(handshape) {
    const shapes = {
        'fist': `
    ✊
   /||\\
    `,
        'open': `
   🖐️
   |||||
    `,
        'point': `
   👆
   | ||
    `,
        'flat': `
   ✋
   |||||
    `,
        'C': `
    🤏
   ( )
    `,
        'L': `
   🤙
   |_
    `,
        'Y': `
   🤙
   \\ /
    `
    };

    return shapes[handshape.toLowerCase()] || shapes['open'];
}

/**
 * Build reference library from descriptions
 */
async function buildReferenceLibrary(outputDir = './reference_guides') {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const library = {};

    for (const [sign, description] of Object.entries(SIGN_DESCRIPTIONS)) {
        console.log(`Generating guide for: ${sign}`);

        try {
            const guide = await generateSignGuide(sign);
            library[sign] = {
                ...guide,
                description,
                externalLinks: getSignReferenceUrl(sign)
            };

            // Save individual guide
            fs.writeFileSync(
                path.join(outputDir, `${sign}.json`),
                JSON.stringify(library[sign], null, 2)
            );

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Failed for ${sign}:`, error.message);
            library[sign] = { error: error.message, description };
        }
    }

    // Save complete library
    fs.writeFileSync(
        path.join(outputDir, 'complete_library.json'),
        JSON.stringify(library, null, 2)
    );

    console.log(`✅ Library saved to ${outputDir}/`);
    return library;
}

/**
 * Parse JSON from response
 */
function parseJSON(text) {
    let cleanedText = text;
    if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    return JSON.parse(cleanedText.trim());
}

export {
    ASL_REFERENCE_SOURCES,
    SIGN_DESCRIPTIONS,
    generateSignReferenceImage,
    getSignReferenceUrl,
    generateSignGuide,
    getHandshapeAscii,
    buildReferenceLibrary
};

export default {
    ASL_REFERENCE_SOURCES,
    SIGN_DESCRIPTIONS,
    generateSignReferenceImage,
    getSignReferenceUrl,
    generateSignGuide,
    getHandshapeAscii,
    buildReferenceLibrary
};
