/**
 * How2Sign Avatar Component
 * Plays REAL OpenPose keypoint data from How2Sign dataset
 * NOT AI-generated - 100% authentic motion capture
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// OpenPose body keypoint indices (25 points)
const BODY_KEYPOINTS = {
    NOSE: 0,
    NECK: 1,
    RIGHT_SHOULDER: 2,
    RIGHT_ELBOW: 3,
    RIGHT_WRIST: 4,
    LEFT_SHOULDER: 5,
    LEFT_ELBOW: 6,
    LEFT_WRIST: 7,
    MID_HIP: 8,
    RIGHT_HIP: 9,
    RIGHT_KNEE: 10,
    RIGHT_ANKLE: 11,
    LEFT_HIP: 12,
    LEFT_KNEE: 13,
    LEFT_ANKLE: 14,
    RIGHT_EYE: 15,
    LEFT_EYE: 16,
    RIGHT_EAR: 17,
    LEFT_EAR: 18,
    LEFT_BIG_TOE: 19,
    LEFT_SMALL_TOE: 20,
    LEFT_HEEL: 21,
    RIGHT_BIG_TOE: 22,
    RIGHT_SMALL_TOE: 23,
    RIGHT_HEEL: 24
};

// Hand keypoint indices (21 points per hand)
const HAND_KEYPOINTS = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
};

/**
 * Main How2Sign Avatar component
 */
export function How2SignAvatar({
    keypointData,
    fps = 25,
    loop = true,
    playing = true,
    scale = 1,
    position = [0, 0, 0]
}) {
    const groupRef = useRef();
    const currentFrame = useRef(0);
    const lastTime = useRef(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Frame interval in ms
    const frameInterval = 1000 / fps;

    // Process keypoint data
    const frames = useMemo(() => {
        if (!keypointData) return [];

        // Handle different data formats
        if (Array.isArray(keypointData)) {
            return keypointData;
        }
        if (keypointData.frames) {
            return keypointData.frames;
        }
        if (keypointData.keypoints) {
            return keypointData.keypoints;
        }

        return [];
    }, [keypointData]);

    useEffect(() => {
        if (frames.length > 0) {
            setIsLoaded(true);
            currentFrame.current = 0;
        }
    }, [frames]);

    useFrame((state) => {
        if (!playing || frames.length === 0) return;

        const currentTime = state.clock.getElapsedTime() * 1000;

        // Check if it's time for next frame
        if (currentTime - lastTime.current >= frameInterval) {
            lastTime.current = currentTime;

            // Get current frame data
            const frame = frames[currentFrame.current];

            if (frame && groupRef.current) {
                // Apply keypoints to visualization
                updateVisualization(groupRef.current, frame);
            }

            // Advance frame
            if (loop) {
                currentFrame.current = (currentFrame.current + 1) % frames.length;
            } else if (currentFrame.current < frames.length - 1) {
                currentFrame.current++;
            }
        }
    });

    if (!isLoaded) {
        return (
            <group position={position}>
                <mesh>
                    <boxGeometry args={[0.5, 1.5, 0.2]} />
                    <meshStandardMaterial color="#888" opacity={0.5} transparent />
                </mesh>
                <LoadingIndicator />
            </group>
        );
    }

    return (
        <group ref={groupRef} position={position} scale={scale}>
            {/* Skeleton visualization */}
            <SkeletonVisualizer />
        </group>
    );
}

/**
 * Skeleton visualization using spheres and lines
 */
function SkeletonVisualizer() {
    return (
        <group name="skeleton">
            {/* Body joints */}
            {Object.entries(BODY_KEYPOINTS).slice(0, 15).map(([name, _], idx) => (
                <mesh key={name} name={`body_${name}`} position={[0, 0, 0]}>
                    <sphereGeometry args={[0.02, 8, 8]} />
                    <meshStandardMaterial color={getJointColor(name)} />
                </mesh>
            ))}

            {/* Right hand joints */}
            {Object.entries(HAND_KEYPOINTS).map(([name, _], idx) => (
                <mesh key={`rh_${name}`} name={`rhand_${name}`} position={[0, 0, 0]}>
                    <sphereGeometry args={[0.01, 6, 6]} />
                    <meshStandardMaterial color="#ff6b6b" />
                </mesh>
            ))}

            {/* Left hand joints */}
            {Object.entries(HAND_KEYPOINTS).map(([name, _], idx) => (
                <mesh key={`lh_${name}`} name={`lhand_${name}`} position={[0, 0, 0]}>
                    <sphereGeometry args={[0.01, 6, 6]} />
                    <meshStandardMaterial color="#4ecdc4" />
                </mesh>
            ))}

            {/* Body */}
            <mesh name="body_mesh" position={[0, 0, -0.05]}>
                <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
                <meshStandardMaterial color="#333" opacity={0.7} transparent />
            </mesh>

            {/* Head */}
            <mesh name="head_mesh" position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color="#f5d6c6" />
            </mesh>
        </group>
    );
}

/**
 * Loading indicator
 */
function LoadingIndicator() {
    const meshRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 2;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0.5, 0]}>
            <torusGeometry args={[0.1, 0.02, 8, 24]} />
            <meshBasicMaterial color="#4ecdc4" />
        </mesh>
    );
}

