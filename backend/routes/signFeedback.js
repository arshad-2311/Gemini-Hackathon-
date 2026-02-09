// backend/routes/signFeedback.js
// Express routes for sign language feedback with vision comparison

import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

/**
 * Extract JSON from Gemini response text
 */
function extractJSON(text) {
    let cleanedText = text;
    if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    return cleanedText.trim();
}

/**
 * Provide sign feedback by comparing user attempt to reference
 * @param {string} targetSign - The sign being practiced
 * @param {string} userVideoFrame - Base64 encoded user's video frame
 * @param {string} referenceImage - Base64 encoded reference image
 * @param {string} language - Sign language dialect
 * @returns {Object} Detailed feedback
 */
async function provideSignFeedback(targetSign, userVideoFrame, referenceImage, language = "ASL") {
    const prompt = `
You are an expert ${language} instructor. Compare the student's signing attempt to the reference.

TARGET SIGN: "${targetSign}"

I'm providing:
1. REFERENCE IMAGE: Correct ${language} sign for "${targetSign}"
2. STUDENT ATTEMPT: User's current hand position

COMPARISON TASK:
Analyze both images and identify specific differences in:
- Hand shape and finger positions
- Hand location relative to body
- Palm orientation  
- Facial expression
- Overall accuracy

Provide constructive, specific feedback that helps them improve.

OUTPUT (JSON only, no markdown):
{
  "sign": "${targetSign}",
  "language": "${language}",
  "overall_accuracy": 0-100,
  "breakdown": {
    "hand_shape_match": 0-100,
    "position_match": 0-100,
    "orientation_match": 0-100,
    "facial_expression_match": 0-100
  },
  "specific_issues": [
    "Your index finger should be extended, not bent",
    "Move your hand higher, to chest level",
    "Palm should face downward, not forward"
  ],
  "what_is_correct": [
    "Good hand height",
    "Correct finger spread"
  ],
  "corrective_actions": [
    {
      "priority": 1,
      "issue": "Finger position",
      "action": "Extend your index and middle fingers fully",
      "visual_cue": "Think of making a peace sign, but tighter together"
    },
    {
      "priority": 2,
      "issue": "Palm orientation",
      "action": "Rotate your wrist so palm faces down",
      "visual_cue": "Like you're placing your hand flat on a table"
    }
  ],
  "demonstration_tip": "Think of waving hello at chest level",
  "passed": true/false,
  "grade": "A/B/C/D/F",
  "encouragement": "You're very close! Just adjust the palm orientation.",
  "next_focus": "Work on palm orientation for this sign"
}

Be encouraging but precise. Deaf comprehension depends on accuracy.
`;

    // Prepare image parts
    const referenceImageData = referenceImage.includes(',')
        ? referenceImage.split(',')[1]
        : referenceImage;

    const userImageData = userVideoFrame.includes(',')
        ? userVideoFrame.split(',')[1]
        : userVideoFrame;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: referenceImageData
            }
        },
        {
            inlineData: {
                mimeType: "image/jpeg",
                data: userImageData
            }
        }
    ]);

    const feedback = JSON.parse(extractJSON(result.response.text()));

    // Add grade based on accuracy if not present
    if (!feedback.grade && feedback.overall_accuracy) {
        feedback.grade = getGrade(feedback.overall_accuracy);
    }

    return feedback;
}

/**
 * Get letter grade from score
 */
function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Load reference image for a sign
 */
async function loadReferenceImage(signName) {
    const possiblePaths = [
        `./reference_signs/${signName.toUpperCase()}.jpg`,
        `./reference_signs/${signName.toUpperCase()}.png`,
        `./validated_signs/${signName.toUpperCase()}.jpg`,
        `./dataset/signs/${signName.toUpperCase()}.jpg`
    ];

    for (const imagePath of possiblePaths) {
        try {
            const resolvedPath = path.resolve(imagePath);
            const imageData = await fs.promises.readFile(resolvedPath);
            return imageData.toString('base64');
        } catch {
            continue;
        }
    }

    return null;
}

// ============================================
// REST API ROUTES
// ============================================

/**
 * POST /api/feedback/compare
 * Compare user's sign attempt to reference
 */
