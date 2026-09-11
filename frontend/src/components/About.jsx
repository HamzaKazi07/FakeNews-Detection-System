import React from 'react';

export default function About() {
  return (
    <article className="about-page">
      <header className="about-page__hero"><p className="section-label">FAKE NEWS / PROJECT OVERVIEW</p><h1>A machine-learning system for examining news signals.</h1><p>This system performs machine-learning-based classification of submitted news content. It is designed as an analysis aid, not a guaranteed fact-checking service.</p></header>
      <div className="about-grid">
        <section className="about-block"><p className="section-label">01 / PROBLEM</p><h2>Context matters.</h2><p>Misleading headlines and unsupported claims move quickly across text, links, screenshots, and speech. The application gives users one place to submit those formats and inspect a consistent model output.</p></section>
        <section className="about-block"><p className="section-label">02 / APPROACH</p><h2>Signals, not certainty.</h2><p>Text is preprocessed, represented with TF-IDF features, and evaluated by Logistic Regression. The returned confidence describes the model&apos;s classification confidence; it is not the probability that an article is factually true.</p></section>
        <section className="about-block about-block--wide"><p className="section-label">03 / TECHNOLOGY STACK</p><div className="about-stack"><span>React + Vite <b>Frontend</b></span><span>Flask <b>Backend API</b></span><span>Python + scikit-learn <b>ML service</b></span><span>TF-IDF <b>NLP features</b></span><span>Logistic Regression <b>Classifier</b></span><span>OCR + speech recognition <b>Input support</b></span></div></section>
        <section className="about-block about-block--wide"><p className="section-label">04 / LIMITATIONS</p><h2>Review the source yourself.</h2><p>Predictions can reflect patterns in the training data and may be wrong on unfamiliar topics, satire, breaking news, or biased source material. Check primary sources, supporting evidence, and trusted reporting before making decisions.</p></section>
      </div>
    </article>
  );
}
