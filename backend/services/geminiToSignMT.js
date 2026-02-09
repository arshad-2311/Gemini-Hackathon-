// backend/services/geminiToSignMT.js
// Gemini-powered translation to SiGML for Sign.MT avatar animation

import { GoogleGenerativeAI } from "@google/generative-ai";
import xml2js from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

/**
 * Translate text to SiGML (Signing Gesture Markup Language)
 * @param {string} text - Text to translate
 * @param {string} targetSignLanguage - Target sign language (ASL, BSL, etc.)
 * @returns {Object} SiGML data with XML markup
 */
async function translateTextToSiGML(text, targetSignLanguage = 'ASL') {
    const prompt = `
You are an expert in sign language translation and SiGML (Signing Gesture Markup Language) generation.

Convert the following text to accurate SiGML markup for ${targetSignLanguage}:

TEXT: "${text}"

CRITICAL REQUIREMENTS:

1. **Follow SiGML XML Schema**:
   - Use proper <sigml>, <hns_sign>, <hamgestural_sign> tags
   - Include timing attributes
   - Specify hand configurations using HamNoSys notation

2. **HamNoSys Notation Rules**:
   - Hand shape symbols (flat hand, fist, pointing, etc.)
   - Palm orientation (up, down, left, right, forward, back)
   - Location symbols (head, chest, neutral space)
   - Movement symbols (straight, arc, circular, twist)

3. **Sign Language Grammar**:
   - Use ${targetSignLanguage} word order (NOT English order)
   - Include non-manual signals (facial expressions, head movements)
   - Apply proper topicalization and spatial grammar

4. **Technical Accuracy**:
   - Each sign must have valid HamNoSys encoding
   - Include speed and timing attributes
   - Specify dominant hand correctly
   - Add facial expression markers

OUTPUT FORMAT (Valid SiGML XML):

<?xml version="1.0" encoding="UTF-8"?>
<sigml>
  <hamgestural_sign gloss="HELLO">
    <sign_manual>
      <handconfig handshape="flat" />
      <handconfig extfidir="ol" />
      <handconfig palmor="d" />
      <location_bodyarm location="chest" />
      <par_motion>
        <directedmotion direction="o" size="big" />
      </par_motion>
    </sign_manual>
    <sign_nonmanual>
      <facial_expr movement="smile" intensity="medium" />
      <head_movement movement="nod" />
    </sign_nonmanual>
  </hamgestural_sign>
  
  <!-- Add more signs as needed -->
  
</sigml>

EXAMPLE HANDSHAPE CODES:
- flat = flat hand (all fingers extended)
- fist = closed fist
- finger2 = pointing with index finger
- cee = C-shape hand
- pinch12 = thumb and index pinched
- finger23 = V-shape (index and middle)
- finger2345 = four fingers extended
- cee12 = baby C-shape

EXAMPLE PALM ORIENTATIONS:
- u = up, d = down
- l = left, r = right  
- o = out (away from body), i = in (toward body)
- ul = up-left, ur = up-right
- dl = down-left, dr = down-right

EXAMPLE LOCATIONS:
- chest, face, head, stomach
- shoulders, neck, forehead, chin
- ear, nose, cheek, mouth
- neutral = neutral signing space

EXAMPLE MOVEMENTS:
- directedmotion = straight movement
- circularmotion = circular movement
- nomotion = hold position
- arcmotion = arc-shaped movement
- wristmotion = wrist rotation
- fingerplay = finger wiggle

EXAMPLE EXTENDED FINGER DIRECTIONS:
- u = up, d = down
- l = left, r = right
- o = out (forward), i = in (back)
- ol = out-left, or = out-right

Generate ONLY valid SiGML XML. No explanations before or after the XML.
`;

    try {
        const result = await model.generateContent(prompt);
        let sigml = result.response.text();

        // Extract XML if wrapped in markdown
        if (sigml.includes('```xml')) {
            const match = sigml.match(/```xml\n?([\s\S]*?)\n?```/);
            if (match) sigml = match[1];
        } else if (sigml.includes('```')) {
            const match = sigml.match(/```\n?([\s\S]*?)\n?```/);
            if (match) sigml = match[1];
        }

        // Clean up
        sigml = sigml.trim();

        // Validate XML structure
        const isValid = await validateSiGML(sigml);

        return {
            success: true,
            text,
            targetLanguage: targetSignLanguage,
            sigml,
            isValidXml: isValid,
            generatedBy: 'gemini-2.0-flash-exp'
        };

    } catch (error) {
        console.error('Gemini SiGML generation error:', error);
        throw error;
    }
}

/**
 * Validate SiGML XML structure
 */
