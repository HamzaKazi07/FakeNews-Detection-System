import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiErrorMessage, unwrapApiData } from '../api/client';

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

  const [recordingStatus, setRecordingStatus] =
    useState(
      'Press mic to start speaking'
    );

  const [recognition, setRecognition] =
    useState(null);

  // =====================================================
  // OUTPUT STATES
  // =====================================================
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // =====================================================
  // FEEDBACK
  // =====================================================
  const [feedback, setFeedback] = useState(null);

  // =====================================================
  // LIVE NEWS
  // =====================================================
  const [liveNews, setLiveNews] = useState([]);
  const [newsSource, setNewsSource] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);

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
        setIsRecording(true);

        setRecordingStatus(
          'Listening... Speak now.'
        );
      };

      recog.onresult = (event) => {
        const transcript =
          event.results[0][0].transcript;

        setNewsText((prev) =>
          prev
            ? prev + ' ' + transcript
            : transcript
        );

        setRecordingStatus(
          `Transcribed: "${transcript}"`
        );
      };

      recog.onerror = (e) => {
        console.error(e);

        setRecordingStatus(
          'Error recognizing speech. Try again.'
        );

        setIsRecording(false);
      };

      recog.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recog);
    } else {
      setRecordingStatus(
        'Speech Recognition not supported in this browser.'
      );
    }
  }, []);

  // Release browser object URLs whenever a preview changes or the page unmounts.
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  // =====================================================
  // FETCH LIVE NEWS
  // =====================================================
  useEffect(() => {
    fetchLiveNews();
  }, []);

  const fetchLiveNews = async () => {
    try {
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
    } finally {
      setNewsLoading(false);
    }
  };

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
  const handleCheckText = async () => {

    // Do not allow analysis without login.
    if (!checkAuth()) {
      return;
    }

    if (!newsText.trim()) {
      setError(
        'Please paste or speak news article content.'
      );

      return;
    }

    try {
      setError('');
      setLoading(true);
      setResult(null);
      setFeedback(null);

      const res = await axios.post(
        `${backendUrl}/api/predict`,
        {
          text: newsText
        },
        getAuthHeaders()
      );

      setResult(unwrapApiData(res));

    } catch (err) {
      console.error(
        'Text analysis error:',
        err
      );

      setError(getApiErrorMessage(err, 'Failed to analyze text.'));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 2. URL ANALYSIS
  // =====================================================
  const handleCheckUrl = async () => {

    if (!checkAuth()) {
      return;
    }

    if (!newsUrl.trim()) {
      setError(
        'Please enter a valid news article link.'
      );

      return;
    }

    try {
      setError('');
      setLoading(true);
      setResult(null);
      setFeedback(null);

      const res = await axios.post(
        `${backendUrl}/api/predict-url`,
        {
          url: newsUrl
        },
        getAuthHeaders()
      );

      setResult(res.data);

      if (res.data.scraped_text) {
        setNewsText(
          res.data.scraped_text
        );
      }

    } catch (err) {
      console.error(
        'URL analysis error:',
        err
      );

      setError(getApiErrorMessage(err, 'Failed to analyze article from URL.'));
    } finally {
      setLoading(false);
    }
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
        setError('Choose an image smaller than 10 MB.');
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

      setResult(res.data);

      if (
        res.data.extracted_text
      ) {
        setNewsText(
          res.data.extracted_text
        );
      }

    } catch (err) {
      console.error(
        'Image analysis error:',
        err
      );

      setError(getApiErrorMessage(err, 'Failed to process text image.'));
    } finally {
      setLoading(false);
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
      recognition.stop();
    } else {
      // Voice input itself is allowed.
      // Analysis still requires login.
      recognition.start();
    }
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
        <h1>Analyze a news story.</h1>
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
              setActiveTab('text');
              setError('');
            }}
          >
            ✍️ Text Content
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
              setActiveTab('url');
              setError('');
            }}
          >
            🔗 URL Article
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
              setActiveTab('image');
              setError('');
            }}
          >
            🖼️ Scan Image
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
              setActiveTab('voice');
              setError('');
            }}
          >
            🎙️ Speech Audio
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
                onClick={
                  handleCheckText
                }
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
                onClick={
                  handleCheckUrl
                }
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
            className="voice-recorder-box"
          >

            <button
              className={`mic-btn ${
                isRecording
                  ? 'recording'
                  : ''
              }`}
              onClick={
                toggleRecording
              }
            >
              {isRecording
                ? '⏹️'
                : '🎙️'}
            </button>

            <h4
              style={{
                marginBottom:
                  '0.5rem'
              }}
            >
              {isRecording
                ? 'Listening...'
                : 'Ready to speak'}
            </h4>

            <p
              style={{
                fontSize: '0.85rem',
                color:
                  'var(--text-secondary)'
              }}
            >
              <span className="voice-status">{recordingStatus}</span>
            </p>

            {newsText && (
                <div
                  className="input-area"
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'left'
                }}
              >

                <textarea
                  value={newsText}
                  onChange={(e) =>
                    setNewsText(
                      e.target.value
                    )
                  }
                  placeholder="Voice text will appear here..."
                />

                <div className="analysis-action-row" style={{ display: 'flex', gap: '0.5rem' }}>

                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    onClick={
                      handleCheckText
                    }
                    disabled={loading}
                  >
                    {loading
                      ? 'Running Audit...'
                      : 'Analyze Spoken Content'}
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

          </div>
        )}

        </section>

        {/* =================================================
          OUTPUT PANEL
        ================================================= */}
        <section className="glass-card analyzer-card analyzer-results-card">

        {loading && (
          <div className="analyzer-loading-state"
            style={{
              textAlign: 'center',
              padding: '3rem 0'
            }}
          >

            <div
              style={{
                fontSize: '3rem',
                animation:
                  'spin 1.5s linear infinite',
                display: 'inline-block'
              }}
            >
              🌀
            </div>

            <h3
              style={{
                marginTop: '1.25rem'
              }}
            >
              Analyzing News Content...
            </h3>

            <p
              style={{
                fontSize: '0.85rem',
                color:
                  'var(--text-muted)'
              }}
            >
              Running preprocessing, TF-IDF feature extraction, and classification.
            </p>

            <style>{`
              @keyframes spin {
                100% {
                  transform: rotate(360deg);
                }
              }
            `}</style>

          </div>
        )}

        {!loading && !result && (
          <div className="analyzer-empty-state"
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color:
                'var(--text-muted)'
            }}
          >

            <div
              style={{
                fontSize: '3.5rem',
                marginBottom: '1rem'
              }}
            >
              📈
            </div>

            <p className="section-label">MODEL OUTPUT</p>
            <h3>Ready for analysis</h3>

            <p
              style={{
                fontSize: '0.9rem',
                marginTop: '0.5rem',
                lineHeight: '1.5'
              }}
            >
              Your model classification will appear here after you submit content.
            </p>

            {!isLoggedIn && (
              <p
                style={{
                  fontSize: '0.85rem',
                  marginTop: '0.5rem'
                }}
              >
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
              Analysis result
            </h3>

            <p className="result-eyebrow">FAKE NEWS MODEL OUTPUT</p>

            <div
              className={`result-badge ${
                result.prediction
                  .toLowerCase() === 'real'
                  ? 'real'
                  : 'fake'
              }`}
            >
              {result.prediction ===
              'REAL'
                ? 'REAL'
                : 'FAKE'}
            </div>

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
                  {result.confidence}%
                </span>
              </div>

              <div
                className="confidence-track"
              >
                <div
                  className={`confidence-fill ${
                    result.prediction
                      .toLowerCase() ===
                    'real'
                      ? 'real'
                      : 'fake'
                  }`}
                  style={{
                    width:
                      `${result.confidence}%`
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

                {result.important_words &&
                result.important_words.length >
                  0 ? (

                  result.important_words.map(
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
        <section
        className="glass-card"
        style={{
          gridColumn: '1 / -1'
        }}
      >

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom:
              '1rem'
          }}
        >

          <div>

            <h2
              style={{
                fontFamily:
                  'var(--font-heading)'
              }}
            >
              Live news
            </h2>

            <p
              style={{
                fontSize:
                  '0.85rem',
                color:
                  'var(--text-muted)'
              }}
            >
              Recent articles from the configured news feed. Source:{' '}
              {newsLoading
                ? 'Connecting...'
                : newsSource ||
                  'BBC News Live'}
            </p>

          </div>

          <button
            className="btn btn-secondary"
            style={{
              padding:
                '0.5rem 1rem'
            }}
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

        {newsLoading ? (
          <div
            style={{
              textAlign:
                'center',
              padding:
                '2rem 0'
            }}
          >

            <div
              style={{
                fontSize:
                  '2rem',
                animation:
                  'spin 1.5s linear infinite',
                display:
                  'inline-block'
              }}
            >
              🌀
            </div>

            <p
              style={{
                fontSize:
                  '0.85rem',
                color:
                  'var(--text-muted)',
                marginTop:
                  '0.5rem'
              }}
            >
              Fetching top stories...
            </p>

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

                      <span
                        className={`badge-status ${
                          news.prediction
                            ?.toLowerCase() ===
                          'real'
                            ? 'real'
                            : 'fake'
                        }`}
                      >
                        {news.prediction ===
                        'REAL'
                          ? 'REAL MODEL SIGNAL'
                          : 'FAKE MODEL SIGNAL'}

                        {' '}
                        (
                        {news.confidence}
                        %)
                      </span>

                    </div>

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
                      {news.description}
                    </p>

                    <a
                      href={news.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-link"
                    >
                      Read full article ↗
                    </a>

                  </div>
                )
              )

            ) : (

              <p
                style={{
                  textAlign:
                    'center',
                  color:
                    'var(--text-muted)',
                  fontSize:
                    '0.9rem'
                }}
              >
                No active headlines
                received. Make sure your
                local internet allows
                outgoing API requests.
              </p>

            )}

          </div>
        )}

      </section>

      </div>
    </div>
  );
}
