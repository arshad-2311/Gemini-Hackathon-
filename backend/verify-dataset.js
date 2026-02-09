// ============================================
// DATASET VERIFICATION SCRIPT
// Verify SignAvatars dataset processing
// Enhanced for full SignAvatars support
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import signDatabase from './signDatabase.js';
import hybridSignSystem from './hybridSignSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SignAvatars Dataset Verification v2.0');
console.log('========================================\n');

// Load database
signDatabase.load();

// Get stats
const stats = signDatabase.getStats();
console.log('📊 Database Statistics:');
console.log(`   Version: ${stats.version || '1.0.0'}`);
console.log(`   Total Signs: ${stats.totalSigns}`);
console.log(`   Generated: ${stats.generatedAt || 'Unknown'}`);
console.log('');

console.log('   Dialects:');
for (const [dialect, count] of Object.entries(stats.dialects || {})) {
    console.log(`     ✅ ${dialect}: ${count} signs indexed`);
}
console.log('');

// Source breakdown
if (stats.sources && Object.keys(stats.sources).length > 0) {
    console.log('   Sources:');
    for (const [source, count] of Object.entries(stats.sources)) {
        console.log(`     📁 ${source}: ${count} videos`);
    }
    console.log('');
}

// Check directories
const dirs = [
    { path: 'dataset/raw', name: 'Raw dataset' },
    { path: 'dataset/raw/SignAvatars', name: 'SignAvatars' },
    { path: 'dataset/raw/SignAvatars/word2motion', name: 'WLASL (word2motion)' },
    { path: 'dataset/raw/SignAvatars/language2motion', name: 'How2Sign (language2motion)' },
    { path: 'dataset/raw/SignAvatars/hamnosys2motion', name: 'HamNoSys' },
    { path: 'dataset/processed', name: 'Processed' },
    { path: 'dataset/metadata', name: 'Metadata' },
    { path: 'dataset/thumbnails', name: 'Thumbnails' }
];

console.log('📁 Directory Check:');
for (const dir of dirs) {
    const fullPath = path.join(__dirname, dir.path);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '⬜';

    if (exists) {
        try {
            const files = fs.readdirSync(fullPath);
            console.log(`   ${status} ${dir.name}: ${files.length} items`);
        } catch (e) {
            console.log(`   ${status} ${dir.name}: (exists)`);
        }
    } else {
        console.log(`   ${status} ${dir.name}: not present`);
    }
}
console.log('');

// Check index files
console.log('📑 Index Files:');
const indexFiles = [
    { path: 'dataset/metadata/sign-index.json', name: 'Main Index' },
    { path: 'dataset/metadata/demo-sign-index.json', name: 'Demo Index' }
];

for (const index of indexFiles) {
    const fullPath = path.join(__dirname, index.path);
    if (fs.existsSync(fullPath)) {
        const indexStats = fs.statSync(fullPath);
        const sizeKB = (indexStats.size / 1024).toFixed(1);
        console.log(`   ✅ ${index.name} (${sizeKB} KB)`);
    } else {
        console.log(`   ⬜ ${index.name}: not present`);
    }
}
console.log('');

// Test queries
console.log('🔑 Query Tests:');

const testDialect = 'ASL';
const testSigns = ['HELLO', 'THANK_YOU', 'HELP', 'LOVE', 'GOOD'];

// Test getAvailableSigns
const availableSigns = signDatabase.getAvailableSigns(testDialect);
console.log(`   Available signs (${testDialect}): ${availableSigns.length}`);

// Test sign lookups
for (const testSign of testSigns) {
    const hasSign = signDatabase.hasSign(testSign, testDialect);
    const videoExists = signDatabase.videoExists(testSign, testDialect);
    const status = hasSign ? (videoExists ? '✅ video' : '📝 indexed') : '⬜ not found';
    console.log(`   ${testSign}: ${status}`);
}

// Test search
const searchResults = signDatabase.searchSigns('thank', testDialect);
if (searchResults.length > 0) {
    console.log(`   Search 'thank': ${searchResults.join(', ')}`);
}

// Test categories
const categories = signDatabase.getCategories(testDialect);
if (categories.length > 0) {
    console.log(`   Categories: ${categories.slice(0, 5).join(', ')}${categories.length > 5 ? '...' : ''}`);
}

// Test sources
const sources = signDatabase.getSources();
if (sources.length > 0) {
    console.log(`   Sources: ${sources.join(', ')}`);
}
console.log('');

