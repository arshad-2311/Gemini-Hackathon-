// backend/services/geminiLessonGenerator.js
// Curriculum and lesson generation service for sign language learning

/**
 * Generate prompt for creating a structured lesson plan
 * @param {string} topic - Topic to teach
 * @param {string} difficulty - beginner/intermediate/advanced
 * @param {number} lessonCount - Number of lessons to generate
 * @param {string} language - Sign language dialect (ASL, BSL, ISL)
 * @returns {string} Formatted prompt for Gemini
 */
const lessonGenerationPrompt = (topic, difficulty, lessonCount, language = "ASL") => `
You are an expert ${language} curriculum designer. Create a structured lesson plan.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty} (beginner/intermediate/advanced)
NUMBER OF LESSONS: ${lessonCount}
LANGUAGE: ${language}

GENERATE (JSON only, no markdown):
{
  "course_title": "Title",
  "language": "${language}",
  "description": "What students will learn",
  "total_lessons": ${lessonCount},
  "estimated_hours": <number>,
  "prerequisites": ["List any required prior knowledge"],
  "lessons": [
    {
      "lesson_number": 1,
      "title": "Lesson title",
      "duration_minutes": 30,
      "objectives": ["What students will learn"],
      "vocabulary": [
        {
          "sign": "HELLO",
          "gloss": "HELLO",
          "description": "Greeting gesture",
          "difficulty": "beginner",
          "handshape": "Open hand",
          "location": "Forehead/temple",
          "movement": "Salute-like motion outward",
          "usage_example": "HELLO, NAME ME JOHN"
        }
      ],
      "grammar_points": [
        {
          "concept": "Topic-Comment Structure",
          "explanation": "ASL places topics first, then comments about them",
          "examples": ["PIZZA, ME LIKE (I like pizza)"],
          "practice_drills": ["Convert English sentences to ASL word order"]
        }
      ],
      "practice_phrases": [
        {
          "english": "Hello, my name is...",
          "asl_gloss": "HELLO, NAME ME [fingerspell]",
          "difficulty": "beginner",
          "notes": "Maintain eye contact throughout"
        }
      ],
      "cultural_notes": "Eye contact is essential in Deaf culture - looking away can be seen as rude or dismissive",
      "exercises": [
        {
          "type": "recognition",
          "instruction": "Watch and identify the sign",
          "signs_to_show": ["HELLO", "GOODBYE", "THANK-YOU"],
          "scoring": "1 point per correct identification"
        },
        {
          "type": "production",
          "instruction": "Sign the following phrases",
          "phrases": ["HELLO", "NAME ME [your name]"],
          "rubric": ["Correct handshape", "Proper location", "Appropriate facial expression"]
        },
        {
          "type": "matching",
          "instruction": "Match the sign to its meaning",
          "pairs": [["HELLO", "Greeting"], ["GOODBYE", "Farewell"]]
        }
      ],
      "review_signs": ["Signs from previous lessons to review"],
      "homework": "Practice introducing yourself to a mirror for 5 minutes"
    }
  ],
  "assessment": {
    "quiz_questions": [
      {
        "question": "What facial expression marks a yes/no question in ${language}?",
        "type": "multiple_choice",
        "options": ["Raised eyebrows", "Furrowed brows", "Neutral"],
        "correct": 0,
        "explanation": "Yes/no questions use raised eyebrows"
      }
    ],
    "signing_test": [
      {
        "prompt": "Introduce yourself",
        "expected_signs": ["HELLO", "NAME", "ME"],
        "rubric": {
          "hand_position": 25,
          "handshape": 25,
          "facial_expression": 25,
          "fluency": 25
        },
        "passing_score": 70
      }
    ]
  },
  "resources": {
    "video_references": ["Links to reference videos"],
    "practice_partners": "Tips for finding practice partners",
    "additional_reading": "Books or websites for further learning"
  }
}

PEDAGOGICAL PRINCIPLES:
- Progress from simple to complex (scaffolding)
- Include both receptive (watching) and productive (signing) practice
- Emphasize facial expressions and non-manual markers from lesson 1
- Provide cultural context to build Deaf cultural competence
- Use spaced repetition for vocabulary retention
- Include real-world scenarios and authentic communication
- Build on previous lessons with review activities
- Provide varied exercise types for different learning styles
`;

