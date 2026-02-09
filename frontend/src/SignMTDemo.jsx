// frontend/src/SignMTDemo.jsx
// Simple demo app showcasing Gemini + Sign.MT translation
// Can be used standalone or as a component in the main app

import { useState, useCallback } from 'react';
import { SignMTAvatar, SignMTPlayer } from '../components/SignMTAvatar';
import './SignMTDemo.css';

// Quick test phrases
const TEST_PHRASES = [
    { text: 'HELLO', icon: '👋' },
    { text: 'THANK YOU', icon: '🙏' },
    { text: 'PLEASE', icon: '🤲' },
    { text: 'I LOVE YOU', icon: '❤️' },
    { text: 'GOOD MORNING', icon: '🌅' },
    { text: 'HOW ARE YOU', icon: '👀' },
    { text: 'NICE TO MEET YOU', icon: '🤝' },
    { text: 'GOODBYE', icon: '👋' }
];

function SignMTDemo() {
    const [inputText, setInputText] = useState('');
    const [sigml, setSigml] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [translationData, setTranslationData] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('ASL');
    const [outputMode, setOutputMode] = useState('merged');

    const handleTranslate = useCallback(async (text = inputText) => {
        if (!text.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text.trim(),
                    targetLanguage: selectedLanguage,
                    outputFormat: outputMode
                })
            });

            const data = await response.json();

            if (data.success) {
                setTranslationData(data);
                setSigml(data.outputs.recommended);
            } else {
                setError(data.error || 'Translation failed');
            }
        } catch (err) {
            console.error('Translation failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [inputText, selectedLanguage, outputMode]);

    const handleQuickPhrase = (phrase) => {
        setInputText(phrase);
        handleTranslate(phrase);
    };

    return (
        <div className="signmt-demo">
            {/* Header */}
            <header className="demo-header">
                <h1>🤟 Gemini + Sign.MT Translator</h1>
                <p className="subtitle">Powered by Gemini 2.0 Flash + Sign.MT</p>
            </header>

            {/* Main Content */}
            <div className="demo-content">
                {/* Left Panel - Input */}
                <div className="input-panel">
                    {/* Language Selector */}
                    <div className="language-selector">
                        <label>Target Language:</label>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                        >
                            <option value="ASL">American Sign Language (ASL)</option>
                            <option value="BSL">British Sign Language (BSL)</option>
                            <option value="DGS">German Sign Language (DGS)</option>
                            <option value="LSF">French Sign Language (LSF)</option>
                        </select>
                    </div>

                    {/* Output Mode */}
                    <div className="output-selector">
                        <label>Output Mode:</label>
                        <div className="output-modes">
                            {['merged', 'gemini', 'signmt'].map(mode => (
                                <button
                                    key={mode}
                                    className={`mode-btn ${outputMode === mode ? 'active' : ''}`}
                                    onClick={() => setOutputMode(mode)}
                                >
                                    {mode === 'merged' ? '🔀 Merged' :
                                        mode === 'gemini' ? '🤖 Gemini' : '📦 Sign.MT'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Input */}
                    <div className="text-input-area">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Enter text to translate to sign language..."
                            rows={4}
                            disabled={loading}
                        />
                        <button
                            className="translate-btn"
                            onClick={() => handleTranslate()}
                            disabled={loading || !inputText.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Translating...
                                </>
                            ) : (
                                <>🤟 Translate to {selectedLanguage}</>
                            )}
                        </button>
                    </div>

                    {/* Quick Phrases */}
                    <div className="quick-phrases">
                        <h3>Quick Test Phrases:</h3>
                        <div className="phrase-grid">
                            {TEST_PHRASES.map((phrase, i) => (
                                <button
                                    key={i}
                                    className="phrase-btn"
                                    onClick={() => handleQuickPhrase(phrase.text)}
                                    disabled={loading}
                                >
                                    <span className="phrase-icon">{phrase.icon}</span>
                                    <span className="phrase-text">{phrase.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Right Panel - Avatar */}
                <div className="avatar-panel">
                    <SignMTAvatar
                        sigmlContent={sigml}
                        language={selectedLanguage}
                        width="100%"
                        height="500px"
                        onReady={() => console.log('Avatar ready')}
                        onPlayStart={() => console.log('Playing...')}
                        onPlayEnd={() => console.log('Finished')}
                        onError={(err) => setError(err.message)}
                    />
                </div>
            </div>

            {/* Translation Details */}
            {translationData && (
                <div className="translation-details">
                    <h3>Translation Details</h3>
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Confidence:</span>
                            <span className="detail-value">
                                {translationData.metadata.confidence}%
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Source:</span>
                            <span className="detail-value">
                                {translationData.metadata.source}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Valid XML:</span>
                            <span className="detail-value">
                                {translationData.metadata.isValidXml ? '✅' : '⚠️'}
                            </span>
                        </div>
                    </div>

                    {/* SiGML Preview */}
                    <details className="sigml-preview">
                        <summary>View SiGML Output</summary>
                        <pre>{sigml}</pre>
                    </details>
                </div>
            )}

            {/* Footer */}
            <footer className="demo-footer">
                <p>
                    Built with 💜 using Gemini 2.0 Flash + Sign.MT
                    <br />
                    <small>Hackathon Demo • Not for production use</small>
                </p>
            </footer>
        </div>
    );
}

export default SignMTDemo;
