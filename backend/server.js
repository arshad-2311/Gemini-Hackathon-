import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GeminiService } from './gemini.js';
import { TeachingAgent } from './teachingAgent.js';
import signDatabase from './signDatabase.js';
import signFallback from './signFallback.js';
import hybridSignSystem from './hybridSignSystem.js';
import demoController from './demoController.js';
import VideoSequenceMapper from './videoSequenceMapper.js';
import how2signRoutes from './routes/how2sign.js';
import translateRoutes from './routes/translate.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173', 'http://127.0.0.1:5173',
      'http://localhost:5174', 'http://127.0.0.1:5174',
      'http://localhost:5175', 'http://127.0.0.1:5175',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    'http://localhost:5175', 'http://127.0.0.1:5175'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize services
const geminiService = new GeminiService();
const teachingAgent = new TeachingAgent(geminiService);
const videoMapper = new VideoSequenceMapper(geminiService);

// ============================================
// RATE LIMITING
// ============================================
const rateLimits = new Map(); // socketId -> { count, resetTime }

function checkRateLimit(socketId) {
  const now = Date.now();
  const limit = rateLimits.get(socketId);

  if (!limit || now > limit.resetTime) {
    // Reset or initialize
    rateLimits.set(socketId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 60) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [socketId, limit] of rateLimits.entries()) {
    if (now > limit.resetTime) {
      rateLimits.delete(socketId);
    }
  }
}

// Cleanup rate limits every minute
setInterval(cleanupRateLimits, 60000);

// ============================================
// REST API ENDPOINTS
// ============================================

// Health check endpoint (root - for Docker/Render)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (API path)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConnected: !!process.env.GEMINI_API_KEY,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ============================================
// SIGN DATABASE API ENDPOINTS
// ============================================

// Serve processed videos and thumbnails (multiple paths for flexibility)
app.use('/signs', express.static(path.join(__dirname, 'dataset/processed')));
app.use('/videos', express.static(path.join(__dirname, 'dataset/processed')));
app.use('/thumbnails', express.static(path.join(__dirname, 'dataset/thumbnails')));

// How2Sign API - Real motion capture data (NOT AI-generated)
app.use('/api/how2sign', how2signRoutes);

// Translate API - Semantic matching to How2Sign
app.use('/api/translate', translateRoutes);



// Get available signs for a dialect
app.get('/api/signs/available', (req, res) => {
  const { dialect = 'ASL' } = req.query;
  const signs = signDatabase.getAvailableSigns(dialect);
  res.json({
    dialect,
    count: signs.length,
    signs
  });
});

// Search for signs
app.get('/api/signs/search', (req, res) => {
  const { q, dialect = 'ASL' } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  const results = signDatabase.searchSigns(q, dialect);
  res.json({
    query: q,
    dialect,
    count: results.length,
    results
  });
});

// Get database stats
app.get('/api/signs/stats', (req, res) => {
  res.json(signDatabase.getStats());
});

// Get random sign for practice
app.get('/api/signs/random', (req, res) => {
  const { dialect = 'ASL' } = req.query;
  const sign = signDatabase.getRandomSign(dialect);
  if (!sign) {
    return res.status(404).json({ error: 'No signs available for dialect' });
  }
  res.json(sign);
});

// Get sign video and metadata
app.get('/api/signs/:gloss', (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL', quality = '720p' } = req.query;

  const metadata = signDatabase.getSignMetadata(gloss, dialect);
  if (!metadata) {
    return res.status(404).json({
      error: 'Sign not found',
      gloss,
      dialect,
      suggestion: signDatabase.searchSigns(gloss, dialect).slice(0, 5)
    });
  }

  const videoURL = signDatabase.getVideoURL(gloss, dialect, quality);
  const thumbnailURL = signDatabase.getThumbnailURL(gloss, dialect);

  res.json({
    gloss: gloss.toUpperCase(),
    dialect,
    videoURL,
    thumbnailURL,
    duration: metadata.duration,
    metadata: metadata.metadata
  });
});

// Batch get sign videos
app.post('/api/signs/batch', (req, res) => {
  const { glossArray, dialect = 'ASL', quality = '720p' } = req.body;

  if (!Array.isArray(glossArray)) {
    return res.status(400).json({ error: 'glossArray must be an array' });
  }

  const sequence = signDatabase.getSignSequence(glossArray, dialect, quality);

  res.json({
    dialect,
    quality,
    requested: glossArray.length,
    found: sequence.filter(s => s.found).length,
    sequence
  });
});

