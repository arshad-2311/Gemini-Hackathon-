/**
 * How2Sign Dataset Matcher
 * Uses Gemini embeddings to find closest sentence match
 * Returns REAL pose keypoints (not AI-generated)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Dataset paths
const DATA_DIR = path.join(__dirname, '../how2sign_data');
const TRANSLATIONS_PATH = path.join(DATA_DIR, 'translations/train.json');
const KEYPOINTS_DIR = path.join(DATA_DIR, 'keypoints');
const INDEX_PATH = path.join(DATA_DIR, 'sentence_index.json');

// In-memory index
let sentenceIndex = null;
let translations = null;

/**
 * Load translations from How2Sign dataset
 */
async function loadTranslations() {
    if (translations) return translations;

    try {
        if (fs.existsSync(TRANSLATIONS_PATH)) {
            const data = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
            translations = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(translations).length} How2Sign sentences`);
            return translations;
        }
    } catch (error) {
        console.warn('⚠️ How2Sign translations not found. Download dataset first.');
    }

    return null;
}

/**
 * Get embedding for text using Gemini
 */
async function getEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Embedding error:', error);
        throw error;
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build or load sentence embedding index
 */
async function buildIndex(maxSentences = 500) {
    // Try to load existing index
    if (fs.existsSync(INDEX_PATH)) {
        try {
            const data = fs.readFileSync(INDEX_PATH, 'utf8');
            sentenceIndex = JSON.parse(data);
            console.log(`✅ Loaded index with ${sentenceIndex.sentences.length} sentences`);
            return sentenceIndex;
        } catch (error) {
            console.warn('Index corrupted, rebuilding...');
        }
    }

    // Build new index
    const trans = await loadTranslations();
    if (!trans) {
        console.error('Cannot build index: translations not loaded');
        return null;
    }

    console.log(`📊 Building index for ${maxSentences} sentences...`);

    const sentences = [];
    const entries = Object.entries(trans).slice(0, maxSentences);

    for (let i = 0; i < entries.length; i++) {
        const [id, data] = entries[i];
        const text = data.translation || data.text || data;

        try {
            const embedding = await getEmbedding(text);
            sentences.push({
                id,
                text: text.substring(0, 200),
                embedding
            });

            if ((i + 1) % 50 === 0) {
                console.log(`  Indexed ${i + 1}/${entries.length}`);
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 100));
        } catch (error) {
            console.warn(`Skipped sentence ${id}:`, error.message);
        }
    }

    sentenceIndex = {
        version: '1.0',
        created: new Date().toISOString(),
        sentences
    };

    // Save index
    fs.writeFileSync(INDEX_PATH, JSON.stringify(sentenceIndex, null, 2));
    console.log(`✅ Index saved with ${sentences.length} sentences`);

    return sentenceIndex;
}

/**
 * Find closest matching sentence in How2Sign
 * @param {string} inputText - User input
 * @param {number} topK - Number of results
 * @returns {Array} Top matches with similarity scores
 */
async function findClosestSentences(inputText, topK = 3) {
    if (!sentenceIndex) {
        await buildIndex();
    }

    if (!sentenceIndex || !sentenceIndex.sentences.length) {
        throw new Error('No sentence index available');
    }

    const inputEmbedding = await getEmbedding(inputText);

    // Calculate similarities
    const scored = sentenceIndex.sentences.map(s => ({
        id: s.id,
        text: s.text,
        similarity: cosineSimilarity(inputEmbedding, s.embedding)
    }));

    // Sort by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
}

/**
 * Load OpenPose keypoints for a sentence
 * @param {string} sentenceId - How2Sign sentence ID
 * @returns {object} Keypoint data
 */
function loadKeypoints(sentenceId) {
    // How2Sign keypoint file naming convention
    const keypointPath = path.join(KEYPOINTS_DIR, `${sentenceId}.json`);

    if (fs.existsSync(keypointPath)) {
        return JSON.parse(fs.readFileSync(keypointPath, 'utf8'));
    }

    // Try alternative naming
    const altPath = path.join(KEYPOINTS_DIR, 'extracted', `${sentenceId}.json`);
    if (fs.existsSync(altPath)) {
        return JSON.parse(fs.readFileSync(altPath, 'utf8'));
    }

    return null;
}

/**
 * Translate text to sign language using How2Sign
 * Returns REAL motion capture data (not AI-generated)
 * @param {string} text - English input
 * @param {number} threshold - Minimum similarity (0-1)
 */
async function translateToSign(text, threshold = 0.7) {
    const matches = await findClosestSentences(text, 3);

    if (!matches.length || matches[0].similarity < threshold) {
        return {
            success: false,
            reason: 'no_match',
            message: `No similar sentence found (best: ${matches[0]?.similarity.toFixed(2) || 0})`,
            inputText: text,
            matches: matches
        };
    }

    const bestMatch = matches[0];
    const keypoints = loadKeypoints(bestMatch.id);

    return {
        success: true,
        source: 'how2sign',
        accuracy: 'real_mocap',
        inputText: text,
        matchedSentence: bestMatch.text,
        sentenceId: bestMatch.id,
        similarity: bestMatch.similarity,
        keypoints: keypoints,
        alternativeMatches: matches.slice(1)
    };
}

/**
 * Get dataset statistics
 */
function getStats() {
    return {
        indexLoaded: !!sentenceIndex,
        indexSize: sentenceIndex?.sentences?.length || 0,
        translationsLoaded: !!translations,
        translationsCount: translations ? Object.keys(translations).length : 0,
        keypointsDir: fs.existsSync(KEYPOINTS_DIR)
    };
}

export {
    loadTranslations,
    buildIndex,
    findClosestSentences,
    loadKeypoints,
    translateToSign,
    getStats,
    getEmbedding
};

export default {
    loadTranslations,
    buildIndex,
    findClosestSentences,
    loadKeypoints,
    translateToSign,
    getStats
};
