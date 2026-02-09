// backend/services/signGrammarImprover.js
// ASL Grammar Improvement Service using Gemini
// Reviews and corrects SiGML translations for proper ASL grammar

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

/**
 * ASL Grammar Rules Reference
 */
const ASL_GRAMMAR_RULES = {
    wordOrder: {
        basic: 'Subject-Verb-Object (SVO) or Object-Subject-Verb (OSV)',
        topicComment: 'Topic first, then comment (TOPIC + COMMENT)',
        timeFirst: 'Time expressions usually come first (TIME + TOPIC + COMMENT)',
        examples: [
            { english: 'I went to the store yesterday', asl: 'YESTERDAY STORE I GO' },
            { english: 'What is your name?', asl: 'NAME YOU WHAT?' },
            { english: 'I love pizza', asl: 'PIZZA I LOVE' }
        ]
    },
    nonManualMarkers: {
        yesNoQuestion: 'Eyebrows raised, head tilted forward, last sign held longer',
        whQuestion: 'Eyebrows furrowed, head tilted forward',
        negation: 'Head shake, eyebrows furrowed',
        affirmation: 'Head nod',
        conditional: 'Eyebrows raised during "if" clause',
        rhetorical: 'Eyebrows raised then lowered'
    },
    classifiers: {
        CL_1: 'Upright person or stick-like object',
        CL_3: 'Vehicles (cars, boats, planes)',
        CL_5: 'Group of people or animals',
        CL_C: 'Cylindrical objects, cups',
        CL_F: 'Small flat objects, coins',
        CL_B: 'Flat surfaces, walls'
    },
    directionalVerbs: [
        'GIVE', 'SHOW', 'TELL', 'ASK', 'HELP', 'TEACH', 'PAY', 'SEND', 'BLAME'
    ],
    spatialAgreement: {
        description: 'Signs modify direction to show who does what to whom',
        example: 'I-GIVE-YOU (sign moves from signer toward recipient)'
    }
};

/**
 * Improve SiGML grammar for ASL accuracy
 */
async function improveSignGrammar(englishText, initialSigml, language = 'ASL') {
    const prompt = `
You are an expert ASL linguist reviewing a SiGML translation for grammatical accuracy.

ENGLISH INPUT: "${englishText}"
CURRENT SiGML: 
${initialSigml}

TARGET LANGUAGE: ${language}

REVIEW FOR:
1. **Word Order**: Correct ${language} word order (Topic-Comment, Time-Subject-Verb-Object)
2. **Classifiers**: Proper use of classifiers (CL-1, CL-3, CL-5, etc.)
3. **Directional Verbs**: Proper verb agreement (GIVE, SHOW, TELL, ASK, HELP, TEACH)
4. **Non-Manual Markers**: 
   - Yes/No questions: eyebrows raised
   - WH-questions: eyebrows furrowed
   - Negation: head shake
   - Conditionals: eyebrows raised during "if" clause
5. **Spatial Reference**: Consistent use of signing space for referents

${language} GRAMMAR RULES:
- Time expressions come FIRST
- Topic-Comment structure (topic raised eyebrows, then comment)
- Questions use facial grammar, not just word order
- Classifiers replace pronouns in spatial descriptions
- Directional verbs modify direction to show subject/object

Provide CORRECTED SiGML with all grammatical improvements.

OUTPUT (JSON only, no markdown):
{
  "original_english": "${englishText}",
  "original_sigml": "...",
  "corrected_sigml": "...",
  "gloss_order": {
    "original": ["WORD1", "WORD2"],
    "corrected": ["WORD1", "WORD2"]
  },
  "changes_made": [
    {
      "type": "word_order",
      "description": "Changed word order to Topic-Comment structure",
      "before": "...",
      "after": "..."
    }
  ],
  "grammatical_improvements": {
    "word_order": "explanation of changes",
    "non_manual_markers": "explanation of facial grammar added",
    "classifiers": "any classifier changes",
    "spatial_agreement": "any spatial reference improvements"
  },
  "confidence": 0-100,
  "notes": "Additional notes for accurate signing"
}
`;

    try {
        const result = await model.generateContent(prompt);
        return parseJSON(result.response.text());
    } catch (error) {
        console.error('Grammar improvement error:', error);
        return {
            success: false,
            error: error.message,
            original_sigml: initialSigml
        };
    }
}