/**
 * Generate prompt for a quick vocabulary lesson
 */
const quickVocabPrompt = (signs, language = "ASL") => `
You are an ${language} teacher. Create a quick vocabulary lesson for these signs:

SIGNS TO TEACH: ${JSON.stringify(signs)}
LANGUAGE: ${language}

OUTPUT (JSON only, no markdown):
{
  "lesson_type": "vocabulary",
  "signs": [
    {
      "gloss": "SIGN",
      "english": "meaning",
      "handshape": "description",
      "location": "where performed",
      "movement": "how it moves",
      "palm_orientation": "which way palm faces",
      "memory_tip": "Easy way to remember",
      "common_mistakes": ["Typical errors learners make"],
      "related_signs": ["Similar signs to not confuse with"]
    }
  ],
  "practice_sequence": ["Recommended order to practice"],
  "mini_conversation": {
    "context": "Scenario description",
    "dialogue": [
      {"speaker": "A", "gloss": "HELLO", "english": "Hello"}
    ]
  }
}
`;

/**
 * Generate prompt for grammar explanation
 */
const grammarExplanationPrompt = (concept, language = "ASL") => `
You are an ${language} linguistics expert. Explain this grammatical concept:

CONCEPT: "${concept}"
LANGUAGE: ${language}

OUTPUT (JSON only, no markdown):
{
  "concept": "${concept}",
  "explanation": "Clear explanation suitable for learners",
  "linguistic_background": "Why this grammar exists in ${language}",
  "comparison_to_english": "How it differs from English",
  "rules": [
    {
      "rule": "The specific rule",
      "examples": [
        {
          "english": "English sentence",
          "asl_gloss": "ASL translation",
          "explanation": "How the rule applies"
        }
      ]
    }
  ],
  "common_errors": [
    {
      "error": "What learners often do wrong",
      "correction": "How to fix it",
      "example": "Demonstration"
    }
  ],
  "practice_exercises": [
    {
      "instruction": "What to do",
      "sentences": ["Sentences to convert/practice"],
      "answers": ["Expected answers"]
    }
  ],
  "mastery_checklist": ["Signs that student understands concept"]
}
`;

/**
 * LESSON TEMPLATES by topic
 */
const LESSON_TEMPLATES = {
  greetings: {
    vocabulary: ['HELLO', 'GOODBYE', 'GOOD-MORNING', 'GOOD-AFTERNOON', 'GOOD-NIGHT', 'HOW-ARE-YOU', 'FINE', 'NICE', 'MEET', 'YOU'],
    grammar: ['Question formation', 'Greetings protocol'],
    culture: 'Deaf greetings involve extended eye contact and physical touch'
  },
  family: {
    vocabulary: ['MOTHER', 'FATHER', 'SISTER', 'BROTHER', 'GRANDMOTHER', 'GRANDFATHER', 'FAMILY', 'CHILD', 'BABY', 'COUSIN'],
    grammar: ['Possessives', 'Describing family relationships'],
    culture: 'Deaf family dynamics and generational signing'
  },
  numbers: {
    vocabulary: ['1-10', '11-20', '100', '1000', 'DOLLARS', 'CENTS', 'PHONE-NUMBER', 'AGE', 'HOW-MANY'],
    grammar: ['Number incorporation', 'Time and quantity'],
    culture: 'Number variations across regions'
  },
  emotions: {
    vocabulary: ['HAPPY', 'SAD', 'ANGRY', 'SCARED', 'EXCITED', 'TIRED', 'HUNGRY', 'LOVE', 'HATE', 'WANT'],
    grammar: ['Intensity modification', 'Facial expressions for emotions'],
    culture: 'Expressing emotions in Deaf culture'
  },
  food: {
    vocabulary: ['EAT', 'DRINK', 'HUNGRY', 'THIRSTY', 'BREAKFAST', 'LUNCH', 'DINNER', 'WATER', 'COFFEE', 'PIZZA'],
    grammar: ['Classifiers for food', 'Ordering at restaurants'],
    culture: 'Deaf dining etiquette'
  },
  work: {
    vocabulary: ['WORK', 'JOB', 'BOSS', 'MEETING', 'COMPUTER', 'EMAIL', 'PHONE', 'OFFICE', 'HELP', 'PROBLEM'],
    grammar: ['Time signs', 'Describing work schedules'],
    culture: 'Deaf professionals and workplace accommodations'
  }
};

