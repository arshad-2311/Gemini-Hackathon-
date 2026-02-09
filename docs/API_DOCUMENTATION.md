# SignBridge API Documentation

## Overview

SignBridge uses **Socket.IO** for real-time bidirectional communication between the frontend and backend. All AI-powered features communicate through WebSocket events.

**Base URL**: `http://localhost:3000` (development)

---

## Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

---

## Events Reference

### 🎙️ Speech Translation

#### `speech-input`

Converts spoken text to sign language sequence.

**Emit:**
```javascript
socket.emit('speech-input', {
  text: string,      // The spoken text
  dialect: string    // 'ASL' | 'BSL' | 'ISL'
});
```

**Response Event:** `play-signs`
```javascript
socket.on('play-signs', (data) => {
  // data.sequence: Array<{ gloss, duration, expression }>
  // data.originalText: string
  // data.dialect: string
});
```

**Gemini Prompt Used:**
```
You are an expert {dialect} linguist. Convert the following English text 
into a precise sequence of {dialect} signs.

Consider:
- {dialect} grammar rules (Topic-Comment for ASL, SOV for ISL)
- Non-manual markers (facial expressions)
- Appropriate timing for each sign

Text: "{text}"

Respond with ONLY a JSON array:
[{ "gloss": "SIGN-NAME", "duration": 1.5, "expression": "neutral" }]
```

---

### 🎯 Sign Analysis

#### `check-my-sign`

Analyzes user's signing attempt and provides feedback.

**Emit:**
```javascript
socket.emit('check-my-sign', {
  sign: string,           // Target sign (e.g., 'THANK-YOU')
  poseData: object,       // MediaPipe pose landmarks
  dialect: string         // 'ASL' | 'BSL' | 'ISL'
});
```

**Response Event:** `sign-feedback`
```javascript
socket.on('sign-feedback', (data) => {
  // data.accuracy: number (0-100)
  // data.overallAssessment: string
  // data.corrections: Array<{ aspect, correction, importance }>
  // data.culturalNote: string
  // data.encouragement: string
});
```

**Gemini Prompt Used:**
```
You are an expert {dialect} teacher analyzing a student's sign attempt.

INTENDED SIGN: "{sign}" in {dialect}
STUDENT'S POSE DATA: {poseData}

Analyze the signing accuracy and provide:
1. Accuracy score (0-100)
2. Specific corrections needed
3. Cultural context
4. Encouragement

Respond with ONLY a JSON object:
{
  "accuracy": 87,
  "overallAssessment": "Good attempt",
  "corrections": [{ "aspect": "Hand Position", "correction": "...", "importance": "important" }],
  "culturalNote": "...",
  "encouragement": "..."
}
```

---

### 👁️ Spatial Awareness

#### `detect-objects`

Detects objects in camera frame for spatial referencing.

**Emit:**
```javascript
socket.emit('detect-objects', {
  imageBase64: string    // Base64 encoded camera frame
});
```

**Response Event:** `objects-detected`
```javascript
socket.on('objects-detected', (data) => {
  // data.objects: Array<{ object, position, confidence, aslSign }>
  // data.sceneDescription: string
});
```

**Gemini Prompt Used:**
```
Analyze this camera image and identify all visible objects that could be 
referenced in sign language conversation.

For each object provide:
- Name
- Position (left/center/right)
- Confidence (0-1)
- ASL sign equivalent

Respond with ONLY a JSON object:
{
  "objects": [{ "object": "book", "position": "left", "confidence": 0.96, "aslSign": "BOOK" }],
  "sceneDescription": "Office setting with desk and bookshelf"
}
```

---

### 🌍 Dialect Operations

#### `switch-dialect`

Changes the active sign language dialect.

**Emit:**
```javascript
socket.emit('switch-dialect', {
  dialect: string    // 'ASL' | 'BSL' | 'ISL'
});
```

**Response Event:** `dialect-switched`
```javascript
socket.on('dialect-switched', (data) => {
  // data.dialect: string
  // data.name: string
  // data.features: string[]
});
```

#### `translate-dialect`

Converts a sign sequence from one dialect to another.

**Emit:**
```javascript
socket.emit('translate-dialect', {
  sequence: Array<{ gloss }>,
  fromDialect: string,
  toDialect: string
});
```

**Response Event:** `dialect-translation`
```javascript
socket.on('dialect-translation', (data) => {
  // data.originalSequence: Array
  // data.translatedSequence: Array
  // data.adaptationNotes: string[]
  // data.warnings: string[]
});
```

---

### 📄 Document Learning

#### `upload-document`

Generates a sign language lesson from uploaded document content.

**Emit:**
```javascript
socket.emit('upload-document', {
  text: string,       // Extracted document text
  filename: string,   // Original filename
  dialect: string     // Target dialect
});
```

**Response Event:** `lesson-generated`
```javascript
socket.on('lesson-generated', (data) => {
  // data.lesson.title: string
  // data.lesson.vocabulary: Array<{ term, sign, difficulty }>
  // data.lesson.sentences: Array<{ english, glossString }>
  // data.lesson.culturalNotes: Array<{ topic, explanation }>
  // data.lesson.progression: Array<{ stage, focus, signs }>
});
```

**Gemini Prompt Used:**
```
You are an expert {dialect} curriculum designer. Create a comprehensive 
sign language lesson from this document.

Document: "{text}"

Generate:
1. Key vocabulary (with difficulty levels)
2. Practice sentences in {dialect} grammar
3. Cultural context notes
4. Progressive learning stages

Respond with ONLY a JSON object with the lesson structure.
```

---

### 💡 Context Suggestions

#### `get-suggestions`

Gets contextual sign suggestions based on conversation.

**Emit:**
```javascript
socket.emit('get-suggestions', {
  context: string,    // Recent conversation context
  dialect: string
});
```

**Response Event:** `suggested-signs`
```javascript
socket.on('suggested-signs', (data) => {
  // data.suggestions: Array<{ sign, gloss, reason, difficulty }>
});
```

---

## Error Handling

All events may return an error:

```javascript
socket.on('error', (data) => {
  // data.message: string
  // data.code: string (e.g., 'RATE_LIMIT', 'API_ERROR')
});
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `RATE_LIMIT` | Too many requests | Wait and retry |
| `API_ERROR` | Gemini API failed | Use fallback mode |
| `INVALID_INPUT` | Bad request data | Check parameters |
| `NOT_CONNECTED` | Socket disconnected | Reconnect |

---

## Rate Limiting

- **60 requests per minute** per client
- Resets every 60 seconds
- Returns `RATE_LIMIT` error when exceeded

---

## Best Practices

1. **Throttle camera frames** - Max 1 `detect-objects` per 500ms
2. **Debounce typing** - Wait 300ms after user stops typing
3. **Cache translations** - Store frequent phrases locally
4. **Handle disconnects** - Implement reconnection logic
5. **Use acknowledgements** - For critical messages

```javascript
// Example with acknowledgement
socket.emit('speech-input', data, (response) => {
  if (response.error) {
    // Handle error
  } else {
    // Success
  }
});
```
