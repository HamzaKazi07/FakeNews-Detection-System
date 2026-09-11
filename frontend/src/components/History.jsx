import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import Modal from './ui/Modal';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const confidence = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : 'N/A';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/api/history');
      setHistory(response.data.history || []);
    } catch (requestError) {
      console.error('History error:', requestError);
      setError('We could not load your prediction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const visibleHistory = useMemo(() => history.filter((item) => {
    const matchesQuery = String(item.news || '').toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || item.prediction?.toLowerCase() === filter;
    return matchesQuery && matchesFilter;
  }).sort((first, second) => {
    const firstDate = new Date(first.date).getTime() || 0;
    const secondDate = new Date(second.date).getTime() || 0;
    return sort === 'newest' ? secondDate - firstDate : firstDate - secondDate;
  }), [filter, history, query, sort]);

  if (loading) return <div className="workspace-loading" role="status"><span className="workspace-loading__spinner" /><strong>Loading prediction history</strong><span>Retrieving your saved classifications.</span><div className="history-skeletons"><i /><i /><i /></div></div>;

  return (
    <div className="workspace-page history-page">
      <header className="workspace-page__header"><div><p className="section-label">PERSONAL RECORD</p><h1>Prediction history</h1><p>Review your previous news classifications and model confidence signals.</p></div><button className="btn btn-primary" type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-analyze'))}>Analyze new story <span aria-hidden="true">-&gt;</span></button></header>
      {error ? <section className="workspace-state workspace-state--error" role="alert"><h2>We could not load your prediction history.</h2><button className="btn btn-secondary" type="button" onClick={fetchHistory}>Try again</button></section> : history.length === 0 ? <section className="workspace-state"><p className="section-label">HISTORY</p><h2>No analyses yet</h2><p>Your completed news classifications will appear here.</p><button className="btn btn-primary" type="button" onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-analyze'))}>Analyze your first story</button></section> : <><div className="history-controls"><label><span className="sr-only">Search prediction history</span><input type="search" placeholder="Search submitted content..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter verdict</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All classifications</option><option value="fake">Fake classifications</option><option value="real">Real classifications</option></select></label><label><span className="sr-only">Sort history</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div><div className="history-list">{visibleHistory.length ? visibleHistory.map((item) => <article className="history-item" key={item.id}><div className="history-item__content"><div className={`classification-chip ${item.prediction?.toLowerCase() === 'real' ? 'classification-chip--real' : 'classification-chip--fake'}`}><b>{item.prediction}</b><span>{confidence(item.confidence)} confidence</span></div><p>{item.news}</p><small>Text analysis · {formatDate(item.date)}</small></div><div className="history-item__meta"><span className={`feedback-state feedback-state--${item.feedback || 'none'}`}>{item.feedback === 'yes' ? 'Correct' : item.feedback === 'no' ? 'Incorrect' : 'Not rated'}</span><button className="btn btn-secondary" type="button" onClick={() => setSelected(item)}>View details</button></div></article>) : <div className="workspace-state"><h2>No matching analyses</h2><p>Try a different search or classification filter.</p></div>}</div></>}
      <Modal open={Boolean(selected)} title="Analysis details" onClose={() => setSelected(null)}>{selected && <div className="history-detail"><div className={`classification-chip ${selected.prediction?.toLowerCase() === 'real' ? 'classification-chip--real' : 'classification-chip--fake'}`}><b>{selected.prediction}</b><span>{confidence(selected.confidence)} model confidence</span></div><p className="history-detail__copy">{selected.news}</p><dl><div><dt>Submitted</dt><dd>{formatDate(selected.date)}</dd></div><div><dt>Feedback</dt><dd>{selected.feedback === 'yes' ? 'Correct' : selected.feedback === 'no' ? 'Incorrect' : 'Not rated'}</dd></div></dl><p className="panel-note">This is a model classification, not factual verification.</p></div>}</Modal>
    </div>
  );
}