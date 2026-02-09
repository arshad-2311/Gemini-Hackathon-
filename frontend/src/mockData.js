// ============================================
// MOCK DATA FOR DEMO MODE
// Works completely offline - no API calls needed
// ============================================

// ============================================
// MOCK TRANSLATIONS (50 common phrases)
// ============================================
export const mockTranslations = {
    // Greetings
    "hello": [
        { gloss: "HELLO", duration: 1.5, expression: "happy" }
    ],
    "hi": [
        { gloss: "HELLO", duration: 1.5, expression: "happy" }
    ],
    "hello, how are you?": [
        { gloss: "HELLO", duration: 1.5, expression: "happy" },
        { gloss: "HOW", duration: 1.0, expression: "questioning" },
        { gloss: "YOU", duration: 0.8, expression: "questioning" }
    ],
    "how are you?": [
        { gloss: "HOW", duration: 1.0, expression: "questioning" },
        { gloss: "YOU", duration: 0.8, expression: "questioning" }
    ],
    "i'm fine, thank you": [
        { gloss: "I/ME", duration: 0.6, expression: "neutral" },
        { gloss: "FINE", duration: 1.0, expression: "happy" },
        { gloss: "THANK-YOU", duration: 1.5, expression: "grateful" }
    ],
    "goodbye": [
        { gloss: "GOODBYE", duration: 1.5, expression: "friendly" }
    ],
    "good morning": [
        { gloss: "GOOD", duration: 1.0, expression: "happy" },
        { gloss: "MORNING", duration: 1.2, expression: "happy" }
    ],
    "good night": [
        { gloss: "GOOD", duration: 1.0, expression: "neutral" },
        { gloss: "NIGHT", duration: 1.2, expression: "neutral" }
    ],

    // Common phrases
    "thank you": [
        { gloss: "THANK-YOU", duration: 1.5, expression: "grateful" }
    ],
    "thank you very much": [
        { gloss: "THANK-YOU", duration: 1.5, expression: "grateful" },
        { gloss: "VERY", duration: 0.8, expression: "emphasis" },
        { gloss: "MUCH", duration: 0.8, expression: "grateful" }
    ],
    "please": [
        { gloss: "PLEASE", duration: 1.2, expression: "polite" }
    ],
    "sorry": [
        { gloss: "SORRY", duration: 1.5, expression: "sad" }
    ],
    "excuse me": [
        { gloss: "EXCUSE", duration: 1.0, expression: "polite" },
        { gloss: "ME", duration: 0.5, expression: "polite" }
    ],
    "yes": [
        { gloss: "YES", duration: 1.0, expression: "affirmative" }
    ],
    "no": [
        { gloss: "NO", duration: 1.0, expression: "negative" }
    ],
    "i don't understand": [
        { gloss: "I/ME", duration: 0.5, expression: "confused" },
        { gloss: "UNDERSTAND", duration: 1.2, expression: "questioning" },
        { gloss: "NOT", duration: 0.8, expression: "confused" }
    ],
    "please slow down": [
        { gloss: "PLEASE", duration: 1.0, expression: "polite" },
        { gloss: "SLOW", duration: 1.2, expression: "neutral" }
    ],
    "again, please": [
        { gloss: "AGAIN", duration: 1.0, expression: "questioning" },
        { gloss: "PLEASE", duration: 1.0, expression: "polite" }
    ],

    // Questions
    "what is your name?": [
        { gloss: "NAME", duration: 1.0, expression: "questioning" },
        { gloss: "WHAT", duration: 0.8, expression: "questioning" },
        { gloss: "YOU", duration: 0.6, expression: "questioning" }
    ],
    "where is the bathroom?": [
        { gloss: "BATHROOM", duration: 1.2, expression: "questioning" },
        { gloss: "WHERE", duration: 0.8, expression: "questioning" }
    ],
    "what time is it?": [
        { gloss: "TIME", duration: 1.0, expression: "questioning" },
        { gloss: "WHAT", duration: 0.8, expression: "questioning" }
    ],
    "can you help me?": [
        { gloss: "HELP", duration: 1.2, expression: "questioning" },
        { gloss: "YOU", duration: 0.6, expression: "questioning" },
        { gloss: "CAN", duration: 0.6, expression: "questioning" }
    ],

    // Spatial demo phrase
    "can you pass me that book?": [
        { gloss: "BOOK", duration: 1.0, expression: "neutral", spatial: { target: "book", position: "left" } },
        { gloss: "THAT", duration: 0.5, expression: "neutral", pointing: true },
        { gloss: "GIVE-ME", duration: 1.2, expression: "questioning" },
        { gloss: "CAN", duration: 0.6, expression: "questioning" },
        { gloss: "YOU", duration: 0.5, expression: "questioning" }
    ],

    // Emotions
    "i love you": [
        { gloss: "I/ME", duration: 0.5, expression: "happy" },
        { gloss: "LOVE", duration: 1.5, expression: "loving" },
        { gloss: "YOU", duration: 0.8, expression: "loving" }
    ],
    "i'm happy": [
        { gloss: "I/ME", duration: 0.5, expression: "happy" },
        { gloss: "HAPPY", duration: 1.2, expression: "happy" }
    ],
    "i'm sad": [
        { gloss: "I/ME", duration: 0.5, expression: "sad" },
        { gloss: "SAD", duration: 1.2, expression: "sad" }
    ],

    // Nice to meet you
    "nice to meet you": [
        { gloss: "NICE", duration: 1.0, expression: "happy" },
        { gloss: "MEET", duration: 1.0, expression: "happy" },
        { gloss: "YOU", duration: 0.6, expression: "happy" }
    ],

    // More phrases
    "my name is": [
        { gloss: "MY", duration: 0.6, expression: "neutral" },
        { gloss: "NAME", duration: 1.0, expression: "neutral" }
    ],
    "i am learning sign language": [
        { gloss: "I/ME", duration: 0.5, expression: "neutral" },
        { gloss: "LEARN", duration: 1.2, expression: "focused" },
        { gloss: "SIGN", duration: 1.0, expression: "neutral" },
        { gloss: "LANGUAGE", duration: 1.0, expression: "neutral" }
    ],
    "are you deaf?": [
        { gloss: "DEAF", duration: 1.2, expression: "questioning" },
        { gloss: "YOU", duration: 0.6, expression: "questioning" }
    ],
    "i am hearing": [
        { gloss: "I/ME", duration: 0.5, expression: "neutral" },
        { gloss: "HEARING", duration: 1.2, expression: "neutral" }
    ],
    "i am deaf": [
        { gloss: "I/ME", duration: 0.5, expression: "neutral" },
        { gloss: "DEAF", duration: 1.2, expression: "proud" }
    ]
};

