// backend/services/geminiSignTranslation.js
// Specialized Gemini prompts for sign language translation with 3D pose data
// Now with verified sign database integration for improved accuracy

import {
    getVerifiedSign,
    textToGloss,
    isVerifiedSign,
    getVerifiedPoseKeyframes,
    concatenateSigns,
    validateSign
} from './signAccuracyValidator.js';

/**
 * Translate text using verified database first, AI for unknown signs
 * @param {string} text - Input text
 * @param {string} language - Sign language (ASL, BSL, etc.)
 * @returns {object} Translation result with verified and generated signs
 */
export function translateWithVerifiedSigns(text, language = 'ASL') {
    // Step 1: Get verified pose keyframes
    const verified = getVerifiedPoseKeyframes(text);

    // Step 2: Check if we have all signs
    if (verified.unknownGlosses.length === 0) {
        // All signs are verified - high confidence!
        return {
            success: true,
            source: 'verified_database',
            confidence: 0.95,
            ...verified,
            animation: concatenateSigns(verified.glosses)
        };
    }

    // Step 3: Some signs need AI generation
    return {
        success: true,
        source: 'hybrid',
        confidence: 0.7,
        verifiedSigns: verified.signs,
        unknownGlosses: verified.unknownGlosses,
        glosses: verified.glosses,
        message: `Found ${verified.signs.length} verified signs. Need AI for: ${verified.unknownGlosses.join(', ')}`
    };
}

/**
 * Generate prompt for text-to-sign translation
 * Returns detailed 3D pose data for Three.js avatar animation
 */
const textToSignPrompt = (text, language = "ASL") => `
You are an expert ${language} interpreter. Convert the following text into accurate sign language pose data for a Three.js 3D avatar.

INPUT TEXT: "${text}"

REQUIREMENTS:
1. Break down the text into individual signs following ${language} grammar (NOT English word order)
2. For each sign, provide precise 3D coordinates and rotations
3. Include proper facial expressions (MANDATORY in sign language grammar)
4. Specify handshapes using standard notation
5. Add timing for natural signing rhythm

OUTPUT FORMAT (JSON):
{
  "original_text": "${text}",
  "language": "${language}",
  "total_duration_ms": <number>,
  "signs": [
    {
      "gloss": "SIGN-NAME",
      "start_ms": 0,
      "end_ms": 800,
      "frames": [
        {
          "timestamp_ms": 0,
          "right_hand": {
            "position": [x, y, z],  // relative to torso center
            "rotation": [pitch, yaw, roll],  // in degrees
            "handshape": "5-hand|fist|point|flat|C-shape|etc",
            "palm_orientation": "up|down|forward|back|left|right"
          },
          "left_hand": { /* same structure */ },
          "head": {
            "rotation": [pitch, yaw, roll],
            "position": [x, y, z]
          },
          "face": {
            "eyebrows": "raised|neutral|furrowed|-5to5",
            "eyes": "wide|normal|squinted|-5to5", 
            "mouth": "open|closed|shape_description",
            "head_nod": "yes|no|none"
          },
          "torso": {
            "lean": [forward/back, left/right]  // in degrees
          }
        }
        // ... more keyframes for smooth animation
      ]
    }
  ],
  "notes": "Important signing context or variations",
  "difficulty": "beginner|intermediate|advanced"
}

COORDINATE SYSTEM:
- Origin: Avatar torso center
- X-axis: Left (-) to Right (+)
- Y-axis: Down (-) to Up (+)  
- Z-axis: Back (-) to Front (+)
- Typical signing space: X[-0.5, 0.5], Y[0, 0.8], Z[0.2, 0.6]

${language} GRAMMAR RULES:
- Use proper topicalization (topic-comment structure)
- Include grammatical facial expressions (raised eyebrows for questions, etc.)
- Respect dominant hand conventions
- Use directional verbs correctly
- Apply classifiers where appropriate
- Add non-manual markers (head tilts, shoulder shifts)

EXAMPLE REFERENCE POSITIONS:
- Neutral position: hands at sides, Y=0, X=±0.3
- Chest level: Y=0.4
- Face level: Y=0.7
- Signing space center: X=0, Y=0.5, Z=0.4

Generate at least 5-10 keyframes per sign for smooth animation. Ensure transitions between signs are natural.
`;

/**
 * Handshape definitions for reference
 */
const HANDSHAPES = {
    '5-hand': { description: 'All fingers extended and spread', fingers: 'all-extended' },
    'fist': { description: 'All fingers curled into palm', fingers: 'all-closed' },
    'point': { description: 'Index finger extended, others closed', fingers: 'index-only' },
    'flat': { description: 'All fingers extended and together', fingers: 'flat-palm' },
    'C-shape': { description: 'Curved hand forming C', fingers: 'curved' },
    'L-shape': { description: 'Thumb and index extended at 90°', fingers: 'L-hand' },
    'Y-hand': { description: 'Thumb and pinky extended', fingers: 'Y-hand' },
    'ILY': { description: 'I Love You - pinky, index, thumb extended', fingers: 'ILY' },
    'V-hand': { description: 'Index and middle fingers extended', fingers: 'V-shape' },
    'horns': { description: 'Index and pinky extended', fingers: 'horns' },
    'bent-V': { description: 'V-hand with fingers bent at knuckles', fingers: 'bent-V' },
    'O-hand': { description: 'Fingers and thumb touching to form O', fingers: 'O-shape' },
    'baby-O': { description: 'Index and thumb touching, others extended', fingers: 'baby-O' }
};

/**
 * Reference positions for common signing locations
 */
