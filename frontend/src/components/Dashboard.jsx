import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatConfidence = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : 'Not available';
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const [statsResponse, historyResponse] = await Promise.all([
          apiClient.get('/api/dashboard/stats'),
          apiClient.get('/api/history')
        ]);
        setStats(statsResponse.data);
        setHistory(historyResponse.data.history || []);
      } catch (requestError) {
        console.error('Dashboard error:', requestError);
        setError('We could not load your dashboard right now. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <div className="workspace-loading" role="status"><span className="workspace-loading__spinner" /><strong>Loading your overview</strong><span>Retrieving your classification history.</span></div>;

  if (error) return <section className="workspace-state workspace-state--error" role="alert"><p className="section-label">DASHBOARD</p><h1>We could not load your dashboard.</h1><p>{error}</p></section>;

  const total = Number(stats?.total_predictions || 0);
  const real = Number(stats?.real_count || 0);
  const fake = Number(stats?.fake_count || 0);
  const feedbackCorrect = Number(stats?.feedback_correct || 0);
  const feedbackIncorrect = Number(stats?.feedback_incorrect || 0);
  const rated = feedbackCorrect + feedbackIncorrect;
  const confidenceValues = history.map((item) => Number(item.confidence)).filter(Number.isFinite);
  const averageConfidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : null;
  const highestConfidence = confidenceValues.length ? Math.max(...confidenceValues) : null;
  const lowestConfidence = confidenceValues.length ? Math.min(...confidenceValues) : null;
  const recent = history.slice(0, 5);
  const dailyStats = Array.isArray(stats?.daily_stats) ? stats.daily_stats : [];
  const dailyMap = new Map(dailyStats.map((item) => [item.day, Number(item.count || 0)]));
  const today = new Date();
  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { label: date.toLocaleDateString(undefined, { weekday: 'short' }), count: dailyMap.get(key) || 0 };
  });
  const maxActivity = Math.max(...activityDays.map((day) => day.count), 1);

  return (
    <div className="workspace-page dashboard-page">
      <header className="workspace-page__header"><div><p className="section-label">PERSONAL DASHBOARD</p><h1>Your analysis overview</h1><p>Track your news classifications, confidence signals, and feedback over time.</p></div><button className="btn btn-primary" type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-analyze'))}>Analyze News <span aria-hidden="true">-&gt;</span></button></header>

      <div className="dashboard-metrics">
        <article className="dashboard-metric"><span>Total analyses</span><strong>{total}</strong><small>All completed classifications</small></article>
        <article className="dashboard-metric dashboard-metric--fake"><span>Fake model classifications</span><strong>{fake}</strong><small>Model output labelled FAKE</small></article>
        <article className="dashboard-metric dashboard-metric--real"><span>Real model classifications</span><strong>{real}</strong><small>Model output labelled REAL</small></article>
        <article className="dashboard-metric"><span>Average model confidence</span><strong>{averageConfidence === null ? 'N/A' : formatConfidence(averageConfidence)}</strong><small>Calculated from loaded history</small></article>
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-panel dashboard-distribution"><div className="panel-heading"><div><p className="section-label">CLASSIFICATIONS</p><h2>Prediction distribution</h2></div><span>{total} total</span></div>{total > 0 ? <div className="distribution-wrap"><div className="distribution-donut" style={{ '--real-share': `${(real / total) * 100}%` }}><strong>{total}</strong><span>analyses</span></div><div className="distribution-legend"><span><i className="legend-dot legend-dot--fake" />Fake classifications <b>{fake}</b></span><span><i className="legend-dot legend-dot--real" />Real classifications <b>{real}</b></span></div></div> : <div className="panel-empty">No analyses yet. Your classification distribution will appear here.</div>}</section>
        <section className="dashboard-panel"><div className="panel-heading"><div><p className="section-label">CONFIDENCE</p><h2>Model confidence</h2></div></div><p className="panel-note">Confidence reflects the model&apos;s classification probability, not factual verification.</p><div className="confidence-summary"><div><span>Average</span><strong>{averageConfidence === null ? 'N/A' : formatConfidence(averageConfidence)}</strong></div><div><span>Highest</span><strong>{highestConfidence === null ? 'N/A' : formatConfidence(highestConfidence)}</strong></div><div><span>Lowest</span><strong>{lowestConfidence === null ? 'N/A' : formatConfidence(lowestConfidence)}</strong></div></div></section>
      </div>

      <section className="dashboard-panel dashboard-activity"><div className="panel-heading"><div><p className="section-label">ACTIVITY</p><h2>Recent activity</h2></div><span>Last 7 days</span></div>{total > 0 ? <div className="activity-chart">{activityDays.map((day) => <div className="activity-day" key={day.label}><div className="activity-bar-track"><i style={{ height: `${Math.max((day.count / maxActivity) * 100, day.count ? 12 : 3)}%` }} /></div><strong>{day.count}</strong><span>{day.label}</span></div>)}</div> : <div className="panel-empty">No timestamped analyses are available yet.</div>}</section>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-panel dashboard-recent"><div className="panel-heading"><div><p className="section-label">LATEST</p><h2>Recent analyses</h2></div><button className="text-action" type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-history'))}>View history <span aria-hidden="true">-&gt;</span></button></div>{recent.length ? <div className="recent-list">{recent.map((item) => <div className="recent-item" key={item.id}><div><strong>{String(item.news || 'Untitled analysis').slice(0, 105)}{String(item.news || '').length > 105 ? '...' : ''}</strong><span>{formatDate(item.date)}</span></div><div className={`classification-chip ${item.prediction?.toLowerCase() === 'real' ? 'classification-chip--real' : 'classification-chip--fake'}`}><b>{item.prediction}</b><span>{formatConfidence(item.confidence)}</span></div></div>)}</div> : <div className="panel-empty">Your recent analyses will appear here.</div>}</section>
        <section className="dashboard-panel model-panel"><p className="section-label">MODEL INFORMATION</p><h2>Classification pipeline</h2><dl><div><dt>Preprocessing</dt><dd>NLP normalization</dd></div><div><dt>Features</dt><dd>TF-IDF</dd></div><div><dt>Classifier</dt><dd>Logistic Regression</dd></div><div><dt>Task</dt><dd>Binary classification</dd></div></dl><p className="panel-note">Fake News provides model-based classification signals. It does not independently verify facts.</p></section>
      </div>

      <section className="dashboard-panel feedback-panel"><div><p className="section-label">PREDICTION FEEDBACK</p><h2>Feedback received</h2><p className="panel-note">Feedback is shown as recorded responses and is not presented as model accuracy.</p></div><div className="feedback-summary"><span><b>{feedbackCorrect}</b> Correct</span><span><b>{feedbackIncorrect}</b> Incorrect</span><span><b>{Math.max(total - rated, 0)}</b> Not rated</span></div></section>
    </div>
  );
}