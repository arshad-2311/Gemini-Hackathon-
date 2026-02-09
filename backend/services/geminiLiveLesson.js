// backend/services/geminiLiveLesson.js
// Real-time interactive sign language lessons using Gemini Live API
// Perfect for hackathon demos with live video feedback!

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Interactive Sign Language Lesson using Gemini Live API
 * Provides real-time feedback on user's signing through video analysis
 */
class InteractiveSignLesson extends EventEmitter {
    constructor(options = {}) {
        super();

        this.lessonTopic = options.lessonTopic || 'Basic Greetings';
        this.language = options.language || 'ASL';
        this.difficulty = options.difficulty || 'beginner';
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        this.state = {
            isActive: false,
            currentSign: null,
            signsCompleted: [],
            signsToPractice: [],
            score: 0,
            attempts: 0
        };

        this.systemInstruction = this._buildSystemInstruction();
    }

    /**
     * Build the system instruction for the lesson
     */
    _buildSystemInstruction() {
        return `
You are a patient, encouraging ${this.language} teacher conducting an interactive lesson on: ${this.lessonTopic}

DIFFICULTY LEVEL: ${this.difficulty}

TEACHING APPROACH:
1. Introduce each sign verbally while showing visual reference
2. Demonstrate the sign using text description + reference image
3. Watch the user's camera feed as they practice
4. Provide immediate verbal and visual feedback
5. Celebrate successes enthusiastically
6. Offer specific corrections when needed

IMPORTANT:
- Use simple, clear language appropriate for ${this.difficulty} level
- Be encouraging and supportive - learning a new language is challenging!
- Explain WHY each element matters for deaf comprehension
- Connect signs to real-world usage and Deaf culture
- Check for understanding frequently
- Use the "show, practice, correct" cycle
- Recognize that facial expressions are grammatically essential, not optional

FEEDBACK STYLE:
- "Great job! Your handshape is perfect!"
- "Almost there! Try raising your hand a bit higher."
- "Nice work on the facial expression - that's important for grammar!"
- "Let's try that one more time - focus on your palm orientation."

SIGN COMPONENTS TO WATCH:
1. Handshape - finger positions and configuration
2. Location - where the sign is performed relative to body
3. Movement - direction, speed, and path of motion
4. Palm Orientation - which way the palm faces
5. Non-Manual Markers - facial expression, head position, body posture

When you see the user's video frame, analyze their signing attempt and provide specific, encouraging feedback.
`;
    }

    /**
     * Start an interactive lesson session
     */
    async start(signsToTeach = []) {
        this.state.isActive = true;
        this.state.signsToPractice = signsToTeach.length > 0
            ? signsToTeach
            : this._getDefaultSigns();
        this.state.currentSign = this.state.signsToPractice[0];

        this.emit('lessonStart', {
            topic: this.lessonTopic,
            signs: this.state.signsToPractice,
            difficulty: this.difficulty
        });

        // Generate introduction
        const intro = await this._generateIntroduction();
        this.emit('message', { type: 'introduction', content: intro });

        return {
            success: true,
            lessonTopic: this.lessonTopic,
            signsToLearn: this.state.signsToPractice,
            firstSign: this.state.currentSign
        };
    }

    /**
     * Get default signs based on lesson topic
     */
    _getDefaultSigns() {
        const topicSigns = {
            'Basic Greetings': ['HELLO', 'GOODBYE', 'THANK-YOU', 'PLEASE', 'SORRY'],
            'Introduction': ['HELLO', 'NAME', 'ME', 'NICE', 'MEET', 'YOU'],
            'Family': ['MOTHER', 'FATHER', 'SISTER', 'BROTHER', 'FAMILY'],
            'Numbers': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            'Colors': ['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE'],
            'Emotions': ['HAPPY', 'SAD', 'ANGRY', 'SCARED', 'EXCITED', 'TIRED'],
            'Questions': ['WHAT', 'WHO', 'WHERE', 'WHEN', 'WHY', 'HOW']
        };

        return topicSigns[this.lessonTopic] || ['HELLO', 'THANK-YOU', 'PLEASE'];
    }