// Check for actual video files
console.log('🎬 Video Files:');
const processedPath = path.join(__dirname, 'dataset/processed');

if (fs.existsSync(processedPath)) {
    let totalVideos = 0;
    const dialectStats = {};

    const dialectFolders = fs.readdirSync(processedPath);

    for (const folder of dialectFolders) {
        const folderPath = path.join(processedPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const videos = fs.readdirSync(folderPath).filter(f => f.endsWith('.mp4'));
            totalVideos += videos.length;
            dialectStats[folder.toUpperCase()] = videos.length;
        }
    }

    for (const [dialect, count] of Object.entries(dialectStats)) {
        console.log(`   ${dialect}: ${count} videos`);
    }
    console.log(`   Total: ${totalVideos} video files`);

    if (totalVideos === 0) {
        console.log('');
        console.log('   ℹ️  No processed videos yet');
        console.log('   Run dataset-processor.js after adding source videos');
    }
} else {
    console.log('   Processed folder will be created when processing');
}
console.log('');

// Check thumbnail files
console.log('🖼️  Thumbnails:');
const thumbnailPath = path.join(__dirname, 'dataset/thumbnails');

if (fs.existsSync(thumbnailPath)) {
    let totalThumbs = 0;

    const dialectFolders = fs.readdirSync(thumbnailPath);
    for (const folder of dialectFolders) {
        const folderPath = path.join(thumbnailPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const thumbs = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
            totalThumbs += thumbs.length;
        }
    }

    console.log(`   Total: ${totalThumbs} thumbnails`);
} else {
    console.log('   Thumbnail folder will be created when processing');
}
console.log('');

// Hybrid system check
console.log('🔄 Hybrid System:');
const hybridStats = hybridSignSystem.getStats();
console.log(`   Mode: ${hybridStats.mode}`);
console.log(`   Video Signs: ${hybridStats.videoSigns}`);
console.log(`   Procedural Signs: ${hybridStats.proceduralSigns}`);
console.log(`   Demo Signs: ${hybridStats.demoSigns}`);
console.log(`   Phase: ${hybridStats.phase}`);
console.log('');

// Summary
console.log('========================================');
console.log('Verification Summary');
console.log('========================================');

const issues = [];
const warnings = [];

// Check for critical issues
const indexPath = path.join(__dirname, 'dataset/metadata/sign-index.json');
if (!fs.existsSync(indexPath) && stats.totalSigns === 0) {
    // Only an issue if there are no demo signs either
    if (hybridStats.demoSigns === 0 && hybridStats.proceduralSigns === 0) {
        issues.push('No signs available in any source');
    }
}

// Check for SignAvatars structure
const signAvatarsPath = path.join(__dirname, 'dataset/raw/SignAvatars');
if (!fs.existsSync(signAvatarsPath)) {
    warnings.push('SignAvatars dataset not downloaded yet');
}

// Video check
if (stats.totalSigns > 0) {
    // Verify some videos actually exist
    let verifiedCount = 0;
    const sampleSigns = availableSigns.slice(0, 5);
    for (const sign of sampleSigns) {
        if (signDatabase.videoExists(sign, testDialect)) {
            verifiedCount++;
        }
    }
    if (verifiedCount === 0 && sampleSigns.length > 0) {
        warnings.push('Index exists but video files may be missing');
    }
}

if (issues.length > 0) {
    console.log('');
    console.log('❌ Issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
}

if (warnings.length > 0) {
    console.log('');
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
}

if (issues.length === 0) {
    console.log('');
    console.log('✅ System Ready!');
    console.log('');

    if (stats.totalSigns > 0) {
        console.log(`✅ ASL: ${stats.dialects?.ASL || 0} signs indexed`);
        console.log(`✅ ISL: ${stats.dialects?.ISL || 0} signs indexed`);
        console.log(`✅ BSL: ${stats.dialects?.BSL || 0} signs indexed`);
        console.log(`✅ Total: ${stats.totalSigns} signs ready`);
    } else {
        console.log('ℹ️  Running in demo mode with procedural animations');
        console.log(`   ${hybridStats.proceduralSigns} procedural signs available`);
    }

    console.log('');
    console.log('API Endpoints:');
    console.log('   GET  /api/hybrid/sign/:gloss');
    console.log('   GET  /api/hybrid/available');
    console.log('   GET  /api/signs/stats');
    console.log('   GET  /api/signs/search?q=hello');
    console.log('   POST /api/hybrid/sequence');
}

console.log('');
console.log('For setup instructions, see: docs/DATASET_SETUP.md');
console.log('');
