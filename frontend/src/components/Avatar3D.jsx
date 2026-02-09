/**
 * ASL Avatar with JSON Animation Schema
 * 
 * Supports the following JSON animation format:
 * {
 *   "signs": [{
 *     "gloss": "HELLO",
 *     "duration": 1.5,
 *     "hand_shape": "OpenPalm" | "Fist" | "IndexPoint" | "C_Shape",
 *     "target_position": {
 *       "right_hand": {"x": 0.2, "y": 1.5, "z": 0.5},
 *       "left_hand": {"x": -0.2, "y": 0.9, "z": 0.3}
 *     },
 *     "movement_action": "Wave" | "Tap" | "Circular" | "Hold",
 *     "facial_expression": "Neutral" | "Smile" | "EyebrowsUp"
 *   }]
 * }
 * 
 * Uses Euler angles in degrees relative to T-Pose
 */

import React, { useRef, useEffect, useState, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// CONSTANTS
// ============================================

const DEG2RAD = Math.PI / 180;
const LERP_SPEED = 0.12;

const BONES = {
    head: 'mixamorigHead',
    neck: 'mixamorigNeck',
    spine: 'mixamorigSpine',
    spine2: 'mixamorigSpine2',
    rArm: 'mixamorigRightArm',
    rForeArm: 'mixamorigRightForeArm',
    rHand: 'mixamorigRightHand',
    lArm: 'mixamorigLeftArm',
    lForeArm: 'mixamorigLeftForeArm',
    lHand: 'mixamorigLeftHand',
};

// ============================================
// HANDSHAPE MAPPINGS (JSON schema to finger curls)
// ============================================

const HANDSHAPE_MAP = {
    'OpenPalm': {
        thumb: [0, 0, 0], index: [0, 0, 0], middle: [0, 0, 0], ring: [0, 0, 0], pinky: [0, 0, 0]
    },
    'Fist': {
        thumb: [0.4, 0.3, 0.2], index: [1.5, 1.4, 1.0], middle: [1.5, 1.4, 1.0],
        ring: [1.5, 1.4, 1.0], pinky: [1.5, 1.4, 1.0]
    },
    'IndexPoint': {
        thumb: [0.3, 0.2, 0], index: [0, 0, 0], middle: [1.5, 1.4, 1.0],
        ring: [1.5, 1.4, 1.0], pinky: [1.5, 1.4, 1.0]
    },
    'C_Shape': {
        thumb: [0.3, 0.3, 0.2], index: [0.6, 0.5, 0.3], middle: [0.6, 0.5, 0.3],
        ring: [0.6, 0.5, 0.3], pinky: [0.6, 0.5, 0.3]
    },
    'ILY': {
        thumb: [-0.3, 0, 0], index: [0, 0, 0], middle: [1.5, 1.4, 1.0],
        ring: [1.5, 1.4, 1.0], pinky: [0, 0, 0]
    },
    'V_Shape': {
        thumb: [0.4, 0.3, 0.2], index: [0, 0, 0], middle: [0, 0, 0],
        ring: [1.5, 1.4, 1.0], pinky: [1.5, 1.4, 1.0]
    },
    'Pinch': {
        thumb: [0.3, 0.5, 0.3], index: [0.5, 0.6, 0.4], middle: [0.5, 0.6, 0.4],
        ring: [0.8, 0.8, 0.6], pinky: [0.9, 0.9, 0.6]
    }
};

// Legacy handshape names for backward compatibility
const LEGACY_HANDSHAPES = {
    'B': HANDSHAPE_MAP.OpenPalm,
    'S': HANDSHAPE_MAP.Fist,
    'POINT': HANDSHAPE_MAP.IndexPoint,
    'ILY': HANDSHAPE_MAP.ILY,
    'V': HANDSHAPE_MAP.V_Shape,
    'PINCH': HANDSHAPE_MAP.Pinch
};

// ============================================
// POSITION TO BONE ROTATION CONVERTER
// Converts world-space target positions to bone rotations
// ============================================

function positionToBoneRotation(targetPos, side = 'right') {
    // Target position is in world space relative to avatar center
    // x: left(-) / right(+), y: height, z: forward(+) / back(-)

    const { x, y, z } = targetPos;
    const sign = side === 'right' ? 1 : -1;

    // Calculate arm rotation based on target position
    // These are heuristic mappings from position to rotation

    // Z controls arm height (T-pose at z=1.5, relaxed at z=0.4)
    // Higher y position = higher arm
    const armZ = 0.4 + (y - 0.5) * 1.2 * sign;

    // X controls forward/backward
    const armX = -z * 0.5;

    // Y controls rotation of arm itself
    const armY = x * 0.5 * sign;

    // Forearm Y controls elbow bend
    // Closer to body (smaller z) = more bent elbow
    const foreArmY = Math.max(0.2, 1.5 - z * 0.8) * sign;

    return {
        arm: { x: armX, y: armY, z: armZ },
        foreArm: { x: 0, y: foreArmY, z: 0 },
        hand: { x: 0, y: 0, z: 0 }
    };
}

// ============================================
// MOVEMENT ACTION GENERATORS
// ============================================

function generateMovementKeyframes(action, basePos, duration) {
    const keyframes = [];

    switch (action) {
        case 'Wave':
            keyframes.push(
                { time: 0, ...basePos },
                { time: 0.25, foreArmMod: { y: -0.3 } },
                { time: 0.5, foreArmMod: { y: 0.3 } },
                { time: 0.75, foreArmMod: { y: -0.2 } },
                { time: 1.0, foreArmMod: { y: 0 } }
            );
            break;

        case 'Tap':
            keyframes.push(
                { time: 0, ...basePos },
                { time: 0.2, handMod: { x: 0.3 } },
                { time: 0.4, handMod: { x: 0 } },
                { time: 0.6, handMod: { x: 0.3 } },
                { time: 0.8, handMod: { x: 0 } }
            );
            break;

        case 'Circular':
            keyframes.push(
                { time: 0, ...basePos },
                { time: 0.25, foreArmMod: { y: 0.15 }, handMod: { x: 0.1 } },
                { time: 0.5, foreArmMod: { y: 0 }, handMod: { x: 0.15 } },
                { time: 0.75, foreArmMod: { y: -0.15 }, handMod: { x: 0.1 } },
                { time: 1.0, foreArmMod: { y: 0 }, handMod: { x: 0 } }
            );
            break;

        case 'Nod':
            keyframes.push(
                { time: 0, ...basePos },
                { time: 0.15, handMod: { x: 0.5 } },
                { time: 0.3, handMod: { x: -0.3 } },
                { time: 0.45, handMod: { x: 0.5 } },
                { time: 0.6, handMod: { x: 0 } }
            );
            break;

        case 'Snap':
            // Will change handshape during animation
            keyframes.push(
                { time: 0, ...basePos, handshape: 'V_Shape' },
                { time: 0.15, handshape: 'Pinch' },
                { time: 0.3, handshape: 'V_Shape' },
                { time: 0.45, handshape: 'Pinch' },
                { time: 0.6, handshape: 'V_Shape' }
            );
            break;

        case 'Hold':
        default:
            keyframes.push({ time: 0, ...basePos });
            break;
    }

    return keyframes;
}

// ============================================
// ACCURATE ASL SIGNS - Research-based bone rotations
// Sources: lifeprint.com, ava.me, handspeak.com
// All rotations in RADIANS
// ============================================

const ASL_SIGNS_JSON = {
    /**
     * HELLO: Open palm at forehead, wave outward
     * Source: lifeprint.com - "B hand near forehead, moves outward"
     */
    "HELLO": {
        gloss: "HELLO",
        duration: 1.4,
        hand_shape: "OpenPalm",
        // Direct bone rotations (radians) instead of target_position
        bones: {
            rArm: { x: -0.3, y: 0, z: 1.2 },      // Arm raised to side, up toward head
            rForeArm: { x: 0, y: 1.4, z: 0 },     // Forearm bent, hand near forehead  
            rHand: { x: 0, y: 0, z: 0.3 }         // Palm outward
        },
        movement_action: "Wave",
        facial_expression: "Smile",
        movement_keyframes: [
            { time: 0, rHand: { z: 0.3 } },
            { time: 0.25, rHand: { z: -0.2 } },
            { time: 0.5, rHand: { z: 0.3 } },
            { time: 0.75, rHand: { z: -0.2 } },
            { time: 1.0, rHand: { z: 0.3 } }
        ]
    },

    /**
     * THANK-YOU: Flat hand from chin forward
     * Source: ava.me - "Flat B hand at chin, moves forward and down"
     */
    "THANK-YOU": {
        gloss: "THANK-YOU",
        duration: 1.3,
        hand_shape: "OpenPalm",
        bones: {
            rArm: { x: 0.5, y: 0, z: 0.8 },       // Arm forward, raised toward face
            rForeArm: { x: 0, y: 1.8, z: 0 },     // Forearm bent, hand at chin
            rHand: { x: -0.3, y: 0, z: 0 }        // Fingers pointing up at chin
        },
        movement_action: "ThankYou",
        facial_expression: "Smile",
        movement_keyframes: [
            { time: 0, rArm: { x: 0.5 }, rForeArm: { y: 1.8 } },
            { time: 0.5, rArm: { x: 0.2 }, rForeArm: { y: 1.2 } },  // Move forward/down
            { time: 1.0, rArm: { x: 0.1 }, rForeArm: { y: 0.8 } }   // Extend outward
        ]
    },

    /**
     * YES: S-hand (fist) nodding up and down
     * Source: lifeprint.com - "S hand nods like head nodding yes"
     */
    "YES": {
        gloss: "YES",
        duration: 1.2,
        hand_shape: "Fist",
        bones: {
            rArm: { x: 0.3, y: 0, z: 0.6 },       // Arm slightly forward
            rForeArm: { x: 0, y: 1.0, z: 0 },     // Forearm bent, fist in front
            rHand: { x: 0, y: 0, z: 0 }           // Neutral wrist
        },
        movement_action: "Nod",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rHand: { x: 0 } },
            { time: 0.2, rHand: { x: 0.5 } },     // Nod down
            { time: 0.4, rHand: { x: -0.2 } },    // Nod up
            { time: 0.6, rHand: { x: 0.5 } },     // Nod down
            { time: 0.8, rHand: { x: 0 } }        // Return
        ]
    },

    /**
     * NO: Index+middle fingers close onto thumb (snap motion)
     * Source: lifeprint.com - "Index, middle, thumb snap together 2x"
     */
    "NO": {
        gloss: "NO",
        duration: 1.1,
        hand_shape: "V_Shape",
        bones: {
            rArm: { x: 0.3, y: 0, z: 0.5 },       // Arm slightly forward
            rForeArm: { x: 0, y: 0.8, z: 0 },     // Forearm relaxed
            rHand: { x: 0, y: 0, z: 0 }           // Neutral wrist
        },
        movement_action: "Snap",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, handshape: "V_Shape" },
            { time: 0.2, handshape: "Pinch" },    // Fingers snap closed
            { time: 0.4, handshape: "V_Shape" },  // Fingers open
            { time: 0.6, handshape: "Pinch" },    // Snap again
            { time: 0.8, handshape: "V_Shape" }   // Return
        ]
    },

    /**
     * PLEASE: Flat hand circular on chest
     * Source: wiktionary - "Open B hand, palm facing body, circles on chest"
     */
    "PLEASE": {
        gloss: "PLEASE",
        duration: 1.4,
        hand_shape: "OpenPalm",
        bones: {
            rArm: { x: 0.6, y: 0.4, z: 0.5 },     // Arm across body toward chest
            rForeArm: { x: 0, y: 1.6, z: 0 },     // Forearm bent, hand on chest
            rHand: { x: 0, y: 0, z: 1.5 }         // Palm facing body (inward)
        },
        movement_action: "Circular",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rArm: { y: 0.4 }, rHand: { x: 0 } },
            { time: 0.25, rArm: { y: 0.5 }, rHand: { x: 0.15 } },   // Circle right
            { time: 0.5, rArm: { y: 0.4 }, rHand: { x: 0.2 } },     // Circle down
            { time: 0.75, rArm: { y: 0.3 }, rHand: { x: 0.15 } },   // Circle left
            { time: 1.0, rArm: { y: 0.4 }, rHand: { x: 0 } }        // Return
        ]
    },

    /**
     * SORRY: Fist (A-hand) circular on chest
     * Source: ava.me - "A hand or S hand, palm inward, circles on chest"
     */
    "SORRY": {
        gloss: "SORRY",
        duration: 1.4,
        hand_shape: "Fist",
        bones: {
            rArm: { x: 0.6, y: 0.4, z: 0.5 },     // Arm across body toward chest
            rForeArm: { x: 0, y: 1.6, z: 0 },     // Forearm bent, fist on chest
            rHand: { x: 0, y: 0, z: 1.5 }         // Palm facing body
        },
        movement_action: "Circular",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rArm: { y: 0.4 } },
            { time: 0.25, rArm: { y: 0.5 } },     // Circle motion
            { time: 0.5, rArm: { y: 0.4 } },
            { time: 0.75, rArm: { y: 0.3 } },
            { time: 1.0, rArm: { y: 0.4 } }
        ]
    },

    /**
     * I-LOVE-YOU: ILY handshape held out
     * Source: lingvano - "Thumb, index, pinky extended; middle, ring curled"
     */
    "I-LOVE-YOU": {
        gloss: "I-LOVE-YOU",
        duration: 1.5,
        hand_shape: "ILY",
        bones: {
            rArm: { x: 0.2, y: -0.2, z: 0.9 },    // Arm out to side, slightly forward
            rForeArm: { x: 0, y: 0.4, z: 0 },     // Forearm extended
            rHand: { x: 0, y: 0, z: 0 }           // Palm outward
        },
        movement_action: "Wave",
        facial_expression: "Smile",
        movement_keyframes: [
            { time: 0, rHand: { z: 0 } },
            { time: 0.33, rHand: { z: 0.15 } },
            { time: 0.66, rHand: { z: -0.15 } },
            { time: 1.0, rHand: { z: 0 } }
        ]
    },

    /**
     * HELP: Thumbs-up (A-hand) on flat palm, both lift up
     * Source: ava.me - "Dominant fist with thumb up rests on non-dominant flat palm, both rise"
     */
    "HELP": {
        gloss: "HELP",
        duration: 1.4,
        hand_shape: "Fist",  // Dominant is fist with thumb out
        left_hand_shape: "OpenPalm",  // Non-dominant is flat palm up
        bones: {
            rArm: { x: 0.4, y: 0.1, z: 0.5 },     // Right arm forward
            rForeArm: { x: 0, y: 1.2, z: 0 },     // Right forearm bent
            rHand: { x: 0, y: 0, z: -0.5 },       // Thumb pointing up
            lArm: { x: 0.4, y: -0.1, z: -0.5 },   // Left arm forward (mirrored)
            lForeArm: { x: 0, y: -1.2, z: 0 },    // Left forearm bent
            lHand: { x: 0, y: 0, z: 1.5 }         // Palm facing up
        },
        movement_action: "Lift",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rArm: { z: 0.5 }, lArm: { z: -0.5 } },
            { time: 0.5, rArm: { z: 0.8 }, lArm: { z: -0.8 } },    // Both arms rise
            { time: 1.0, rArm: { z: 1.0 }, lArm: { z: -1.0 } }     // Lifted position
        ]
    },

    /**
     * GOOD: Flat hand from chin forward, lands on other palm
     * Source: lifeprint.com - "Fingers at chin, arc forward and down"
     */
    "GOOD": {
        gloss: "GOOD",
        duration: 1.4,
        hand_shape: "OpenPalm",
        left_hand_shape: "OpenPalm",
        bones: {
            rArm: { x: 0.5, y: 0, z: 0.7 },       // Arm forward, near face
            rForeArm: { x: 0, y: 1.6, z: 0 },     // Forearm bent, hand at chin
            rHand: { x: -0.2, y: 0, z: 0 },       // Fingers toward mouth
            lArm: { x: 0.3, y: 0, z: -0.4 },      // Left arm forward, lower
            lForeArm: { x: 0, y: -0.8, z: 0 },    // Left palm up (platform)
            lHand: { x: 0, y: 0, z: 1.5 }         // Palm up
        },
        movement_action: "Good",
        facial_expression: "Smile",
        movement_keyframes: [
            { time: 0, rArm: { x: 0.5 }, rForeArm: { y: 1.6 } },
            { time: 0.5, rArm: { x: 0.3 }, rForeArm: { y: 1.0 } },  // Arc forward
            { time: 1.0, rArm: { x: 0.2 }, rForeArm: { y: 0.6 } }   // Land on palm
        ]
    },

    /**
     * HOME: Flat-O (pinched fingers) touches cheek near mouth, then ear
     * Source: lifeprint.com - "Flat O at cheek, touch mouth area then ear"
     */
    "HOME": {
        gloss: "HOME",
        duration: 1.3,
        hand_shape: "Pinch",
        bones: {
            rArm: { x: 0, y: -0.3, z: 1.1 },      // Arm up to face level
            rForeArm: { x: 0, y: 1.8, z: 0 },     // Forearm bent, hand at cheek
            rHand: { x: -0.5, y: 0.3, z: 0 }      // Fingers pointing toward cheek
        },
        movement_action: "Tap",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rArm: { y: -0.3 } },       // Near mouth
            { time: 0.3, rArm: { y: -0.4 } },     // Touch
            { time: 0.5, rArm: { y: -0.5 } },     // Slide toward ear
            { time: 0.8, rArm: { y: -0.6 } },     // Touch near ear
            { time: 1.0, rArm: { y: -0.5 } }      // Slight return
        ]
    },

    /**
     * YOU: Point index finger at audience
     * Source: lifeprint.com - "Index finger points at person being addressed"
     */
    "YOU": {
        gloss: "YOU",
        duration: 0.9,
        hand_shape: "IndexPoint",
        bones: {
            rArm: { x: 0.3, y: 0, z: 0.7 },       // Arm forward
            rForeArm: { x: 0, y: 0.5, z: 0 },     // Forearm mostly extended
            rHand: { x: 0, y: 0, z: 0 }           // Point forward
        },
        movement_action: "Hold",
        facial_expression: "Neutral"
    },

    /**
     * ME: Point index finger at self (chest)
     * Source: lifeprint.com - "Index finger points at own chest"
     */
    "ME": {
        gloss: "ME",
        duration: 0.9,
        hand_shape: "IndexPoint",
        bones: {
            rArm: { x: 0.5, y: 0.3, z: 0.4 },     // Arm toward self
            rForeArm: { x: 0, y: 1.4, z: 0 },     // Forearm bent, pointing at chest
            rHand: { x: 0.3, y: 0, z: 0.5 }       // Point toward body
        },
        movement_action: "Tap",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rHand: { x: 0.3 } },
            { time: 0.25, rHand: { x: 0.5 } },    // Tap chest
            { time: 0.5, rHand: { x: 0.3 } },
            { time: 0.75, rHand: { x: 0.5 } },    // Tap again
            { time: 1.0, rHand: { x: 0.3 } }
        ]
    },

    /**
     * LOVE: Crossed arms over chest (hug self)
     * Source: brainly - "Fists crossed over heart"
     */
    "LOVE": {
        gloss: "LOVE",
        duration: 1.5,
        hand_shape: "Fist",
        left_hand_shape: "Fist",
        bones: {
            rArm: { x: 0.8, y: 0.5, z: 0.4 },     // Right arm crosses to left
            rForeArm: { x: 0, y: 1.8, z: 0 },     // Forearm bent, fist on chest
            rHand: { x: 0, y: 0, z: 0 },
            lArm: { x: 0.8, y: -0.5, z: -0.4 },   // Left arm crosses to right
            lForeArm: { x: 0, y: -1.8, z: 0 },    // Forearm bent
            lHand: { x: 0, y: 0, z: 0 }
        },
        movement_action: "Hold",
        facial_expression: "Smile"
    },

    /**
     * BAD: Flat hand at chin flips to palm down
     * Source: lifeprint.com - "Flat hand at chin, turns palm down away from face"
     */
    "BAD": {
        gloss: "BAD",
        duration: 1.2,
        hand_shape: "OpenPalm",
        bones: {
            rArm: { x: 0.4, y: 0, z: 0.7 },       // Arm forward near face
            rForeArm: { x: 0, y: 1.5, z: 0 },     // Forearm bent
            rHand: { x: -0.2, y: 0, z: 0 }        // At chin level
        },
        movement_action: "FlipDown",
        facial_expression: "Neutral",
        movement_keyframes: [
            { time: 0, rHand: { z: 0 } },         // Palm toward body
            { time: 0.4, rHand: { z: 1.5 } },     // Flip palm down
            { time: 0.6, rArm: { x: 0.2 } },      // Move away
            { time: 1.0, rHand: { z: 1.5 } }      // Palm down position
        ]
    }
};

