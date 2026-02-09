import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { socket } from '../socket';
import './TeachingPanel.css';

// ============================================
// CONSTANTS
// ============================================
const FINGERSPELLING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');

const COMMON_SIGNS = {
    beginner: [
        { gloss: 'HELLO', meaning: 'Hello/Hi', difficulty: 'beginner' },
        { gloss: 'GOODBYE', meaning: 'Goodbye', difficulty: 'beginner' },
        { gloss: 'THANK-YOU', meaning: 'Thank you', difficulty: 'beginner' },
        { gloss: 'PLEASE', meaning: 'Please', difficulty: 'beginner' },
        { gloss: 'YES', meaning: 'Yes', difficulty: 'beginner' },
        { gloss: 'NO', meaning: 'No', difficulty: 'beginner' },
        { gloss: 'SORRY', meaning: 'Sorry', difficulty: 'beginner' },
        { gloss: 'HELP', meaning: 'Help', difficulty: 'beginner' }
    ],
    intermediate: [
        { gloss: 'HOW', meaning: 'How', difficulty: 'intermediate' },
        { gloss: 'WHAT', meaning: 'What', difficulty: 'intermediate' },
        { gloss: 'WHERE', meaning: 'Where', difficulty: 'intermediate' },
        { gloss: 'WHEN', meaning: 'When', difficulty: 'intermediate' },
        { gloss: 'WHY', meaning: 'Why', difficulty: 'intermediate' },
        { gloss: 'WHO', meaning: 'Who', difficulty: 'intermediate' },
        { gloss: 'UNDERSTAND', meaning: 'Understand', difficulty: 'intermediate' },
        { gloss: 'LEARN', meaning: 'Learn', difficulty: 'intermediate' }
    ],
    advanced: [
        { gloss: 'COMMUNICATE', meaning: 'Communicate', difficulty: 'advanced' },
        { gloss: 'INTERPRETER', meaning: 'Interpreter', difficulty: 'advanced' },
        { gloss: 'DEAF-CULTURE', meaning: 'Deaf Culture', difficulty: 'advanced' },
        { gloss: 'LANGUAGE', meaning: 'Language', difficulty: 'advanced' }
    ]
};

const TABS = [
    { id: 'practice', label: 'Practice', icon: '🎯' },
    { id: 'suggestions', label: 'Suggestions', icon: '💡' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'reference', label: 'Reference', icon: '📖' }
];

// ============================================
// SOCKET CONNECTION
// ============================================
// Using shared socket from ../socket.js

