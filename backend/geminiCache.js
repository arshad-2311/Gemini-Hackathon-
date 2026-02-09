// ============================================
// GEMINI RESPONSE CACHE & MOCK MODE
// Handles rate limiting gracefully
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache file path
const CACHE_FILE = path.join(__dirname, 'dataset/metadata/response-cache.json');

// ============================================
// PRE-BUILT MOCK RESPONSES
// ============================================

const MOCK_TRANSLATIONS = {
    // Common greetings
    'hello': [
        { gloss: 'HELLO', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Open palm', movement: 'Wave at forehead', location: 'head' }
    ],
    'hi': [
        { gloss: 'HELLO', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Open palm', movement: 'Small wave', location: 'head' }
    ],
    'goodbye': [
        { gloss: 'GOODBYE', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Open palm', movement: 'Wave down', location: 'neutral-space' }
    ],
    'bye': [
        { gloss: 'GOODBYE', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Open palm', movement: 'Wave', location: 'neutral-space' }
    ],

    // Common phrases
    'thank you': [
        { gloss: 'THANK-YOU', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, move forward', location: 'face' }
    ],
    'thanks': [
        { gloss: 'THANK-YOU', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, move forward', location: 'face' }
    ],
    'please': [
        { gloss: 'PLEASE', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'Flat hand', movement: 'Circular on chest', location: 'chest' }
    ],
    'sorry': [
        { gloss: 'SORRY', expression: 'furrowed-brows', duration: 1.5, type: 'sign', handShape: 'A handshape', movement: 'Circular on chest', location: 'chest' }
    ],
    'yes': [
        { gloss: 'YES', expression: 'neutral', duration: 1.0, type: 'sign', handShape: 'S handshape', movement: 'Nod fist', location: 'neutral-space' }
    ],
    'no': [
        { gloss: 'NO', expression: 'furrowed-brows', duration: 1.0, type: 'sign', handShape: 'Index and middle extended', movement: 'Snap together', location: 'neutral-space' }
    ],

    // Questions
    'how are you': [
        { gloss: 'HOW', expression: 'raised-eyebrows', duration: 1.0, type: 'sign', handShape: 'Bent hands', movement: 'Rotate outward', location: 'neutral-space' },
        { gloss: 'YOU', expression: 'raised-eyebrows', duration: 0.8, type: 'sign', handShape: 'Index point', movement: 'Point forward', location: 'neutral-space' }
    ],
    'what is your name': [
        { gloss: 'NAME', expression: 'raised-eyebrows', duration: 1.2, type: 'sign', handShape: 'H handshape', movement: 'Tap fingers', location: 'neutral-space' },
        { gloss: 'YOUR', expression: 'raised-eyebrows', duration: 0.8, type: 'sign', handShape: 'Flat palm', movement: 'Push forward', location: 'neutral-space' },
        { gloss: 'WHAT', expression: 'raised-eyebrows', duration: 1.0, type: 'sign', handShape: 'Open hands', movement: 'Shake side to side', location: 'neutral-space' }
    ],
    'my name is': [
        { gloss: 'MY', expression: 'neutral', duration: 0.8, type: 'sign', handShape: 'Flat hand', movement: 'Touch chest', location: 'chest' },
        { gloss: 'NAME', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'H handshape', movement: 'Tap fingers', location: 'neutral-space' }
    ],

    // Common words
    'help': [
        { gloss: 'HELP', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Thumbs up on flat palm', movement: 'Lift up', location: 'neutral-space' }
    ],
    'water': [
        { gloss: 'WATER', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'W handshape', movement: 'Tap chin', location: 'face' }
    ],
    'food': [
        { gloss: 'FOOD', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'Flat O', movement: 'Tap mouth', location: 'face' }
    ],
    'bathroom': [
        { gloss: 'BATHROOM', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'T handshape', movement: 'Shake', location: 'neutral-space' }
    ],
    'good': [
        { gloss: 'GOOD', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, move down to palm', location: 'face' }
    ],
    'bad': [
        { gloss: 'BAD', expression: 'furrowed-brows', duration: 1.2, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, flip down', location: 'face' }
    ],
    'i love you': [
        { gloss: 'I-LOVE-YOU', expression: 'neutral', duration: 2.0, type: 'sign', handShape: 'ILY handshape', movement: 'Hold steady', location: 'neutral-space' }
    ],
    'love': [
        { gloss: 'LOVE', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Crossed arms', movement: 'Hug chest', location: 'chest' }
    ],
    'friend': [
        { gloss: 'FRIEND', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'X handshape', movement: 'Hook and switch', location: 'neutral-space' }
    ],
    'understand': [
        { gloss: 'UNDERSTAND', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'Index finger', movement: 'Flick up near forehead', location: 'head' }
    ],
    'learn': [
        { gloss: 'LEARN', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Flat hand to O', movement: 'Pull from palm to forehead', location: 'head' }
    ],
    'deaf': [
        { gloss: 'DEAF', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'Index finger', movement: 'Touch ear then mouth', location: 'face' }
    ],

    // ============================================
    // QUICK PHRASES (Exact matches for UI buttons)
    // ============================================
    'hello, how are you?': [
        { gloss: 'HELLO', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Open palm', movement: 'Wave at forehead', location: 'head' },
        { gloss: 'HOW', expression: 'raised-eyebrows', duration: 1.0, type: 'sign', handShape: 'Bent hands', movement: 'Rotate outward', location: 'neutral-space' },
        { gloss: 'YOU', expression: 'raised-eyebrows', duration: 0.8, type: 'sign', handShape: 'Index point', movement: 'Point forward', location: 'neutral-space' }
    ],
    'thank you very much': [
        { gloss: 'THANK-YOU', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, move forward', location: 'face' },
        { gloss: 'VERY', expression: 'neutral', duration: 0.8, type: 'sign', handShape: 'V hands', movement: 'Pull apart', location: 'neutral-space' },
        { gloss: 'MUCH', expression: 'neutral', duration: 0.8, type: 'sign', handShape: 'Bent hands', movement: 'Move apart', location: 'neutral-space' }
    ],
    'please help me': [
        { gloss: 'PLEASE', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Flat hand', movement: 'Circular on chest', location: 'chest' },
        { gloss: 'HELP', expression: 'neutral', duration: 1.5, type: 'sign', handShape: 'Thumbs up on flat palm', movement: 'Lift up', location: 'neutral-space' },
        { gloss: 'ME', expression: 'neutral', duration: 0.6, type: 'sign', handShape: 'Index point', movement: 'Point to self', location: 'chest' }
    ],
    'yes, i understand': [
        { gloss: 'YES', expression: 'neutral', duration: 1.0, type: 'sign', handShape: 'S handshape', movement: 'Nod fist', location: 'neutral-space' },
        { gloss: 'UNDERSTAND', expression: 'neutral', duration: 1.3, type: 'sign', handShape: 'Index finger', movement: 'Flick up near forehead', location: 'head' }
    ],
    'no, thank you': [
        { gloss: 'NO', expression: 'furrowed-brows', duration: 1.0, type: 'sign', handShape: 'Index and middle extended', movement: 'Snap together', location: 'neutral-space' },
        { gloss: 'THANK-YOU', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Flat hand', movement: 'Touch chin, move forward', location: 'face' }
    ],
    'nice to meet you': [
        { gloss: 'NICE', expression: 'neutral', duration: 1.0, type: 'sign', handShape: 'Flat hands', movement: 'Slide one over other', location: 'neutral-space' },
        { gloss: 'MEET', expression: 'neutral', duration: 1.2, type: 'sign', handShape: 'Index fingers', movement: 'Bring together', location: 'neutral-space' },
        { gloss: 'YOU', expression: 'neutral', duration: 0.8, type: 'sign', handShape: 'Index point', movement: 'Point forward', location: 'neutral-space' }
    ]
};

// ============================================
// CACHE MANAGER
// ============================================

class GeminiCache {
    constructor() {
        this.cache = {};
        this.stats = {
            hits: 0,
            misses: 0,
            mockFallbacks: 0
        };
        this.loadCache();
    }

    // Load cache from file
    loadCache() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const data = fs.readFileSync(CACHE_FILE, 'utf-8');
                this.cache = JSON.parse(data);
                console.log(`✅ Loaded ${Object.keys(this.cache).length} cached responses`);
            }
        } catch (error) {
            console.warn('Could not load cache:', error.message);
            this.cache = {};
        }
    }

    // Save cache to file
    saveCache() {
        try {
            const dir = path.dirname(CACHE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            console.warn('Could not save cache:', error.message);
        }
    }

    // Generate cache key
    _getCacheKey(method, params) {
        const normalized = JSON.stringify(params).toLowerCase().trim();
        return `${method}:${normalized}`;
    }

    // Get from cache
    get(method, params) {
        const key = this._getCacheKey(method, params);
        if (this.cache[key]) {
            this.stats.hits++;
            console.log(`📦 Cache HIT: ${method}`);
            return this.cache[key].response;
        }
        this.stats.misses++;
        return null;
    }

    // Save to cache
    set(method, params, response) {
        const key = this._getCacheKey(method, params);
        this.cache[key] = {
            response,
            timestamp: Date.now(),
            method,
            params
        };
        this.saveCache();
    }

    // Get mock response for common phrases
    getMockTranslation(text) {
        const normalized = text.toLowerCase().trim();

        // Direct match
        if (MOCK_TRANSLATIONS[normalized]) {
            this.stats.mockFallbacks++;
            console.log(`🎭 Mock response for: "${text}"`);
            return MOCK_TRANSLATIONS[normalized];
        }

        // Partial match - find best matching phrase
        for (const [phrase, signs] of Object.entries(MOCK_TRANSLATIONS)) {
            if (normalized.includes(phrase) || phrase.includes(normalized)) {
                this.stats.mockFallbacks++;
                console.log(`🎭 Partial mock match for: "${text}" → "${phrase}"`);
                return signs;
            }
        }

        // Word-by-word fallback
        const words = normalized.split(/\s+/);
        const result = [];

        for (const word of words) {
            if (MOCK_TRANSLATIONS[word]) {
                result.push(...MOCK_TRANSLATIONS[word]);
            } else {
                // Fingerspell unknown words
                result.push({
                    gloss: word.toUpperCase(),
                    expression: 'neutral',
                    duration: word.length * 0.3,
                    type: 'fingerspell',
                    handShape: 'Fingerspelling',
                    movement: 'Spell letters',
                    location: 'neutral-space',
                    notes: `Fingerspell: ${word}`
                });
            }
        }

        if (result.length > 0) {
            this.stats.mockFallbacks++;
            console.log(`🎭 Word-by-word mock for: "${text}"`);
            return result;
        }

        return null;
    }

    // Get cache statistics
    getStats() {
        return {
            ...this.stats,
            cacheSize: Object.keys(this.cache).length,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    // Clear cache
    clear() {
        this.cache = {};
        this.saveCache();
    }
}

// Singleton instance
const geminiCache = new GeminiCache();

export default geminiCache;
export { MOCK_TRANSLATIONS, GeminiCache };
