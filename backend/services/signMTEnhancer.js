// backend/services/signMTEnhancer.js
// Enhance Gemini's SiGML output with Sign.MT for improved accuracy

import xml2js from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

// Note: @sign-mt/browsermt may require browser environment
// Using conditional import for Node.js compatibility
let signMTTranslate;
try {
    const signMT = await import('@sign-mt/browsermt');
    signMTTranslate = signMT.translate;
} catch {
    console.warn('Sign.MT not available, using Gemini-only mode');
    signMTTranslate = null;
}

/**
 * Enhance Gemini's SiGML with Sign.MT output
 * Combines the strengths of both systems
 */
async function enhanceWithSignMT(geminiSigml, sourceText, targetLang = 'asl') {
    try {
        // If Sign.MT is available, use it for enhancement
        if (signMTTranslate) {
            const signMTResult = await signMTTranslate({
                text: sourceText,
                from: 'en',
                to: targetLang.toLowerCase() // 'asl', 'bsl', 'dgs', etc.
            });

            // Merge Gemini's SiGML with Sign.MT's output
            const mergedSigml = await mergeSigmlOutputs(geminiSigml, signMTResult.sigml);

            return {
                success: true,
                original: sourceText,
                targetLanguage: targetLang,
                geminiSigml: geminiSigml,
                signMTSigml: signMTResult.sigml,
                mergedSigml: mergedSigml,
                confidence: calculateConfidence(geminiSigml, signMTResult.sigml),
                source: 'hybrid'
            };
        }

        // Fallback to Gemini-only
        return {
            success: true,
            original: sourceText,
            targetLanguage: targetLang,
            sigml: geminiSigml,
            source: 'gemini-only',
            note: 'Sign.MT not available, using Gemini output only'
        };

    } catch (error) {
        console.error('Sign.MT enhancement error:', error);
        // Fallback to Gemini-only
        return {
            success: true,
            original: sourceText,
            targetLanguage: targetLang,
            sigml: geminiSigml,
            source: 'gemini-only',
            error: error.message
        };
    }
}

/**
 * Merge two SiGML outputs intelligently
 * Strategy: Use Sign.MT for hand positions (more reliable), Gemini for facial expressions
 */
async function mergeSigmlOutputs(geminiSigml, signMTSigml) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const builder = new xml2js.Builder({
        headless: false,
        renderOpts: { pretty: true, indent: '  ' }
    });

    try {
        // Parse both SiGML outputs
        const geminiParsed = await parser.parseStringPromise(geminiSigml);
        const signMTParsed = await parser.parseStringPromise(signMTSigml);

        // Initialize merged structure
        const merged = {
            sigml: {
                $: geminiParsed.sigml?.$ || {},
                hamgestural_sign: []
            }
        };

        // Get sign arrays (handle both single and multiple signs)
        const geminiSigns = normalizeToArray(geminiParsed.sigml?.hamgestural_sign);
        const signMTSigns = normalizeToArray(signMTParsed.sigml?.hamgestural_sign);

        // Merge signs with intelligent combination
        const maxSigns = Math.max(geminiSigns.length, signMTSigns.length);

        for (let i = 0; i < maxSigns; i++) {
            const geminiSign = geminiSigns[i];
            const signMTSign = signMTSigns[i];

            const mergedSign = {
                $: {
                    gloss: geminiSign?.$?.gloss || signMTSign?.$?.gloss || `SIGN_${i + 1}`
                },
                // Prefer Sign.MT for manual components (hand positions are more reliable)
                sign_manual: signMTSign?.sign_manual || geminiSign?.sign_manual,
                // Prefer Gemini for non-manual components (better at facial expressions)
                sign_nonmanual: geminiSign?.sign_nonmanual || signMTSign?.sign_nonmanual
            };

            // If both have sign_manual, merge their components
            if (geminiSign?.sign_manual && signMTSign?.sign_manual) {
                mergedSign.sign_manual = mergeManualComponents(
                    geminiSign.sign_manual,
                    signMTSign.sign_manual
                );
            }

            merged.sigml.hamgestural_sign.push(mergedSign);
        }

        return builder.buildObject(merged);

    } catch (error) {
        console.error('Error merging SiGML:', error);
        // If merging fails, prefer Gemini's output
        return geminiSigml;
    }
}

/**
 * Merge manual (hand) components from both sources
 */
function mergeManualComponents(geminiManual, signMTManual) {
    // Sign.MT typically has better hand position data
    // Gemini may have additional timing and movement details
    return {
        ...signMTManual,
        // Add any timing/speed attributes from Gemini
        timing: geminiManual.timing || signMTManual.timing,
        speed: geminiManual.speed || signMTManual.speed
    };
}

/**
 * Normalize to array
 */
function normalizeToArray(item) {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
}

/**
 * Calculate confidence score based on agreement between sources
 */
