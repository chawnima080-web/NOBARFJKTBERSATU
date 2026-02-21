import React, { useState, useEffect } from 'react';
import { Send, Users, Play, Maximize, Volume2, Settings, Ticket, Lock, AlertTriangle, RotateCcw } from 'lucide-react';
// ReactPlayer removed for native Iframe stability
import { nanoid } from 'nanoid';
import { db } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, push, limitToLast, query } from 'firebase/database';

const Streaming = () => {
    const [currentTickets, setCurrentTickets] = useState(['TRIAL-JKT48']);
    const [publicTickets, setPublicTickets] = useState([]);

    useEffect(() => {
        const dbRef = ref(db, '/');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCurrentTickets(Array.isArray(data.tickets) ? data.tickets : []);
                setPublicTickets(Array.isArray(data.publicTickets) ? data.publicTickets : []);
                // Always sync settings structure
                if (data.settings) {
                    const newUrl = data.settings.streamUrl || '';
                    setUrl(prev => {
                        if (prev !== newUrl) {
                            setLoading(true);
                            setTimeout(() => setLoading(false), 4000);
                            return newUrl;
                        }
                        return prev;
                    });
                } else {
                    // Reset if settings missing
                    setUrl('');
                }
            }
        });

        // --- Global Chat Sync ---
        const chatRef = query(ref(db, 'chats'), limitToLast(50));
        const unsubscribeChat = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const chatList = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(chatList);
            }
        });

        return () => {
            unsubscribe();
            unsubscribeChat();
        };
    }, []);

    const [ticketInput, setTicketInput] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState('');
    const [activeTicket, setActiveTicket] = useState(() => {
        return localStorage.getItem('active_jkt_ticket') || null;
    });
    const [userName, setUserName] = useState(() => {
        return localStorage.getItem('jkt_user_name') || '';
    });
    const [tempName, setTempName] = useState('');
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

        const allValidTickets = [...currentTickets, ...publicTickets];

        if (targetTicket && allValidTickets.includes(targetTicket)) {
            // CRITICAL: Don't re-authorize if we are currently in a conflict state
            if (!sessionConflict && (activeTicket !== targetTicket || !isAuthorized)) {
                handleAuthorization(targetTicket);
            }
        } else if (isAuthorized) {
            // Revoke access if the ticket is no longer valid or list is empty
            setIsAuthorized(false);
            setActiveTicket(null);
            localStorage.removeItem('active_jkt_ticket');
        }
    }, [currentTickets, isAuthorized, sessionConflict]);

    // Global Heartbeat Logic: Prevent Multi-Device via Firebase
    useEffect(() => {
        if (!isAuthorized || !activeTicket || sessionConflict) return;

        // SKIP Conflict Check for PUBLIC tickets
        if (publicTickets.includes(activeTicket)) return;

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
                    // STOP: Don't call setIsAuthorized(false) here, 
                    // let sessionConflict state handle the UI blocker independently.
                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    return;
                }
            }
        });

        // 2. Setup Periodic Heartbeat
        const updateHeartbeat = async () => {
            // Safety: Check if we are still active before writing
            if (sessionConflict) return;

            try {
                await set(sessionRef, {
                    id: sessionId,
                    timestamp: Date.now()
                });
            } catch (e) {
                console.error("Heartbeat update failed:", e);
            }
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

        // --- PUBLIC TICKET LOGIC: Always re-set name ---
        if (publicTickets.includes(ticket)) {
            setUserName('');
            localStorage.removeItem('jkt_user_name');
        }

        // Persist to LocalStorage
        localStorage.setItem('active_jkt_ticket', ticket);

        // Save to URL so refresh doesn't lose access
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?ticket=' + ticket;
        window.history.pushState({ path: newUrl }, '', newUrl);
    };

    const handleTicketSubmit = (e) => {
        e.preventDefault();
        const allValidTickets = [...currentTickets, ...publicTickets];
        if (allValidTickets.includes(ticketInput)) {
            handleAuthorization(ticketInput);
        } else {
            setAuthError('Ticket ID tidak valid atau sudah kedaluwarsa.');
        }
    };

    const handleNameSubmit = (e) => {
        e.preventDefault();
        const trimmedName = tempName.trim();
        if (trimmedName.length >= 3) {
            setUserName(trimmedName);
            localStorage.setItem('jkt_user_name', trimmedName);
        } else {
            setAuthError('Nama minimal 3 karakter.');
        }
    };

    const [url, setUrl] = useState('');
    const [quality, setQuality] = useState('hd1080');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [volume, setVolume] = useState(0.8);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showControls, setShowControls] = useState(false);

    // Auto-hide controls timer
    useEffect(() => {
        if (showControls) {
            const timer = setTimeout(() => setShowControls(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showControls]);

    // Functional Volume Control for YT Iframe
    useEffect(() => {
        const iframe = document.getElementById('yt-player-iframe');
        if (iframe) {
            const message = JSON.stringify({
                event: 'command',
                func: 'setVolume',
                args: [volume * 100] // YT API uses 0-100
            });
            iframe.contentWindow.postMessage(message, '*');
        }
    }, [volume, url]); // Re-apply on URL change too

    // Extraction logic for YouTube Video ID
    const getVideoId = (url) => {
        if (!url) return null;
        // Updated regex to support /live/ format
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getVideoId(url?.trim());
    const [messages, setMessages] = useState([
        { user: 'Admin', text: 'Selamat datang di live nobar! Acara akan segera dimulai.' },
    ]);
    const [input, setInput] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        if (input.trim()) {
            const newMessage = {
                user: userName || 'Guest',
                text: input,
                timestamp: serverTimestamp()
            };

            try {
                await push(ref(db, 'chats'), newMessage);
                setInput('');
            } catch (error) {
                console.error("Chat send failed:", error);
            }
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

    // --- Name Gate UI (Step 2) ---
    if (!userName) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-white">
                <div className="w-full max-w-md bg-dark-surface border border-white/10 p-8 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-neon-pink/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="text-neon-pink" size={32} />
                    </div>
                    <h2 className="text-white text-2xl font-display mb-2">SIAPA NAMA ANDA?</h2>
                    <p className="text-gray-400 text-sm mb-8">Nama ini akan muncul saat Anda mengirim komentar di live chat.</p>

                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                placeholder="NAMA TAMPILAN..."
                                maxLength={20}
                                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-pink transition-all font-bold tracking-wider"
                            />
                        </div>
                        {authError && <p className="text-neon-pink text-xs text-left px-1">{authError}</p>}
                        <button className="w-full bg-neon-pink text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-[0_0_20px_rgba(255,0,128,0.3)]">
                            MULAI MENONTON
                        </button>
                    </form>

                    <button
                        onClick={() => {
                            localStorage.removeItem('active_jkt_ticket');
                            localStorage.removeItem('jkt_user_name');
                            window.location.reload();
                        }}
                        className="text-gray-600 text-[10px] mt-8 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        GANTI TIKET
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-dark-bg flex flex-col md:flex-row h-screen overflow-hidden text-white">
            {/* Video Player Area */}
            <div id="main-player-container" className="flex-grow bg-black flex flex-col relative group overflow-hidden border-b md:border-b-0 border-white/10">
                <div className="flex-grow relative h-full w-full">
                    {/* GHOST PLAYER - Supports YouTube and Generic Iframe */}
                    <div className="absolute inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
                        {videoId ? (
                            <iframe
                                id="yt-player-iframe"
                                key={`${videoId}-${quality}`}
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&showinfo=0&controls=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}&vq=${quality}`}
                                className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                title="YouTube Stream"
                                onLoad={() => {
                                    setTimeout(() => setLoading(false), 4000);
                                }}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <div className="text-white/20 font-mono text-[10px] tracking-[0.2em] mb-2 uppercase">SIGNAL NOT DETECTED</div>
                            </div>
                        )}
                    </div>

                    {/* BLACK DELAY OVERLAY - Hides YT UI during reload */}
                    {loading && (
                        <div className="absolute inset-0 z-[35] bg-black flex flex-col items-center justify-center gap-4 transition-all duration-500">
                            <div className="w-10 h-10 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
                            <div className="text-neon-blue font-mono text-[9px] tracking-[0.3em] uppercase animate-pulse">Switching Quality... {quality.replace('hd', '')}p</div>
                        </div>
                    )}

                    {/* PROFESSIONAL GHOST MASKING */}
                    {/* Top Mask: Covers Title & Channel Info with slight gradient for natural feel */}
                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black via-black/90 to-transparent z-10 pointer-events-auto" />

                    {/* Bottom Right Mask: Covers YouTube Logo / "Watch on YouTube" */}
                    <div className="absolute bottom-0 right-0 w-48 h-16 bg-gradient-to-t from-black to-transparent z-10 pointer-events-auto" />

                    {/* CUSTOM OVERLAY UI - Highest Z-index */}
                    <div
                        className={`absolute inset-0 z-30 transition-all duration-500 cursor-pointer ${showControls ? 'opacity-100 bg-black/20' : 'opacity-0 md:group-hover:opacity-100'}`}
                        onClick={() => setShowControls(!showControls)}
                    >
                        {/* Interaction Shield - Blocks YT but below our controls UI */}
                        <div className="absolute inset-0 z-20 bg-transparent cursor-default pointer-events-none"
                            onContextMenu={(e) => e.preventDefault()}
                        />

                        <div className="absolute top-4 left-4 pointer-events-auto">
                            <div className="text-white font-bold flex items-center gap-2 text-[9px] tracking-[0.4em] bg-neon-blue/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-neon-blue/40 shadow-lg">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                SIGNAL: LIVE
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-between items-end pointer-events-auto gap-4 flex-wrap">
                            <div className="flex flex-col gap-2">
                                <div className="text-neon-blue font-bold text-[9px] tracking-[0.4em] uppercase opacity-70">Nobar JKT48</div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.reload();
                                        }}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-neon-blue group/play"
                                        title="Reset Stream"
                                    >
                                        <RotateCcw size={16} className="group-hover/play:rotate-[-45deg] transition-transform" />
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-gray-500 uppercase font-mono tracking-wider">Sync Status</span>
                                        <span className="text-[9px] text-neon-green font-bold">SECURE CHANNEL</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-6 text-white bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 relative">
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowQualityMenu(!showQualityMenu);
                                        }}
                                        className="flex flex-col items-center group cursor-pointer"
                                    >
                                        <Settings size={20} className={`transition-colors ${showQualityMenu ? 'text-neon-blue' : 'text-gray-300 group-hover:text-white'}`} />
                                        <span className="text-[8px] mt-1 font-mono uppercase tracking-tighter">{quality.replace('hd', '')}P</span>
                                    </button>

                                    {showQualityMenu && (
                                        <div className="absolute bottom-full mb-4 right-0 bg-dark-surface border border-white/10 rounded-xl p-2 min-w-[120px] shadow-2xl backdrop-blur-xl z-50">
                                            {[
                                                { label: '1080p (HD)', value: 'hd1080' },
                                                { label: '720p (HD)', value: 'hd720' },
                                                { label: '480p (SD)', value: 'large' },
                                                { label: '360p (SD)', value: 'medium' }
                                            ].map((q) => (
                                                <button
                                                    key={q.value}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setQuality(q.value);
                                                        setShowQualityMenu(false);
                                                        setLoading(true);
                                                        setTimeout(() => setLoading(false), 4000);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold transition-all ${quality === q.value ? 'bg-neon-blue text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    {q.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden sm:flex items-center gap-3 group/vol">
                                    <Volume2
                                        size={20}
                                        className={`cursor-pointer transition-colors ${volume === 0 ? 'text-red-500' : 'text-gray-300 group-hover/vol:text-white'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVolume(volume === 0 ? 0.8 : 0);
                                        }}
                                    />
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                                    />
                                </div>

                                <button
                                    className="p-2 bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/20 rounded-lg transition-all group/fs"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const playerEl = document.getElementById('main-player-container');
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                            if (screen.orientation && screen.orientation.unlock) {
                                                screen.orientation.unlock();
                                            }
                                        } else if (playerEl) {
                                            try {
                                                await playerEl.requestFullscreen();
                                                // Lock to landscape on mobile
                                                if (screen.orientation && screen.orientation.lock) {
                                                    await screen.orientation.lock('landscape').catch(err => console.log('Orientation lock rejected:', err));
                                                }
                                            } catch (err) {
                                                console.error('Fullscreen failed:', err);
                                            }
                                        }
                                    }}
                                >
                                    <Maximize size={24} className="text-neon-blue group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
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
    );
};

export default Streaming;
