import React, { useState, useEffect } from 'react';
import { Send, Users, Play, Maximize, Volume2, Settings, Ticket, Lock, AlertTriangle } from 'lucide-react';
// ReactPlayer removed for native Iframe stability
import { nanoid } from 'nanoid';
import { db } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';

const Streaming = () => {
    const [currentTickets, setCurrentTickets] = useState(['TRIAL-JKT48']);

    useEffect(() => {
        const dbRef = ref(db, '/');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCurrentTickets(Array.isArray(data.tickets) ? data.tickets : []);
                if (data.settings && data.settings.streamUrl) {
                    // Only trigger loading if the URL is actually different
                    setUrl(prev => {
                        if (prev !== data.settings.streamUrl) {
                            setLoading(true);
                            setTimeout(() => setLoading(false), 8000);
                            return data.settings.streamUrl;
                        }
                        return prev;
                    });
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const [ticketInput, setTicketInput] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState('');
    const [activeTicket, setActiveTicket] = useState(() => {
        return localStorage.getItem('active_jkt_ticket') || null;
    });
    const [sessionId] = useState(() => {
        // Persist session ID in the tab's storage so refresh doesn't count as a new device
        let id = sessionStorage.getItem('jkt_session_id');
        if (!id) {
            id = nanoid();
            sessionStorage.setItem('jkt_session_id', id);
        }
        return id;
    });
    const [sessionConflict, setSessionConflict] = useState(false);

    // Check for ticket in URL or LocalStorage on load
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const ticketFromUrl = urlParams.get('ticket');
        const storedTicket = localStorage.getItem('active_jkt_ticket');
        const targetTicket = ticketFromUrl || storedTicket;

        if (targetTicket && currentTickets.includes(targetTicket)) {
            handleAuthorization(targetTicket);
        } else if (isAuthorized) {
            // Revoke access if the ticket is no longer valid or list is empty
            setIsAuthorized(false);
            setActiveTicket(null);
            localStorage.removeItem('active_jkt_ticket');
        }
    }, [currentTickets, isAuthorized]);

    // Global Heartbeat Logic: Prevent Multi-Device via Firebase
    useEffect(() => {
        if (!isAuthorized || !activeTicket || sessionConflict) return;

        const sessionRef = ref(db, `sessions/${activeTicket}`);
        let heartbeatInterval;

        // 1. Listen for changes in ownership
        const unsubscribe = onValue(sessionRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // If someone else took over AND they are still active (within 40s grace)
            if (data.id !== sessionId) {
                const now = Date.now();
                const lastSeen = data.timestamp || 0;

                if (now - lastSeen < 40000) {
                    setSessionConflict(true);
                    setIsAuthorized(false);
                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    return;
                }
            }
        });

        // 2. Setup Periodic Heartbeat
        const updateHeartbeat = () => {
            set(sessionRef, {
                id: sessionId,
                timestamp: Date.now()
            }).catch(e => console.error("Heartbeat update failed:", e));
        };

        // Initial update and start interval
        updateHeartbeat();
        heartbeatInterval = setInterval(updateHeartbeat, 15000);

        // 3. Cleanup
        onDisconnect(sessionRef).remove();

        return () => {
            unsubscribe();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [isAuthorized, activeTicket, sessionId, sessionConflict]);

    const handleAuthorization = (ticket) => {
        setIsAuthorized(true);
        setActiveTicket(ticket);
        setAuthError('');
        setSessionConflict(false);

        // Persist to LocalStorage
        localStorage.setItem('active_jkt_ticket', ticket);

        // Save to URL so refresh doesn't lose access
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?ticket=' + ticket;
        window.history.pushState({ path: newUrl }, '', newUrl);
    };

    const handleTicketSubmit = (e) => {
        e.preventDefault();
        if (currentTickets.includes(ticketInput)) {
            handleAuthorization(ticketInput);
        } else {
            setAuthError('Ticket ID tidak valid atau sudah kedaluwarsa.');
        }
    };

    const [url, setUrl] = useState('');
    const [playing, setPlaying] = useState(true); // Default to true for Iframe
    const [volume, setVolume] = useState(0.8);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showNativeControls, setShowNativeControls] = useState(true);

    // Extraction logic for YouTube Video ID
    const getVideoId = (url) => {
        if (!url) return null;
        // Updated regex to support /live/ format
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getVideoId(url);
    const [messages, setMessages] = useState([
        { user: 'Admin', text: 'Selamat datang di live nobar! Acara akan segera dimulai.' },
    ]);
    const [input, setInput] = useState('');

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim()) {
            setMessages([...messages, { user: 'You', text: input }]);
            setInput('');
        }
    };

    // --- Conflict UI ---
    if (sessionConflict) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-center text-white">
                <div className="w-full max-w-md bg-dark-surface border border-neon-pink/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(255,0,128,0.1)]">
                    <div className="w-16 h-16 bg-neon-pink/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-pink/20">
                        <AlertTriangle className="text-neon-pink" size={32} />
                    </div>
                    <h2 className="text-white text-2xl font-display mb-2">SESSION CONFLICT</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Ticket ini sedang digunakan di perangkat lain. <br />
                        Silakan tutup perangkat lain untuk melanjutkan di sini.
                    </p>
                    <button
                        onClick={async () => {
                            // Force overwrite Firebase session IMMEDIATELY
                            const sessionRef = ref(db, `sessions/${activeTicket}`);
                            await set(sessionRef, {
                                id: sessionId,
                                timestamp: Date.now()
                            });
                            // Small delay to let Firebase sync
                            setTimeout(() => {
                                window.location.reload();
                            }, 500);
                        }}
                        className="w-full bg-neon-pink text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-[0_0_20px_rgba(255,0,128,0.3)]"
                    >
                        MASUK PAKSA (AMBIL ALIH)
                    </button>
                    <p className="text-gray-600 text-[10px] mt-8 uppercase tracking-widest">
                        Keamanan Akun Terdeteksi
                    </p>
                </div>
            </div>
        );
    }

    // --- Ticket Gate UI ---
    if (!isAuthorized) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-white">
                <div className="w-full max-w-md bg-dark-surface border border-white/10 p-8 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-neon-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-neon-blue" size={32} />
                    </div>
                    <h2 className="text-white text-2xl font-display mb-2">ACCESS PROTECTED</h2>
                    <p className="text-gray-400 text-sm mb-8">Masukkan Ticket ID Anda untuk masuk ke ruang nobar.</p>

                    <form onSubmit={handleTicketSubmit} className="space-y-4">
                        <div className="relative">
                            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={ticketInput}
                                onChange={(e) => setTicketInput(e.target.value)}
                                placeholder="CONTOH-TICKET-123"
                                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue transition-all"
                            />
                        </div>
                        {authError && <p className="text-neon-pink text-xs text-left px-1">{authError}</p>}
                        <button className="w-full bg-neon-blue text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,183,255,0.3)]">
                            MASUK SEKARANG
                        </button>
                    </form>

                    <p className="text-gray-600 text-[10px] mt-8 uppercase tracking-widest">
                        Satu tiket hanya bisa digunakan untuk 1 perangkat.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-dark-bg flex flex-col md:flex-row h-screen overflow-hidden text-white">
            {/* Video Player Area */}
            <div id="main-player-container" className="flex-grow bg-black flex flex-col relative group overflow-hidden border-b md:border-b-0 border-white/10">
                <div className="flex-grow relative h-full w-full">
                    {/* GHOST PLAYER - Native Aspect Ratio */}
                    <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                        {videoId ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&showinfo=0&controls=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                                className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                title="Live Stream"
                                onLoad={() => setLoading(false)}
                            />
                        ) : (
                            <div className="text-white/20 font-mono text-[10px]">SIGNAL NOT DETECTED</div>
                        )}
                    </div>

                    {/* OPAQUE MASKS - Covers YT Branding precisely */}
                    <div className="absolute top-0 left-0 w-[40%] h-12 bg-black z-10 pointer-events-auto" />

                    <div className="absolute bottom-0 right-0 w-48 h-12 bg-black z-10 pointer-events-auto" />

                    {/* Interaction Shield - Impenetrable Click Block */}
                    <div className="absolute inset-0 z-50 bg-black/0 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                        onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* CUSTOM OVERLAY UI - Highest Z-index */}
                    <div className="absolute inset-0 pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="absolute top-4 left-4 pointer-events-auto">
                            <div className="text-white font-bold flex items-center gap-2 text-[9px] tracking-[0.4em] bg-neon-blue/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-neon-blue/40 shadow-lg">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                SIGNAL: LIVE
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-between items-end pointer-events-auto">
                            <div className="flex flex-col gap-2">
                                <div className="text-neon-blue font-bold text-[9px] tracking-[0.4em] uppercase opacity-70">Nobar JKT48</div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-neon-blue"
                                    >
                                        <Send size={16} className="rotate-45" />
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-gray-500 uppercase font-mono tracking-wider">Sync Status</span>
                                        <span className="text-[9px] text-neon-green font-bold">SECURE CHANNEL</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-white bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-3 group/vol">
                                    <Volume2
                                        size={20}
                                        className={`cursor-pointer transition-colors ${volume === 0 ? 'text-red-500' : 'text-gray-300 group-hover/vol:text-white'}`}
                                        onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                                    />
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                                    />
                                </div>
                                <button
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors group/fs"
                                    onClick={() => {
                                        const playerEl = document.getElementById('main-player-container');
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                        } else if (playerEl) {
                                            playerEl.requestFullscreen();
                                        }
                                    }}
                                >
                                    <Maximize size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Signal Meta */}
                    <div className="bg-black/95 border-t border-white/5 p-3 flex items-center justify-between z-40 px-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em]">Live Stream Active</span>
                            </div>
                            <div className="h-3 w-px bg-white/10" />
                            <span className="text-[9px] text-neon-blue font-mono uppercase tracking-[0.2em] animate-pulse">Session Encrypted</span>
                        </div>
                        <div className="text-[9px] text-gray-600 font-mono tracking-widest italic uppercase">
                            {activeTicket || 'No Ticket'}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="w-full md:w-80 lg:w-96 bg-dark-surface border-l border-white/10 flex flex-col h-[50vh] md:h-full">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center text-white">
                        <h3 className="text-white font-bold font-display">LIVE CHAT</h3>
                        <div className="flex items-center text-xs text-neon-green gap-1 bg-neon-green/10 px-2 py-1 rounded">
                            <Users size={12} /> 12.5k
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="text-sm">
                                <span className={`font-bold mr-2 ${msg.user === 'Admin' ? 'text-neon-pink' : 'text-neon-blue'}`}>{msg.user}:</span>
                                <span className="text-gray-300 break-words">{msg.text}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-dark-bg/50">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="w-full bg-dark-bg border border-white/10 rounded-full pl-4 pr-10 py-2 text-white text-sm focus:outline-none focus:border-neon-blue"
                                placeholder="Say something..."
                            />
                            <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Streaming;