// ============================================
// VIDEO STREAMING ENDPOINT
// ============================================

// Stream video with range request support
app.get('/api/sign-stream/:dialect/:gloss', (req, res) => {
  const { dialect, gloss } = req.params;
  const quality = req.query.quality || '720p';

  const videoPath = signDatabase.getSignVideo(gloss, dialect, quality);

  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).json({
      error: 'Video not found',
      gloss,
      dialect,
      fallbackAvailable: true
    });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Handle range request for video seeking
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    const file = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    file.pipe(res);
  } else {
    // Full file request
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(videoPath).pipe(res);
  }
});

// Get sign video metadata by dialect and gloss (matching user's requested pattern)
app.get('/api/sign/:dialect/:gloss', (req, res) => {
  const { dialect, gloss } = req.params;
  const quality = req.query.quality || '720p';

  const metadata = signDatabase.getSignMetadata(gloss, dialect);
  const videoPath = signDatabase.getSignVideo(gloss, dialect, quality);

  if (!videoPath) {
    // Check if fallback is available
    const fallbackAvailable = signFallback.checkSignAvailability(gloss, dialect);
    return res.status(404).json({
      error: 'Sign not found',
      gloss,
      dialect,
      fallbackAvailable: fallbackAvailable.hasProcedural || fallbackAvailable.canFingerspell
    });
  }

  res.json({
    gloss: gloss.toUpperCase(),
    dialect,
    videoUrl: `/videos/${dialect.toLowerCase()}/${path.basename(videoPath)}`,
    thumbnail: `/thumbnails/${dialect.toLowerCase()}/${gloss.toLowerCase()}.jpg`,
    metadata: metadata
  });
});

// Get sign with fallback (video, procedural, or fingerspelling)
app.get('/api/sign-with-fallback/:gloss', async (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL', quality = '720p' } = req.query;

  try {
    const signData = await signFallback.getSign(gloss, dialect, quality);
    res.json(signData);
  } catch (error) {
    console.error('Error getting sign with fallback:', error);
    res.status(500).json({ error: 'Failed to get sign data' });
  }
});

// Get sign sequence with fallbacks
app.post('/api/signs-with-fallback/batch', async (req, res) => {
  const { glossArray, dialect = 'ASL', quality = '720p' } = req.body;

  if (!Array.isArray(glossArray)) {
    return res.status(400).json({ error: 'glossArray must be an array' });
  }

  try {
    const sequence = await signFallback.getSignSequence(glossArray, dialect, quality);

    const stats = {
      total: sequence.length,
      videos: sequence.filter(s => s.type === 'video').length,
      procedural: sequence.filter(s => s.type === 'procedural').length,
      fingerspelling: sequence.filter(s => s.type === 'fingerspelling').length
    };

    res.json({
      dialect,
      quality,
      stats,
      sequence
    });
  } catch (error) {
    console.error('Error getting sign sequence:', error);
    res.status(500).json({ error: 'Failed to get sign sequence' });
  }
});

// Check sign availability
app.get('/api/sign-availability/:gloss', (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL' } = req.query;

  const availability = signFallback.checkSignAvailability(gloss, dialect);
  res.json(availability);
});

// Get all fallback categories
app.get('/api/fallback/categories', (req, res) => {
  const categories = signFallback.getCategories();
  res.json({ categories });
});

// Get signs by category (fallback signs)
app.get('/api/fallback/category/:category', (req, res) => {
  const { category } = req.params;
  const signs = signFallback.getSignsByCategory(category);
  res.json({ category, count: signs.length, signs });
});

// Get all available fallback signs
app.get('/api/fallback/available', (req, res) => {
  const signs = signFallback.getAvailableFallbacks();
  res.json({ count: signs.length, signs });
});

// ============================================
// HYBRID SIGN SYSTEM ENDPOINTS (Demo Mode)
// ============================================

// Get demo info and phase roadmap
app.get('/api/demo/info', (req, res) => {
  res.json(hybridSignSystem.getDemoInfo());
});

// Get system stats (works without dataset)
app.get('/api/demo/stats', (req, res) => {
  res.json(hybridSignSystem.getStats());
});

// Get demo highlights
app.get('/api/demo/highlights', (req, res) => {
  const highlights = hybridSignSystem.getDemoHighlights();
  res.json({ count: highlights.length, signs: highlights });
});

