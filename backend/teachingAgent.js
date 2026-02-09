/**
 * Teaching Agent for real-time sign language correction and feedback
 */
export class TeachingAgent {
    constructor(geminiService) {
        this.gemini = geminiService;

        // Reference sign database (would be expanded with actual data)
        this.referenceDatabase = new Map();

        // Feedback templates for common corrections
        this.feedbackTemplates = {
            handShape: {
                minor: 'Try adjusting your finger positions slightly',
                moderate: 'Check your hand shape - remember to {correction}',
                major: 'Let\'s work on the hand shape for this sign'
            },
            movement: {
                minor: 'Your movement is close, just make it a bit more {correction}',
                moderate: 'Adjust the direction/speed of your movement',
                major: 'The movement pattern needs practice'
            },
            location: {
                minor: 'Move your hands slightly {correction}',
                moderate: 'Check where this sign should be performed',
                major: 'This sign should be performed at a different location'
            },
            nonManual: {
                minor: 'Don\'t forget the facial expression',
                moderate: 'The facial expression is important for this sign',
                major: 'Practice the non-manual markers separately'
            }
        };
    }

    /**
     * Analyze user's sign attempt and provide correction feedback
     */
    async correctSign(targetSign, userLandmarks, dialect = 'ASL') {
        // Get reference sign if not in cache
        const reference = await this.getReferenceSign(targetSign, dialect);

        // Use Gemini to analyze the attempt
        const analysis = await this.analyzeAttempt(targetSign, userLandmarks, reference, dialect);

        // Generate constructive feedback
        const feedback = this.generateFeedback(analysis);

        return {
            targetSign,
            overallScore: analysis.overallScore,
            breakdown: analysis.breakdown,
            feedback,
            demonstration: reference,
            nextSteps: this.suggestNextSteps(analysis)
        };
    }

    /**
     * Get or fetch reference sign data
     */
    async getReferenceSign(signName, dialect) {
        const cacheKey = `${dialect}:${signName}`;

        if (this.referenceDatabase.has(cacheKey)) {
            return this.referenceDatabase.get(cacheKey);
        }

        // Fetch from Gemini
        const reference = await this.fetchReferenceFromGemini(signName, dialect);
        this.referenceDatabase.set(cacheKey, reference);

        return reference;
    }

    /**
     * Fetch reference sign description from Gemini
     */
    async fetchReferenceFromGemini(signName, dialect) {
        const prompt = `Provide detailed reference information for the ${dialect} sign "${signName}".

Respond with a JSON object:
{
  "gloss": "${signName}",
  "description": "Complete description of how to perform this sign correctly",
  "handShape": {
    "dominant": "Description of dominant hand shape",
    "nonDominant": "Description of non-dominant hand if used, or null"
  },
  "movement": {
    "type": "static/linear/circular/arc/repeated",
    "direction": "Direction of movement if applicable",
    "speed": "slow/medium/fast",
    "repetitions": 1
  },
  "location": {
    "startPosition": "Where the sign begins",
    "endPosition": "Where the sign ends",
    "contactPoint": "Any contact points on body"
  },
  "nonManual": {
    "facialExpression": "Required facial expression",
    "eyeGaze": "Eye gaze direction",
    "headMovement": "Head tilt/nod if any",
    "mouthShape": "Mouth morpheme if any"
  },
  "commonErrors": [
    "Common mistake 1",
    "Common mistake 2"
  ],
  "tips": [
    "Helpful tip 1",
    "Helpful tip 2"
  ]
}

Only respond with valid JSON, no markdown.`;

        try {
            const result = await this.gemini.model.generateContent(prompt);
            const response = result.response.text();

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { gloss: signName, description: 'Reference not available' };
        } catch (error) {
            console.error('Error fetching reference sign:', error);
            return { gloss: signName, description: 'Reference not available' };
        }
    }