// ============================================
// NEUTRAL POSE
// ============================================

const NEUTRAL = {
    rArm: { x: 0.1, y: 0, z: 0.4 },
    rForeArm: { x: 0, y: 0.15, z: 0 },
    rHand: { x: 0, y: 0, z: 0 },
    lArm: { x: 0.1, y: 0, z: -0.4 },
    lForeArm: { x: 0, y: -0.15, z: 0 },
    lHand: { x: 0, y: 0, z: 0 }
};

// ============================================
// CONVERT JSON SIGN TO INTERNAL FORMAT
// Uses direct bone rotations and custom keyframes
// ============================================

function jsonSignToKeyframes(jsonSign) {
    const { bones, hand_shape, left_hand_shape, movement_action, duration, movement_keyframes } = jsonSign;

    const keyframes = [];

    // If sign has direct bone rotations, use them
    if (bones) {
        // Base keyframe from direct bone definitions
        const baseKf = {
            time: 0,
            handshape: hand_shape,
            leftHandshape: left_hand_shape || null,
            rArm: bones.rArm || { x: 0.1, y: 0, z: 0.4 },
            rForeArm: bones.rForeArm || { x: 0, y: 0.15, z: 0 },
            rHand: bones.rHand || { x: 0, y: 0, z: 0 },
            lArm: bones.lArm || { x: 0.1, y: 0, z: -0.4 },
            lForeArm: bones.lForeArm || { x: 0, y: -0.15, z: 0 },
            lHand: bones.lHand || { x: 0, y: 0, z: 0 }
        };

        // If sign has custom movement keyframes, use them
        if (movement_keyframes && movement_keyframes.length > 0) {
            for (const mkf of movement_keyframes) {
                const kf = { ...baseKf, time: mkf.time };

                // Apply any bone modifications from the keyframe
                if (mkf.rArm) kf.rArm = { ...baseKf.rArm, ...mkf.rArm };
                if (mkf.rForeArm) kf.rForeArm = { ...baseKf.rForeArm, ...mkf.rForeArm };
                if (mkf.rHand) kf.rHand = { ...baseKf.rHand, ...mkf.rHand };
                if (mkf.lArm) kf.lArm = { ...baseKf.lArm, ...mkf.lArm };
                if (mkf.lForeArm) kf.lForeArm = { ...baseKf.lForeArm, ...mkf.lForeArm };
                if (mkf.lHand) kf.lHand = { ...baseKf.lHand, ...mkf.lHand };

                // Handle handshape changes during animation (for signs like NO)
                if (mkf.handshape) kf.handshape = mkf.handshape;

                keyframes.push(kf);
            }
        } else {
            // Use legacy movement generator for backward compatibility
            const moveKfs = generateMovementKeyframes(movement_action, baseKf, duration);

            for (const mkf of moveKfs) {
                const kf = { ...baseKf, time: mkf.time };

                if (mkf.foreArmMod) {
                    kf.rForeArm = {
                        x: (baseKf.rForeArm?.x || 0) + (mkf.foreArmMod.x || 0),
                        y: (baseKf.rForeArm?.y || 0) + (mkf.foreArmMod.y || 0),
                        z: (baseKf.rForeArm?.z || 0) + (mkf.foreArmMod.z || 0)
                    };
                }

                if (mkf.handMod) {
                    kf.rHand = {
                        x: (baseKf.rHand?.x || 0) + (mkf.handMod.x || 0),
                        y: (baseKf.rHand?.y || 0) + (mkf.handMod.y || 0),
                        z: (baseKf.rHand?.z || 0) + (mkf.handMod.z || 0)
                    };
                }

                if (mkf.handshape) kf.handshape = mkf.handshape;

                keyframes.push(kf);
            }
        }
    } else {
        // Fallback to old target_position system for backward compatibility
        const { target_position } = jsonSign;
        const rightPos = target_position?.right_hand || { x: 0.1, y: 1.2, z: 0.5 };
        const leftPos = target_position?.left_hand;

        const rightRots = positionToBoneRotation(rightPos, 'right');
        const leftRots = leftPos ? positionToBoneRotation(leftPos, 'left') : null;

        const baseKf = {
            time: 0,
            handshape: hand_shape,
            rArm: rightRots.arm,
            rForeArm: rightRots.foreArm,
            rHand: rightRots.hand
        };

        if (leftRots) {
            baseKf.leftHandshape = hand_shape;
            baseKf.lArm = leftRots.arm;
            baseKf.lForeArm = leftRots.foreArm;
            baseKf.lHand = leftRots.hand;
        }

        const moveKfs = generateMovementKeyframes(movement_action, baseKf, duration);
        for (const mkf of moveKfs) {
            const kf = { ...baseKf, time: mkf.time };
            if (mkf.foreArmMod) {
                kf.rForeArm = {
                    x: (baseKf.rForeArm?.x || 0) + (mkf.foreArmMod.x || 0),
                    y: (baseKf.rForeArm?.y || 0) + (mkf.foreArmMod.y || 0),
                    z: (baseKf.rForeArm?.z || 0) + (mkf.foreArmMod.z || 0)
                };
            }
            if (mkf.handMod) {
                kf.rHand = {
                    x: (baseKf.rHand?.x || 0) + (mkf.handMod.x || 0),
                    y: (baseKf.rHand?.y || 0) + (mkf.handMod.y || 0),
                    z: (baseKf.rHand?.z || 0) + (mkf.handMod.z || 0)
                };
            }
            if (mkf.handshape) kf.handshape = mkf.handshape;
            keyframes.push(kf);
        }
    }

    // Add return to neutral pose at end
    keyframes.push({
        time: 0.9,
        ...NEUTRAL,
        handshape: 'OpenPalm',
        leftHandshape: 'OpenPalm'
    });

    return { duration: duration * 1000, keyframes };
}

