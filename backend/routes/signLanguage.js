// backend/routes/signLanguage.js
// Express routes for sign language translation, correction, and teaching

import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Import service modules
import {
    textToSignPrompt,
    parseSignPoseData,
    addTransitionFrames
} from '../services/geminiSignTranslation.js';

import {
    signCorrectionPrompt,
    signCorrectionWithVideoPrompt,
    parseCorrectionResponse,
    generatePracticePlan
} from '../services/geminiSignCorrection.js';

import {
    lessonGenerationPrompt,
    quickVocabPrompt,
    grammarExplanationPrompt,
    parseLessonResponse,
    LESSON_TEMPLATES,
    DIFFICULTY_CONFIG
} from '../services/geminiLessonGenerator.js';

import {
    objectDetectionPrompt,
    spatialReferencePrompt,
    actionRecognitionPrompt,
    environmentConversationPrompt,
    parseVisionResponse,
    enrichWithSignData,
    prioritizeTeachingItems
} from '../services/geminiVision.js';

dotenv.config();

const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Helper to parse JSON from Gemini response
function parseJSON(text) {
    let cleanedText = text;
    if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    return JSON.parse(cleanedText.trim());
}

// ============================================
// TEXT-TO-SIGN TRANSLATION
// ============================================

/**
 * POST /api/v2/translate-to-sign
 * Convert text to sign language pose data
 */
router.post('/translate-to-sign', async (req, res) => {
    const { text, language = 'ASL', includeTransitions = true } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const prompt = textToSignPrompt(text, language);
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        let poseData = parseSignPoseData(response);

        // Add smooth transitions between signs
        if (includeTransitions && poseData.signs) {
            poseData.signs = addTransitionFrames(poseData.signs);
        }

        res.json({
            success: true,
            poseData,
            language,
            sign_count: poseData.signs?.length || 0
        });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try simplifying the text or breaking it into smaller phrases'
        });
    }
});

/**
 * POST /api/v2/translate-batch
 * Translate multiple phrases at once
 */
