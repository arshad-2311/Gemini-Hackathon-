// ============================================
// VIDEO AVATAR COMPONENT
// Hybrid video + 3D procedural animation
// Plays SignAvatars videos with fallback
// ============================================

import { useRef, useEffect, useState, useCallback } from 'react';
import './VideoAvatar.css';

// Configuration
const CONFIG = {
    preloadCount: 3,        // Number of signs to preload ahead
    defaultQuality: '720p', // Default video quality
    fallbackDuration: 2000, // Duration for procedural animation (ms)
    retryAttempts: 2,       // Video load retry attempts
    autoAdvanceDelay: 300,  // Delay between signs (ms)
};

const VideoAvatar = ({
    signSequence = [],
    currentDialect = 'ASL',
    onSignComplete,
    onSequenceComplete,
    showControls = true,
    autoPlay = true,
    loop = false,
    quality = CONFIG.defaultQuality
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    const [currentSignIndex, setCurrentSignIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [signCache, setSignCache] = useState({});
    const [currentMode, setCurrentMode] = useState('idle'); // 'idle', 'video', 'procedural', 'fingerspelling'
    const [currentSignData, setCurrentSignData] = useState(null);
    const [error, setError] = useState(null);

    // ============================================
    // PRELOAD SIGNS
    // ============================================

    const preloadSigns = useCallback(async (signs, startIndex = 0) => {
        const toPreload = signs.slice(startIndex, startIndex + CONFIG.preloadCount);
        const newCache = { ...signCache };

        for (const sign of toPreload) {
            if (newCache[sign]) continue; // Already cached

            try {
                // Use hybrid endpoint for best available source
                const response = await fetch(
                    `/api/hybrid/sign/${encodeURIComponent(sign)}?dialect=${currentDialect}&quality=${quality}`
                );

                if (response.ok) {
                    const data = await response.json();
                    newCache[sign] = data;

                    // Preload video if available
                    if (data.videoURL && data.type === 'signAvatars') {
                        const video = document.createElement('video');
                        video.preload = 'auto';
                        video.src = data.videoURL;
                    }
                }
            } catch (err) {
                console.warn(`Failed to preload ${sign}:`, err.message);
            }
        }

        setSignCache(newCache);
    }, [signCache, currentDialect, quality]);

    // Preload on sequence change
    useEffect(() => {
        if (signSequence.length > 0) {
            preloadSigns(signSequence, 0);
        }
    }, [signSequence]);

    // Preload ahead as we progress
    useEffect(() => {
        if (currentSignIndex > 0 && currentSignIndex < signSequence.length) {
            preloadSigns(signSequence, currentSignIndex);
        }
    }, [currentSignIndex]);

    // ============================================
    // SIGN PLAYBACK
    // ============================================

    const playCurrentSign = useCallback(async () => {
        if (currentSignIndex >= signSequence.length) {
            setIsPlaying(false);
            setCurrentMode('idle');

            if (loop && signSequence.length > 0) {
                setCurrentSignIndex(0);
            } else {
                onSequenceComplete?.();
            }
            return;
        }

        const currentGloss = signSequence[currentSignIndex];
        setIsLoading(true);
        setError(null);

        try {
            // Get sign data (from cache or fetch)
            let signData = signCache[currentGloss];

            if (!signData) {
                const response = await fetch(
                    `/api/hybrid/sign/${encodeURIComponent(currentGloss)}?dialect=${currentDialect}&quality=${quality}`
                );

                if (response.ok) {
                    signData = await response.json();
                    setSignCache(prev => ({ ...prev, [currentGloss]: signData }));
                }
            }

            setCurrentSignData(signData);
            setIsLoading(false);

            if (signData?.type === 'signAvatars' || signData?.type === 'video') {
                // Play video
                await playVideo(signData.videoURL);
            } else if (signData?.type === 'procedural') {
                // Play procedural animation
                await playProceduralAnimation(signData);
            } else if (signData?.type === 'fingerspelling') {
                // Play fingerspelling
                await playFingerspelling(signData);
            } else if (signData?.type === 'external') {
                // External link - show procedural fallback
                await playProceduralFallback(currentGloss, signData);
            } else {
                // Unknown type - use basic fallback
                await playProceduralFallback(currentGloss, null);
            }

        } catch (err) {
            console.error('Error playing sign:', err);
            setError(err.message);
            setIsLoading(false);
            // Try to continue with next sign
            await playProceduralFallback(currentGloss, null);
        }
    }, [currentSignIndex, signSequence, signCache, currentDialect, quality, loop, onSequenceComplete]);

    // Auto-play on mount and when index changes
    useEffect(() => {
        if (autoPlay && signSequence.length > 0 && !isPaused) {
            setIsPlaying(true);
            playCurrentSign();
        }
    }, [currentSignIndex, autoPlay, signSequence.length, isPaused]);

    // ============================================
    // VIDEO PLAYBACK
    // ============================================

    const playVideo = (videoURL) => {
        return new Promise((resolve, reject) => {
            if (!videoRef.current || !videoURL) {
                resolve();
                return;
            }

            setCurrentMode('video');
            const video = videoRef.current;

            const cleanup = () => {
                video.oncanplaythrough = null;
                video.onended = null;
                video.onerror = null;
            };

            video.oncanplaythrough = () => {
                video.play().catch(console.error);
            };

            video.onended = () => {
                cleanup();
                onSignComplete?.(signSequence[currentSignIndex]);
                advanceToNextSign();
                resolve();
            };

            video.onerror = (err) => {
                cleanup();
                console.error('Video playback error:', err);
                // Fall back to procedural
                setCurrentMode('procedural');
                playProceduralFallback(signSequence[currentSignIndex], null).then(resolve);
            };

            video.src = videoURL;
            video.load();
        });
    };

    // ============================================
    // PROCEDURAL ANIMATION
    // ============================================

    const playProceduralAnimation = (signData) => {
        return new Promise((resolve) => {
            setCurrentMode('procedural');

            const duration = (signData?.duration || 2) * 1000;
            const animation = signData?.animation;

            if (animation && canvasRef.current) {
                // Animate using keyframes
                animateKeyframes(animation);
            }

            setTimeout(() => {
                onSignComplete?.(signSequence[currentSignIndex]);
                advanceToNextSign();
                resolve();
            }, duration);
        });
    };

    const playProceduralFallback = (gloss, signData) => {
        return new Promise((resolve) => {
            setCurrentMode('procedural');

            const duration = signData?.duration ? signData.duration * 1000 : CONFIG.fallbackDuration;

            setTimeout(() => {
                onSignComplete?.(gloss);
                advanceToNextSign();
                resolve();
            }, duration);
        });
    };

    const animateKeyframes = (animation) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const startTime = performance.now();
        const duration = animation.duration * 1000;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw avatar base
            drawAvatarBase(ctx, canvas.width, canvas.height);

            // Interpolate and draw hands based on progress
            if (animation.tracks) {
                animation.tracks.forEach(track => {
                    if (track.target === 'rightHand' || track.target === 'leftHand') {
                        drawHand(ctx, track, progress, canvas.width, canvas.height);
                    }
                });
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    };

    const drawAvatarBase = (ctx, width, height) => {
        // Simple avatar silhouette
        ctx.fillStyle = '#4f46e5';

        // Head
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.25, height * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillRect(width * 0.35, height * 0.35, width * 0.3, height * 0.4);
    };

    const drawHand = (ctx, track, progress, width, height) => {
        if (!track.keyframes || track.keyframes.length < 2) return;

        // Find current keyframe
        const totalDuration = track.keyframes[track.keyframes.length - 1].time;
        const currentTime = progress * totalDuration;

        let prevFrame = track.keyframes[0];
        let nextFrame = track.keyframes[1];

        for (let i = 0; i < track.keyframes.length - 1; i++) {
            if (track.keyframes[i + 1].time >= currentTime) {
                prevFrame = track.keyframes[i];
                nextFrame = track.keyframes[i + 1];
                break;
            }
        }

        // Interpolate position
        const frameProgress = (currentTime - prevFrame.time) / (nextFrame.time - prevFrame.time);
        const x = prevFrame.position[0] + (nextFrame.position[0] - prevFrame.position[0]) * frameProgress;
        const y = prevFrame.position[1] + (nextFrame.position[1] - prevFrame.position[1]) * frameProgress;

        // Draw hand circle
        ctx.fillStyle = track.target === 'rightHand' ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(x * width, y * height, height * 0.05, 0, Math.PI * 2);
        ctx.fill();
    };

    // ============================================
    // FINGERSPELLING
    // ============================================

    const playFingerspelling = (signData) => {
        return new Promise((resolve) => {
            setCurrentMode('fingerspelling');

            const letters = signData.letters || [];
            const totalDuration = letters.reduce((sum, l) => sum + (l.duration * 1000), 0);

            // Could add letter-by-letter animation here
            setTimeout(() => {
                onSignComplete?.(signSequence[currentSignIndex]);
                advanceToNextSign();
                resolve();
            }, totalDuration || CONFIG.fallbackDuration);
        });
    };

    // ============================================
    // NAVIGATION
    // ============================================

    const advanceToNextSign = () => {
        setTimeout(() => {
            setCurrentSignIndex(prev => prev + 1);
        }, CONFIG.autoAdvanceDelay);
    };

    const handlePause = () => {
        setIsPaused(true);
        if (videoRef.current) {
            videoRef.current.pause();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    const handleResume = () => {
        setIsPaused(false);
        if (videoRef.current && currentMode === 'video') {
            videoRef.current.play();
        }
    };

    const handleRestart = () => {
        setCurrentSignIndex(0);
        setIsPaused(false);
        setError(null);
    };

    const handleSkip = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        advanceToNextSign();
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // ============================================
    // RENDER
    // ============================================

    const currentGloss = signSequence[currentSignIndex] || '';
    const progress = signSequence.length > 0
        ? ((currentSignIndex + 1) / signSequence.length) * 100
        : 0;

    return (
        <div className="video-avatar-container">
            {/* Video Player (hidden when not in video mode) */}
            <video
                ref={videoRef}
                className={`avatar-video ${currentMode === 'video' ? 'visible' : 'hidden'}`}
                muted
                playsInline
            />

            {/* Procedural Animation Canvas */}
            <canvas
                ref={canvasRef}
                className={`avatar-canvas ${currentMode === 'procedural' ? 'visible' : 'hidden'}`}
                width={400}
                height={600}
            />

            {/* Fingerspelling Display */}
            {currentMode === 'fingerspelling' && currentSignData?.letters && (
                <div className="fingerspelling-display">
                    <div className="letter-sequence">
                        {currentSignData.letters.map((l, i) => (
                            <span key={i} className="letter">{l.letter}</span>
                        ))}
                    </div>
                    <p className="fingerspell-label">Fingerspelling: {currentGloss}</p>
                </div>
            )}

            {/* Procedural Fallback Display */}
            {currentMode === 'procedural' && currentSignData && (
                <div className="procedural-display">
                    <div
                        className="sign-icon"
                        style={{ backgroundColor: currentSignData.color || '#6366f1' }}
                    >
                        {currentGloss.charAt(0)}
                    </div>
                    <p className="sign-description">{currentSignData.description}</p>
                    {currentSignData.category && (
                        <span className="sign-category">{currentSignData.category}</span>
                    )}
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading sign...</p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="error-overlay">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={handleSkip}>Skip</button>
                </div>
            )}

            {/* Sign Indicator */}
            <div className="sign-indicator">
                <span className="sign-text">{currentGloss}</span>
                <span className="sign-counter">
                    {currentSignIndex + 1} / {signSequence.length}
                </span>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="sign-mode">{currentMode}</span>
            </div>

            {/* Controls */}
            {showControls && signSequence.length > 0 && (
                <div className="avatar-controls">
                    <button
                        className="control-btn restart"
                        onClick={handleRestart}
                        title="Restart"
                    >
                        ⏮️
                    </button>

                    {isPaused ? (
                        <button
                            className="control-btn play"
                            onClick={handleResume}
                            title="Resume"
                        >
                            ▶️
                        </button>
                    ) : (
                        <button
                            className="control-btn pause"
                            onClick={handlePause}
                            title="Pause"
                        >
                            ⏸️
                        </button>
                    )}

                    <button
                        className="control-btn skip"
                        onClick={handleSkip}
                        title="Skip"
                    >
                        ⏭️
                    </button>
                </div>
            )}

            {/* Mode Indicator */}
            <div className="mode-indicator">
                {currentMode === 'video' && <span className="mode-badge video">🎬 Video</span>}
                {currentMode === 'procedural' && <span className="mode-badge procedural">🤖 Procedural</span>}
                {currentMode === 'fingerspelling' && <span className="mode-badge fingerspelling">✋ Fingerspelling</span>}
                {currentMode === 'idle' && <span className="mode-badge idle">⏹️ Ready</span>}
            </div>

            {/* Empty State */}
            {signSequence.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🤟</div>
                    <h2>Ready to Sign</h2>
                    <p>Speak or type something to translate</p>
                </div>
            )}
        </div>
    );
};

export default VideoAvatar;