    /**
     * Use Gemini to analyze the user's attempt
     */
    async analyzeAttempt(targetSign, userLandmarks, reference, dialect) {
        const prompt = `As a ${dialect} sign language teacher, analyze this student's attempt at the sign "${targetSign}".

Reference sign:
${JSON.stringify(reference, null, 2)}

Student's landmarks data:
${JSON.stringify(userLandmarks, null, 2)}

Analyze and score the attempt. Respond with JSON:
{
  "overallScore": 75,
  "breakdown": {
    "handShape": {
      "score": 80,
      "notes": "Specific feedback on hand shape",
      "severity": "minor/moderate/major"
    },
    "movement": {
      "score": 70,
      "notes": "Specific feedback on movement",
      "severity": "minor/moderate/major"
    },
    "location": {
      "score": 85,
      "notes": "Specific feedback on location",
      "severity": "minor/moderate/major"
    },
    "nonManual": {
      "score": 60,
      "notes": "Specific feedback on facial expressions/body",
      "severity": "minor/moderate/major"
    },
    "timing": {
      "score": 75,
      "notes": "Feedback on timing/rhythm",
      "severity": "minor/moderate/major"
    }
  },
  "strengths": ["What the student did well"],
  "improvements": ["What needs work"],
  "matchedSign": "If the attempt matches a different sign, note it here or null"
}

Scores are 0-100. Be encouraging but accurate.
Only respond with valid JSON, no markdown.`;

        try {
            const result = await this.gemini.model.generateContent(prompt);
            const response = result.response.text();

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Return default analysis if parsing fails
            return this.getDefaultAnalysis();
        } catch (error) {
            console.error('Error analyzing attempt:', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Generate user-friendly feedback from analysis
     */
    generateFeedback(analysis) {
        const feedback = {
            summary: '',
            details: [],
            encouragement: ''
        };

        // Generate summary based on overall score
        if (analysis.overallScore >= 90) {
            feedback.summary = 'Excellent! Your sign is nearly perfect!';
            feedback.encouragement = 'Keep up the great work!';
        } else if (analysis.overallScore >= 75) {
            feedback.summary = 'Good job! A few small adjustments will make it perfect.';
            feedback.encouragement = 'You\'re making great progress!';
        } else if (analysis.overallScore >= 50) {
            feedback.summary = 'Nice effort! Let\'s work on a few areas together.';
            feedback.encouragement = 'Practice makes perfect - you\'ve got this!';
        } else {
            feedback.summary = 'Let\'s take it step by step.';
            feedback.encouragement = 'Every expert was once a beginner. Keep trying!';
        }

        // Add specific feedback for each aspect
        const breakdown = analysis.breakdown || {};
        for (const [aspect, data] of Object.entries(breakdown)) {
            if (data.score < 80 && this.feedbackTemplates[aspect]) {
                const severity = data.severity || 'moderate';
                let template = this.feedbackTemplates[aspect][severity];

                feedback.details.push({
                    aspect,
                    score: data.score,
                    message: data.notes || template,
                    priority: severity === 'major' ? 'high' : severity === 'moderate' ? 'medium' : 'low'
                });
            }
        }

        // Sort by priority
        feedback.details.sort((a, b) => {
            const priority = { high: 0, medium: 1, low: 2 };
            return priority[a.priority] - priority[b.priority];
        });

        return feedback;
    }

    /**
     * Suggest next steps based on analysis
     */
    suggestNextSteps(analysis) {
        const steps = [];

        // Find lowest scoring areas
        const breakdown = analysis.breakdown || {};
        const sortedAspects = Object.entries(breakdown)
            .sort(([, a], [, b]) => a.score - b.score);

        if (sortedAspects.length > 0) {
            const [lowestAspect, lowestData] = sortedAspects[0];

            if (lowestData.score < 60) {
                steps.push({
                    type: 'focus',
                    aspect: lowestAspect,
                    instruction: `Practice the ${lowestAspect} component separately before combining`
                });
            }
        }

        if (analysis.overallScore < 75) {
            steps.push({
                type: 'slow',
                instruction: 'Try performing the sign more slowly'
            });
        }

        if (analysis.overallScore >= 75) {
            steps.push({
                type: 'speed',
                instruction: 'Try at normal conversational speed'
            });
        }

        steps.push({
            type: 'repeat',
            instruction: 'Practice 5 more times for muscle memory'
        });

        return steps;
    }

    /**
     * Default analysis when Gemini fails
     */
    getDefaultAnalysis() {
        return {
            overallScore: 50,
            breakdown: {
                handShape: { score: 50, notes: 'Unable to analyze', severity: 'moderate' },
                movement: { score: 50, notes: 'Unable to analyze', severity: 'moderate' },
                location: { score: 50, notes: 'Unable to analyze', severity: 'moderate' },
                nonManual: { score: 50, notes: 'Unable to analyze', severity: 'moderate' },
                timing: { score: 50, notes: 'Unable to analyze', severity: 'moderate' }
            },
            strengths: ['Keep practicing'],
            improvements: ['Try again with better lighting'],
            matchedSign: null
        };
    }

    /**
     * Get progress statistics for a user session
     */
    getProgressStats(attempts) {
        if (!attempts || attempts.length === 0) {
            return { averageScore: 0, improvement: 0, totalAttempts: 0 };
        }

        const scores = attempts.map(a => a.overallScore);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Calculate improvement (compare first half to second half)
        let improvement = 0;
        if (scores.length >= 4) {
            const half = Math.floor(scores.length / 2);
            const firstHalf = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
            const secondHalf = scores.slice(half).reduce((a, b) => a + b, 0) / (scores.length - half);
            improvement = secondHalf - firstHalf;
        }

        return {
            averageScore: Math.round(averageScore),
            improvement: Math.round(improvement),
            totalAttempts: attempts.length,
            bestScore: Math.max(...scores),
            recentScores: scores.slice(-5)
        };
    }
}