/**
 * DIFFICULTY SETTINGS
 */
const DIFFICULTY_CONFIG = {
  beginner: {
    vocab_per_lesson: 5,
    max_grammar_points: 1,
    practice_repetitions: 3,
    expected_fluency: 'slow, deliberate',
    focus: 'Basic communication and cultural awareness'
  },
  intermediate: {
    vocab_per_lesson: 10,
    max_grammar_points: 2,
    practice_repetitions: 2,
    expected_fluency: 'conversational pace',
    focus: 'Grammatical accuracy and natural signing'
  },
  advanced: {
    vocab_per_lesson: 15,
    max_grammar_points: 3,
    practice_repetitions: 1,
    expected_fluency: 'native-like fluency',
    focus: 'Nuance, register variation, and complex grammar'
  }
};

/**
 * Parse and validate lesson generation response
 */
function parseLessonResponse(responseText) {
  try {
    let cleanedText = responseText;
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedText.trim());

    // Validate structure
    if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
      throw new Error('Missing lessons array');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse lesson response:', error);
    throw error;
  }
}

/**
 * Generate a personalized learning path based on user progress
 */
function generateLearningPath(userProgress, targetGoal) {
  const completedTopics = userProgress.completedTopics || [];
  const weakAreas = userProgress.weakAreas || [];
  const strength = userProgress.strengths || [];

  // Determine next lessons
  const topicOrder = ['greetings', 'numbers', 'family', 'emotions', 'food', 'work'];
  const nextTopics = topicOrder.filter(t => !completedTopics.includes(t));

  return {
    current_level: userProgress.level || 'beginner',
    completed: completedTopics.length,
    remaining: nextTopics.length,
    recommended_next: nextTopics.slice(0, 3),
    review_needed: weakAreas,
    estimated_time_to_goal: `${nextTopics.length * 2} hours`,
    weekly_plan: generateWeeklyPlan(nextTopics, weakAreas)
  };
}

function generateWeeklyPlan(topics, reviewAreas) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const plan = {};

  days.forEach((day, idx) => {
    if (idx < 5) {
      plan[day] = {
        new_content: topics[idx % topics.length] || 'Review',
        review: reviewAreas[idx % (reviewAreas.length || 1)] || null,
        duration_minutes: 30
      };
    } else {
      plan[day] = {
        activity: 'Practice conversation',
        duration_minutes: 45
      };
    }
  });

  return plan;
}

/**
 * Calculate estimated completion time
 */
function estimateLessonTime(lesson) {
  const vocabTime = (lesson.vocabulary?.length || 0) * 3; // 3 min per sign
  const grammarTime = (lesson.grammar_points?.length || 0) * 10; // 10 min per concept
  const exerciseTime = (lesson.exercises?.length || 0) * 5; // 5 min per exercise

  return vocabTime + grammarTime + exerciseTime;
}

/**
 * Generate adaptive lessons based on user level and weak areas
 * Includes SiGML for each sign and practice phrase
 * @param {string} userLevel - beginner/intermediate/advanced
 * @param {string[]} weakAreas - Areas needing improvement
 * @param {string} language - Sign language (ASL, BSL, etc.)
 * @returns {string} Prompt for Gemini
 */
