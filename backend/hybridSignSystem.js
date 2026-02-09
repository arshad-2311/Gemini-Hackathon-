// ============================================
// HYBRID SIGN SYSTEM
// Works with OR without SignAvatars dataset
// Enhanced for full SignAvatars integration
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import signFallback from './signFallback.js';
import signDatabase from './signDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Demo mode settings
    demoMode: true,

    // Fallback chain - SignAvatars first, then external, procedural, fingerspelling
    fallbackChain: ['signAvatars', 'video', 'external', 'procedural', 'fingerspelling'],

    // Prefer specific SignAvatars sources
    signAvatarsPreference: ['wlasl', 'how2sign', 'hamnosys', 'phoenix', 'custom'],

    // External video sources
    externalSources: {
        handspeak: {
            name: 'Handspeak',
            baseUrl: 'https://www.handspeak.com',
            priority: 1
        },
        lifeprint: {
            name: 'Lifeprint ASL University',
            baseUrl: 'https://www.lifeprint.com',
            priority: 2
        },
        signingSavvy: {
            name: 'Signing Savvy',
            baseUrl: 'https://www.signingsavvy.com',
            priority: 3
        }
    },

    // Phase information
    phases: {
        current: 'signavatars_integrated',
        roadmap: [
            { phase: 1, name: 'Hackathon Demo', signs: 100, type: 'procedural', status: 'complete' },
            { phase: 2, name: 'SignAvatars Integration', signs: 2500, type: 'video', status: 'active' },
            { phase: 3, name: 'Production', signs: 10000, type: 'motion_capture', status: 'planned' }
        ]
    }
};

// ============================================
// LOAD DEMO INDEX
// ============================================

let demoIndex = null;

function loadDemoIndex() {
    // Try to load demo index
    const demoPath = path.join(__dirname, 'dataset/metadata/demo-sign-index.json');
    if (fs.existsSync(demoPath)) {
        try {
            demoIndex = JSON.parse(fs.readFileSync(demoPath, 'utf-8'));
            console.log('📚 Demo index loaded:', demoIndex.stats?.totalSigns || 0, 'signs');
        } catch (e) {
            console.warn('⚠️  Failed to load demo index:', e.message);
        }
    }
}

// Load on module init
loadDemoIndex();

// ============================================
// HYBRID SIGN SYSTEM CLASS
// ============================================

class HybridSignSystem {
    constructor() {
        this.demoIndex = demoIndex;
        this.signDatabase = signDatabase;
        this.config = CONFIG;
        this.fallbackSystem = signFallback;
    }

    // ============================================
    // MAIN API: Get sign with best available source
    // ============================================

    async getSign(gloss, dialect = 'ASL', options = {}) {
        const upperGloss = gloss.toUpperCase().replace(/\s+/g, '_');
        const quality = options.quality || '720p';

        // Try each source in fallback chain
        for (const source of this.config.fallbackChain) {
            const result = await this.trySource(source, upperGloss, dialect, quality);
            if (result) {
                return {
                    ...result,
                    gloss: upperGloss,
                    dialect,
                    fallback: source !== 'signAvatars' && source !== 'video'
                };
            }
        }

        // Absolute fallback: fingerspelling
        return this.getFingerspelling(upperGloss, dialect);
    }

    async trySource(source, gloss, dialect, quality) {
        switch (source) {
            case 'signAvatars':
                return this.trySignAvatarsSource(gloss, dialect, quality);
            case 'video':
                return this.tryVideoSource(gloss, dialect, quality);
            case 'external':
                return this.tryExternalSource(gloss, dialect);
            case 'procedural':
                return this.tryProceduralSource(gloss, dialect);
            case 'fingerspelling':
                return this.getFingerspelling(gloss, dialect);
            default:
                return null;
        }
    }

    // ============================================
    // SIGNAVATARS SOURCE (from processed dataset)
    // ============================================

