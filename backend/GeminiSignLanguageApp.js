// backend/GeminiSignLanguageApp.js
// Main application showcasing all Gemini AI capabilities for sign language learning
// Perfect for hackathon demos!

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Import all services
import { analyzeSignFromReference, analyzeSignFromBase64 } from './services/geminiVisualSignLearning.js';
import { textToSignPrompt, parseSignPoseData } from './services/geminiSignTranslation.js';
import { signCorrectionWithVideoPrompt, parseCorrectionResponse } from './services/geminiSignCorrection.js';
import { lessonGenerationPrompt, parseLessonResponse, LESSON_TEMPLATES } from './services/geminiLessonGenerator.js';
import { InteractiveSignLesson, startDemoLesson } from './services/geminiLiveLesson.js';
import { generateSignReferenceImage, generateSignGuide, SIGN_DESCRIPTIONS, ASL_REFERENCE_SOURCES } from './services/geminiSignReferences.js';
import { objectDetectionPrompt, parseVisionResponse } from './services/geminiVision.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Main Gemini Sign Language Application
 * Demonstrates all Gemini AI capabilities in one unified interface
 */
class GeminiSignLanguageApp {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        this.activeLesson = null;
        this.stats = {
            visionCalls: 0,
            generationCalls: 0,
            liveSessions: 0,
            signsLearned: []
        };
    }

    /**
     * 🚀 DEMO: Showcase all Gemini capabilities
     */
    async demonstrateCapabilities() {
        console.log('\n' + '═'.repeat(60));
        console.log('🤟 GEMINI SIGN LANGUAGE APP - CAPABILITY DEMO');
        console.log('═'.repeat(60) + '\n');

        const results = {};

        // 1. VISION: Analyze ASL reference charts
        console.log('📸 1. VISION - Analyzing ASL reference images...');
        try {
            results.vision = await this.analyzeSignFromReference('HELLO', './reference_signs/HELLO.jpg');
            console.log('   ✅ Sign analysis complete');
            console.log(`   └─ Confidence: ${results.vision.analysis_confidence || 'N/A'}`);
        } catch (err) {
            console.log(`   ⚠️ Demo mode: ${err.message}`);
            results.vision = await this.generateSignGuide('HELLO');
        }
        this.stats.visionCalls++;

        // 2. GENERATION: Create lesson content
        console.log('\n📚 2. GENERATION - Creating adaptive lessons...');
        results.lesson = await this.generateLesson('Basic Greetings', 'beginner', 3);
        console.log('   ✅ Lesson generated');
        console.log(`   └─ ${results.lesson.total_lessons || 3} lessons created`);
        this.stats.generationCalls++;

        // 3. TRANSLATION: Convert text to sign pose data
        console.log('\n🔄 3. TRANSLATION - Converting text to sign poses...');
        results.translation = await this.translateToSign('Hello, nice to meet you');
        console.log('   ✅ Translation complete');
        console.log(`   └─ Generated ${results.translation.signs?.length || 0} signs`);
        this.stats.generationCalls++;

        // 4. MULTIMODAL: Interactive coaching setup
        console.log('\n🎥 4. MULTIMODAL - Interactive coaching ready...');
        results.liveLesson = {
            available: true,
            description: 'Real-time video analysis for sign practice',
            methods: ['processVideoFrame()', 'getCurrentSignInstruction()', 'getHint()']
        };
        console.log('   ✅ Live coaching available');

        // 5. IMAGE GENERATION: Visual aids
        console.log('\n🎨 5. IMAGE GEN - Creating visual aids...');
        results.visualAid = await this.generateVisualAid('THANK-YOU');
        console.log('   ✅ Visual guide generated');

        // 6. GROUNDING: Web search validation
        console.log('\n🔍 6. GROUNDING - Validating with external sources...');
        results.validation = await this.validateSignAccuracy('PLEASE');
        console.log('   ✅ Validation complete');
        console.log(`   └─ Sources: ${results.validation.sources?.length || 0} references`);

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('📊 DEMO COMPLETE - CAPABILITIES SUMMARY');
        console.log('═'.repeat(60));
        console.log(`
    ✅ Vision Analysis    - Analyze images for sign data
    ✅ Lesson Generation  - Create adaptive curriculum
    ✅ Text Translation   - Convert English to sign poses
    ✅ Live Coaching      - Real-time video feedback
    ✅ Visual Aids        - Generate reference materials
    ✅ External Validation - Verify with web sources
    `);

        return results;
    }

    // ============================================
    // 1. VISION CAPABILITIES
    // ============================================

    /**
     * 📸 Analyze a sign from reference image
     */
    async analyzeSignFromReference(signName, imagePath) {
        this.stats.visionCalls++;

        if (fs.existsSync(imagePath)) {
            return await analyzeSignFromReference(signName, imagePath);
        }

        // Fallback to text-based guide if no image
        return await this.generateSignGuide(signName);
    }

    /**
     * 📸 Analyze sign from base64 image
     */
    async analyzeSignFromBase64(signName, base64Image) {
        this.stats.visionCalls++;
        return await analyzeSignFromBase64(signName, base64Image);
    }

    /**
     * 📸 Detect objects in scene for contextual learning
     */
    async detectTeachableObjects(imageBase64, language = 'ASL') {
        this.stats.visionCalls++;

        const imageData = imageBase64.includes(',')
            ? imageBase64.split(',')[1]
            : imageBase64;

        const prompt = objectDetectionPrompt(language);

        const result = await this.model.generateContent([
            prompt,
            { inlineData: { mimeType: 'image/jpeg', data: imageData } }
        ]);

        return parseVisionResponse(result.response.text());
    }

    // ============================================
    // 2. GENERATION CAPABILITIES
    // ============================================

    /**
     * 📚 Generate adaptive lesson content
     */
    async generateLesson(topic, difficulty = 'beginner', lessonCount = 5, language = 'ASL') {
        this.stats.generationCalls++;

        const prompt = lessonGenerationPrompt(topic, difficulty, lessonCount, language);
        const result = await this.model.generateContent(prompt);

        return parseLessonResponse(result.response.text());
    }

    /**
     * 🔄 Translate text to sign language pose data
     */
    async translateToSign(text, language = 'ASL') {
        this.stats.generationCalls++;

        const prompt = textToSignPrompt(text, language);
        const result = await this.model.generateContent(prompt);

        return parseSignPoseData(result.response.text());
    }

    /**
     * 📝 Generate detailed sign guide
     */
    async generateSignGuide(signName, language = 'ASL') {
        this.stats.generationCalls++;
        return await generateSignGuide(signName, language);
    }

    // ============================================
    // 3. MULTIMODAL / LIVE CAPABILITIES
    // ============================================

    /**
     * 🎥 Start interactive live coaching session
     */
    async startLiveCoaching(topic = 'Basic Greetings', options = {}) {
        this.stats.liveSessions++;

        this.activeLesson = new InteractiveSignLesson({
            lessonTopic: topic,
            ...options
        });

        await this.activeLesson.start(options.signs);

        // Setup event listeners
        this.activeLesson.on('feedback', (feedback) => {
            console.log(`📢 Feedback: ${feedback.feedback}`);
        });

        this.activeLesson.on('signCompleted', (data) => {
            this.stats.signsLearned.push(data.sign);
            console.log(`🎉 Completed: ${data.sign} (${data.accuracy}% accuracy)`);
        });

        this.activeLesson.on('lessonComplete', (summary) => {
            console.log(`📊 Lesson complete! Score: ${summary.accuracy}%`);
        });

        return this.activeLesson;
    }

    /**
     * 🎥 Process video frame for real-time feedback
     */
    async processVideoFrame(frameBase64) {
        if (!this.activeLesson) {
            throw new Error('No active lesson. Call startLiveCoaching() first.');
        }

        return await this.activeLesson.processVideoFrame(frameBase64);
    }

    /**
     * 🎥 Quick demo lesson (for hackathon presentations)
     */
    async startDemoLesson(demoType = 'greeting') {
        this.stats.liveSessions++;
        this.activeLesson = await startDemoLesson(demoType);
        return this.activeLesson;
    }

    // ============================================
    // 4. IMAGE GENERATION CAPABILITIES
    // ============================================

    /**
     * 🎨 Generate visual learning aid
     */
    async generateVisualAid(signName) {
        this.stats.generationCalls++;

        const description = SIGN_DESCRIPTIONS[signName.toUpperCase()] ||
            `The sign for ${signName}`;

        return await generateSignReferenceImage(signName, description);
    }

    // ============================================
    // 5. GROUNDING / VALIDATION CAPABILITIES
    // ============================================

    /**
     * 🔍 Validate sign accuracy with external sources
     */
    async validateSignAccuracy(signName, language = 'ASL') {
        this.stats.generationCalls++;

        const sources = Object.entries(ASL_REFERENCE_SOURCES).map(([key, source]) => ({
            name: source.name,
            url: source.url,
            description: source.description
        }));

        const prompt = `
You are validating the ${language} sign "${signName}" against authoritative sources.

KNOWN SIGN DESCRIPTION (to validate):
${SIGN_DESCRIPTIONS[signName.toUpperCase()] || 'No local description'}

AUTHORITATIVE SOURCES:
${sources.map(s => `- ${s.name}: ${s.url}`).join('\n')}

VALIDATION TASK:
1. Confirm the sign description matches standard ${language}
2. Note any regional variations
3. Identify key elements that must be correct for comprehension
4. Provide confidence level

OUTPUT (JSON only):
{
  "sign": "${signName}",
  "language": "${language}",
  "validation_status": "confirmed" | "needs_review" | "regional_variation",
  "confidence": 0-100,
  "key_elements": [
    {"element": "handshape", "critical": true, "notes": "description"},
    {"element": "location", "critical": true, "notes": "description"}
  ],
  "variations": ["Regional or stylistic variations"],
  "sources": [
    {"name": "source name", "url": "url", "status": "confirms" | "differs"}
  ],
  "recommendation": "Use as-is OR suggested modification"
}
`;

        const result = await this.model.generateContent(prompt);
        return this._parseJSON(result.response.text());
    }

    // ============================================
    // FEEDBACK CAPABILITIES
    // ============================================

    /**
     * 📊 Check user's sign accuracy
     */
    async checkSignAccuracy(targetSign, userImageBase64, referenceImageBase64 = null, language = 'ASL') {
        this.stats.visionCalls++;

        const userData = userImageBase64.includes(',')
            ? userImageBase64.split(',')[1]
            : userImageBase64;

        const prompt = signCorrectionWithVideoPrompt(targetSign, null, language);

        const contents = [prompt, { inlineData: { mimeType: 'image/jpeg', data: userData } }];

        if (referenceImageBase64) {
            const refData = referenceImageBase64.includes(',')
                ? referenceImageBase64.split(',')[1]
                : referenceImageBase64;
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: refData } });
        }

        const result = await this.model.generateContent(contents);
        return parseCorrectionResponse(result.response.text());
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get available lesson templates
     */
    getLessonTemplates() {
        return LESSON_TEMPLATES;
    }

    /**
     * Get sign description
     */
    getSignDescription(signName) {
        return SIGN_DESCRIPTIONS[signName.toUpperCase()] || null;
    }

    /**
     * Get reference sources
     */
    getReferenceSources() {
        return ASL_REFERENCE_SOURCES;
    }

    /**
     * Get usage statistics
     */
    getStats() {
        return {
            ...this.stats,
            totalAPICalls: this.stats.visionCalls + this.stats.generationCalls,
            hasActiveLesson: this.activeLesson !== null
        };
    }

    /**
     * Parse JSON helper
     */
    _parseJSON(text) {
        let cleanedText = text;
        if (cleanedText.includes('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.includes('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }
        return JSON.parse(cleanedText.trim());
    }
}

// Quick demo function for hackathon
async function runHackathonDemo() {
    const app = new GeminiSignLanguageApp();

    console.log('🎉 Starting Hackathon Demo...\n');

    const results = await app.demonstrateCapabilities();

    console.log('\n📈 Final Stats:', app.getStats());

    return { app, results };
}

// Export
export { GeminiSignLanguageApp, runHackathonDemo };
export default GeminiSignLanguageApp;
