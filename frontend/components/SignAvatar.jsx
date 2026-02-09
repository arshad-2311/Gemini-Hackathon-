// frontend/components/SignAvatar.jsx
// 3D Avatar component for displaying sign language animations
import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * SignAvatar - Animates a 3D avatar based on sign language pose data
 * @param {Object} poseData - Pose data from Gemini API
 * @param {boolean} isPlaying - Whether animation should play
 * @param {function} onSignChange - Callback when current sign changes
 * @param {function} onComplete - Callback when animation completes
 * @param {number} speed - Animation speed multiplier (default 1.0)
 */
export function SignAvatar({
    poseData,
    isPlaying = true,
    onSignChange,
    onComplete,
    speed = 1.0
}) {
    const avatarRef = useRef();
    const mixerRef = useRef(null);
    const elapsedTime = useRef(0);
    const [currentSignGloss, setCurrentSignGloss] = useState(null);
    const hasCompleted = useRef(false);

    // Reset when new pose data arrives
    useEffect(() => {
        elapsedTime.current = 0;
        hasCompleted.current = false;
        setCurrentSignGloss(null);
    }, [poseData]);

    useFrame((state, delta) => {
        if (!poseData || !poseData.signs || !isPlaying) return;

        elapsedTime.current += delta * 1000 * speed; // Convert to ms with speed

        const totalDuration = poseData.total_duration_ms ||
            (poseData.signs.length > 0 ? poseData.signs[poseData.signs.length - 1].end_ms : 0);

        // Check if animation complete
        if (elapsedTime.current >= totalDuration && !hasCompleted.current) {
            hasCompleted.current = true;
            onComplete?.();
            return;
        }

        // Find current sign and frame
        let currentSign = null;
        let currentFrame = null;

        for (const sign of poseData.signs) {
            // Skip transition markers
            if (sign.isTransition) continue;

            if (elapsedTime.current >= sign.start_ms &&
                elapsedTime.current <= sign.end_ms) {
                currentSign = sign;

                // Update current sign gloss for display
                if (sign.gloss !== currentSignGloss) {
                    setCurrentSignGloss(sign.gloss);
                    onSignChange?.(sign);
                }

                // Find current frame within sign
                if (sign.frames && sign.frames.length > 0) {
                    for (let i = 0; i < sign.frames.length - 1; i++) {
                        const frame = sign.frames[i];
                        const nextFrame = sign.frames[i + 1];

                        const frameTime = sign.start_ms + frame.timestamp_ms;
                        const nextFrameTime = sign.start_ms + nextFrame.timestamp_ms;

                        if (elapsedTime.current >= frameTime &&
                            elapsedTime.current < nextFrameTime) {
                            // Interpolate between frames
                            const t = (elapsedTime.current - frameTime) / (nextFrameTime - frameTime);
                            currentFrame = interpolateFrames(frame, nextFrame, easeInOutQuad(t));
                            break;
                        }
                    }

                    // Use last frame if past all keyframes
                    if (!currentFrame && sign.frames.length > 0) {
                        currentFrame = sign.frames[sign.frames.length - 1];
                    }
                }
                break;
            }
        }

        if (currentFrame && avatarRef.current) {
            applyPoseToAvatar(avatarRef.current, currentFrame);
        }
    });

    return (
        <group ref={avatarRef}>
            {/* Avatar body parts will be children of this group */}
            <AvatarBody />
        </group>
    );
}

// Easing function for smoother animation
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Interpolate between two keyframes
 */
function interpolateFrames(frame1, frame2, t) {
    const result = {};

    // Interpolate right hand
    if (frame1.right_hand && frame2.right_hand) {
        result.right_hand = interpolateBodyPart(frame1.right_hand, frame2.right_hand, t);
    }

    // Interpolate left hand
    if (frame1.left_hand && frame2.left_hand) {
        result.left_hand = interpolateBodyPart(frame1.left_hand, frame2.left_hand, t);
    }

    // Interpolate head
    if (frame1.head && frame2.head) {
        result.head = {
            position: lerpArray(frame1.head.position || [0, 0, 0], frame2.head.position || [0, 0, 0], t),
            rotation: lerpArray(frame1.head.rotation || [0, 0, 0], frame2.head.rotation || [0, 0, 0], t)
        };
    }

    // Interpolate torso
    if (frame1.torso && frame2.torso) {
        result.torso = {
            lean: lerpArray(frame1.torso.lean || [0, 0], frame2.torso.lean || [0, 0], t)
        };
    }

    // Face doesn't interpolate smoothly - use target frame's expression
    result.face = t > 0.5 ? frame2.face : frame1.face;

    return result;
}

function interpolateBodyPart(part1, part2, t) {
    return {
        position: lerpArray(part1.position || [0, 0, 0], part2.position || [0, 0, 0], t),
        rotation: lerpArray(part1.rotation || [0, 0, 0], part2.rotation || [0, 0, 0], t),
        handshape: t > 0.5 ? part2.handshape : part1.handshape,
        palm_orientation: t > 0.5 ? part2.palm_orientation : part1.palm_orientation
    };
}

function lerpArray(arr1, arr2, t) {
    if (!arr1 || !arr2) return arr1 || arr2 || [0, 0, 0];
    return arr1.map((v, i) => THREE.MathUtils.lerp(v, arr2[i] || 0, t));
}

/**
 * Apply frame data to Three.js avatar bones/objects
 */