// ============================================
// AVATAR MODEL COMPONENT
// ============================================

function ASLAvatarModel({ signSequence, speed = 1.0 }) {
    const { scene, nodes } = useGLTF('/models/xbot.glb');
    const [currentSign, setCurrentSign] = useState(null);

    const stateRef = useRef({
        animTime: 0,
        signDef: null,
        targetPose: { ...NEUTRAL },
        currentHandshape: 'OpenPalm',
        leftHandshape: 'OpenPalm',
        isPlaying: false
    });

    useEffect(() => {
        if (!signSequence?.length) return;

        const play = async () => {
            for (const item of signSequence) {
                const gloss = (item.gloss || String(item)).toUpperCase();
                const jsonSign = ASL_SIGNS_JSON[gloss];

                if (jsonSign) {
                    setCurrentSign(gloss);
                    const signDef = jsonSignToKeyframes(jsonSign);
                    const st = stateRef.current;
                    st.signDef = signDef;
                    st.animTime = 0;
                    st.isPlaying = true;

                    const firstKf = signDef.keyframes[0];
                    st.currentHandshape = firstKf.handshape || 'OpenPalm';
                    st.leftHandshape = firstKf.leftHandshape || 'OpenPalm';

                    await new Promise(r => setTimeout(r, signDef.duration / speed + 200));
                } else {
                    // Fingerspelling fallback
                    setCurrentSign(`🔤 ${gloss}`);
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            setCurrentSign(null);
            stateRef.current.signDef = null;
            stateRef.current.isPlaying = false;
        };

        play();
    }, [signSequence, speed]);

    const applyHandshape = (nodes, shapeName, side) => {
        // Support both new and legacy handshape names
        const hs = HANDSHAPE_MAP[shapeName] || LEGACY_HANDSHAPES[shapeName] || HANDSHAPE_MAP.OpenPalm;
        const prefix = side === 'left' ? 'mixamorigLeftHand' : 'mixamorigRightHand';

        ['Index', 'Middle', 'Ring', 'Pinky'].forEach(finger => {
            const key = finger.toLowerCase();
            if (hs[key]) {
                for (let i = 0; i < 3; i++) {
                    const bone = nodes[`${prefix}${finger}${i + 1}`];
                    if (bone) {
                        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, hs[key][i] || 0, LERP_SPEED);
                    }
                }
            }
        });

        if (hs.thumb) {
            for (let i = 0; i < 3; i++) {
                const bone = nodes[`${prefix}Thumb${i + 1}`];
                if (bone) {
                    bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, hs.thumb[i] || 0, LERP_SPEED);
                }
            }
        }
    };

    useFrame((state, delta) => {
        if (!nodes) return;

        const st = stateRef.current;

        if (st.isPlaying && st.signDef) {
            st.animTime += delta * speed;

            const kfs = st.signDef.keyframes;
            let kf = kfs[0];
            for (let i = 0; i < kfs.length; i++) {
                if (st.animTime >= kfs[i].time) kf = kfs[i];
            }

            ['rArm', 'rForeArm', 'rHand', 'lArm', 'lForeArm', 'lHand'].forEach(key => {
                if (kf[key]) st.targetPose[key] = kf[key];
            });

            if (kf.handshape) st.currentHandshape = kf.handshape;
            if (kf.leftHandshape) st.leftHandshape = kf.leftHandshape;

        } else {
            st.targetPose = { ...NEUTRAL };
            st.currentHandshape = 'OpenPalm';
            st.leftHandshape = 'OpenPalm';
        }

        const boneMap = {
            rArm: BONES.rArm, rForeArm: BONES.rForeArm, rHand: BONES.rHand,
            lArm: BONES.lArm, lForeArm: BONES.lForeArm, lHand: BONES.lHand
        };

        Object.entries(boneMap).forEach(([key, boneName]) => {
            const bone = nodes[boneName];
            if (bone && st.targetPose[key]) {
                const t = st.targetPose[key];
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, t.x, LERP_SPEED);
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, t.y, LERP_SPEED);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, t.z, LERP_SPEED);
            }
        });

        applyHandshape(nodes, st.currentHandshape, 'right');
        applyHandshape(nodes, st.leftHandshape, 'left');

        // Idle breathing
        const t = state.clock.getElapsedTime();
        if (nodes[BONES.spine]) nodes[BONES.spine].rotation.x = 0.02 + Math.sin(t * 0.3) * 0.008;
        if (nodes[BONES.head]) nodes[BONES.head].rotation.y = Math.sin(t * 0.2) * 0.012;
    });

    return (
        <group position={[0, -2.0, 0]} scale={[2.0, 2.0, 2.0]}>
            <primitive object={scene} />
            {currentSign && (
                <Html position={[0, 2.2, 0]} center>
                    <div style={{
                        background: 'rgba(0,0,0,0.9)',
                        color: '#00ff88',
                        padding: '14px 28px',
                        borderRadius: '12px',
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        border: '2px solid #00ff88',
                        boxShadow: '0 0 25px rgba(0,255,136,0.5)',
                        textTransform: 'uppercase'
                    }}>
                        {currentSign}
                    </div>
                </Html>
            )}
        </group>
    );
}

