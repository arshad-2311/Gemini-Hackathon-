/**
 * Sign Accuracy Validator
 * Validates generated poses against verified sign database
 * Based on research showing 95-98% accuracy with combined techniques
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load verified signs database
let verifiedSigns = {};
let glossMappings = {};

try {
    const signsPath = path.join(__dirname, '../data/verified-signs.json');
    const mappingsPath = path.join(__dirname, '../data/gloss-mappings.json');

    if (fs.existsSync(signsPath)) {
        verifiedSigns = JSON.parse(fs.readFileSync(signsPath, 'utf8'));
    }
    if (fs.existsSync(mappingsPath)) {
        glossMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    }
} catch (error) {
    console.warn('Could not load verified signs database:', error.message);
}

/**
 * Get verified sign data if available
 * @param {string} gloss - ASL gloss (e.g., "HELLO")
 * @returns {object|null} Verified sign data or null
 */
export function getVerifiedSign(gloss) {
    const normalizedGloss = gloss.toUpperCase().trim();
    return verifiedSigns.signs?.[normalizedGloss] || null;
}

/**
 * Convert English text to ASL gloss sequence
 * @param {string} text - English text
 * @returns {string[]} Array of ASL glosses
 */
export function textToGloss(text) {
    const normalized = text.toLowerCase().trim();

    // Check for exact phrase match first
    if (glossMappings.mappings?.[normalized]) {
        return glossMappings.mappings[normalized];
    }

    // Check for word order transforms
    for (const transform of glossMappings.word_order_transforms || []) {
        const regex = new RegExp(transform.pattern, 'i');
        const match = normalized.match(regex);
        if (match) {
            return transform.asl_order.map(g =>
                g.startsWith('$') ? match[parseInt(g.slice(1))].toUpperCase() : g
            );
        }
    }

    // Fallback: word-by-word lookup
    const words = normalized.split(/\s+/);
    const glosses = [];

    for (const word of words) {
        if (glossMappings.mappings?.[word]) {
            glosses.push(...glossMappings.mappings[word]);
        } else {
            // Unknown word - use fingerspelling marker
            glosses.push(`#${word.toUpperCase()}`);
        }
    }

    return glosses;
}

/**
 * Get all available signs from verified database
 * @returns {string[]} Array of available glosses
 */
export function getAvailableSigns() {
    return Object.keys(verifiedSigns.signs || {});
}

/**
 * Check if a sign is in the verified database
 * @param {string} gloss - ASL gloss
 * @returns {boolean}
 */
export function isVerifiedSign(gloss) {
    return !!getVerifiedSign(gloss);
}

/**
 * Calculate pose similarity using cosine distance
 * @param {number[]} pose1 - First pose vector
 * @param {number[]} pose2 - Second pose vector
 * @returns {number} Similarity score (0-1)
 */