function applyPoseToAvatar(avatar, frame) {
    if (!avatar || !frame) return;

    // Apply right hand pose
    if (frame.right_hand && avatar.rightHand) {
        const { position, rotation } = frame.right_hand;

        if (position) {
            avatar.rightHand.position.set(
                position[0] || 0,
                position[1] || 0,
                position[2] || 0
            );
        }

        if (rotation) {
            // Convert degrees to radians
            avatar.rightHand.rotation.set(
                THREE.MathUtils.degToRad(rotation[0] || 0),
                THREE.MathUtils.degToRad(rotation[1] || 0),
                THREE.MathUtils.degToRad(rotation[2] || 0)
            );
        }

        // Apply handshape if avatar supports it
        if (avatar.rightHand.setHandshape && frame.right_hand.handshape) {
            avatar.rightHand.setHandshape(frame.right_hand.handshape);
        }
    }

    // Apply left hand pose
    if (frame.left_hand && avatar.leftHand) {
        const { position, rotation } = frame.left_hand;

        if (position) {
            avatar.leftHand.position.set(
                position[0] || 0,
                position[1] || 0,
                position[2] || 0
            );
        }

        if (rotation) {
            avatar.leftHand.rotation.set(
                THREE.MathUtils.degToRad(rotation[0] || 0),
                THREE.MathUtils.degToRad(rotation[1] || 0),
                THREE.MathUtils.degToRad(rotation[2] || 0)
            );
        }

        if (avatar.leftHand.setHandshape && frame.left_hand.handshape) {
            avatar.leftHand.setHandshape(frame.left_hand.handshape);
        }
    }

    // Apply head pose
    if (frame.head && avatar.head) {
        const { position, rotation } = frame.head;

        if (position) {
            avatar.head.position.set(
                position[0] || 0,
                position[1] || 0,
                position[2] || 0
            );
        }

        if (rotation) {
            avatar.head.rotation.set(
                THREE.MathUtils.degToRad(rotation[0] || 0),
                THREE.MathUtils.degToRad(rotation[1] || 0),
                THREE.MathUtils.degToRad(rotation[2] || 0)
            );
        }
    }

    // Apply torso lean
    if (frame.torso && avatar.torso) {
        const lean = frame.torso.lean || [0, 0];
        avatar.torso.rotation.set(
            THREE.MathUtils.degToRad(lean[0] || 0), // forward/back
            0,
            THREE.MathUtils.degToRad(lean[1] || 0)  // left/right
        );
    }

    // Apply facial expression
    if (frame.face && avatar.face) {
        applyFacialExpression(avatar.face, frame.face);
    }
}

/**
 * Apply facial expression to avatar face
 */
function applyFacialExpression(face, expression) {
    if (!face || !expression) return;

    // Eyebrows
    if (face.setEyebrows && expression.eyebrows) {
        const eyebrowValue = parseExpression(expression.eyebrows, {
            'raised': 1,
            'neutral': 0,
            'furrowed': -1
        });
        face.setEyebrows(eyebrowValue);
    }

    // Eyes
    if (face.setEyes && expression.eyes) {
        const eyeValue = parseExpression(expression.eyes, {
            'wide': 1,
            'normal': 0,
            'squinted': -1
        });
        face.setEyes(eyeValue);
    }

    // Mouth
    if (face.setMouth && expression.mouth) {
        face.setMouth(expression.mouth);
    }

    // Head nod (for yes/no questions)
    if (face.setNod && expression.head_nod) {
        face.setNod(expression.head_nod);
    }
}

function parseExpression(value, mapping) {
    if (typeof value === 'number') return value;
    if (mapping[value] !== undefined) return mapping[value];
    // Try parsing as number (e.g., "-5to5" style)
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Basic avatar body placeholder component
 * Replace this with your actual 3D model
 */
function AvatarBody() {
    return (
        <group>
            {/* Head */}
            <mesh position={[0, 1.6, 0]} name="head">
                <sphereGeometry args={[0.15, 32, 32]} />
                <meshStandardMaterial color="#ffdbac" />
            </mesh>

            {/* Torso */}
            <mesh position={[0, 1.2, 0]} name="torso">
                <boxGeometry args={[0.4, 0.5, 0.2]} />
                <meshStandardMaterial color="#4a90d9" />
            </mesh>

            {/* Right arm */}
            <group name="rightArm">
                <mesh position={[0.3, 1.2, 0]}>
                    <boxGeometry args={[0.08, 0.3, 0.08]} />
                    <meshStandardMaterial color="#ffdbac" />
                </mesh>
                {/* Right hand */}
                <mesh position={[0.3, 1.0, 0.1]} name="rightHand">
                    <boxGeometry args={[0.1, 0.15, 0.05]} />
                    <meshStandardMaterial color="#ffdbac" />
                </mesh>
            </group>

            {/* Left arm */}
            <group name="leftArm">
                <mesh position={[-0.3, 1.2, 0]}>
                    <boxGeometry args={[0.08, 0.3, 0.08]} />
                    <meshStandardMaterial color="#ffdbac" />
                </mesh>
                {/* Left hand */}
                <mesh position={[-0.3, 1.0, 0.1]} name="leftHand">
                    <boxGeometry args={[0.1, 0.15, 0.05]} />
                    <meshStandardMaterial color="#ffdbac" />
                </mesh>
            </group>
        </group>
    );
}

export default SignAvatar;
