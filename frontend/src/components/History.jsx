import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient, { unwrapApiData } from '../api/client';
import Modal from './ui/Modal';

const PAGE_SIZE = 20;

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
};

const confidence = (value) => (
  Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : 'N/A'
);

const navigateToAnalyze = () => {
  window.dispatchEvent(new CustomEvent('navigate-to-analyze'));
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/api/history', {
        params: { page, size: PAGE_SIZE },
      });
      const payload = unwrapApiData(response);
      const responseTotalPages = payload?.totalPages ?? 0;
      if (responseTotalPages > 0 && page >= responseTotalPages) {
        setPage(responseTotalPages - 1);
        return;
      }
      setHistory(payload?.history || []);
      setTotalElements(payload?.totalElements ?? payload?.history?.length ?? 0);
      setTotalPages(responseTotalPages);
    } catch (requestError) {
      console.error('History error:', requestError);
      setError('We could not load your prediction history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const visibleHistory = useMemo(() => history.filter((item) => {
    const matchesQuery = String(item.news || '').toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || item.prediction?.toLowerCase() === filter;
    return matchesQuery && matchesFilter;
  }).sort((first, second) => {
    const firstDate = new Date(first.date).getTime() || 0;
    const secondDate = new Date(second.date).getTime() || 0;
    return sort === 'newest' ? secondDate - firstDate : firstDate - secondDate;
  }), [filter, history, query, sort]);

  const fakeCount = history.filter((item) => item.prediction?.toLowerCase() === 'fake').length;
  const realCount = history.filter((item) => item.prediction?.toLowerCase() === 'real').length;

  return (
    <div className="workspace-page history-page">
      <header className="workspace-page__header history-header">
        <div>
          <p className="section-label">PERSONAL RECORD</p>
          <h1>Prediction History</h1>
          <p>Review your previous news classifications and confidence signals.</p>
        </div>
        {!loading && !error && history.length > 0 && (
          <button className="btn btn-primary" type="button" onClick={navigateToAnalyze}>
            Analyze a story <span aria-hidden="true">-&gt;</span>
          </button>
        )}
      </header>

      {loading ? (
        <section className="history-loading" role="status" aria-label="Loading prediction history">
          <span className="workspace-loading__spinner" />
          <span className="sr-only">Loading your saved classifications</span>
          <div className="history-skeletons">
            <i /><i /><i />
          </div>
        </section>
      ) : error ? (
        <section className="workspace-state workspace-state--error history-empty" role="alert">
          <span className="history-empty__icon" aria-hidden="true">!</span>
          <h2>History is temporarily unavailable</h2>
          <p>{error}</p>
          <button className="btn btn-secondary" type="button" onClick={fetchHistory}>Try again</button>
        </section>
      ) : totalElements === 0 ? (
        <section className="workspace-state history-empty">
          <span className="history-empty__icon" aria-hidden="true">↗</span>
          <p className="section-label">YOUR ARCHIVE</p>
          <h2>No predictions yet</h2>
          <p>Analyze a news article to start building your history.</p>
          <button className="btn btn-primary" type="button" onClick={navigateToAnalyze}>
            Analyze a story <span aria-hidden="true">-&gt;</span>
          </button>
        </section>
      ) : (
        <>
          <section className="history-summary" aria-label="Prediction history summary">
            <article className="history-summary__item">
              <span>Total analyses</span>
              <strong>{totalElements}</strong>
              <small>Saved in your history</small>
            </article>
            <article className="history-summary__item history-summary__item--fake">
              <span>Fake detected</span>
              <strong>{fakeCount}</strong>
              <small>Among loaded records</small>
            </article>
            <article className="history-summary__item history-summary__item--real">
              <span>Real detected</span>
              <strong>{realCount}</strong>
              <small>Among loaded records</small>
            </article>
          </section>

          <section className="history-toolbar" aria-label="Search and filter history">
            <label className="history-toolbar__search">
              <span className="sr-only">Search prediction history</span>
              <span className="history-toolbar__search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search submitted content..."
                value={query}
                onChange={(event) => {
                  setPage(0);
                  setQuery(event.target.value);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Filter classification</span>
              <select value={filter} onChange={(event) => {
                setPage(0);
                setFilter(event.target.value);
              }}>
                <option value="all">All classifications</option>
                <option value="fake">Fake classifications</option>
                <option value="real">Real classifications</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort history</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <p className="history-toolbar__hint">
              Search, classification, and sorting apply to this page.
            </p>
          </section>

          {visibleHistory.length > 0 ? (
            <section className="history-list" aria-label="Prediction history entries">
              {visibleHistory.map((item) => {
                const isReal = item.prediction?.toLowerCase() === 'real';
                const feedbackLabel = item.feedback === 'yes'
                  ? 'Correct'
                  : item.feedback === 'no' ? 'Incorrect' : 'Not rated';

                return (
                  <article className="history-item" key={item.id}>
                    <div className="history-item__body">
                      <div className="history-item__topline">
                        <span className={`history-result ${isReal ? 'history-result--real' : 'history-result--fake'}`}>
                          {item.prediction}
                        </span>
                        <span className="history-confidence">{confidence(item.confidence)} confidence</span>
                      </div>
                      <p className="history-item__date">Text analysis <span aria-hidden="true">·</span> {formatDate(item.date)}</p>
                      <p className="history-item__preview">{item.news}</p>
                    </div>
                    <div className="history-item__footer">
                      <span className={`feedback-state feedback-state--${item.feedback || 'none'}`}>
                        {feedbackLabel}
                      </span>
                      <button className="history-details-link" type="button" onClick={() => setSelected(item)}>
                        View details <span aria-hidden="true">-&gt;</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="workspace-state history-empty history-empty--compact">
              <h2>{history.length === 0 ? 'No analyses on this page' : 'No matching analyses'}</h2>
              <p>
                {history.length === 0
                  ? 'Use the pagination controls to view another page.'
                  : 'Try a different search or classification filter.'}
              </p>
            </section>
          )}
          {totalElements > 0 && (
            <nav className="history-pagination" aria-label="History pagination">
              <button
                className="btn btn-secondary"
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
              >
                Previous
              </button>
              <span aria-live="polite">
                Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={totalPages === 0 || page >= totalPages - 1 || loading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      <Modal open={Boolean(selected)} title="Analysis details" onClose={() => setSelected(null)}>
        {selected && (
          <div className="history-detail">
            <div className={`classification-chip ${selected.prediction?.toLowerCase() === 'real' ? 'classification-chip--real' : 'classification-chip--fake'}`}>
              <b>{selected.prediction}</b>
              <span>{confidence(selected.confidence)} model confidence</span>
            </div>
            <p className="history-detail__copy">{selected.news}</p>
            <dl>
              <div><dt>Submitted</dt><dd>{formatDate(selected.date)}</dd></div>
              <div>
                <dt>Feedback</dt>
                <dd>{selected.feedback === 'yes' ? 'Correct' : selected.feedback === 'no' ? 'Incorrect' : 'Not rated'}</dd>
              </div>
            </dl>
            <p className="panel-note">This is a model classification, not factual verification.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
