// backend/services/geminiVision.js
// Vision-based sign language teaching and spatial awareness service

/**
 * Generate prompt for object detection and vocabulary teaching
 * @param {string} language - Sign language dialect (ASL, BSL, ISL)
 * @returns {string} Formatted prompt for Gemini Vision
 */
const objectDetectionPrompt = (language = "ASL") => `
You are analyzing an image to teach sign language vocabulary in context.

IMAGE CONTEXT: User's camera feed or uploaded image
LANGUAGE: ${language}

TASK:
1. Identify all objects, people, actions, and concepts visible
2. For each item, provide the corresponding ${language} sign
3. Suggest teaching opportunities

OUTPUT FORMAT (JSON only, no markdown):
{
  "detected_items": [
    {
      "object": "coffee cup",
      "sign_gloss": "COFFEE",
      "alternative_signs": ["CUP", "DRINK"],
      "location_in_image": "center",
      "bounding_box": {"x": 0.4, "y": 0.3, "width": 0.2, "height": 0.3},
      "teach_priority": "high|medium|low",
      "difficulty": "beginner|intermediate|advanced",
      "context_sentence": "ME DRINK COFFEE MORNING"
    }
  ],
  "scene_description": "Kitchen with person holding coffee",
  "scene_type": "home|office|outdoor|restaurant|classroom|other",
  "teaching_suggestions": [
    "This is a great opportunity to teach food/drink signs",
    "You could practice the sentence: ME WANT COFFEE"
  ],
  "practice_phrases": [
    {
      "english": "I want coffee",
      "asl_gloss": "COFFEE, ME WANT",
      "context": "Ordering at a cafe",
      "difficulty": "beginner"
    }
  ],
  "conversation_starters": [
    "COFFEE, YOU LIKE?",
    "MORNING, YOU DRINK WHAT?"
  ]
}

Focus on practical, everyday vocabulary. Prioritize common items.
`;

/**
 * Generate prompt for spatial reference detection
 * Used for pointing gestures and directional signing
 */
const spatialReferencePrompt = (language = "ASL") => `
Analyze this image for spatial references that would be used in ${language} signing.

${language} uses REAL SPACE for reference. Identify:
1. People's positions (for directional verbs)
2. Objects that could be pointed to
3. Spatial relationships (above, below, left, right, near, far)

OUTPUT FORMAT (JSON only, no markdown):
{
  "spatial_layout": {
    "left_side": ["Objects/people on viewer's left"],
    "center": ["Objects/people in center"],
    "right_side": ["Objects/people on viewer's right"],
    "foreground": ["Close objects"],
    "background": ["Distant objects"]
  },
  "reference_points": [
    {
      "item": "person",
      "position": {"x": 0.3, "y": 0.5},
      "can_point_to": true,
      "suggested_sign_space": "left",
      "directional_verb_example": "ME GIVE-[left] (I give to that person)"
    }
  ],
  "spatial_relationships": [
    {
      "relationship": "BOOK on TABLE",
      "asl_expression": "TABLE, BOOK CL:B-ON-TOP",
      "classifier_used": "CL:B for flat object"
    }
  ],
  "pointing_opportunities": [
    {
      "object": "door",
      "position": "right",
      "phrase": "DOOR THAT-[point right], YOU GO"
    }
  ]
}

Remember: ${language} signers establish locations in space and refer back to them.
`;

/**
 * Generate prompt for action/gesture recognition
 */
const actionRecognitionPrompt = (language = "ASL") => `
Analyze this image for actions and movements that can be taught as signs.

FOCUS ON:
1. What actions/activities are happening
2. Body language and gestures visible
3. Implied emotions or states

OUTPUT FORMAT (JSON only, no markdown):
{
  "detected_actions": [
    {
      "action": "drinking",
      "sign_gloss": "DRINK",
      "related_signs": ["THIRSTY", "CUP", "WATER"],
      "sentence_example": "PERSON DRINK WATER",
      "timing": "continuous action"
    }
  ],
  "body_language": [
    {
      "observation": "person smiling",
      "emotion": "happy",
      "sign_gloss": "HAPPY",
      "facial_expression_note": "Facial expressions are grammatical in ${language}"
    }
  ],
  "teachable_concepts": [
    {
      "concept": "Verb tense markers",
      "example": "DRINK vs DRINK-FINISH (drank)",
      "explanation": "Past tense uses FINISH marker"
    }
  ]
}
`;