useGLTF.preload('/models/xbot.glb');

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return <Html center><div style={{ color: '#ff6666' }}>⚠️ Avatar Error</div></Html>;
        }
        return this.props.children;
    }
}

export default function Avatar3D({ signData, currentDialect = 'ASL' }) {
    const [speed, setSpeed] = useState(1.0);

    return (
        <div style={{
            width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', zIndex: 0
        }}>
            <div style={{
                position: 'absolute', top: 20, left: 20, color: '#00ff88', fontFamily: 'monospace',
                fontSize: '13px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '14px', borderRadius: '10px'
            }}>
                🖐️ ASL Avatar | {currentDialect} | {speed.toFixed(1)}x
            </div>

            <div style={{
                position: 'absolute', bottom: 25, left: 25, color: 'white', fontFamily: 'monospace',
                zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '12px', borderRadius: '10px'
            }}>
                <input type="range" min="0.5" max="2.0" step="0.1" value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ width: '100px' }} />
            </div>

            <Canvas camera={{ position: [0, 0.5, 3.5], fov: 38 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 10, 7]} intensity={1.0} />
                <directionalLight position={[-4, 5, 3]} intensity={0.4} color="#00ff88" />
                <Environment preset="night" />

                <React.Suspense fallback={<Html center><div style={{ color: '#00ff88' }}>Loading...</div></Html>}>
                    <ErrorBoundary>
                        <ASLAvatarModel signSequence={signData?.sequence} speed={speed} />
                    </ErrorBoundary>
                </React.Suspense>

                <OrbitControls target={[0, 0.4, 0]} enablePan={false} minDistance={2} maxDistance={6} />
            </Canvas>
        </div>
    );
}

// Export for external use
export { ASL_SIGNS_JSON, jsonSignToKeyframes, HANDSHAPE_MAP };
