import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import geminiCache from './geminiCache.js';

dotenv.config();

/**
 * Comprehensive Gemini Service for Sign Language Translation
 * Supports ASL, BSL, and ISL with teaching, spatial awareness, and context features
 * Now with multi-key rotation for higher throughput!
 */
export class GeminiService {
  constructor(apiKeys = null) {
    // Support multiple API keys for rotation
    this.apiKeys = this._loadApiKeys(apiKeys);
    this.currentKeyIndex = 0;
    this.keyUsageCount = {};
    this.keyErrors = {};

    // Initialize usage tracking for each key
    this.apiKeys.forEach((key, i) => {
      this.keyUsageCount[i] = 0;
      this.keyErrors[i] = { count: 0, lastError: null };
    });

    if (this.apiKeys.length === 0) {
      console.warn('⚠️  No GEMINI_API_KEY(s) set - API calls will fail');
    } else {
      console.log(`✅ Loaded ${this.apiKeys.length} API key(s) for rotation`);
    }

    // Initialize with first key
    this._initializeModel();

    // Dialect-specific linguistic configurations
    this.dialectConfig = {
      ASL: {
        name: 'American Sign Language',
        wordOrder: 'Topic-Comment (OSV)',
        features: [
          'Non-manual markers (facial expressions) are grammatical',
          'Directional verbs indicate subject/object',
          'Classifiers for shape and movement',
          'Fingerspelling for proper nouns',
          'Time indicators at sentence start'
        ],
        grammarRules: 'Time + Topic + Comment structure. Questions use raised eyebrows (yes/no) or furrowed brows (wh-questions).'
      },
      BSL: {
        name: 'British Sign Language',
        wordOrder: 'Topic-Comment with SVO elements',
        features: [
          'Two-handed fingerspelling alphabet',
          'Regional variations across UK',
          'Lip patterns are grammatical',
          'Different number system than ASL',
          'Initialized signs common'
        ],
        grammarRules: 'Topic-Comment but more SVO than ASL. Strong use of lip patterns as grammatical markers.'
      },
      ISL: {
        name: 'Indian Sign Language',
        wordOrder: 'SOV (Subject-Object-Verb)',
        features: [
          'One-handed fingerspelling',
          'Regional variations across India',
          'Iconic signs prevalent',
          'Compound signs common',
          'Influenced by local gesture systems'
        ],
        grammarRules: 'SOV structure common. Negation typically at end. Heavy use of iconic representations.'
      }
    };

    // Rate limiting configuration
    this.rateLimitConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      retryStatusCodes: [429, 500, 503]
    };

    // Track rate limit state
    this.rateLimitState = {
      isLimited: false,
      retryAfter: null,
      lastError: null
    };

