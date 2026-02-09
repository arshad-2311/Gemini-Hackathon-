import { useState, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import './DialectSwitcher.css';

// ============================================
// DIALECT CONFIGURATIONS
// ============================================
const DIALECTS = {
    ASL: {
        code: 'ASL',
        name: 'American Sign Language',
        flag: '🇺🇸',
        color: '#4f46e5',
        description: 'Used in the United States and English-speaking Canada',
        features: [
            'Topic-Comment word order',
            'One-handed fingerspelling',
            'Facial grammar markers',
            'Directional verbs'
        ],
        users: '500,000+ native signers',
        keyDifference: 'Uses Topic-Comment structure, not English word order'
    },
    BSL: {
        code: 'BSL',
        name: 'British Sign Language',
        flag: '🇬🇧',
        color: '#059669',
        description: 'Primary sign language of the United Kingdom',
        features: [
            'Two-handed fingerspelling',
            'Regional variations',
            'Lip patterns as grammar',
            'Different number system'
        ],
        users: '150,000+ signers',
        keyDifference: 'Uses two-handed alphabet, not mutually intelligible with ASL'
    },
    ISL: {
        code: 'ISL',
        name: 'Indian Sign Language',
        flag: '🇮🇳',
        color: '#dc2626',
        description: 'Used across the Indian subcontinent',
        features: [
            'SOV word order',
            'One-handed fingerspelling',
            'Iconic signs common',
            'Regional variations'
        ],
        users: 'Millions of signers',
        keyDifference: 'Uses Subject-Object-Verb structure like Hindi'
    }
};

// ============================================
// SOCKET CONNECTION
// ============================================
// Socket imported from ../socket

// ============================================
// DIALECT SWITCHER COMPONENT
// ============================================
export default function DialectSwitcher({
    currentDialect = 'ASL',
    onDialectChange,
    signSequence = [],
    showInfo = true
}) {
    // State
    const [activeDialect, setActiveDialect] = useState(currentDialect);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionProgress, setTransitionProgress] = useState(0);
    const [targetDialect, setTargetDialect] = useState(null);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    // Sync with prop
    useEffect(() => {
        setActiveDialect(currentDialect);
    }, [currentDialect]);

    // Socket connection
    useEffect(() => {
        socket.connect();

        socket.on('dialect-switched', (data) => {
            setIsTransitioning(false);
            setTransitionProgress(100);

            // Small delay before closing overlay
            setTimeout(() => {
                setTargetDialect(null);
                setTransitionProgress(0);
            }, 300);
        });

        return () => {
            socket.off('dialect-switched');
        };
    }, []);

    // ============================================
    // HANDLERS
    // ============================================

    const handleDialectClick = useCallback((dialectCode) => {
        if (dialectCode === activeDialect || isTransitioning) return;

        const newDialect = DIALECTS[dialectCode];
        setTargetDialect(newDialect);
        setIsTransitioning(true);
        setTransitionProgress(0);

        // Fake progress animation
        const progressInterval = setInterval(() => {
            setTransitionProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90; // Wait for actual response
                }
                return prev + 15;
            });
        }, 150);

        // Send translation request if there's a sequence
        if (signSequence && signSequence.length > 0) {
            socket.emit('switch-dialect', {
                currentSequence: signSequence,
                fromDialect: activeDialect,
                toDialect: dialectCode
            });
        } else {
            // No sequence to translate, just switch
            setTimeout(() => {
                clearInterval(progressInterval);
                setTransitionProgress(100);
                setTimeout(() => {
                    setIsTransitioning(false);
                    setTargetDialect(null);
                    setTransitionProgress(0);
                }, 300);
            }, 800);
        }

        // Update state and notify parent
        setActiveDialect(dialectCode);
        if (onDialectChange) {
            onDialectChange(dialectCode);
        }
    }, [activeDialect, isTransitioning, signSequence, onDialectChange]);

    const toggleComparison = useCallback(() => {
        if (!comparisonMode) {
            // Enter comparison mode
            setComparisonMode(true);
            // Request comparison data from backend if we have a sequence
            if (signSequence && signSequence.length > 0) {
                const dialects = Object.keys(DIALECTS).filter(d => d !== activeDialect);
                setComparisonData({
                    primary: { dialect: activeDialect, sequence: signSequence },
                    secondary: { dialect: dialects[0], sequence: [] }
                });

                // Request translation for comparison
                socket.emit('switch-dialect', {
                    currentSequence: signSequence,
                    fromDialect: activeDialect,
                    toDialect: dialects[0]
                });
            }
        } else {
            setComparisonMode(false);
            setComparisonData(null);
        }
    }, [comparisonMode, signSequence, activeDialect]);

    // ============================================
    // RENDER
    // ============================================

    const currentInfo = DIALECTS[activeDialect];

    return (
        <div className="dialect-switcher">
            {/* Main Buttons */}
            <div className="dialect-buttons">
                {Object.entries(DIALECTS).map(([code, dialect]) => (
                    <button
                        key={code}
                        className={`dialect-btn ${activeDialect === code ? 'active' : ''}`}
                        onClick={() => handleDialectClick(code)}
                        disabled={isTransitioning}
                        title={dialect.name}
                        style={{ '--dialect-color': dialect.color }}
                    >
                        <span className="dialect-flag">{dialect.flag}</span>
                        <span className="dialect-code">{code}</span>
                        {activeDialect === code && <span className="active-glow" />}
                    </button>
                ))}
            </div>

            {/* Info Toggle */}
            {showInfo && (
                <button
                    className="info-toggle"
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    title="Dialect information"
                >
                    ℹ️
                </button>
            )}

            {/* Comparison Toggle */}
            <button
                className={`comparison-toggle ${comparisonMode ? 'active' : ''}`}
                onClick={toggleComparison}
                title="Compare dialects"
            >
                ⚖️
            </button>

            {/* Info Panel */}
            {showInfoPanel && currentInfo && (
                <div className="info-panel">
                    <div className="info-header">
                        <span className="info-flag">{currentInfo.flag}</span>
                        <div className="info-title">
                            <h4>{currentInfo.name}</h4>
                            <p className="info-subtitle">{currentInfo.users}</p>
                        </div>
                    </div>

                    <p className="info-description">{currentInfo.description}</p>

                    <div className="info-features">
                        <h5>Key Features:</h5>
                        <ul>
                            {currentInfo.features.map((feature, i) => (
                                <li key={i}>{feature}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="info-difference">
                        <span className="difference-label">💡 Key Difference:</span>
                        <p>{currentInfo.keyDifference}</p>
                    </div>
                </div>
            )}

            {/* Comparison Panel */}
            {comparisonMode && (
                <div className="comparison-panel">
                    <div className="comparison-header">
                        <h4>Dialect Comparison</h4>
                        <button className="close-comparison" onClick={() => setComparisonMode(false)}>
                            ×
                        </button>
                    </div>

                    <div className="comparison-grid">
                        {Object.entries(DIALECTS).map(([code, dialect]) => (
                            <div key={code} className="comparison-card">
                                <div className="comparison-card-header" style={{ borderColor: dialect.color }}>
                                    <span className="comparison-flag">{dialect.flag}</span>
                                    <span className="comparison-code">{code}</span>
                                </div>
                                <div className="comparison-content">
                                    <p className="comparison-word-order">
                                        <strong>Word Order:</strong><br />
                                        {code === 'ASL' ? 'Topic-Comment (OSV)' :
                                            code === 'BSL' ? 'Topic-Comment/SVO' : 'SOV'}
                                    </p>
                                    <p className="comparison-alphabet">
                                        <strong>Alphabet:</strong><br />
                                        {code === 'BSL' ? 'Two-handed' : 'One-handed'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="comparison-example">
                        <h5>Example: "How are you?"</h5>
                        <div className="example-grid">
                            <div className="example-item">
                                <span className="example-label">ASL:</span>
                                <code>HOW YOU</code>
                            </div>
                            <div className="example-item">
                                <span className="example-label">BSL:</span>
                                <code>YOU HOW</code>
                            </div>
                            <div className="example-item">
                                <span className="example-label">ISL:</span>
                                <code>YOU HOW</code>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transition Overlay */}
            {isTransitioning && targetDialect && (
                <div className="transition-overlay">
                    <div className="transition-content">
                        <div
                            className="transition-flag"
                            style={{ '--dialect-color': targetDialect.color }}
                        >
                            {targetDialect.flag}
                        </div>

                        <h3 className="transition-title">
                            Translating to {targetDialect.code}...
                        </h3>

                        <p className="transition-subtitle">
                            {targetDialect.name}
                        </p>

                        <div className="transition-progress">
                            <div
                                className="transition-progress-fill"
                                style={{
                                    width: `${transitionProgress}%`,
                                    backgroundColor: targetDialect.color
                                }}
                            />
                        </div>

                        <p className="transition-hint">
                            Adjusting grammar and expressions
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