// ============================================
// MOCK TEACHING FEEDBACK (20 signs)
// ============================================
export const mockTeachingFeedback = {
    "HELLO": {
        accuracy: 92,
        overallAssessment: "Great signing!",
        corrections: [
            { aspect: "Expression", correction: "Smile more - it's part of the greeting!", importance: "minor" },
            { aspect: "Hand Position", correction: "Wave should be at forehead level", importance: "minor" }
        ],
        culturalNote: "In Deaf culture, HELLO is often accompanied by warm eye contact and a genuine smile.",
        encouragement: "Excellent work! Your signing looks very natural."
    },
    "THANK-YOU": {
        accuracy: 87,
        overallAssessment: "Good, with minor adjustments needed",
        corrections: [
            { aspect: "Starting Position", correction: "Hand should start touching the chin, not the cheek", importance: "important" },
            { aspect: "Movement", correction: "The forward motion should be more fluid", importance: "minor" },
            { aspect: "Expression", correction: "Show gratitude with a slight head nod", importance: "minor" }
        ],
        culturalNote: "THANK-YOU in ASL expresses deep appreciation. The further the hand moves from the chin, the more emphasis on thankfulness.",
        encouragement: "You're making great progress! Just adjust the starting position."
    },
    "GOODBYE": {
        accuracy: 95,
        overallAssessment: "Excellent!",
        corrections: [
            { aspect: "Expression", correction: "A small wave and smile make it warmer", importance: "minor" }
        ],
        culturalNote: "GOODBYE in ASL looks like a friendly wave. Making eye contact until finished shows respect.",
        encouragement: "Perfect form! You've mastered this sign!"
    },
    "PLEASE": {
        accuracy: 78,
        overallAssessment: "Good attempt, needs practice",
        corrections: [
            { aspect: "Hand Shape", correction: "Use flat palm, not cupped hand", importance: "critical" },
            { aspect: "Motion", correction: "Circular motion should be on chest, not stomach", importance: "important" },
            { aspect: "Speed", correction: "Motion should be slow and respectful", importance: "minor" }
        ],
        culturalNote: "PLEASE in ASL shows politeness. The circular motion represents earnest request.",
        encouragement: "Keep practicing! Focus on the flat palm first."
    },
    "SORRY": {
        accuracy: 89,
        overallAssessment: "Very good!",
        corrections: [
            { aspect: "Hand Shape", correction: "Make a fist (A handshape), not open palm", importance: "important" },
            { aspect: "Expression", correction: "Show remorse in your facial expression", importance: "minor" }
        ],
        culturalNote: "The circular motion over the heart shows sincere regret in Deaf culture.",
        encouragement: "Almost perfect! Expression adds authenticity."
    },
    "YES": {
        accuracy: 98,
        overallAssessment: "Perfect!",
        corrections: [],
        culturalNote: "YES in ASL looks like a nodding fist. The nod reinforces the affirmative.",
        encouragement: "Flawless execution! You're a natural!"
    },
    "NO": {
        accuracy: 96,
        overallAssessment: "Excellent!",
        corrections: [
            { aspect: "Speed", correction: "Can be faster for emphasis", importance: "minor" }
        ],
        culturalNote: "NO uses two fingers closing to thumb. Can be repeated for strong negation.",
        encouragement: "Perfect! Very clear communication."
    },
    "LOVE": {
        accuracy: 91,
        overallAssessment: "Beautiful signing!",
        corrections: [
            { aspect: "Arms", correction: "Cross arms over heart more tightly", importance: "minor" }
        ],
        culturalNote: "I-LOVE-YOU combines I, L, and Y handshapes. It's a universal favorite!",
        encouragement: "You're signing with heart! Beautiful expression."
    },
    "HELP": {
        accuracy: 84,
        overallAssessment: "Good foundation",
        corrections: [
            { aspect: "Hand Position", correction: "Dominant fist on open palm, then lift together", importance: "important" },
            { aspect: "Direction", correction: "Lift upward, not forward", importance: "minor" }
        ],
        culturalNote: "HELP symbolizes lifting someone up. Direction can show who's helping whom.",
        encouragement: "You're getting there! The upward motion is key."
    },
    "UNDERSTAND": {
        accuracy: 90,
        overallAssessment: "Very clear!",
        corrections: [
            { aspect: "Position", correction: "Index finger should be near temple, not forehead", importance: "minor" },
            { aspect: "Motion", correction: "The 'lightbulb' flick should be sharper", importance: "minor" }
        ],
        culturalNote: "The flicking motion represents a lightbulb moment - idea 'clicking'.",
        encouragement: "Great cognitive connection in your signing!"
    }
};

