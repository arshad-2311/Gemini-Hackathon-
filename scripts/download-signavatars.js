// ============================================
// SIGNAVATARS DOWNLOAD HELPER
// Guides users through dataset setup
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    datasetPath: path.join(backendDir, 'backend/dataset'),
    signAvatarsPath: path.join(backendDir, 'backend/dataset/raw/SignAvatars'),

    // Dataset sources
    sources: {
        signAvatars: {
            name: 'SignAvatars Annotations',
            url: 'https://docs.google.com/forms/d/e/1FAIpQLSc6xQJJMf_R4xJ1sIwDL6FBIYw4HbVVv_HUgCqeiguWX5XGPg/viewform',
            required: true
        },
        wlasl: {
            name: 'WLASL (ASL Word Signs)',
            url: 'https://dxli94.github.io/WLASL/',
            targetDir: 'word2motion',
            required: true
        },
        how2sign: {
            name: 'How2Sign (ASL Sentences)',
            url: 'https://how2sign.github.io/',
            targetDir: 'language2motion',
            required: false
        },
        phoenix: {
            name: 'PHOENIX-2014-T (German SL)',
            url: 'https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-PHOENIX-2014-T/',
            targetDir: 'language2motion',
            required: false
        }
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function printHeader() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║          SignAvatars Dataset Download Helper              ║
║                                                           ║
║  This script will guide you through downloading and       ║
║  organizing the SignAvatars dataset for your project.     ║
╚═══════════════════════════════════════════════════════════╝
`);
}

function printStep(num, title) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`Step ${num}: ${title}`);
    console.log('─'.repeat(55));
}

function checkFFmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function createDirectoryStructure() {
    const dirs = [
        'backend/dataset/raw/SignAvatars/word2motion/videos',
        'backend/dataset/raw/SignAvatars/word2motion/text',
        'backend/dataset/raw/SignAvatars/language2motion/videos',
        'backend/dataset/raw/SignAvatars/language2motion/text',
        'backend/dataset/raw/SignAvatars/hamnosys2motion/videos',
        'backend/dataset/processed/asl',
        'backend/dataset/processed/bsl',
        'backend/dataset/processed/isl',
        'backend/dataset/processed/gsl',
        'backend/dataset/thumbnails/asl',
        'backend/dataset/thumbnails/bsl',
        'backend/dataset/thumbnails/isl',
        'backend/dataset/thumbnails/gsl',
        'backend/dataset/metadata'
    ];

    console.log('\nCreating directory structure...\n');

    for (const dir of dirs) {
        const fullPath = path.join(backendDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`  ✅ Created: ${dir}`);
        } else {
            console.log(`  ⏭️  Exists:  ${dir}`);
        }
    }
}

function checkExistingData() {
    console.log('\nChecking for existing data...\n');

    const checks = [
        { path: 'backend/dataset/raw/SignAvatars/word2motion/videos', name: 'WLASL Videos' },
        { path: 'backend/dataset/raw/SignAvatars/word2motion/text/WLASL_v0.3.json', name: 'WLASL Annotations' },
        { path: 'backend/dataset/raw/SignAvatars/language2motion/videos', name: 'How2Sign Videos' },
        { path: 'backend/dataset/metadata/sign-index.json', name: 'Processed Index' }
    ];

    let hasData = false;

    for (const check of checks) {
        const fullPath = path.join(backendDir, check.path);
        const exists = fs.existsSync(fullPath);

        if (exists) {
            if (fs.statSync(fullPath).isDirectory()) {
                const files = fs.readdirSync(fullPath);
                console.log(`  ✅ ${check.name}: ${files.length} items`);
                if (files.length > 0) hasData = true;
            } else {
                console.log(`  ✅ ${check.name}: Present`);
                hasData = true;
            }
        } else {
            console.log(`  ⬜ ${check.name}: Not present`);
        }
    }

    return hasData;
}

function printInstructions() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   Download Instructions                    ║
╚═══════════════════════════════════════════════════════════╝

STEP 1: Request SignAvatars Access
──────────────────────────────────
Fill out the Google Form to request access:
${CONFIG.sources.signAvatars.url}

You'll receive an email with download links for annotations.


STEP 2: Download WLASL Dataset (Required for ASL)
─────────────────────────────────────────────────
Visit: ${CONFIG.sources.wlasl.url}

Download:
  • Video files → place in: backend/dataset/raw/SignAvatars/word2motion/videos/
  • WLASL_v0.3.json → place in: backend/dataset/raw/SignAvatars/word2motion/text/


STEP 3: Download How2Sign (Optional - for sentences)
────────────────────────────────────────────────────
Visit: ${CONFIG.sources.how2sign.url}

Download Green Screen RGB clips and place in:
  backend/dataset/raw/SignAvatars/language2motion/videos/


STEP 4: Process the Dataset
──────────────────────────
After downloading, run:

  cd backend
  node dataset-processor.js

This will:
  • Extract metadata from videos
  • Generate thumbnails
  • Create web-optimized versions
  • Build the searchable index


STEP 5: Verify Installation
──────────────────────────
Run the verification script:

  node verify-dataset.js

Expected output:
  ✅ ASL: 1,234 signs indexed
  ✅ ISL: 567 signs indexed  
  ✅ BSL: 891 signs indexed
  ✅ Total: 2,692 signs ready


For detailed instructions, see:
  docs/DATASET_SETUP.md

`);
}