function calculateConfidence(geminiSigml, signMTSigml) {
    try {
        // Simple heuristic: check if both outputs have similar structure
        const geminiSignCount = (geminiSigml.match(/<hamgestural_sign/g) || []).length;
        const signMTSignCount = (signMTSigml?.match(/<hamgestural_sign/g) || []).length;

        // Base confidence
        let confidence = 70;

        // Agreement on sign count increases confidence
        if (geminiSignCount === signMTSignCount) {
            confidence += 15;
        } else if (Math.abs(geminiSignCount - signMTSignCount) <= 1) {
            confidence += 5;
        }

        // Both have non-manual markers
        const geminiHasNonManual = geminiSigml.includes('sign_nonmanual');
        const signMTHasNonManual = signMTSigml?.includes('sign_nonmanual') || false;

        if (geminiHasNonManual && signMTHasNonManual) {
            confidence += 10;
        } else if (geminiHasNonManual || signMTHasNonManual) {
            confidence += 5;
        }

        return Math.min(confidence, 100);

    } catch {
        return 50; // Default uncertain confidence
    }
}

/**
 * Validate and repair SiGML structure
 */
async function validateAndRepairSigml(sigml) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const builder = new xml2js.Builder();

    try {
        const parsed = await parser.parseStringPromise(sigml);

        // Ensure required structure
        if (!parsed.sigml) {
            parsed.sigml = { hamgestural_sign: [] };
        }

        // Rebuild with proper formatting
        return {
            isValid: true,
            sigml: builder.buildObject(parsed)
        };

    } catch (error) {
        return {
            isValid: false,
            error: error.message,
            original: sigml
        };
    }
}

/**
 * Compare similarity between two SiGML outputs
 */
async function compareSigmlSimilarity(sigml1, sigml2) {
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const parsed1 = await parser.parseStringPromise(sigml1);
        const parsed2 = await parser.parseStringPromise(sigml2);

        const signs1 = normalizeToArray(parsed1.sigml?.hamgestural_sign);
        const signs2 = normalizeToArray(parsed2.sigml?.hamgestural_sign);

        let matchScore = 0;
        let totalChecks = 0;

        // Compare glosses
        const glosses1 = signs1.map(s => s.$?.gloss?.toUpperCase());
        const glosses2 = signs2.map(s => s.$?.gloss?.toUpperCase());

        for (const gloss of glosses1) {
            totalChecks++;
            if (glosses2.includes(gloss)) matchScore++;
        }

        // Compare sign count
        totalChecks++;
        if (signs1.length === signs2.length) matchScore++;

        return {
            similarity: totalChecks > 0 ? (matchScore / totalChecks) * 100 : 0,
            matchedGlosses: glosses1.filter(g => glosses2.includes(g)),
            source1SignCount: signs1.length,
            source2SignCount: signs2.length
        };

    } catch (error) {
        return {
            similarity: 0,
            error: error.message
        };
    }
}

/**
 * Select best output based on quality metrics
 */
async function selectBestOutput(geminiSigml, signMTSigml, criteria = 'balanced') {
    const geminiValid = (await validateAndRepairSigml(geminiSigml)).isValid;
    const signMTValid = signMTSigml ? (await validateAndRepairSigml(signMTSigml)).isValid : false;

    // If only one is valid, use that
    if (geminiValid && !signMTValid) {
        return { selected: geminiSigml, source: 'gemini', reason: 'Sign.MT output invalid' };
    }
    if (!geminiValid && signMTValid) {
        return { selected: signMTSigml, source: 'signmt', reason: 'Gemini output invalid' };
    }
    if (!geminiValid && !signMTValid) {
        return { selected: geminiSigml, source: 'gemini', reason: 'Both invalid, defaulting to Gemini' };
    }

    // Both valid - select based on criteria
    switch (criteria) {
        case 'gemini':
            return { selected: geminiSigml, source: 'gemini', reason: 'User preference' };
        case 'signmt':
            return { selected: signMTSigml, source: 'signmt', reason: 'User preference' };
        case 'balanced':
        default:
            // Prefer merged output
            const merged = await mergeSigmlOutputs(geminiSigml, signMTSigml);
            return { selected: merged, source: 'merged', reason: 'Best of both sources' };
    }
}

/**
 * Supported sign languages
 */
const SUPPORTED_LANGUAGES = {
    asl: { name: 'American Sign Language', code: 'asl' },
    bsl: { name: 'British Sign Language', code: 'bsl' },
    dgs: { name: 'Deutsche Gebärdensprache', code: 'dgs' },
    lsf: { name: 'Langue des Signes Française', code: 'lsf' },
    isl: { name: 'Indian Sign Language', code: 'isl' },
    auslan: { name: 'Australian Sign Language', code: 'auslan' }
};

export {
    enhanceWithSignMT,
    mergeSigmlOutputs,
    calculateConfidence,
    validateAndRepairSigml,
    compareSigmlSimilarity,
    selectBestOutput,
    SUPPORTED_LANGUAGES
};

export default {
    enhanceWithSignMT,
    mergeSigmlOutputs,
    calculateConfidence,
    validateAndRepairSigml,
    compareSigmlSimilarity,
    selectBestOutput,
    SUPPORTED_LANGUAGES
};
