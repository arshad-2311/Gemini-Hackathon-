import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './SpatialIndicator.css';

// ============================================
// POSITION MAPPINGS
// ============================================
const POSITION_MAP = {
    left: { x: 15, label: 'Left' },
    center: { x: 50, label: 'Center' },
    right: { x: 85, label: 'Right' },
    'left-third': { x: 20, label: 'Left' },
    'right-third': { x: 80, label: 'Right' }
};

const VERTICAL_MAP = {
    top: 20,
    middle: 50,
    bottom: 75
};

// ============================================
// OBJECT CATEGORIES
// ============================================
const OBJECT_CATEGORIES = {
    person: { icon: '👤', color: '#6366f1' },
    furniture: { icon: '🪑', color: '#10b981' },
    electronics: { icon: '📱', color: '#f59e0b' },
    food: { icon: '🍎', color: '#ef4444' },
    animal: { icon: '🐕', color: '#8b5cf6' },
    vehicle: { icon: '🚗', color: '#3b82f6' },
    book: { icon: '📖', color: '#ec4899' },
    default: { icon: '📍', color: '#6366f1' }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function getCategory(objectName) {
    const name = objectName.toLowerCase();

    if (['person', 'man', 'woman', 'child', 'face'].some(k => name.includes(k))) return 'person';
    if (['chair', 'table', 'desk', 'couch', 'bed', 'lamp'].some(k => name.includes(k))) return 'furniture';
    if (['phone', 'laptop', 'computer', 'tv', 'screen', 'monitor'].some(k => name.includes(k))) return 'electronics';
    if (['apple', 'banana', 'food', 'drink', 'cup', 'bottle', 'pizza'].some(k => name.includes(k))) return 'food';
    if (['dog', 'cat', 'bird', 'pet', 'animal'].some(k => name.includes(k))) return 'animal';
    if (['car', 'bike', 'bus', 'truck'].some(k => name.includes(k))) return 'vehicle';
    if (['book', 'paper', 'document', 'notebook'].some(k => name.includes(k))) return 'book';

    return 'default';
}

function getSignGloss(objectName) {
    const glossMap = {
        'book': 'BOOK',
        'phone': 'PHONE',
        'laptop': 'COMPUTER',
        'cup': 'CUP',
        'bottle': 'BOTTLE',
        'chair': 'CHAIR',
        'table': 'TABLE',
        'person': 'PERSON',
        'door': 'DOOR',
        'window': 'WINDOW',
        'lamp': 'LIGHT',
        'clock': 'TIME',
        'bag': 'BAG',
        'pen': 'PEN'
    };

    const name = objectName.toLowerCase();
    for (const [key, gloss] of Object.entries(glossMap)) {
        if (name.includes(key)) return gloss;
    }
    return objectName.toUpperCase().replace(/\s+/g, '-');
}

// ============================================
// SPATIAL INDICATOR COMPONENT
// ============================================
export default function SpatialIndicator({
    objects = [],
    activeObject = null,
    onObjectClick,
    avatarPosition = { x: 50, y: 60 }
}) {
    const [visibleObjects, setVisibleObjects] = useState([]);
    const [hoveredObject, setHoveredObject] = useState(null);
    const [pointerActive, setPointerActive] = useState(false);
    const timeoutRefs = useRef({});

    // Process objects with positions and metadata
    const processedObjects = useMemo(() => {
        return objects.map((obj, index) => {
            const posX = POSITION_MAP[obj.position]?.x ||
                (obj.boundingBox?.x ? obj.boundingBox.x * 100 : 50);
            const posY = VERTICAL_MAP[obj.verticalPosition] ||
                (obj.boundingBox?.y ? obj.boundingBox.y * 100 : 50);

            const category = getCategory(obj.object);
            const categoryInfo = OBJECT_CATEGORIES[category];

            return {
                id: `${obj.object}-${index}`,
                name: obj.object,
                position: { x: posX, y: posY },
                confidence: Math.round((obj.confidence || 0.8) * 100),
                category,
                icon: categoryInfo.icon,
                color: categoryInfo.color,
                signGloss: obj.aslSign || getSignGloss(obj.object),
                detectedAt: Date.now(),
                isActive: activeObject && obj.object.toLowerCase() === activeObject.toLowerCase()
            };
        });
    }, [objects, activeObject]);

    // Handle objects entering/leaving
    useEffect(() => {
        const newIds = processedObjects.map(o => o.id);
        const currentIds = visibleObjects.map(o => o.id);

        // Add new objects with fade-in
        processedObjects.forEach(obj => {
            if (!currentIds.includes(obj.id)) {
                setVisibleObjects(prev => [...prev, { ...obj, entering: true }]);

                // Remove entering state after animation
                setTimeout(() => {
                    setVisibleObjects(prev =>
                        prev.map(o => o.id === obj.id ? { ...o, entering: false } : o)
                    );
                }, 500);
            }
        });

        // Remove objects that are no longer detected
        visibleObjects.forEach(obj => {
            if (!newIds.includes(obj.id)) {
                // Mark for exit animation
                setVisibleObjects(prev =>
                    prev.map(o => o.id === obj.id ? { ...o, leaving: true } : o)
                );

                // Remove after animation
                timeoutRefs.current[obj.id] = setTimeout(() => {
                    setVisibleObjects(prev => prev.filter(o => o.id !== obj.id));
                }, 500);
            }
        });

        // Update active states
        setVisibleObjects(prev =>
            prev.map(obj => ({
                ...obj,
                isActive: activeObject && obj.name.toLowerCase() === activeObject.toLowerCase()
            }))
        );

        return () => {
            Object.values(timeoutRefs.current).forEach(clearTimeout);
        };
    }, [processedObjects, activeObject]);

    // Handle pointer animation when object is active
    useEffect(() => {
        if (activeObject) {
            setPointerActive(true);
            const timeout = setTimeout(() => setPointerActive(false), 2000);
            return () => clearTimeout(timeout);
        }
    }, [activeObject]);

    // Handle object click
    const handleClick = useCallback((obj) => {
        if (onObjectClick) {
            onObjectClick({
                object: obj.name,
                position: obj.position,
                signGloss: obj.signGloss
            });
        }
    }, [onObjectClick]);

    // Get active object for pointer line
    const activeObj = visibleObjects.find(o => o.isActive);

    return (
        <div className="spatial-indicator">
            {/* Object Markers */}
            {visibleObjects.map(obj => (
                <div
                    key={obj.id}
                    className={`object-marker ${obj.entering ? 'entering' : ''} ${obj.leaving ? 'leaving' : ''} ${obj.isActive ? 'active' : ''}`}
                    style={{
                        left: `${obj.position.x}%`,
                        top: `${obj.position.y}%`,
                        '--marker-color': obj.color
                    }}
                    onClick={() => handleClick(obj)}
                    onMouseEnter={() => setHoveredObject(obj)}
                    onMouseLeave={() => setHoveredObject(null)}
                >
                    {/* Pulsing Dot */}
                    <div className="marker-dot">
                        <span className="marker-icon">{obj.icon}</span>
                        <span className="marker-pulse" />
                        <span className="marker-pulse delay" />
                    </div>

                    {/* Label */}
                    <div className="marker-label">
                        <span className="label-name">{obj.name}</span>
                        <span className="label-confidence">{obj.confidence}%</span>
                    </div>

                    {/* Active Highlight */}
                    {obj.isActive && (
                        <div className="active-highlight">
                            <span className="highlight-ring" />
                            <span className="highlight-ring delay" />
                        </div>
                    )}
                </div>
            ))}

            {/* Hover Details Tooltip */}
            {hoveredObject && (
                <div
                    className="object-tooltip"
                    style={{
                        left: `${Math.min(Math.max(hoveredObject.position.x, 15), 85)}%`,
                        top: `${hoveredObject.position.y - 15}%`
                    }}
                >
                    <div className="tooltip-header">
                        <span className="tooltip-icon">{hoveredObject.icon}</span>
                        <span className="tooltip-name">{hoveredObject.name}</span>
                    </div>
                    <div className="tooltip-details">
                        <div className="tooltip-row">
                            <span className="tooltip-label">Category:</span>
                            <span className="tooltip-value">{hoveredObject.category}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Confidence:</span>
                            <span className="tooltip-value">{hoveredObject.confidence}%</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Sign Gloss:</span>
                            <span className="tooltip-gloss">{hoveredObject.signGloss}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-label">Detected:</span>
                            <span className="tooltip-value">Just now</span>
                        </div>
                    </div>
                    <div className="tooltip-hint">Click to point</div>
                </div>
            )}

            {/* Pointer Line from Avatar to Active Object */}
            {activeObj && pointerActive && (
                <svg className="pointer-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="pointerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.8)" />
                            <stop offset="100%" stopColor={activeObj.color} />
                        </linearGradient>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 10 3.5, 0 7"
                                fill={activeObj.color}
                            />
                        </marker>
                    </defs>
                    <line
                        className="pointer-line"
                        x1={avatarPosition.x}
                        y1={avatarPosition.y}
                        x2={activeObj.position.x}
                        y2={activeObj.position.y}
                        stroke="url(#pointerGradient)"
                        strokeWidth="0.3"
                        strokeDasharray="2 1"
                        markerEnd="url(#arrowhead)"
                    />
                </svg>
            )}

            {/* Active Object Label Banner */}
            {activeObj && pointerActive && (
                <div className="pointing-banner">
                    <span className="pointing-icon">👉</span>
                    <span className="pointing-text">
                        Pointing to <strong>{activeObj.name}</strong>
                    </span>
                    <code className="pointing-gloss">{activeObj.signGloss}</code>
                </div>
            )}

            {/* Object Count Badge */}
            {visibleObjects.length > 0 && (
                <div className="objects-count-badge">
                    <span className="count-icon">👁️</span>
                    <span className="count-number">{visibleObjects.length}</span>
                    <span className="count-label">object{visibleObjects.length !== 1 ? 's' : ''} detected</span>
                </div>
            )}
        </div>
    );
}