// Get sign using hybrid system (best available source)
app.get('/api/hybrid/sign/:gloss', async (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL', quality = '720p' } = req.query;

  try {
    const sign = await hybridSignSystem.getSign(gloss, dialect, { quality });
    res.json(sign);
  } catch (error) {
    console.error('Hybrid sign error:', error);
    res.status(500).json({ error: 'Failed to get sign' });
  }
});

// Get sign sequence using hybrid system
app.post('/api/hybrid/sequence', async (req, res) => {
  const { glossArray, dialect = 'ASL', quality = '720p' } = req.body;

  if (!Array.isArray(glossArray)) {
    return res.status(400).json({ error: 'glossArray must be an array' });
  }

  try {
    const result = await hybridSignSystem.getSignSequence(glossArray, dialect, { quality });
    res.json(result);
  } catch (error) {
    console.error('Hybrid sequence error:', error);
    res.status(500).json({ error: 'Failed to get sequence' });
  }
});

// Check sign availability across all sources
app.get('/api/hybrid/availability/:gloss', (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL' } = req.query;

  const availability = hybridSignSystem.checkSignAvailability(gloss, dialect);
  res.json(availability);
});

// Get all available signs (from all sources)
app.get('/api/hybrid/available', (req, res) => {
  const { dialect = 'ASL' } = req.query;
  const signs = hybridSignSystem.getAvailableSigns(dialect);
  res.json({ dialect, count: signs.length, signs });
});

// Get signs by category
app.get('/api/hybrid/category/:category', (req, res) => {
  const { category } = req.params;
  const { dialect = 'ASL' } = req.query;
  const signs = hybridSignSystem.getSignsByCategory(category, dialect);
  res.json({ category, dialect, count: signs.length, signs });
});

// Get external embed/link for a sign
app.get('/api/hybrid/embed/:gloss', (req, res) => {
  const { gloss } = req.params;
  const { dialect = 'ASL' } = req.query;

  const embed = hybridSignSystem.getEmbedHTML(gloss, dialect);
  if (!embed) {
    return res.status(404).json({ error: 'No external source available' });
  }
  res.json(embed);
});

// ============================================
// DEMO CONTROLLER ENDPOINTS (For Presentations)
// ============================================

// Get all demo sequences
app.get('/api/presentation/sequences', (req, res) => {
  res.json(demoController.getSequences());
});