/**
 * Generate prompt for environment-based conversation practice
 */
const environmentConversationPrompt = (language = "ASL") => `
Based on this image, create a realistic conversation scenario for ${language} practice.

TASK:
1. Identify the setting/environment
2. Determine appropriate conversation topics
3. Create a dialogue that could happen here
4. Include cultural context

OUTPUT FORMAT (JSON only, no markdown):
{
  "environment": "coffee shop",
  "typical_interactions": ["Ordering", "Small talk", "Paying"],
  "vocabulary_needed": ["COFFEE", "TEA", "WANT", "HOW-MUCH", "THANK-YOU"],
  "conversation": {
    "context": "Ordering a drink at a coffee shop",
    "dialogue": [
      {
        "speaker": "Customer",
        "gloss": "HELLO. COFFEE, ME WANT",
        "english": "Hello. I'd like a coffee.",
        "notes": "Point to menu if visible"
      },
      {
        "speaker": "Barista", 
        "gloss": "WHAT SIZE?",
        "english": "What size?",
        "notes": "Raised eyebrows for question"
      },
      {
        "speaker": "Customer",
        "gloss": "MEDIUM. HOW-MUCH?",
        "english": "Medium. How much?",
        "notes": "WH-question face for HOW-MUCH"
      }
    ]
  },
  "cultural_tips": [
    "Get the person's attention appropriately before signing",
    "Face the person directly when signing"
  ],
  "practice_variations": [
    "Try ordering different drinks",
    "Practice asking about prices"
  ]
}

Make conversations realistic and practical for everyday use.
`;

/**
 * Common objects and their signs for quick lookup
 */
const COMMON_OBJECT_SIGNS = {
    // Kitchen/Food
    'coffee': { gloss: 'COFFEE', category: 'food', difficulty: 'beginner' },
    'cup': { gloss: 'CUP', category: 'food', difficulty: 'beginner' },
    'water': { gloss: 'WATER', category: 'food', difficulty: 'beginner' },
    'food': { gloss: 'FOOD', category: 'food', difficulty: 'beginner' },
    'table': { gloss: 'TABLE', category: 'furniture', difficulty: 'beginner' },
    'chair': { gloss: 'CHAIR', category: 'furniture', difficulty: 'beginner' },

    // Technology
    'phone': { gloss: 'PHONE', category: 'technology', difficulty: 'beginner' },
    'computer': { gloss: 'COMPUTER', category: 'technology', difficulty: 'beginner' },
    'laptop': { gloss: 'LAPTOP', category: 'technology', difficulty: 'intermediate' },
    'television': { gloss: 'TV', category: 'technology', difficulty: 'beginner' },

    // People
    'person': { gloss: 'PERSON', category: 'people', difficulty: 'beginner' },
    'man': { gloss: 'MAN', category: 'people', difficulty: 'beginner' },
    'woman': { gloss: 'WOMAN', category: 'people', difficulty: 'beginner' },
    'child': { gloss: 'CHILD', category: 'people', difficulty: 'beginner' },

    // Places
    'door': { gloss: 'DOOR', category: 'places', difficulty: 'beginner' },
    'window': { gloss: 'WINDOW', category: 'places', difficulty: 'beginner' },
    'room': { gloss: 'ROOM', category: 'places', difficulty: 'beginner' },
    'house': { gloss: 'HOUSE', category: 'places', difficulty: 'beginner' },

    // Nature
    'tree': { gloss: 'TREE', category: 'nature', difficulty: 'beginner' },
    'flower': { gloss: 'FLOWER', category: 'nature', difficulty: 'beginner' },
    'sun': { gloss: 'SUN', category: 'nature', difficulty: 'beginner' },
    'rain': { gloss: 'RAIN', category: 'nature', difficulty: 'beginner' },

    // Animals
    'dog': { gloss: 'DOG', category: 'animals', difficulty: 'beginner' },
    'cat': { gloss: 'CAT', category: 'animals', difficulty: 'beginner' },
    'bird': { gloss: 'BIRD', category: 'animals', difficulty: 'beginner' }
};