    // Request logging
    this.requestLog = [];
  }

  /**
   * Load API keys from various sources
   */
  _loadApiKeys(apiKeys) {
    // Priority 1: Passed directly
    if (apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0) {
      return apiKeys.filter(k => k && k.trim());
    }

    // Priority 2: Comma-separated list in GEMINI_API_KEYS
    if (process.env.GEMINI_API_KEYS) {
      const keys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
      if (keys.length > 0) return keys;
    }

    // Priority 3: GEMINI_API_KEY (may be single or comma-separated)
    if (process.env.GEMINI_API_KEY) {
      const keyValue = process.env.GEMINI_API_KEY;
      // Check if it contains multiple keys (comma-separated)
      if (keyValue.includes(',')) {
        return keyValue.split(',').map(k => k.trim()).filter(k => k);
      }
      return [keyValue.trim()];
    }

    return [];
  }

  /**
   * Initialize model with current key
   */
  _initializeModel() {
    if (this.apiKeys.length === 0) {
      this.genAI = null;
      this.model = null;
      return;
    }

    const currentKey = this.apiKeys[this.currentKeyIndex];
    this.genAI = new GoogleGenerativeAI(currentKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Rotate to next API key
   */
  _rotateKey() {
    const previousIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    console.log(`🔄 Rotating API key: ${previousIndex + 1} → ${this.currentKeyIndex + 1} of ${this.apiKeys.length}`);

    this._initializeModel();
    return this.currentKeyIndex;
  }

  /**
   * Get the best key to use (least recently errored)
   */
  _selectBestKey() {
    if (this.apiKeys.length === 1) return 0;

    // Find key with lowest error count or oldest error
    let bestIndex = this.currentKeyIndex;
    let bestScore = Infinity;

    for (let i = 0; i < this.apiKeys.length; i++) {
      const errors = this.keyErrors[i];
      const timeSinceError = errors.lastError ? Date.now() - errors.lastError : Infinity;
      const score = errors.count * 1000 - timeSinceError / 1000;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex !== this.currentKeyIndex) {
      this.currentKeyIndex = bestIndex;
      this._initializeModel();
    }

    return bestIndex;
  }

  /**
   * Record key error for rotation logic
   */
  _recordKeyError(keyIndex, error) {
    this.keyErrors[keyIndex].count++;
    this.keyErrors[keyIndex].lastError = Date.now();
    console.log(`⚠️ Key ${keyIndex + 1} error count: ${this.keyErrors[keyIndex].count}`);
  }

  /**
   * Get key usage statistics
   */
  getKeyStats() {
    return {
      totalKeys: this.apiKeys.length,
      currentKey: this.currentKeyIndex + 1,
      usage: this.keyUsageCount,
      errors: this.keyErrors,
      keysConfigured: this.apiKeys.length > 0
    };
  }

  /**
   * Log API request for debugging
   */
  _logRequest(method, params, response, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      params: JSON.stringify(params).substring(0, 200),
      success: !error,
      error: error?.message,
      responsePreview: response ? JSON.stringify(response).substring(0, 200) : null
    };
    this.requestLog.push(logEntry);

    // Keep only last 100 logs
    if (this.requestLog.length > 100) {
      this.requestLog.shift();
    }

    console.log(`[Gemini] ${method}: ${error ? '❌ ' + error.message : '✅'}`);
  }

  /**
   * Parse JSON from Gemini response, handling markdown code blocks
   */
  _parseJSON(text) {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to find JSON object or array
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  }

  /**
   * Sleep for specified milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is a rate limit error
   */
  _isRateLimitError(error) {
    const message = error.message || '';
    return (
      message.includes('429') ||
      message.includes('Too Many Requests') ||
      message.includes('quota') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('rate limit')
    );
  }

  /**
   * Format user-friendly error message
   */
  _formatError(error) {
    const message = error.message || '';

    if (this._isRateLimitError(error)) {
      return {
        type: 'RATE_LIMIT',
        userMessage: 'API quota exceeded. Please wait a moment and try again.',
        retryAfter: this._extractRetryDelay(message),
        technical: message
      };
    }

    if (message.includes('API key')) {
      return {
        type: 'AUTH_ERROR',
        userMessage: 'Invalid API key. Please check your Gemini API key.',
        technical: message
      };
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        userMessage: 'Network error. Please check your connection.',
        technical: message
      };
    }

    return {
      type: 'UNKNOWN',
      userMessage: 'An error occurred. Please try again.',
      technical: message
    };
  }

  /**
   * Extract retry delay from error message
   */
  _extractRetryDelay(message) {
    const match = message.match(/retry.*?(\d+)s/i);
    return match ? parseInt(match[1]) * 1000 : this.rateLimitConfig.baseDelayMs;
  }

  /**
   * Execute API call with retry logic and key rotation
   * @param {string} prompt - The prompt to send to the model
   * @param {string} methodName - Name of the method for logging
   * @param {Object} params - Parameters for logging
   */
  async _executeWithRetry(prompt, methodName, params) {
    let lastError;
    const startKeyIndex = this.currentKeyIndex;
    let keysTriedCount = 0;

    for (let attempt = 0; attempt < this.rateLimitConfig.maxRetries; attempt++) {
      try {
        // Track usage
        this.keyUsageCount[this.currentKeyIndex]++;
        console.log(`[Gemini] Using key ${this.currentKeyIndex + 1}/${this.apiKeys.length} for ${methodName}`);

        // Check if we're in a rate-limited state and only one key
        if (this.rateLimitState.isLimited && this.rateLimitState.retryAfter) {
          const waitTime = this.rateLimitState.retryAfter - Date.now();
          if (waitTime > 0 && this.apiKeys.length === 1) {
            console.log(`[Gemini] Rate limited, waiting ${Math.ceil(waitTime / 1000)}s...`);
            await this._sleep(waitTime);
          }
          this.rateLimitState.isLimited = false;
        }

        // Call the current model directly (uses current key after rotation)
        const result = await this.model.generateContent(prompt);

        // Success - clear rate limit state
        this.rateLimitState.isLimited = false;
        this.rateLimitState.lastError = null;
        console.log(`[Gemini] ✅ Success with key ${this.currentKeyIndex + 1}`);

        return result;
      } catch (error) {
        lastError = error;
        console.log(`[Gemini] ❌ Key ${this.currentKeyIndex + 1} error: ${error.message?.substring(0, 100)}`);

        if (this._isRateLimitError(error)) {
          this._recordKeyError(this.currentKeyIndex, error);

          // Try rotating to next key first (if we have multiple and haven't tried all)
          if (this.apiKeys.length > 1 && keysTriedCount < this.apiKeys.length - 1) {
            keysTriedCount++;
            console.log(`[Gemini] 🔄 Rotating from key ${this.currentKeyIndex + 1} to next key...`);
            this._rotateKey();
            // Don't increment attempt counter - this is a key rotation, not a retry
            attempt--;
            continue;
          }

          // All keys exhausted or only one key - wait with exponential backoff
          const delay = Math.min(
            this.rateLimitConfig.baseDelayMs * Math.pow(2, attempt),
            this.rateLimitConfig.maxDelayMs
          );

          console.log(`[Gemini] ⏳ All ${this.apiKeys.length} keys rate limited (attempt ${attempt + 1}/${this.rateLimitConfig.maxRetries}), waiting ${delay / 1000}s...`);

          this.rateLimitState.isLimited = true;
          this.rateLimitState.retryAfter = Date.now() + delay;
          this.rateLimitState.lastError = this._formatError(error);

          // Reset key counter and rotate back to start
          keysTriedCount = 0;
          this.currentKeyIndex = startKeyIndex;
          this._initializeModel();

          await this._sleep(delay);
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }

    // All retries exhausted
    const formattedError = this._formatError(lastError);
    const enhancedError = new Error(formattedError.userMessage);
    enhancedError.details = formattedError;
    enhancedError.code = formattedError.type;
    throw enhancedError;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return {
      isLimited: this.rateLimitState.isLimited,
      retryAfter: this.rateLimitState.retryAfter,
      lastError: this.rateLimitState.lastError
    };
  }

  // ============================================
  // CORE TRANSLATION FEATURES
  // ============================================

  /**
   * Convert English text to sign language sequence
   * @param {string} text - English text to translate
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Array} Array of sign glosses with metadata
   */
  async textToSignSequence(text, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];
    const cacheParams = { text: text.toLowerCase().trim(), dialect };

    // 1. Check cache first
    const cached = geminiCache.get('textToSignSequence', cacheParams);
    if (cached) {
      this._logRequest('textToSignSequence', cacheParams, cached, null);
      return cached;
    }

    // 2. If we're actively rate limited, try mock FIRST before any API call
    if (this.rateLimitState.isLimited) {
      const mockResponse = geminiCache.getMockTranslation(text);
      if (mockResponse) {
        console.log(`🎭 Using mock (rate limited) for: "${text}"`);
        this._logRequest('textToSignSequence', { text, dialect, source: 'mock-ratelimit' }, mockResponse);
        return mockResponse;
      }
    }

    const prompt = `You are an expert ${dialectInfo.name} linguist and interpreter. Convert the following English text into a precise sequence of ${dialect} signs.

LINGUISTIC RULES FOR ${dialect}:
- Word Order: ${dialectInfo.wordOrder}
- Grammar: ${dialectInfo.grammarRules}
- Key Features: ${dialectInfo.features.join('; ')}

TEXT TO TRANSLATE: "${text}"

INSTRUCTIONS:
1. Apply ${dialect} grammar rules - do NOT use English word order
2. Include non-manual markers (facial expressions) as they are grammatical in sign languages
3. Use appropriate classifiers where needed
4. For proper nouns or words without signs, indicate fingerspelling
5. Consider natural sign flow and transitions

Respond with ONLY a JSON array (no markdown):
[
  {
    "gloss": "SIGN-NAME",
    "expression": "neutral|raised-eyebrows|furrowed-brows|pursed-lips|wide-eyes",
    "duration": 1.5,
    "handShape": "description of hand configuration",
    "movement": "description of movement",
    "location": "neutral-space|face|chest|head|shoulder",
    "notes": "any additional performance notes",
    "type": "sign|fingerspell|classifier|compound"
  }
]`;

    try {
      // 2. Try API call with retry and key rotation
      const result = await this._executeWithRetry(
        prompt,  // Pass prompt directly, not a closure
        'textToSignSequence',
        { text, dialect }
      );
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      // 3. Cache successful response
      geminiCache.set('textToSignSequence', cacheParams, parsed);

      this._logRequest('textToSignSequence', { text, dialect }, parsed);
      return parsed;
    } catch (error) {
      // 4. On ANY error, try mock fallback first
      let mockResponse = geminiCache.getMockTranslation(text);

      // If mock cache returned null (e.g. for some edge case text), force a fingerspell fallback
      if (!mockResponse && text && text.trim().length > 0) {
        console.log(`🎭 Creating manual fingerspell fallback for: "${text}"`);
        mockResponse = text.split(/\s+/).map(word => ({
          gloss: word.toUpperCase(),
          expression: 'neutral',
          duration: word.length * 0.3,
          type: 'fingerspell',
          handShape: 'Fingerspelling',
          movement: 'Spell letters',
          location: 'neutral-space'
        }));
      }

      if (mockResponse) {
        console.log(`🎭 Using fallback for: "${text}" (due to: ${error.message?.substring(0, 50)})`);
        this._logRequest('textToSignSequence', { text, dialect, source: 'mock-fallback' }, mockResponse);
      }

      // Only throw if absolutely no fallback possible (empty text)
      this._logRequest('textToSignSequence', { text, dialect }, null, error);
      throw error;
    }
  }

  /**
   * Convert English text to sign animation JSON (for 3D avatar)
   * Returns the JSON schema format that Avatar3D can directly consume
   * @param {string} text - English text to translate
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Object} Animation data with signs array in Avatar3D JSON format
   */
  async textToSignAnimation(text, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];
    const cacheParams = { text: text.toLowerCase().trim(), dialect, type: 'animation' };

    // Check cache first
    const cached = geminiCache.get('textToSignAnimation', cacheParams);
    if (cached) {
      this._logRequest('textToSignAnimation', cacheParams, cached, null);
      return cached;
    }

    // Predefined animations for common signs (fallback)
    const PREDEFINED_SIGNS = {
      'HELLO': { hand_shape: 'OpenPalm', target_position: { right_hand: { x: 0.15, y: 1.8, z: 0.3 } }, movement_action: 'Wave' },
      'YES': { hand_shape: 'Fist', target_position: { right_hand: { x: 0.05, y: 1.3, z: 0.5 } }, movement_action: 'Nod' },
      'NO': { hand_shape: 'V_Shape', target_position: { right_hand: { x: 0.05, y: 1.3, z: 0.4 } }, movement_action: 'Snap' },
      'THANK-YOU': { hand_shape: 'OpenPalm', target_position: { right_hand: { x: 0, y: 1.6, z: 0.15 } }, movement_action: 'Wave' },
      'YOU': { hand_shape: 'IndexPoint', target_position: { right_hand: { x: 0.1, y: 1.2, z: 0.8 } }, movement_action: 'Hold' },
      'ME': { hand_shape: 'IndexPoint', target_position: { right_hand: { x: 0, y: 1.2, z: 0.2 } }, movement_action: 'Tap' },
      'I-LOVE-YOU': { hand_shape: 'ILY', target_position: { right_hand: { x: 0.15, y: 1.5, z: 0.5 } }, movement_action: 'Wave' },
      'GOOD': { hand_shape: 'OpenPalm', target_position: { right_hand: { x: 0, y: 1.5, z: 0.2 }, left_hand: { x: 0, y: 1.0, z: 0.4 } }, movement_action: 'Wave' },
      'BAD': { hand_shape: 'OpenPalm', target_position: { right_hand: { x: 0, y: 1.5, z: 0.3 } }, movement_action: 'Wave' },
      'PLEASE': { hand_shape: 'OpenPalm', target_position: { right_hand: { x: 0, y: 1.2, z: 0.2 } }, movement_action: 'Circular' },
      'SORRY': { hand_shape: 'Fist', target_position: { right_hand: { x: 0, y: 1.2, z: 0.2 } }, movement_action: 'Circular' },
      'HELP': { hand_shape: 'Fist', target_position: { right_hand: { x: 0.1, y: 1.1, z: 0.4 }, left_hand: { x: -0.1, y: 1.0, z: 0.4 } }, movement_action: 'Wave' },
      'HOME': { hand_shape: 'Pinch', target_position: { right_hand: { x: 0.15, y: 1.6, z: 0.15 } }, movement_action: 'Tap' },
      'LOVE': { hand_shape: 'Fist', target_position: { right_hand: { x: 0.1, y: 1.2, z: 0.15 }, left_hand: { x: -0.1, y: 1.2, z: 0.15 } }, movement_action: 'Hold' }
    };

    const prompt = `You are a 3D Technical Animator and ${dialectInfo.name} Linguist.
Task: Convert the input text into a JSON array of animation states for a 3D avatar.
Constraint: Use standard Euler angles relative to a T-Pose. The avatar uses a Mixamo skeleton.

Input Text: "${text}"

LINGUISTIC RULES FOR ${dialect}:
- Word Order: ${dialectInfo.wordOrder}
- Grammar: ${dialectInfo.grammarRules}

Response Schema (JSON only, no markdown):
{
  "signs": [
    {
      "gloss": "WORD_LABEL",
      "duration": 1.5,
      "hand_shape": "OpenPalm" | "Fist" | "IndexPoint" | "C_Shape" | "ILY" | "V_Shape" | "Pinch",
      "target_position": {
        "right_hand": {"x": 0.2, "y": 1.5, "z": 0.5},
        "left_hand": {"x": -0.2, "y": 0.9, "z": 0.3}
      },
      "movement_action": "Wave" | "Tap" | "Circular" | "Hold" | "Nod" | "Snap",
      "facial_expression": "Neutral" | "Smile" | "EyebrowsUp"
    }
  ]
}

Rules:
1. Use ${dialect} grammar - apply correct word order
2. Each sign should have appropriate hand_shape based on ASL linguistics
3. target_position.y ranges from 0.5 (waist) to 2.0 (above head). Neutral is 1.2
4. target_position.z ranges from 0 (body) to 1.0 (arm extended forward)
5. If you don't know the exact sign, use fingerspelling (hand_shape: "IndexPoint", movement_action: "Hold")
6. Return ONLY the JSON object, no explanations`;

    try {
      const result = await this._executeWithRetry(prompt, 'textToSignAnimation', { text, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      // Validate and enhance with predefined data where available
      if (parsed.signs) {
        parsed.signs = parsed.signs.map(sign => {
          const predefined = PREDEFINED_SIGNS[sign.gloss?.toUpperCase()];
          if (predefined) {
            return { ...sign, ...predefined, gloss: sign.gloss };
          }
          return sign;
        });
      }

      // Cache the result
      geminiCache.set('textToSignAnimation', cacheParams, parsed);
      this._logRequest('textToSignAnimation', { text, dialect }, parsed);
      return parsed;

    } catch (error) {
      console.warn(`⚠️ textToSignAnimation API failed, using predefined fallback`);

      // Fallback: Create animation from simple word parsing
      const words = text.toUpperCase().split(/\s+/);
      const signs = words.map(word => {
        const predefined = PREDEFINED_SIGNS[word];
        if (predefined) {
          return {
            gloss: word,
            duration: 1.2,
            ...predefined,
            facial_expression: 'Neutral'
          };
        }
        // Fingerspelling fallback
        return {
          gloss: word,
          duration: word.length * 0.3,
          hand_shape: 'IndexPoint',
          target_position: { right_hand: { x: 0.1, y: 1.3, z: 0.5 } },
          movement_action: 'Hold',
          facial_expression: 'Neutral',
          type: 'fingerspell'
        };
      });

      const fallbackResult = { signs, source: 'predefined-fallback' };
      this._logRequest('textToSignAnimation', { text, dialect, source: 'fallback' }, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Generate accurate 3D pose keypoint data for ASL signs
   * Uses linguistically accurate hand shapes, movements, and facial expressions
   * @param {string} text - Text phrase to translate to sign language poses
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Object} Detailed pose keyframe data for avatar animation
   */
  async textToPoseKeyframes(text, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];
    const cacheParams = { text: text.toLowerCase().trim(), dialect, type: 'poseKeyframes' };

    // Check cache first
    const cached = geminiCache.get('textToPoseKeyframes', cacheParams);
    if (cached) {
      this._logRequest('textToPoseKeyframes', cacheParams, cached, null);
      return cached;
    }

    const prompt = `You are an expert sign language linguist and pose animation specialist. Your task is to generate accurate 3D pose keypoint data for ${dialectInfo.name} signs that will be used to animate a 3D avatar.

CRITICAL REQUIREMENTS:
1. Each sign must be linguistically accurate according to ${dialect} standards
2. Hand shapes must be precisely defined (closed fist, flat hand, pointing, etc.)
3. Movement paths must follow authentic ${dialect} motion patterns
4. Facial expressions must be included (they are grammatically essential in sign languages)
5. Timing and speed must reflect natural signing rhythm
6. Non-manual markers (eyebrow position, head tilt, mouth movements) must be accurate

LINGUISTIC RULES FOR ${dialect}:
- Word Order: ${dialectInfo.wordOrder}
- Grammar: ${dialectInfo.grammarRules}
- Key Features: ${dialectInfo.features.join('; ')}

INPUT PHRASE: "${text}"

OUTPUT FORMAT - Respond with ONLY this JSON structure (no markdown):
{
  "phrase": "${text}",
  "language": "${dialect}",
  "total_duration_ms": [total duration for entire phrase],
  "signs": [
    {
      "sign": "[GLOSS]",
      "duration_ms": [duration for this sign],
      "keyframes": [
        {
          "timestamp_ms": 0,
          "pose": {
            "right_hand": {
              "position": [x, y, z],
              "rotation": [rx, ry, rz],
              "handshape": "[description]",
              "fingers": {
                "thumb": "extended|bent|closed|across",
                "index": "extended|bent|closed",
                "middle": "extended|bent|closed",
                "ring": "extended|bent|closed",
                "pinky": "extended|bent|closed"
              }
            },
            "left_hand": {
              "position": [x, y, z],
              "rotation": [rx, ry, rz],
              "handshape": "[description]",
              "fingers": {
                "thumb": "extended|bent|closed|across",
                "index": "extended|bent|closed",
                "middle": "extended|bent|closed",
                "ring": "extended|bent|closed",
                "pinky": "extended|bent|closed"
              }
            },
            "head": {
              "position": [x, y, z],
              "rotation": [rx, ry, rz]
            },
            "torso": {
              "rotation": [rx, ry, rz]
            },
            "face": {
              "eyebrows": "raised|neutral|furrowed",
              "eyes": "open|squinted|wide",
              "mouth": "[shape description - e.g., 'relaxed', 'lips pursed', 'open ah', 'mm']"
            }
          }
        }
      ],
      "notes": "[Important signing details for this sign]"
    }
  ],
  "transition_notes": "[How signs flow together]"
}

COORDINATE SYSTEM:
- X: -1 (left) to 1 (right), 0 is center
- Y: 0 (waist) to 2 (above head), 1.5 is neutral signing space
- Z: 0 (at body) to 1 (arm extended forward)
- Rotations in radians: 0 = neutral, positive = clockwise when looking down axis

SIGNING PRINCIPLES TO FOLLOW:
- Start and end positions should be clear and deliberate
- Movement should be smooth but not slow (natural signing speed)
- Two-handed signs must have proper symmetry or dominance
- Location in signing space matters (chest level, face level, neutral space)
- Palm orientation is crucial for meaning
- Include preparation and retraction phases
- Facial expressions are NOT optional - they convey grammar and meaning

VALIDATION CHECKLIST:
✓ Hand shapes match ${dialect} phonology
✓ Movement paths are authentic
✓ Location in signing space is correct
✓ Palm orientation is accurate
✓ Facial expression matches sign meaning
✓ Timing feels natural (not robotic)
✓ Transitions between signs are smooth`;

    try {
      const result = await this._executeWithRetry(prompt, 'textToPoseKeyframes', { text, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      // Cache the result
      geminiCache.set('textToPoseKeyframes', cacheParams, parsed);
      this._logRequest('textToPoseKeyframes', { text, dialect }, parsed);
      return parsed;

    } catch (error) {
      console.warn(`⚠️ textToPoseKeyframes API failed, using simplified fallback`);

      // Fallback: Create basic pose data
      const words = text.toUpperCase().split(/\\s+/);
      const fallbackResult = {
        phrase: text,
        language: dialect,
        total_duration_ms: words.length * 1200,
        signs: words.map((word, idx) => ({
          sign: word,
          duration_ms: 1200,
          keyframes: [
            {
              timestamp_ms: 0,
              pose: {
                right_hand: {
                  position: [0.3, 1.3, 0.5],
                  rotation: [0, 0, 0],
                  handshape: "Open palm",
                  fingers: {
                    thumb: "extended",
                    index: "extended",
                    middle: "extended",
                    ring: "extended",
                    pinky: "extended"
                  }
                },
                left_hand: {
                  position: [-0.3, 1.0, 0.3],
                  rotation: [0, 0, 0],
                  handshape: "Relaxed",
                  fingers: {
                    thumb: "bent",
                    index: "bent",
                    middle: "bent",
                    ring: "bent",
                    pinky: "bent"
                  }
                },
                head: { position: [0, 1.7, 0], rotation: [0, 0, 0] },
                torso: { rotation: [0, 0, 0] },
                face: {
                  eyebrows: "neutral",
                  eyes: "open",
                  mouth: "relaxed"
                }
              }
            }
          ],
          notes: "Fallback animation - fingerspelling"
        })),
        transition_notes: "Fallback mode - signs not linguistically verified",
        source: "fallback"
      };

      this._logRequest('textToPoseKeyframes', { text, dialect, source: 'fallback' }, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Convert sign gloss sequence to English text
   * @param {string|Array} signGloss - Sign gloss(es) to translate
   * @param {string} dialect - Source dialect
   * @returns {Object} Translation result
   */
  async signToText(signGloss, dialect = 'ASL') {
    const glossText = Array.isArray(signGloss) ? signGloss.join(' ') : signGloss;
    const dialectInfo = this.dialectConfig[dialect];

    const prompt = `You are an expert ${dialectInfo.name} interpreter. Convert the following sign language gloss notation into natural English.

${dialect} GLOSS: ${glossText}

CONTEXT:
- ${dialect} uses ${dialectInfo.wordOrder} word order
- Grammar rules: ${dialectInfo.grammarRules}

INSTRUCTIONS:
1. Convert the sign-language-ordered glosses to natural English word order
2. Add appropriate articles, prepositions, and conjunctions
3. Preserve the intended meaning and tone
4. If multiple interpretations exist, provide the most likely one

Respond with ONLY a JSON object (no markdown):
{
  "englishText": "The natural English translation",
  "formalRegister": "More formal version if different",
  "confidence": 0.95,
  "alternativeInterpretations": ["other possible meanings"],
  "notes": "any clarifications about the translation"
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'signToText', { signGloss, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('signToText', { signGloss, dialect }, parsed);
      return parsed;
    } catch (error) {
      console.warn(`⚠️ signToText failed, falling back to input gloss: "${glossText}"`);
      // Fallback: just return the input gloss as the text
      const fallback = {
        translation: glossText,
        confidence: 0.5,
        targetDialect: 'English',
        notes: 'Fallback translation due to API error'
      };
      return fallback;
    }
  }


  // ============================================
  // TEACHING AGENT FEATURES
  // ============================================

  /**
   * Analyze user's sign accuracy from video frame data
   * @param {Object} videoFrameData - Pose/hand landmarks from MediaPipe
   * @param {string} intendedSign - The sign the user is attempting
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Object} Accuracy analysis and corrections
   */
  async analyzeSignAccuracy(videoFrameData, intendedSign, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];

    const prompt = `You are an expert ${dialectInfo.name} teacher analyzing a student's sign attempt.

INTENDED SIGN: "${intendedSign}" in ${dialect}

STUDENT'S POSE DATA:
${JSON.stringify(videoFrameData, null, 2)}

REFERENCE - How "${intendedSign}" should be performed in ${dialect}:
Describe the correct handshape, location, movement, palm orientation, and non-manual markers.

ANALYSIS INSTRUCTIONS:
1. Compare the student's hand positions, orientations, and movements to the correct form
2. Identify specific areas needing correction with precise measurements/descriptions
3. Note any non-manual markers (facial expressions) that may be missing
4. Provide encouraging, constructive feedback
5. Include cultural/linguistic context about why this sign is formed this way

Respond with ONLY a JSON object (no markdown):
{
  "accuracy": 85,
  "overallAssessment": "Good attempt with minor adjustments needed",
  "corrections": [
    {
      "aspect": "handshape|location|movement|orientation|expression",
      "issue": "Specific description of what's incorrect",
      "correction": "Exact instruction on how to fix it",
      "importance": "critical|important|minor"
    }
  ],
  "correctExecution": {
    "handshape": "Description of correct handshape",
    "location": "Where the sign should be performed",
    "movement": "Movement pattern",
    "palmOrientation": "Which way palm faces",
    "nonManualMarkers": "Required facial expressions"
  },
  "culturalNote": "Historical or cultural context about this sign",
  "encouragement": "Positive, motivating feedback",
  "practiceExercise": "A specific exercise to improve"
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'analyzeSignAccuracy', { intendedSign, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('analyzeSignAccuracy', { intendedSign, dialect }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('analyzeSignAccuracy', { intendedSign, dialect }, null, error);
      throw error;
    }
  }

  // ============================================
  // SPATIAL AWARENESS
  // ============================================

  /**
   * Detect objects in camera scene for spatial reference
   * @param {string} imageBase64 - Base64 encoded image from camera
   * @returns {Array} Detected objects with positions
   */
  async detectObjectsInScene(imageBase64) {
    const prompt = `Analyze this camera image and identify all visible objects that could be referenced in a sign language conversation.

For each object, determine:
1. What the object is
2. Its position in the frame (left-third, center, right-third, top, bottom)
3. Your confidence level
4. The sign typically used for this object in ASL

Focus on objects that a signer might want to point to or reference.

Respond with ONLY a JSON object (no markdown):
{
  "objects": [
    {
      "object": "object name in English",
      "position": "left|center|right",
      "verticalPosition": "top|middle|bottom",
      "boundingBox": {
        "x": 0.25,
        "y": 0.3,
        "width": 0.15,
        "height": 0.2
      },
      "confidence": 0.95,
      "aslSign": "GLOSS of the sign for this object",
      "pointingAngle": "description of where to point"
    }
  ],
  "sceneDescription": "Brief description of the overall scene",
  "suggestedReferences": ["objects the avatar might usefully point to"]
}`;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      ]);

      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('detectObjectsInScene', { imageSize: imageBase64.length }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('detectObjectsInScene', { imageSize: imageBase64?.length }, null, error);
      throw error;
    }
  }

  /**
   * Predict sign from camera image
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Object} Predicted sign and confidence
   */
  async predictSignFromImage(imageBase64, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];

    const prompt = `Analyze this image of a person using ${dialectInfo.name}. Identify the specific sign being performed.
    
    CONTEXT:
    - User is signing to the camera
    - Looking for a single sign or fingerspelling
    
    INSTRUCTIONS:
    1. Identify the handshape, hand position, and movement (implied)
    2. Determine the most likely sign GLOSS
    3. Estimate confidence level
    
    Respond with ONLY a JSON object (no markdown):
    {
      "gloss": "SIGN-GLOSS",
      "english": "English meaning",
      "confidence": 0.0-1.0,
      "description": "Brief description of visual evidence"
    }`;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      ]);

      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('predictSignFromImage', { dialect }, parsed);
      return parsed;

    } catch (error) {
      this._logRequest('predictSignFromImage', { dialect }, null, error);
      throw error;
    }
  }

  // ============================================
  // CONTEXT INTELLIGENCE
  // ============================================

  /**
   * Suggest next signs based on conversation context
   * @param {Array} conversationHistory - Previous exchanges
   * @param {string} currentTopic - Current conversation topic
   * @param {string} dialect - ASL, BSL, or ISL
   * @returns {Array} Suggested signs with reasons
   */
  async suggestNextSigns(conversationHistory, currentTopic = '', dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];

    const historyText = conversationHistory
      .map(h => `${h.role}: ${h.content}`)
      .join('\n');

    const prompt = `You are an expert ${dialectInfo.name} conversation coach. Based on this ongoing conversation, suggest signs the user might need next.

CONVERSATION HISTORY:
${historyText}

CURRENT TOPIC: ${currentTopic || 'General conversation'}

INSTRUCTIONS:
1. Analyze the conversation flow and predict what might come next
2. Suggest signs for likely responses, follow-up questions, or topic continuations
3. Include common conversational signs (acknowledgments, transitions)
4. Consider ${dialect}-specific discourse markers
5. Rank by likelihood of use

Respond with ONLY a JSON object (no markdown):
{
  "suggestions": [
    {
      "gloss": "SIGN-NAME",
      "meaning": "English meaning",
      "reason": "Why this sign might be useful next",
      "category": "response|question|transition|topic-related|clarification",
      "likelihood": 0.85,
      "usage": "Example of how to use it in this context"
    }
  ],
  "topicPredictions": ["likely next topics"],
  "conversationPhase": "greeting|exchange|clarification|closing"
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'suggestNextSigns', { historyLength: conversationHistory.length, currentTopic });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('suggestNextSigns', { historyLength: conversationHistory.length, currentTopic }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('suggestNextSigns', { historyLength: conversationHistory.length }, null, error);
      throw error;
    }
  }

  // ============================================
  // DIALECT TRANSLATION
  // ============================================

  /**
   * Translate sign sequence between dialects
   * @param {Array} signSequence - Array of signs to translate
   * @param {string} fromDialect - Source dialect (ASL, BSL, ISL)
   * @param {string} toDialect - Target dialect (ASL, BSL, ISL)
   * @returns {Object} Translated sequence with notes
   */
  async translateDialect(signSequence, fromDialect, toDialect) {
    const fromInfo = this.dialectConfig[fromDialect];
    const toInfo = this.dialectConfig[toDialect];

    const prompt = `You are an expert in multiple sign languages. Translate this sign sequence from ${fromInfo.name} to ${toInfo.name}.

SOURCE (${fromDialect}):
${JSON.stringify(signSequence, null, 2)}

LINGUISTIC CONSIDERATIONS:
FROM ${fromDialect}: ${fromInfo.wordOrder}, ${fromInfo.grammarRules}
TO ${toDialect}: ${toInfo.wordOrder}, ${toInfo.grammarRules}

INSTRUCTIONS:
1. Adjust word order if needed (${fromInfo.wordOrder} → ${toInfo.wordOrder})
2. Find equivalent signs in ${toDialect} - note if signs differ significantly
3. Adapt non-manual markers to ${toDialect} conventions
4. Flag any signs that don't have direct equivalents
5. Preserve the meaning while respecting both languages' structures

Respond with ONLY a JSON object (no markdown):
{
  "translatedSequence": [
    {
      "gloss": "TARGET-SIGN",
      "originalGloss": "SOURCE-SIGN",
      "expression": "appropriate expression for ${toDialect}",
      "duration": 1.5,
      "notes": "translation notes",
      "equivalenceType": "exact|similar|conceptual|fingerspell"
    }
  ],
  "grammarChanges": ["List of structural changes made"],
  "culturalAdaptations": ["Any cultural adjustments needed"],
  "warnings": ["Signs that may not translate well"],
  "confidence": 0.9
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'translateDialect', { fromDialect, toDialect, signCount: signSequence.length });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('translateDialect', { fromDialect, toDialect, signCount: signSequence.length }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('translateDialect', { fromDialect, toDialect }, null, error);
      throw error;
    }
  }

  // ============================================
  // DOCUMENT PROCESSING
  // ============================================

  /**
   * Generate sign language lesson from document
   * @param {string} documentText - Text content to create lesson from
   * @param {string} dialect - Target dialect for learning
   * @returns {Object} Structured lesson plan
   */
  async generateLessonFromDocument(documentText, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];

    const prompt = `You are an expert ${dialectInfo.name} curriculum designer. Create a comprehensive sign language lesson from this document.

DOCUMENT CONTENT:
${documentText.substring(0, 3000)}

TARGET: ${dialectInfo.name} learners

INSTRUCTIONS:
1. Extract key vocabulary terms that need signs
2. Create practice sentences using ${dialect} grammar (${dialectInfo.wordOrder})
3. Organize from simple to complex
4. Include cultural context where relevant
5. Add practice exercises and assessments
6. Consider ${dialectInfo.features.join(', ')}

Respond with ONLY a JSON object (no markdown):
{
  "title": "Lesson title based on content",
  "objectives": ["What learners will achieve"],
  "estimatedTime": "30 minutes",
  "difficulty": "beginner|intermediate|advanced",
  
  "vocabulary": [
    {
      "term": "English word",
      "sign": {
        "gloss": "SIGN-GLOSS",
        "handshape": "description",
        "movement": "description",
        "location": "where performed"
      },
      "difficulty": "easy|medium|hard",
      "memoryTip": "Tip to remember this sign",
      "example": "Example sentence using this sign"
    }
  ],
  
  "sentences": [
    {
      "english": "English sentence",
      "signSequence": ["SIGN1", "SIGN2", "SIGN3"],
      "glossString": "Gloss notation with grammar markers",
      "grammarNote": "Explanation of ${dialect} grammar applied"
    }
  ],
  
  "culturalNotes": [
    {
      "topic": "Cultural aspect",
      "explanation": "Why this matters in Deaf culture"
    }
  ],
  
  "exercises": [
    {
      "type": "receptive|expressive|matching|fill-blank",
      "instruction": "What to do",
      "content": "Exercise content",
      "answer": "Expected answer"
    }
  ],
  
  "progression": [
    {
      "stage": 1,
      "focus": "What this stage covers",
      "signs": ["signs to learn"],
      "milestone": "What success looks like"
    }
  ]
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'generateLessonFromDocument', { docLength: documentText.length, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('generateLessonFromDocument', { docLength: documentText.length, dialect }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('generateLessonFromDocument', { docLength: documentText.length, dialect }, null, error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get request logs for debugging
   */
  getRequestLogs() {
    return this.requestLog;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const result = await this._executeWithRetry('Say "API connected" in exactly those words.', 'testConnection', {});
      const text = result.response.text();
      return { success: true, message: text };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get information about a specific sign
   */
  async getSignInfo(signGloss, dialect = 'ASL') {
    const dialectInfo = this.dialectConfig[dialect];

    const prompt = `Provide detailed information about the ${dialect} sign: ${signGloss}

Respond with ONLY a JSON object (no markdown):
{
  "gloss": "${signGloss}",
  "meaning": "English meaning(s)",
  "etymology": "How this sign originated",
  "handshape": "Detailed handshape description",
  "location": "Where the sign is performed",
  "movement": "Movement pattern",
  "palmOrientation": "Which way palm faces",
  "nonManualMarkers": "Required facial expressions",
  "variations": "Regional or contextual variations",
  "commonErrors": ["Mistakes learners often make"],
  "relatedSigns": ["Signs often confused with this one"],
  "exampleSentences": ["Example uses in ${dialect}"],
  "culturalContext": "Any cultural significance"
}`;

    try {
      const result = await this._executeWithRetry(prompt, 'getSignInfo', { signGloss, dialect });
      const response = result.response.text();
      const parsed = this._parseJSON(response);

      this._logRequest('getSignInfo', { signGloss, dialect }, parsed);
      return parsed;
    } catch (error) {
      this._logRequest('getSignInfo', { signGloss, dialect }, null, error);
      throw error;
    }
  }
}

// Default export for convenience
export default GeminiService;