// ============================================
// MOCK DETECTED OBJECTS
// ============================================
export const mockObjects = [
    { object: "book", position: "left", confidence: 0.96, aslSign: "BOOK", category: "education" },
    { object: "cup", position: "right", confidence: 0.89, aslSign: "CUP", category: "food" },
    { object: "phone", position: "center", confidence: 0.93, aslSign: "PHONE", category: "electronics" },
    { object: "laptop", position: "right", confidence: 0.91, aslSign: "COMPUTER", category: "electronics" },
    { object: "pen", position: "left", confidence: 0.85, aslSign: "PEN", category: "education" },
    { object: "chair", position: "center", confidence: 0.94, aslSign: "CHAIR", category: "furniture" },
    { object: "table", position: "center", confidence: 0.97, aslSign: "TABLE", category: "furniture" },
    { object: "window", position: "left", confidence: 0.92, aslSign: "WINDOW", category: "architecture" },
    { object: "door", position: "right", confidence: 0.88, aslSign: "DOOR", category: "architecture" },
    { object: "clock", position: "left", confidence: 0.90, aslSign: "TIME", category: "time" }
];

// ============================================
// MOCK MEDICAL DOCUMENT & LESSON
// ============================================
export const mockMedicalDocument = {
    text: `
    Medical Terminology Guide for Sign Language Interpreters
    
    This document covers essential medical vocabulary for healthcare settings.
    Understanding these terms is crucial for effective communication between
    deaf patients and healthcare providers.
    
    Key Terms:
    - Heart: The organ that pumps blood through the body
    - Blood Pressure: The force of blood against artery walls
    - Medication: Drugs prescribed for treatment
    - Appointment: Scheduled time to see a doctor
    - Emergency: Urgent medical situation
    - Pain: Physical discomfort or suffering
    - Fever: Elevated body temperature
    - Allergy: Immune reaction to substances
    - Surgery: Medical procedure involving incision
    - Diagnosis: Identification of illness
    
    Cultural Considerations:
    Medical ASL requires sensitivity to patient privacy and comfort.
    Always maintain clear sightlines for deaf patients during examinations.
  `,
    filename: "medical_terminology_guide.pdf"
};

