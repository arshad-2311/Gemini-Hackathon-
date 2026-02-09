// ============================================
// SIGN DATABASE - Query Interface
// Access processed SignAvatars dataset
// Enhanced for SignAvatars integration
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SignDatabase {
    constructor() {
        this.indexPath = path.join(__dirname, 'dataset/metadata/sign-index.json');
        this.processedPath = path.join(__dirname, 'dataset/processed');
        this.thumbnailPath = path.join(__dirname, 'dataset/thumbnails');
        this.index = null;
        this.loaded = false;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    load() {
        if (this.loaded) return this;

        try {
            if (fs.existsSync(this.indexPath)) {
                const data = fs.readFileSync(this.indexPath, 'utf8');
                this.index = JSON.parse(data);
                this.loaded = true;
                console.log('📚 SignDatabase loaded:', this.getStats());
            } else {
                console.warn('⚠️ Sign index not found. Run dataset-processor.js first.');
                this.index = {};
            }
        } catch (error) {
            console.error('❌ Failed to load sign index:', error.message);
            this.index = {};
        }

        return this;
    }

    // ============================================
    // QUERY METHODS
    // ============================================

    /**
     * Get video path for a specific sign
     * @param {string} signGloss - The sign to look up (e.g., "HELLO")
     * @param {string} dialect - Dialect code (ASL, BSL, ISL)
     * @param {string} quality - Video quality (1080p, 720p, 480p)
     * @returns {string|null} Path to video file or null if not found
     */
    getSignVideo(signGloss, dialect = 'ASL', quality = '720p') {
        this.load();

        const dialectData = this.index[dialect];
        if (!dialectData) return null;

        const signData = dialectData[signGloss.toUpperCase()];
        if (!signData) return null;

        return signData.variants?.[quality] || signData.videoPath;
    }

    /**
     * Get thumbnail path for a sign
     * @param {string} signGloss - The sign to look up
     * @param {string} dialect - Dialect code
     * @returns {string|null} Path to thumbnail or null
     */
    getSignThumbnail(signGloss, dialect = 'ASL') {
        this.load();
        return this.index[dialect]?.[signGloss.toUpperCase()]?.thumbnail || null;
    }

    /**
     * Get complete metadata for a sign
     * @param {string} signGloss - The sign to look up
     * @param {string} dialect - Dialect code
     * @returns {object|null} Sign metadata or null
     */
    getSignMetadata(signGloss, dialect = 'ASL') {
        this.load();
        return this.index[dialect]?.[signGloss.toUpperCase()] || null;
    }

    /**
     * Check if a sign exists in the database
     * @param {string} signGloss - The sign to check
     * @param {string} dialect - Dialect code
     * @returns {boolean} True if sign exists
     */
    hasSign(signGloss, dialect = 'ASL') {
        this.load();
        return !!this.index[dialect]?.[signGloss.toUpperCase()];
    }

    /**
     * Get all available signs for a dialect
     * @param {string} dialect - Dialect code
     * @returns {string[]} Array of available sign glosses
     */
    getAvailableSigns(dialect = 'ASL') {
        this.load();
        const dialectData = this.index[dialect];
        if (!dialectData) return [];

        // Filter out metadata keys
        return Object.keys(dialectData).filter(key => !key.startsWith('_'));
    }

    /**
     * Search for signs by keyword
     * @param {string} keyword - Search term
     * @param {string} dialect - Dialect code
     * @returns {string[]} Matching sign glosses
     */
    searchSigns(keyword, dialect = 'ASL') {
        const signs = this.getAvailableSigns(dialect);
        const lowerKeyword = keyword.toLowerCase();

        return signs.filter(sign =>
            sign.toLowerCase().includes(lowerKeyword)
        ).slice(0, 20); // Limit results
    }

    /**
     * Get a random sign (for practice mode)
     * @param {string} dialect - Dialect code
     * @returns {object|null} Random sign metadata
     */
    getRandomSign(dialect = 'ASL') {
        const signs = this.getAvailableSigns(dialect);
        if (signs.length === 0) return null;

        const randomSign = signs[Math.floor(Math.random() * signs.length)];
        return {
            gloss: randomSign,
            ...this.getSignMetadata(randomSign, dialect)
        };
    }

    /**
     * Get video sequence for multiple signs
     * @param {string[]} glossArray - Array of sign glosses
     * @param {string} dialect - Dialect code
     * @param {string} quality - Video quality
     * @returns {object[]} Array of sign data with video paths
     */
    getSignSequence(glossArray, dialect = 'ASL', quality = '720p') {
        this.load();

        return glossArray.map(gloss => {
            const videoPath = this.getSignVideo(gloss, dialect, quality);
            const metadata = this.getSignMetadata(gloss, dialect);

            return {
                gloss: gloss.toUpperCase(),
                found: !!videoPath,
                videoPath: videoPath,
                thumbnail: metadata?.thumbnail,
                duration: metadata?.duration || 2,
                source: metadata?.source || 'unknown',
                metadata: metadata?.metadata
            };
        });
    }

    /**
     * Get all available dialects
     * @returns {string[]} Array of dialect codes
     */
    getDialects() {
        this.load();
        return Object.keys(this.index).filter(key => !key.startsWith('_'));
    }

    /**
     * Get database statistics
     * @returns {object} Stats about the database
     */
    getStats() {
        this.load();
        return this.index._meta || {
            totalSigns: 0,
            dialects: {},
            sources: {}
        };
    }

    // ============================================
    // SIGNAVATARS-SPECIFIC METHODS
    // ============================================

    /**
     * Get signs by source dataset
     * @param {string} source - Source dataset (wlasl, how2sign, hamnosys, phoenix, custom)
     * @param {string} dialect - Dialect code
     * @returns {string[]} Signs from that source
     */
    getSignsBySource(source, dialect = 'ASL') {
        this.load();
        const dialectData = this.index[dialect];
        if (!dialectData) return [];

        return Object.entries(dialectData)
            .filter(([key, value]) => {
                if (key.startsWith('_')) return false;
                return value.source?.toLowerCase() === source.toLowerCase();
            })
            .map(([key]) => key);
    }

    /**
     * Get all available sources
     * @returns {string[]} Array of source names
     */
    getSources() {
        this.load();
        return Object.keys(this.index._meta?.sources || {});
    }

    /**
     * Get source statistics
     * @returns {object} Map of source to count
     */
    getSourceStats() {
        this.load();
        return this.index._meta?.sources || {};
    }

    /**
     * Get sentence-level context for a sign
     * @param {string} signGloss - The sign to look up
     * @param {string} dialect - Dialect code
     * @returns {object|null} Context with example sentences
     */
    getSignContext(signGloss, dialect = 'ASL') {
        this.load();
        const signData = this.index[dialect]?.[signGloss.toUpperCase()];
        return signData?.context || null;
    }

    /**
     * Get signs that appear in a specific sentence
     * @param {string} sentence - Sentence to find signs from
     * @param {string} dialect - Dialect code
     * @returns {object[]} Signs appearing in similar sentences
     */
    findSignsWithContext(sentence, dialect = 'ASL') {
        this.load();
        const dialectData = this.index[dialect];
        if (!dialectData) return [];

        const lowerSentence = sentence.toLowerCase();
        const results = [];

        for (const [gloss, data] of Object.entries(dialectData)) {
            if (gloss.startsWith('_')) continue;

            const context = data.context;
            if (context?.sentence?.toLowerCase().includes(lowerSentence)) {
                results.push({
                    gloss,
                    sentence: context.sentence,
                    glossSequence: context.glossSequence,
                    ...data
                });
            }
        }

        return results.slice(0, 10);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get URL path for serving videos (relative to static server)
     * @param {string} signGloss - The sign to look up
     * @param {string} dialect - Dialect code
     * @param {string} quality - Video quality
     * @returns {string|null} URL path for video
     */
    getVideoURL(signGloss, dialect = 'ASL', quality = '720p') {
        const videoPath = this.getSignVideo(signGloss, dialect, quality);
        if (!videoPath) return null;

        // Convert absolute path to relative URL
        const relativePath = path.relative(this.processedPath, videoPath);
        return `/signs/${relativePath.replace(/\\/g, '/')}`;
    }

    /**
     * Get URL path for thumbnails
     * @param {string} signGloss - The sign to look up
     * @param {string} dialect - Dialect code
     * @returns {string|null} URL path for thumbnail
     */
    getThumbnailURL(signGloss, dialect = 'ASL') {
        const thumbPath = this.getSignThumbnail(signGloss, dialect);
        if (!thumbPath) return null;

        const relativePath = path.relative(this.thumbnailPath, thumbPath);
        return `/thumbnails/${relativePath.replace(/\\/g, '/')}`;
    }

    /**
     * Batch check which signs exist
     * @param {string[]} glossArray - Signs to check
     * @param {string} dialect - Dialect code
     * @returns {object} Map of gloss to boolean
     */
    checkSigns(glossArray, dialect = 'ASL') {
        this.load();

        const result = {};
        for (const gloss of glossArray) {
            result[gloss.toUpperCase()] = this.hasSign(gloss, dialect);
        }
        return result;
    }

    /**
     * Get signs by category/tag (if metadata includes categories)
     * @param {string} category - Category name
     * @param {string} dialect - Dialect code
     * @returns {string[]} Signs in that category
     */
    getSignsByCategory(category, dialect = 'ASL') {
        this.load();

        const dialectData = this.index[dialect];
        if (!dialectData) return [];

        return Object.entries(dialectData)
            .filter(([key, value]) => {
                if (key.startsWith('_')) return false;
                // Check both metadata.category and context.category
                const cat1 = value.metadata?.category?.toLowerCase();
                const cat2 = value.context?.category?.toLowerCase();
                return cat1 === category.toLowerCase() || cat2 === category.toLowerCase();
            })
            .map(([key]) => key);
    }

    /**
     * Get all available categories
     * @param {string} dialect - Dialect code
     * @returns {string[]} Array of category names
     */
    getCategories(dialect = 'ASL') {
        this.load();
        const dialectData = this.index[dialect];
        if (!dialectData) return [];

        const categories = new Set();

        for (const [key, value] of Object.entries(dialectData)) {
            if (key.startsWith('_')) continue;
            if (value.metadata?.category) categories.add(value.metadata.category);
            if (value.context?.category) categories.add(value.context.category);
        }

        return Array.from(categories).sort();
    }

    /**
     * Check if video file actually exists on disk
     * @param {string} signGloss - The sign to check
     * @param {string} dialect - Dialect code
     * @param {string} quality - Video quality
     * @returns {boolean} True if video file exists
     */
    videoExists(signGloss, dialect = 'ASL', quality = '720p') {
        const videoPath = this.getSignVideo(signGloss, dialect, quality);
        if (!videoPath) return false;
        return fs.existsSync(videoPath);
    }

    /**
     * Reload the index from disk
     */
    reload() {
        this.loaded = false;
        this.index = null;
        return this.load();
    }
}

// Singleton instance
const signDatabase = new SignDatabase();

export { SignDatabase };
export default signDatabase;
