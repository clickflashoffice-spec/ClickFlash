import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
    TrendingUp, Users, ShoppingCart, Globe, Calendar, Filter, 
    ChevronDown, Download, RefreshCw, Award, Monitor, PieChart as PieIcon
} from 'lucide-react';
import './DailyIntelligence.css';

const API_BASE = '/api/analytics';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

export const DailyIntelligencePage: React.FC = () => {
    const [dateRange, setDateRange] = useState({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [selectedDeskId, setSelectedDeskId] = useState<string>('Global');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['dailyIntelligence', dateRange, selectedDeskId],
        queryFn: async () => {
            const params = new URLSearchParams({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                ...(selectedDeskId !== 'Global' && { deskId: selectedDeskId })
            });
            const res = await fetch(`${API_BASE}/daily-intelligence?${params}`);
            if (!res.ok) throw new Error('Failed to fetch intelligence data');
            return res.json();
        }
    });

    const { data: desks } = useQuery({
        queryKey: ['desks-list'],
        queryFn: async () => {
            const res = await fetch('/api/collections?table=desks');
            if (!res.ok) return [];
            return res.json();
        }
    });

    const stats = useMemo(() => {
        if (!data) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalSessions: 0 };
        
        const totalRevenue = data.trends.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0);
        const totalOrders = data.trends.reduce((acc: number, curr: any) => acc + (curr.orders || 0), 0);
        const totalSessions = data.stations.reduce((acc: number, curr: any) => acc + (curr.total_sessions || 0), 0);
        
        return {
            totalRevenue,
            totalOrders,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            totalSessions
        };
    }, [data]);

    if (isLoading) {
        return (
            <div className="intelligence-loading">
                <RefreshCw className="animate-spin text-indigo-500" size={48} />
                <p>Aggregating global intelligence...</p>
            </div>
        );
    }

    return (
        <div className="intelligence-container">
            {/* Header section with controls */}
            <header className="intelligence-header">
                <div className="header-titles">
                    <h1>Daily Intelligence</h1>
                    <p>Real-time performance metrics across the ClickFlash ecosystem</p>
                </div>
                
                <div className="header-controls">
                    <div className="control-group">
                        <label><Filter size={14} /> Master Station</label>
                        <select 
                            value={selectedDeskId} 
                            onChange={(e) => setSelectedDeskId(e.target.value)}
                        >
                            <option value="Global">All Master Stations (Global)</option>
                            {desks?.map((desk: any) => (
                                <option key={desk.id} value={desk.id}>{desk.name || desk.id}</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-group">
                        <label><Calendar size={14} /> Date Range</label>
                        <div className="date-inputs">
                            <input 
                                type="date" 
                                value={dateRange.startDate} 
                                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                            />
                            <span>to</span>
                            <input 
                                type="date" 
                                value={dateRange.endDate} 
                                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <section className="intelligence-kpi-grid">
                <div className="kpi-card premium-shadow">
                    <div className="kpi-icon bg-indigo-500/10 text-indigo-400">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Revenue</span>
                        <h3 className="kpi-value">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="kpi-card premium-shadow">
                    <div className="kpi-icon bg-pink-500/10 text-pink-400">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Orders</span>
                        <h3 className="kpi-value">{stats.totalOrders.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="kpi-card premium-shadow">
                    <div className="kpi-icon bg-amber-500/10 text-amber-400">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Viewing Sessions</span>
                        <h3 className="kpi-value">{stats.totalSessions.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="kpi-card premium-shadow">
                    <div className="kpi-icon bg-emerald-500/10 text-emerald-400">
                        <Globe size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Avg. Order Value</span>
                        <h3 className="kpi-value">${stats.avgOrderValue.toFixed(2)}</h3>
                    </div>
                </div>
            </section>

            <div className="intelligence-main-grid">
                {/* Revenue Trend Chart */}
                <div className="chart-container large premium-shadow">
                    <div className="chart-header">
                        <h3><TrendingUp size={18} /> Revenue Trend</h3>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={data?.trends}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Product Breakdown */}
                <div className="chart-container small premium-shadow">
                    <div className="chart-header">
                        <h3><PieIcon size={18} /> Product Mix</h3>
                    </div>
                    <div className="chart-body centered">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data?.productBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {data?.productBreakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-legend">
                            {data?.productBreakdown.slice(0, 4).map((entry: any, index: number) => (
                                <div key={entry.name} className="legend-item">
                                    <span className="dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span className="name">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Station Performance Matrix */}
                <div className="chart-container medium premium-shadow">
                    <div className="chart-header">
                        <h3><Monitor size={18} /> Master Performance Matrix</h3>
                    </div>
                    <div className="chart-body table-responsive">
                        <table className="intel-table">
                            <thead>
                                <tr>
                                    <th>Station ID</th>
                                    <th>Sessions</th>
                                    <th>Revenue</th>
                                    <th>Prints</th>
                                    <th>Sync Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.stations.map((station: any) => (
                                    <tr key={station.desk_id}>
                                        <td className="font-medium">{station.desk_id}</td>
                                        <td>{station.total_sessions}</td>
                                        <td className="text-emerald-600 font-bold">${station.total_revenue.toLocaleString()}</td>
                                        <td>{station.total_prints}</td>
                                        <td>
                                            <span className={`status-pill ${station.pending_sync > 0 ? 'warning' : 'success'}`}>
                                                {station.pending_sync > 0 ? `${station.pending_sync} Pending` : 'Synced'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Photographer Leaderboard */}
                <div className="chart-container medium premium-shadow">
                    <div className="chart-header">
                        <h3><Award size={18} /> Photographer Leaderboard</h3>
                    </div>
                    <div className="chart-body">
                        <div className="leaderboard-list">
                            {data?.photographers.slice(0, 5).map((p: any, idx: number) => (
                                <div key={p.photographer_id} className="leaderboard-item">
                                    <div className="rank">{idx + 1}</div>
                                    <img src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.name}`} alt="" className="avatar" />
                                    <div className="info">
                                        <h4>{p.name}</h4>
                                        <span>{p.total_sales} Sales</span>
                                    </div>
                                    <div className="revenue">
                                        ${p.total_revenue.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyIntelligencePage;