/**
 * Check if a phrase needs grammatical restructuring
 */
async function analyzeGrammarNeeds(englishText, language = 'ASL') {
    const prompt = `
Analyze this English text for ${language} translation challenges:

TEXT: "${englishText}"

Check for:
1. Complex word order that needs restructuring
2. Need for non-manual markers (questions, conditionals, etc.)
3. Potential classifier usage
4. Directional verb candidates
5. Spatial reference needs

OUTPUT (JSON only):
{
  "text": "${englishText}",
  "sentence_type": "statement|yes_no_question|wh_question|command|conditional",
  "restructuring_needed": true/false,
  "suggested_asl_order": ["WORD1", "WORD2", "..."],
  "non_manual_markers": [
    {"marker": "eyebrows_raised", "when": "entire sentence", "reason": "yes/no question"}
  ],
  "classifier_candidates": ["classifier: context"],
  "directional_verbs": ["GIVE: from X to Y"],
  "complexity": 1-10,
  "tips": ["Tip for accurate translation"]
}
`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Add non-manual markers to SiGML
 */
async function addNonManualMarkers(sigml, sentenceType, language = 'ASL') {
    const markerRules = {
        'yes_no_question': {
            facial_expr: { movement: 'eyebrows_raised', intensity: 'medium' },
            head_movement: { movement: 'forward_tilt', intensity: 'slight' }
        },
        'wh_question': {
            facial_expr: { movement: 'eyebrows_furrowed', intensity: 'medium' },
            head_movement: { movement: 'forward_tilt', intensity: 'slight' }
        },
        'negation': {
            head_movement: { movement: 'shake', intensity: 'medium' }
        },
        'conditional': {
            facial_expr: { movement: 'eyebrows_raised', intensity: 'slight' }
        }
    };

    const markers = markerRules[sentenceType];
    if (!markers) return sigml;

    const prompt = `
Add non-manual markers to this SiGML for a ${sentenceType}:

SIGML: ${sigml}

MARKERS TO ADD:
${JSON.stringify(markers, null, 2)}

For ${sentenceType}:
${ASL_GRAMMAR_RULES.nonManualMarkers[sentenceType.replace('_', '')] || 'Apply appropriate markers'}

Return ONLY the modified SiGML XML with <sign_nonmanual> elements added.
`;

    try {
        const result = await model.generateContent(prompt);
        let corrected = result.response.text();

        // Extract XML
        if (corrected.includes('```xml')) {
            const match = corrected.match(/```xml\n?([\s\S]*?)\n?```/);
            if (match) corrected = match[1];
        } else if (corrected.includes('```')) {
            const match = corrected.match(/```\n?([\s\S]*?)\n?```/);
            if (match) corrected = match[1];
        }

        return corrected.trim();
    } catch (error) {
        console.error('Error adding non-manual markers:', error);
        return sigml;
    }
}

/**
 * Reorder signs for proper ASL grammar
 */
async function reorderSigns(glossList, englishText, language = 'ASL') {
    const prompt = `
Reorder these English-ordered glosses into proper ${language} grammar:

ENGLISH: "${englishText}"
CURRENT ORDER: ${JSON.stringify(glossList)}

${language} ORDERING RULES:
1. Time words FIRST
2. Topic-Comment structure
3. WH-words often at END for questions
4. Negation signs after the verb

OUTPUT (JSON only):
{
  "original_order": ${JSON.stringify(glossList)},
  "correct_order": ["SIGN1", "SIGN2", "..."],
  "structure_type": "topic-comment|time-topic-comment|question",
  "explanation": "Why this order is correct"
}
`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Validate SiGML against grammar rules
 */
async function validateGrammar(sigml, language = 'ASL') {
    const prompt = `
Validate this SiGML for ${language} grammatical correctness:

${sigml}

CHECK:
1. Word order follows ${language} rules
2. Non-manual markers are present where needed
3. Directional verbs show proper agreement
4. Classifiers are used appropriately
5. Spatial references are consistent

OUTPUT (JSON only):
{
  "is_valid": true/false,
  "score": 0-100,
  "issues": [
    {"type": "word_order", "severity": "high|medium|low", "description": "..."}
  ],
  "suggestions": ["Improvement suggestion"]
}
`;

    const result = await model.generateContent(prompt);
    return parseJSON(result.response.text());
}

/**
 * Validate user's signing attempt against SiGML specification (Vision-based)
 * @param {string} targetSigml - The target SiGML specification
 * @param {string} userVideoFrame - Base64 encoded video frame of user signing
 * @param {string} language - Sign language (ASL, BSL, etc.)
 * @returns {Object} Validation feedback with scores and corrections
 */
async function validateUserSigning(targetSigml, userVideoFrame, language = 'ASL') {
    // Extract gloss from SiGML for context
    const glossMatches = targetSigml.match(/gloss="([^"]+)"/g) || [];
    const targetGlosses = glossMatches.map(m => m.replace('gloss="', '').replace('"', ''));

    const prompt = `
You are an expert ${language} instructor analyzing a student's signing attempt.

TARGET SIGN(S): ${targetGlosses.join(', ')}

TARGET SiGML SPECIFICATION:
${targetSigml}

Analyze the attached video frame and compare the user's signing to the target specification.

CHECK EACH ELEMENT:
1. **Hand Shape**: Does it match the HamNoSys handconfig specification?
2. **Hand Position**: Is the location correct (chest, face, neutral space)?
3. **Palm Orientation**: Does palmor match the specification?
4. **Finger Configuration**: Are fingers in correct positions?
5. **Facial Expression**: Are required non-manual markers present?
6. **Movement Phase**: Is this the correct position in the movement?

PROVIDE SPECIFIC, ACTIONABLE FEEDBACK.

OUTPUT (JSON only):
{
  "target_signs": ${JSON.stringify(targetGlosses)},
  "overall_match": 0-100,
  "element_scores": {
    "hand_shape": {
      "score": 0-100,
      "expected": "description from SiGML",
      "observed": "what user is doing",
      "correct": true/false
    },
    "hand_position": {
      "score": 0-100,
      "expected": "location from SiGML",
      "observed": "user's hand location",
      "correct": true/false
    },
    "palm_orientation": {
      "score": 0-100,
      "expected": "orientation from SiGML",
      "observed": "user's palm direction",
      "correct": true/false
    },
    "facial_expression": {
      "score": 0-100,
      "expected": "what expression should be",
      "observed": "user's expression",
      "correct": true/false
    }
  },
  "immediate_corrections": [
    {
      "priority": 1,
      "issue": "What's wrong",
      "fix": "Specific instruction to fix it",
      "visual_cue": "Think of it like..."
    }
  ],
  "what_is_correct": ["Elements the user got right"],
  "passed": true/false,
  "grade": "A/B/C/D/F",
  "encouragement": "Supportive message",
  "next_step": "What to focus on next"
}

Be specific and encouraging. Deaf comprehension depends on accuracy.
`;

    const imageData = userVideoFrame.includes(',')
        ? userVideoFrame.split(',')[1]
        : userVideoFrame;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData
                }
            }
        ]);

        const feedback = parseJSON(result.response.text());

        // Add grade if not present
        if (!feedback.grade && feedback.overall_match !== undefined) {
            const score = feedback.overall_match;
            feedback.grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
        }

        return feedback;

    } catch (error) {
        console.error('User signing validation error:', error);
        return {
            success: false,
            error: error.message,
            target_signs: targetGlosses
        };
    }
}

/**
 * Validate multiple frames for movement verification
 */
async function validateSigningSequence(targetSigml, videoFrames, language = 'ASL') {
    const results = [];

    for (let i = 0; i < videoFrames.length; i++) {
        const result = await validateUserSigning(targetSigml, videoFrames[i], language);
        results.push({
            frame: i + 1,
            ...result
        });

        // Rate limiting
        if (i < videoFrames.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // Calculate overall progress
    const scores = results.filter(r => r.overall_match !== undefined).map(r => r.overall_match);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
        frames_analyzed: results.length,
        average_score: avgScore,
        improvement: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0,
        frame_results: results,
        overall_passed: avgScore >= 70
    };
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
    improveSignGrammar,
    analyzeGrammarNeeds,
    addNonManualMarkers,
    reorderSigns,
    validateGrammar,
    validateUserSigning,
    validateSigningSequence,
    ASL_GRAMMAR_RULES
};

export default {
    improveSignGrammar,
    analyzeGrammarNeeds,
    addNonManualMarkers,
    reorderSigns,
    validateGrammar,
    validateUserSigning,
    validateSigningSequence,
    ASL_GRAMMAR_RULES
};
