import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Canvas } from '@react-three/fiber';
import Avatar3D from './components/Avatar3D';
import VideoAvatar from './components/VideoAvatar';
import CameraInput from './components/CameraInput';
import TeachingPanel from './components/TeachingPanel';
import DialectSwitcher from './components/DialectSwitcher';
import DocumentUpload from './components/DocumentUpload';
import How2SignAvatar from './components/How2SignAvatar';
import './App.css';

// ============================================
// SOCKET.IO CONNECTION
// ============================================
const socket = io('http://localhost:3001', {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// ============================================
// QUICK TEST PHRASES
// ============================================
const QUICK_PHRASES = [
    { text: 'Hello, how are you?', icon: '👋' },
    { text: 'Thank you very much', icon: '🙏' },
    { text: 'Please help me', icon: '🆘' },
    { text: 'Yes, I understand', icon: '✅' },
    { text: 'No, thank you', icon: '❌' },
    { text: 'Nice to meet you', icon: '🤝' }
];

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Core state
    const [signData, setSignData] = useState({ sequence: [], id: 0 });
    const [currentDialect, setCurrentDialect] = useState('ASL');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    // Spatial awareness
    const [detectedObjects, setDetectedObjects] = useState([]);
    const [pointingTarget, setPointingTarget] = useState(null);

    // Teaching mode
    const [teachingMode, setTeachingMode] = useState(false);
    const [teachingFeedback, setTeachingFeedback] = useState(null);
    const [targetSign, setTargetSign] = useState(null);

    // Lesson mode
    const [lessonMode, setLessonMode] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null);

    // UI state
    const [showTeachingPanel, setShowTeachingPanel] = useState(false);
    const [showCamera, setShowCamera] = useState(false); // Camera disabled by default
    const [suggestions, setSuggestions] = useState([]);
    const [avatarMode, setAvatarMode] = useState('how2sign'); // 'how2sign', '3d' or 'video'
    const [useVideoDataset, setUseVideoDataset] = useState(true);
    const [how2signKeypoints, setHow2signKeypoints] = useState(null); // Real OpenPose keypoints
    const [isTranslating, setIsTranslating] = useState(false); // New state for sign translation mode

    // Conversation history for context
    const [conversationHistory, setConversationHistory] = useState([]);

    // Refs
    const recognitionRef = useRef(null);
    const cameraRef = useRef(null);
    const objectDetectionIntervalRef = useRef(null);

    // ============================================
    // SOCKET.IO EVENT HANDLERS
    // ============================================
    useEffect(() => {
        socket.connect();

        socket.on('connect', () => {
            console.log('✅ Connected to server');
            setIsConnected(true);
            setConnectionError(null);
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setConnectionError('Unable to connect to server');
        });

        socket.on('connected', (data) => {
            console.log('Server welcome:', data);
        });

        // Receive sign sequence to play
        socket.on('play-signs', (data) => {
            console.log('📺 Playing signs:', data);
            setSignData({
                sequence: data.sequence || [],
                id: Date.now() // Force unique update
            });
            if (data.objects) {
                setDetectedObjects(data.objects);
            }
            // Add to conversation history
            if (data.originalText) {
                setConversationHistory(prev => [...prev, { role: 'speaker', content: data.originalText }]);
            }
        });

        // Receive text to speak
        socket.on('speak-text', (data) => {
            console.log('🔊 Speaking:', data.text);
            speakText(data.text);
            setTranscript(prev => prev + '\n🤟 ' + data.text);
            setConversationHistory(prev => [...prev, { role: 'signer', content: data.text }]);
        });

        // Receive predicted sign
        socket.on('sign-predicted', (data) => {
            console.log('👐 Sign predicted:', data);
            setTranscript(prev => prev + '\n👐 ' + (data.english || data.gloss));
        });

        // Receive teaching feedback
        socket.on('sign-feedback', (data) => {
            console.log('📚 Feedback:', data);
            setTeachingFeedback(data);
        });

        // Receive detected objects
        socket.on('objects-detected', (data) => {
            setDetectedObjects(data.objects || []);
        });

        // Receive sign suggestions
        socket.on('suggested-signs', (data) => {
            setSuggestions(data.suggestions || []);
        });

        // Receive dialect translation
        socket.on('dialect-switched', (data) => {
            console.log('🌍 Dialect switched:', data);
            setSignData({
                sequence: data.sequence || [],
                id: Date.now()
            });
        });

        // Receive generated lesson
        socket.on('lesson-generated', (data) => {
            console.log('📄 Lesson generated:', data);
            setCurrentLesson(data.lesson);
            setLessonMode(true);
        });

        // Handle errors
        socket.on('error', (data) => {
            console.error('Socket error:', data);

            // Format user-friendly error message
            let userMessage = data.message || 'An error occurred';

            // Check for common error types and provide friendly messages
            if (data.message) {
                const msg = data.message.toLowerCase();
                if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many')) {
                    userMessage = '⏳ API limit reached. Please wait a moment and try again.';
                } else if (msg.includes('api key') || msg.includes('unauthorized')) {
                    userMessage = '🔑 API key issue. Please check your configuration.';
                } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
                    userMessage = '🌐 Network error. Please check your connection.';
                } else if (msg.includes('timeout')) {
                    userMessage = '⏱️ Request timed out. Please try again.';
                }
            }

            setConnectionError(userMessage);
            setTimeout(() => setConnectionError(null), 8000);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('connected');
            socket.off('play-signs');
            socket.off('speak-text');
            socket.off('sign-predicted'); // Clean up listener
            socket.off('sign-feedback');
            socket.off('objects-detected');
            socket.off('suggested-signs');
            socket.off('dialect-switched');
            socket.off('lesson-generated');
            socket.off('error');
            socket.disconnect();
        };
    }, []);

    // ============================================
    // WEB SPEECH API - RECOGNITION
    // ============================================
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setConnectionError('Speech recognition not supported in this browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            console.log('🎤 Listening started');
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            setInterimTranscript(interim);

            if (final) {
                setTranscript(prev => prev + '\n🎤 ' + final);
                setInterimTranscript('');

                // Send to backend for translation
                socket.emit('speech-input', {
                    text: final,
                    dialect: currentDialect,
                    cameraFrame: null // Could add frame capture here
                });
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                setConnectionError(`Speech error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            console.log('🎤 Listening ended');
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, [currentDialect]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimTranscript('');
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // ============================================
    // HOW2SIGN TRANSLATION - REAL POSE DATA
    // ============================================
    const translateToHow2Sign = useCallback(async (text) => {
        try {
            console.log('🔍 Translating to How2Sign:', text);
            setTranscript(prev => prev + '\n📝 ' + text);

            const response = await fetch('http://localhost:3001/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (data.success && data.poseData) {
                console.log('✅ Got How2Sign keypoints:', data.matchedSentence);
                setHow2signKeypoints(data.poseData);
                setTranscript(prev => prev + '\n🤟 ' + (data.matchedSentence || text));
            } else if (data.poseData?.frames) {
                // Demo keypoints format
                setHow2signKeypoints(data.poseData);
                console.log('✅ Demo keypoints loaded');
            } else {
                console.warn('No keypoints in response:', data);
                // Fallback to socket-based translation
                socket.emit('speech-input', { text, dialect: currentDialect });
            }
        } catch (error) {
            console.error('How2Sign translation error:', error);
            // Fallback to socket-based translation
            socket.emit('speech-input', { text, dialect: currentDialect });
        }
    }, [currentDialect]);

    // ============================================
    // WEB SPEECH API - SYNTHESIS
    // ============================================
    const speakText = useCallback((text) => {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        speechSynthesis.speak(utterance);
    }, []);

    // ============================================
    // QUICK PHRASE HANDLER
    // ============================================
    const sendQuickPhrase = useCallback((phrase) => {
        setTranscript(prev => prev + '\n🎤 ' + phrase);
        socket.emit('speech-input', {
            text: phrase,
            dialect: currentDialect
        });
    }, [currentDialect]);

    // ============================================
    // DIALECT SWITCHING
    // ============================================
    const handleDialectChange = useCallback((newDialect) => {
        const oldDialect = currentDialect;
        setCurrentDialect(newDialect);

        // If we have signs playing, translate them
        if (signData.sequence.length > 0) {
            socket.emit('switch-dialect', {
                currentSequence: signData.sequence,
                fromDialect: oldDialect,
                toDialect: newDialect
            });
        }
    }, [currentDialect, signData.sequence]);

    // ============================================
    // TEACHING MODE
    // ============================================
    const startTeaching = useCallback((sign) => {
        setTeachingMode(true);
        setTargetSign(sign.gloss || sign);
        setTeachingFeedback(null);
        setShowTeachingPanel(true);
    }, []);

    const checkMySign = useCallback((videoFrames) => {
        if (!targetSign) return;

        socket.emit('check-my-sign', {
            videoFrames,
            intendedSign: targetSign,
            dialect: currentDialect
        });
    }, [targetSign, currentDialect]);

    // ============================================
    // CAMERA & OBJECT DETECTION
    // ============================================
    const handleCameraFrame = useCallback((imageBase64) => {
        if (isTranslating) {
            // In translation mode, try to recognize signs
            socket.emit('predict-sign', {
                imageBase64,
                dialect: currentDialect
            });
        } else {
            // Default: just detect objects for spatial context
            socket.emit('detect-objects', { imageBase64 });
        }
    }, [isTranslating, currentDialect]);

    const handleObjectClick = useCallback((object) => {
        setPointingTarget({
            x: object.position?.x || 0.5,
            y: object.position?.y || 0.5,
            z: -1
        });

        // Clear pointing after gesture
        setTimeout(() => setPointingTarget(null), 2000);
    }, []);

    // ============================================
    // LESSON GENERATION
    // ============================================
    const handleLessonGenerated = useCallback((lesson) => {
        setCurrentLesson(lesson);
        setLessonMode(true);
        setShowTeachingPanel(true);
    }, []);

    // ============================================
    // GET SUGGESTIONS
    // ============================================
    useEffect(() => {
        if (conversationHistory.length > 0 && conversationHistory.length % 3 === 0) {
            socket.emit('get-sign-suggestions', {
                conversationHistory,
                dialect: currentDialect
            });
        }
    }, [conversationHistory, currentDialect]);

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="app">
            {/* Full-screen Avatar - How2Sign, 3D or Video mode */}
            <div className="avatar-container">
                {avatarMode === 'how2sign' ? (
                    <Canvas
                        camera={{ position: [0, 0, 2], fov: 50 }}
                        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
                    >
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 5, 5]} intensity={0.8} />
                        <pointLight position={[-5, 5, 5]} intensity={0.4} color="#4ecdc4" />
                        <How2SignAvatar
                            keypointData={how2signKeypoints}
                            fps={25}
                            loop={true}
                            playing={true}
                            scale={1}
                        />
                    </Canvas>
                ) : avatarMode === 'video' && useVideoDataset ? (
                    <VideoAvatar
                        signSequence={signData.sequence.map(s => s.gloss || s)}
                        currentDialect={currentDialect}
                        onSignComplete={(sign) => console.log('Sign complete:', sign)}
                        onSequenceComplete={() => console.log('Sequence complete')}
                        showControls={true}
                        quality="720p"
                    />
                ) : (
                    <Avatar3D
                        signData={signData}
                        pointingTarget={pointingTarget}
                        currentDialect={currentDialect}
                        detectedObjects={detectedObjects}
                    />
                )}
            </div>

            {/* Connection Status */}
            <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {/* Error Display */}
            {connectionError && (
                <div className="error-toast">
                    {connectionError}
                    <button onClick={() => setConnectionError(null)}>×</button>
                </div>
            )}

            {/* ========== SIGN-KIT TEST PANEL ========== */}
            <div style={{
                position: 'absolute',
                bottom: 80,
                right: 20,
                background: 'rgba(0,0,0,0.85)',
                padding: '15px',
                borderRadius: '12px',
                zIndex: 100,
                border: '1px solid rgba(0,255,255,0.3)',
                maxWidth: '280px'
            }}>
                <div style={{ color: '#00ffff', fontFamily: 'monospace', marginBottom: '10px', fontSize: '12px' }}>
                    🧪 SIGN-KIT TEST PANEL
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['HELLO', 'YES', 'NO', 'THANK-YOU', 'YOU', 'ME', 'PLEASE', 'SORRY', 'HELP', 'GOOD', 'BAD', 'HOME', 'LOVE'].map(sign => (
                        <button
                            key={sign}
                            onClick={() => setSignData({ sequence: [{ gloss: sign }], id: Date.now() })}
                            style={{
                                padding: '6px 10px',
                                fontSize: '11px',
                                background: 'rgba(0,255,255,0.1)',
                                border: '1px solid #00ffff',
                                color: '#00ffff',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontFamily: 'monospace'
                            }}
                        >
                            {sign}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                    <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>Avatar Mode:</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {['how2sign', '3d', 'video'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setAvatarMode(mode)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '10px',
                                    background: avatarMode === mode ? '#00ffff' : 'rgba(0,255,255,0.1)',
                                    border: '1px solid #00ffff',
                                    color: avatarMode === mode ? '#000' : '#00ffff',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {mode.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>How2Sign Test:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {['Hello', 'Thank you', 'How are you'].map(phrase => (
                            <button
                                key={phrase}
                                onClick={() => translateToHow2Sign(phrase)}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: '11px',
                                    background: 'linear-gradient(135deg, #00ff8833, #00ffff33)',
                                    border: '1px solid #00ff88',
                                    color: '#00ff88',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {phrase}
                            </button>
                        ))}
                    </div>
                    <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>3D Avatar Test:</div>
                    <button
                        onClick={() => setSignData({
                            sequence: [{ gloss: 'HELLO' }, { gloss: 'ME' }, { gloss: 'LOVE' }, { gloss: 'YOU' }],
                            id: Date.now()
                        })}
                        style={{
                            padding: '8px 12px',
                            fontSize: '11px',
                            background: 'linear-gradient(135deg, #00ffff33, #ff00ff33)',
                            border: '1px solid #ff00ff',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            width: '100%',
                            fontFamily: 'monospace'
                        }}
                    >
                        "HELLO ME LOVE YOU"
                    </button>
                </div>
            </div>
            {/* ========== END TEST PANEL ========== */}

            {/* Top Left Controls */}

            <div className="controls-overlay">
                {/* Mode Toggles */}
                <div className="mode-toggles">
                    <button
                        className={`mode-btn ${avatarMode === 'video' ? 'active' : ''}`}
                        onClick={() => setAvatarMode(avatarMode === '3d' ? 'video' : '3d')}
                        title={avatarMode === '3d' ? 'Switch to Video Avatar' : 'Switch to 3D Avatar'}
                    >
                        {avatarMode === '3d' ? '📹 Video' : '🤖 3D'}
                    </button>
                    <button
                        className={`mode-btn ${isTranslating ? 'active' : ''}`}
                        onClick={() => {
                            const newState = !isTranslating;
                            setIsTranslating(newState);
                            if (newState) setShowCamera(true);
                        }}
                        title="Real-time Sign Translation"
                    >
                        {isTranslating ? '🛑 Stop' : '✋ Translate'}
                    </button>
                    <button
                        className={`mode-btn ${showTeachingPanel ? 'active' : ''}`}
                        onClick={() => setShowTeachingPanel(!showTeachingPanel)}
                    >
                        📚 Learn
                    </button>
                    <button
                        className={`mode-btn ${showCamera ? 'active' : ''}`}
                        onClick={() => setShowCamera(!showCamera)}
                    >
                        📷 Camera
                    </button>
                </div>
            </div>

            {/* Teaching Panel (Left Side) */}
            <div className={`teaching-panel-container ${showTeachingPanel ? 'open' : 'closed'}`}>
                <button
                    className="panel-toggle"
                    onClick={() => setShowTeachingPanel(!showTeachingPanel)}
                >
                    {showTeachingPanel ? '◀' : '▶'}
                </button>

                {showTeachingPanel && (
                    lessonMode && currentLesson ? (
                        <DocumentUpload
                            currentLesson={currentLesson}
                            dialect={currentDialect}
                            onLessonGenerated={handleLessonGenerated}
                            onStartTeaching={startTeaching}
                        />
                    ) : (
                        <TeachingPanel
                            feedback={teachingFeedback}
                            onSelectSign={startTeaching}
                            dialect={currentDialect}
                        />
                    )
                )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="suggestions-bar">
                    <span className="suggestions-label">Suggested:</span>
                    {suggestions.slice(0, 5).map((sug, i) => (
                        <button
                            key={i}
                            className="suggestion-btn"
                            onClick={() => sendQuickPhrase(sug.meaning)}
                            title={sug.reason}
                        >
                            {sug.gloss}
                        </button>
                    ))}
                </div>
            )}

            {/* Transcript Display */}
            <div className="transcript-container">
                <div className="transcript-content">
                    {transcript || 'Conversation will appear here...'}
                    {interimTranscript && (
                        <span className="interim"> {interimTranscript}...</span>
                    )}
                </div>
                {isSpeaking && (
                    <div className="speaking-indicator">
                        <span>🔊</span> Speaking...
                    </div>
                )}
            </div>

            {/* Camera Feed */}
            {showCamera && (
                <div className="camera-container">
                    <CameraInput
                        ref={cameraRef}
                        onLandmarks={(landmarks) => teachingMode && checkMySign(landmarks)}
                        onObjectDetection={handleCameraFrame}
                        isActive={true}
                    />

                    {/* Object Markers Overlay */}
                    {detectedObjects.length > 0 && (
                        <div className="objects-overlay">
                            {detectedObjects.slice(0, 5).map((obj, i) => (
                                <div
                                    key={i}
                                    className="object-marker"
                                    style={{
                                        left: `${(obj.position?.x || 0.5) * 100}%`,
                                        top: `${(obj.position?.y || 0.5) * 100}%`
                                    }}
                                    onClick={() => handleObjectClick(obj)}
                                    title={`Click to point: ${obj.object}`}
                                >
                                    <span className="object-dot"></span>
                                    <span className="object-label">{obj.object}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Document Upload FAB */}
            <button
                className="fab-upload"
                onClick={() => {
                    setLessonMode(true);
                    setCurrentLesson(null);
                    setShowTeachingPanel(true);
                }}
                title="Upload document for custom lesson"
            >
                📄
            </button>
        </div>
    );
}

export default App;
