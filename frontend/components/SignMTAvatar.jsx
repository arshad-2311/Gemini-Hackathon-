// frontend/components/SignMTAvatar.jsx
// Sign.MT Avatar component for rendering SiGML animations

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * SignMTAvatar - Renders sign language animations from SiGML content
 * Supports both Sign.MT i18n (if available) and fallback Three.js rendering
 */
export function SignMTAvatar({
    sigmlContent,
    language = 'ASL',
    avatarType = 'CWA',
    width = '100%',
    height = '600px',
    onReady,
    onPlayStart,
    onPlayEnd,
    onError
}) {
    const avatarRef = useRef(null);
    const [i18n, setI18n] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [usesFallback, setUsesFallback] = useState(false);

    // Initialize Sign.MT i18n
    useEffect(() => {
        const initI18n = async () => {
            try {
                // Try to load Sign.MT i18n dynamically
                const { I18n } = await import('@sign-mt/i18n');

                const i18nInstance = new I18n({
                    container: avatarRef.current,
                    avatar: avatarType, // 'CWA', 'ELAN', 'A3D'
                    language: language
                });

                await i18nInstance.init();
                setI18n(i18nInstance);
                setIsReady(true);
                onReady?.();

            } catch (err) {
                console.warn('Sign.MT i18n not available, using fallback renderer:', err.message);
                setUsesFallback(true);
                setIsReady(true);
                onReady?.();
            }
        };

        if (avatarRef.current) {
            initI18n();
        }

        return () => {
            if (i18n) {
                i18n.stop?.();
            }
        };
    }, [avatarType, language]);

    // Play SiGML animation
    useEffect(() => {
        if (!isReady || !sigmlContent) return;

        const playSiGML = async () => {
            try {
                if (i18n) {
                    // Use Sign.MT player
                    i18n.setSiGML(sigmlContent);
                    setIsPlaying(true);
                    onPlayStart?.();

                    i18n.play();

                    // Listen for completion
                    i18n.onComplete?.(() => {
                        setIsPlaying(false);
                        onPlayEnd?.();
                    });
                } else if (usesFallback) {
                    // Use fallback renderer
                    await playWithFallback(sigmlContent);
                }
            } catch (err) {
                console.error('Error playing SiGML:', err);
                setError(err.message);
                onError?.(err);
            }
        };

        playSiGML();
    }, [i18n, sigmlContent, isReady, usesFallback]);

    // Fallback renderer using CSS animations
    const playWithFallback = useCallback(async (sigml) => {
        setIsPlaying(true);
        onPlayStart?.();

        // Parse SiGML to extract signs
        const signs = parseSiGMLToSigns(sigml);

        // Animate each sign
        for (const sign of signs) {
            await animateSign(sign, avatarRef.current);
        }

        setIsPlaying(false);
        onPlayEnd?.();
    }, [onPlayStart, onPlayEnd]);

    // Player controls
    const play = useCallback(() => {
        if (i18n) {
            i18n.play();
            setIsPlaying(true);
        }
    }, [i18n]);

    const pause = useCallback(() => {
        if (i18n) {
            i18n.pause();
            setIsPlaying(false);
        }
    }, [i18n]);

    const stop = useCallback(() => {
        if (i18n) {
            i18n.stop();
            setIsPlaying(false);
        }
    }, [i18n]);

    return (
        <div className="signmt-avatar-container" style={{ width, height }}>
            {/* Avatar container */}
            <div
                ref={avatarRef}
                className="signmt-avatar"
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            >
                {/* Fallback avatar display */}
                {usesFallback && (
                    <FallbackAvatarDisplay
                        sigmlContent={sigmlContent}
                        isPlaying={isPlaying}
                    />
                )}

                {/* Loading state */}
                {!isReady && (
                    <div className="avatar-loading" style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#fff'
                    }}>
                        <div className="spinner" />
                        <p>Loading avatar...</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="avatar-controls" style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
                justifyContent: 'center'
            }}>
                <button onClick={play} disabled={isPlaying || !sigmlContent}>
                    ▶️ Play
                </button>
                <button onClick={pause} disabled={!isPlaying}>
                    ⏸️ Pause
                </button>
                <button onClick={stop} disabled={!isPlaying}>
                    ⏹️ Stop
                </button>
            </div>

            {/* Status */}
            <div className="avatar-status" style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '12px',
                color: '#888'
            }}>
                {error && <span style={{ color: '#ff6b6b' }}>Error: {error}</span>}
                {isPlaying && <span style={{ color: '#4ecdc4' }}>Playing...</span>}
                {usesFallback && <span> (Fallback mode)</span>}
            </div>
        </div>
    );
}

