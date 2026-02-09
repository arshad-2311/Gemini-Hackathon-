import { useState, useEffect, useCallback, useRef } from 'react';
import {
    demoScenarios,
    mockTranslations,
    mockTeachingFeedback,
    mockObjects,
    mockMedicalLesson
} from '../mockData';
import './DemoController.css';

// ============================================
// DEMO CONTROLLER COMPONENT
// ============================================
export default function DemoController({
    onTypeText,
    onPlaySequence,
    onSpeak,
    onShowProcessing,
    onHideProcessing,
    onDetectObjects,
    onPointToObject,
    onOpenTeaching,
    onCloseTeaching,
    onShowFeedback,
    onSelectSign,
    onSwitchDialect,
    onDisplayLesson,
    onShowCamera,
    onHideCamera,
    avatarRef
}) {
    // State
    const [isActive, setIsActive] = useState(false);
    const [currentScenario, setCurrentScenario] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [overlay, setOverlay] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [recordingMode, setRecordingMode] = useState(false);
    const [hideCursor, setHideCursor] = useState(false);

    // Refs
    const timeoutsRef = useRef([]);
    const startTimeRef = useRef(null);
    const intervalRef = useRef(null);

    const scenario = demoScenarios[currentScenario];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAllTimeouts();
        };
    }, []);

    // Auto-play next scenario
    useEffect(() => {
        if (autoPlay && !isPlaying && isActive) {
            const nextTimeout = setTimeout(() => {
                if (currentScenario < demoScenarios.length - 1) {
                    setCurrentScenario(prev => prev + 1);
                    playScenario(currentScenario + 1);
                } else {
                    setAutoPlay(false);
                }
            }, 3000); // 3 second pause between scenarios

            return () => clearTimeout(nextTimeout);
        }
    }, [autoPlay, isPlaying, currentScenario, isActive]);

    // Apply cursor hiding
    useEffect(() => {
        if (hideCursor) {
            document.body.classList.add('hide-cursor');
        } else {
            document.body.classList.remove('hide-cursor');
        }
        return () => document.body.classList.remove('hide-cursor');
    }, [hideCursor]);

    // ============================================
    // PLAYBACK CONTROL
    // ============================================

    const clearAllTimeouts = useCallback(() => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const executeAction = useCallback((step) => {
        const { action, ...params } = step;

        switch (action) {
            case 'showOverlay':
                setOverlay({ text: params.text, subtext: params.subtext });
                break;

            case 'hideOverlay':
                setOverlay(null);
                break;

            case 'typeText':
                if (onTypeText) {
                    onTypeText(params.text, params.speed || 80);
                }
                break;

            case 'showProcessing':
                setProcessing({ text: params.text, progress: params.progress });
                if (onShowProcessing) onShowProcessing(params.text);
                break;

            case 'updateProgress':
                setProcessing(prev => prev ? { ...prev, progress: params.progress, text: params.text } : null);
                break;

            case 'hideProcessing':
                setProcessing(null);
                if (onHideProcessing) onHideProcessing();
                break;

            case 'playSignSequence':
                const key = params.sequence.toLowerCase();
                const sequence = mockTranslations[key] || [{ gloss: params.sequence.toUpperCase(), duration: 1.5 }];
                if (onPlaySequence) onPlaySequence(sequence);
                if (avatarRef?.current?.playSequence) {
                    avatarRef.current.playSequence(sequence.map(s => s.gloss));
                }
                break;

            case 'speak':
                if (onSpeak) onSpeak(params.text);
                break;

            case 'showCamera':
                if (onShowCamera) onShowCamera();
                break;

            case 'hideCamera':
                if (onHideCamera) onHideCamera();
                break;

            case 'detectObjects':
                if (onDetectObjects) onDetectObjects(params.objects || mockObjects.slice(0, 3));
                break;

            case 'pointToObject':
                if (onPointToObject) onPointToObject(params.target);
                if (avatarRef?.current?.playPointingGesture) {
                    avatarRef.current.playPointingGesture(params.target === 'book' ? 'left' : 'right');
                }
                break;

            case 'openTeachingPanel':
                if (onOpenTeaching) onOpenTeaching();
                break;

            case 'closeTeachingPanel':
                if (onCloseTeaching) onCloseTeaching();
                break;

            case 'selectSign':
                if (onSelectSign) onSelectSign(params.sign);
                break;

            case 'showReferenceAnimation':
                if (avatarRef?.current?.playSignAnimation) {
                    avatarRef.current.playSignAnimation(params.sign);
                }
                break;

            case 'startRecording':
                // Visual indicator only
                break;

            case 'stopRecording':
                // Visual indicator only
                break;

            case 'showFeedback':
                const feedback = mockTeachingFeedback[params.sign] || {
                    accuracy: params.accuracy || 85,
                    corrections: [],
                    encouragement: "Great work!"
                };
                // Override accuracy if specified
                if (params.accuracy) {
                    feedback.accuracy = params.accuracy;
                }
                if (onShowFeedback) onShowFeedback(feedback);
                break;

            case 'setDialect':
                if (onSwitchDialect) onSwitchDialect(params.dialect, false);
                break;

            case 'switchDialect':
                if (onSwitchDialect) onSwitchDialect(params.to, true);
                break;

            case 'openDocumentUpload':
                // Trigger document upload panel
                break;

            case 'uploadDocument':
                // Simulate document upload
                break;

            case 'displayLesson':
                if (onDisplayLesson) onDisplayLesson(params.lesson || mockMedicalLesson);
                break;

            case 'scrollLessonVocabulary':
            case 'scrollLessonCultural':
                // Visual scrolling animation
                break;

            case 'clickStartLesson':
                // Trigger start lesson
                break;

            default:
                console.log('Unknown demo action:', action);
        }
    }, [
        onTypeText, onPlaySequence, onSpeak, onShowProcessing, onHideProcessing,
        onDetectObjects, onPointToObject, onOpenTeaching, onCloseTeaching,
        onShowFeedback, onSelectSign, onSwitchDialect, onDisplayLesson,
        onShowCamera, onHideCamera, avatarRef
    ]);

    const playScenario = useCallback((scenarioIndex = currentScenario) => {
        clearAllTimeouts();
        setIsPlaying(true);
        setProgress(0);
        setCurrentStep(0);
        startTimeRef.current = Date.now();

        const scenario = demoScenarios[scenarioIndex];
        if (!scenario) return;

        // Schedule all steps
        scenario.steps.forEach((step, index) => {
            const timeout = setTimeout(() => {
                setCurrentStep(index);
                executeAction(step);
            }, step.time * 1000);
            timeoutsRef.current.push(timeout);
        });

        // Progress tracking
        intervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const progressPercent = (elapsed / scenario.duration) * 100;
            setProgress(Math.min(progressPercent, 100));

            if (elapsed >= scenario.duration) {
                setIsPlaying(false);
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }, 100);
    }, [currentScenario, executeAction, clearAllTimeouts]);

    const stopScenario = useCallback(() => {
        clearAllTimeouts();
        setIsPlaying(false);
        setProgress(0);
        setOverlay(null);
        setProcessing(null);
    }, [clearAllTimeouts]);

    const nextScenario = useCallback(() => {
        stopScenario();
        if (currentScenario < demoScenarios.length - 1) {
            setCurrentScenario(prev => prev + 1);
        }
    }, [currentScenario, stopScenario]);

    const prevScenario = useCallback(() => {
        stopScenario();
        if (currentScenario > 0) {
            setCurrentScenario(prev => prev - 1);
        }
    }, [currentScenario, stopScenario]);

    const startDemo = useCallback(() => {
        setIsActive(true);
        setCurrentScenario(0);
    }, []);

    const stopDemo = useCallback(() => {
        stopScenario();
        setIsActive(false);
        setAutoPlay(false);
        setCurrentScenario(0);
    }, [stopScenario]);

    const playAll = useCallback(() => {
        setAutoPlay(true);
        setCurrentScenario(0);
        playScenario(0);
    }, [playScenario]);

    // ============================================
    // RENDER
    // ============================================

    // Start Demo Button (when not active)
    if (!isActive) {
        return (
            <button
                className="demo-start-btn"
                onClick={startDemo}
                title="Start Demo Mode"
            >
                <span className="demo-icon">🎬</span>
                <span className="demo-text">Demo</span>
            </button>
        );
    }

    // Full Demo Controller
    return (
        <div className={`demo-controller ${recordingMode ? 'recording-mode' : ''}`}>
            {/* Demo Header */}
            <div className="demo-header">
                <h3>🎬 Demo Mode</h3>
                <div className="demo-options">
                    <label className="demo-checkbox">
                        <input
                            type="checkbox"
                            checked={recordingMode}
                            onChange={(e) => setRecordingMode(e.target.checked)}
                        />
                        <span>Recording Mode</span>
                    </label>
                    <label className="demo-checkbox">
                        <input
                            type="checkbox"
                            checked={hideCursor}
                            onChange={(e) => setHideCursor(e.target.checked)}
                        />
                        <span>Hide Cursor</span>
                    </label>
                </div>
                <button className="demo-close" onClick={stopDemo}>×</button>
            </div>

            {/* Scenario Selector */}
            <div className="demo-scenarios">
                {demoScenarios.map((s, i) => (
                    <button
                        key={s.id}
                        className={`scenario-btn ${i === currentScenario ? 'active' : ''} ${isPlaying && i === currentScenario ? 'playing' : ''}`}
                        onClick={() => { stopScenario(); setCurrentScenario(i); }}
                    >
                        <span className="scenario-number">{i + 1}</span>
                        <span className="scenario-title">{s.title}</span>
                    </button>
                ))}
            </div>

            {/* Current Scenario Info */}
            <div className="demo-current">
                <h4>{scenario?.title}</h4>
                <p>{scenario?.description}</p>
                <div className="demo-duration">
                    <span className="duration-icon">⏱</span>
                    <span>{scenario?.duration}s</span>
                </div>
            </div>

            {/* Progress Bar */}
            {isPlaying && (
                <div className="demo-progress">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="progress-info">
                        <span>Step {currentStep + 1}/{scenario?.steps.length}</span>
                        <span>{Math.floor((scenario?.duration || 0) * (progress / 100))}s / {scenario?.duration}s</span>
                    </div>
                </div>
            )}

            {/* Playback Controls */}
            <div className="demo-controls">
                <button
                    className="control-btn"
                    onClick={prevScenario}
                    disabled={currentScenario === 0}
                >
                    ⏮ Prev
                </button>

                {isPlaying ? (
                    <button className="control-btn primary stop" onClick={stopScenario}>
                        ⏹ Stop
                    </button>
                ) : (
                    <button className="control-btn primary" onClick={() => playScenario()}>
                        ▶ Play
                    </button>
                )}

                <button
                    className="control-btn"
                    onClick={nextScenario}
                    disabled={currentScenario === demoScenarios.length - 1}
                >
                    Next ⏭
                </button>
            </div>

            {/* Auto-play All */}
            <button
                className={`play-all-btn ${autoPlay ? 'active' : ''}`}
                onClick={autoPlay ? () => setAutoPlay(false) : playAll}
            >
                {autoPlay ? '⏸ Pause Auto-Play' : '🔄 Play All Scenarios'}
            </button>

            {/* Recording Tips */}
            {recordingMode && (
                <div className="recording-tips">
                    <p>📹 Recording Mode Active</p>
                    <ul>
                        <li>All animations optimized</li>
                        <li>Consistent timing</li>
                        <li>No random variations</li>
                    </ul>
                </div>
            )}

            {/* Demo Overlay */}
            {overlay && (
                <div className="demo-overlay">
                    <div className="overlay-content">
                        <h2>{overlay.text}</h2>
                        {overlay.subtext && <p>{overlay.subtext}</p>}
                    </div>
                </div>
            )}

            {/* Processing Indicator */}
            {processing && (
                <div className="demo-processing">
                    <div className="processing-content">
                        <div className="processing-spinner" />
                        <p>{processing.text}</p>
                        {processing.progress !== undefined && (
                            <div className="processing-progress">
                                <div
                                    className="processing-fill"
                                    style={{ width: `${processing.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// DEMO TYPING EFFECT HOOK
// ============================================
export function useDemoTyping() {
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const timeoutRef = useRef(null);

    const typeText = useCallback((text, speed = 80) => {
        setIsTyping(true);
        setDisplayText('');

        let index = 0;
        const typeChar = () => {
            if (index < text.length) {
                setDisplayText(prev => prev + text[index]);
                index++;
                timeoutRef.current = setTimeout(typeChar, speed);
            } else {
                setIsTyping(false);
            }
        };

        typeChar();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const clear = useCallback(() => {
        setDisplayText('');
        setIsTyping(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    return { displayText, isTyping, typeText, clear };
}