router.post('/translate-batch', async (req, res) => {
    const { phrases, language = 'ASL' } = req.body;

    if (!Array.isArray(phrases)) {
        return res.status(400).json({ error: 'phrases must be an array' });
    }

    try {
        const results = await Promise.all(
            phrases.map(async (text) => {
                try {
                    const prompt = textToSignPrompt(text, language);
                    const result = await model.generateContent(prompt);
                    const poseData = parseSignPoseData(result.response.text());
                    return { text, success: true, poseData };
                } catch (err) {
                    return { text, success: false, error: err.message };
                }
            })
        );

        res.json({
            success: true,
            results,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SIGN CORRECTION / TEACHING
// ============================================

/**
 * POST /api/v2/check-sign
 * Analyze user's sign performance with optional video
 */
router.post('/check-sign', async (req, res) => {
    const { targetSign, userPose, videoFrame, language = 'ASL' } = req.body;

    if (!targetSign) {
        return res.status(400).json({ error: 'targetSign is required' });
    }

    try {
        let result;

        if (videoFrame) {
            // Use vision model with image
            const imagePart = {
                inlineData: {
                    data: videoFrame.includes(',') ? videoFrame.split(',')[1] : videoFrame,
                    mimeType: 'image/jpeg'
                }
            };

            const prompt = signCorrectionWithVideoPrompt(targetSign, userPose, language);
            result = await model.generateContent([prompt, imagePart]);
        } else {
            // Text-only analysis
            const prompt = signCorrectionPrompt(targetSign, userPose, language);
            result = await model.generateContent(prompt);
        }

        const feedback = parseCorrectionResponse(result.response.text());

        res.json({
            success: true,
            feedback,
            passed: feedback.passed,
            accuracy: feedback.accuracy_score,
            grade: feedback.grade
        });
    } catch (error) {
        console.error('Sign check error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/practice-plan
 * Generate personalized practice plan based on error history
 */
router.post('/practice-plan', async (req, res) => {
    const { errorHistory } = req.body;

    if (!Array.isArray(errorHistory)) {
        return res.status(400).json({ error: 'errorHistory must be an array' });
    }

    try {
        const plan = generatePracticePlan(errorHistory);
        res.json({
            success: true,
            plan
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LESSON GENERATION
// ============================================

/**
 * POST /api/v2/generate-lesson
 * Generate a structured lesson plan
 */
router.post('/generate-lesson', async (req, res) => {
    const { topic, difficulty = 'beginner', lessonCount = 5, language = 'ASL' } = req.body;

    if (!topic) {
        return res.status(400).json({ error: 'topic is required' });
    }

    try {
        const prompt = lessonGenerationPrompt(topic, difficulty, lessonCount, language);
        const result = await model.generateContent(prompt);
        const lesson = parseLessonResponse(result.response.text());

        res.json({
            success: true,
            lesson,
            difficulty_config: DIFFICULTY_CONFIG[difficulty]
        });
    } catch (error) {
        console.error('Lesson generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/quick-vocab
 * Generate a quick vocabulary lesson for specific signs
 */
router.post('/quick-vocab', async (req, res) => {
    const { signs, language = 'ASL' } = req.body;

    if (!Array.isArray(signs) || signs.length === 0) {
        return res.status(400).json({ error: 'signs array is required' });
    }

    try {
        const prompt = quickVocabPrompt(signs, language);
        const result = await model.generateContent(prompt);
        const vocabLesson = parseJSON(result.response.text());

        res.json({
            success: true,
            vocabLesson
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/explain-grammar
 * Get detailed explanation of a grammar concept
 */
router.post('/explain-grammar', async (req, res) => {
    const { concept, language = 'ASL' } = req.body;

    if (!concept) {
        return res.status(400).json({ error: 'concept is required' });
    }

    try {
        const prompt = grammarExplanationPrompt(concept, language);
        const result = await model.generateContent(prompt);
        const explanation = parseJSON(result.response.text());

        res.json({
            success: true,
            explanation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/v2/lesson-templates
 * Get available lesson templates
 */
router.get('/lesson-templates', (req, res) => {
    res.json({
        success: true,
        templates: LESSON_TEMPLATES,
        difficulties: Object.keys(DIFFICULTY_CONFIG)
    });
});

// ============================================
// VISION / SPATIAL AWARENESS
// ============================================

/**
 * POST /api/v2/detect-teachable-items
 * Detect objects in image for contextual vocabulary teaching
 */
router.post('/detect-teachable-items', async (req, res) => {
    const { image, language = 'ASL', userLevel = 'beginner' } = req.body;

    if (!image) {
        return res.status(400).json({ error: 'image is required (base64)' });
    }

    try {
        const imagePart = {
            inlineData: {
                data: image.includes(',') ? image.split(',')[1] : image,
                mimeType: 'image/jpeg'
            }
        };

        const prompt = objectDetectionPrompt(language);
        const result = await model.generateContent([prompt, imagePart]);
        let teachingData = parseVisionResponse(result.response.text());

        // Enrich and prioritize
        if (teachingData.detected_items) {
            teachingData.detected_items = enrichWithSignData(teachingData.detected_items);
            teachingData.detected_items = prioritizeTeachingItems(teachingData.detected_items, userLevel);
        }

        res.json({
            success: true,
            teachingData
        });
    } catch (error) {
        console.error('Object detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/analyze-spatial
 * Analyze spatial layout for directional signing
 */
router.post('/analyze-spatial', async (req, res) => {
    const { image, language = 'ASL' } = req.body;

    if (!image) {
        return res.status(400).json({ error: 'image is required (base64)' });
    }

    try {
        const imagePart = {
            inlineData: {
                data: image.includes(',') ? image.split(',')[1] : image,
                mimeType: 'image/jpeg'
            }
        };

        const prompt = spatialReferencePrompt(language);
        const result = await model.generateContent([prompt, imagePart]);
        const spatialData = parseVisionResponse(result.response.text());

        res.json({
            success: true,
            spatialData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/detect-actions
 * Detect actions in image for verb teaching
 */
router.post('/detect-actions', async (req, res) => {
    const { image, language = 'ASL' } = req.body;

    if (!image) {
        return res.status(400).json({ error: 'image is required (base64)' });
    }

    try {
        const imagePart = {
            inlineData: {
                data: image.includes(',') ? image.split(',')[1] : image,
                mimeType: 'image/jpeg'
            }
        };

        const prompt = actionRecognitionPrompt(language);
        const result = await model.generateContent([prompt, imagePart]);
        const actionData = parseVisionResponse(result.response.text());

        res.json({
            success: true,
            actionData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v2/generate-conversation
 * Generate contextual conversation based on scene
 */
router.post('/generate-conversation', async (req, res) => {
    const { image, language = 'ASL' } = req.body;

    if (!image) {
        return res.status(400).json({ error: 'image is required (base64)' });
    }

    try {
        const imagePart = {
            inlineData: {
                data: image.includes(',') ? image.split(',')[1] : image,
                mimeType: 'image/jpeg'
            }
        };

        const prompt = environmentConversationPrompt(language);
        const result = await model.generateContent([prompt, imagePart]);
        const conversationData = parseVisionResponse(result.response.text());

        res.json({
            success: true,
            conversationData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /api/v2/health
 * Health check for the sign language API
 */
router.get('/health', async (req, res) => {
    try {
        // Quick API test
        const result = await model.generateContent('Say "OK"');
        const text = result.response.text();

        res.json({
            success: true,
            status: 'healthy',
            gemini: 'connected',
            services: ['translation', 'correction', 'lessons', 'vision']
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'degraded',
            error: error.message
        });
    }
});

export default router;
