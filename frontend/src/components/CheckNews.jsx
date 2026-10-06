import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getApiErrorMessage, unwrapApiData } from '../api/client';

const speechUnsupportedMessage = 'Speech recognition is not supported in this browser. You can enter a transcript below.';

export default function CheckNews({
  backendUrl,
  user
}) {
  // =====================================================
  // AUTH STATE
  // =====================================================
  const isLoggedIn = !!user;

  // =====================================================
  // ACTIVE TAB
  // =====================================================
  const [activeTab, setActiveTab] = useState('text');

  // =====================================================
  // INPUT STATES
  // =====================================================
  const [newsText, setNewsText] = useState('');
  const [newsUrl, setNewsUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // =====================================================
  // VOICE STATES
  // =====================================================
  const [isRecording, setIsRecording] = useState(false);

  const [recognition, setRecognition] =
    useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceError, setVoiceError] = useState('');
  const voiceHasResult = useRef(false);
  const voiceInProgress = useRef(false);
  const voiceStateRef = useRef('idle');
  const activeModeRef = useRef('text');
  const analysisRequestId = useRef(0);
  const updateVoiceState = useCallback((state) => {
    voiceStateRef.current = state;
    setVoiceState(state);
  }, []);

  // =====================================================
  // OUTPUT STATES
  // =====================================================
  const [result, setResult] = useState(null);
  const [analyzedContent, setAnalyzedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // =====================================================
  // FEEDBACK
  // =====================================================
  const [feedback, setFeedback] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(null);

  // =====================================================
  // LIVE NEWS
  // =====================================================
  const [liveNews, setLiveNews] = useState([]);
  const [newsSource, setNewsSource] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');

  // =====================================================
  // CLEAR LOGIN WARNING AFTER LOGIN
  // =====================================================
  useEffect(() => {
    if (isLoggedIn) {
      setError('');
    }
  }, [isLoggedIn]);

  // =====================================================
  // INITIALIZE SPEECH RECOGNITION
  // =====================================================
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recog =
        new SpeechRecognition();

      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onstart = () => {
        if (activeModeRef.current !== 'voice') {
          try {
            recog.stop();
          } catch {
            // Recognition may already be idle.
          }
          return;
        }
        voiceInProgress.current = true;
        setIsRecording(true);
        updateVoiceState('recording');
        setVoiceError('');
        voiceHasResult.current = false;
      };

      recog.onresult = (event) => {
        if (activeModeRef.current !== 'voice') return;
        const transcript = Array.from(event.results || [])
          .map((result) => result?.[0]?.transcript || '')
          .filter(Boolean)
          .join(' ')
          .trim();
        if (!transcript) return;

        voiceHasResult.current = true;
        setVoiceTranscript((previous) => [previous, transcript].filter(Boolean).join(' ').trim());
        updateVoiceState('transcribed');
        setVoiceError('');
      };

      recog.onerror = (e) => {
        voiceInProgress.current = false;
        const messages = {
          'not-allowed': 'Microphone access was denied. Allow microphone access in your browser and try again.',
          'service-not-allowed': 'Speech recognition is blocked by the browser.',
          'no-speech': 'No speech was detected. Try recording again.',
          network: 'Speech recognition could not connect. Check your connection and try again.',
        };
        setIsRecording(false);
        if (activeModeRef.current !== 'voice') return;
        setVoiceError(messages[e.error] || 'Speech recognition failed. Try again.');
        updateVoiceState('error');
      };

      recog.onend = () => {
        voiceInProgress.current = false;
        setIsRecording(false);
        if (activeModeRef.current !== 'voice') return;
        if (voiceStateRef.current === 'error') return;
        if (!voiceHasResult.current) {
          setVoiceError('No speech was detected. Try recording again.');
          updateVoiceState('error');
          return;
        }
        updateVoiceState('transcribed');
      };

      setRecognition(recog);
      if (activeModeRef.current === 'voice') {
        setVoiceError('');
        updateVoiceState('idle');
      }
      return () => {
        recog.onresult = null;
        recog.onerror = null;
        recog.onstart = null;
        recog.onend = null;
        try {
          recog.stop();
        } catch {
          // Recognition may already be idle.
        }
      };
    } else {
      setVoiceError(speechUnsupportedMessage);
      updateVoiceState('error');
    }
  }, [updateVoiceState]);

  // Release browser object URLs whenever a preview changes or the page unmounts.
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  // =====================================================
  // FETCH LIVE NEWS
  // =====================================================
  const fetchLiveNews = useCallback(async () => {
    try {
      setNewsError('');
      setNewsLoading(true);

      const res = await axios.get(
        `${backendUrl}/api/live-news`
      );

      setLiveNews(
        res.data.news || []
      );

      setNewsSource(
        res.data.source || ''
      );
    } catch (err) {
      console.error(
        'Failed to load live news RSS feed',
        err
      );
      setNewsError('The configured news feed is currently unavailable. Check your connection and try again.');
    } finally {
      setNewsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchLiveNews();
  }, [fetchLiveNews]);

  // =====================================================
  // AUTH HEADERS
  // =====================================================
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem('token');

    return token
      ? {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      : {};
  };

  const clearAnalysisState = () => {
    analysisRequestId.current += 1;
    setResult(null);
    setAnalyzedContent('');
    setAnalysisMode(null);
    setFeedback(null);
    setError('');
    setLoading(false);
  };

  const switchAnalysisMode = (mode) => {
    if (mode === activeTab) return;
    activeModeRef.current = mode;
    if (activeTab === 'voice' && isRecording && recognition) {
      try {
        recognition.stop();
      } catch {
        setVoiceError('Recording could not be stopped. Try again.');
        updateVoiceState('error');
      }
    }
    if (activeTab === 'voice') {
      setVoiceError('');
      updateVoiceState(voiceTranscript.trim() ? 'transcribed' : 'idle');
    }
    if (mode === 'voice') {
      if (!recognition) {
        setVoiceError(speechUnsupportedMessage);
        updateVoiceState('error');
      } else {
        setVoiceError('');
        updateVoiceState(voiceTranscript.trim() ? 'transcribed' : 'idle');
      }
    }
    clearAnalysisState();
    setActiveTab(mode);
  };

  const confidencePercent = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    return Math.min(100, Math.max(0, numericValue <= 1 ? numericValue * 100 : numericValue));
  };

  const formatConfidence = (value) => {
    const percentage = confidencePercent(value);
    return percentage === null ? 'Unavailable' : `${Number(percentage.toFixed(2))}%`;
  };

  // =====================================================
  // BLOCK ANALYSIS IF NOT LOGGED IN
  // =====================================================
  const checkAuth = () => {
    if (!isLoggedIn) {
      setError(
        '⚠️ Please login to use the Fake News Detection features.'
      );

      return false;
    }

    return true;
  };

  // =====================================================
  // 1. TEXT ANALYSIS
  // =====================================================
  const handleCheckText = async (textToAnalyze = newsText, sourceMode = activeTab) => {

    // Do not allow analysis without login.
    if (!checkAuth()) {
      return;
    }

    const submittedText = textToAnalyze.trim();
    if (!submittedText) {
      setError(
        'Please paste or speak news article content.'
      );

      return;
    }

    const requestId = ++analysisRequestId.current;
    try {
      setError('');
      setLoading(true);
      setResult(null);
      setFeedback(null);

      const res = await axios.post(
        `${backendUrl}/api/predict`,
        {
          text: submittedText
        },
        getAuthHeaders()
      );

      if (requestId !== analysisRequestId.current) return;
      setResult(unwrapApiData(res));
      setAnalyzedContent(submittedText);
      setAnalysisMode(sourceMode);

    } catch (err) {
      console.error(
        'Text analysis error:',
        err
      );

      if (requestId === analysisRequestId.current) {
        setError(getApiErrorMessage(err, 'Failed to analyze text.'));
      }
    } finally {
      if (requestId === analysisRequestId.current) setLoading(false);
    }
  };

  // =====================================================
  // 2. URL ANALYSIS
  // =====================================================
  const handleCheckUrl = async (urlToAnalyze = newsUrl) => {

    if (!checkAuth()) {
      return;
    }

    const submittedUrl = (typeof urlToAnalyze === 'string' ? urlToAnalyze : newsUrl).trim();
    if (!submittedUrl) {
      setError(
        'Please enter a valid news article link.'
      );

      return;
    }

    const requestId = ++analysisRequestId.current;
    try {
      setError('');
      setLoading(true);
      setResult(null);
      setFeedback(null);

      const res = await axios.post(
        `${backendUrl}/api/predict-url`,
        {
          url: submittedUrl
        },
        getAuthHeaders()
      );

      const response = unwrapApiData(res);
      if (requestId !== analysisRequestId.current) return;
      setResult(response);
      setAnalyzedContent(response.scraped_text || submittedUrl);
      setAnalysisMode('url');

    } catch (err) {
      console.error(
        'URL analysis error:',
        err
      );

      if (requestId === analysisRequestId.current) {
        setError(getApiErrorMessage(err, 'Failed to analyze article from URL.'));
      }
    } finally {
      if (requestId === analysisRequestId.current) setLoading(false);
    }
  };

  const handleAnalyzeLiveNewsArticle = (url) => {
    if (activeTab !== 'url') clearAnalysisState();
    activeModeRef.current = 'url';
    setActiveTab('url');
    setNewsUrl(url);
    void handleCheckUrl(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =====================================================
  // 3. IMAGE SELECTION
  // =====================================================
  const handleImageChange = (e) => {
    const file =
      e.target.files[0];

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Choose a PNG, JPG, or WEBP image.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Choose an image that is 10 MB or smaller.');
        return;
      }

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(file);

      setImagePreview(
        URL.createObjectURL(file)
      );

      setError('');
    }
  };

  // =====================================================
  // 4. IMAGE OCR ANALYSIS
  // =====================================================
  const handleCheckImage = async () => {

    if (!checkAuth()) {
      return;
    }

    if (!imageFile) {
      setError(
        'Please upload an image containing article text.'
      );

      return;
    }

    const requestId = ++analysisRequestId.current;
    try {
      setError('');
      setLoading(true);
      setResult(null);
      setFeedback(null);

      const formData =
        new FormData();

      formData.append(
        'image',
        imageFile
      );

      const headers =
        getAuthHeaders();

      const config = {
        headers: {
          ...headers.headers,
          'Content-Type':
            'multipart/form-data'
        }
      };

      const res =
        await axios.post(
          `${backendUrl}/api/predict-image`,
          formData,
          config
        );

      if (requestId !== analysisRequestId.current) return;
      setResult(res.data);
      setAnalyzedContent(res.data.extracted_text || '');
      setAnalysisMode('image');

    } catch (err) {
      console.error(
        'Image analysis error:',
        err
      );

      if (requestId === analysisRequestId.current) {
        setError(getApiErrorMessage(err, 'Failed to process text image.'));
      }
    } finally {
      if (requestId === analysisRequestId.current) setLoading(false);
    }
  };

  // =====================================================
  // 5. VOICE RECORDING
  // =====================================================
  const toggleRecording = () => {

    if (!recognition) {
      return;
    }

    if (isRecording) {
      updateVoiceState('processing');
      setVoiceError('');
      try {
        recognition.stop();
      } catch {
        voiceInProgress.current = false;
        setIsRecording(false);
        updateVoiceState('error');
        setVoiceError('Recording could not be stopped. Try again.');
      }
    } else {
      if (voiceInProgress.current) return;
      voiceInProgress.current = true;
      clearAnalysisState();
      setVoiceTranscript('');
      setVoiceError('');
      updateVoiceState('processing');
      try {
        recognition.start();
      } catch {
        voiceInProgress.current = false;
        setIsRecording(false);
        updateVoiceState('error');
        setVoiceError('Recording could not be started. Check microphone access and try again.');
      }
    }
  };

  const clearVoiceTranscript = () => {
    setVoiceTranscript('');
    setVoiceError('');
    updateVoiceState('idle');
    voiceHasResult.current = false;
    clearAnalysisState();
  };

  // =====================================================
  // 6. FEEDBACK
  // =====================================================
  const handleFeedback = async (type) => {

    if (!checkAuth()) {
      return;
    }

    if (!result || !result.id) {
      return;
    }

    try {
      setFeedback(type);

      await axios.post(
        `${backendUrl}/api/feedback`,
        {
          entry_id: result.id,
          feedback: type
        },
        getAuthHeaders()
      );

    } catch (err) {
      console.error(
        'Failed to post rating feedback',
        err
      );
    }
  };

  // =====================================================
  // LOAD EXAMPLE
  // =====================================================
  const loadExample = () => {
    setNewsText(
      'BREAKING EXCLUSIVE: Shocking report reveals military intelligence exposes secret pharmaceutical cover-up. Scientists discovered a banana peel miracle enzyme cures infections, but officials hid the truth to protect profits.'
    );

    setError('');
  };

  // =====================================================
  // CLEAR ALL
  // =====================================================
  const clearAll = () => {
    setNewsText('');
    setNewsUrl('');

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);

    setResult(null);
    setAnalyzedContent('');
    setError('');
    setFeedback(null);
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="analyze-page">
      <header className="analyze-page__header">
        <p className="section-label">ANALYSIS WORKSPACE</p>
        <h1>Analyze a news story</h1>
        <p>Submit text, a URL, an image, or voice input to examine it with the Fake News classification model.</p>
      </header>

      <div className="detector-layout">

      {/* =================================================
          INPUT PANEL
      ================================================= */}
      <section className="glass-card analyzer-card">

        <h2
          style={{
            fontFamily:
              'var(--font-heading)',
            marginBottom: '1rem'
          }}
        >
          Analyze a News Article
        </h2>
        <p className="analyzer-card__eyebrow">FAKE NEWS ANALYSIS</p>

        {/* TABS */}
        <div className="detector-tabs" role="tablist" aria-label="Choose an analysis input method">

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`tab-btn ${
              activeTab === 'text'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              switchAnalysisMode('text');
            }}
          >
            Text
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'url'}
            className={`tab-btn ${
              activeTab === 'url'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              switchAnalysisMode('url');
            }}
          >
            URL
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'image'}
            className={`tab-btn ${
              activeTab === 'image'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              switchAnalysisMode('image');
            }}
          >
            Image OCR
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'voice'}
            className={`tab-btn ${
              activeTab === 'voice'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              switchAnalysisMode('voice');
            }}
          >
            Voice
          </button>

        </div>

        {/* LOGIN / OTHER ERROR */}
        {error && (
          <div
            className="alert alert-danger"
            style={{
              margin: '1rem 0',
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px'
            }}
          >
            {error}
          </div>
        )}

        {/* =================================================
            TEXT TAB
        ================================================= */}
        {activeTab === 'text' && (
          <div className="input-area">

            <textarea
              aria-label="News article text"
              placeholder="Paste the headline or article text here..."
              value={newsText}
              onChange={(e) =>
                setNewsText(
                  e.target.value
                )
              }
            />

            <div className="analysis-action-row" style={{ display: 'flex', gap: '0.75rem' }}>

              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() => handleCheckText()}
                disabled={loading}
              >
                {loading
                  ? 'Analyzing Content...'
                  : '🔍 Analyze News'}
              </button>

              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={
                  loadExample
                }
                disabled={loading}
              >
                Load Example
              </button>

              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={
                  clearAll
                }
                disabled={loading}
              >
                Clear
              </button>

            </div>

          </div>
        )}

        {/* =================================================
            URL TAB
        ================================================= */}
        {activeTab === 'url' && (
          <div className="input-area">

            <div className="url-input-container">

              <input
                type="text"
                placeholder="https://example-news-site.com/article"
                value={newsUrl}
                onChange={(e) =>
                  setNewsUrl(
                    e.target.value
                  )
                }
              />

              <button
                className="btn btn-primary"
                onClick={() => handleCheckUrl()}
                disabled={loading}
              >
                {loading
                  ? 'Scraping...'
                  : 'Scrape & Verify'}
              </button>

            </div>

            <p
              style={{
                fontSize: '0.8rem',
                color:
                  'var(--text-muted)'
              }}
            >
              The application retrieves article text from the URL before classification.
            </p>

          </div>
        )}

        {/* =================================================
            IMAGE TAB
        ================================================= */}
        {activeTab === 'image' && (
          <div className="input-area">

            <div
              className="file-upload-box"
              onClick={() =>
                document
                  .getElementById(
                    'imageFile'
                  )
                  .click()
              }
            >

              <input
                type="file"
                id="imageFile"
                accept="image/*"
                style={{
                  display: 'none'
                }}
                onChange={
                  handleImageChange
                }
              />

              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '180px',
                    borderRadius: '4px',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              ) : (
                <div>

                  <div
                    style={{
                      fontSize: '2.5rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    📁
                  </div>

                  <p
                    style={{
                      fontWeight: '600'
                    }}
                  >
                    Upload an article screenshot or image
                  </p>

                  <p
                    style={{
                      fontSize: '0.8rem',
                      color:
                        'var(--text-muted)',
                      marginTop: '0.25rem'
                    }}
                  >
                    PNG, JPG or WEBP. Text is extracted with OCR before analysis.
                  </p>

                </div>
              )}

            </div>

            {imageFile && (
              <div className="analysis-action-row" style={{ display: 'flex', gap: '0.5rem' }}>

                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={
                    handleCheckImage
                  }
                  disabled={loading}
                >
                  {loading
                    ? 'Performing OCR...'
                    : 'Scan & Analyze'}
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={
                    clearAll
                  }
                  disabled={loading}
                >
                  Remove File
                </button>

              </div>
            )}

          </div>
        )}

        {/* =================================================
            VOICE TAB
        ================================================= */}
        {activeTab === 'voice' && (
          <div
            className="voice-recorder-box voice-analysis"
          >

            <div className="voice-analysis__heading">
              <div>
                <h3>Voice analysis</h3>
                <p>Record a transcript or enter the text to analyze it with the existing text workflow.</p>
              </div>
              <span className={`voice-analysis__state voice-analysis__state--${voiceState}`} role="status">
                {voiceState === 'recording'
                  ? 'Recording'
                  : voiceState === 'processing'
                    ? 'Processing'
                    : voiceState === 'transcribed'
                      ? 'Transcript ready'
                      : voiceState === 'error'
                        ? 'Needs attention'
                        : 'Idle'}
              </span>
            </div>

            {isRecording && (
              <p className="voice-analysis__recording" aria-live="polite">
                <span aria-hidden="true" /> Listening… speak now.
              </p>
            )}
            {voiceState === 'processing' && !isRecording && (
              <p className="voice-analysis__message" role="status">Connecting to browser speech recognition…</p>
            )}
            {voiceError && <p className="voice-analysis__error" role="alert">{voiceError}</p>}

            <div className="voice-analysis__controls">
              <button
                type="button"
                className="btn btn-primary"
                onClick={toggleRecording}
                disabled={!recognition || isRecording || voiceState === 'processing' || loading}
              >
                {voiceState === 'processing' ? 'Starting…' : '🎙️ Start recording'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={toggleRecording}
                disabled={!isRecording || loading}
              >
                Stop
              </button>
            </div>

            <label className="voice-analysis__transcript-label" htmlFor="voiceTranscript">Transcript</label>
            <textarea
              id="voiceTranscript"
              aria-label="Voice transcript"
              value={voiceTranscript}
              onChange={(event) => {
                setVoiceTranscript(event.target.value);
                updateVoiceState(event.target.value.trim() ? 'transcribed' : 'idle');
                setVoiceError('');
              }}
              placeholder="Recognized speech will appear here. You can also enter or edit the transcript."
              disabled={isRecording || loading}
            />

            <div className="voice-analysis__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleCheckText(voiceTranscript, 'voice')}
                disabled={!voiceTranscript.trim() || loading || isRecording}
              >
                {loading && activeTab === 'voice' ? 'Analyzing transcript…' : 'Analyze transcript'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearVoiceTranscript}
                disabled={loading || isRecording}
              >
                Clear
              </button>
            </div>

          </div>
        )}

        </section>

        {/* =================================================
          OUTPUT PANEL
        ================================================= */}
        <section className="glass-card analyzer-card analyzer-results-card">

        {loading && (
          <div className="analyzer-loading-state" role="status">
            <span className="workspace-loading__spinner" />
            <h3>Analyzing news content</h3>
            <p>Running preprocessing, TF-IDF feature extraction, and classification.</p>
          </div>
        )}

        {!loading && !result && (
          <div className="analyzer-empty-state">
            <p className="section-label">MODEL OUTPUT</p>
            <h3>Ready for analysis</h3>

            <p>
              Your model classification will appear here after you submit content.
            </p>

            {!isLoggedIn && (
              <p>
                Sign in to run an analysis.
              </p>
            )}

          </div>
        )}

        {!loading && result && (
          <div className="result-card">

            <h3
              style={{
                fontFamily:
                  'var(--font-heading)'
              }}
            >
              AI model assessment
            </h3>

            <p className="result-eyebrow">AI MODEL ASSESSMENT</p>

            <div
              className={`result-badge ${
                result.prediction?.toLowerCase() === 'real'
                  ? 'real'
                  : 'fake'
              }`}
            >
              {result.prediction?.toUpperCase() || 'UNAVAILABLE'}
            </div>

            <p className="result-disclaimer">
            This is an AI model prediction, not a factual determination. Verify important claims using reliable sources.
            </p>

            <p className="result-classification-label">Model classification</p>

            <div
              className="confidence-bar-container"
            >

              <div
                className="confidence-header"
              >
                <span>
                  Model confidence
                </span>

                <span>
                  {formatConfidence(result.confidence)}
                </span>
              </div>

              <div
                className="confidence-track"
              >
                <div
                  className={`confidence-fill ${
                    result.prediction?.toLowerCase() === 'real'
                      ? 'real'
                      : 'fake'
                  }`}
                  style={{
                    width: `${confidencePercent(result.confidence) ?? 0}%`
                  }}
                />
              </div>

            </div>

            <div>

              <h4
                style={{
                  fontSize:
                    '0.95rem',
                  marginBottom:
                    '0.5rem'
                }}
              >
                Important terms
              </h4>

              <p
                style={{
                  fontSize:
                    '0.85rem',
                  color:
                    'var(--text-secondary)',
                  lineHeight:
                    '1.4'
                }}
              >
                These terms were among the model features associated with the prediction.
              </p>

              <div
                className="explanation-words"
              >

                {(result.importantWords || result.important_words) &&
                (result.importantWords || result.important_words).length >
                  0 ? (

                  (result.importantWords || result.important_words).map(
                    (w, idx) => {
                      return (
                        <span
                          key={idx}
                          className="word-badge"
                        >
                          {w}
                        </span>
                      );
                    }
                  )

                ) : (
                  <span
                    style={{
                      fontSize:
                        '0.8rem',
                      color:
                        'var(--text-muted)'
                    }}
                  >
                    No strong indicators
                    extracted.
                  </span>
                )}

              </div>

            </div>

            {analysisMode === 'url' && result.source_url && (
              <div className="result-submitted result-submitted--url">
                <h4>Source URL</h4>
                <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="result-source-url">
                  {result.source_url}
                </a>
              </div>
            )}

            {analysisMode === 'url' && result.scraped_text ? (
              <div className="result-submitted">
                <h4>Scraped article text</h4>
                <p className="result-submitted__preview">
                  {result.scraped_text.length > 320
                    ? `${result.scraped_text.slice(0, 320).trimEnd()}…`
                    : result.scraped_text}
                </p>
                <details className="result-submitted__details">
                  <summary>View extracted article</summary>
                  <div className="result-submitted__copy">{result.scraped_text}</div>
                </details>
              </div>
            ) : analysisMode !== 'url' && analyzedContent && (
              <div className="result-submitted">
                <h4>{analysisMode === 'image' ? 'Extracted image text' : 'Submitted content'}</h4>
                <div className="result-submitted__copy">{analyzedContent}</div>
              </div>
            )}

            {/* FEEDBACK */}
            <div
              className="feedback-section"
            >

              <h4
                style={{
                  fontSize:
                    '0.9rem',
                  marginBottom:
                    '0.5rem'
                }}
              >
                Was this prediction
                correct?
              </h4>

              <div
                className="feedback-btns"
              >

                <button
                  className={`feedback-btn ${
                    feedback === 'yes'
                      ? 'active-yes'
                      : ''
                  }`}
                  onClick={() =>
                    handleFeedback('yes')
                  }
                >
                  👍 Yes
                </button>

                <button
                  className={`feedback-btn ${
                    feedback === 'no'
                      ? 'active-no'
                      : ''
                  }`}
                  onClick={() =>
                    handleFeedback('no')
                  }
                >
                  👎 No
                </button>

              </div>

              {feedback && (
                <p
                  style={{
                    color:
                      'var(--success)',
                    fontSize:
                      '0.8rem',
                    marginTop:
                      '0.5rem',
                    fontWeight: '700'
                  }}
                >
                  Thank you for your feedback.
                </p>
              )}

            </div>

          </div>
        )}

        </section>

        {/* =================================================
          LIVE NEWS STREAM
        ================================================= */}
        <section className="glass-card live-news-panel">

        <div className="live-news-heading">

          <div>

            <h2
              className="live-news-title"
            >
              Live news
            </h2>

            <p
              className="live-news-description"
            >
              Recent articles from the configured news feed
              {newsSource && <> · Source: {newsSource}</>}
              {newsLoading
                ? ' · Connecting...'
                : ''}
            </p>

          </div>

          <button
            className="btn btn-secondary"
            onClick={
              fetchLiveNews
            }
            disabled={
              newsLoading
            }
          >
            🔄 Refresh
          </button>

        </div>

        {newsError && liveNews.length > 0 && (
          <p className="live-news-refresh-error" role="alert">{newsError} Showing the last articles received.</p>
        )}

        {newsLoading ? (
          <div className="live-news-state" role="status">
            <span className="workspace-loading__spinner" />
            <p>Checking the configured news feed...</p>
          </div>
        ) : (
          <div className="live-news-grid">

            {liveNews.length > 0 ? (

              liveNews.map(
                (news, idx) => (
                  <div
                    key={idx}
                    className="news-card"
                  >

                    <div
                      className="news-header"
                    >

                      <h4
                        className="news-title"
                      >
                        {news.title}
                      </h4>

                      <p className="news-meta">
                        {news.source || newsSource || 'News source'}
                      </p>

                    </div>

                    <p className="news-summary">
                      {news.description}
                    </p>

                    <div className="news-actions">
                      <a
                        href={news.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-link"
                      >
                        Read full article ↗
                      </a>
                      <button
                        type="button"
                        className="news-link news-analyze-link"
                        onClick={() => handleAnalyzeLiveNewsArticle(news.link)}
                      >
                        Analyze article →
                      </button>
                    </div>

                  </div>
                )
              )

            ) : (

              <div className="live-news-empty" role={newsError ? 'alert' : undefined}>
                <span className="live-news-empty__mark" aria-hidden="true">i</span>
                <div>
                  <h3>{newsError ? 'Headlines are unavailable' : 'No headlines available'}</h3>
                  <p>{newsError || 'The configured news feed did not return any recent articles. Refresh to check again.'}</p>
                </div>
                <button className="btn btn-secondary" type="button" onClick={fetchLiveNews} disabled={newsLoading}>
                  Retry
                </button>
              </div>

            )}

          </div>
        )}

      </section>

      </div>
    </div>
  );
}