function printQuickStart() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     Quick Start                            ║
╚═══════════════════════════════════════════════════════════╝

If you have already downloaded the dataset files:

1. Copy video files:
   cp -r /path/to/WLASL/videos/* backend/dataset/raw/SignAvatars/word2motion/videos/

2. Copy annotation file:
   cp /path/to/WLASL/WLASL_v0.3.json backend/dataset/raw/SignAvatars/word2motion/text/

3. Process the dataset:
   cd backend
   node dataset-processor.js

4. Start the server:
   npm start


For Windows PowerShell:
   Copy-Item -Path "C:\\path\\to\\WLASL\\videos\\*" -Destination "backend\\dataset\\raw\\SignAvatars\\word2motion\\videos\\" -Recurse
   Copy-Item -Path "C:\\path\\to\\WLASL\\WLASL_v0.3.json" -Destination "backend\\dataset\\raw\\SignAvatars\\word2motion\\text\\"
   cd backend
   node dataset-processor.js

`);
}

// ============================================
// MAIN
// ============================================

async function main() {
    printHeader();

    // Check prerequisites
    printStep(1, 'Check Prerequisites');

    console.log('\nChecking FFmpeg installation...');
    if (checkFFmpeg()) {
        console.log('  ✅ FFmpeg is installed');
    } else {
        console.log('  ❌ FFmpeg not found!');
        console.log('');
        console.log('  Please install FFmpeg first:');
        console.log('    Windows: winget install FFmpeg');
        console.log('    macOS:   brew install ffmpeg');
        console.log('    Linux:   apt-get install ffmpeg');
        console.log('');
        console.log('  Then run this script again.');
        process.exit(1);
    }

    // Create directory structure
    printStep(2, 'Create Directory Structure');
    createDirectoryStructure();

    // Check existing data
    printStep(3, 'Check Existing Data');
    const hasData = checkExistingData();

    // Print instructions
    printStep(4, 'Download Instructions');

    if (hasData) {
        console.log('\n✅ Some dataset files already present!');
        console.log('\nTo process the dataset, run:');
        console.log('  cd backend');
        console.log('  node dataset-processor.js');
        console.log('');
        console.log('To add more data, follow the instructions below:');
    }

    printInstructions();

    // Print quick start
    printStep(5, 'Quick Start (if you have files ready)');
    printQuickStart();

    console.log('─'.repeat(55));
    console.log('Setup helper complete!');
    console.log('─'.repeat(55));
}

// Run
main().catch(console.error);
