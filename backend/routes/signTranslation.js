// backend/routes/signTranslation.js
// Express routes for Sign.MT + Gemini hybrid translation

import express from 'express';
import { translateTextToSiGML, sigmlToPoseKeyframes, generateSignSiGML } from '../services/geminiToSignMT.js';
import { enhanceWithSignMT, selectBestOutput, SUPPORTED_LANGUAGES } from '../services/signMTEnhancer.js';

const router = express.Router();

/**
 * POST /api/translate
 * Main translation endpoint - converts text to SiGML
 */
router.post('/translate', async (req, res) => {
    const { text, targetLanguage = 'ASL', outputFormat = 'merged' } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required' });
    }

    try {
        console.log(`🔄 Translating: "${text}" to ${targetLanguage}`);

        // Step 1: Generate SiGML using Gemini
        const geminiResult = await translateTextToSiGML(text, targetLanguage);

        // Step 2: Enhance/validate with Sign.MT
        const enhanced = await enhanceWithSignMT(
            geminiResult.sigml,
            text,
            targetLanguage
        );

        // Step 3: Select output based on preference
        let recommendedOutput;
        switch (outputFormat) {
            case 'gemini':
                recommendedOutput = geminiResult.sigml;
                break;
            case 'signmt':
                recommendedOutput = enhanced.signMTSigml || geminiResult.sigml;
                break;
            case 'merged':
            default:
                recommendedOutput = enhanced.mergedSigml || geminiResult.sigml;
        }

        // Step 4: Return results
        res.json({
            success: true,
            original: text,
            targetLanguage,
            outputs: {
                gemini: geminiResult.sigml,
                signMT: enhanced.signMTSigml || null,
                merged: enhanced.mergedSigml || geminiResult.sigml,
                recommended: recommendedOutput
            },
            metadata: {
                confidence: enhanced.confidence || 70,
                source: enhanced.source,
                generatedBy: 'gemini-2.0-flash + sign.mt',
                isValidXml: geminiResult.isValidXml,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/translate/to-pose
 * Convert text directly to pose keyframes for 3D avatar
 */
router.post('/translate/to-pose', async (req, res) => {
    const { text, targetLanguage = 'ASL' } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required' });
    }

    try {
        // Generate SiGML
        const geminiResult = await translateTextToSiGML(text, targetLanguage);

        // Convert SiGML to pose keyframes
        const poseData = await sigmlToPoseKeyframes(geminiResult.sigml, targetLanguage);

        res.json({
            success: true,
            original: text,
            targetLanguage,
            sigml: geminiResult.sigml,
            poseData,
            metadata: {
                totalDuration: poseData.total_duration_ms,
                signCount: poseData.signs.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Pose conversion error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/translate/single-sign
 * Generate SiGML for a single sign
 */
router.post('/translate/single-sign', async (req, res) => {
    const { sign, language = 'ASL' } = req.body;

    if (!sign) {
        return res.status(400).json({ success: false, error: 'Sign gloss is required' });
    }

    try {
        const sigml = await generateSignSiGML(sign, language);

        res.json({
            success: true,
            sign: sign.toUpperCase(),
            language,
            sigml
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/translate/batch
 * Translate multiple phrases
 */
router.post('/translate/batch', async (req, res) => {
    const { phrases, targetLanguage = 'ASL' } = req.body;

    if (!Array.isArray(phrases)) {
        return res.status(400).json({ success: false, error: 'Phrases array is required' });
    }

    try {
        const results = [];

        for (const text of phrases) {
            try {
                const geminiResult = await translateTextToSiGML(text, targetLanguage);
                const enhanced = await enhanceWithSignMT(geminiResult.sigml, text, targetLanguage);

                results.push({
                    text,
                    success: true,
                    sigml: enhanced.mergedSigml || geminiResult.sigml,
                    confidence: enhanced.confidence
                });
            } catch (err) {
                results.push({
                    text,
                    success: false,
                    error: err.message
                });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        res.json({
            success: true,
            targetLanguage,
            total: phrases.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/translate/languages
 * Get supported sign languages
 */
router.get('/translate/languages', (req, res) => {
    res.json({
        success: true,
        languages: SUPPORTED_LANGUAGES
    });
});

/**
 * POST /api/translate/compare
 * Compare outputs from different sources
 */
router.post('/translate/compare', async (req, res) => {
    const { text, targetLanguage = 'ASL' } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required' });
    }

    try {
        const geminiResult = await translateTextToSiGML(text, targetLanguage);
        const enhanced = await enhanceWithSignMT(geminiResult.sigml, text, targetLanguage);
        const bestOutput = await selectBestOutput(
            geminiResult.sigml,
            enhanced.signMTSigml,
            'balanced'
        );

        res.json({
            success: true,
            original: text,
            targetLanguage,
            comparison: {
                gemini: {
                    sigml: geminiResult.sigml,
                    isValid: geminiResult.isValidXml
                },
                signMT: {
                    sigml: enhanced.signMTSigml,
                    available: !!enhanced.signMTSigml
                },
                merged: {
                    sigml: enhanced.mergedSigml,
                    confidence: enhanced.confidence
                },
                recommended: {
                    source: bestOutput.source,
                    reason: bestOutput.reason,
                    sigml: bestOutput.selected
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