export function calculatePoseSimilarity(pose1, pose2) {
    if (!pose1 || !pose2 || pose1.length !== pose2.length) {
        return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < pose1.length; i++) {
        dotProduct += pose1[i] * pose2[i];
        norm1 += pose1[i] * pose1[i];
        norm2 += pose2[i] * pose2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Flatten keyframe data to vector for comparison
 * @param {object} keyframe - Keyframe data
 * @returns {number[]} Flattened vector
 */
function flattenKeyframe(keyframe) {
    const values = [];

    if (keyframe.right_hand?.position) {
        values.push(...keyframe.right_hand.position);
    }
    if (keyframe.left_hand?.position) {
        values.push(...keyframe.left_hand.position);
    }
    if (keyframe.right_hand?.landmarks) {
        for (const lm of keyframe.right_hand.landmarks) {
            values.push(...lm);
        }
    }

    return values;
}

/**
 * Validate generated sign against verified database
 * @param {string} gloss - ASL gloss
 * @param {object} generatedSign - Generated sign data
 * @returns {object} Validation result with score and feedback
 */
export function validateSign(gloss, generatedSign) {
    const verified = getVerifiedSign(gloss);

    if (!verified) {
        return {
            valid: false,
            score: 0,
            reason: 'no_reference',
            message: `No verified reference for sign: ${gloss}`
        };
    }

    // Compare keyframes
    const verifiedKeyframes = verified.keyframes || [];
    const generatedKeyframes = generatedSign.keyframes || [];

    if (generatedKeyframes.length === 0) {
        return {
            valid: false,
            score: 0,
            reason: 'no_keyframes',
            message: 'Generated sign has no keyframes'
        };
    }

    // Compare first and last keyframes (most important)
    let totalScore = 0;
    let comparisons = 0;

    if (verifiedKeyframes.length > 0 && generatedKeyframes.length > 0) {
        const vFirst = flattenKeyframe(verifiedKeyframes[0]);
        const gFirst = flattenKeyframe(generatedKeyframes[0]);
        if (vFirst.length > 0 && gFirst.length > 0) {
            totalScore += calculatePoseSimilarity(vFirst, gFirst);
            comparisons++;
        }

        const vLast = flattenKeyframe(verifiedKeyframes[verifiedKeyframes.length - 1]);
        const gLast = flattenKeyframe(generatedKeyframes[generatedKeyframes.length - 1]);
        if (vLast.length > 0 && gLast.length > 0) {
            totalScore += calculatePoseSimilarity(vLast, gLast);
            comparisons++;
        }
    }

    // Check handshape if available
    let handshapeMatch = false;
    if (verified.keyframes?.[0]?.right_hand?.handshape) {
        const expectedHandshape = verified.keyframes[0].right_hand.handshape;
        const generatedHandshape = generatedSign.keyframes?.[0]?.right_hand?.handshape;
        handshapeMatch = expectedHandshape === generatedHandshape;
        if (handshapeMatch) {
            totalScore += 0.3;
            comparisons += 0.3;
        }
    }

    const avgScore = comparisons > 0 ? totalScore / comparisons : 0;
    const threshold = 0.7;

    return {
        valid: avgScore >= threshold,
        score: Math.round(avgScore * 100),
        handshapeMatch,
        reason: avgScore >= threshold ? 'passed' : 'low_score',
        message: avgScore >= threshold
            ? `Sign validated with ${Math.round(avgScore * 100)}% confidence`
            : `Sign accuracy below threshold (${Math.round(avgScore * 100)}% < ${threshold * 100}%)`,
        suggestions: avgScore < threshold ? [
            `Expected handshape: ${verified.keyframes?.[0]?.right_hand?.handshape}`,
            `Reference duration: ${verified.duration_ms}ms`,
            verified.notes
        ].filter(Boolean) : []
    };
}

/**
 * Get pose keyframes for a phrase using verified database
 * Falls back to null for unknown signs (AI should handle)
 * @param {string} text - English text
 * @returns {object} Result with verified signs and unknowns
 */
export function getVerifiedPoseKeyframes(text) {
    const glosses = textToGloss(text);
    const result = {
        original: text,
        glosses: glosses,
        signs: [],
        unknownGlosses: [],
        totalDuration: 0
    };

    for (const gloss of glosses) {
        // Skip fingerspelling markers
        if (gloss.startsWith('#')) {
            result.unknownGlosses.push(gloss.slice(1));
            continue;
        }

        const verified = getVerifiedSign(gloss);
        if (verified) {
            result.signs.push({
                gloss: gloss,
                verified: true,
                ...verified
            });
            result.totalDuration += verified.duration_ms || 500;
        } else {
            result.unknownGlosses.push(gloss);
        }
    }

    return result;
}

/**
 * Concatenate verified signs into animation sequence
 * @param {string[]} glosses - Array of ASL glosses
 * @returns {object} Combined animation data
 */
export function concatenateSigns(glosses) {
    const sequence = {
        signs: [],
        totalDuration: 0,
        keyframes: []
    };

    let currentTime = 0;

    for (const gloss of glosses) {
        const sign = getVerifiedSign(gloss);
        if (sign) {
            // Offset keyframe times
            const offsetKeyframes = (sign.keyframes || []).map(kf => ({
                ...kf,
                time_ms: kf.time_ms + currentTime
            }));

            sequence.signs.push({
                gloss: gloss,
                startTime: currentTime,
                duration: sign.duration_ms
            });

            sequence.keyframes.push(...offsetKeyframes);
            currentTime += sign.duration_ms + 100; // 100ms transition
        }
    }

    sequence.totalDuration = currentTime;
    return sequence;
}

export default {
    getVerifiedSign,
    textToGloss,
    getAvailableSigns,
    isVerifiedSign,
    calculatePoseSimilarity,
    validateSign,
    getVerifiedPoseKeyframes,
    concatenateSigns
};
