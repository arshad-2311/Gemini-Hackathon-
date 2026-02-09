// ============================================
// SIGNAVATARS DATASET PROCESSOR
// Processes SignAvatars dataset for web use
// Enhanced for full SignAvatars structure support
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    rawPath: path.join(__dirname, 'dataset/raw'),
    signAvatarsPath: path.join(__dirname, 'dataset/raw/SignAvatars'),
    processedPath: path.join(__dirname, 'dataset/processed'),
    metadataPath: path.join(__dirname, 'dataset/metadata'),
    thumbnailPath: path.join(__dirname, 'dataset/thumbnails'),

    // SignAvatars sub-datasets configuration
    subdatasets: {
        word2motion: {
            path: 'word2motion',
            videosDir: 'videos',
            annotationFile: 'text/WLASL_v0.3.json',
            type: 'word',
            dialect: 'ASL',
            priority: 1  // Highest priority for word-level signs
        },
        language2motion: {
            path: 'language2motion',
            videosDir: 'videos',
            annotationFiles: [
                'text/how2sign_train.csv',
                'text/how2sign_test.csv',
                'text/how2sign_val.csv',
                'text/PHOENIX-2014-T.train.corpus.csv',
                'text/PHOENIX-2014-T.test.corpus.csv'
            ],
            type: 'sentence',
            dialect: 'ASL',  // How2Sign is ASL, PHOENIX is GSL
            priority: 2
        },
        hamnosys2motion: {
            path: 'hamnosys2motion',
            videosDir: 'videos',
            annotationFile: 'data.json',
            type: 'word',
            dialect: 'ISL',  // International notation
            priority: 3
        }
    },

    // Video settings
    qualities: {
        '1080p': { width: 1920, height: 1080, bitrate: '4M' },
        '720p': { width: 1280, height: 720, bitrate: '2M' },
        '480p': { width: 854, height: 480, bitrate: '1M' }
    },
    defaultQuality: '720p',

    // Processing options
    batchSize: 50,
    skipExisting: true,
    generateAllQualities: false,  // Set to true for full processing

    // Supported dialects
    dialects: ['ASL', 'BSL', 'ISL', 'GSL'],

    // Supported video extensions
    videoExtensions: ['.mp4', '.mov', '.avi', '.webm', '.mkv']
};

