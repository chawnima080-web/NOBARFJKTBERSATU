import React, { useState, useEffect } from 'react';
import { Settings, Users, Ticket, Save, Plus, Trash2, Calendar, Layout, RefreshCw, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';
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
    const [newTicket, setNewTicket] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    const [isConnected, setIsConnected] = useState(false);

    // --- Sync with Firebase ---
    useEffect(() => {
        // Monitor Connection Status
        const connectedRef = ref(db, '.info/connected');
        const connectedUnsubscribe = onValue(connectedRef, (snap) => {
            setIsConnected(snap.val() === true);
        });

        const loadingTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000); // Stop loading after 5 seconds no matter what

        const dbRef = ref(db, '/');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
                if (data.lineup) setSelectedLineup(Array.isArray(data.lineup) ? data.lineup : []);
                if (data.tickets) setTickets(Array.isArray(data.tickets) ? data.tickets : []);
            }
            setLoading(false);
            clearTimeout(loadingTimeout);
        }, (error) => {
            console.error("Firebase connection error:", error);
            setLoading(false);
            clearTimeout(loadingTimeout);
        });
        return () => {
            unsubscribe();
            connectedUnsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, []);

    const handleSave = async () => {
        setSaveStatus('Menyimpan...');

        // Add a safety timeout for the save operation
        const saveTimeout = setTimeout(() => {
            setSaveStatus('Gagal: Timeout (Cek Rules/Koneksi)');
        }, 10000);

        try {
            await set(ref(db, '/'), {
                settings,
                lineup: selectedLineup,
                tickets
            });
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
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-mono text-gray-500 uppercase mb-2">Streaming URL (HLS/YouTube/Twitch)</label>
                                        <input
                                            type="text"
                                            value={settings.streamUrl || ''}
                                            onChange={(e) => setSettings({ ...settings, streamUrl: e.target.value })}
                                            placeholder="https://..."
                                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-neon-blue outline-none font-mono text-sm"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">Gunakan link .m3u8 (HLS) untuk OBS, atau link YouTube/Twitch.</p>
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
                        <div className="glass-panel p-6 border-white/5 h-full">
                            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-neon-green">
                                <Ticket size={20} /> MANAJEMEN TIKET
                            </h2>

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

                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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
                                onClick={() => setTickets([])}
                                className="w-full mt-6 border border-neon-pink/30 text-neon-pink p-3 rounded-lg text-xs font-mono hover:bg-neon-pink hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> RESET SEMUA TIKET
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Admin;