router.post('/compare', async (req, res) => {
    const { targetSign, userFrame, referenceImage, language = 'ASL' } = req.body;

    if (!targetSign) {
        return res.status(400).json({ error: 'targetSign is required' });
    }

    if (!userFrame) {
        return res.status(400).json({ error: 'userFrame is required (base64 image)' });
    }

    try {
        // Load reference image if not provided
        let reference = referenceImage;
        if (!reference) {
            reference = await loadReferenceImage(targetSign);
            if (!reference) {
                return res.status(404).json({
                    error: `No reference image found for sign: ${targetSign}`,
                    suggestion: 'Provide referenceImage in request body'
                });
            }
        }

        const feedback = await provideSignFeedback(targetSign, userFrame, reference, language);

        res.json({
            success: true,
            feedback,
            passed: feedback.passed,
            accuracy: feedback.overall_accuracy,
            grade: feedback.grade
        });
    } catch (error) {
        console.error('Sign feedback error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/feedback/quick-check
 * Quick accuracy check without detailed feedback
 */
router.post('/quick-check', async (req, res) => {
    const { targetSign, userFrame, referenceImage, language = 'ASL' } = req.body;

    if (!targetSign || !userFrame) {
        return res.status(400).json({ error: 'targetSign and userFrame are required' });
    }

    try {
        let reference = referenceImage || await loadReferenceImage(targetSign);

        if (!reference) {
            return res.status(404).json({ error: `No reference for: ${targetSign}` });
        }

        const prompt = `
Quickly compare these two images of the "${targetSign}" sign.
First image: Reference (correct)
Second image: Student attempt

OUTPUT (JSON only):
{
  "accuracy": 0-100,
  "passed": true/false,
  "quick_tip": "One sentence improvement tip if needed"
}
`;

        const referenceData = reference.includes(',') ? reference.split(',')[1] : reference;
        const userData = userFrame.includes(',') ? userFrame.split(',')[1] : userFrame;

        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: "image/jpeg", data: referenceData } },
            { inlineData: { mimeType: "image/jpeg", data: userData } }
        ]);

        const check = JSON.parse(extractJSON(result.response.text()));

        res.json({
            success: true,
            ...check
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/feedback/practice-session
 * Analyze multiple attempts in a practice session
 */
router.post('/practice-session', async (req, res) => {
    const { targetSign, attempts, referenceImage, language = 'ASL' } = req.body;

    if (!targetSign || !attempts || !Array.isArray(attempts)) {
        return res.status(400).json({
            error: 'targetSign and attempts array are required'
        });
    }

    try {
        let reference = referenceImage || await loadReferenceImage(targetSign);

        if (!reference) {
            return res.status(404).json({ error: `No reference for: ${targetSign}` });
        }

        const results = [];

        for (let i = 0; i < attempts.length; i++) {
            try {
                const feedback = await provideSignFeedback(
                    targetSign,
                    attempts[i],
                    reference,
                    language
                );
                results.push({
                    attempt: i + 1,
                    success: true,
                    feedback
                });
            } catch (err) {
                results.push({
                    attempt: i + 1,
                    success: false,
                    error: err.message
                });
            }

            // Rate limiting
            if (i < attempts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Calculate progress
        const accuracies = results
            .filter(r => r.success)
            .map(r => r.feedback.overall_accuracy);

        const averageAccuracy = accuracies.length > 0
            ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
            : 0;

        const improvement = accuracies.length >= 2
            ? accuracies[accuracies.length - 1] - accuracies[0]
            : 0;

        res.json({
            success: true,
            sign: targetSign,
            total_attempts: attempts.length,
            successful_analyses: results.filter(r => r.success).length,
            average_accuracy: averageAccuracy,
            improvement: improvement,
            trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
            results,
            summary: generatePracticeSummary(results, targetSign)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate summary for practice session
 */
function generatePracticeSummary(results, signName) {
    const successful = results.filter(r => r.success);

    if (successful.length === 0) {
        return `Unable to analyze attempts for ${signName}`;
    }

    const lastFeedback = successful[successful.length - 1].feedback;
    const passed = successful.filter(r => r.feedback.passed).length;

    if (passed === successful.length) {
        return `Excellent! You've mastered the ${signName} sign with consistent accuracy.`;
    }

    if (passed > successful.length / 2) {
        return `Good progress on ${signName}! Focus on: ${lastFeedback.next_focus || 'consistency'}`;
    }

    const commonIssues = successful
        .flatMap(r => r.feedback.specific_issues || [])
        .reduce((acc, issue) => {
            acc[issue] = (acc[issue] || 0) + 1;
            return acc;
        }, {});

    const topIssue = Object.entries(commonIssues)
        .sort((a, b) => b[1] - a[1])[0];

    return `Keep practicing ${signName}. Main area to work on: ${topIssue ? topIssue[0] : 'overall form'}`;
}

/**
 * GET /api/feedback/reference/:sign
 * Check if reference exists for a sign
 */
router.get('/reference/:sign', async (req, res) => {
    const { sign } = req.params;

    const reference = await loadReferenceImage(sign);

    if (reference) {
        res.json({
            success: true,
            sign: sign.toUpperCase(),
            has_reference: true,
            reference_preview: `data:image/jpeg;base64,${reference.substring(0, 100)}...`
        });
    } else {
        res.json({
            success: true,
            sign: sign.toUpperCase(),
            has_reference: false
        });
    }
});

export { provideSignFeedback, loadReferenceImage };
export default router;
