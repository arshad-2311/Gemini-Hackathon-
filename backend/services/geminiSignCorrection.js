// backend/services/geminiSignCorrection.js
// Sign accuracy analysis and correction feedback service

/**
 * Generate prompt for analyzing user's sign performance
 * @param {string} targetSign - The sign the user is attempting
 * @param {Object} userPoseData - Pose data from MediaPipe or similar
 * @param {string} language - Sign language dialect (ASL, BSL, ISL)
 * @returns {string} Formatted prompt for Gemini
 */
const signCorrectionPrompt = (targetSign, userPoseData, language = "ASL") => `
You are an ${language} teacher analyzing a student's sign performance.

TARGET SIGN: "${targetSign}"
USER'S POSE DATA: ${JSON.stringify(userPoseData, null, 2)}

ANALYSIS TASKS:
1. Compare user's hand position, shape, and orientation to correct ${language} sign
2. Check facial expression accuracy (critical for grammar)
3. Evaluate movement path and speed
4. Identify specific errors (position, handshape, orientation, facial, timing)
5. Provide constructive feedback

OUTPUT FORMAT (JSON only, no markdown):
{
  "target_sign": "${targetSign}",
  "accuracy_score": 0-100,
  "breakdown": {
    "hand_position": {
      "score": 0-100,
      "issues": ["Hand too low", "Should be at chest level"],
      "correct_position": [x, y, z]
    },
    "handshape": {
      "score": 0-100,
      "detected": "user's handshape",
      "expected": "correct handshape",
      "issues": ["Fingers should be extended", "Thumb position incorrect"]
    },
    "palm_orientation": {
      "score": 0-100,
      "detected": "down",
      "expected": "forward",
      "issues": []
    },
    "movement": {
      "score": 0-100,
      "issues": ["Movement too slow", "Path should be circular"]
    },
    "facial_expression": {
      "score": 0-100,
      "detected": "neutral",
      "expected": "eyebrows raised (question marker)",
      "issues": ["Missing grammatical facial expression"]
    }
  },
  "overall_feedback": "Clear, encouraging feedback message",
  "corrections": [
    "Raise your hand to chest level",
    "Raise eyebrows when signing questions",
    "Make the movement more circular"
  ],
  "demonstration_tip": "Think of scooping ice cream - smooth circular motion",
  "passed": true/false
}

Be encouraging but accurate. Deaf comprehension depends on precision.
`;

/**
 * Generate prompt for video-based sign analysis
 * Used when analyzing a video frame from the user's camera
 */