// Get a specific demo sequence with sign data
app.get('/api/presentation/sequence/:id', async (req, res) => {
  const { id } = req.params;
  const { dialect = 'ASL' } = req.query;

  try {
    const sequence = await demoController.getSequenceSigns(id, dialect);
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get presentation stats
app.get('/api/presentation/stats', (req, res) => {
  res.json(demoController.getPresentationStats());
});

// Get judge-friendly summary
app.get('/api/presentation/summary', (req, res) => {
  res.json(demoController.getJudgeSummary());
});

// Full demo info
app.get('/api/presentation/full', (req, res) => {
  res.json(demoController.getDemoInfo());
});

// Test Gemini connection
app.get('/api/test-gemini', async (req, res) => {
  try {
    const result = await geminiService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get API request logs (for debugging)
app.get('/api/logs', (req, res) => {
  res.json(geminiService.getRequestLogs());
});

// Get cache statistics
import geminiCache from './geminiCache.js';
app.get('/api/cache/stats', (req, res) => {
  res.json({
    ...geminiCache.getStats(),
    rateLimitStatus: geminiService.getRateLimitStatus(),
    keyStats: geminiService.getKeyStats()
  });
});

// REST endpoint for text-to-sign translation
app.post('/api/translate/text-to-sign', async (req, res) => {
  try {
    const { text, dialect = 'ASL' } = req.body;
    const sequence = await geminiService.textToSignSequence(text, dialect);
    res.json({ success: true, sequence });
  } catch (error) {
    console.error('Text-to-sign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for text-to-animation (JSON schema for 3D Avatar)
// Returns animation data that Avatar3D can directly consume
app.post('/api/translate/text-to-animation', async (req, res) => {
  try {
    const { text, dialect = 'ASL' } = req.body;
    const animationData = await geminiService.textToSignAnimation(text, dialect);

    // Transform to Avatar3D format
    const sequence = animationData.signs?.map(sign => ({
      gloss: sign.gloss,
      duration: sign.duration,
      handShape: sign.hand_shape,
      targetPosition: sign.target_position,
      movementAction: sign.movement_action,
      facialExpression: sign.facial_expression
    })) || [];

    res.json({
      success: true,
      sequence,
      source: animationData.source || 'gemini'
    });
  } catch (error) {
    console.error('Text-to-animation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for text-to-pose-keyframes (Linguistically Accurate)
// Returns detailed pose keyframe data with finger positions, facial expressions, and timing
app.post('/api/translate/text-to-pose-keyframes', async (req, res) => {
  try {
    const { text, dialect = 'ASL' } = req.body;
    const poseData = await geminiService.textToPoseKeyframes(text, dialect);

    res.json({
      success: true,
      poseData,
      source: poseData.source || 'gemini',
      description: 'Linguistically accurate pose keyframes for avatar animation'
    });
  } catch (error) {
    console.error('Text-to-pose-keyframes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for sign-to-text translation
app.post('/api/translate/sign-to-text', async (req, res) => {
  try {
    const { signGloss, dialect = 'ASL' } = req.body;
    const result = await geminiService.signToText(signGloss, dialect);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Sign-to-text error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for text-to-video sequence (NUCLEAR OPTION)
// Maps text to actual video files for maximum linguistic accuracy
// Use this when gestures must be perfect (e.g., for Deaf judges)
app.post('/api/translate/text-to-videos', async (req, res) => {
  try {
    const { text, dialect = 'ASL', availableVideos } = req.body;

    // Optionally set custom video list
    if (availableVideos && Array.isArray(availableVideos)) {
      videoMapper.setAvailableVideos(availableVideos);
    }

    const result = await videoMapper.textToVideoSequence(text, dialect);

    res.json({
      success: true,
      ...result,
      mode: 'nuclear',
      description: 'Video sequence for maximum accuracy'
    });
  } catch (error) {
    console.error('Text-to-videos error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for document-to-lesson
app.post('/api/lesson/generate', async (req, res) => {
  try {
    const { documentText, dialect = 'ASL' } = req.body;
    const lesson = await geminiService.generateLessonFromDocument(documentText, dialect);
    res.json({ success: true, lesson });
  } catch (error) {
    console.error('Lesson generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST endpoint for sign info
app.get('/api/sign/:gloss', async (req, res) => {
  try {
    const { gloss } = req.params;
    const { dialect = 'ASL' } = req.query;
    const info = await geminiService.getSignInfo(gloss, dialect);
    res.json({ success: true, info });
  } catch (error) {
    console.error('Sign info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Store conversation context for this session
  const conversationHistory = [];
  let currentDialect = 'ASL';

  // Middleware for rate limiting on this socket
  const withRateLimit = async (eventName, handler) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', {
        event: eventName,
        message: '⏳ Too many requests. Please wait a moment before trying again.',
        retryAfter: 60
      });
      return;
    }
    try {
      await handler();
    } catch (error) {
      console.error(`❌ Error in ${eventName}:`, error.message);

      // Format user-friendly error message
      let userMessage = error.message || 'An error occurred';
      const msg = (error.message || '').toLowerCase();

      // Check if this is a rate limit error
      const isRateLimitError = msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many');

      if (isRateLimitError) {
        // Don't show rate limit errors to users - the app should handle this silently via mock/cache
        console.log(`[Server] Rate limit error suppressed for ${eventName} - silently ignoring`);
        // Do NOT emit error to frontend
        return;
      } else if (msg.includes('api key') || msg.includes('unauthorized')) {
        userMessage = 'API configuration issue. Please check your API key.';
      } else if (msg.includes('network') || msg.includes('fetch')) {
        userMessage = 'Network error. Please check your connection.';
      } else if (error.code && error.details) {
        // Use the formatted message from gemini.js
        userMessage = error.details.userMessage || error.message;
      }

      socket.emit('error', {
        event: eventName,
        message: userMessage
      });
    }
  };

  // ----------------------------------------
  // EVENT: speech-input
  // Voice/text input from hearing user to translate to signs
  // ----------------------------------------
  socket.on('speech-input', async (data) => {
    await withRateLimit('speech-input', async () => {
      const { text, dialect = currentDialect, cameraFrame } = data;
      console.log(`🎤 Speech input [${dialect}]: "${text}"`);

      // Update session dialect
      currentDialect = dialect;

      // Add to conversation history
      conversationHistory.push({ role: 'speaker', content: text });

      // Convert text to sign sequence with robust fallback
      let sequence;
      try {
        sequence = await geminiService.textToSignSequence(text, dialect);
      } catch (err) {
        console.warn(`⚠️ API failed, falling back to mock/fingerspelling for: "${text}"`);
        // Try mock cache first
        let fallback = geminiCache.getMockTranslation(text);

        // If no mock cache, force fingerspelling
        if (!fallback) {
          fallback = text.split(/\s+/).map(word => ({
            gloss: word.toUpperCase(),
            expression: 'neutral',
            duration: word.length * 0.3,
            type: 'fingerspell',
            handShape: 'Fingerspelling',
            movement: 'Spell letters',
            location: 'neutral-space'
          }));
        }
        sequence = fallback;
      }

      let objects = null;

      // If camera frame provided, detect objects for spatial awareness
      if (cameraFrame) {
        try {
          const detection = await geminiService.detectObjectsInScene(cameraFrame);
          objects = detection.objects;

          // Add spatial gestures if objects match words in speech
          if (objects && objects.length > 0) {
            const textLower = text.toLowerCase();
            objects.forEach(obj => {
              if (textLower.includes(obj.object.toLowerCase())) {
                // Add pointing gesture for matching objects
                sequence.push({
                  gloss: 'POINT',
                  expression: 'neutral',
                  duration: 0.8,
                  notes: `Point to ${obj.object} at ${obj.position}`,
                  targetObject: obj
                });
              }
            });
          }
        } catch (err) {
          console.warn('Object detection failed:', err.message);
        }
      }

      socket.emit('play-signs', {
        sequence,
        objects,
        originalText: text,
        dialect
      });
    });
  });

  // ----------------------------------------
  // EVENT: sign-detected
  // Sign recognized from camera, convert to speech
  // ----------------------------------------
  socket.on('sign-detected', async (data) => {
    await withRateLimit('sign-detected', async () => {
      const { signGloss, dialect = currentDialect } = data;
      console.log(`✋ Sign detected [${dialect}]: ${signGloss}`);

      // Convert sign to text
      const result = await geminiService.signToText(signGloss, dialect);

      // Add to conversation history
      conversationHistory.push({ role: 'signer', content: result.englishText });

      socket.emit('speak-text', {
        text: result.englishText,
        formalText: result.formalRegister,
        confidence: result.confidence,
        originalSign: signGloss
      });
    });
  });

  // ----------------------------------------
  // EVENT: check-my-sign
  // Teaching mode - analyze user's sign attempt
  // ----------------------------------------
  socket.on('check-my-sign', async (data) => {
    await withRateLimit('check-my-sign', async () => {
      const { videoFrames, intendedSign, dialect = currentDialect } = data;
      console.log(`📚 Checking sign attempt: ${intendedSign}`);

      // Analyze signing accuracy
      const feedback = await geminiService.analyzeSignAccuracy(
        videoFrames,
        intendedSign,
        dialect
      );

      socket.emit('sign-feedback', {
        intendedSign,
        accuracy: feedback.accuracy,
        overallAssessment: feedback.overallAssessment,
        corrections: feedback.corrections,
        correctExecution: feedback.correctExecution,
        culturalNote: feedback.culturalNote,
        encouragement: feedback.encouragement,
        practiceExercise: feedback.practiceExercise
      });
    });
  });

  // ----------------------------------------
  // EVENT: predict-sign
  // Real-time sign prediction from camera
  // ----------------------------------------
  socket.on('predict-sign', async (data) => {
    await withRateLimit('predict-sign', async () => {
      const { imageBase64, dialect = currentDialect } = data;
      console.log(`👁️ Predicting sign from video frame [${dialect}]`);

      const result = await geminiService.predictSignFromImage(imageBase64, dialect);

      socket.emit('sign-predicted', {
        gloss: result.gloss,
        english: result.english,
        confidence: result.confidence,
        description: result.description
      });

      // If confidence is high, speak it automatically
      if (result.confidence > 0.8) {
        socket.emit('speak-text', {
          text: result.english || result.gloss,
          originalSign: result.gloss
        });
      }
    });
  });

  // ----------------------------------------
  // EVENT: detect-objects
  // Spatial awareness - detect objects in scene
  // ----------------------------------------
  socket.on('detect-objects', async (data) => {
    await withRateLimit('detect-objects', async () => {
      const { imageBase64 } = data;
      console.log(`👁️ Detecting objects in scene`);

      const result = await geminiService.detectObjectsInScene(imageBase64);

      socket.emit('objects-detected', {
        objects: result.objects,
        sceneDescription: result.sceneDescription,
        suggestedReferences: result.suggestedReferences
      });
    });
  });

  // ----------------------------------------
  // EVENT: get-sign-suggestions
  // Context-aware sign suggestions
  // ----------------------------------------
  socket.on('get-sign-suggestions', async (data) => {
    await withRateLimit('get-sign-suggestions', async () => {
      const { topic, dialect = currentDialect } = data;
      const history = data.conversationHistory || conversationHistory;
      console.log(`💡 Getting sign suggestions for topic: ${topic || 'general'}`);

      const result = await geminiService.suggestNextSigns(history, topic, dialect);

      socket.emit('suggested-signs', {
        suggestions: result.suggestions,
        topicPredictions: result.topicPredictions,
        conversationPhase: result.conversationPhase
      });
    });
  });

  // ----------------------------------------
  // EVENT: switch-dialect
  // Translate sign sequence between dialects
  // ----------------------------------------
  socket.on('switch-dialect', async (data) => {
    await withRateLimit('switch-dialect', async () => {
      const { currentSequence, fromDialect, toDialect } = data;
      console.log(`🌍 Switching dialect: ${fromDialect} → ${toDialect}`);

      // Update session dialect
      currentDialect = toDialect;

      const result = await geminiService.translateDialect(
        currentSequence,
        fromDialect,
        toDialect
      );

      socket.emit('dialect-switched', {
        sequence: result.translatedSequence,
        fromDialect,
        toDialect,
        grammarChanges: result.grammarChanges,
        culturalAdaptations: result.culturalAdaptations,
        warnings: result.warnings,
        confidence: result.confidence
      });
    });
  });

  // ----------------------------------------
  // EVENT: upload-document
  // Generate lesson from document
  // ----------------------------------------
  socket.on('upload-document', async (data) => {
    await withRateLimit('upload-document', async () => {
      const { documentText, dialect = currentDialect } = data;
      console.log(`📄 Generating lesson from document (${documentText.length} chars)`);

      const lesson = await geminiService.generateLessonFromDocument(documentText, dialect);

      socket.emit('lesson-generated', {
        success: true,
        lesson: {
          title: lesson.title,
          objectives: lesson.objectives,
          estimatedTime: lesson.estimatedTime,
          difficulty: lesson.difficulty,
          vocabulary: lesson.vocabulary,
          sentences: lesson.sentences,
          culturalNotes: lesson.culturalNotes,
          exercises: lesson.exercises,
          progression: lesson.progression
        }
      });
    });
  });

  // ----------------------------------------
  // EVENT: get-sign-info
  // Get detailed information about a sign
  // ----------------------------------------
  socket.on('get-sign-info', async (data) => {
    await withRateLimit('get-sign-info', async () => {
      const { signGloss, dialect = currentDialect } = data;
      console.log(`ℹ️ Getting info for sign: ${signGloss}`);

      const info = await geminiService.getSignInfo(signGloss, dialect);

      socket.emit('sign-info', {
        signGloss,
        dialect,
        ...info
      });
    });
  });

  // ----------------------------------------
  // Legacy events for backward compatibility
  // ----------------------------------------
  socket.on('voice:translate', async (data) => {
    socket.emit('speech-input', data);
  });

  socket.on('sign:landmarks', async (data) => {
    // For now, just acknowledge - full landmark processing would need MediaPipe integration
    const { landmarks, dialect = currentDialect } = data;
    // This would normally process landmarks to detect signs
    // For demo, we just log it
    console.log('📍 Received landmarks data');
  });

  // ----------------------------------------
  // Disconnection handling
  // ----------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    rateLimits.delete(socket.id);
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to Sign Language Translator',
    dialect: currentDialect,
    features: [
      'speech-input',
      'sign-detected',
      'check-my-sign',
      'detect-objects',
      'get-sign-suggestions',
      'switch-dialect',
      'upload-document'
    ]
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🤟 SIGN LANGUAGE TRANSLATOR SERVER');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🚀 Server running on http://localhost:${PORT}`);
  console.log(`  📡 Socket.IO ready for connections`);
  console.log(`  🤖 Gemini AI service initialized`);
  console.log(`  🔑 API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not set'}`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});