    trySignAvatarsSource(gloss, dialect, quality) {
        // Check if video exists in signDatabase
        const videoPath = this.signDatabase.getSignVideo(gloss, dialect, quality);

        if (!videoPath) return null;

        // Verify file actually exists
        if (!fs.existsSync(videoPath)) return null;

        const metadata = this.signDatabase.getSignMetadata(gloss, dialect);
        const thumbnailPath = this.signDatabase.getSignThumbnail(gloss, dialect);

        return {
            type: 'signAvatars',
            source: metadata?.source || 'signAvatars',
            videoPath: videoPath,
            videoURL: this.signDatabase.getVideoURL(gloss, dialect, quality),
            thumbnailURL: this.signDatabase.getThumbnailURL(gloss, dialect),
            thumbnailPath: thumbnailPath,
            duration: metadata?.duration || 2,
            context: metadata?.context || null,
            metadata: metadata?.metadata || {}
        };
    }

    // ============================================
    // VIDEO SOURCE (legacy - for backwards compatibility)
    // ============================================

    tryVideoSource(gloss, dialect, quality) {
        // This is now a fallback to signAvatars for any videos not in the main index
        // Check if there's a video in the processed directory
        const dialectLower = dialect.toLowerCase();
        const glossClean = gloss.replace(/\s+/g, '_');
        const videoPath = path.join(__dirname, 'dataset/processed', dialectLower, `${glossClean}_${quality}.mp4`);

        if (!fs.existsSync(videoPath)) return null;

        return {
            type: 'video',
            source: 'legacy',
            videoPath: videoPath,
            videoURL: `/signs/${dialectLower}/${glossClean}_${quality}.mp4`,
            duration: 2,
            metadata: {}
        };
    }

    // ============================================
    // EXTERNAL SOURCE (embedded/linked videos)
    // ============================================

    tryExternalSource(gloss, dialect) {
        // Only ASL has good external sources
        if (dialect !== 'ASL') return null;

        const signData = this.demoIndex?.dialects?.[dialect]?.[gloss];
        if (!signData?.externalLinks) return null;

        const links = signData.externalLinks;
        const availableSources = Object.keys(links);

        if (availableSources.length === 0) return null;

        // Sort by priority
        const sortedSources = availableSources.sort((a, b) => {
            return (this.config.externalSources[a]?.priority || 99) -
                (this.config.externalSources[b]?.priority || 99);
        });

        return {
            type: 'external',
            source: sortedSources[0],
            externalLinks: links,
            primaryLink: links[sortedSources[0]],
            primarySource: this.config.externalSources[sortedSources[0]]?.name || sortedSources[0],
            description: signData.description,
            duration: 3, // Estimated
            // Also include procedural as backup for inline display
            proceduralFallback: this.fallbackSystem.checkSignAvailability(gloss, dialect).hasProcedural
        };
    }

    // ============================================
    // PROCEDURAL SOURCE (3D animations)
    // ============================================

    tryProceduralSource(gloss, dialect) {
        // Check if procedural animation exists
        const availability = this.fallbackSystem.checkSignAvailability(gloss, dialect);

        if (!availability.hasProcedural) return null;

        // Get the procedural animation data
        const signData = this.demoIndex?.dialects?.[dialect]?.[gloss] ||
            this.demoIndex?.dialects?.ASL?.[gloss]; // Fallback to ASL

        return {
            type: 'procedural',
            source: 'procedural',
            animation: this.fallbackSystem.fallbackSigns[gloss]?.animation || null,
            description: signData?.description || this.fallbackSystem.fallbackSigns[gloss]?.description,
            color: this.fallbackSystem.fallbackSigns[gloss]?.color || '#6366f1',
            category: signData?.category || this.fallbackSystem.fallbackSigns[gloss]?.category,
            difficulty: signData?.difficulty || 'beginner',
            duration: this.fallbackSystem.fallbackSigns[gloss]?.animation?.duration || 2
        };
    }

    // ============================================
    // FINGERSPELLING (always available)
    // ============================================

