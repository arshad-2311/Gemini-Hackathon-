/**
 * Semantic Matcher for How2Sign
 * Uses Gemini for semantic similarity matching
 * Two approaches: direct matching and embedding-based
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp"
});

// For embeddings
const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004"
});

/**
 * Extract JSON from Gemini response
 */
function extractJSON(text) {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        return jsonMatch[0];
    }
    // Try object format
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        return objMatch[0];
    }
    return text;
}

/**
 * Find semantically similar sentences using Gemini
 * @param {string} userInput - User's English input
 * @param {Array} how2signDatabase - Array of How2Sign sentence objects
 * @param {number} limit - Max sentences to search (for token limits)
 * @returns {Array} Top matches with scores
 */
async function findSemanticMatches(userInput, how2signDatabase, limit = 100) {
    // Limit database for token constraints
    const searchData = how2signDatabase.slice(0, limit);

    const prompt = `
You are an ASL sentence matcher using semantic similarity.

USER INPUT: "${userInput}"

TASK: Find the top 3 most semantically similar sentences from this dataset.
Consider synonyms, paraphrases, and similar meanings.

DATASET:
${searchData.map((item, idx) =>
        `ID:${item.SENTENCE_ID || idx} | ${item.SENTENCE || item.sentence || item.text}`
    ).join('\n')}

Return ONLY a JSON array with the best matches (no markdown):
[
  {"sentence_id": "xxx", "sentence": "matched text", "score": 0.95, "reason": "exact match"},
  {"sentence_id": "yyy", "sentence": "matched text", "score": 0.78, "reason": "similar topic"}
]

If no good matches (score < 0.5), return empty array: []
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonStr = extractJSON(responseText);
        const matches = JSON.parse(jsonStr);

        // Validate and enhance matches
        return matches.map(match => ({
            ...match,
            score: Math.min(1, Math.max(0, match.score || 0)),
            source: 'gemini_semantic'
        }));
    } catch (error) {
        console.error('Semantic matching error:', error);
        return [];
    }
}

/**
 * Create embeddings for sentences (for faster repeated lookups)
 * @param {Array} sentences - Array of sentence objects
 * @returns {Array} Sentences with their embeddings
 */
async function createSentenceEmbeddings(sentences) {
    const embeddings = [];

    console.log(`Creating embeddings for ${sentences.length} sentences...`);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const text = sentence.SENTENCE || sentence.sentence || sentence.text;

        try {
            const result = await embeddingModel.embedContent(text);
            embeddings.push({
                id: sentence.SENTENCE_ID || sentence.id || i,
                sentence: text,
                embedding: result.embedding.values
            });

            // Progress log
            if ((i + 1) % 50 === 0) {
                console.log(`  Embedded ${i + 1}/${sentences.length}`);
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.warn(`Failed to embed sentence ${i}:`, error.message);
        }
    }

    console.log(`✅ Created ${embeddings.length} embeddings`);
    return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find matches using pre-computed embeddings (faster)
 * @param {string} userInput - User input text
 * @param {Array} embeddingsIndex - Pre-computed embeddings
 * @param {number} topK - Number of results
 */
async function findMatchesByEmbedding(userInput, embeddingsIndex, topK = 3) {
    try {
        // Get embedding for user input
        const result = await embeddingModel.embedContent(userInput);
        const userEmbedding = result.embedding.values;

        // Calculate similarities
        const scored = embeddingsIndex.map(item => ({
            id: item.id,
            sentence: item.sentence,
            score: cosineSimilarity(userEmbedding, item.embedding)
        }));

        // Sort and return top matches
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, topK).map(m => ({
            sentence_id: m.id,
            sentence: m.sentence,
            score: Math.round(m.score * 100) / 100,
            source: 'embedding_similarity'
        }));
    } catch (error) {
        console.error('Embedding search error:', error);
        return [];
    }
}

export {
    findSemanticMatches,
    createSentenceEmbeddings,
    findMatchesByEmbedding,
    cosineSimilarity
};

export default {
    findSemanticMatches,
    createSentenceEmbeddings,
    findMatchesByEmbedding,
    cosineSimilarity
};