const signCorrectionWithVideoPrompt = (targetSign, userPoseData, language = "ASL") => `
You are an expert ${language} teacher analyzing a student's sign performance from both pose data and visual observation.

TARGET SIGN: "${targetSign}"
LANGUAGE: ${language}

POSE DATA FROM TRACKING:
${JSON.stringify(userPoseData, null, 2)}

ATTACHED: Video frame showing the user performing the sign

COMPREHENSIVE ANALYSIS:
1. Hand Position & Movement
   - Compare hand location to correct signing space
   - Check movement trajectory and speed
   - Verify dominant hand usage

2. Handshape Accuracy
   - Finger configurations
   - Thumb position
   - Hand curvature

3. Palm Orientation
   - Direction palm faces (critical for meaning)
   - Rotation throughout the sign

4. Non-Manual Markers (CRITICAL)
   - Eyebrow position (grammatical!)
   - Eye gaze direction
   - Mouth morphemes
   - Head tilt/nod
   - Shoulder position

5. Timing & Rhythm
   - Natural signing speed
   - Hold duration at key positions
   - Transition smoothness

OUTPUT FORMAT (JSON only, no markdown):
{
  "target_sign": "${targetSign}",
  "language": "${language}",
  "accuracy_score": 85,
  "grade": "A|B|C|D|F",
  "breakdown": {
    "hand_position": {
      "score": 90,
      "detected_position": [0.2, 0.3, 0.4],
      "expected_position": [0.15, 0.4, 0.4],
      "issues": [],
      "guidance": "Good positioning"
    },
    "handshape": {
      "score": 85,
      "detected": "flat hand with spread fingers",
      "expected": "5-hand (all fingers spread)",
      "issues": ["Fingers could be spread wider"],
      "guidance": "Spread your fingers as if showing the number 5"
    },
    "palm_orientation": {
      "score": 95,
      "detected": "forward",
      "expected": "forward",
      "issues": [],
      "guidance": "Perfect palm orientation"
    },
    "movement": {
      "score": 80,
      "expected_path": "outward from chest",
      "detected_path": "outward with slight downward drift",
      "issues": ["Movement drifts downward"],
      "guidance": "Keep the movement straight out from your chest"
    },
    "facial_expression": {
      "score": 70,
      "expected": {
        "eyebrows": "neutral",
        "mouth": "relaxed",
        "eyes": "normal"
      },
      "detected": {
        "eyebrows": "neutral",
        "mouth": "tense",
        "eyes": "normal"
      },
      "issues": ["Mouth appears tense"],
      "guidance": "Relax your facial muscles - this sign uses neutral expression"
    },
    "timing": {
      "score": 85,
      "expected_duration_ms": 600,
      "detected_duration_ms": 750,
      "issues": ["Slightly slow"],
      "guidance": "Try to complete the sign a bit faster for natural rhythm"
    }
  },
  "overall_feedback": "Great attempt! Your hand position and palm orientation are excellent. Focus on spreading your fingers wider and keeping the movement path straight.",
  "priority_corrections": [
    {
      "priority": 1,
      "aspect": "handshape",
      "correction": "Spread your fingers wider, like showing the number 5",
      "visual_cue": "Imagine holding a large grapefruit"
    },
    {
      "priority": 2,
      "aspect": "movement",
      "correction": "Keep the movement straight out, not downward",
      "visual_cue": "Push directly toward the person you're signing to"
    }
  ],
  "encouragement": "You're making great progress! The fundamentals are solid.",
  "next_practice_focus": "handshape precision",
  "passed": true,
  "ready_for_next": true
}

GRADING CRITERIA:
- 90-100 (A): Near-native accuracy, minor refinements only
- 80-89 (B): Good accuracy, 1-2 small corrections needed  
- 70-79 (C): Understandable but needs practice on multiple aspects
- 60-69 (D): Significant errors but shows understanding of the sign
- Below 60 (F): Major errors that would impede comprehension

Be encouraging but precise. A Deaf person's ability to understand depends on accuracy.
`;

/**
 * Scoring weights for different aspects of signing
 */
const SCORING_WEIGHTS = {
    handshape: 0.25,
    palm_orientation: 0.20,
    hand_position: 0.20,
    movement: 0.15,
    facial_expression: 0.15,
    timing: 0.05
};

/**
 * Calculate weighted overall score from breakdown
 */
function calculateOverallScore(breakdown) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [aspect, weight] of Object.entries(SCORING_WEIGHTS)) {
        if (breakdown[aspect] && typeof breakdown[aspect].score === 'number') {
            totalScore += breakdown[aspect].score * weight;
            totalWeight += weight;
        }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight * (1 / totalWeight)) : 0;
}

/**
 * Determine grade from score
 */
