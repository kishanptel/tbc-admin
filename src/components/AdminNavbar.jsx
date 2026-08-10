import React from 'react';
import { ShieldCheck, LogOut, RefreshCw, Activity } from 'lucide-react';

export default function AdminNavbar({ adminUser, onLogout, onRefresh, isRefreshing }) {
  return (
    <header className="admin-navbar">
      <div className="container">
        <div className="admin-nav-content">
          
          <div className="admin-brand">
            <img src="/logo.png" alt="theblissco" onError={(e) => { e.target.style.display = 'none'; }} />
            <span>theblissco <span style={{ color: 'var(--primary)', fontWeight: 900 }}>ADMIN</span></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            
            {/* Live Backend Connection Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e6f4ea',
              color: '#137333',
              padding: '6px 12px',
              borderRadius: '50px',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              <Activity size={14} />
              <span>API Live</span>
            </div>

            {/* Refresh Data Button */}
            {onRefresh && (
              <button 
                onClick={onRefresh} 
                className="btn btn-secondary" 
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                disabled={isRefreshing}
                title="Refresh Store Analytics"
              >
                <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
                {isRefreshing ? 'Syncing...' : 'Sync Data'}
              </button>
            )}

            {/* Current Admin Badge */}
            {adminUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(139, 68, 83, 0.08)',
                padding: '6px 14px',
                borderRadius: '50px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--primary-dark)'
              }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <span>{adminUser.name || 'Admin'}</span>
              </div>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="btn"
                style={{ background: '#fce8e6', color: '#c62828', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800 }}
                title="Log out of Admin Studio"
              >
                <LogOut size={14} />
                Logout
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
