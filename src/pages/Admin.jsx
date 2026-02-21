import React, { useState, useEffect } from 'react';
import { Settings, Users, Ticket, Save, Plus, Trash2, Calendar, Layout, RefreshCw, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { members } from '../data/members';

const Admin = () => {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        title: 'NOBAR JKT48',
        subtitle: 'LIVE STREAMING EXPERIENCE',
        date: '2026-02-28T19:00:00',
        streamUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
    });
    const [selectedLineup, setSelectedLineup] = useState([1, 5, 20]);
    const [tickets, setTickets] = useState(['TRIAL-JKT48']);
    const [publicTickets, setPublicTickets] = useState([]);
    const [newTicket, setNewTicket] = useState('');
    const [newPublicTicket, setNewPublicTicket] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    const [isConnected, setIsConnected] = useState(false);

    // --- Sync with Firebase ---
    useEffect(() => {
        // Monitor Connection Status
        const connectedRef = ref(db, '.info/connected');
        const connectedUnsubscribe = onValue(connectedRef, (snap) => {
            setIsConnected(snap.val() === true);
        });

        const loadingTimeout = setTimeout(() => setLoading(false), 5000);

        // Granular Listeners to avoid root-level "presence" or "chat" triggers resetting the UI
        const settingsRef = ref(db, 'settings');
        const unsubSettings = onValue(settingsRef, (snap) => {
            const data = snap.val();
            if (data) setSettings(prev => ({ ...prev, ...data }));
            setLoading(false);
        });

        const lineupRef = ref(db, 'lineup');
        const unsubLineup = onValue(lineupRef, (snap) => {
            const data = snap.val();
            if (data) setSelectedLineup(Array.isArray(data) ? data : []);
        });

        const ticketsRef = ref(db, 'tickets');
        const unsubTickets = onValue(ticketsRef, (snap) => {
            const data = snap.val();
            if (data) setTickets(Array.isArray(data) ? data : []);
        });

        const publicTicketsRef = ref(db, 'publicTickets');
        const unsubPublic = onValue(publicTicketsRef, (snap) => {
            const data = snap.val();
            if (data) setPublicTickets(Array.isArray(data) ? data : []);
        });

        return () => {
            connectedUnsubscribe();
            unsubSettings();
            unsubLineup();
            unsubTickets();
            unsubPublic();
            clearTimeout(loadingTimeout);
        };
    }, []);

    const handleSave = async () => {
        setSaveStatus('Menyimpan...');
        const saveTimeout = setTimeout(() => {
            setSaveStatus('Gagal: Timeout (Cek Rules/Koneksi)');
        }, 10000);

        try {
            // Updated to granular sets to avoid deleting 'chats', 'presence', or 'sessions' nodes
            await Promise.all([
                set(ref(db, 'settings'), settings),
                set(ref(db, 'lineup'), selectedLineup),
                set(ref(db, 'tickets'), tickets),
                set(ref(db, 'publicTickets'), publicTickets)
            ]);

            clearTimeout(saveTimeout);
            setSaveStatus('Berhasil disimpan ke Cloud!');
        } catch (error) {
            clearTimeout(saveTimeout);
            setSaveStatus('Gagal: ' + error.message);
            console.error("Save Error:", error);
        }
        setTimeout(() => setSaveStatus(''), 5000);
    };

    // --- Lineup Logic ---
    const toggleMember = (id) => {
        if (selectedLineup.includes(id)) {
            setSelectedLineup(selectedLineup.filter(mId => mId !== id));
        } else {
            setSelectedLineup([...selectedLineup, id]);
        }
    };

    // --- Ticket Logic ---
    const addTicket = () => {
        if (newTicket && !tickets.includes(newTicket)) {
            setTickets([...tickets, newTicket]);
            setNewTicket('');
        }
    };

    const removeTicket = (t) => {
        setTickets(tickets.filter(ticket => ticket !== t));
    };

    const addPublicTicket = () => {
        if (newPublicTicket && !publicTickets.includes(newPublicTicket)) {
            setPublicTickets([...publicTickets, newPublicTicket]);
            setNewPublicTicket('');
        }
    };

    const removePublicTicket = (t) => {
        setPublicTickets(publicTickets.filter(ticket => ticket !== t));
    };

    const generateBulkTickets = (count) => {
        const newBatch = [];
        for (let i = 0; i < count; i++) {
            const code = 'JKT48-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            if (!tickets.includes(code) && !newBatch.includes(code)) {
                newBatch.push(code);
            }
        }
        setTickets([...tickets, ...newBatch]);
    };

    const clearChat = async () => {
        if (window.confirm('Hapus semua riwayat chat di database?')) {
            try {
                await remove(ref(db, 'chats'));
                alert('Riwayat chat berhasil dihapus!');
            } catch (error) {
                console.error("Clear chat error:", error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center text-neon-blue">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 bg-dark-bg text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-4xl font-display font-bold text-neon-blue">ADMIN PANEL</h1>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'}`}>
                                {isConnected ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>
                        <p className="text-gray-400 font-mono text-xs mt-1">MANAGEMENT WEB NOBAR JKT48</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {saveStatus && <span className="text-neon-green font-mono text-sm animate-pulse">{saveStatus}</span>}
                        <button
                            onClick={clearChat}
                            className="bg-neon-pink/10 border border-neon-pink/30 text-neon-pink px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neon-pink hover:text-white transition-all text-sm"
                        >
                            <Trash2 size={16} /> HAPUS CHAT
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-neon-blue text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,183,255,0.2)]"
                        >
                            <Save size={18} /> SIMPAN PERUBAHAN
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* --- EVENT SETTINGS --- */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-panel p-6 border-white/5">
                            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-neon-purple">
                                <Layout size={20} /> PENGATURAN EVENT
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 uppercase mb-2">Judul Show</label>
                                        <input
                                            type="text"
                                            value={settings.title}
                                            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 uppercase mb-2">Sub-Judul</label>
                                        <input
                                            type="text"
                                            value={settings.subtitle}
                                            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-mono text-gray-500 uppercase mb-2 flex justify-between">
                                            <span>Waktu Show (Countdown)</span>
                                            <button
                                                onClick={() => setSettings({ ...settings, date: new Date().toISOString() })}
                                                className="text-[10px] text-neon-blue hover:underline uppercase font-bold"
                                            >
                                                Sync Now (Start)
                                            </button>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={settings.date ? settings.date.substring(0, 16) : ''}
                                            onChange={(e) => setSettings({ ...settings, date: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none font-mono"
                                        />
                                        <p className="text-[9px] text-gray-500 mt-1 uppercase">Klik Sync Now untuk memulai show detik ke-0 bagi semua orang.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-mono text-gray-500 uppercase">Streaming URL (YouTube/HLS)</label>
                                            <button
                                                onClick={() => setSettings({ ...settings, streamUrl: '' })}
                                                className="text-[10px] text-neon-pink hover:underline uppercase font-bold"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={settings.streamUrl || ''}
                                            onChange={(e) => setSettings({ ...settings, streamUrl: e.target.value })}
                                            placeholder="Paste link YouTube atau .m3u8..."
                                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none font-mono text-sm"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">Gunakan link YouTube biasa atau link streaming m3u8.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- LINEUP SELECTION --- */}
                        <div className="glass-panel p-6 border-white/5">
                            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-neon-pink">
                                <Users size={20} /> SELEKSI MEMBER (LINEUP)
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => toggleMember(member.id)}
                                        className={`cursor-pointer group relative p-2 rounded-lg border transition-all ${selectedLineup.includes(member.id)
                                            ? 'border-neon-blue bg-neon-blue/10'
                                            : 'border-white/5 bg-black/40 grayscale hover:grayscale-0 hover:border-white/20'
                                            }`}
                                    >
                                        <img src={member.image} alt="" className="w-full aspect-square object-cover rounded mb-2" />
                                        <p className="text-[10px] font-bold truncate text-center">{member.name}</p>
                                        {selectedLineup.includes(member.id) && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-neon-blue rounded-full flex items-center justify-center">
                                                <Plus size={10} className="text-white rotate-45" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                                <p className="text-sm font-mono text-gray-400">Total Member Terpilih: <span className="text-neon-blue font-bold">{selectedLineup.length}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* --- TICKET MANAGEMENT --- */}
                    <div className="space-y-8">
                        {/* --- PUBLIC / SHARED TICKETS --- */}
                        <div className="glass-panel p-6 border-white/5">
                            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-neon-blue">
                                <Users size={20} /> TIKET PUBLIK (NO-KICK)
                            </h2>
                            <p className="text-[10px] text-gray-400 mb-4 uppercase tracking-wider">Tiket ini bisa dipakai 1000+ orang sekaligus tanpa conflict.</p>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newPublicTicket}
                                    onChange={(e) => setNewPublicTicket(e.target.value.toUpperCase())}
                                    placeholder="KODE PUBLIK..."
                                    className="flex-grow bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none font-mono"
                                />
                                <button
                                    onClick={addPublicTicket}
                                    className="bg-neon-blue/20 text-neon-blue p-3 rounded-lg hover:bg-neon-blue hover:text-white transition-all"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {publicTickets.map(ticket => (
                                    <div key={ticket} className="flex items-center justify-between p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-lg group">
                                        <span className="font-mono text-sm tracking-widest text-neon-blue">{ticket}</span>
                                        <button
                                            onClick={() => removePublicTicket(ticket)}
                                            className="text-gray-600 hover:text-neon-pink opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- REGULAR TICKETS --- */}
                        <div className="glass-panel p-6 border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-display font-bold flex items-center gap-2 text-neon-green">
                                    <Ticket size={20} /> TIKET REGULER
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => generateBulkTickets(10)}
                                        className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-md transition-all"
                                    >
                                        +10 AUTO
                                    </button>
                                    <button
                                        onClick={() => generateBulkTickets(50)}
                                        className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-md transition-all"
                                    >
                                        +50 AUTO
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newTicket}
                                    onChange={(e) => setNewTicket(e.target.value.toUpperCase())}
                                    placeholder="KODE BARU..."
                                    className="flex-grow bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-green outline-none font-mono"
                                />
                                <button
                                    onClick={addTicket}
                                    className="bg-neon-green/20 text-neon-green p-3 rounded-lg hover:bg-neon-green hover:text-white transition-all"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {tickets.map(ticket => (
                                    <div key={ticket} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:border-white/20 transition-all">
                                        <span className="font-mono text-sm tracking-widest">{ticket}</span>
                                        <button
                                            onClick={() => removeTicket(ticket)}
                                            className="text-gray-600 hover:text-neon-pink opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    if (window.confirm('Hapus semua tiket reguler?')) setTickets([]);
                                }}
                                className="w-full mt-6 border border-neon-pink/30 text-neon-pink p-3 rounded-lg text-xs font-mono hover:bg-neon-pink hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> RESET SEMUA REGULER
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Admin;
