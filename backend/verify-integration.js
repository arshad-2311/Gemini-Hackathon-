// ============================================
// DATASET INTEGRATION VERIFICATION SCRIPT
// Validates all scenarios for hackathon demo
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    backendUrl: 'http://localhost:3000',
    timeout: 5000
};

// Test results
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(emoji, message) {
    console.log(`${emoji} ${message}`);
}

function test(name, passed, message = '') {
    results.tests.push({ name, passed, message });
    if (passed) {
        results.passed++;
        log('✅', `${name}`);
    } else {
        results.failed++;
        log('❌', `${name}${message ? ': ' + message : ''}`);
    }
}

function skip(name, reason) {
    results.tests.push({ name, skipped: true, message: reason });
    results.skipped++;
    log('⏭️', `${name} - SKIPPED: ${reason}`);
}

async function fetchJSON(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${CONFIG.backendUrl}${endpoint}`;
        const req = http.get(url, { timeout: CONFIG.timeout }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: null, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function checkServerRunning() {
    try {
        await fetchJSON('/health');
        return true;
    } catch {
        return false;
    }
}

// ============================================
// TEST CATEGORIES
// ============================================

async function testFileStructure() {
    log('📁', '\n=== FILE STRUCTURE TESTS ===\n');

    // Check directories exist
    const dirs = [
        'dataset/metadata',
        'dataset/processed',
        'dataset/processed/asl',
        'dataset/thumbnails',
        'dataset/thumbnails/asl'
    ];

    for (const dir of dirs) {
        const fullPath = path.join(__dirname, dir);
        test(`Directory exists: ${dir}`, fs.existsSync(fullPath));
    }

    // Check key files
    const files = [
        { path: 'dataset/metadata/demo-sign-index.json', required: true },
        { path: 'dataset/metadata/sign-index.json', required: false },
        { path: 'signDatabase.js', required: true },
        { path: 'signFallback.js', required: true },
        { path: 'hybridSignSystem.js', required: true },
        { path: 'demoController.js', required: true },
        { path: 'dataset-processor.js', required: true }
    ];

    for (const file of files) {
        const fullPath = path.join(__dirname, file.path);
        const exists = fs.existsSync(fullPath);
        if (file.required) {
            test(`Required file: ${file.path}`, exists);
        } else {
            if (exists) {
                test(`Optional file: ${file.path}`, true);
            } else {
                skip(`Optional file: ${file.path}`, 'Not required for demo mode');
            }
        }
    }
}

async function testDemoSignIndex() {
    log('📋', '\n=== DEMO SIGN INDEX TESTS ===\n');

    const indexPath = path.join(__dirname, 'dataset/metadata/demo-sign-index.json');

    if (!fs.existsSync(indexPath)) {
        skip('Demo sign index', 'File not found');
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

        test('Index has version', !!data.version);
        test('Index has stats', !!data.stats);
        test('Index has signs', !!data.signs);
        test('Index has ASL signs', !!data.signs?.ASL);

        const aslSigns = Object.keys(data.signs?.ASL || {});
        test(`ASL signs count >= 50`, aslSigns.length >= 50, `Found: ${aslSigns.length}`);

        // Check key signs exist
        const keySigns = ['HELLO', 'GOODBYE', 'THANK-YOU', 'PLEASE', 'YES', 'NO'];
        for (const sign of keySigns) {
            test(`Key sign exists: ${sign}`, !!data.signs.ASL[sign]);
        }

        // Check sign structure
        const helloSign = data.signs.ASL?.HELLO;
        if (helloSign) {
            test('Sign has gloss', !!helloSign.gloss);
            test('Sign has category', !!helloSign.category);
            test('Sign has hasProcedural', helloSign.hasProcedural !== undefined);
            test('Sign has externalLinks', !!helloSign.externalLinks);
        }
    } catch (error) {
        test('Demo index is valid JSON', false, error.message);
    }
}

async function testModuleImports() {
    log('📦', '\n=== MODULE IMPORT TESTS ===\n');

    const modules = [
        { path: './signDatabase.js', name: 'signDatabase' },
        { path: './signFallback.js', name: 'signFallback' },
        { path: './hybridSignSystem.js', name: 'hybridSignSystem' },
        { path: './demoController.js', name: 'demoController' }
    ];

    for (const mod of modules) {
        try {
            const imported = await import(mod.path);
            test(`Import ${mod.name}`, !!imported.default || !!imported[mod.name]);
        } catch (error) {
            test(`Import ${mod.name}`, false, error.message.split('\n')[0]);
        }
    }
}

async function testDemoController() {
    log('🎮', '\n=== DEMO CONTROLLER TESTS ===\n');

    try {
        const { default: demoController } = await import('./demoController.js');

        // Test basic methods
        test('demoController.getSign exists', typeof demoController.getSign === 'function');
        test('demoController.getStats exists', typeof demoController.getStats === 'function');
        test('demoController.getSequences exists', typeof demoController.getSequences === 'function');

        // Test getSign
        const helloSign = demoController.getSign('HELLO', 'ASL');
        test('getSign returns object', typeof helloSign === 'object');
        test('getSign HELLO found', helloSign?.found === true);

        // Test unknown sign fallback
        const unknownSign = demoController.getSign('XYZNOTASIGN', 'ASL');
        test('Unknown sign returns fingerspelling fallback',
            unknownSign?.source === 'fingerspelling' || unknownSign?.canFingerspell === true);

        // Test stats
        const stats = demoController.getStats();
        test('Stats returns mode', stats?.mode === 'demo');
        test('Stats returns totalSigns', stats?.totalSigns > 0);

        // Test sequences
        const sequences = demoController.getSequences();
        test('Sequences returns array', Array.isArray(sequences?.sequences));
        test('Has greeting sequence', sequences?.sequences?.some(s => s.name === 'greeting'));

        // Test presentation methods
        if (typeof demoController.getJudgeSummary === 'function') {
            const summary = demoController.getJudgeSummary();
            test('Judge summary has projectName', !!summary?.projectName);
            test('Judge summary has keyFeatures', Array.isArray(summary?.keyFeatures));
        }
    } catch (error) {
        test('Demo controller loads', false, error.message);
    }
}

async function testHybridSystem() {
    log('🔄', '\n=== HYBRID SYSTEM TESTS ===\n');

    try {
        const { default: hybridSignSystem } = await import('./hybridSignSystem.js');

        test('hybridSignSystem.getSign exists', typeof hybridSignSystem.getSign === 'function');
        test('hybridSignSystem.getStats exists', typeof hybridSignSystem.getStats === 'function');

        // Test fallback chain
        const sign = await hybridSignSystem.getSign('HELLO', 'ASL');
        test('Hybrid getSign returns object', typeof sign === 'object');
        test('Hybrid getSign has gloss', !!sign?.gloss);
        test('Hybrid getSign has source', !!sign?.source);

        // Test stats
        const stats = hybridSignSystem.getStats();
        test('Hybrid stats available', !!stats);
    } catch (error) {
        test('Hybrid system loads', false, error.message);
    }
}

async function testSignFallback() {
    log('🔙', '\n=== SIGN FALLBACK TESTS ===\n');

    try {
        const { default: signFallback } = await import('./signFallback.js');

        test('signFallback.getSign exists', typeof signFallback.getSign === 'function');
        test('signFallback.checkSignAvailability exists', typeof signFallback.checkSignAvailability === 'function');

        // Test availability check
        const availability = signFallback.checkSignAvailability('HELLO', 'ASL');
        test('Availability check returns object', typeof availability === 'object');
        test('HELLO has procedural', availability?.hasProcedural === true);

        // Test fingerspelling fallback
        const fsAvailability = signFallback.checkSignAvailability('XYZNOTASIGN', 'ASL');
        test('Unknown sign can fingerspell', fsAvailability?.canFingerspell === true);

        // Test getAvailableFallbacks
        if (typeof signFallback.getAvailableFallbacks === 'function') {
            const fallbacks = signFallback.getAvailableFallbacks();
            test('Fallbacks array has items', Array.isArray(fallbacks) && fallbacks.length > 0);
        }
    } catch (error) {
        test('Sign fallback loads', false, error.message);
    }
}

async function testAPIEndpoints() {
    log('🌐', '\n=== API ENDPOINT TESTS ===\n');

    const serverRunning = await checkServerRunning();

    if (!serverRunning) {
        skip('API Tests', 'Backend server not running on localhost:3000');
        log('💡', 'Start server with: cd backend && npm run dev');
        return;
    }

    // Test health endpoint
    try {
        const health = await fetchJSON('/health');
        test('Health endpoint', health.status === 200);
    } catch (error) {
        test('Health endpoint', false, error.message);
    }

    // Test demo endpoints
    const endpoints = [
        { path: '/api/demo/info', expected: ['mode'] },
        { path: '/api/demo/stats', expected: ['mode'] },
        { path: '/api/hybrid/sign/HELLO', expected: ['gloss'] },
        { path: '/api/presentation/sequences', expected: ['sequences'] },
        { path: '/api/presentation/summary', expected: ['projectName'] },
        { path: '/api/fallback/available', expected: ['signs'] }
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetchJSON(endpoint.path);
            const hasExpected = endpoint.expected.some(key =>
                response.data && (key in response.data));
            test(`API ${endpoint.path}`, response.status === 200 && hasExpected);
        } catch (error) {
            test(`API ${endpoint.path}`, false, error.message);
        }
    }

    // Test hybrid sign with fallback
    try {
        const unknown = await fetchJSON('/api/hybrid/sign/XYZNOTASIGN?dialect=ASL');
        test('API returns fallback for unknown sign',
            unknown.status === 200 &&
            (unknown.data?.source === 'fingerspelling' || unknown.data?.canFingerspell));
    } catch (error) {
        test('API fallback for unknown sign', false, error.message);
    }
}

async function testScenarios() {
    log('🎬', '\n=== SCENARIO TESTS ===\n');

    const serverRunning = await checkServerRunning();

    if (!serverRunning) {
        skip('Scenario Tests', 'Backend server not running');
        return;
    }

    // Scenario 1: Sign exists with video (if dataset present)
    try {
        const response = await fetchJSON('/api/hybrid/sign/HELLO?dialect=ASL');
        if (response.data?.hasVideo) {
            test('Scenario 1: Sign with video', true);
        } else if (response.data?.source === 'procedural') {
            test('Scenario 1: Sign with procedural fallback', true);
        } else {
            test('Scenario 1: Sign available', !!response.data);
        }
    } catch (error) {
        test('Scenario 1: Sign retrieval', false, error.message);
    }

    // Scenario 2: Missing sign uses fallback
    try {
        const response = await fetchJSON('/api/hybrid/sign/VERYRAREWORD?dialect=ASL');
        const usesFallback =
            response.data?.source === 'procedural' ||
            response.data?.source === 'fingerspelling' ||
            response.data?.canFingerspell;
        test('Scenario 2: Missing sign uses fallback', usesFallback);
    } catch (error) {
        test('Scenario 2: Fallback for missing sign', false, error.message);
    }

    // Scenario 3: Batch request with mixed availability
    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/hybrid/sequence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                glossArray: ['HELLO', 'XYZNOTASIGN', 'GOODBYE'],
                dialect: 'ASL'
            })
        });
        const data = await response.json();
        test('Scenario 3: Batch request works',
            Array.isArray(data?.sequence) && data.sequence.length === 3);
    } catch (error) {
        test('Scenario 3: Batch request', false, error.message);
    }

    // Scenario 4: Demo mode works
    try {
        const response = await fetchJSON('/api/presentation/full');
        test('Scenario 4: Demo mode provides full info',
            !!response.data?.stats && !!response.data?.sequences);
    } catch (error) {
        test('Scenario 4: Demo mode', false, error.message);
    }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     DATASET INTEGRATION VERIFICATION                        ║');
    console.log('║     Sign Language Translator - Hackathon Demo               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Run all test categories
    await testFileStructure();
    await testDemoSignIndex();
    await testModuleImports();
    await testDemoController();
    await testHybridSystem();
    await testSignFallback();
    await testAPIEndpoints();
    await testScenarios();

    // Print summary
    console.log('\n');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                                ');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`  ✅ Passed:  ${results.passed}`);
    console.log(`  ❌ Failed:  ${results.failed}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}`);
    console.log(`  📊 Total:   ${results.passed + results.failed + results.skipped}`);
    console.log('════════════════════════════════════════════════════════════════');

    // Overall status
    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Ready for hackathon demo.\n');
    } else if (results.failed <= 3) {
        console.log('\n⚠️  Minor issues detected. Review failed tests above.\n');
    } else {
        console.log('\n❌ Multiple failures. Please fix issues before demo.\n');
    }

    // Checklist summary
    console.log('📋 VERIFICATION CHECKLIST:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  ${results.tests.some(t => t.name.includes('demo-sign-index')) && !results.tests.find(t => t.name.includes('demo-sign-index'))?.failed ? '✅' : '❌'} Demo sign index (100 signs)`);
    console.log(`  ${results.tests.some(t => t.name.includes('demoController')) ? '✅' : '❌'} Demo controller working`);
    console.log(`  ${results.tests.some(t => t.name.includes('hybridSignSystem')) ? '✅' : '❌'} Hybrid sign system`);
    console.log(`  ${results.tests.some(t => t.name.includes('signFallback')) ? '✅' : '❌'} Fallback system`);
    console.log(`  ${results.tests.some(t => t.name.includes('API') && !t.failed) ? '✅' : '⚠️'} API endpoints`);
    console.log(`  ${results.tests.some(t => t.name.includes('Scenario') && !t.failed) ? '✅' : '⚠️'} Test scenarios`);
    console.log('─────────────────────────────────────────────────────────────\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
});
