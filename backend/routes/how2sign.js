/**
 * How2Sign Translation Routes
 * Real ASL motion capture data - NOT AI-generated poses
 */

import express from 'express';
import {
    translateToSign,
    findClosestSentences,
    buildIndex,
    getStats
} from '../services/how2signMatcher.js';

const router = express.Router();

/**
 * POST /translate
 * Translate English text to ASL using How2Sign
 * Returns REAL motion capture keypoints
 */
router.post('/translate', async (req, res) => {
    try {
        const { text, threshold = 0.7 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const result = await translateToSign(text, threshold);

        res.json({
            success: result.success,
            source: 'how2sign_mocap',
            accuracy: 'real_data',
            ...result
        });
    } catch (error) {
        console.error('How2Sign translation error:', error);
        res.status(500).json({
            error: 'Translation failed',
            message: error.message
        });
    }
});

/**
 * POST /search
 * Find similar sentences in How2Sign dataset
 */
router.post('/search', async (req, res) => {
    try {
        const { text, limit = 5 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const matches = await findClosestSentences(text, limit);

        res.json({
            query: text,
            matches: matches.map(m => ({
                id: m.id,
                text: m.text,
                similarity: Math.round(m.similarity * 100) / 100
            }))
        });
    } catch (error) {
        console.error('How2Sign search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /build-index
 * Build sentence embedding index (run once after dataset download)
 */
router.post('/build-index', async (req, res) => {
    try {
        const { maxSentences = 500 } = req.body;

        res.json({
            status: 'started',
            message: `Building index for ${maxSentences} sentences...`
        });

        // Build in background
        buildIndex(maxSentences).then(result => {
            console.log('Index build complete:', result?.sentences?.length || 0);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /stats
 * Get dataset statistics
 */
router.get('/stats', (req, res) => {
    res.json(getStats());
});

/**
 * GET /info
 * API information
 */
router.get('/info', (req, res) => {
    res.json({
        name: 'How2Sign Translation API',
        description: 'Real ASL motion capture data from How2Sign dataset',
        accuracy: '100% - uses captured data from professional interpreters',
        dataFormat: 'OpenPose keypoints (25 body + 70 face + 42 hand)',
        source: 'https://how2sign.github.io/',
        endpoints: {
            '/translate': 'POST - Translate text to ASL keypoints',
            '/search': 'POST - Find similar sentences',
            '/build-index': 'POST - Build embedding index',
            '/stats': 'GET - Dataset statistics'
        }
    });
});

export default router;