class SignAvatarsProcessor {
    constructor(datasetPath = CONFIG.signAvatarsPath) {
        this.datasetPath = datasetPath;
        this.index = {};
        this.annotations = {};  // Loaded annotations
        this.stats = {
            processed: 0,
            failed: 0,
            skipped: 0,
            sources: {}
        };
        this.options = {
            testMode: false,
            rebuildIndex: false,
            batchSize: CONFIG.batchSize
        };
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async initialize() {
        console.log('🚀 SignAvatars Dataset Processor v2.0');
        console.log('=====================================\n');

        // Create output directories
        this.ensureDirectories();

        // Check for FFmpeg
        if (!this.checkFFmpeg()) {
            console.error('❌ FFmpeg not found. Please install FFmpeg first.');
            console.error('   Windows: winget install FFmpeg');
            console.error('   Mac: brew install ffmpeg');
            console.error('   Linux: apt-get install ffmpeg');
            process.exit(1);
        }

        console.log('✅ FFmpeg found');
        console.log(`📁 Dataset path: ${this.datasetPath}`);
        console.log(`📁 Output path: ${CONFIG.processedPath}\n`);

        // Load existing index if available
        await this.loadExistingIndex();
    }

    ensureDirectories() {
        const dirs = [
            CONFIG.processedPath,
            CONFIG.metadataPath,
            CONFIG.thumbnailPath
        ];

        CONFIG.dialects.forEach(dialect => {
            dirs.push(path.join(CONFIG.processedPath, dialect.toLowerCase()));
            dirs.push(path.join(CONFIG.thumbnailPath, dialect.toLowerCase()));
        });

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    checkFFmpeg() {
        try {
            execSync('ffmpeg -version', { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    }

    async loadExistingIndex() {
        const indexPath = path.join(CONFIG.metadataPath, 'sign-index.json');
        if (fs.existsSync(indexPath)) {
            try {
                const data = fs.readFileSync(indexPath, 'utf8');
                const existing = JSON.parse(data);
                // Keep existing entries to avoid reprocessing
                if (!this.options.rebuildIndex) {
                    this.index = existing;
                    console.log(`📚 Loaded existing index with ${existing._meta?.totalSigns || 0} signs\n`);
                }
            } catch (error) {
                console.warn('⚠️ Could not load existing index:', error.message);
            }
        }
    }

    // ============================================
    // ANNOTATION LOADING
    // ============================================

    async loadAnnotations() {
        console.log('📖 Loading annotations...\n');

        for (const [name, config] of Object.entries(CONFIG.subdatasets)) {
            const subdatasetPath = path.join(this.datasetPath, config.path);

            if (!fs.existsSync(subdatasetPath)) {
                console.log(`   ⏭️ ${name}: Not found, skipping`);
                continue;
            }

            try {
                if (name === 'word2motion') {
                    await this.loadWLASLAnnotations(subdatasetPath, config);
                } else if (name === 'language2motion') {
                    await this.loadSentenceAnnotations(subdatasetPath, config);
                } else if (name === 'hamnosys2motion') {
                    await this.loadHamNoSysAnnotations(subdatasetPath, config);
                }
            } catch (error) {
                console.warn(`   ⚠️ ${name}: ${error.message}`);
            }
        }

        const totalAnnotations = Object.values(this.annotations).reduce(
            (sum, a) => sum + Object.keys(a).length, 0
        );
        console.log(`\n📊 Loaded ${totalAnnotations} annotations\n`);
    }

    async loadWLASLAnnotations(basePath, config) {
        const annotationPath = path.join(basePath, config.annotationFile);

        if (!fs.existsSync(annotationPath)) {
            console.log(`   ⏭️ WLASL annotations not found at ${annotationPath}`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(annotationPath, 'utf8'));
        this.annotations.wlasl = {};

        // WLASL format: array of gloss entries with instances
        for (const entry of data) {
            const gloss = entry.gloss?.toUpperCase();
            if (!gloss) continue;

            for (const instance of (entry.instances || [])) {
                const videoId = instance.video_id;
                if (videoId) {
                    this.annotations.wlasl[videoId] = {
                        gloss: gloss,
                        source: 'wlasl',
                        dialect: 'ASL',
                        category: entry.action_class || 'general',
                        bbox: instance.bbox,
                        split: instance.split
                    };
                }
            }
        }

        console.log(`   ✅ WLASL: ${Object.keys(this.annotations.wlasl).length} video mappings`);
    }

    async loadSentenceAnnotations(basePath, config) {
        this.annotations.how2sign = {};
        this.annotations.phoenix = {};

        for (const annotationFile of config.annotationFiles) {
            const annotationPath = path.join(basePath, annotationFile);

            if (!fs.existsSync(annotationPath)) continue;

            const content = fs.readFileSync(annotationPath, 'utf8');
            const lines = content.split('\n');

            // Parse CSV
            const isHow2Sign = annotationFile.includes('how2sign');
            const targetAnnotations = isHow2Sign ? this.annotations.how2sign : this.annotations.phoenix;

            for (let i = 1; i < lines.length; i++) {  // Skip header
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split('|').length > 1 ? line.split('|') : line.split(',');

                if (isHow2Sign && parts.length >= 2) {
                    // How2Sign format: video_id, sentence, gloss_sequence
                    const videoId = parts[0]?.trim();
                    const sentence = parts[1]?.trim();
                    const glossSequence = parts[2]?.trim();

                    if (videoId) {
                        targetAnnotations[videoId] = {
                            sentence: sentence,
                            glossSequence: glossSequence?.split(' ').filter(g => g),
                            source: 'how2sign',
                            dialect: 'ASL',
                            type: 'sentence'
                        };
                    }
                } else if (!isHow2Sign && parts.length >= 3) {
                    // PHOENIX format: id|video|annotation
                    const videoId = parts[1]?.trim();
                    const annotation = parts[2]?.trim();

                    if (videoId) {
                        targetAnnotations[videoId] = {
                            sentence: annotation,
                            glossSequence: annotation?.split(' ').filter(g => g),
                            source: 'phoenix',
                            dialect: 'GSL',
                            type: 'sentence'
                        };
                    }
                }
            }
        }

        console.log(`   ✅ How2Sign: ${Object.keys(this.annotations.how2sign).length} sentences`);
        console.log(`   ✅ PHOENIX: ${Object.keys(this.annotations.phoenix).length} sentences`);
    }

    async loadHamNoSysAnnotations(basePath, config) {
        const annotationPath = path.join(basePath, config.annotationFile);

        if (!fs.existsSync(annotationPath)) {
            console.log(`   ⏭️ HamNoSys annotations not found`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(annotationPath, 'utf8'));
        this.annotations.hamnosys = {};

        // HamNoSys format varies, adapt as needed
        if (Array.isArray(data)) {
            for (const entry of data) {
                const videoId = entry.video_id || entry.id;
                if (videoId) {
                    this.annotations.hamnosys[videoId] = {
                        gloss: entry.gloss?.toUpperCase() || entry.sign?.toUpperCase(),
                        hamnosys: entry.hamnosys,
                        source: 'hamnosys',
                        dialect: 'ISL'
                    };
                }
            }
        } else if (typeof data === 'object') {
            // Object format with video IDs as keys
            for (const [videoId, entry] of Object.entries(data)) {
                this.annotations.hamnosys[videoId] = {
                    gloss: entry.gloss?.toUpperCase() || entry.sign?.toUpperCase(),
                    hamnosys: entry.hamnosys,
                    source: 'hamnosys',
                    dialect: 'ISL'
                };
            }
        }

        console.log(`   ✅ HamNoSys: ${Object.keys(this.annotations.hamnosys).length} entries`);
    }

    // ============================================
    // DATASET SCANNING
    // ============================================

    async scanDataset() {
        console.log('📂 Scanning dataset directory...\n');

        const videos = [];

        // Scan SignAvatars sub-datasets
        for (const [name, config] of Object.entries(CONFIG.subdatasets)) {
            const subdatasetPath = path.join(this.datasetPath, config.path);
            const videosPath = path.join(subdatasetPath, config.videosDir);

            if (!fs.existsSync(videosPath)) {
                console.log(`   ⏭️ ${name}/videos: Not found`);
                continue;
            }

            const subdatasetVideos = this.scanDirectory(videosPath, name, config);
            videos.push(...subdatasetVideos);
            console.log(`   ✅ ${name}: ${subdatasetVideos.length} videos`);

            this.stats.sources[name] = subdatasetVideos.length;
        }

        // Also scan raw directory for non-SignAvatars videos
        const rawPath = CONFIG.rawPath;
        if (fs.existsSync(rawPath)) {
            const rawVideos = this.scanDirectory(rawPath, 'custom', { dialect: 'ASL' });
            // Filter out SignAvatars subdirectory
            const filteredRaw = rawVideos.filter(v => !v.path.includes('SignAvatars'));
            if (filteredRaw.length > 0) {
                videos.push(...filteredRaw);
                console.log(`   ✅ custom: ${filteredRaw.length} videos`);
                this.stats.sources.custom = filteredRaw.length;
            }
        }

        console.log(`\n📊 Total: ${videos.length} video files\n`);

        // Limit for test mode
        if (this.options.testMode) {
            console.log('🧪 Test mode: Processing first 10 videos only\n');
            return videos.slice(0, 10);
        }

        return videos;
    }

    scanDirectory(dir, sourceName, config) {
        const videos = [];

        const scanDir = (currentDir, detectedDialect = null) => {
            if (!fs.existsSync(currentDir)) return;

            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    // Check if directory name matches a dialect
                    const upperName = entry.name.toUpperCase();
                    const dialect = CONFIG.dialects.includes(upperName) ? upperName : detectedDialect;
                    scanDir(fullPath, dialect);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (CONFIG.videoExtensions.includes(ext)) {
                        const videoId = path.basename(entry.name, ext);
                        const annotation = this.findAnnotation(videoId, sourceName);

                        videos.push({
                            path: fullPath,
                            filename: entry.name,
                            videoId: videoId,
                            gloss: annotation?.gloss || this.extractGloss(entry.name),
                            dialect: annotation?.dialect || detectedDialect || config.dialect || 'ASL',
                            source: sourceName,
                            annotation: annotation,
                            extension: ext
                        });
                    }
                }
            }
        };

        scanDir(dir);
        return videos;
    }

    findAnnotation(videoId, sourceName) {
        // Check all annotation sources
        if (this.annotations.wlasl?.[videoId]) {
            return this.annotations.wlasl[videoId];
        }
        if (this.annotations.how2sign?.[videoId]) {
            return this.annotations.how2sign[videoId];
        }
        if (this.annotations.phoenix?.[videoId]) {
            return this.annotations.phoenix[videoId];
        }
        if (this.annotations.hamnosys?.[videoId]) {
            return this.annotations.hamnosys[videoId];
        }
        return null;
    }

    extractGloss(filename) {
        // Remove extension and clean up filename to get gloss
        const name = path.basename(filename, path.extname(filename));

        // Remove common suffixes/prefixes
        return name
            .replace(/_\d+p$/i, '')  // Remove quality suffix
            .replace(/^sign_/i, '')   // Remove "sign_" prefix
            .replace(/_v\d+$/i, '')   // Remove version suffix
            .replace(/[_-]/g, '_')    // Normalize separators
            .toUpperCase()
            .trim();
    }

    // ============================================
    // VIDEO PROCESSING
    // ============================================

    async processDataset() {
        await this.initialize();

        // Load annotations first
        await this.loadAnnotations();

        const videos = await this.scanDataset();

        if (videos.length === 0) {
            console.log('⚠️ No videos found to process.');
            console.log('   Make sure videos are in:', this.datasetPath);
            console.log('   See docs/DATASET_SETUP.md for instructions.');
            return;
        }

        console.log('🎬 Processing videos...\n');

        // Process in batches
        const batchSize = this.options.batchSize;
        for (let i = 0; i < videos.length; i += batchSize) {
            const batch = videos.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(videos.length / batchSize);

            console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} videos)\n`);

            for (let j = 0; j < batch.length; j++) {
                const video = batch[j];
                const globalIndex = i + j + 1;
                const progress = `[${globalIndex}/${videos.length}]`;

                // Check if already processed
                if (this.isAlreadyProcessed(video) && CONFIG.skipExisting) {
                    this.stats.skipped++;
                    continue;
                }

                console.log(`${progress} ${video.gloss} (${video.dialect}) [${video.source}]`);

                try {
                    await this.processVideo(video);
                    this.stats.processed++;
                    console.log(`   ✅ Done`);
                } catch (error) {
                    this.stats.failed++;
                    console.error(`   ❌ Failed: ${error.message}`);
                }
            }
        }

        // Build and save index
        await this.buildIndex();
        await this.saveIndex();

        // Print summary
        this.printSummary();
    }

    isAlreadyProcessed(video) {
        const dialect = video.dialect.toUpperCase();
        const gloss = video.gloss;
        return !!this.index[dialect]?.[gloss]?.videoPath;
    }

    async processVideo(video) {
        const { path: inputPath, gloss, dialect, source, annotation } = video;
        const dialectLower = dialect.toLowerCase();
        const glossClean = gloss.replace(/\s+/g, '_');

        // Initialize index entry
        if (!this.index[dialect]) {
            this.index[dialect] = {};
        }

        // Extract metadata
        const metadata = await this.extractMetadata(inputPath);

        // Generate thumbnail
        const thumbnailPath = path.join(
            CONFIG.thumbnailPath,
            dialectLower,
            `${glossClean}.jpg`
        );
        await this.generateThumbnail(inputPath, thumbnailPath);

        // Transcode to default quality (or all qualities if configured)
        const variants = {};
        const qualitiesToProcess = CONFIG.generateAllQualities
            ? Object.keys(CONFIG.qualities)
            : [CONFIG.defaultQuality];

        for (const quality of qualitiesToProcess) {
            const settings = CONFIG.qualities[quality];
            const outputPath = path.join(
                CONFIG.processedPath,
                dialectLower,
                `${glossClean}_${quality}.mp4`
            );

            // Skip if already processed
            if (fs.existsSync(outputPath)) {
                variants[quality] = outputPath;
                continue;
            }

            await this.transcodeVideo(inputPath, outputPath, settings);
            variants[quality] = outputPath;
        }

        // Add to index with enhanced metadata
        this.index[dialect][gloss] = {
            videoPath: variants[CONFIG.defaultQuality],
            thumbnail: thumbnailPath,
            duration: metadata.duration,
            source: source,
            variants: variants,
            metadata: {
                fps: metadata.fps,
                resolution: `${metadata.width}x${metadata.height}`,
                originalFile: video.filename,
                videoId: video.videoId
            },
            // Include annotation context if available
            context: annotation ? {
                category: annotation.category,
                sentence: annotation.sentence,
                glossSequence: annotation.glossSequence,
                hamnosys: annotation.hamnosys
            } : null
        };
    }

    async extractMetadata(videoPath) {
        try {
            const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
            const output = execSync(command, { encoding: 'utf8' });
            const data = JSON.parse(output);

            const videoStream = data.streams.find(s => s.codec_type === 'video') || {};

            return {
                duration: parseFloat(data.format?.duration || 0),
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                fps: this.parseFPS(videoStream.r_frame_rate || '30/1'),
                codec: videoStream.codec_name || 'unknown'
            };
        } catch (error) {
            // console.warn(`   ⚠️ Could not extract metadata: ${error.message}`);
            return { duration: 2, width: 1280, height: 720, fps: 30, codec: 'unknown' };
        }
    }

    parseFPS(fpsString) {
        const parts = fpsString.split('/');
        if (parts.length === 2) {
            return Math.round(parseInt(parts[0]) / parseInt(parts[1]));
        }
        return parseInt(fpsString) || 30;
    }

    async generateThumbnail(inputPath, outputPath) {
        try {
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Skip if exists
            if (fs.existsSync(outputPath)) return;

            // Extract frame at 0.5 seconds
            const command = `ffmpeg -y -i "${inputPath}" -ss 00:00:00.500 -vframes 1 -q:v 2 "${outputPath}"`;
            execSync(command, { stdio: 'pipe' });
        } catch (error) {
            // Silently skip thumbnail errors
        }
    }

    async transcodeVideo(inputPath, outputPath, settings) {
        const { width, height, bitrate } = settings;

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const command = [
            'ffmpeg', '-y',
            '-i', `"${inputPath}"`,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-b:v', bitrate,
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            `"${outputPath}"`
        ].join(' ');

        execSync(command, { stdio: 'pipe' });
    }

    // ============================================
    // INDEX BUILDING
    // ============================================

    async buildIndex() {
        console.log('\n📑 Building search index...');

        // Add statistics to index
        this.index._meta = {
            version: '2.0.0',
            generatedAt: new Date().toISOString(),
            totalSigns: 0,
            dialects: {},
            sources: this.stats.sources
        };

        for (const dialect of CONFIG.dialects) {
            if (this.index[dialect]) {
                const count = Object.keys(this.index[dialect]).filter(k => !k.startsWith('_')).length;
                this.index._meta.dialects[dialect] = count;
                this.index._meta.totalSigns += count;
            }
        }
    }

    async saveIndex() {
        const indexPath = path.join(CONFIG.metadataPath, 'sign-index.json');
        fs.writeFileSync(indexPath, JSON.stringify(this.index, null, 2));
        console.log(`✅ Index saved to: ${indexPath}\n`);
    }

    printSummary() {
        console.log('════════════════════════════════════════');
        console.log('           PROCESSING COMPLETE          ');
        console.log('════════════════════════════════════════');
        console.log(`✅ Processed: ${this.stats.processed}`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        console.log(`⏭️ Skipped: ${this.stats.skipped}`);
        console.log('');
        console.log('Signs per dialect:');
        for (const [dialect, count] of Object.entries(this.index._meta?.dialects || {})) {
            console.log(`   ${dialect}: ${count} signs`);
        }
        console.log('');
        console.log('By source:');
        for (const [source, count] of Object.entries(this.stats.sources || {})) {
            console.log(`   ${source}: ${count} videos`);
        }
        console.log('════════════════════════════════════════\n');
    }
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);

    // Parse command line options
    const options = {
        testMode: args.includes('--test'),
        rebuildIndex: args.includes('--rebuild-index'),
        help: args.includes('--help') || args.includes('-h')
    };

    if (options.help) {
        console.log(`
SignAvatars Dataset Processor v2.0

Usage: node dataset-processor.js [path] [options]

Options:
  --test            Process only first 10 videos (for testing)
  --rebuild-index   Rebuild index from scratch
  --help, -h        Show this help message

Examples:
  node dataset-processor.js
  node dataset-processor.js /path/to/SignAvatars
  node dataset-processor.js --test
  node dataset-processor.js --rebuild-index
`);
        process.exit(0);
    }

    // Get dataset path from args or use default
    const datasetPath = args.find(a => !a.startsWith('--')) || CONFIG.signAvatarsPath;

    const processor = new SignAvatarsProcessor(datasetPath);
    processor.options = { ...processor.options, ...options };

    await processor.processDataset();
}

// Run if called directly
main().catch(console.error);

export { SignAvatarsProcessor, CONFIG };
