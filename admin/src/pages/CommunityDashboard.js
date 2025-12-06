import React, { useEffect, useMemo, useState } from 'react';
import { FiTrash2, FiSearch, FiFilter, FiBell, FiMessageSquare, FiHeart, FiEye } from 'react-icons/fi';
import supabase from '../lib/supabase';

const StatBox = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-md p-5 flex items-center justify-between">
    <div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
    <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
  </div>
);

const CommunityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [username, setUsername] = useState('');
  const [range, setRange] = useState('all');
  const [stats, setStats] = useState({ total: 0, replies: 0, likes: 0, today: 0 });
  const [notif, setNotif] = useState([]);

  const filters = useMemo(() => ({ query, username, range }), [query, username, range]);

  const fetchStats = async () => {
    const { count: total } = await supabase.from('community_messages').select('id', { count: 'exact', head: true });
    const { count: replies } = await supabase.from('community_replies').select('id', { count: 'exact', head: true });
    const { count: likes } = await supabase.from('community_likes').select('id', { count: 'exact', head: true });
    const start = new Date(); start.setHours(0,0,0,0);
    const { count: today } = await supabase.from('community_messages').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString());
    setStats({ total: total || 0, replies: replies || 0, likes: likes || 0, today: today || 0 });
  };

  const fetchMessages = async () => {
    setLoading(true);
    let q = supabase.from('community_messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (filters.query) q = q.or(`message.ilike.%${filters.query}%,username.ilike.%${filters.query}%`);
    if (filters.username) q = q.ilike('username', `%${filters.username}%`);
    if (filters.range && filters.range !== 'all') {
      const now = new Date();
      if (filters.range === '24h') now.setDate(now.getDate() - 1);
      else if (filters.range === '7d') now.setDate(now.getDate() - 7);
      else if (filters.range === '30d') now.setDate(now.getDate() - 30);
      q = q.gte('created_at', now.toISOString());
    }
    const { data } = await q;
    setMessages(data || []);
    setLoading(false);
  };

  const deleteMessage = async (id) => {
    try {
      const { error } = await supabase.from('community_messages').delete().eq('id', id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
      setNotif(n => [{ type: 'delete', id, at: Date.now() }, ...n].slice(0, 10));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [filters]);

  useEffect(() => {
    const ch = supabase.channel('admin_community');
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, payload => {
      setMessages(prev => [payload.new, ...prev].slice(0, 200));
      setNotif(n => [{ type: 'new', id: payload.new.id, at: Date.now() }, ...n].slice(0, 10));
      fetchStats();
    });
    ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages' }, payload => {
      setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      setNotif(n => [{ type: 'delete', id: payload.old.id, at: Date.now() }, ...n].slice(0, 10));
      fetchStats();
    });
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_replies' }, () => fetchStats());
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'community_likes' }, () => fetchStats());
    ch.subscribe();
    return () => { try { ch.unsubscribe(); } catch(_) {} };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox title="Total Pesan" value={stats.total} icon={<FiMessageSquare className="text-primary" />} />
        <StatBox title="Total Reply" value={stats.replies} icon={<FiMessageSquare className="text-secondary" />} />
        <StatBox title="Total Likes" value={stats.likes} icon={<FiHeart className="text-pink-500" />} />
        <StatBox title="Pesan Hari Ini" value={stats.today} icon={<FiEye className="text-indigo-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex-1 flex gap-2">
            <div className="input-with-icon flex-1">
              <div className="input-icon"><FiSearch /></div>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari pesan atau username" className="form-input" />
            </div>
            <div className="relative w-44">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={range} onChange={(e)=>setRange(e.target.value)} className="pl-9 pr-3 py-2 border rounded-lg w-full">
                <option value="all">Semua waktu</option>
                <option value="24h">24 jam</option>
                <option value="7d">7 hari</option>
                <option value="30d">30 hari</option>
              </select>
            </div>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Filter username" className="px-3 py-2 border rounded-lg w-44" />
          </div>
          <div className="flex items-center gap-2">
            <FiBell className="text-gray-500" />
            <div className="text-sm text-gray-600">{notif.length} notifikasi</div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pesan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Likes</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Views</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messages.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{m.username}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 min-w-[260px]">{m.message}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{m.like_count || 0}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{m.view_count || 0}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 text-right">
                      <button onClick={()=>deleteMessage(m.id)} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                        <FiTrash2 /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