    getFingerspelling(gloss, dialect) {
        const letters = gloss.replace(/_/g, '').split('');

        return {
            type: 'fingerspelling',
            source: 'fingerspelling',
            gloss: gloss,
            dialect: dialect,
            letters: letters.map((letter, i) => ({
                letter: letter.toUpperCase(),
                index: i,
                duration: 0.8
            })),
            totalDuration: letters.length * 0.8,
            description: `Fingerspell: ${gloss.replace(/_/g, ' ')}`,
            fallback: true
        };
    }

    // ============================================
    // BATCH OPERATIONS
    // ============================================

    async getSignSequence(glossArray, dialect = 'ASL', options = {}) {
        const results = [];
        const stats = { signAvatars: 0, video: 0, external: 0, procedural: 0, fingerspelling: 0 };

        for (const gloss of glossArray) {
            const sign = await this.getSign(gloss, dialect, options);
            results.push(sign);
            stats[sign.type] = (stats[sign.type] || 0) + 1;
        }

        return {
            dialect,
            total: glossArray.length,
            stats,
            sequence: results
        };
    }

    // ============================================
    // AVAILABILITY & STATS
    // ============================================

    getStats() {
        const demoStats = this.demoIndex?.stats || { totalSigns: 0 };
        const dbStats = this.signDatabase.getStats();

        return {
            mode: dbStats.totalSigns > 0 ? 'full' : 'demo',
            demoSigns: demoStats.totalSigns,
            videoSigns: dbStats.totalSigns,
            proceduralSigns: this.fallbackSystem.getAvailableFallbacks().length,
            sources: dbStats.sources || {},
            categories: this.getCategories(),
            dialects: this.signDatabase.getDialects().length > 0
                ? this.signDatabase.getDialects()
                : ['ASL', 'BSL', 'ISL'],
            phase: this.config.phases.current,
            roadmap: this.config.phases.roadmap
        };
    }

    getAvailableSigns(dialect = 'ASL') {
        const signs = new Set();

        // Add from signDatabase (SignAvatars processed)
        const dbSigns = this.signDatabase.getAvailableSigns(dialect);
        dbSigns.forEach(s => signs.add(s));

        // Add from demo index
        if (this.demoIndex?.dialects?.[dialect]) {
            Object.keys(this.demoIndex.dialects[dialect]).forEach(s => signs.add(s));
        }

        // Add procedural fallbacks
        this.fallbackSystem.getAvailableFallbacks().forEach(s => signs.add(s));

        return Array.from(signs).sort();
    }

    getCategories(dialect = 'ASL') {
        const categories = new Set();

        // From signDatabase
        const dbCategories = this.signDatabase.getCategories(dialect);
        dbCategories.forEach(c => categories.add(c));

        // From demo index
        if (this.demoIndex?.dialects?.[dialect]) {
            for (const data of Object.values(this.demoIndex.dialects[dialect])) {
                if (data.category) categories.add(data.category);
            }
        }

        return Array.from(categories).sort();
    }

    getSignsByCategory(category, dialect = 'ASL') {
        const signs = [];

        // From signDatabase
        const dbSigns = this.signDatabase.getSignsByCategory(category, dialect);
        dbSigns.forEach(gloss => {
            const metadata = this.signDatabase.getSignMetadata(gloss, dialect);
            signs.push({
                gloss,
                source: 'signAvatars',
                description: metadata?.context?.category || category,
                hasVideo: true
            });
        });

        // From demo index
        const dialectData = this.demoIndex?.dialects?.[dialect] || {};
        for (const [gloss, data] of Object.entries(dialectData)) {
            if (data.category === category && !signs.find(s => s.gloss === gloss)) {
                signs.push({
                    gloss,
                    source: 'demo',
                    description: data.description,
                    difficulty: data.difficulty,
                    hasVideo: false
                });
            }
        }

        return signs;
    }

    getSignsBySource(source, dialect = 'ASL') {
        return this.signDatabase.getSignsBySource(source, dialect);
    }

    getDemoHighlights() {
        return this.demoIndex?.demoHighlights || [
            'HELLO', 'THANK_YOU', 'I_LOVE_YOU', 'HELP', 'UNDERSTAND',
            'GOOD', 'YES', 'NO', 'PLEASE', 'SORRY'
        ];
    }