const adaptiveLessonPrompt = (userLevel, weakAreas, language = 'ASL') => `
You are an expert ${language} curriculum designer creating personalized lessons.

USER LEVEL: ${userLevel}
WEAK AREAS THAT NEED FOCUS: ${weakAreas.join(', ')}
LANGUAGE: ${language}

Create 5 progressive lessons that:
1. Target the weak areas specifically
2. Build on existing knowledge appropriate to ${userLevel} level
3. Include practice phrases WITH SIGML markup
4. Gradually increase difficulty across lessons
5. Include immediate feedback checkpoints

For each lesson, provide complete SiGML for all vocabulary and phrases.

OUTPUT (JSON only, no markdown):
{
  "personalized_plan": {
    "user_level": "${userLevel}",
    "weak_areas_addressed": ${JSON.stringify(weakAreas)},
    "language": "${language}",
    "total_estimated_hours": <number>
  },
  "lessons": [
    {
      "lesson_number": 1,
      "title": "Lesson title targeting weakness",
      "duration_minutes": 25,
      "focus_area": "Which weak area this addresses",
      "difficulty": "appropriate to user level",
      "learning_objectives": [
        "Specific, measurable objectives"
      ],
      "vocabulary": [
        {
          "sign": "GLOSS",
          "english": "Meaning",
          "sigml": "<?xml version=\\"1.0\\"?><sigml><hamgestural_sign gloss=\\"GLOSS\\">...</hamgestural_sign></sigml>",
          "description": "How to perform the sign",
          "handshape": "Description",
          "location": "Where performed",
          "movement": "Movement pattern",
          "common_errors": "What to avoid"
        }
      ],
      "practice_sentences": [
        {
          "english": "English sentence",
          "asl_gloss": "GLOSS ORDER",
          "sigml": "<?xml version=\\"1.0\\"?><sigml>...</sigml>",
          "grammar_note": "Grammatical explanation"
        }
      ],
      "cultural_notes": "Relevant Deaf culture information",
      "checkpoint": {
        "type": "self-check",
        "question": "Can you perform X correctly?",
        "success_criteria": ["What indicates mastery"]
      },
      "assessment_criteria": {
        "handshape": { "weight": 25, "description": "Correct finger positions" },
        "location": { "weight": 25, "description": "Signing in correct space" },
        "movement": { "weight": 25, "description": "Proper motion path" },
        "non_manual": { "weight": 25, "description": "Appropriate facial expression" }
      }
    }
  ],
  "progress_milestones": [
    {
      "after_lesson": 2,
      "user_should_be_able_to": "Skill description"
    }
  ],
  "reinforcement_activities": [
    "Daily practice suggestions"
  ],
  "next_recommendations": {
    "if_successful": "What to learn next",
    "if_struggling": "Additional resources or simpler review"
  }
}

PEDAGOGICAL APPROACH:
- Focus explicitly on weak areas without ignoring strengths
- Use spaced repetition for retention
- Include both receptive (watching) and productive (signing) activities
- Provide SiGML for avatar visualization
- Build confidence with achievable milestones
`;

/**
 * Parse adaptive lesson response
 */
function parseAdaptiveLessonResponse(responseText) {
  try {
    let cleanedText = responseText;
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedText.trim());

    // Validate structure
    if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
      throw new Error('Missing lessons array');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse adaptive lesson response:', error);
    throw error;
  }
}

export {
  lessonGenerationPrompt,
  quickVocabPrompt,
  grammarExplanationPrompt,
  adaptiveLessonPrompt,
  LESSON_TEMPLATES,
  DIFFICULTY_CONFIG,
  parseLessonResponse,
  parseAdaptiveLessonResponse,
  generateLearningPath,
  estimateLessonTime
};

export default {
  lessonGenerationPrompt,
  quickVocabPrompt,
  grammarExplanationPrompt,
  adaptiveLessonPrompt,
  LESSON_TEMPLATES,
  DIFFICULTY_CONFIG,
  parseLessonResponse,
  parseAdaptiveLessonResponse,
  generateLearningPath,
  estimateLessonTime
};