/**
 * Get color for joint type
 */
function getJointColor(name) {
    if (name.includes('RIGHT')) return '#ff6b6b';
    if (name.includes('LEFT')) return '#4ecdc4';
    return '#ffd93d';
}

/**
 * Update visualization with OpenPose keypoints
 */
function updateVisualization(group, frame) {
    // Get keypoint arrays from frame
    const bodyKp = frame.pose_keypoints_2d || frame.body || [];
    const rightHandKp = frame.hand_right_keypoints_2d || frame.right_hand || [];
    const leftHandKp = frame.hand_left_keypoints_2d || frame.left_hand || [];

    // Scale factor (OpenPose uses pixel coordinates)
    const scale = 0.002;
    const offsetX = -0.5;
    const offsetY = 1.0;

    // Update body keypoints (every 3 values: x, y, confidence)
    Object.entries(BODY_KEYPOINTS).forEach(([name, idx]) => {
        const mesh = group.getObjectByName(`body_${name}`);
        if (mesh && bodyKp.length > idx * 3 + 1) {
            const x = (bodyKp[idx * 3] * scale) + offsetX;
            const y = -(bodyKp[idx * 3 + 1] * scale) + offsetY;
            const confidence = bodyKp[idx * 3 + 2] || 0;

            if (confidence > 0.1) {
                mesh.position.set(x, y, 0);
                mesh.visible = true;
            } else {
                mesh.visible = false;
            }
        }
    });

    // Update right hand
    Object.entries(HAND_KEYPOINTS).forEach(([name, idx]) => {
        const mesh = group.getObjectByName(`rhand_${name}`);
        if (mesh && rightHandKp.length > idx * 3 + 1) {
            const x = (rightHandKp[idx * 3] * scale) + offsetX;
            const y = -(rightHandKp[idx * 3 + 1] * scale) + offsetY;
            const confidence = rightHandKp[idx * 3 + 2] || 0;

            if (confidence > 0.1) {
                mesh.position.set(x, y, 0.05);
                mesh.visible = true;
            } else {
                mesh.visible = false;
            }
        }
    });

    // Update left hand
    Object.entries(HAND_KEYPOINTS).forEach(([name, idx]) => {
        const mesh = group.getObjectByName(`lhand_${name}`);
        if (mesh && leftHandKp.length > idx * 3 + 1) {
            const x = (leftHandKp[idx * 3] * scale) + offsetX;
            const y = -(leftHandKp[idx * 3 + 1] * scale) + offsetY;
            const confidence = leftHandKp[idx * 3 + 2] || 0;

            if (confidence > 0.1) {
                mesh.position.set(x, y, 0.05);
                mesh.visible = true;
            } else {
                mesh.visible = false;
            }
        }
    });

    // Update head position based on nose keypoint
    const head = group.getObjectByName('head_mesh');
    if (head && bodyKp.length > 2) {
        const noseX = (bodyKp[0] * scale) + offsetX;
        const noseY = -(bodyKp[1] * scale) + offsetY;
        head.position.set(noseX, noseY + 0.1, 0);
    }

    // Update body mesh based on neck and mid-hip
    const body = group.getObjectByName('body_mesh');
    if (body && bodyKp.length > BODY_KEYPOINTS.MID_HIP * 3 + 1) {
        const neckIdx = BODY_KEYPOINTS.NECK;
        const hipIdx = BODY_KEYPOINTS.MID_HIP;

        const neckX = (bodyKp[neckIdx * 3] * scale) + offsetX;
        const neckY = -(bodyKp[neckIdx * 3 + 1] * scale) + offsetY;
        const hipX = (bodyKp[hipIdx * 3] * scale) + offsetX;
        const hipY = -(bodyKp[hipIdx * 3 + 1] * scale) + offsetY;

        const centerX = (neckX + hipX) / 2;
        const centerY = (neckY + hipY) / 2;

        body.position.set(centerX, centerY, -0.05);
    }
}

/**
 * Avatar controls component
 */
export function AvatarControls({
    onPlay,
    onPause,
    onReset,
    currentFrame,
    totalFrames,
    playing
}) {
    return (
        <div className="avatar-controls" style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 20px',
            borderRadius: '20px'
        }}>
            <button onClick={onReset} style={buttonStyle}>⏮️</button>
            <button onClick={playing ? onPause : onPlay} style={buttonStyle}>
                {playing ? '⏸️' : '▶️'}
            </button>
            <span style={{ color: 'white', fontSize: '14px' }}>
                {currentFrame} / {totalFrames}
            </span>
        </div>
    );
}

const buttonStyle = {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '5px 10px'
};

export default How2SignAvatar;
