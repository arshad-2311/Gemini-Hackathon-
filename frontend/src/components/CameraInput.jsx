import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Camera Input Component with MediaPipe Holistic
 * Captures video and extracts hand/pose landmarks
 */
export default function CameraInput({ onLandmarks, onObjectDetection, isActive }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const lastObjectDetectionRef = useRef(0);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please check permissions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setCameraActive(false);
    }, []);

    // Process video frame
    const processFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !cameraActive) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Draw video to canvas
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);

        // Mock landmark detection (in production, use MediaPipe)
        // This simulates hand landmarks for demo purposes
        const mockLandmarks = generateMockLandmarks();

        // Draw landmarks overlay
        drawLandmarks(ctx, mockLandmarks);

        // Send landmarks to parent
        if (onLandmarks && isActive) {
            onLandmarks(mockLandmarks);
        }

        // Object detection (throttled)
        const now = Date.now();
        if (onObjectDetection && now - lastObjectDetectionRef.current > 3000) {
            lastObjectDetectionRef.current = now;

            // Get base64 image for object detection
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            onObjectDetection(imageBase64);
        }

        // Continue processing
        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [cameraActive, onLandmarks, onObjectDetection, isActive]);

    // Generate mock landmarks for demo
    const generateMockLandmarks = () => {
        const t = Date.now() / 1000;

        return {
            rightHand: {
                visible: true,
                landmarks: Array(21).fill(null).map((_, i) => ({
                    x: 0.3 + Math.sin(t + i * 0.1) * 0.05,
                    y: 0.5 + Math.cos(t + i * 0.1) * 0.05 + i * 0.02,
                    z: Math.sin(t * 0.5) * 0.1
                }))
            },
            leftHand: {
                visible: true,
                landmarks: Array(21).fill(null).map((_, i) => ({
                    x: 0.7 + Math.sin(t + i * 0.1 + 1) * 0.05,
                    y: 0.5 + Math.cos(t + i * 0.1 + 1) * 0.05 + i * 0.02,
                    z: Math.sin(t * 0.5 + 1) * 0.1
                }))
            },
            pose: {
                landmarks: Array(33).fill(null).map((_, i) => ({
                    x: 0.5 + Math.sin(t * 0.3 + i) * 0.1,
                    y: 0.3 + i * 0.02,
                    z: 0
                }))
            },
            face: {
                landmarks: Array(468).fill(null).map((_, i) => ({
                    x: 0.5 + (i % 20 - 10) * 0.01,
                    y: 0.2 + Math.floor(i / 20) * 0.005,
                    z: 0
                }))
            }
        };
    };

    // Draw landmarks on canvas
    const drawLandmarks = (ctx, landmarks) => {
        const { width, height } = ctx.canvas;

        // Draw right hand
        if (landmarks.rightHand?.visible) {
            ctx.fillStyle = '#6366f1';
            landmarks.rightHand.landmarks.forEach(lm => {
                ctx.beginPath();
                ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw connections
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2;
            drawHandConnections(ctx, landmarks.rightHand.landmarks, width, height);
        }

        // Draw left hand
        if (landmarks.leftHand?.visible) {
            ctx.fillStyle = '#10b981';
            landmarks.leftHand.landmarks.forEach(lm => {
                ctx.beginPath();
                ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2;
            drawHandConnections(ctx, landmarks.leftHand.landmarks, width, height);
        }
    };

    // Draw hand skeleton connections
    const drawHandConnections = (ctx, landmarks, width, height) => {
        // Finger connections
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17]
        ];

        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                ctx.beginPath();
                ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
                ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
                ctx.stroke();
            }
        });
    };

    // Start camera on mount if active
    useEffect(() => {
        if (isActive && !cameraActive) {
            startCamera();
        } else if (!isActive && cameraActive) {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isActive, startCamera, stopCamera]);

    // Start frame processing when camera is active
    useEffect(() => {
        if (cameraActive && videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play();
                processFrame();
            };
        }
    }, [cameraActive, processFrame]);

    return (
        <div className="camera-container">
            {isLoading && (
                <div className="camera-placeholder">
                    <div className="loading-spinner"></div>
                    <p>Starting camera...</p>
                </div>
            )}

            {error && (
                <div className="camera-placeholder">
                    <span className="icon">📷</span>
                    <p>{error}</p>
                    <button
                        onClick={startCamera}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {!isActive && !error && !isLoading && (
                <div className="camera-placeholder">
                    <span className="icon">📷</span>
                    <p>Camera paused</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        Switch to Translate or Learn mode to activate
                    </p>
                </div>
            )}

            <video
                ref={videoRef}
                style={{
                    display: cameraActive ? 'block' : 'none',
                    transform: 'scaleX(-1)' // Mirror for natural interaction
                }}
                playsInline
                muted
            />

            <canvas
                ref={canvasRef}
                className="camera-overlay"
                style={{
                    display: cameraActive ? 'block' : 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: 'scaleX(-1)'
                }}
            />

            {cameraActive && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        background: 'white',
                        borderRadius: '50%',
                        animation: 'pulse 1s infinite'
                    }}></span>
                    LIVE
                </div>
            )}
        </div>
    );
}
