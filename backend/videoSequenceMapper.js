// ============================================
// VIDEO SEQUENCE MAPPER - Nuclear Option
// Maps text to actual video files for maximum accuracy
// ============================================

import geminiCache from './geminiCache.js';

/**
 * Maps text to video files using Gemini for maximum accuracy
 * "Nuclear option" for when gestures must be linguistically perfect
 */
export class VideoSequenceMapper {
    constructor(geminiService) {
        this.gemini = geminiService;

        // Default available videos
        this.availableVideos = [
            'hello.mp4', 'thank-you.mp4', 'please.mp4', 'sorry.mp4', 'yes.mp4', 'no.mp4',
            'you.mp4', 'me.mp4', 'i-love-you.mp4', 'good.mp4', 'bad.mp4', 'help.mp4',
            'home.mp4', 'love.mp4', 'friend.mp4', 'family.mp4', 'eat.mp4', 'drink.mp4',
            'want.mp4', 'need.mp4', 'like.mp4', 'name.mp4', 'what.mp4', 'where.mp4',
            'when.mp4', 'how.mp4', 'why.mp4', 'who.mp4', 'work.mp4', 'school.mp4',
            'learn.mp4', 'teach.mp4', 'understand.mp4', 'know.mp4', 'see.mp4', 'hear.mp4',
            'morning.mp4', 'afternoon.mp4', 'evening.mp4', 'night.mp4', 'day.mp4', 'week.mp4',
            'happy.mp4', 'sad.mp4', 'angry.mp4', 'tired.mp4', 'sick.mp4', 'fine.mp4',
            'welcome.mp4', 'goodbye.mp4', 'nice.mp4', 'meet.mp4'
        ];
    }

    /**
     * Set the list of available video files
     * @param {string[]} videos - Array of video filenames
     */
    setAvailableVideos(videos) {
        this.availableVideos = videos;
    }

    /**
     * Map text to existing video files (Nuclear Option)
     * Uses Gemini to intelligently match sentences to video filenames
     * @param {string} text - English text to translate
     * @param {string} dialect - ASL, BSL, or ISL
     * @returns {Object} Sequence of video files to play
     */
    async textToVideoSequence(text, dialect = 'ASL') {
        const dialectConfig = this.gemini.dialectConfig?.[dialect] || {
            name: 'American Sign Language',
            wordOrder: 'Topic-Comment (OSV)',
            grammarRules: 'Time + Topic + Comment structure'
        };

        const cacheParams = { text: text.toLowerCase().trim(), dialect, type: 'video-sequence' };

        // Check cache first
        const cached = geminiCache.get('textToVideoSequence', cacheParams);
        if (cached) {
            return cached;
        }

        const videoListStr = this.availableVideos.join(', ');

        const prompt = `You are an expert ${dialectConfig.name} interpreter.

Task: Map the following sentence to the closest matching video filenames from the available list.

SENTENCE: "${text}"

AVAILABLE VIDEOS:
${videoListStr}

LINGUISTIC RULES FOR ${dialect}:
- Word Order: ${dialectConfig.wordOrder}
- Grammar: ${dialectConfig.grammarRules}

INSTRUCTIONS:
1. Apply ${dialect} grammar rules to determine the correct sign order (NOT English word order!)
2. Map each concept in the sentence to the closest matching video file
3. If a word doesn't have an exact match, omit it or suggest fingerspelling
4. Include timing information for natural pacing

Respond with ONLY a JSON object (no markdown):
{
  "videos": [
    {
      "filename": "hello.mp4",
      "gloss": "HELLO",
      "duration": 1.5,
      "notes": "any relevant notes"
    }
  ],
  "missingConcepts": ["concepts that had no video match"],
  "fingerspellRequired": ["proper nouns to fingerspell"],
  "dialectNotes": "any grammar/order adjustments made"
}`;

        try {
            if (!this.gemini.model) {
                throw new Error('Gemini model not available');
            }

            const result = await this.gemini._executeWithRetry(prompt, 'textToVideoSequence', { text, dialect });
            const response = result.response.text();
            const parsed = this.gemini._parseJSON(response);

            // Cache the result
            geminiCache.set('textToVideoSequence', cacheParams, parsed);
            return parsed;

        } catch (error) {
            console.warn(`⚠️ textToVideoSequence API failed, using simple word matching: ${error.message}`);
            return this._fallbackMatch(text);
        }
    }

    /**
     * Simple word-to-video fallback matching
     * @param {string} text - Text to match
     * @returns {Object} Basic video sequence
     */
    _fallbackMatch(text) {
        const words = text.toLowerCase().split(/\s+/);
        const videos = [];
        const missing = [];

        for (const word of words) {
            const cleanWord = word.replace(/[^a-z]/g, '');
            if (!cleanWord) continue;

            const matchingVideo = this.availableVideos.find(v => {
                const videoName = v.toLowerCase().replace('.mp4', '').replace(/-/g, '');
                return videoName === cleanWord || videoName.includes(cleanWord);
            });

            if (matchingVideo) {
                videos.push({
                    filename: matchingVideo,
                    gloss: cleanWord.toUpperCase(),
                    duration: 1.5
                });
            } else {
                missing.push(cleanWord);
            }
        }

        return {
            videos,
            missingConcepts: missing,
            fingerspellRequired: missing.filter(w => w.length <= 6),
            source: 'fallback-matcher'
        };
    }

    /**
     * Get glosses that can be matched to videos
     * @returns {string[]} List of available glosses
     */
    getAvailableGlosses() {
        return this.availableVideos.map(v =>
            v.replace('.mp4', '').replace(/-/g, ' ').toUpperCase()
        );
    }
}

export default VideoSequenceMapper;
