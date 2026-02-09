// backend/services/geminiVisualSignLearning.js
// Visual analysis service for learning signs from reference images

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

/**
 * Analyze a sign from a reference image (ASL chart, video frame, etc.)
 * @param {string} signName - Name/gloss of the sign
 * @param {string} referenceImagePath - Path to reference image file
 * @param {string} language - Sign language dialect (ASL, BSL, ISL)
 * @returns {Object} Detailed pose data for the sign
 */
async function analyzeSignFromReference(signName, referenceImagePath, language = "ASL") {
    // Read reference image
    const imageData = fs.readFileSync(referenceImagePath);
    const base64Image = imageData.toString('base64');

    // Determine mime type from extension
    const ext = path.extname(referenceImagePath).toLowerCase();
    const mimeType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }[ext] || 'image/jpeg';

    const prompt = `
You are analyzing an ${language} reference image for the sign: "${signName}"

ANALYZE THIS IMAGE AND EXTRACT:

1. **Hand Shape Details:**
   - Right hand: finger positions (extended/bent/closed for each finger)
   - Left hand: finger positions
   - Palm orientation (facing up/down/forward/back/left/right)
   - Hand configuration (fist/flat/pointing/C-shape/etc.)

2. **Spatial Positioning:**
   - Hand location relative to body (chest/face/neutral space/head level)
   - Approximate 3D coordinates if hands were in a coordinate system where:
     * Torso center = (0, 0, 0)
     * X-axis: Left(-) to Right(+), range: -0.6 to 0.6
     * Y-axis: Down(-) to Up(+), range: -0.2 to 0.9
     * Z-axis: Back(-) to Front(+), range: 0 to 0.7
   - Distance between hands if two-handed sign

3. **Movement Pattern:**
   - Type of movement (straight/circular/arc/twist/shake/tap)
   - Direction of movement
   - Speed (quick/moderate/slow)
   - Start and end positions

4. **Facial Expression & Non-Manual Markers:**
   - Eyebrow position (raised/neutral/furrowed)
   - Eye expression
   - Mouth shape
   - Head position/tilt

5. **Critical Details:**
   - Contact points (if hands touch body or each other)
   - Dominant hand (if one-handed sign)
   - Symmetry (if two-handed sign uses mirror or parallel motion)

OUTPUT FORMAT (JSON only, no markdown):
{
  "sign": "${signName}",
  "language": "${language}",
  "analysis_confidence": "high/medium/low",
  "hand_configuration": {
    "right_hand": {
      "shape": "detailed description",
      "fingers": {
        "thumb": "extended/bent/closed",
        "index": "extended/bent/closed",
        "middle": "extended/bent/closed",
        "ring": "extended/bent/closed",
        "pinky": "extended/bent/closed"
      },
      "palm_orientation": "up/down/forward/back",
      "position_3d": [x, y, z],
      "position_description": "chest level, centered"
    },
    "left_hand": {
      "shape": "detailed description or null if not used",
      "fingers": {
        "thumb": "extended/bent/closed",
        "index": "extended/bent/closed",
        "middle": "extended/bent/closed",
        "ring": "extended/bent/closed",
        "pinky": "extended/bent/closed"
      },
      "palm_orientation": "up/down/forward/back",
      "position_3d": [x, y, z],
      "position_description": "description"
    }
  },
  "movement": {
    "type": "arc/straight/circular/twist/none",
    "direction": "upward/forward/etc",
    "path_description": "detailed description",
    "duration_estimate_ms": 800,
    "keyframes_needed": 6,
    "repetitions": 1
  },
  "facial_expression": {
    "eyebrows": "raised/neutral/furrowed",
    "eyes": "normal/wide/squinted",
    "mouth": "description",
    "head_tilt": "none/left/right/forward/back",
    "other_markers": "description"
  },
  "pose_sequence": [
    {
      "keyframe": 1,
      "timestamp_ms": 0,
      "phase": "preparation/stroke/hold/retraction",
      "description": "starting position",
      "right_hand": {"pos": [x,y,z], "rot": [rx,ry,rz]},
      "left_hand": {"pos": [x,y,z], "rot": [rx,ry,rz]},
      "face": {"eyebrows": "neutral", "mouth": "relaxed"}
    }
  ],
  "two_handed": true/false,
  "dominant_hand": "right/left",
  "symmetry_type": "mirror/parallel/alternating/none",
  "contact_points": ["chin", "chest", "etc"],
  "signing_notes": "Important details for deaf comprehension",
  "common_mistakes": ["mistakes learners make"],
  "memory_tip": "Easy way to remember this sign"
}

Be EXTREMELY precise. Deaf comprehension depends on accuracy.
`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: mimeType,
                data: base64Image
            }
        }
    ]);

    const response = result.response.text();

    // Extract JSON from response
    let poseData;
    try {
        if (response.includes('```json')) {
            const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                poseData = JSON.parse(jsonMatch[1]);
            }
        } else if (response.includes('```')) {
            const jsonMatch = response.match(/```\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                poseData = JSON.parse(jsonMatch[1]);
            }
        } else {
            poseData = JSON.parse(response.trim());
        }
    } catch (parseError) {
        console.error('Failed to parse sign analysis response:', parseError);
        throw new Error(`Failed to parse sign analysis: ${parseError.message}`);
    }

    return poseData;
}

/**
 * Analyze a sign from a base64 encoded image
 * @param {string} signName - Name/gloss of the sign
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} language - Sign language dialect
 * @returns {Object} Detailed pose data for the sign
 */
async function analyzeSignFromBase64(signName, base64Image, language = "ASL") {
    // Remove data URL prefix if present
    const imageData = base64Image.includes(',')
        ? base64Image.split(',')[1]
        : base64Image;

    const prompt = generateAnalysisPrompt(signName, language);

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: imageData
            }
        }
    ]);

    return parseAnalysisResponse(result.response.text());
}

/**
 * Analyze multiple reference images for the same sign (different angles/frames)
 * @param {string} signName - Name of the sign
 * @param {Array<string>} imagePaths - Array of image file paths
 * @param {string} language - Sign language dialect
 * @returns {Object} Combined analysis from all images
 */
async function analyzeSignFromMultipleReferences(signName, imagePaths, language = "ASL") {
    const analyses = await Promise.all(
        imagePaths.map(async (imagePath, index) => {
            try {
                const analysis = await analyzeSignFromReference(signName, imagePath, language);
                return { frame: index + 1, path: imagePath, analysis, success: true };
            } catch (error) {
                return { frame: index + 1, path: imagePath, error: error.message, success: false };
            }
        })
    );

    // Combine successful analyses
    const successfulAnalyses = analyses.filter(a => a.success);

    if (successfulAnalyses.length === 0) {
        throw new Error('All image analyses failed');
    }

    // Merge pose sequences from multiple frames
    const mergedSequence = successfulAnalyses.flatMap((a, idx) => {
        const sequence = a.analysis.pose_sequence || [];
        return sequence.map(pose => ({
            ...pose,
            source_frame: a.frame,
            timestamp_ms: pose.timestamp_ms + (idx * 500) // Offset each frame
        }));
    });

    return {
        sign: signName,
        language,
        source_images: analyses.length,
        successful_analyses: successfulAnalyses.length,
        combined_pose_sequence: mergedSequence,
        individual_analyses: successfulAnalyses.map(a => a.analysis)
    };
}

/**
 * Compare user's sign attempt to reference
 */
async function compareSignToReference(userImage, referenceData, language = "ASL") {
    const imageData = userImage.includes(',') ? userImage.split(',')[1] : userImage;

    const prompt = `
Compare this user's sign attempt to the reference data:

REFERENCE SIGN: "${referenceData.sign}"
EXPECTED HAND CONFIGURATION: ${JSON.stringify(referenceData.hand_configuration, null, 2)}
EXPECTED MOVEMENT: ${JSON.stringify(referenceData.movement, null, 2)}
EXPECTED FACIAL EXPRESSION: ${JSON.stringify(referenceData.facial_expression, null, 2)}

ANALYZE the attached image of the user's attempt and provide:

OUTPUT FORMAT (JSON only):
{
  "accuracy_score": 0-100,
  "matches": {
    "hand_shape": true/false,
    "hand_position": true/false,
    "palm_orientation": true/false,
    "facial_expression": true/false
  },
  "deviations": [
    {
      "aspect": "what's wrong",
      "expected": "what it should be",
      "observed": "what user did",
      "correction": "how to fix it"
    }
  ],
  "passed": true/false,
  "feedback": "Encouraging message with specific guidance"
}
`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: imageData
            }
        }
    ]);

    return parseAnalysisResponse(result.response.text());
}

// Helper function to generate analysis prompt
function generateAnalysisPrompt(signName, language) {
    return `
You are analyzing an ${language} reference image for the sign: "${signName}"

Extract detailed pose data for 3D avatar animation. Be extremely precise.

OUTPUT FORMAT (JSON only, no markdown):
{
  "sign": "${signName}",
  "language": "${language}",
  "analysis_confidence": "high/medium/low",
  "hand_configuration": {
    "right_hand": {
      "shape": "description",
      "fingers": {"thumb": "state", "index": "state", "middle": "state", "ring": "state", "pinky": "state"},
      "palm_orientation": "direction",
      "position_3d": [x, y, z]
    },
    "left_hand": { /* same structure */ }
  },
  "movement": {
    "type": "movement type",
    "direction": "direction",
    "duration_estimate_ms": 800
  },
  "facial_expression": {
    "eyebrows": "state",
    "mouth": "description"
  },
  "pose_sequence": [
    {"keyframe": 1, "timestamp_ms": 0, "right_hand": {"pos": [x,y,z], "rot": [rx,ry,rz]}, "left_hand": {"pos": [x,y,z], "rot": [rx,ry,rz]}}
  ],
  "signing_notes": "Important details"
}
`;
}

// Helper to parse response
function parseAnalysisResponse(response) {
    let cleanedText = response;
    if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    return JSON.parse(cleanedText.trim());
}

/**
 * Build a sign dictionary from a folder of reference images
 * @param {string} folderPath - Path to folder with images named as signs (e.g., HELLO.jpg)
 * @param {string} language - Sign language dialect
 * @returns {Object} Dictionary of sign analyses
 */
async function buildSignDictionaryFromFolder(folderPath, language = "ASL") {
    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    const dictionary = {};

    for (const file of imageFiles) {
        const signName = path.basename(file, path.extname(file)).toUpperCase();
        const imagePath = path.join(folderPath, file);

        try {
            console.log(`Analyzing: ${signName}...`);
            dictionary[signName] = await analyzeSignFromReference(signName, imagePath, language);
            dictionary[signName].source_file = file;
        } catch (error) {
            console.error(`Failed to analyze ${signName}:`, error.message);
            dictionary[signName] = { error: error.message, source_file: file };
        }
    }

    return dictionary;
}

export {
    analyzeSignFromReference,
    analyzeSignFromBase64,
    analyzeSignFromMultipleReferences,
    compareSignToReference,
    buildSignDictionaryFromFolder
};

export default {
    analyzeSignFromReference,
    analyzeSignFromBase64,
    analyzeSignFromMultipleReferences,
    compareSignToReference,
    buildSignDictionaryFromFolder
};