const REFERENCE_POSITIONS = {
    neutral: { right: [0.3, 0, 0.3], left: [-0.3, 0, 0.3] },
    chest: { right: [0.2, 0.4, 0.4], left: [-0.2, 0.4, 0.4] },
    face: { right: [0.15, 0.7, 0.35], left: [-0.15, 0.7, 0.35] },
    forehead: { right: [0.1, 0.8, 0.3], left: [-0.1, 0.8, 0.3] },
    chin: { right: [0.05, 0.5, 0.4], left: [-0.05, 0.5, 0.4] },
    shoulder: { right: [0.35, 0.5, 0.2], left: [-0.35, 0.5, 0.2] },
    centerSpace: { right: [0, 0.5, 0.5], left: [0, 0.5, 0.5] }
};

/**
 * Facial expression presets for grammatical markers
 */
const FACIAL_EXPRESSIONS = {
    question_yn: { eyebrows: 'raised', eyes: 'wide', mouth: 'slightly_open', head_nod: 'none' },
    question_wh: { eyebrows: 'furrowed', eyes: 'squinted', mouth: 'neutral', head_nod: 'none' },
    affirmative: { eyebrows: 'neutral', eyes: 'normal', mouth: 'relaxed', head_nod: 'yes' },
    negative: { eyebrows: 'furrowed', eyes: 'squinted', mouth: 'tight', head_nod: 'no' },
    topicalization: { eyebrows: 'raised', eyes: 'normal', mouth: 'neutral', head_nod: 'none' },
    emphasis: { eyebrows: 'raised', eyes: 'wide', mouth: 'pursed', head_nod: 'none' },
    neutral: { eyebrows: 'neutral', eyes: 'normal', mouth: 'relaxed', head_nod: 'none' }
};

/**
 * Parse Gemini response and validate pose data
 */
function parseSignPoseData(responseText) {
    try {
        // Remove markdown code blocks if present
        let cleanedText = responseText;
        if (cleanedText.includes('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.includes('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(cleanedText.trim());

        // Validate required fields
        if (!parsed.signs || !Array.isArray(parsed.signs)) {
            throw new Error('Missing or invalid signs array');
        }

        // Validate each sign
        parsed.signs.forEach((sign, idx) => {
            if (!sign.gloss) throw new Error(`Sign at index ${idx} missing gloss`);
            if (!sign.frames || !Array.isArray(sign.frames)) {
                throw new Error(`Sign "${sign.gloss}" missing frames array`);
            }
        });

        return parsed;
    } catch (error) {
        console.error('Failed to parse sign pose data:', error);
        throw error;
    }
}

/**
 * Generate interpolated keyframes between two poses
 * @param {Object} startPose - Starting pose
 * @param {Object} endPose - Ending pose
 * @param {number} steps - Number of interpolation steps
 * @returns {Array} Array of interpolated poses
 */
function interpolatePoses(startPose, endPose, steps) {
    const frames = [];

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Use ease-in-out for smoother animation
        const eased = t < 0.5
            ? 2 * t * t
            : 1 - Math.pow(-2 * t + 2, 2) / 2;

        frames.push({
            timestamp_ms: startPose.timestamp_ms + (endPose.timestamp_ms - startPose.timestamp_ms) * t,
            right_hand: interpolateHand(startPose.right_hand, endPose.right_hand, eased),
            left_hand: interpolateHand(startPose.left_hand, endPose.left_hand, eased),
            head: interpolateHead(startPose.head, endPose.head, eased),
            face: endPose.face, // Face expressions don't interpolate smoothly
            torso: interpolateTorso(startPose.torso, endPose.torso, eased)
        });
    }

    return frames;
}

function interpolateHand(start, end, t) {
    return {
        position: lerpArray(start.position, end.position, t),
        rotation: lerpArray(start.rotation, end.rotation, t),
        handshape: end.handshape,
        palm_orientation: end.palm_orientation
    };
}

function interpolateHead(start, end, t) {
    return {
        position: lerpArray(start.position, end.position, t),
        rotation: lerpArray(start.rotation, end.rotation, t)
    };
}

function interpolateTorso(start, end, t) {
    return {
        lean: lerpArray(start.lean, end.lean, t)
    };
}

function lerpArray(a, b, t) {
    return a.map((val, i) => val + (b[i] - val) * t);
}

/**
 * Add transition frames between signs
 */
function addTransitionFrames(signs, transitionMs = 150) {
    const result = [];

    for (let i = 0; i < signs.length; i++) {
        result.push(signs[i]);

        if (i < signs.length - 1) {
            const currentEnd = signs[i].frames[signs[i].frames.length - 1];
            const nextStart = signs[i + 1].frames[0];

            const transitionFrames = interpolatePoses(
                { ...currentEnd, timestamp_ms: signs[i].end_ms },
                { ...nextStart, timestamp_ms: signs[i + 1].start_ms },
                3
            );

            result.push({
                gloss: '_TRANSITION_',
                start_ms: signs[i].end_ms,
                end_ms: signs[i + 1].start_ms,
                frames: transitionFrames,
                isTransition: true
            });
        }
    }

    return result;
}

export {
    textToSignPrompt,
    translateWithVerifiedSigns,
    HANDSHAPES,
    REFERENCE_POSITIONS,
    FACIAL_EXPRESSIONS,
    parseSignPoseData,
    interpolatePoses,
    addTransitionFrames,
    // Re-export validator functions
    getVerifiedSign,
    textToGloss,
    isVerifiedSign,
    validateSign
};

export default {
    textToSignPrompt,
    translateWithVerifiedSigns,
    HANDSHAPES,
    REFERENCE_POSITIONS,
    FACIAL_EXPRESSIONS,
    parseSignPoseData,
    interpolatePoses,
    addTransitionFrames,
    getVerifiedSign,
    textToGloss,
    isVerifiedSign,
    validateSign
};