// ============================================
// TEACHING PANEL COMPONENT
// ============================================
export default function TeachingPanel({
    feedback: externalFeedback,
    onSelectSign,
    dialect = 'ASL',
    suggestions: externalSuggestions = []
}) {
    // State
    const [activeTab, setActiveTab] = useState('practice');
    const [practiceQueue, setPracticeQueue] = useState([]);
    const [currentSign, setCurrentSign] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [feedback, setFeedback] = useState(externalFeedback);
    const [suggestions, setSuggestions] = useState(externalSuggestions);

    // Progress tracking (persisted to localStorage)
    const [progress, setProgress] = useState(() => {
        const saved = localStorage.getItem('signLanguageProgress');
        return saved ? JSON.parse(saved) : {
            signsPracticed: 0,
            totalAccuracy: 0,
            practiceCount: 0,
            streak: 0,
            lastPracticeDate: null,
            achievements: [],
            signHistory: {}
        };
    });

    // Refs
    const recordingTimerRef = useRef(null);
    const videoFramesRef = useRef([]);

    // Sync external props
    useEffect(() => {
        if (externalFeedback) setFeedback(externalFeedback);
    }, [externalFeedback]);

    useEffect(() => {
        if (externalSuggestions.length > 0) setSuggestions(externalSuggestions);
    }, [externalSuggestions]);

    // Socket connection
    useEffect(() => {
        socket.connect();

        socket.on('sign-feedback', (data) => {
            setFeedback(data);
            setIsRecording(false);
            updateProgress(data.accuracy);
        });

        socket.on('suggested-signs', (data) => {
            setSuggestions(data.suggestions || []);
        });

        return () => {
            socket.off('sign-feedback');
            socket.off('suggested-signs');
        };
    }, []);

    // Save progress to localStorage
    useEffect(() => {
        localStorage.setItem('signLanguageProgress', JSON.stringify(progress));
    }, [progress]);

    // Update streak on first load
    useEffect(() => {
        const today = new Date().toDateString();
        if (progress.lastPracticeDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            setProgress(prev => ({
                ...prev,
                streak: prev.lastPracticeDate === yesterday ? prev.streak : 0
            }));
        }
    }, []);

    // ============================================
    // HANDLERS
    // ============================================

    const updateProgress = useCallback((accuracy) => {
        const today = new Date().toDateString();

        setProgress(prev => {
            const newPracticeCount = prev.practiceCount + 1;
            const newTotalAccuracy = prev.totalAccuracy + accuracy;
            const newSignsPracticed = prev.signsPracticed + 1;
            const streakContinued = prev.lastPracticeDate === today ||
                prev.lastPracticeDate === new Date(Date.now() - 86400000).toDateString();

            // Check for achievements
            const achievements = [...prev.achievements];
            if (newSignsPracticed >= 10 && !achievements.includes('first_ten')) {
                achievements.push('first_ten');
            }
            if (newTotalAccuracy / newPracticeCount >= 90 && newPracticeCount >= 5 && !achievements.includes('high_achiever')) {
                achievements.push('high_achiever');
            }
            if (prev.streak >= 7 && !achievements.includes('week_streak')) {
                achievements.push('week_streak');
            }

            return {
                ...prev,
                signsPracticed: newSignsPracticed,
                totalAccuracy: newTotalAccuracy,
                practiceCount: newPracticeCount,
                streak: streakContinued ? prev.streak + (prev.lastPracticeDate !== today ? 1 : 0) : 1,
                lastPracticeDate: today,
                achievements,
                signHistory: {
                    ...prev.signHistory,
                    [currentSign?.gloss || 'unknown']: {
                        practiced: (prev.signHistory[currentSign?.gloss]?.practiced || 0) + 1,
                        bestAccuracy: Math.max(prev.signHistory[currentSign?.gloss]?.bestAccuracy || 0, accuracy)
                    }
                }
            };
        });
    }, [currentSign]);

    const selectSignForPractice = useCallback((sign) => {
        setCurrentSign(sign);
        setFeedback(null);
        if (onSelectSign) onSelectSign(sign);
    }, [onSelectSign]);

    const addToQueue = useCallback((sign) => {
        setPracticeQueue(prev => {
            if (prev.find(s => s.gloss === sign.gloss)) return prev;
            return [...prev, sign];
        });
    }, []);

    const removeFromQueue = useCallback((gloss) => {
        setPracticeQueue(prev => prev.filter(s => s.gloss !== gloss));
    }, []);

    const startRecording = useCallback(() => {
        if (!currentSign) return;

        setIsRecording(true);
        setRecordingProgress(0);
        setFeedback(null);
        videoFramesRef.current = [];

        // Simulate capturing frames during 3 seconds
        const startTime = Date.now();
        const captureInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 3000, 1);
            setRecordingProgress(progress);

            // Would capture actual video frames here
            videoFramesRef.current.push({
                timestamp: elapsed,
                landmarks: generateMockLandmarks()
            });

            if (progress >= 1) {
                clearInterval(captureInterval);
                finishRecording();
            }
        }, 100);

        recordingTimerRef.current = captureInterval;
    }, [currentSign]);

    const finishRecording = useCallback(() => {
        setIsRecording(false);

        // Send to backend for analysis
        socket.emit('check-my-sign', {
            videoFrames: videoFramesRef.current,
            intendedSign: currentSign?.gloss || currentSign,
            dialect
        });
    }, [currentSign, dialect]);

    const cancelRecording = useCallback(() => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
        }
        setIsRecording(false);
        setRecordingProgress(0);
    }, []);

    const requestSuggestions = useCallback(() => {
        socket.emit('get-sign-suggestions', {
            conversationHistory: [],
            dialect
        });
    }, [dialect]);

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderPracticeTab = () => (
        <div className="tab-content practice-tab">
            {/* Current Sign Section */}
            <section className="practice-section">
                <h3>Practice Sign</h3>

                {currentSign ? (
                    <div className="current-sign">
                        <div className="sign-display">
                            <span className="sign-gloss">{currentSign.gloss || currentSign}</span>
                            <span className="sign-meaning">{currentSign.meaning || 'Practice this sign'}</span>
                        </div>

                        {/* Recording Controls */}
                        <div className="recording-controls">
                            {!isRecording ? (
                                <button className="record-btn" onClick={startRecording}>
                                    <span className="record-icon">⏺</span>
                                    Start Recording (3s)
                                </button>
                            ) : (
                                <>
                                    <div className="recording-progress">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${recordingProgress * 100}%` }}
                                        />
                                        <span className="progress-text">
                                            Recording... {Math.ceil(3 - recordingProgress * 3)}s
                                        </span>
                                    </div>
                                    <button className="cancel-btn" onClick={cancelRecording}>
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="no-sign-selected">
                        <p>Select a sign below to practice</p>
                    </div>
                )}
            </section>

            {/* Feedback Section */}
            {feedback && (
                <section className="feedback-section">
                    <h3>Feedback</h3>

                    {/* Accuracy Score */}
                    <div className="accuracy-display">
                        <svg className="accuracy-circle" viewBox="0 0 100 100">
                            <circle
                                className="accuracy-bg"
                                cx="50" cy="50" r="40"
                                fill="none"
                                strokeWidth="8"
                            />
                            <circle
                                className="accuracy-fill"
                                cx="50" cy="50" r="40"
                                fill="none"
                                strokeWidth="8"
                                strokeDasharray={`${feedback.accuracy * 2.51} 251`}
                                strokeLinecap="round"
                                style={{
                                    '--accuracy-color': feedback.accuracy >= 80 ? '#10b981' :
                                        feedback.accuracy >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                            />
                            <text x="50" y="50" textAnchor="middle" dy="0.3em" className="accuracy-text">
                                {feedback.accuracy}%
                            </text>
                        </svg>
                        <p className="accuracy-label">{feedback.overallAssessment || 'Assessment'}</p>
                    </div>

                    {/* Corrections */}
                    {feedback.corrections && feedback.corrections.length > 0 && (
                        <div className="corrections-list">
                            <h4>Corrections</h4>
                            {feedback.corrections.map((corr, i) => (
                                <div key={i} className={`correction-item ${corr.importance || 'minor'}`}>
                                    <span className="correction-icon">
                                        {corr.importance === 'critical' ? '🔴' :
                                            corr.importance === 'important' ? '🟡' : '🟢'}
                                    </span>
                                    <div className="correction-content">
                                        <strong>{corr.aspect}</strong>
                                        <p>{corr.correction || corr.issue}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cultural Note */}
                    {feedback.culturalNote && (
                        <div className="cultural-note">
                            <span className="note-icon">🌍</span>
                            <p>{feedback.culturalNote}</p>
                        </div>
                    )}

                    {/* Encouragement */}
                    {feedback.encouragement && (
                        <div className="encouragement">
                            <span className="encouragement-icon">✨</span>
                            <p>{feedback.encouragement}</p>
                        </div>
                    )}
                </section>
            )}

            {/* Practice Queue */}
            {practiceQueue.length > 0 && (
                <section className="queue-section">
                    <h3>Practice Queue ({practiceQueue.length})</h3>
                    <div className="queue-list">
                        {practiceQueue.map((sign, i) => (
                            <div
                                key={sign.gloss}
                                className={`queue-item ${currentSign?.gloss === sign.gloss ? 'active' : ''}`}
                                onClick={() => selectSignForPractice(sign)}
                            >
                                <span className="queue-number">{i + 1}</span>
                                <span className="queue-gloss">{sign.gloss}</span>
                                <button
                                    className="queue-remove"
                                    onClick={(e) => { e.stopPropagation(); removeFromQueue(sign.gloss); }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Sign Library */}
            <section className="library-section">
                <h3>Sign Library</h3>
                {Object.entries(COMMON_SIGNS).map(([level, signs]) => (
                    <div key={level} className="sign-category">
                        <h4 className={`category-header ${level}`}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                        </h4>
                        <div className="sign-grid">
                            {signs.map(sign => (
                                <button
                                    key={sign.gloss}
                                    className={`sign-btn ${currentSign?.gloss === sign.gloss ? 'active' : ''}`}
                                    onClick={() => selectSignForPractice(sign)}
                                    title={sign.meaning}
                                >
                                    {sign.gloss}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );

    const renderSuggestionsTab = () => (
        <div className="tab-content suggestions-tab">
            <div className="suggestions-header">
                <h3>Suggested Signs</h3>
                <button className="refresh-btn" onClick={requestSuggestions}>
                    🔄 Refresh
                </button>
            </div>

            {suggestions.length > 0 ? (
                <div className="suggestions-list">
                    {suggestions.slice(0, 8).map((sug, i) => (
                        <div key={i} className="suggestion-card">
                            <div className="suggestion-main">
                                <span className="suggestion-gloss">{sug.gloss}</span>
                                <span className="suggestion-meaning">{sug.meaning}</span>
                            </div>
                            <p className="suggestion-reason">{sug.reason}</p>
                            <div className="suggestion-meta">
                                <span className={`difficulty ${sug.difficulty || 'beginner'}`}>
                                    {sug.difficulty || 'beginner'}
                                </span>
                                <span className="likelihood">
                                    {Math.round((sug.likelihood || 0.5) * 100)}% likely
                                </span>
                            </div>
                            <div className="suggestion-actions">
                                <button onClick={() => selectSignForPractice(sug)}>
                                    Practice
                                </button>
                                <button onClick={() => addToQueue(sug)}>
                                    + Queue
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-suggestions">
                    <span className="empty-icon">💭</span>
                    <p>Start a conversation to get contextual suggestions</p>
                    <button onClick={requestSuggestions}>Get Suggestions</button>
                </div>
            )}
        </div>
    );

    const renderProgressTab = () => {
        const avgAccuracy = progress.practiceCount > 0
            ? Math.round(progress.totalAccuracy / progress.practiceCount)
            : 0;

        const achievements = [
            { id: 'first_ten', name: 'First Ten', icon: '🎯', desc: 'Practice 10 signs' },
            { id: 'high_achiever', name: 'High Achiever', icon: '⭐', desc: '90%+ avg accuracy' },
            { id: 'week_streak', name: 'Week Warrior', icon: '🔥', desc: '7 day streak' },
            { id: 'centurion', name: 'Centurion', icon: '💯', desc: 'Practice 100 signs' }
        ];

        return (
            <div className="tab-content progress-tab">
                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{progress.signsPracticed}</span>
                        <span className="stat-label">Signs Practiced</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{avgAccuracy}%</span>
                        <span className="stat-label">Average Accuracy</span>
                    </div>
                    <div className="stat-card streak">
                        <span className="stat-value">{progress.streak} 🔥</span>
                        <span className="stat-label">Day Streak</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{progress.achievements.length}</span>
                        <span className="stat-label">Achievements</span>
                    </div>
                </div>

                {/* Achievements */}
                <section className="achievements-section">
                    <h3>Achievements</h3>
                    <div className="achievements-grid">
                        {achievements.map(ach => (
                            <div
                                key={ach.id}
                                className={`achievement-card ${progress.achievements.includes(ach.id) ? 'unlocked' : 'locked'}`}
                            >
                                <span className="achievement-icon">{ach.icon}</span>
                                <span className="achievement-name">{ach.name}</span>
                                <span className="achievement-desc">{ach.desc}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Best Signs */}
                {Object.keys(progress.signHistory).length > 0 && (
                    <section className="best-signs-section">
                        <h3>Your Best Signs</h3>
                        <div className="best-signs-list">
                            {Object.entries(progress.signHistory)
                                .sort((a, b) => b[1].bestAccuracy - a[1].bestAccuracy)
                                .slice(0, 5)
                                .map(([gloss, data]) => (
                                    <div key={gloss} className="best-sign-item">
                                        <span className="best-sign-gloss">{gloss}</span>
                                        <div className="best-sign-stats">
                                            <span className="best-accuracy">{data.bestAccuracy}%</span>
                                            <span className="practice-count">×{data.practiced}</span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </section>
                )}
            </div>
        );
    };

    const renderReferenceTab = () => (
        <div className="tab-content reference-tab">
            {/* Fingerspelling Chart */}
            <section className="reference-section">
                <h3>Fingerspelling (A-Z)</h3>
                <p className="reference-note">Click a letter to practice</p>
                <div className="fingerspelling-grid">
                    {FINGERSPELLING.map(letter => (
                        <button
                            key={letter}
                            className="letter-btn"
                            onClick={() => selectSignForPractice({ gloss: `FS-${letter}`, meaning: `Letter ${letter}` })}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </section>

            {/* Numbers */}
            <section className="reference-section">
                <h3>Numbers (0-9)</h3>
                <div className="numbers-grid">
                    {NUMBERS.map(num => (
                        <button
                            key={num}
                            className="number-btn"
                            onClick={() => selectSignForPractice({ gloss: `NUM-${num}`, meaning: `Number ${num}` })}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </section>

            {/* Common Phrases */}
            <section className="reference-section">
                <h3>Common Phrases</h3>
                <div className="phrases-list">
                    {[
                        { phrase: 'HOW YOU', meaning: 'How are you?' },
                        { phrase: 'ME FINE', meaning: "I'm fine" },
                        { phrase: 'THANK-YOU MUCH', meaning: 'Thank you very much' },
                        { phrase: 'PLEASE SLOW', meaning: 'Please slow down' },
                        { phrase: 'AGAIN PLEASE', meaning: 'Again, please' },
                        { phrase: 'UNDERSTAND NOT', meaning: "I don't understand" },
                        { phrase: 'NICE MEET YOU', meaning: 'Nice to meet you' },
                        { phrase: 'NAME WHAT YOU', meaning: "What's your name?" }
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="phrase-item"
                            onClick={() => selectSignForPractice({ gloss: item.phrase, meaning: item.meaning })}
                        >
                            <span className="phrase-sign">{item.phrase}</span>
                            <span className="phrase-meaning">{item.meaning}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="teaching-panel">
            {/* Tab Navigation */}
            <nav className="panel-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.label}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Tab Content */}
            <div className="panel-content">
                {activeTab === 'practice' && renderPracticeTab()}
                {activeTab === 'suggestions' && renderSuggestionsTab()}
                {activeTab === 'progress' && renderProgressTab()}
                {activeTab === 'reference' && renderReferenceTab()}
            </div>

            {/* Dialect Indicator */}
            <div className="dialect-badge">
                {dialect}
            </div>
        </div>
    );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateMockLandmarks() {
    // Generate mock pose/hand landmarks for testing
    return {
        pose: Array.from({ length: 33 }, () => ({
            x: Math.random(),
            y: Math.random(),
            z: Math.random() * 0.1,
            visibility: 0.9
        })),
        leftHand: Array.from({ length: 21 }, () => ({
            x: 0.3 + Math.random() * 0.1,
            y: 0.5 + Math.random() * 0.1,
            z: Math.random() * 0.05
        })),
        rightHand: Array.from({ length: 21 }, () => ({
            x: 0.6 + Math.random() * 0.1,
            y: 0.5 + Math.random() * 0.1,
            z: Math.random() * 0.05
        }))
    };
}
