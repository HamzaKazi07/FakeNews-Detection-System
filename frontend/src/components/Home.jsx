import React from 'react';

const features = [
  ['01', 'Text Analysis', 'Paste news content and inspect the model prediction, confidence, and important terms.', 'Aa'],
  ['02', 'URL Analysis', 'Submit an article URL and let the existing backend retrieve content for classification.', '↗'],
  ['03', 'Image / OCR', 'Upload a screenshot or article image so its text can be extracted before analysis.', '▧'],
  ['04', 'Voice Input', 'Use browser speech recognition to turn spoken context into text for analysis.', '◉']
];

const workflow = [
  ['01', 'Input', 'Provide news text, a URL, an image, or speech.'],
  ['02', 'Preprocessing', 'Text is cleaned and normalized before feature extraction.'],
  ['03', 'TF-IDF', 'The content is converted into numerical language features.'],
  ['04', 'Machine learning', 'Logistic Regression evaluates the extracted features.'],
  ['05', 'Prediction', 'The system returns REAL or FAKE with model confidence.']
];

const technologies = [
  ['Frontend', 'React + Vite'],
  ['Backend API', 'Flask'],
  ['Machine learning', 'Python + scikit-learn'],
  ['NLP features', 'TF-IDF'],
  ['Classifier', 'Logistic Regression'],
  ['Input support', 'OCR + browser speech recognition']
];

export default function Home({ setActiveTab }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="product-home">
      <section className="product-hero" id="home">
        <div className="product-hero__copy">
          <p className="eyebrow"><span className="eyebrow__dot" /> AI-powered fake news detection</p>
          <h1>Detect Fake News<br /><span>with Machine Learning</span></h1>
          <p className="product-hero__description">Analyze potentially misleading news using NLP, TF-IDF, and Logistic Regression. Fake News helps you examine signals in text without presenting a prediction as factual certainty.</p>
          <div className="product-hero__actions">
            <button className="btn btn-primary" type="button" onClick={() => setActiveTab('check')}>Analyze News <span aria-hidden="true">-&gt;</span></button>
            <button className="btn btn-secondary" type="button" onClick={() => scrollTo('methods')}>How It Works <span aria-hidden="true">↓</span></button>
          </div>
          <div className="input-signal" aria-label="Supported input types">
            <span>Text</span><i /> <span>URL</span><i /> <span>Image / OCR</span><i /> <span>Voice</span>
          </div>
        </div>

        <div className="analysis-preview" aria-label="Preview of the news analysis workspace">
          <div className="analysis-preview__topline"><span className="status-dot" /> Analysis workspace <span className="preview-label">Presentation preview</span></div>
          <div className="analysis-preview__header"><div><p className="section-label">INPUT METHOD</p><h2>Analyze a News Article</h2></div><span className="preview-code">FN / 01</span></div>
          <div className="preview-tabs" aria-hidden="true"><span className="active">Text</span><span>URL</span><span>Image</span><span>Voice</span></div>
          <div className="preview-editor"><span className="preview-editor__line" /><span className="preview-editor__line short" /><span className="preview-editor__placeholder">Paste your news content here...</span><span className="preview-editor__count">0 / 50,000 characters</span></div>
          <div className="preview-footer"><span>Classification uses TF-IDF + Logistic Regression</span><span className="preview-action">Analyze News <b aria-hidden="true">-&gt;</b></span></div>
        </div>
      </section>

      <section className="product-section product-section--plain" id="features">
        <div className="section-intro"><p className="section-label">01 / INPUT METHODS</p><h2>Analyze news<br /><span>your way.</span></h2><p>One working interface for the inputs already supported by the application.</p></div>
        <div className="feature-grid">{features.map(([number, title, text, icon]) => <article className="feature-card" key={title}><div className="feature-card__top"><span>{number}</span><b aria-hidden="true">{icon}</b></div><h3>{title}</h3><p>{text}</p><button type="button" onClick={() => setActiveTab('check')}>Open analyzer <span aria-hidden="true">-&gt;</span></button></article>)}</div>
      </section>

      <section className="combined-method-section" id="methods">
        <div className="combined-method__intro"><p className="section-label">02 / HOW IT WORKS &amp; TECHNOLOGY</p><h2>Built for a<br /><span>clearer review.</span></h2><p>The interface connects the actual project layers, from submitted content through NLP feature extraction to a machine-learning classification. Predictions are model outputs, not factual certainty.</p></div>
        <div className="combined-method__workflow"><p className="section-label">HOW IT WORKS</p><h3>From input to interpretable output.</h3><div className="workflow-grid">{workflow.map(([number, title, text]) => <article className="workflow-step" key={number}><span className="workflow-step__number">{number}</span><div className="workflow-step__rule" /><h4>{title}</h4><p>{text}</p></article>)}</div></div>
        <div className="combined-method__technology"><p className="section-label">TECHNOLOGY</p><h3>Project stack</h3><div className="technology-grid">{technologies.map(([title, value]) => <div key={title}><span>{title}</span><strong>{value}</strong></div>)}</div></div>
      </section>

      <section className="architecture-section" id="architecture">
        <div className="section-intro"><p className="section-label">03 / ARCHITECTURE</p><h2>Follow the<br /><span>signal path.</span></h2></div>
        <div className="architecture-flow" aria-label="Application architecture flow"><div><b>User</b><span>submits content</span></div><i aria-hidden="true">↓</i><div><b>React + Vite</b><span>frontend interface</span></div><i aria-hidden="true">↓</i><div><b>Backend API</b><span>request orchestration</span></div><i aria-hidden="true">↓</i><div><b>ML service</b><span>NLP / TF-IDF / Logistic Regression</span></div><i aria-hidden="true">↓</i><div className="architecture-flow__result"><b>REAL / FAKE</b><span>model classification</span></div></div>
      </section>

      <section className="product-cta"><div><p className="section-label">READY TO REVIEW A STORY?</p><h2>Start with the<br /><span>evidence in front of you.</span></h2></div><button className="btn btn-primary" type="button" onClick={() => setActiveTab('check')}>Open Analyze News <span aria-hidden="true">-&gt;</span></button></section>

      <footer className="product-footer"><div className="product-footer__brand"><span className="brand-mark" aria-hidden="true"><span>F</span><i /></span><div><strong>Fake News</strong><span>Machine-learning-based news classification.</span></div></div><div className="product-footer__links"><button type="button" onClick={() => scrollTo('features')}>Features</button><button type="button" onClick={() => scrollTo('methods')}>How it works &amp; technology</button><button type="button" onClick={() => setActiveTab('about')}>About</button><button type="button" onClick={() => setActiveTab('check')}>Analyze</button></div><p>Predictions are model outputs, not factual certainty.</p></footer>
    </div>
  );
}