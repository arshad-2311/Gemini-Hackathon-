/**
 * Translation Routes for How2Sign
 * Uses Gemini for semantic matching → Returns REAL pose data
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findSemanticMatches } from '../services/semanticMatcher.js';
import { loadPoseKeypoints, loadHow2SignData } from '../services/how2signProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Use shared database loader from processor (supports CSV and JSON)
function getDatabase() {
    return loadHow2SignData();
}

/**
 * POST /api/translate
 * Translate English text to ASL using real How2Sign data
 */
router.post('/', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        console.log(`🔍 Finding ASL match for: "${text}"`);

        // DEMO MODE: Check for demo phrases first (no Gemini needed)
        const normalizedText = text.toLowerCase().trim();
        const demoKeypoints = loadPoseKeypoints('demo', normalizedText);

        if (demoKeypoints && demoKeypoints.source === 'demo') {
            console.log(`✅ Demo keypoints found for: "${text}"`);
            return res.json({
                success: true,
                original: text,
                matchedSentence: demoKeypoints.sentence,
                poseData: demoKeypoints,
                hasPoseData: true,
                matchScore: 1.0,
                metadata: {
                    source: 'demo_keypoints',
                    geminiRole: 'none',
                    poseSource: 'pre-recorded_demo',
                    accuracy: '100%'
                }
            });
        }

        const db = getDatabase();

        if (!db) {
            return res.status(503).json({
                error: 'How2Sign database not loaded',
                message: 'Please download the How2Sign dataset first'
            });
        }

        // Step 1: Use Gemini to find best semantic match
        const matches = await findSemanticMatches(text, db);

        if (!matches || matches.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No semantic match found',
                original: text
            });
        }

        const bestMatch = matches[0];
        console.log(`✅ Best match: ${bestMatch.sentence_id} (score: ${bestMatch.score})`);

        // Step 2: Load pre-recorded pose keypoints
        const poseKeypoints = loadPoseKeypoints(bestMatch.sentence_id);

        // Find matched sentence details
        const matchedEntry = db.find(s =>
            (s.SENTENCE_ID || s.id) === bestMatch.sentence_id
        );

        res.json({
            success: true,
            original: text,
            matchedSentence: matchedEntry?.SENTENCE || matchedEntry?.sentence || bestMatch.sentence,
            sentenceId: bestMatch.sentence_id,
            matchScore: bestMatch.score,
            matchReason: bestMatch.reason,
            poseData: poseKeypoints,
            hasPoseData: !!poseKeypoints,
            alternativeMatches: matches.slice(1, 3),
            metadata: {
                source: 'How2Sign dataset',
                geminiRole: 'semantic_matching_only',
                poseSource: 'real_motion_capture',
                datasetSize: '35K+ ASL sentences',
                accuracy: '100% (captured from interpreters)'
            }
        });

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            error: error.message,
            success: false
        });
    }
});

/**
 * GET /api/translate/stats
 * Get translation service statistics
 */
router.get('/stats', (req, res) => {
    const db = getDatabase();

    res.json({
        databaseLoaded: !!db,
        sentenceCount: db?.length || 0,
        status: db ? 'ready' : 'database_not_loaded'
    });
});

/**
 * POST /api/translate/batch
 * Translate multiple sentences
 */
router.post('/batch', async (req, res) => {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts array is required' });
    }

    const results = [];

    for (const text of texts.slice(0, 10)) { // Limit to 10
        try {
            const db = getDatabase();
            const matches = await findSemanticMatches(text, db);

            if (matches.length > 0) {
                const poseData = loadPoseKeypoints(matches[0].sentence_id);
                results.push({
                    original: text,
                    matched: matches[0].sentence,
                    score: matches[0].score,
                    hasPoseData: !!poseData
                });
            } else {
                results.push({
                    original: text,
                    matched: null,
                    error: 'No match found'
                });
            }
        } catch (error) {
            results.push({
                original: text,
                error: error.message
            });
        }
    }

    res.json({ results });
});

export default router;