export const mockMedicalLesson = {
    title: "Medical Sign Language Essentials",
    difficulty: "intermediate",
    estimatedTime: "45 minutes",
    objectives: [
        "Learn 15 essential medical signs",
        "Understand healthcare communication etiquette",
        "Practice emergency-related vocabulary",
        "Apply medical signs in context"
    ],
    vocabulary: [
        { term: "Heart", sign: { gloss: "HEART" }, difficulty: "easy", memoryTip: "Both hands over heart" },
        { term: "Blood Pressure", sign: { gloss: "BLOOD-PRESSURE" }, difficulty: "medium", memoryTip: "Squeezing arm motion" },
        { term: "Medication", sign: { gloss: "MEDICINE" }, difficulty: "easy", memoryTip: "Mix motion with M handshape" },
        { term: "Appointment", sign: { gloss: "APPOINTMENT" }, difficulty: "easy", memoryTip: "A handshape circles wrist" },
        { term: "Emergency", sign: { gloss: "EMERGENCY" }, difficulty: "medium", memoryTip: "E handshape shaking urgently" },
        { term: "Pain", sign: { gloss: "PAIN" }, difficulty: "easy", memoryTip: "Twisting motion at pain location" },
        { term: "Fever", sign: { gloss: "FEVER" }, difficulty: "easy", memoryTip: "Hand on forehead, temperature rising" },
        { term: "Allergy", sign: { gloss: "ALLERGY" }, difficulty: "medium", memoryTip: "Point to nose, then reaction" },
        { term: "Surgery", sign: { gloss: "OPERATION" }, difficulty: "medium", memoryTip: "Cutting motion on body" },
        { term: "Diagnosis", sign: { gloss: "DIAGNOSE" }, difficulty: "hard", memoryTip: "Examining + deciding motion" },
        { term: "Doctor", sign: { gloss: "DOCTOR" }, difficulty: "easy", memoryTip: "D on pulse point" },
        { term: "Nurse", sign: { gloss: "NURSE" }, difficulty: "easy", memoryTip: "N on pulse point" },
        { term: "Hospital", sign: { gloss: "HOSPITAL" }, difficulty: "easy", memoryTip: "H on arm like cross" },
        { term: "Sick", sign: { gloss: "SICK" }, difficulty: "easy", memoryTip: "5 handshape on forehead" },
        { term: "Healthy", sign: { gloss: "HEALTHY" }, difficulty: "easy", memoryTip: "Strong fists on chest" }
    ],
    sentences: [
        {
            english: "I need to see a doctor.",
            signSequence: ["I/ME", "NEED", "SEE", "DOCTOR"],
            glossString: "I/ME NEED SEE DOCTOR",
            grammarNote: "Topic-Comment: The need comes before the action"
        },
        {
            english: "Where does it hurt?",
            signSequence: ["HURT", "WHERE"],
            glossString: "HURT WHERE",
            grammarNote: "WH-question at end with raised eyebrows"
        },
        {
            english: "Take this medication twice daily.",
            signSequence: ["MEDICINE", "THIS", "TAKE", "DAILY", "TWICE"],
            glossString: "MEDICINE THIS TAKE DAILY TWICE",
            grammarNote: "Time indicator at end for emphasis"
        },
        {
            english: "I have an allergy to penicillin.",
            signSequence: ["I/ME", "ALLERGY", "PENICILLIN", "HAVE"],
            glossString: "I/ME ALLERGY PENICILLIN HAVE",
            grammarNote: "Important medical disclosure - sign clearly"
        },
        {
            english: "The surgery was successful.",
            signSequence: ["OPERATION", "FINISH", "SUCCESSFUL"],
            glossString: "OPERATION FINISH SUCCESSFUL",
            grammarNote: "FINISH indicates completion"
        }
    ],
    culturalNotes: [
        {
            topic: "Medical Privacy",
            explanation: "In Deaf culture, medical information is private. Interpreters must maintain strict confidentiality. Position yourself where the patient can see both you and the doctor."
        },
        {
            topic: "Emergency Communication",
            explanation: "In emergencies, use clear, slow signs. Many hospitals now have video remote interpreting (VRI), but in-person interpreters are preferred for complex medical situations."
        },
        {
            topic: "Patient Advocacy",
            explanation: "Deaf patients have the right to qualified interpreters. Healthcare providers are legally required to provide accessible communication under the ADA."
        }
    ],
    progression: [
        { stage: 1, focus: "Basic Medical Vocabulary", signs: ["DOCTOR", "NURSE", "HOSPITAL", "SICK", "HEALTHY"], milestone: "Name the 5 core healthcare signs" },
        { stage: 2, focus: "Body & Symptoms", signs: ["HEART", "PAIN", "FEVER"], milestone: "Describe basic symptoms" },
        { stage: 3, focus: "Medical Procedures", signs: ["MEDICINE", "BLOOD-PRESSURE", "OPERATION"], milestone: "Understand treatment vocabulary" },
        { stage: 4, focus: "Emergency & Urgency", signs: ["EMERGENCY", "ALLERGY", "APPOINTMENT"], milestone: "Handle urgent situations" },
        { stage: 5, focus: "Full Sentences", signs: ["All signs in context"], milestone: "Complete medical conversation" }
    ],
    exercises: [
        { type: "receptive", instruction: "Watch and identify the sign", content: "HEART" },
        { type: "expressive", instruction: "Sign the following", content: "I need medicine" },
        { type: "matching", instruction: "Match signs to meanings", content: "FEVER, PAIN, ALLERGY" }
    ]
};