    checkSignAvailability(gloss, dialect = 'ASL') {
        const upperGloss = gloss.toUpperCase().replace(/\s+/g, '_');

        const hasSignAvatars = this.signDatabase.hasSign(upperGloss, dialect) &&
            this.signDatabase.videoExists(upperGloss, dialect);
        const hasExternal = !!this.demoIndex?.dialects?.[dialect]?.[upperGloss]?.externalLinks;
        const hasProcedural = this.fallbackSystem.checkSignAvailability(upperGloss, dialect).hasProcedural;

        return {
            gloss: upperGloss,
            dialect,

            // Check each source
            hasSignAvatars,
            hasVideo: hasSignAvatars,  // Alias for backwards compatibility
            hasExternal,
            hasProcedural,
            canFingerspell: true,

            // Source info
            source: hasSignAvatars
                ? this.signDatabase.getSignMetadata(upperGloss, dialect)?.source
                : null,

            // Best available source
            bestSource: this.getBestSource(upperGloss, dialect)
        };
    }

    getBestSource(gloss, dialect) {
        if (this.signDatabase.hasSign(gloss, dialect) &&
            this.signDatabase.videoExists(gloss, dialect)) {
            return 'signAvatars';
        }
        if (this.demoIndex?.dialects?.[dialect]?.[gloss]?.externalLinks) return 'external';
        if (this.fallbackSystem.checkSignAvailability(gloss, dialect).hasProcedural) return 'procedural';
        return 'fingerspelling';
    }

    // ============================================
    // CONTEXT & SENTENCE SUPPORT
    // ============================================

    getSignContext(gloss, dialect = 'ASL') {
        return this.signDatabase.getSignContext(gloss, dialect);
    }

    findSignsWithContext(sentence, dialect = 'ASL') {
        return this.signDatabase.findSignsWithContext(sentence, dialect);
    }

    // ============================================
    // DEMO MODE HELPERS
    // ============================================

    getDemoInfo() {
        const stats = this.getStats();

        return {
            isDemo: this.config.demoMode,
            currentPhase: this.config.phases.current,
            message: stats.videoSigns > 0
                ? `SignAvatars integrated with ${stats.videoSigns} video signs`
                : 'Full SignAvatars dataset integration in progress',
            features: [
                `✅ ${stats.proceduralSigns}+ procedural sign animations`,
                `✅ ${stats.videoSigns}+ SignAvatars video signs`,
                '✅ Gemini-powered translation',
                '✅ Real-time 3D avatar',
                '✅ Multi-dialect support (ASL, BSL, ISL, GSL)',
                '✅ Spatial awareness',
                '✅ WLASL, How2Sign, HamNoSys support',
                '⏳ Motion capture integration (future)'
            ],
            sources: stats.sources,
            nextPhase: {
                name: 'Production',
                description: '10,000+ signs with motion capture quality',
                eta: 'Future release'
            }
        };
    }

    // For embedding external videos
    getEmbedHTML(gloss, dialect = 'ASL') {
        const signData = this.demoIndex?.dialects?.[dialect]?.[gloss];

        if (!signData?.externalLinks) {
            return null;
        }

        const link = signData.externalLinks.lifeprint ||
            signData.externalLinks.handspeak ||
            Object.values(signData.externalLinks)[0];

        return {
            iframe: `<iframe src="${link}" width="400" height="300" frameborder="0" allowfullscreen></iframe>`,
            link: link,
            openInNewTab: `<a href="${link}" target="_blank" rel="noopener noreferrer">View ${gloss} on external site</a>`
        };
    }

    // Reload all indices
    reload() {
        loadDemoIndex();
        this.demoIndex = demoIndex;
        this.signDatabase.reload();
        console.log('🔄 Hybrid sign system reloaded');
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

const hybridSignSystem = new HybridSignSystem();

export { HybridSignSystem, CONFIG };
export default hybridSignSystem;
