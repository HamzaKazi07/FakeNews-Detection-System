import PredictionBadge from './PredictionBadge';
import ConfidenceIndicator from './ConfidenceIndicator';
import ImportantTerms from './ImportantTerms';

export default function ResultCard({ result, feedback, onFeedback }) {
  if (!result) return <section className="analysis-empty-state"><span>Ready when you are</span><h3>Choose an input method to begin</h3><p>Paste text, analyze an article URL, upload an image, or use voice input. Results are saved to your private history after analysis.</p></section>;
  return <article className="analysis-result-card">
    <p className="section-label">Analysis result</p>
    <div className="analysis-result-card__verdict"><PredictionBadge prediction={result.prediction} /><h3>{result.prediction?.toUpperCase() === 'REAL' ? 'Likely Real' : 'Likely Fake'}</h3></div>
    <ConfidenceIndicator confidence={result.confidence} />
    <dl className="model-details"><div><dt>Model</dt><dd>TF-IDF + Logistic Regression</dd></div><div><dt>Model version</dt><dd>{result.modelVersion || result.model_version || 'Not provided'}</dd></div><div><dt>Task</dt><dd>Binary text classification</dd></div></dl>
    <ImportantTerms terms={result.importantWords || result.important_words} />
    {onFeedback && <section className="result-feedback"><h4>Was this classification helpful?</h4><div><button type="button" className={`feedback-choice ${feedback === 'yes' ? 'is-selected' : ''}`} onClick={() => onFeedback('yes')}>Yes</button><button type="button" className={`feedback-choice ${feedback === 'no' ? 'is-selected' : ''}`} onClick={() => onFeedback('no')}>No</button></div>{feedback && <p>Your feedback has been recorded.</p>}</section>}
    <p className="ai-disclaimer">Fake News provides AI-assisted classification and does not independently verify factual claims.</p>
  </article>;
}
