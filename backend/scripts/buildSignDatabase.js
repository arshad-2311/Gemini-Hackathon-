// scripts/buildSignDatabase.js
// Build sign language pose database from reference images

import { analyzeSignFromReference } from '../services/geminiVisualSignLearning.js';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const REFERENCE_DIR = './reference_signs';
const OUTPUT_DIR = './validated_signs';
const RATE_LIMIT_MS = 1000; // Delay between API calls

/**
 * Build complete sign database from reference images
 */
async function buildDatabaseFromReferences() {
    console.log('🤟 Sign Database Builder');
    console.log('========================\n');

    // Ensure directories exist
    await ensureDirectories();

    // Find all reference images
    const referenceImages = await glob(`${REFERENCE_DIR}/**/*.{jpg,jpeg,png,gif,webp}`, {
        nocase: true
    });

    if (referenceImages.length === 0) {
        console.log(`⚠️  No images found in ${REFERENCE_DIR}/`);
        console.log('   Add ASL reference images to this folder.');
        console.log('   Image files should be named after the sign (e.g., HELLO.jpg, THANK-YOU.png)\n');
        createSampleStructure();
        return;
    }

    console.log(`📷 Found ${referenceImages.length} reference images\n`);

    const signDatabase = {};
    const stats = { success: 0, failed: 0 };

    for (let i = 0; i < referenceImages.length; i++) {
        const imagePath = referenceImages[i];
        const signName = path.basename(imagePath, path.extname(imagePath)).toUpperCase();

        console.log(`[${i + 1}/${referenceImages.length}] Analyzing: ${signName}`);

        try {
            const poseData = await analyzeSignFromReference(signName, imagePath);

            // Add metadata
            poseData.source = {
                file: path.basename(imagePath),
                path: imagePath,
                analyzed_at: new Date().toISOString()
            };

            signDatabase[signName] = poseData;

            // Save individual sign file
            const outputPath = path.join(OUTPUT_DIR, `${signName}.json`);
            await fs.promises.writeFile(
                outputPath,
                JSON.stringify(poseData, null, 2)
            );

            console.log(`   ✅ Generated pose data for: ${signName}`);
            console.log(`      Confidence: ${poseData.analysis_confidence || 'N/A'}`);
            console.log(`      Keyframes: ${poseData.pose_sequence?.length || 0}`);

            stats.success++;
        } catch (error) {
            console.error(`   ❌ Failed for ${signName}: ${error.message}`);
            signDatabase[signName] = {
                sign: signName,
                error: error.message,
                source_file: path.basename(imagePath)
            };
            stats.failed++;
        }

        // Rate limiting to avoid API throttling
        if (i < referenceImages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
        }
    }

    // Save complete database
    const dbPath = path.join(OUTPUT_DIR, 'complete_database.json');
    await fs.promises.writeFile(
        dbPath,
        JSON.stringify({
            metadata: {
                version: '1.0',
                created_at: new Date().toISOString(),
                total_signs: Object.keys(signDatabase).length,
                successful: stats.success,
                failed: stats.failed
            },
            signs: signDatabase
        }, null, 2)
    );

    // Save index file for quick lookup
    const indexPath = path.join(OUTPUT_DIR, 'sign_index.json');
    await fs.promises.writeFile(
        indexPath,
        JSON.stringify({
            signs: Object.keys(signDatabase).filter(s => !signDatabase[s].error).sort(),
            failed: Object.keys(signDatabase).filter(s => signDatabase[s].error).sort()
        }, null, 2)
    );

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database Build Complete!');
    console.log('='.repeat(50));
    console.log(`   ✅ Successful: ${stats.success}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   📁 Output: ${OUTPUT_DIR}/`);
    console.log(`   📄 Database: ${dbPath}`);
}

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
    const dirs = [REFERENCE_DIR, OUTPUT_DIR];

    for (const dir of dirs) {
        try {
            await fs.promises.access(dir);
        } catch {
            await fs.promises.mkdir(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    }
}

/**
 * Create sample folder structure with instructions
 */
function createSampleStructure() {
    console.log('\n📁 Expected folder structure:');
    console.log('');
    console.log('   reference_signs/');
    console.log('   ├── greetings/');
    console.log('   │   ├── HELLO.jpg');
    console.log('   │   ├── GOODBYE.png');
    console.log('   │   └── THANK-YOU.jpg');
    console.log('   ├── alphabet/');
    console.log('   │   ├── A.jpg');
    console.log('   │   ├── B.jpg');
    console.log('   │   └── ...');
    console.log('   └── common/');
    console.log('       ├── YES.jpg');
    console.log('       ├── NO.jpg');
    console.log('       └── PLEASE.jpg');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Use clear, high-quality images');
    console.log('   - Show hands and face clearly');
    console.log('   - Name files after the sign gloss');
    console.log('   - Use hyphens for multi-word signs (e.g., THANK-YOU.jpg)');
}

/**
 * Build database for specific category/folder
 */
async function buildCategoryDatabase(categoryPath, language = "ASL") {
    const category = path.basename(categoryPath);
    console.log(`\n📂 Building database for category: ${category}\n`);

    const images = await glob(`${categoryPath}/*.{jpg,jpeg,png,gif,webp}`, { nocase: true });
    const categoryDb = {};

    for (const imagePath of images) {
        const signName = path.basename(imagePath, path.extname(imagePath)).toUpperCase();

        try {
            categoryDb[signName] = await analyzeSignFromReference(signName, imagePath, language);
            console.log(`✅ ${signName}`);
        } catch (error) {
            console.error(`❌ ${signName}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }

    // Save category database
    const outputPath = path.join(OUTPUT_DIR, `${category.toLowerCase()}_signs.json`);
    await fs.promises.writeFile(outputPath, JSON.stringify(categoryDb, null, 2));

    console.log(`\n✅ Saved: ${outputPath}`);
    return categoryDb;
}

/**
 * Validate existing database entries against new analysis
 */
async function validateDatabase(databasePath) {
    console.log('🔍 Validating database...\n');

    const database = JSON.parse(await fs.promises.readFile(databasePath, 'utf8'));
    const signs = database.signs || database;

    const validationResults = {};

    for (const [signName, signData] of Object.entries(signs)) {
        if (signData.source?.file) {
            const imagePath = signData.source.path || path.join(REFERENCE_DIR, signData.source.file);

            try {
                await fs.promises.access(imagePath);
                validationResults[signName] = { valid: true, has_source: true };
            } catch {
                validationResults[signName] = { valid: false, reason: 'Source image not found' };
            }
        } else {
            validationResults[signName] = { valid: true, has_source: false };
        }
    }

    console.log('Validation complete.');
    return validationResults;
}

// Export functions for use as module
export {
    buildDatabaseFromReferences,
    buildCategoryDatabase,
    validateDatabase,
    ensureDirectories
};

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
    buildDatabaseFromReferences().catch(console.error);
}
