import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, Play, Maximize, Volume2, Settings, Ticket, Lock, AlertTriangle, RotateCcw } from 'lucide-react';
import { nanoid } from 'nanoid';
import { db } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, serverTimestamp, push, limitToLast, query } from 'firebase/database';

const Streaming = () => {
    const navigate = useNavigate();
    // 1. Core State
    const [currentTickets, setCurrentTickets] = useState([]);
    const [publicTickets, setPublicTickets] = useState([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // For instant player refresh
    const [settings, setSettings] = useState(null);
    const [startTime, setStartTime] = useState(null);

    // 2. Global Sync Listener
    useEffect(() => {
        const ticketsRef = ref(db, 'tickets');
        const unsubTickets = onValue(ticketsRef, (snap) => {
            const data = snap.val();
            setCurrentTickets(Array.isArray(data) ? data : []);
            if (!dataLoaded && data) setDataLoaded(true);
        });

        const publicTicketsRef = ref(db, 'publicTickets');
        const unsubPublic = onValue(publicTicketsRef, (snap) => {
            const data = snap.val();
            setPublicTickets(Array.isArray(data) ? data : []);
            if (!dataLoaded && data) setDataLoaded(true);
        });

        const settingsRef = ref(db, 'settings');
        const unsubSettings = onValue(settingsRef, (snap) => {
            const data = snap.val();
            if (data) {
                setSettings(data);
                const newStartTime = data.date ? new Date(data.date).getTime() : null;
                setStartTime(newStartTime);

                const newUrl = data.streamUrl || '';
                setUrl(prev => {
                    if (prev !== newUrl) {
                        setLoading(true);
                        setTimeout(() => setLoading(false), 2000);
                        return newUrl;
                    }
                    return prev;
                });
            }
        });

        const chatRef = query(ref(db, 'chats'), limitToLast(50));
        const unsubscribeChat = onValue(chatRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const chatList = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(chatList);
            }
        });

        return () => {
            unsubTickets();
            unsubPublic();
            unsubSettings();
            unsubscribeChat();
        };
    }, [dataLoaded]);

    const [ticketInput, setTicketInput] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState('');
    const [activeTicket, setActiveTicket] = useState(() => {
        return localStorage.getItem('active_jkt_ticket') || null;
    });
    const [userName, setUserName] = useState(() => {
        const ticket = localStorage.getItem('active_jkt_ticket');
        return ticket ? localStorage.getItem(`jkt_name_${ticket}`) || '' : '';
    });
    const [tempName, setTempName] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [sessionId] = useState(() => {
        let id = localStorage.getItem('jkt_session_id');
        if (!id) {
            id = nanoid();
            localStorage.setItem('jkt_session_id', id);
        }
        return id;
    });
    const [sessionConflict, setSessionConflict] = useState(false);
    const [activeTimeOffset, setActiveTimeOffset] = useState(0);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    // 3. Server Time Offset Listener
    useEffect(() => {
        const offsetRef = ref(db, ".info/serverTimeOffset");
        return onValue(offsetRef, (snap) => {
            setServerTimeOffset(snap.val() || 0);
        });
    }, []);

    // 4. Authorization Effect
    useEffect(() => {
        if (!dataLoaded) return;
        const allValidTickets = [...currentTickets, ...publicTickets];
        const urlParams = new URLSearchParams(window.location.search);
        const ticketFromUrl = urlParams.get('ticket');
        const storedTicket = localStorage.getItem('active_jkt_ticket');
        const targetTicket = ticketFromUrl || storedTicket;

        if (targetTicket && allValidTickets.includes(targetTicket)) {
            if (!sessionConflict && (!isAuthorized || activeTicket !== targetTicket)) {
                handleAuthorization(targetTicket);
            }
        } else if (isAuthorized) {
            setIsAuthorized(false);
            setActiveTicket(null);
            setUserName('');
            localStorage.removeItem('active_jkt_ticket');
        }
    }, [currentTickets, publicTickets, isAuthorized, sessionConflict, activeTicket, dataLoaded]);

    // 5. Cleanup Effect (Local Storage)
    useEffect(() => {
        if (!dataLoaded) return;
        const allValidTickets = [...currentTickets, ...publicTickets];
        if (allValidTickets.length > 0) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('jkt_name_')) {
                    const ticketId = key.replace('jkt_name_', '');
                    if (!allValidTickets.includes(ticketId)) {
                        localStorage.removeItem(key);
                    }
                }
            });
        }
    }, [currentTickets, publicTickets, dataLoaded]);

    // 6. Presence & Heartbeat Logic (High Precision for Multi-Device)
    useEffect(() => {
        if (!isAuthorized || !activeTicket || sessionConflict || !dataLoaded) return;

        const presenceRef = ref(db, `presence/${activeTicket}_${sessionId}`);
        const updatePresence = () => {
            set(presenceRef, {
                id: sessionId,
                ticket: activeTicket,
                timestamp: serverTimestamp()
            });
        };

        // Initial write
        updatePresence();
        onDisconnect(presenceRef).remove();

        // HEARTBEAT: Update every 15s
        const presenceHeartbeat = setInterval(updatePresence, 15000);

        // Listener for Unique Viewers Count (Calibrated for Server Time)
        const globalPresenceRef = ref(db, 'presence');
        const unsubscribePresence = onValue(globalPresenceRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const uniqueSessions = new Set();
                const currentOffset = serverTimeOffset || 0;
                const serverNow = Date.now() + currentOffset;

                Object.values(data).forEach(entry => {
                    if (entry && typeof entry === 'object' && entry.id && entry.ticket === activeTicket) {
                        const lastActive = entry.timestamp || 0;
                        // Precision window: 60 seconds (Robust for mobile latency/clock drift)
                        if (serverNow - lastActive < 60000) {
                            uniqueSessions.add(entry.id);
                        }
                    }
                });
                setViewerCount(uniqueSessions.size > 0 ? uniqueSessions.size : 1);
            } else {
                setViewerCount(1);
            }
        });

        if (publicTickets.includes(activeTicket)) {
            return () => {
                unsubscribePresence();
                clearInterval(presenceHeartbeat);
            };
        }

        const sessionRef = ref(db, `sessions/${activeTicket}`);
        let lockInterval;

        const unsubscribeSession = onValue(sessionRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.id !== sessionId) {
                const now = Date.now();
                const lastSeen = data.timestamp || 0;
                if (now - lastSeen < 40000) {
                    setSessionConflict(true);
                    if (lockInterval) clearInterval(lockInterval);
                } else {
                    updateLock();
                }
            }
        });

        const updateLock = async () => {
            if (sessionConflict) return;
            try {
                await set(sessionRef, { id: sessionId, timestamp: serverTimestamp() });
            } catch (e) {
                console.error("Lock failed:", e);
            }
        };

        updateLock();
        lockInterval = setInterval(updateLock, 15000);
        onDisconnect(sessionRef).remove();

        return () => {
            unsubscribePresence();
            unsubscribeSession();
            clearInterval(presenceHeartbeat);
            if (lockInterval) clearInterval(lockInterval);
        };
    }, [isAuthorized, activeTicket, sessionId, sessionConflict, publicTickets, dataLoaded]);

    const handleAuthorization = (ticket) => {
        setIsAuthorized(true);
        setActiveTicket(ticket);
        setAuthError('');
        setSessionConflict(false);
        const savedName = localStorage.getItem(`jkt_name_${ticket}`);
        if (activeTicket !== ticket || !userName) {
            setUserName(savedName || '');
        }
        setTempName('');
        localStorage.setItem('active_jkt_ticket', ticket);
        // Clean up URL to keep it pretty
        navigate(`/streaming?ticket=${ticket}`, { replace: true });
    };

    const handleTicketSubmit = (e) => {
        e.preventDefault();
        const allValidTickets = [...currentTickets, ...publicTickets];
        const trimmedTicket = ticketInput.trim();
        if (allValidTickets.includes(trimmedTicket)) {
            handleAuthorization(trimmedTicket);
        } else {
            setAuthError('Ticket ID tidak valid atau sudah kedaluwarsa.');
        }
    };

    const handleNameSubmit = (e) => {
        e.preventDefault();
        const trimmedName = tempName.trim();
        if (trimmedName.length >= 2) {
            setUserName(trimmedName);
            if (activeTicket) {
                localStorage.setItem(`jkt_name_${activeTicket}`, trimmedName);
            }
        } else {
            setAuthError('Nama minimal 2 karakter.');
        }
    };

    // UI States
    const [url, setUrl] = useState('');
    const [quality, setQuality] = useState('hd1080');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [loading, setLoading] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [messages, setMessages] = useState([
        { user: 'Admin', text: 'Selamat datang di live nobar! Acara akan segera dimulai.' },
    ]);
    const [input, setInput] = useState('');
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    useEffect(() => {
        if (showControls) {
            const timer = setTimeout(() => setShowControls(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showControls]);

    // Deter Inspection & Right-Click
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        const handleKeyDown = (e) => {
            // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.keyCode === 123 ||
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                (e.ctrlKey && e.keyCode === 85)
            ) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Handle Volume PostMessage & Automatic Unmute Attempt
    useEffect(() => {
        const iframe = document.getElementById('yt-player-iframe');
        if (iframe && isPlayerReady) {
            // Volume
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'setVolume',
                args: [volume * 100]
            }), '*');

            // Automatic unMute attempt for seamless flow
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'unMute',
                args: []
            }), '*');
        }
    }, [volume, isPlayerReady]);

    const getVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getVideoId(url?.trim());

    // --- REAL-TIME SYNC LOGIC ---
    useEffect(() => {
        if (startTime && !loading) {
            const now = Date.now();
            const diff = Math.floor((now - startTime) / 1000);
            setActiveTimeOffset(diff > 0 ? diff : 0);
        }
    }, [startTime, url, refreshKey]);

    const handleRefresh = (e) => {
        if (e) e.stopPropagation();
        setLoading(true);
        setIsPlayerReady(false);
        setActiveTimeOffset(0); // Reset offset to force recalculation
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setLoading(false), 2000);
    };

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

    // Auto-scroll chat
    useEffect(() => {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);

    // --- RENDER LOGIC ---

    if (sessionConflict) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-center text-white">
                <div className="w-full max-w-md bg-dark-surface border border-neon-pink/30 p-8 rounded-2xl">
                    <AlertTriangle className="text-neon-pink mx-auto mb-6" size={48} />
                    <h2 className="text-white text-2xl font-display mb-2">SESSION CONFLICT</h2>
                    <p className="text-gray-400 text-sm mb-6">Ticket ini sedang digunakan di perangkat lain.</p>
                    <button
                        onClick={async () => {
                            const sessionRef = ref(db, `sessions/${activeTicket}`);
                            await set(sessionRef, { id: sessionId, timestamp: Date.now() });
                            setTimeout(() => window.location.reload(), 500);
                        }}
                        className="w-full bg-neon-pink text-white py-3 rounded-xl font-bold"
                    >
                        MASUK PAKSA (AMBIL ALIH)
                    </button>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-white">
                <div className="w-full max-w-md bg-dark-surface border border-white/10 p-8 rounded-2xl text-center">
                    <Lock className="text-neon-blue mx-auto mb-6" size={48} />
                    <h2 className="text-white text-2xl font-display mb-2">ACCESS PROTECTED</h2>
                    <p className="text-gray-400 text-sm mb-8">Masukkan Ticket ID Anda.</p>
                    <form onSubmit={handleTicketSubmit} className="space-y-4">
                        <div className="relative">
                            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={ticketInput}
                                onChange={(e) => setTicketInput(e.target.value)}
                                placeholder="TICKET ID..."
                                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neon-blue outline-none"
                            />
                        </div>
                        {authError && <p className="text-neon-pink text-xs">{authError}</p>}
                        <button className="w-full bg-neon-blue text-white py-3 rounded-xl font-bold">MASUK</button>
                    </form>
                </div>
            </div>
        );
    }

    if (!userName) {
        return (
            <div className="min-h-screen pt-20 bg-dark-bg flex items-center justify-center p-6 text-white">
                <div className="w-full max-w-md bg-dark-surface border border-white/10 p-8 rounded-2xl text-center">
                    <Users className="text-neon-pink mx-auto mb-6" size={48} />
                    <h2 className="text-white text-2xl font-display mb-2">SIAPA NAMA ANDA?</h2>
                    <p className="text-gray-400 text-sm mb-8">Nama di live chat.</p>
                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            placeholder="NAMA..."
                            maxLength={20}
                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-neon-pink outline-none text-center font-bold"
                        />
                        {authError && <p className="text-neon-pink text-xs">{authError}</p>}
                        <button className="w-full bg-neon-pink text-white py-3 rounded-xl font-bold">START WATCHING</button>
                    </form>
                    <button onClick={() => { localStorage.removeItem('active_jkt_ticket'); window.location.reload(); }} className="text-gray-600 text-[10px] mt-8 uppercase tracking-widest">GANTI TIKET</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-dark-bg flex flex-col md:flex-row h-screen overflow-hidden text-white select-none">
            <div id="main-player-container" className="flex-grow bg-black flex flex-col relative group overflow-hidden">
                <div className="flex-grow relative h-full w-full">
                    <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                        {videoId ? (
                            <iframe
                                id="yt-player-iframe"
                                key={refreshKey}
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playlist=${videoId}&loop=1&rel=0&showinfo=0&controls=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}&vq=${quality}&start=${activeTimeOffset}`}
                                className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                title="YouTube Stream"
                                onLoad={() => {
                                    setIsPlayerReady(true);
                                    setTimeout(() => setLoading(false), 2000);
                                }}
                            />
                        ) : (
                            <div className="text-white/20 font-mono text-[10px]">SIGNAL NOT DETECTED</div>
                        )}
                    </div>

                    {loading && (
                        <div className="absolute inset-0 z-[35] bg-black flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
                            <div className="text-neon-blue font-mono text-[10px] animate-pulse uppercase tracking-[0.2em]">Resolving Signal...</div>
                        </div>
                    )}

                    <div
                        className={`absolute inset-0 z-30 transition-all duration-500 ${showControls ? 'opacity-100 bg-black/20' : 'opacity-0 md:group-hover:opacity-100'}`}
                        onClick={() => setShowControls(!showControls)}
                    >
                        {/* Status Signal */}
                        <div className="absolute top-4 left-4">
                            <div className="text-white font-bold flex items-center gap-2 text-[9px] tracking-[0.4em] bg-neon-blue/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-neon-blue/40">
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] ${videoId ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                                SIGNAL: {videoId ? 'LIVE' : 'OFFLINE'}
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-between items-end gap-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                            <div className="flex flex-col gap-2">
                                <div className="text-neon-blue font-bold text-[9px] tracking-[0.4em] uppercase">{settings?.title || 'Nobar JKT48'}</div>
                                <button
                                    onClick={handleRefresh}
                                    className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full transition-all text-neon-blue hover:bg-white/10 group"
                                >
                                    <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
                                    <span className="text-[10px] font-bold tracking-[0.2em] pt-0.5">REFRESH LIVE</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-6 bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10">
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }} className="flex flex-col items-center hover:text-neon-blue transition-colors">
                                        <Settings size={20} className={showQualityMenu ? 'text-neon-blue' : 'text-gray-300'} />
                                        <span className="text-[8px] mt-1 font-mono uppercase tracking-widest">{quality.replace('hd', '')}p</span>
                                    </button>

                                    {showQualityMenu && (
                                        <div className="absolute bottom-full mb-4 right-0 bg-dark-surface border border-white/10 rounded-xl p-2 min-w-[140px] z-50 shadow-2xl backdrop-blur-xl">
                                            <div className="text-[8px] font-mono text-gray-500 px-3 py-1 uppercase tracking-widest">Select Resolution</div>
                                            {[
                                                { label: '1080p Ultra', value: 'hd1080' },
                                                { label: '720p HD', value: 'hd720' },
                                                { label: '480p SD', value: 'large' },
                                                { label: '360p Data Saver', value: 'medium' }
                                            ].map((q) => (
                                                <button
                                                    key={q.value}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setQuality(q.value);
                                                        setShowQualityMenu(false);
                                                        setLoading(true);
                                                        setRefreshKey(prev => prev + 1);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-bold transition-all ${quality === q.value ? 'bg-neon-blue text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    {q.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden sm:flex items-center gap-3">
                                    <Volume2 size={20} className="text-gray-300" />
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
                                    className="p-2 border border-neon-blue/20 rounded-lg text-neon-blue hover:bg-neon-blue/10 transition-colors"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const playerEl = document.getElementById('main-player-container');
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                        } else if (playerEl) {
                                            await playerEl.requestFullscreen();
                                            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => { });
                                        }
                                    }}
                                >
                                    <Maximize size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-black/95 border-t border-white/5 p-3 flex items-center justify-between z-40 px-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em]">Signal: Active</span>
                        </div>
                        <div className="h-3 w-px bg-white/10" />
                        <span className="text-[9px] text-neon-blue font-mono uppercase tracking-[0.2em]">Live Channel</span>
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.2em]">Latency: Optimized</div>
                </div>
            </div>

            {/* Chat Section */}
            <div className="w-full md:w-80 lg:w-96 bg-dark-surface border-l border-white/10 flex flex-col h-[50vh] md:h-full">
                <div className="p-4 border-b border-white/10 flex justify-between items-center text-white">
                    <h3 className="font-bold tracking-widest text-xs uppercase">LIVE CHAT</h3>
                    <div className="flex items-center text-xs font-bold text-neon-green gap-1 bg-neon-green/10 px-2 py-1 rounded">
                        <Users size={12} /> {viewerCount.toLocaleString()}
                    </div>
                </div>
                <div id="chat-messages" className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div key={idx} className="text-sm">
                            <span className={`font-bold mr-2 ${msg.user === 'Admin' ? 'text-neon-pink' : 'text-neon-blue'}`}>{msg.user}:</span>
                            <span className="text-gray-300 break-words font-medium">{msg.text}</span>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/20">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full bg-dark-bg border border-white/10 rounded-full pl-4 pr-10 py-2.5 text-white text-sm focus:border-neon-blue outline-none transition-all"
                            placeholder="Type message..."
                        />
                        <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-neon-blue transition-colors">
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Streaming;
