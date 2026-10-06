import React, { useState, useEffect, useCallback } from 'react';
import apiClient, { getApiErrorMessage, unwrapApiData } from '../api/client';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users'); // users, logs, stats
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      if (activeTab === 'users') {
        const res = await apiClient.get('/api/admin/users', getAuthHeaders());
        setUsers(unwrapApiData(res).users || []);
      } else if (activeTab === 'logs') {
        const res = await apiClient.get('/api/admin/logs', getAuthHeaders());
        setLogs(unwrapApiData(res).logs || []);
      } else if (activeTab === 'stats') {
        const res = await apiClient.get('/api/admin/stats', getAuthHeaders());
        setStats(unwrapApiData(res));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Access denied. Administrator privileges required.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user: ${name}? All associated scan history will be removed.`)) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await apiClient.delete(`/api/admin/users/${userId}`, getAuthHeaders());
      setSuccessMsg(unwrapApiData(res).message || 'User deleted successfully.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete user.'));
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm(`Are you sure you want to remove this scan history record?`)) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await apiClient.delete(`/api/admin/logs/${logId}`, getAuthHeaders());
      setSuccessMsg(unwrapApiData(res).message || 'Log deleted successfully.');
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete log entry.'));
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card admin-panel">
      <header className="admin-panel__header">
        <div>
          <p className="section-label">SYSTEM MANAGEMENT</p>
          <h1>Administrator dashboard</h1>
          <p>Manage registered users, review prediction records, and monitor system totals.</p>
        </div>
      </header>
      
      <div className="admin-tabs" role="tablist" aria-label="Admin dashboard sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'logs'}
          className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Prediction audit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>🌀</div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Retrieving administrative data...</p>
        </div>
      ) : (
        <div>
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Registered System Users</h3>
              {users.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No standard users registered yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="history-table admin-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td style={{ fontWeight: '600' }}>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              Delete User
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Global Audit Logs</h3>
              {logs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No audits logged in system.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="history-table admin-table admin-table--audit">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Owner</th>
                        <th>News Content Sample</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Feedback</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td>{log.id}</td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{log.userName || 'Guest User'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.userEmail || 'anonymous'}</div>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.news}
                          </td>
                          <td>
                            <span className={`badge-status ${log.prediction.toLowerCase() === 'real' ? 'real' : 'fake'}`}>
                              {log.prediction}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700' }}>
                            {Math.round(log.confidence * 100)}%
                          </td>
                          <td>
                            {log.feedback ? (
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                background: log.feedback === 'yes' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: log.feedback === 'yes' ? 'var(--success)' : 'var(--danger)',
                                fontWeight: '700'
                              }}>
                                {log.feedback === 'yes' ? 'Correct 👍' : 'Incorrect 👎'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(log.createdAt)}
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => handleDeleteLog(log.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && stats && (
            <div className="admin-stat-grid">
              <div className="chart-card admin-stat-card admin-stat-card--wide">
                <h4 style={{ marginBottom: '1rem' }}>Feedback Reliability Metrics</h4>
                <div style={{ display: 'flex', gap: '3rem', margin: '1rem 0' }}>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--success)' }}>{stats.feedback_correct}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Deemed Correct</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--danger)' }}>{stats.feedback_incorrect}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Deemed Incorrect</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      {(stats.feedback_correct || stats.feedback_incorrect) 
                        ? ((stats.feedback_correct / (stats.feedback_correct + stats.feedback_incorrect)) * 100).toFixed(1) + '%'
                        : 'N/A'
                      }
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Positive feedback share</div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card admin-stat-card">
                <h4 style={{ marginBottom: '0.5rem' }}>Database Volumes</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Registered Accounts:</span> <strong>{stats.total_users}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Saved Prediction Items:</span> <strong>{stats.total_predictions}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Credible Verdict Records:</span> <strong style={{ color: 'var(--success)' }}>{stats.real_count}</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sensational Verdict Records:</span> <strong style={{ color: 'var(--danger)' }}>{stats.fake_count}</strong>
                  </li>
                </ul>
              </div>

              <div className="chart-card admin-stat-card">
                <h4 style={{ marginBottom: '0.5rem' }}>System Integrity</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '1rem' }}>
                  Administrative access is restricted to authenticated users with the ADMIN role.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