/**
 * Scene types and associated vocabulary
 */
const SCENE_VOCABULARY = {
    home: ['HOME', 'ROOM', 'SIT', 'RELAX', 'FAMILY', 'TV', 'EAT', 'SLEEP'],
    office: ['WORK', 'COMPUTER', 'EMAIL', 'MEETING', 'BOSS', 'PHONE', 'BUSY', 'HELP'],
    outdoor: ['OUTSIDE', 'WALK', 'RUN', 'TREE', 'SUN', 'COLD', 'HOT', 'BEAUTIFUL'],
    restaurant: ['EAT', 'FOOD', 'DRINK', 'MENU', 'ORDER', 'WANT', 'PAY', 'THANK-YOU'],
    classroom: ['LEARN', 'TEACH', 'BOOK', 'WRITE', 'READ', 'UNDERSTAND', 'QUESTION', 'ANSWER'],
    store: ['BUY', 'MONEY', 'HOW-MUCH', 'WANT', 'NEED', 'FIND', 'WHERE', 'PAY']
};

/**
 * Parse vision API response
 */
function parseVisionResponse(responseText) {
    try {
        let cleanedText = responseText;
        if (cleanedText.includes('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedText.includes('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        return JSON.parse(cleanedText.trim());
    } catch (error) {
        console.error('Failed to parse vision response:', error);
        throw error;
    }
}

/**
 * Enrich detected objects with sign data
 */
function enrichWithSignData(detectedItems) {
    return detectedItems.map(item => {
        const objectLower = item.object.toLowerCase();
        const signData = COMMON_OBJECT_SIGNS[objectLower];

        if (signData) {
            return {
                ...item,
                sign_data: signData,
                has_known_sign: true
            };
        }

        return {
            ...item,
            has_known_sign: false,
            suggestion: 'May need fingerspelling or classifier'
        };
    });
}

/**
 * Generate vocabulary list based on scene type
 */
function getSceneVocabulary(sceneType) {
    const vocab = SCENE_VOCABULARY[sceneType] || [];
    return vocab.map(gloss => ({
        gloss,
        ...COMMON_OBJECT_SIGNS[gloss.toLowerCase()] || { category: 'general', difficulty: 'intermediate' }
    }));
}

/**
 * Prioritize teaching items by difficulty and relevance
 */
function prioritizeTeachingItems(items, userLevel = 'beginner') {
    const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    const userLevelNum = levelOrder[userLevel] || 0;

    return items
        .filter(item => levelOrder[item.difficulty] <= userLevelNum + 1) // Include one level up
        .sort((a, b) => {
            // Priority: teach_priority > difficulty match > alphabetical
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const aPriority = priorityOrder[a.teach_priority] || 1;
            const bPriority = priorityOrder[b.teach_priority] || 1;

            if (aPriority !== bPriority) return aPriority - bPriority;

            const aDiffMatch = Math.abs(levelOrder[a.difficulty] - userLevelNum);
            const bDiffMatch = Math.abs(levelOrder[b.difficulty] - userLevelNum);

            return aDiffMatch - bDiffMatch;
        });
}

export {
    objectDetectionPrompt,
    spatialReferencePrompt,
    actionRecognitionPrompt,
    environmentConversationPrompt,
    COMMON_OBJECT_SIGNS,
    SCENE_VOCABULARY,
    parseVisionResponse,
    enrichWithSignData,
    getSceneVocabulary,
    prioritizeTeachingItems
};

export default {
    objectDetectionPrompt,
    spatialReferencePrompt,
    actionRecognitionPrompt,
    environmentConversationPrompt,
    COMMON_OBJECT_SIGNS,
    SCENE_VOCABULARY,
    parseVisionResponse,
    enrichWithSignData,
    getSceneVocabulary,
    prioritizeTeachingItems
};