    /**
     * Generate lesson introduction
     */
    async _generateIntroduction() {
        const prompt = `
Generate a warm, welcoming introduction for an ${this.language} lesson on "${this.lessonTopic}".
Keep it brief (2-3 sentences), encouraging, and appropriate for ${this.difficulty} level.
Mention the first sign we'll learn: ${this.state.currentSign}
`;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    /**
     * Process a video frame from user's camera
     * Analyzes their signing attempt and provides feedback
     */
    async processVideoFrame(frameData, targetSign = null) {
        if (!this.state.isActive) {
            return { error: 'Lesson not active' };
        }

        const sign = targetSign || this.state.currentSign;
        this.state.attempts++;

        const imageData = frameData.includes(',')
            ? frameData.split(',')[1]
            : frameData;

        const prompt = `
You are watching a student practice the ${this.language} sign for "${sign}".

Analyze this video frame and provide:
1. Whether the sign looks correct (accuracy 0-100)
2. Specific, encouraging feedback
3. Any corrections needed

OUTPUT (JSON only):
{
  "sign": "${sign}",
  "accuracy": 0-100,
  "isCorrect": true/false,
  "feedback": "Encouraging message with specific observations",
  "corrections": ["List of specific corrections if needed"],
  "nextStep": "continue" | "retry" | "move_on",
  "celebration": "Celebratory message if correct (empty if not)"
}
`;

        try {
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: imageData
                    }
                }
            ]);

            const feedback = this._parseJSON(result.response.text());

            // Update state based on feedback
            if (feedback.isCorrect) {
                this.state.score++;
                this.state.signsCompleted.push(sign);

                this.emit('signCompleted', {
                    sign,
                    accuracy: feedback.accuracy,
                    attempts: this.state.attempts
                });

                // Move to next sign if available
                if (feedback.nextStep === 'move_on') {
                    this._advanceToNextSign();
                }
            }

            this.emit('feedback', feedback);
            return feedback;

        } catch (error) {
            console.error('Video analysis error:', error);
            return {
                error: error.message,
                feedback: "I had trouble analyzing that. Let's try again!"
            };
        }
    }

    /**
     * Advance to the next sign in the lesson
     */
    _advanceToNextSign() {
        const currentIndex = this.state.signsToPractice.indexOf(this.state.currentSign);

        if (currentIndex < this.state.signsToPractice.length - 1) {
            this.state.currentSign = this.state.signsToPractice[currentIndex + 1];
            this.state.attempts = 0;

            this.emit('nextSign', {
                sign: this.state.currentSign,
                progress: currentIndex + 2,
                total: this.state.signsToPractice.length
            });
        } else {
            this._completelesson();
        }
    }

    /**
     * Complete the lesson
     */
    async _completelesson() {
        this.state.isActive = false;

        const summary = {
            topic: this.lessonTopic,
            signsLearned: this.state.signsCompleted,
            totalSigns: this.state.signsToPractice.length,
            accuracy: Math.round((this.state.signsCompleted.length / this.state.signsToPractice.length) * 100),
            score: this.state.score
        };

        // Generate completion message
        const prompt = `
Generate an encouraging lesson completion message for a student who just finished an ${this.language} lesson on "${this.lessonTopic}".
They correctly signed ${summary.signsLearned.length} out of ${summary.totalSigns} signs.
Signs they nailed: ${summary.signsLearned.join(', ') || 'none yet'}
Be celebratory and suggest what to practice next. Keep it brief (2-3 sentences).
`;

        const result = await this.model.generateContent(prompt);
        summary.completionMessage = result.response.text();

        this.emit('lessonComplete', summary);
        return summary;
    }

    /**
     * Get current sign instruction/demonstration
     */
    async getCurrentSignInstruction() {
        const sign = this.state.currentSign;

        const prompt = `
Provide a brief, clear instruction for the ${this.language} sign "${sign}".
Include:
1. Hand shape description
2. Location (where to sign)
3. Movement (if any)
4. Any facial expression needed

Keep it to 3-4 sentences max. Use simple language for ${this.difficulty} learners.
`;

        const result = await this.model.generateContent(prompt);
        return {
            sign,
            instruction: result.response.text(),
            position: this.state.signsToPractice.indexOf(sign) + 1,
            total: this.state.signsToPractice.length
        };
    }

    /**
     * Request a hint for the current sign
     */
    async getHint() {
        const sign = this.state.currentSign;

        const prompt = `
Give a helpful hint for someone struggling with the ${this.language} sign "${sign}".
Provide a memory trick or visual analogy. One sentence only.
`;

        const result = await this.model.generateContent(prompt);
        return {
            sign,
            hint: result.response.text()
        };
    }

    /**
     * Skip the current sign and move to next
     */
    skipSign() {
        this._advanceToNextSign();
        return {
            skipped: this.state.currentSign,
            newSign: this.state.currentSign
        };
    }

    /**
     * End the lesson early
     */
    async endLesson() {
        return await this._completelesson();
    }

    /**
     * Get lesson progress
     */
    getProgress() {
        return {
            isActive: this.state.isActive,
            currentSign: this.state.currentSign,
            signsCompleted: this.state.signsCompleted,
            signsToPractice: this.state.signsToPractice,
            progress: `${this.state.signsCompleted.length}/${this.state.signsToPractice.length}`,
            score: this.state.score,
            attempts: this.state.attempts
        };
    }

    /**
     * Parse JSON from Gemini response
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

/**
 * Factory function to create an interactive lesson
 */
async function startInteractiveSignLesson(lessonTopic, options = {}) {
    const lesson = new InteractiveSignLesson({
        lessonTopic,
        ...options
    });

    await lesson.start(options.signs);
    return lesson;
}

/**
 * Quick demo mode - simplified lesson for hackathon presentations
 */
async function startDemoLesson(demoType = 'greeting') {
    const demoConfigs = {
        greeting: {
            topic: 'Say Hello in ASL',
            signs: ['HELLO', 'THANK-YOU'],
            difficulty: 'beginner'
        },
        introduction: {
            topic: 'Introduce Yourself',
            signs: ['HELLO', 'NAME', 'ME'],
            difficulty: 'beginner'
        },
        quick: {
            topic: 'Quick Demo',
            signs: ['HELLO'],
            difficulty: 'beginner'
        }
    };

    const config = demoConfigs[demoType] || demoConfigs.greeting;

    return await startInteractiveSignLesson(config.topic, {
        signs: config.signs,
        difficulty: config.difficulty
    });
}

export {
    InteractiveSignLesson,
    startInteractiveSignLesson,
    startDemoLesson
};

export default {
    InteractiveSignLesson,
    startInteractiveSignLesson,
    startDemoLesson
};