async function validateSiGML(sigml) {
    try {
        const parser = new xml2js.Parser();
        await parser.parseStringPromise(sigml);
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse SiGML to extract sign data
 */
async function parseSiGML(sigml) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(sigml);

    const signs = [];

    if (result.sigml && result.sigml.hamgestural_sign) {
        const signArray = Array.isArray(result.sigml.hamgestural_sign)
            ? result.sigml.hamgestural_sign
            : [result.sigml.hamgestural_sign];

        for (const sign of signArray) {
            signs.push({
                gloss: sign.$.gloss,
                manual: sign.sign_manual,
                nonManual: sign.sign_nonmanual
            });
        }
    }

    return signs;
}

/**
 * Convert SiGML to pose keyframes for Three.js avatar
 */
async function sigmlToPoseKeyframes(sigml, language = 'ASL') {
    const signs = await parseSiGML(sigml);
    const keyframes = [];
    let currentTime = 0;

    for (const sign of signs) {
        const prompt = `
Convert this SiGML sign data to 3D pose keyframes:

GLOSS: ${sign.gloss}
MANUAL DATA: ${JSON.stringify(sign.manual)}
NON-MANUAL DATA: ${JSON.stringify(sign.nonManual)}

OUTPUT (JSON only):
{
  "gloss": "${sign.gloss}",
  "duration_ms": 800,
  "keyframes": [
    {
      "timestamp_ms": 0,
      "right_hand": {
        "position": [x, y, z],
        "rotation": [rx, ry, rz],
        "handshape": "description"
      },
      "left_hand": {
        "position": [x, y, z],
        "rotation": [rx, ry, rz],
        "handshape": "description"
      },
      "face": {
        "eyebrows": "neutral|raised|furrowed",
        "mouth": "description"
      }
    }
  ]
}

COORDINATE SYSTEM:
- X: -0.5 (left) to 0.5 (right)
- Y: 0 (waist) to 0.8 (above head)
- Z: 0 (at body) to 0.6 (arm extended)
`;

        try {
            const result = await model.generateContent(prompt);
            let poseData = result.response.text();

            // Parse JSON
            if (poseData.includes('```json')) {
                const match = poseData.match(/```json\n?([\s\S]*?)\n?```/);
                if (match) poseData = match[1];
            } else if (poseData.includes('```')) {
                const match = poseData.match(/```\n?([\s\S]*?)\n?```/);
                if (match) poseData = match[1];
            }

            const parsed = JSON.parse(poseData.trim());

            // Adjust timestamps
            parsed.keyframes.forEach(kf => {
                kf.timestamp_ms += currentTime;
            });

            keyframes.push(parsed);
            currentTime += parsed.duration_ms;

        } catch (err) {
            console.error(`Failed to convert sign ${sign.gloss}:`, err);
        }
    }

    return {
        total_duration_ms: currentTime,
        signs: keyframes
    };
}

/**
 * Generate SiGML for a single sign
 */
async function generateSignSiGML(signGloss, language = 'ASL') {
    const prompt = `
Generate valid SiGML for the ${language} sign: "${signGloss}"

OUTPUT (SiGML XML only):
<?xml version="1.0" encoding="UTF-8"?>
<sigml>
  <hamgestural_sign gloss="${signGloss}">
    <!-- Include complete sign_manual and sign_nonmanual data -->
  </hamgestural_sign>
</sigml>
`;

    const result = await model.generateContent(prompt);
    let sigml = result.response.text();

    // Extract XML
    if (sigml.includes('```xml')) {
        const match = sigml.match(/```xml\n?([\s\S]*?)\n?```/);
        if (match) sigml = match[1];
    } else if (sigml.includes('```')) {
        const match = sigml.match(/```\n?([\s\S]*?)\n?```/);
        if (match) sigml = match[1];
    }

    return sigml.trim();
}

/**
 * Build SiGML dictionary for common signs
 */
async function buildSiGMLDictionary(signs, language = 'ASL') {
    const dictionary = {};

    for (const sign of signs) {
        console.log(`Generating SiGML for: ${sign}`);
        try {
            dictionary[sign] = await generateSignSiGML(sign, language);
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            console.error(`Failed for ${sign}:`, err.message);
            dictionary[sign] = null;
        }
    }

    return dictionary;
}

/**
 * HamNoSys notation reference
 */
const HAMNOSYS_REFERENCE = {
    handshapes: {
        flat: 'All fingers extended and together',
        fist: 'Closed fist',
        finger2: 'Index finger pointing',
        finger23: 'Index and middle extended (V-shape)',
        finger2345: 'Four fingers extended, thumb closed',
        cee: 'C-shape hand',
        pinch12: 'Thumb and index pinched',
        pinchall: 'All fingers pinched to thumb'
    },
    palmOrientations: {
        u: 'Palm up',
        d: 'Palm down',
        l: 'Palm left',
        r: 'Palm right',
        o: 'Palm out (away from body)',
        i: 'Palm in (toward body)'
    },
    locations: {
        neutral: 'Neutral signing space',
        chest: 'Chest level',
        face: 'Face level',
        head: 'Head level',
        forehead: 'At forehead',
        chin: 'At chin',
        shoulders: 'At shoulders'
    },
    movements: {
        directedmotion: 'Straight movement',
        circularmotion: 'Circular movement',
        arcmotion: 'Arc-shaped movement',
        nomotion: 'No movement (hold)',
        wristmotion: 'Wrist rotation',
        fingerplay: 'Finger movement'
    }
};

export {
    translateTextToSiGML,
    validateSiGML,
    parseSiGML,
    sigmlToPoseKeyframes,
    generateSignSiGML,
    buildSiGMLDictionary,
    HAMNOSYS_REFERENCE
};

export default {
    translateTextToSiGML,
    validateSiGML,
    parseSiGML,
    sigmlToPoseKeyframes,
    generateSignSiGML,
    buildSiGMLDictionary,
    HAMNOSYS_REFERENCE
};
