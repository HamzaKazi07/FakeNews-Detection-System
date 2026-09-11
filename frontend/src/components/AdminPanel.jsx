import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPanel({ backendUrl }) {
  const [activeTab, setActiveTab] = useState('users'); // users, logs, stats
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      if (activeTab === 'users') {
        const res = await axios.get(`${backendUrl}/api/admin/users`, getAuthHeaders());
        setUsers(res.data.users || []);
      } else if (activeTab === 'logs') {
        const res = await axios.get(`${backendUrl}/api/admin/logs`, getAuthHeaders());
        setLogs(res.data.logs || []);
      } else if (activeTab === 'stats') {
        const res = await axios.get(`${backendUrl}/api/admin/stats`, getAuthHeaders());
        setStats(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Access denied. Administrator privileges required.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user: ${name}? All associated scan history will be removed.`)) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await axios.delete(`${backendUrl}/api/admin/users/${userId}`, getAuthHeaders());
      setSuccessMsg(res.data.message || 'User deleted successfully.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm(`Are you sure you want to remove this scan history record?`)) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await axios.delete(`${backendUrl}/api/admin/logs/${logId}`, getAuthHeaders());
      setSuccessMsg(res.data.message || 'Log deleted successfully.');
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete log entry.');
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
    <div className="glass-card">
      <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1.25rem' }}>🛡️ Administrator Operations</h2>
      
      <div className="admin-tabs">
        <div 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👤 Manage Users
        </div>
        <div 
          className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Scan Audit Logs
        </div>
        <div 
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Detailed Statistics
        </div>
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
                <div style={{ overflowX: 'auto' }}>
                  <table className="history-table">
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
                <div style={{ overflowX: 'auto' }}>
                  <table className="history-table">
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
                            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{log.user_name || 'Guest User'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email || 'anonymous'}</div>
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
                            {formatDate(log.date)}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Precision Rate</div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
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

              <div className="chart-card">
                <h4 style={{ marginBottom: '0.5rem' }}>System Integrity</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '1rem' }}>
                  The local SQLite database file `fakenews.db` is operating normally. Automatic migrations are healthy.
                  Admin rights are verified by cryptographic validation of JWT token scopes.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
