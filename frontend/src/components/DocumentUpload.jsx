import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './DocumentUpload.css';

// ============================================
// CONSTANTS
// ============================================
const SUPPORTED_TYPES = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'text/markdown': 'MD'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ============================================
// SOCKET CONNECTION
// ============================================
const socket = io('http://localhost:3001', { autoConnect: false });

// ============================================
// DOCUMENT UPLOAD COMPONENT
// ============================================
export default function DocumentUpload({
    currentLesson: externalLesson,
    dialect = 'ASL',
    onLessonGenerated,
    onStartTeaching,
    onClose
}) {
    // State
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState('');
    const [error, setError] = useState(null);
    const [lesson, setLesson] = useState(externalLesson);
    const [extractedText, setExtractedText] = useState('');
    const [expandedNotes, setExpandedNotes] = useState({});
    const [practiceQueue, setPracticeQueue] = useState([]);

    // Refs
    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);

    // Sync external lesson prop
    useEffect(() => {
        if (externalLesson) setLesson(externalLesson);
    }, [externalLesson]);

    // Socket connection
    useEffect(() => {
        socket.connect();

        socket.on('lesson-generated', (data) => {
            setProcessingStatus('');
            if (data.success && data.lesson) {
                setLesson(data.lesson);
                if (onLessonGenerated) onLessonGenerated(data.lesson);
            } else {
                setError('Failed to generate lesson');
            }
        });

        socket.on('error', (data) => {
            setProcessingStatus('');
            setError(data.message || 'An error occurred');
        });

        return () => {
            socket.off('lesson-generated');
            socket.off('error');
        };
    }, [onLessonGenerated]);

    // ============================================
    // FILE HANDLING
    // ============================================

    const validateFile = useCallback((file) => {
        if (!file) return 'No file selected';

        if (!SUPPORTED_TYPES[file.type]) {
            return `Unsupported file type. Please upload PDF, DOCX, or TXT files.`;
        }

        if (file.size > MAX_FILE_SIZE) {
            return `File too large. Maximum size is 5MB.`;
        }

        return null;
    }, []);

    const extractTextFromFile = useCallback(async (file) => {
        const fileType = file.type;

        if (fileType === 'text/plain' || fileType === 'text/markdown') {
            // Plain text - direct read
            return await file.text();
        }

        if (fileType === 'application/pdf') {
            // PDF parsing using pdf.js
            return await extractPdfText(file);
        }

        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // DOCX parsing using mammoth
            return await extractDocxText(file);
        }

        throw new Error('Unsupported file type');
    }, []);

    const processFile = useCallback(async (selectedFile) => {
        setError(null);
        setLesson(null);
        setExtractedText('');

        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            return;
        }

        setFile(selectedFile);
        setProcessingStatus('Reading file...');
        setUploadProgress(20);

        try {
            // Extract text
            setProcessingStatus('Extracting text...');
            setUploadProgress(40);

            const text = await extractTextFromFile(selectedFile);
            setExtractedText(text);
            setUploadProgress(60);

            if (!text || text.trim().length < 10) {
                throw new Error('Could not extract enough text from the document');
            }

            // Send to backend
            setProcessingStatus('Generating lesson with AI...');
            setUploadProgress(80);

            socket.emit('upload-document', {
                documentText: text,
                dialect,
                filename: selectedFile.name
            });

        } catch (err) {
            setError(err.message || 'Failed to process file');
            setProcessingStatus('');
            setUploadProgress(0);
        }
    }, [validateFile, extractTextFromFile, dialect]);

    // ============================================
    // DRAG & DROP HANDLERS
    // ============================================

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === dropZoneRef.current) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    }, [processFile]);

    const handleFileSelect = useCallback((e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    }, [processFile]);

    // ============================================
    // LESSON ACTIONS
    // ============================================

    const startLesson = useCallback(() => {
        if (!lesson?.vocabulary) return;

        const queue = lesson.vocabulary.map(v => ({
            gloss: v.sign?.gloss || v.term,
            meaning: v.term,
            difficulty: v.difficulty
        }));

        setPracticeQueue(queue);
        if (onStartTeaching && queue.length > 0) {
            onStartTeaching(queue[0]);
        }
    }, [lesson, onStartTeaching]);

    const practiceSign = useCallback((vocab) => {
        if (onStartTeaching) {
            onStartTeaching({
                gloss: vocab.sign?.gloss || vocab.term,
                meaning: vocab.term
            });
        }
    }, [onStartTeaching]);

    const addToQueue = useCallback((vocab) => {
        setPracticeQueue(prev => {
            const exists = prev.find(p => p.gloss === (vocab.sign?.gloss || vocab.term));
            if (exists) return prev;
            return [...prev, {
                gloss: vocab.sign?.gloss || vocab.term,
                meaning: vocab.term,
                difficulty: vocab.difficulty
            }];
        });
    }, []);

    const downloadLesson = useCallback(() => {
        if (!lesson) return;

        // Generate printable HTML
        const html = generateLessonHtml(lesson, dialect);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${lesson.title || 'Sign-Language-Lesson'}.html`;
        a.click();

        URL.revokeObjectURL(url);
    }, [lesson, dialect]);

    const shareLesson = useCallback(() => {
        if (!lesson) return;

        const lessonData = btoa(JSON.stringify(lesson));
        const shareUrl = `${window.location.origin}?lesson=${lessonData}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Lesson link copied to clipboard!');
        }).catch(() => {
            alert('Could not copy link. Lesson data logged to console.');
            console.log('Lesson data:', lesson);
        });
    }, [lesson]);

    const toggleNote = useCallback((index) => {
        setExpandedNotes(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    }, []);

    const resetUpload = useCallback(() => {
        setFile(null);
        setLesson(null);
        setExtractedText('');
        setUploadProgress(0);
        setProcessingStatus('');
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="document-upload">
            <header className="upload-header">
                <h2>📄 Document to Lesson</h2>
                <p className="subtitle">Upload any document to generate a custom sign language lesson</p>
            </header>

            {/* Error Display */}
            {error && (
                <div className="error-banner">
                    <span className="error-icon">⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Upload Section - Show when no lesson */}
            {!lesson && (
                <section className="upload-section">
                    {/* Drag & Drop Zone */}
                    <div
                        ref={dropZoneRef}
                        className={`drop-zone ${isDragging ? 'dragging' : ''} ${processingStatus ? 'processing' : ''}`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => !processingStatus && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            onChange={handleFileSelect}
                            hidden
                        />

                        {processingStatus ? (
                            <div className="processing-state">
                                <div className="spinner"></div>
                                <p className="processing-text">{processingStatus}</p>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="drop-icon">📁</div>
                                <p className="drop-text">
                                    Drag & drop a document here<br />
                                    <span className="drop-hint">or click to browse</span>
                                </p>
                                <div className="supported-types">
                                    <span>PDF</span>
                                    <span>DOCX</span>
                                    <span>TXT</span>
                                </div>
                                <p className="size-limit">Max 5MB</p>
                            </>
                        )}
                    </div>

                    {/* Or paste text */}
                    <div className="paste-section">
                        <p className="divider-text">— or paste text —</p>
                        <textarea
                            placeholder="Paste your text here..."
                            rows={4}
                            onChange={(e) => setExtractedText(e.target.value)}
                            value={extractedText}
                        />
                        <button
                            className="generate-btn"
                            onClick={() => {
                                if (extractedText.trim().length > 10) {
                                    setProcessingStatus('Generating lesson with AI...');
                                    socket.emit('upload-document', {
                                        documentText: extractedText,
                                        dialect,
                                        filename: 'pasted-text'
                                    });
                                } else {
                                    setError('Please enter at least 10 characters');
                                }
                            }}
                            disabled={extractedText.trim().length < 10}
                        >
                            Generate Lesson
                        </button>
                    </div>
                </section>
            )}

            {/* Lesson Display */}
            {lesson && (
                <section className="lesson-section">
                    {/* Lesson Header */}
                    <div className="lesson-header">
                        <div className="lesson-title-row">
                            <h3>{lesson.title || 'Generated Lesson'}</h3>
                            <button className="reset-btn" onClick={resetUpload}>
                                ↩ New Upload
                            </button>
                        </div>

                        <div className="lesson-meta">
                            {lesson.difficulty && (
                                <span className={`difficulty-badge ${lesson.difficulty}`}>
                                    {lesson.difficulty}
                                </span>
                            )}
                            {lesson.estimatedTime && (
                                <span className="time-badge">⏱ {lesson.estimatedTime}</span>
                            )}
                            <span className="dialect-badge">{dialect}</span>
                        </div>

                        {lesson.objectives && (
                            <ul className="objectives-list">
                                {lesson.objectives.map((obj, i) => (
                                    <li key={i}>✓ {obj}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Lesson Actions */}
                    <div className="lesson-actions">
                        <button className="action-btn primary" onClick={startLesson}>
                            ▶ Start Lesson
                        </button>
                        <button className="action-btn" onClick={downloadLesson}>
                            📥 Download
                        </button>
                        <button className="action-btn" onClick={shareLesson}>
                            🔗 Share
                        </button>
                    </div>

                    {/* Vocabulary Table */}
                    {lesson.vocabulary && lesson.vocabulary.length > 0 && (
                        <div className="vocabulary-section">
                            <h4>📚 Vocabulary ({lesson.vocabulary.length} terms)</h4>
                            <div className="vocabulary-table-wrapper">
                                <table className="vocabulary-table">
                                    <thead>
                                        <tr>
                                            <th>Term</th>
                                            <th>Sign</th>
                                            <th>Level</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lesson.vocabulary.map((vocab, i) => (
                                            <tr key={i}>
                                                <td className="term-cell">
                                                    <strong>{vocab.term}</strong>
                                                    {vocab.memoryTip && (
                                                        <span className="memory-tip" title={vocab.memoryTip}>💡</span>
                                                    )}
                                                </td>
                                                <td className="sign-cell">
                                                    <code className="sign-gloss">{vocab.sign?.gloss || '—'}</code>
                                                </td>
                                                <td>
                                                    <span className={`difficulty-tag ${vocab.difficulty || 'easy'}`}>
                                                        {vocab.difficulty || 'easy'}
                                                    </span>
                                                </td>
                                                <td className="actions-cell">
                                                    <button onClick={() => practiceSign(vocab)} title="Practice">
                                                        🎯
                                                    </button>
                                                    <button onClick={() => addToQueue(vocab)} title="Add to queue">
                                                        +
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Practice Sentences */}
                    {lesson.sentences && lesson.sentences.length > 0 && (
                        <div className="sentences-section">
                            <h4>✍️ Practice Sentences</h4>
                            <div className="sentences-list">
                                {lesson.sentences.map((sent, i) => (
                                    <div key={i} className="sentence-card">
                                        <p className="sentence-english">{sent.english}</p>
                                        <p className="sentence-gloss">
                                            {sent.signSequence?.join(' ') || sent.glossString}
                                        </p>
                                        {sent.grammarNote && (
                                            <p className="grammar-note">💡 {sent.grammarNote}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cultural Notes */}
                    {lesson.culturalNotes && lesson.culturalNotes.length > 0 && (
                        <div className="cultural-section">
                            <h4>🌍 Cultural Notes</h4>
                            <div className="cultural-notes">
                                {lesson.culturalNotes.map((note, i) => (
                                    <div
                                        key={i}
                                        className={`cultural-card ${expandedNotes[i] ? 'expanded' : ''}`}
                                        onClick={() => toggleNote(i)}
                                    >
                                        <div className="cultural-header">
                                            <span className="cultural-topic">{note.topic}</span>
                                            <span className="expand-icon">{expandedNotes[i] ? '−' : '+'}</span>
                                        </div>
                                        {expandedNotes[i] && (
                                            <p className="cultural-explanation">{note.explanation}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lesson Progression */}
                    {lesson.progression && lesson.progression.length > 0 && (
                        <div className="progression-section">
                            <h4>📈 Lesson Progression</h4>
                            <div className="progression-steps">
                                {lesson.progression.map((step, i) => (
                                    <div key={i} className="progression-step">
                                        <div className="step-number">{step.stage || i + 1}</div>
                                        <div className="step-content">
                                            <strong>{step.focus}</strong>
                                            {step.signs && (
                                                <p className="step-signs">{step.signs.join(', ')}</p>
                                            )}
                                            {step.milestone && (
                                                <p className="step-milestone">🏁 {step.milestone}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exercises */}
                    {lesson.exercises && lesson.exercises.length > 0 && (
                        <div className="exercises-section">
                            <h4>✏️ Exercises</h4>
                            <div className="exercises-list">
                                {lesson.exercises.map((exercise, i) => (
                                    <div key={i} className="exercise-card">
                                        <span className={`exercise-type ${exercise.type}`}>
                                            {exercise.type}
                                        </span>
                                        <p className="exercise-instruction">{exercise.instruction}</p>
                                        <p className="exercise-content">{exercise.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Practice Queue */}
            {practiceQueue.length > 0 && (
                <div className="queue-banner">
                    <span className="queue-count">{practiceQueue.length} signs in queue</span>
                    <button onClick={() => onStartTeaching && onStartTeaching(practiceQueue[0])}>
                        Start Practice →
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function extractPdfText(file) {
    // Load PDF.js dynamically
    try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (err) {
        console.warn('PDF.js not available, using fallback');
        // Fallback: try reading as text (won't work for binary PDFs)
        throw new Error('PDF parsing requires the pdf.js library. Please paste the text instead.');
    }
}

async function extractDocxText(file) {
    // Load mammoth dynamically
    try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (err) {
        console.warn('Mammoth.js not available, using fallback');
        throw new Error('DOCX parsing requires the mammoth library. Please paste the text instead.');
    }
}

function generateLessonHtml(lesson, dialect) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lesson.title || 'Sign Language Lesson'}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #4f46e5; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; }
    .note { background: #fef3c7; padding: 12px; border-radius: 8px; margin: 10px 0; }
    @media print { body { font-size: 12pt; } }
  </style>
</head>
<body>
  <h1>${lesson.title || 'Sign Language Lesson'}</h1>
  <p><strong>Dialect:</strong> ${dialect} | <strong>Duration:</strong> ${lesson.estimatedTime || '30 minutes'}</p>
  
  ${lesson.objectives ? `
  <h2>Learning Objectives</h2>
  <ul>${lesson.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
  ` : ''}
  
  ${lesson.vocabulary ? `
  <h2>Vocabulary</h2>
  <table>
    <thead><tr><th>Term</th><th>Sign</th><th>Level</th></tr></thead>
    <tbody>
      ${lesson.vocabulary.map(v => `
        <tr>
          <td>${v.term}</td>
          <td><code>${v.sign?.gloss || '—'}</code></td>
          <td>${v.difficulty || 'easy'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}
  
  ${lesson.sentences ? `
  <h2>Practice Sentences</h2>
  ${lesson.sentences.map(s => `
    <div style="margin: 15px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
      <p><strong>English:</strong> ${s.english}</p>
      <p><strong>${dialect}:</strong> <code>${s.signSequence?.join(' ') || s.glossString}</code></p>
    </div>
  `).join('')}
  ` : ''}
  
  ${lesson.culturalNotes ? `
  <h2>Cultural Notes</h2>
  ${lesson.culturalNotes.map(n => `
    <div class="note">
      <strong>${n.topic}:</strong> ${n.explanation}
    </div>
  `).join('')}
  ` : ''}
  
  <footer style="margin-top: 40px; color: #666; text-align: center;">
    Generated by Sign Language Translator | ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>
  `;
}
