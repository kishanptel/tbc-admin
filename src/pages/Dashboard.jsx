import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ShoppingBag, 
  IndianRupee, 
  Clock, 
  LogOut, 
  TrendingUp, 
  UserCheck, 
  Settings,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import instance from '../utils/axios';
import ToastContainer from '../components/ToastContainer';

export default function Dashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  const adminLogoPic = "https://res.cloudinary.com/llzw1dmz/image/upload/v1786053620/theblissco_assets/theblissco_official_logo.jpg";

  const getAvatarUrl = (profilePath) => {
    if (
      !profilePath || 
      profilePath === '/logo.png' || 
      profilePath === '/cacaoncrumb_logo.png' || 
      profilePath.includes('sweet_shop_logo.png') ||
      (!profilePath.startsWith('http://') && !profilePath.startsWith('https://') && !profilePath.startsWith('data:'))
    ) {
      return adminLogoPic;
    }
    return profilePath;
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [usersList, setUsersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedBouquetModal, setSelectedBouquetModal] = useState(null);

  const isCustomBouquet = (item) => {
    if (!item) return false;
    const name = (item.title || item.name || '').toLowerCase();
    return (
      name.includes('custom') || 
      name.includes('diy') || 
      Boolean(item.customDetails && item.customDetails.trim() !== '') || 
      (Array.isArray(item.selectedItems) && item.selectedItems.length > 0) || 
      Boolean(item.wrapping && item.wrapping.trim() !== '') || 
      Boolean(item.ribbon && item.ribbon.trim() !== '')
    );
  };

  // Settings states - current admin update
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Settings states - create new admin account
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Authenticate Admin
  useEffect(() => {
    const savedAdmin = localStorage.getItem('theblissco_admin') || sessionStorage.getItem('theblissco_admin');
    if (!savedAdmin) {
      navigate('/login');
      return;
    }

    const parsed = JSON.parse(savedAdmin);
    setAdmin(parsed);
    setNewEmail(parsed.email);

    const verifySession = async () => {
      try {
        const res = await instance.get('/users/me');
        if (res.data?.success && res.data.Data.isAdmin) {
          setAdmin(res.data.Data);
          if (localStorage.getItem('theblissco_admin')) {
            localStorage.setItem('theblissco_admin', JSON.stringify(res.data.Data));
          } else {
            sessionStorage.setItem('theblissco_admin', JSON.stringify(res.data.Data));
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        if (err.response && [401, 403, 404].includes(err.response.status)) {
          handleLogout();
        }
      }
    };
    verifySession();
  }, [navigate]);

  // Global click handler to dismiss dropdowns
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Fetch metrics data
  const fetchData = async () => {
    const startTime = Date.now();
    try {
      const [usersRes, ordersRes, contactsRes] = await Promise.all([
        instance.get('/users/all'),
        instance.get('/orders/all'),
        instance.get('/contacts/all').catch(() => ({ data: { contacts: [] } }))
      ]);

      const elapsed = Date.now() - startTime;
      const delay = 1200 - elapsed;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (usersRes.data?.success) {
        // Filter out admin users from customers list
        setUsersList((usersRes.data.users || []).filter(u => !u.isAdmin));
      }
      if (ordersRes.data?.success) {
        setOrdersList(ordersRes.data.orders || []);
      }
      if (contactsRes.data?.contacts) {
        setContactsList(contactsRes.data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await instance.delete(`/users/delete/${userId}`);
      if (res.data?.success) {
        fetchData();
        addToast('Customer account removed successfully.', 'success');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      addToast(err.response?.data?.message || err.message || 'Failed to remove user account.', 'error');
    }
  };

  useEffect(() => {
    if (admin) {
      fetchData();
    }
  }, [admin]);

  const handleLogout = async () => {
    localStorage.removeItem('theblissco_admin');
    sessionStorage.removeItem('theblissco_admin');
    navigate('/login');
    try {
      await instance.post('/users/logout');
    } catch (e) {
      // Ignored
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setIsUpdating(true);
    try {
      const res = await instance.put(`/orders/status/${orderId}`, { status: newStatus });
      if (res.data?.success) {
        setOrdersList(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
        addToast(`Order status updated to ${newStatus}`, 'success');
      }
    } catch (err) {
      addToast('Failed to update status: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsMessage('');
    setIsUpdating(true);

    try {
      const res = await instance.put('/users/admin/update', {
        email: newEmail,
        password: newPassword || undefined
      });

      if (res.data?.success) {
        const updatedAdmin = res.data.admin;
        if (localStorage.getItem('theblissco_admin')) {
          localStorage.setItem('theblissco_admin', JSON.stringify(updatedAdmin));
        } else {
          sessionStorage.setItem('theblissco_admin', JSON.stringify(updatedAdmin));
        }
        setAdmin(updatedAdmin);
        setNewPassword('');
        setSettingsMessage('Settings saved successfully! Email and password updated.');
        addToast('Admin credentials updated.', 'success');
      }
    } catch (err) {
      setSettingsError(err.response?.data?.message || err.message || 'Failed to update credentials.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsMessage('');
    setIsUpdating(true);

    try {
      const res = await instance.post('/users/admin/create', {
        name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword
      });

      if (res.data?.success) {
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        setSettingsMessage('New Administrator account created successfully!');
        addToast('New admin account created!', 'success');
      }
    } catch (err) {
      setSettingsError(err.response?.data?.message || err.message || 'Failed to create new admin account.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculations
  const totalUsers = usersList.length;
  const totalOrders = ordersList.length;
  const pendingOrdersCount = ordersList.filter(o => o.status === 'Pending').length;
  
  const totalRevenue = ordersList
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  // Generate chart data (aggregated by date)
  const getChartData = () => {
    const dailyMap = {};
    const chronOrders = [...ordersList].reverse();
    
    chronOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
      
      const sales = order.status !== 'Cancelled' ? (order.totalPrice || 0) : 0;
      
      if (dailyMap[date]) {
        dailyMap[date].sales += sales;
        dailyMap[date].orders += 1;
      } else {
        dailyMap[date] = { date, sales, orders: 1 };
      }
    });

    const dataArray = Object.values(dailyMap);
    if (dataArray.length === 0) {
      return [
        { date: 'No Data', sales: 0, orders: 0 }
      ];
    }
    return dataArray;
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="global-loader-overlay" style={{ background: 'var(--surface)' }}>
        <div className="loader-spinner-wrap">
          <div className="loader-circle-spinner"></div>
          <img src={adminLogoPic} alt="Loading" className="loader-logo-pulsing" />
        </div>
        <p className="loader-text">Loading dashboard metrics...</p>
      </div>
    );
  }

  // Skeleton Components for Dashboard Sections
  const MetricsSkeleton = () => (
    <div className="metrics-grid">
      {[1, 2, 3, 4].map(num => (
        <div className="metric-card" style={{ opacity: 0.75 }} key={num}>
          <div className="metric-icon-wrap skeleton-pulse" style={{ background: 'var(--border-mid)' }}></div>
          <div className="metric-details" style={{ flex: 1 }}>
            <div className="skeleton-pulse" style={{ height: '12px', width: '45%', background: 'var(--border-mid)', borderRadius: 'var(--r-pill)', marginBottom: '8px' }}></div>
            <div className="skeleton-pulse" style={{ height: '24px', width: '70%', background: 'var(--border-mid)', borderRadius: 'var(--r-pill)' }}></div>
          </div>
        </div>
      ))}
    </div>
  );

  const ChartSkeleton = () => (
    <div className="chart-card" style={{ opacity: 0.75 }}>
      <div className="skeleton-pulse" style={{ height: '20px', width: '180px', background: 'var(--border-mid)', borderRadius: 'var(--r-pill)', marginBottom: '24px' }}></div>
      <div className="skeleton-pulse" style={{ height: '250px', width: '100%', background: 'var(--border-mid)', borderRadius: 'var(--r-sm)' }}></div>
    </div>
  );

  const TableSkeleton = () => (
    <div className="table-card" style={{ opacity: 0.75 }}>
      <div className="skeleton-pulse" style={{ height: '20px', width: '150px', background: 'var(--border-mid)', borderRadius: 'var(--r-pill)', marginBottom: '24px' }}></div>
      <table className="admin-table">
        <thead>
          <tr>
            {[1, 2, 3, 4, 5].map(num => (
              <th key={num} style={{ background: 'var(--surface)' }}>
                <div className="skeleton-pulse" style={{ height: '12px', width: '60px', background: 'var(--border-mid)', borderRadius: 'var(--r-pill)' }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map(rowNum => (
            <tr key={rowNum}>
              {[1, 2, 3, 4, 5].map(colNum => (
                <td key={colNum}>
                  <div className="skeleton-pulse" style={{ height: '14px', width: colNum === 1 ? '100px' : '70px', background: 'var(--border)', borderRadius: 'var(--r-pill)' }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={adminLogoPic} alt="TheBlissCo Logo" className="sidebar-logo" />
          <h2 className="sidebar-title">TheBlissCo</h2>
        </div>

        <nav className="sidebar-nav">
          <div 
            onClick={() => setActiveTab('overview')} 
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <TrendingUp size={18} />
            <span>Overview</span>
          </div>

          <div 
            onClick={() => setActiveTab('orders')} 
            className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <ShoppingBag size={18} />
            <span>Incoming Orders</span>
          </div>

          <div 
            onClick={() => setActiveTab('users')} 
            className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Customers</span>
          </div>

          <div 
            onClick={() => setActiveTab('contacts')} 
            className={`sidebar-link ${activeTab === 'contacts' ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>Inquiries</span>
          </div>

          <div 
            onClick={() => setActiveTab('settings')} 
            className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </nav>

        {/* Sidebar Footer with Admin Badge */}
        <div className="sidebar-footer">
          {admin && (
            <div className="admin-badge">
              <img 
                src={getAvatarUrl(admin.profile)} 
                alt={admin.name} 
                className="admin-avatar" 
                onError={(e) => { e.target.onerror = null; e.target.src = adminLogoPic; }}
              />
              <span className="admin-name">{admin.name?.split(' ')[0]}</span>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Dashboard Section */}
      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={adminLogoPic} 
              alt="TheBlissCo Logo" 
              className="top-bar-logo" 
            />
            <div>
              <h1 className="page-title">
                {activeTab === 'overview' && 'Storefront Overview'}
                {activeTab === 'orders' && 'Fresh Incoming Orders'}
                {activeTab === 'users' && 'Registered Customers'}
                {activeTab === 'contacts' && 'Customer Inquiries'}
                {activeTab === 'settings' && 'Admin Settings'}
              </h1>
              <div className="top-bar-date" style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-dim)', marginTop: '2px' }}>
                System Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* User Profile Badge & Logout */}
          <div className="top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {admin && (
              <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <div className="user-avatar-circle" style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)', background: 'var(--surface)' }}>
                  <img 
                    src={getAvatarUrl(admin.profile)} 
                    alt={admin.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src = adminLogoPic; }}
                  />
                </div>
                <span className="user-display-name" style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--navy)' }}>
                  {admin.name?.split(' ')[0]}
                </span>
              </div>
            )}
            
            <button 
              onClick={handleLogout} 
              className="btn btn-secondary btn-sm" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px 12px 9px', 
                width: 'auto', 
                cursor: 'pointer',
                background: 'var(--white)',
                border: '1px solid var(--border-mid)',
                borderBottom: '4px solid var(--border-mid)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--navy)'
              }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <div className="content-body">
          {loading ? (
            <>
              {activeTab === 'overview' && (
                <>
                  <MetricsSkeleton />
                  <ChartSkeleton />
                </>
              )}
              {(activeTab === 'overview' || activeTab === 'orders' || activeTab === 'users') && (
                <TableSkeleton />
              )}
            </>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  {/* Metrics Grid */}
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-icon-wrap">
                        <Users size={22} />
                      </div>
                      <div className="metric-details">
                        <span className="metric-label">Total Users</span>
                        <span className="metric-value">{totalUsers}</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon-wrap">
                        <ShoppingBag size={22} />
                      </div>
                      <div className="metric-details">
                        <span className="metric-label">Total Orders</span>
                        <span className="metric-value">{totalOrders}</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon-wrap">
                        <IndianRupee size={22} />
                      </div>
                      <div className="metric-details">
                        <span className="metric-label">Total Sales</span>
                        <span className="metric-value">₹{totalRevenue}</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-icon-wrap">
                        <Clock size={22} />
                      </div>
                      <div className="metric-details">
                        <span className="metric-label">Pending</span>
                        <span className="metric-value">{pendingOrdersCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Recharts Chart */}
                  <div className="chart-card">
                    <h3 className="chart-title">Revenue & Order Trends</h3>
                    <div style={{ width: '100%', height: 300, position: 'relative', minWidth: 0 }}>
                      <ResponsiveContainer>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#be4b76" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#be4b76" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-mid)" />
                          <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                          <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'var(--white)', 
                              border: '1px solid var(--border-mid)', 
                              borderRadius: 'var(--r-sm)',
                              fontFamily: 'Outfit',
                              fontSize: '0.85rem'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#be4b76" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorSales)" 
                            name="Sales (₹)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {/* Orders Tab - Order History Cards View (Matching Frontend User Profile Orders) */}
              {(activeTab === 'overview' || activeTab === 'orders') && (
                <div className="table-card" style={{ padding: '24px' }}>
                  <div className="table-header-row" style={{ marginBottom: '24px' }}>
                    <h3 className="table-title">Fresh Incoming Orders</h3>
                  </div>
                  {ordersList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontWeight: '600' }}>
                      No orders placed yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '20px', width: '100%' }}>
                      {ordersList.map((order, idx) => (
                        <div 
                          key={order._id || idx} 
                          style={{
                            background: '#fdf5f8',
                            border: '1px solid #f5e6ec',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {/* Order Header Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #f5e6ec', paddingBottom: '16px', marginBottom: '18px' }}>
                            
                            {/* Left Side: Order Index Circle, Order ID, Date & Customer Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ 
                                width: '34px', 
                                height: '34px', 
                                borderRadius: '50%', 
                                background: '#7c2d4e', 
                                color: '#ffffff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 800, 
                                fontSize: '0.85rem',
                                flexShrink: 0 
                              }}>
                                #{idx + 1}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#7c2d4e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                  ORDER #{order._id ? order._id.slice(-8).toUpperCase() : 'REC-' + idx}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#78716c', fontWeight: 600 }}>
                                  <span>{new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  <span>•</span>
                                  <span>{order.userName} ({order.userEmail})</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Status Actions Dropdown & Total Price Tag */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              {/* Actions Dropdown */}
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === order._id ? null : order._id);
                                  }}
                                  className={`status-select-btn status-badge ${order.status?.toLowerCase()}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '6px 16px', borderRadius: '50px', fontWeight: 700 }}
                                >
                                  <span>{order.status}</span>
                                  <span style={{ fontSize: '0.65rem', marginLeft: '6px' }}>▼</span>
                                </button>

                                {openDropdownId === order._id && (
                                  <div 
                                    className="status-dropdown-menu"
                                    style={{ 
                                      position: 'absolute', 
                                      right: 0,
                                      top: 'calc(100% + 6px)',
                                      background: 'var(--white)', 
                                      border: '1px solid var(--border-mid)', 
                                      boxShadow: 'var(--shadow-lg)', 
                                      borderRadius: 'var(--r-sm)', 
                                      zIndex: 100, 
                                      minWidth: '130px',
                                      width: 'max-content',
                                      overflow: 'hidden',
                                      animation: 'fadeInOverlay 0.15s ease-out'
                                    }}
                                  >
                                    {['Pending', 'Completed', 'Delivered', 'Cancelled'].map((statusOption) => (
                                      <div 
                                        key={statusOption}
                                        onClick={() => {
                                          handleStatusChange(order._id, statusOption);
                                          setOpenDropdownId(null);
                                        }}
                                        className="status-dropdown-item"
                                      >
                                        <span className={`status-badge-dot ${statusOption.toLowerCase()}`}></span>
                                        {statusOption}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Total Amount Tag */}
                              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#7c2d4e' }}>
                                ₹{Number(order.totalPrice || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                          </div>

                          {/* Items List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(order.items || []).map((item, i) => {
                              const title = item.title || item.name || 'Bouquet Item';
                              const qty = item.quantity || item.qty || 1;
                              const price = item.price || 0;
                              const isCustom = isCustomBouquet(item);

                              return (
                                <div 
                                  key={i} 
                                  style={{ 
                                    background: '#ffffff', 
                                    border: '1px solid #f5e6ec', 
                                    borderRadius: '12px', 
                                    padding: '14px 16px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      <img 
                                        src={getAvatarUrl(item.img)} 
                                        alt={title} 
                                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-mid)' }} 
                                        onError={(e) => { e.target.onerror = null; e.target.src = adminLogoPic; }}
                                      />
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#3d1d2b' }}>{title}</h4>
                                        <span style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '2px', display: 'block' }}>
                                          Qty: {qty} × ₹{Number(price).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ fontWeight: 800, color: '#7c2d4e', fontSize: '1.05rem' }}>
                                      ₹{(Number(price) * Number(qty)).toLocaleString('en-IN')}
                                    </div>
                                  </div>

                                  {/* Custom Bouquet Specifications Box (Matching User Screenshot) */}
                                  {isCustom && (
                                    <div style={{ background: 'rgba(252, 232, 240, 0.6)', border: '1px solid #f8d3e2', borderRadius: '10px', padding: '12px 16px', marginTop: '12px' }}>
                                      <div style={{ fontWeight: 800, color: '#7c2d4e', fontSize: '0.85rem', marginBottom: '4px' }}>
                                        Custom Bouquet Specifications:
                                      </div>
                                      <div style={{ fontSize: '0.82rem', color: '#3d1d2b', lineHeight: 1.5, fontWeight: 600 }}>
                                        {item.customDetails ? (
                                          item.customDetails
                                        ) : (
                                          <>
                                            {Array.isArray(item.selectedItems) && item.selectedItems.length > 0 && (
                                              <span>Stems: {item.selectedItems.map(st => typeof st === 'object' ? `${st.qty || 1}× ${st.name || st.title}` : st).join(' | ')}</span>
                                            )}
                                            {item.wrapping && <span> | Paper: {item.wrapping}</span>}
                                            {item.ribbon && <span> | Ribbon: {item.ribbon}</span>}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {(activeTab === 'overview' || activeTab === 'users') && (
                <div className="table-card">
                  <div className="table-header-row">
                    <h3 className="table-title">Registered Customers</h3>
                  </div>
                  {usersList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontWeight: '600' }}>
                      No registered users yet.
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer Details</th>
                          <th>Registered Email</th>
                          <th>Registration Date</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map(user => (
                          <tr key={user._id}>
                            <td data-label="Customer">
                              <div className="user-cell">
                                {user.profile ? (
                                  <img 
                                    src={getAvatarUrl(user.profile)} 
                                    alt={user.name} 
                                    className="user-avatar-table" 
                                    style={{ border: '2px solid var(--gold)', boxShadow: 'var(--shadow-sm)' }} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = adminLogoPic; }}
                                  />
                                ) : (
                                  <div className="user-avatar-table-fallback" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c2d4e, #be4b76)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', border: '2px solid var(--gold)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                                    {user.name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                                  </div>
                                )}
                                <span className="user-name-table">{user.name}</span>
                              </div>
                            </td>
                            <td data-label="Email" style={{ fontWeight: '500' }}>{user.email}</td>
                            <td data-label="Registered" style={{ color: 'var(--text-dim)' }}>
                              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td data-label="Status" style={{ textAlign: 'center' }}>
                              <span className="status-badge completed" style={{ background: 'rgba(22, 163, 74, 0.08)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center' }}>
                                <UserCheck size={12} style={{ marginRight: '4px' }} />
                                <span>Active</span>
                              </span>
                            </td>
                            <td data-label="Actions" style={{ textAlign: 'center' }}>
                              <button 
                                onClick={() => setUserToDelete(user._id)} 
                                className="btn btn-secondary btn-sm" 
                                style={{ display: 'inline-flex', padding: '6px 12px', width: 'auto', alignItems: 'center', gap: '6px' }}
                              >
                                <Trash2 size={13} style={{ verticalAlign: 'middle' }} />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Contacts/Inquiries Tab */}
              {activeTab === 'contacts' && (
                <div className="table-card">
                  <div className="table-header-row">
                    <h3 className="table-title">Customer Inquiries</h3>
                  </div>
                  {contactsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', fontWeight: '600' }}>
                      No inquiries received yet.
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Subject</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactsList.map(contact => (
                          <tr key={contact._id}>
                            <td data-label="Date" style={{ color: 'var(--text-dim)' }}>
                              {new Date(contact.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td data-label="Name" style={{ fontWeight: '700', color: 'var(--navy)' }}>{contact.name}</td>
                            <td data-label="Email" style={{ fontWeight: '500' }}>{contact.email}</td>
                            <td data-label="Subject" style={{ fontWeight: '700', color: 'var(--navy)' }}>{contact.subject || '—'}</td>
                            <td data-label="Message" style={{ maxWidth: '300px', whiteSpace: 'normal', lineHeight: 1.5 }}>{contact.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {settingsMessage && (
                    <div style={{ color: 'var(--success)', background: 'rgba(22, 163, 74, 0.08)', padding: '12px', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', fontWeight: '600', border: '1px solid rgba(22, 163, 74, 0.2)', textAlign: 'center' }}>
                      {settingsMessage}
                    </div>
                  )}
                  {settingsError && (
                    <div style={{ color: 'var(--danger)', background: 'rgba(220, 38, 38, 0.08)', padding: '12px', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', fontWeight: '600', border: '1px solid rgba(220, 38, 38, 0.2)', textAlign: 'center' }}>
                      {settingsError}
                    </div>
                  )}

                  <div className="settings-grid">
                    {/* Admin Profile Settings */}
                    <div className="table-card" style={{ margin: 0 }}>
                      <div className="table-header-row" style={{ marginBottom: '24px' }}>
                        <h3 className="table-title">Update My Credentials</h3>
                      </div>
                      <form onSubmit={handleSettingsSubmit} className="enquiry-form">
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="form-label">Current Admin Email *</label>
                          <input 
                            type="email" 
                            className="form-input" 
                            style={{ paddingLeft: '16px' }}
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)} 
                            required 
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '28px' }}>
                          <label className="form-label">New Password (leave empty to keep current) *</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            style={{ paddingLeft: '16px' }}
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder="Enter new password"
                          />
                        </div>

                        <button type="submit" className="btn btn-primary">
                          <span>Save Changes</span>
                        </button>
                      </form>
                    </div>

                    {/* Add New Admin */}
                    <div className="table-card" style={{ margin: 0 }}>
                      <div className="table-header-row" style={{ marginBottom: '24px' }}>
                        <h3 className="table-title">Add New Admin Account</h3>
                      </div>
                      <form onSubmit={handleCreateAdminSubmit} className="enquiry-form">
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="form-label">Name *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ paddingLeft: '16px' }}
                            placeholder="e.g. Shruti Patel"
                            value={newAdminName} 
                            onChange={(e) => setNewAdminName(e.target.value)} 
                            required 
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="form-label">Email Address *</label>
                          <input 
                            type="email" 
                            className="form-input" 
                            style={{ paddingLeft: '16px' }}
                            placeholder="e.g. admin@theblissco.in"
                            value={newAdminEmail} 
                            onChange={(e) => setNewAdminEmail(e.target.value)} 
                            required 
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '28px' }}>
                          <label className="form-label">Password *</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            style={{ paddingLeft: '16px' }}
                            placeholder="••••••••"
                            value={newAdminPassword} 
                            onChange={(e) => setNewAdminPassword(e.target.value)} 
                            required
                          />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ background: 'var(--navy)', borderColor: 'var(--navy)' }}>
                          <span>Create Admin</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Global Glassmorphic Loader Overlay */}
      {isUpdating && (
        <div className="global-loader-overlay">
          <div className="loader-spinner-wrap">
            <div className="loader-circle-spinner"></div>
            <img src={adminLogoPic} alt="Saving" className="loader-logo-pulsing" />
          </div>
          <p className="loader-text">Saving changes...</p>
        </div>
      )}

      {/* Custom Delete Account Confirmation Modal */}
      {userToDelete && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Remove Customer Account?</h3>
            <p className="modal-desc">
              Are you sure you want to permanently remove this customer's account? This action cannot be undone.
            </p>
            <div className="modal-buttons">
              <button 
                onClick={() => setUserToDelete(null)} 
                className="btn btn-secondary btn-sm"
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const targetId = userToDelete;
                  setUserToDelete(null);
                  setIsUpdating(true);
                  await handleDeleteUser(targetId);
                  setIsUpdating(false);
                }} 
                className="btn btn-primary btn-sm"
                style={{ minWidth: '100px', background: 'var(--navy)', borderColor: 'var(--navy)' }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Bouquet Details Specification Modal */}
      {selectedBouquetModal && (
        <div className="modal-overlay" onClick={() => setSelectedBouquetModal(null)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', textAlign: 'left', padding: '28px', borderBottom: '6px solid var(--accent)' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-mid)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Custom Bouquet Specification
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--navy)', margin: '2px 0 0' }}>
                  {selectedBouquetModal.item.title || selectedBouquetModal.item.name || 'Custom Bouquet'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBouquetModal(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Customer Info Box */}
            <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--r-sm)', marginBottom: '18px', fontSize: '0.84rem' }}>
              <div><strong style={{ color: 'var(--navy)' }}>Customer:</strong> {selectedBouquetModal.order.userName} ({selectedBouquetModal.order.userEmail})</div>
              <div style={{ marginTop: '4px' }}><strong style={{ color: 'var(--navy)' }}>Order Date:</strong> {new Date(selectedBouquetModal.order.createdAt).toLocaleString('en-IN')}</div>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: 'var(--navy)' }}>Status:</strong> 
                <span className={`status-badge ${selectedBouquetModal.order.status?.toLowerCase()}`}>{selectedBouquetModal.order.status}</span>
              </div>
            </div>

            {/* Bouquet Specification Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              
              {/* Selected Flowers & Items */}
              {Array.isArray(selectedBouquetModal.item.selectedItems) && selectedBouquetModal.item.selectedItems.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '6px' }}>
                    Selected Flowers &amp; Items:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#fff', border: '1px solid var(--border-mid)', borderRadius: '8px', padding: '10px 14px' }}>
                    {selectedBouquetModal.item.selectedItems.map((st, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>• {typeof st === 'object' ? (st.name || st.title) : st}</span>
                        {typeof st === 'object' && st.qty && <span style={{ fontWeight: 800, color: 'var(--accent)', background: 'rgba(190, 75, 118, 0.08)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>× {st.qty}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wrapping Paper */}
              {selectedBouquetModal.item.wrapping && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>
                    Wrapping Paper:
                  </h4>
                  <div style={{ background: '#fff', border: '1px solid var(--border-mid)', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, color: 'var(--navy)' }}>
                    {selectedBouquetModal.item.wrapping}
                  </div>
                </div>
              )}

              {/* Ribbon Style */}
              {selectedBouquetModal.item.ribbon && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>
                    Ribbon Style:
                  </h4>
                  <div style={{ background: '#fff', border: '1px solid var(--border-mid)', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, color: 'var(--navy)' }}>
                    {selectedBouquetModal.item.ribbon}
                  </div>
                </div>
              )}

              {/* Custom Details / Notes */}
              {selectedBouquetModal.item.customDetails && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '4px' }}>
                    Special Custom Notes:
                  </h4>
                  <div style={{ background: '#fff', border: '1px solid var(--border-mid)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text)', lineHeight: 1.5, fontSize: '0.83rem' }}>
                    {selectedBouquetModal.item.customDetails}
                  </div>
                </div>
              )}

              {/* Price & Quantity Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '12px 16px', borderRadius: '8px', marginTop: '4px' }}>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>Bouquet Price:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent)' }}>
                  ₹{(selectedBouquetModal.item.price || selectedBouquetModal.order.totalPrice || 0) * (selectedBouquetModal.item.quantity || selectedBouquetModal.item.qty || 1)}
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div style={{ marginTop: '22px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedBouquetModal(null)}
                className="btn btn-secondary btn-sm"
                style={{ width: 'auto', padding: '8px 20px' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