// ============================================
// DIALECT COMPARISON DATA
// ============================================
export const mockDialectComparison = {
    ASL: {
        sequence: [
            { gloss: "HELLO", duration: 1.5 },
            { gloss: "YOU", duration: 0.8 },
            { gloss: "GOOD", duration: 1.0 }
        ],
        wordOrder: "Topic-Comment (OSV)",
        notes: "Uses one-handed fingerspelling"
    },
    BSL: {
        sequence: [
            { gloss: "HELLO", duration: 1.5 },
            { gloss: "YOU", duration: 0.8 },
            { gloss: "GOOD", duration: 1.0 }
        ],
        wordOrder: "Topic-Comment/SVO",
        notes: "Uses two-handed fingerspelling"
    },
    ISL: {
        sequence: [
            { gloss: "YOU", duration: 0.8 },
            { gloss: "GOOD", duration: 1.0 },
            { gloss: "HELLO", duration: 1.5 }
        ],
        wordOrder: "SOV (Subject-Object-Verb)",
        notes: "Greeting comes at end for emphasis"
    }
};

// ============================================
// DEMO SCENARIO SCRIPTS
// ============================================
export const demoScenarios = [
    {
        id: 1,
        title: "Basic Translation",
        description: "See how Gemini 2.0 Flash translates spoken English to ASL signs",
        duration: 30,
        steps: [
            { time: 0, action: "showOverlay", text: "Gemini 2.0 Flash Translation", subtext: "Converting speech to sign language" },
            { time: 2, action: "hideOverlay" },
            { time: 3, action: "typeText", text: "Hello, how are you?", speed: 80 },
            { time: 5, action: "showProcessing", text: "Gemini analyzing grammar..." },
            { time: 7, action: "hideProcessing" },
            { time: 7.5, action: "playSignSequence", sequence: "hello, how are you?" },
            { time: 20, action: "speak", text: "Hello, how are you?" },
            { time: 25, action: "showOverlay", text: "✓ Translation Complete", subtext: "ASL grammar applied" },
            { time: 28, action: "hideOverlay" }
        ]
    },
    {
        id: 2,
        title: "Spatial Awareness",
        description: "Watch the avatar point to detected objects in your environment",
        duration: 45,
        steps: [
            { time: 0, action: "showOverlay", text: "Spatial Awareness", subtext: "Powered by Gemini Vision" },
            { time: 3, action: "hideOverlay" },
            { time: 4, action: "showCamera" },
            { time: 6, action: "detectObjects", objects: [{ object: "book", position: "left", confidence: 0.96 }] },
            { time: 8, action: "showOverlay", text: "Object Detected!", subtext: "Book (96% confidence)" },
            { time: 11, action: "hideOverlay" },
            { time: 12, action: "typeText", text: "Can you pass me that book?", speed: 60 },
            { time: 15, action: "showProcessing", text: "Understanding spatial reference..." },
            { time: 17, action: "hideProcessing" },
            { time: 18, action: "playSignSequence", sequence: "can you pass me that book?" },
            { time: 25, action: "pointToObject", target: "book" },
            { time: 32, action: "showOverlay", text: "Integrated Pointing", subtext: "Avatar references real objects" },
            { time: 38, action: "hideOverlay" },
            { time: 42, action: "hideCamera" }
        ]
    },
    {
        id: 3,
        title: "AI Teaching Agent",
        description: "Get real-time feedback on your sign accuracy from Gemini",
        duration: 60,
        steps: [
            { time: 0, action: "showOverlay", text: "AI Teaching Mode", subtext: "Personalized sign correction" },
            { time: 3, action: "hideOverlay" },
            { time: 4, action: "openTeachingPanel" },
            { time: 5, action: "selectSign", sign: "THANK-YOU" },
            { time: 7, action: "showReferenceAnimation", sign: "THANK-YOU" },
            { time: 12, action: "showOverlay", text: "Your Turn!", subtext: "Sign THANK-YOU" },
            { time: 14, action: "hideOverlay" },
            { time: 15, action: "startRecording" },
            { time: 18, action: "stopRecording" },
            { time: 19, action: "showProcessing", text: "Gemini analyzing your sign..." },
            { time: 22, action: "hideProcessing" },
            { time: 23, action: "showFeedback", sign: "THANK-YOU", accuracy: 87 },
            { time: 30, action: "showOverlay", text: "Try Again!", subtext: "Focus on starting position" },
            { time: 33, action: "hideOverlay" },
            { time: 34, action: "startRecording" },
            { time: 37, action: "stopRecording" },
            { time: 38, action: "showProcessing", text: "Re-analyzing..." },
            { time: 40, action: "hideProcessing" },
            { time: 41, action: "showFeedback", sign: "THANK-YOU", accuracy: 95 },
            { time: 48, action: "showOverlay", text: "Excellent Improvement! 🎉", subtext: "87% → 95% accuracy" },
            { time: 54, action: "hideOverlay" },
            { time: 57, action: "closeTeachingPanel" }
        ]
    },
    {
        id: 4,
        title: "Dialect Switching",
        description: "Seamlessly translate between ASL, BSL, and ISL",
        duration: 30,
        steps: [
            { time: 0, action: "showOverlay", text: "Dialect Translation", subtext: "ASL → ISL conversion" },
            { time: 3, action: "hideOverlay" },
            { time: 4, action: "setDialect", dialect: "ASL" },
            { time: 5, action: "playSignSequence", sequence: "hello" },
            { time: 10, action: "showOverlay", text: "Current: ASL", subtext: "HELLO, YOU, GOOD" },
            { time: 13, action: "hideOverlay" },
            { time: 14, action: "switchDialect", from: "ASL", to: "ISL" },
            { time: 18, action: "showOverlay", text: "Grammar Adapted", subtext: "ISL uses SOV word order" },
            { time: 21, action: "hideOverlay" },
            { time: 22, action: "playSignSequence", sequence: "hello", dialect: "ISL" },
            { time: 27, action: "showOverlay", text: "Dialect Switch Complete", subtext: "Regional differences preserved" }
        ]
    },
    {
        id: 5,
        title: "Document to Lesson",
        description: "Transform any document into a sign language learning module",
        duration: 60,
        steps: [
            { time: 0, action: "showOverlay", text: "Document Learning", subtext: "AI-generated curriculum" },
            { time: 3, action: "hideOverlay" },
            { time: 4, action: "openDocumentUpload" },
            { time: 6, action: "uploadDocument", file: mockMedicalDocument },
            { time: 8, action: "showProcessing", text: "Extracting text...", progress: 20 },
            { time: 11, action: "updateProgress", progress: 50, text: "Gemini generating lesson..." },
            { time: 15, action: "updateProgress", progress: 80, text: "Creating vocabulary..." },
            { time: 18, action: "updateProgress", progress: 100, text: "Lesson ready!" },
            { time: 20, action: "hideProcessing" },
            { time: 21, action: "displayLesson", lesson: mockMedicalLesson },
            { time: 28, action: "showOverlay", text: "15 Medical Signs", subtext: "Personalized curriculum generated" },
            { time: 32, action: "hideOverlay" },
            { time: 33, action: "scrollLessonVocabulary" },
            { time: 40, action: "showOverlay", text: "Cultural Notes", subtext: "Context for medical ASL" },
            { time: 44, action: "hideOverlay" },
            { time: 45, action: "scrollLessonCultural" },
            { time: 52, action: "clickStartLesson" },
            { time: 55, action: "showOverlay", text: "Ready to Practice!", subtext: "Signs loaded to queue" },
            { time: 58, action: "hideOverlay" }
        ]
    }
];

// ============================================
// DEMO OVERLAY MESSAGES
// ============================================
export const demoOverlays = {
    geminiProcessing: {
        icon: "🤖",
        title: "Gemini 2.0 Flash",
        subtitle: "Analyzing..."
    },
    geminiVision: {
        icon: "👁️",
        title: "Gemini Vision",
        subtitle: "Object Detection"
    },
    aiTeaching: {
        icon: "🎯",
        title: "AI Teaching Agent",
        subtitle: "Real-time Feedback"
    },
    dialectTranslation: {
        icon: "🌍",
        title: "Dialect Adaptation",
        subtitle: "Cultural Context"
    }
};