function getGradeFromScore(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Common signing errors and their corrections
 */
const COMMON_ERRORS = {
    'hand_too_low': {
        issue: 'Hand positioned too low',
        correction: 'Raise your hand to chest or face level',
        tip: 'Most signs are performed in the signing space between your waist and head'
    },
    'hand_too_high': {
        issue: 'Hand positioned too high',
        correction: 'Lower your hand to the correct signing space',
        tip: 'Signs rarely go above the forehead'
    },
    'palm_wrong': {
        issue: 'Palm orientation incorrect',
        correction: 'Rotate your wrist to face the correct direction',
        tip: 'Palm orientation often changes the meaning of a sign'
    },
    'fingers_not_spread': {
        issue: 'Fingers should be spread apart',
        correction: 'Spread your fingers wide like showing the number 5',
        tip: 'The 5-hand is one of the most common handshapes'
    },
    'missing_facial': {
        issue: 'Missing grammatical facial expression',
        correction: 'Add the required facial expression',
        tip: 'Facial expressions are grammar in sign language, not optional decoration'
    },
    'movement_too_slow': {
        issue: 'Movement is too slow',
        correction: 'Speed up the movement to match natural signing rhythm',
        tip: 'Natural signing has a fluid, rhythmic quality'
    },
    'movement_too_fast': {
        issue: 'Movement is too fast',
        correction: 'Slow down and make the sign more deliberate',
        tip: 'Rushing can make signs unclear'
    },
    'dominant_hand_wrong': {
        issue: 'Using non-dominant hand as primary',
        correction: 'Consistently use your dominant hand for one-handed signs',
        tip: 'Dominant hand consistency improves readability'
    }
};

/**
 * Parse Gemini correction response and validate
 */
function parseCorrectionResponse(responseText) {
    try {
        let cleanedText = responseText;
        if (cleanedText.includes('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.includes('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(cleanedText.trim());

        // Ensure required fields exist
        if (typeof parsed.accuracy_score !== 'number') {
            parsed.accuracy_score = calculateOverallScore(parsed.breakdown || {});
        }

        if (!parsed.grade) {
            parsed.grade = getGradeFromScore(parsed.accuracy_score);
        }

        if (typeof parsed.passed !== 'boolean') {
            parsed.passed = parsed.accuracy_score >= 70;
        }

        return parsed;
    } catch (error) {
        console.error('Failed to parse correction response:', error);
        throw error;
    }
}

/**
 * Generate practice suggestions based on error patterns
 */
function generatePracticePlan(errorHistory) {
    const errorCounts = {};

    // Count error types across attempts
    errorHistory.forEach(attempt => {
        if (attempt.breakdown) {
            Object.entries(attempt.breakdown).forEach(([aspect, data]) => {
                if (data.score < 80) {
                    errorCounts[aspect] = (errorCounts[aspect] || 0) + 1;
                }
            });
        }
    });

    // Sort by frequency
    const prioritizedAspects = Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([aspect]) => aspect);

    return {
        primary_focus: prioritizedAspects[0] || 'general_practice',
        secondary_focus: prioritizedAspects[1] || null,
        suggested_drills: prioritizedAspects.slice(0, 3).map(aspect => ({
            aspect,
            drill: getDrillForAspect(aspect),
            repetitions: 5
        }))
    };
}

function getDrillForAspect(aspect) {
    const drills = {
        handshape: 'Practice handshape alphabet A-Z, focusing on precision',
        palm_orientation: 'Practice signs with different orientations: HELLO, THANK-YOU, PLEASE',
        hand_position: 'Practice signs at different heights: HIGH, LOW, MIDDLE',
        movement: 'Practice directional verbs: GIVE, TAKE, SEND',
        facial_expression: 'Practice question types: YES/NO questions vs WH-questions',
        timing: 'Practice common phrases at natural conversation speed'
    };
    return drills[aspect] || 'General signing practice';
}

export {
    signCorrectionPrompt,
    signCorrectionWithVideoPrompt,
    SCORING_WEIGHTS,
    COMMON_ERRORS,
    calculateOverallScore,
    getGradeFromScore,
    parseCorrectionResponse,
    generatePracticePlan
};

export default {
    signCorrectionPrompt,
    signCorrectionWithVideoPrompt,
    SCORING_WEIGHTS,
    COMMON_ERRORS,
    calculateOverallScore,
    getGradeFromScore,
    parseCorrectionResponse,
    generatePracticePlan
};