/**
 * Fallback avatar display when Sign.MT is not available
 */
function FallbackAvatarDisplay({ sigmlContent, isPlaying }) {
    const signs = sigmlContent ? parseSiGMLToSigns(sigmlContent) : [];
    const [currentSignIndex, setCurrentSignIndex] = useState(0);

    useEffect(() => {
        if (!isPlaying || signs.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSignIndex(prev => (prev + 1) % signs.length);
        }, 1500);

        return () => clearInterval(interval);
    }, [isPlaying, signs.length]);

    const currentSign = signs[currentSignIndex];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif'
        }}>
            {/* Avatar placeholder */}
            <div style={{
                width: '200px',
                height: '300px',
                backgroundColor: '#2d2d44',
                borderRadius: '100px 100px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                position: 'relative'
            }}>
                {/* Head */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#ffd5b5',
                    borderRadius: '50%',
                    marginBottom: '20px'
                }} />

                {/* Hands */}
                <div style={{
                    display: 'flex',
                    gap: '60px',
                    marginTop: '-20px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '50px',
                        backgroundColor: '#ffd5b5',
                        borderRadius: '8px',
                        transform: isPlaying ? 'rotate(-15deg)' : 'none',
                        transition: 'transform 0.3s'
                    }}>🤚</div>
                    <div style={{
                        width: '40px',
                        height: '50px',
                        backgroundColor: '#ffd5b5',
                        borderRadius: '8px',
                        transform: isPlaying ? 'rotate(15deg)' : 'none',
                        transition: 'transform 0.3s'
                    }}>🤚</div>
                </div>
            </div>

            {/* Current sign display */}
            {currentSign && (
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: 'bold'
                }}>
                    {currentSign.gloss}
                </div>
            )}

            {/* Progress */}
            {signs.length > 1 && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    Sign {currentSignIndex + 1} of {signs.length}
                </div>
            )}
        </div>
    );
}

/**
 * Parse SiGML content to extract sign data
 */
function parseSiGMLToSigns(sigml) {
    const signs = [];

    // Simple regex extraction (for fallback)
    const glossMatches = sigml.match(/gloss="([^"]+)"/g);

    if (glossMatches) {
        for (const match of glossMatches) {
            const gloss = match.replace('gloss="', '').replace('"', '');
            signs.push({ gloss });
        }
    }

    return signs;
}

/**
 * Animate a single sign (fallback)
 */
async function animateSign(sign, container) {
    // Animation duration per sign
    return new Promise(resolve => {
        setTimeout(resolve, 1500);
    });
}

/**
 * SignMTPlayer - Wrapper with additional features
 */
export function SignMTPlayer({
    text,
    targetLanguage = 'ASL',
    autoPlay = false,
    showControls = true,
    onTranslate
}) {
    const [sigml, setSigml] = useState(null);
    const [loading, setLoading] = useState(false);

    const translate = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLanguage })
            });

            const data = await response.json();

            if (data.success) {
                setSigml(data.outputs.recommended);
                onTranslate?.(data);
            }
        } catch (error) {
            console.error('Translation failed:', error);
        }
        setLoading(false);
    }, [text, targetLanguage, onTranslate]);

    useEffect(() => {
        if (text && autoPlay) {
            translate();
        }
    }, [text, autoPlay, translate]);

    return (
        <div className="signmt-player">
            <SignMTAvatar
                sigmlContent={sigml}
                language={targetLanguage}
            />

            {showControls && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                        onClick={translate}
                        disabled={loading || !text}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#4ecdc4',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '16px',
                            cursor: loading ? 'wait' : 'pointer'
                        }}
                    >
                        {loading ? '🔄 Translating...' : '🤟 Translate to Sign'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default SignMTAvatar;
