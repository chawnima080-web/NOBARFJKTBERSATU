import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';
import { members } from '../data/members';
import MemberCard from '../components/MemberCard';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

const Home = () => {
    const [settings, setSettings] = useState(() => {
        const cached = localStorage.getItem('jkt_home_settings');
        return cached ? JSON.parse(cached) : {
            title: 'NOBAR JKT48',
            subtitle: 'LIVE STREAMING EXPERIENCE',
            date: '2026-02-28T19:00:00'
        };
    });

    const [selectedLineup, setSelectedLineup] = useState(() => {
        const cached = localStorage.getItem('jkt_home_lineup');
        return cached ? JSON.parse(cached) : [1, 5, 20];
    });

    useEffect(() => {
        // Granular Listeners: Avoid root listener to prevent re-renders on chat/presence
        const settingsRef = ref(db, 'settings');
        const unsubSettings = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSettings(prev => {
                    const next = { ...prev, ...data };
                    localStorage.setItem('jkt_home_settings', JSON.stringify(next));
                    return next;
                });
            }
        });

        const lineupRef = ref(db, 'lineup');
        const unsubLineup = onValue(lineupRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const lineupArray = Array.isArray(data) ? data : [];
                setSelectedLineup(lineupArray);
                localStorage.setItem('jkt_home_lineup', JSON.stringify(lineupArray));
            }
        });

        return () => {
            unsubSettings();
            unsubLineup();
        };
    }, []);

    const featuredMembers = members.filter(m => selectedLineup.includes(m.id)).slice(0, 3);
    const targetDate = settings.date;

    return (
        <div className="relative flex flex-col items-center justify-center overflow-hidden min-h-screen">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#121212_1px,transparent_1px),linear-gradient(to_bottom,#121212_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Hero Section */}
            <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 pt-10">

                {/* Hero Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-center z-10 max-w-5xl relative"
                >
                    <div className="absolute -inset-10 bg-neon-blue/20 blur-[120px] rounded-full mix-blend-screen" />

                    {/* Dynamic font sizing for long titles */}
                    <h1
                        className="font-display font-black mb-6 tracking-tighter relative z-20 uppercase leading-[0.9]"
                        style={{
                            fontSize: `clamp(2.5rem, ${settings.title.length > 15 ? 12 : 18}vw, ${settings.title.length > 20 ? '5rem' : '8rem'})`,
                            wordBreak: 'break-word',
                            hyphens: 'auto'
                        }}
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            {settings.title}
                        </span>
                    </h1>

                    <div className="relative inline-block mb-10">
                        <div className="absolute inset-0 bg-neon-purple/50 blur-xl" />
                        <p className="relative z-10 text-xl md:text-3xl text-neon-blue font-mono tracking-[0.2em] border-y border-neon-blue/30 py-4 px-10 backdrop-blur-sm uppercase">
                            {settings.subtitle}
                        </p>
                    </div>

                    <div className="mb-12 scale-110">
                        <div className="text-gray-400 font-mono text-sm mb-4 tracking-widest">EVENT STARTS IN</div>
                        <CountdownTimer targetDate={targetDate} />
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 justify-center items-center mt-8">
                        <Link to="/details" className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-none">
                            <div className="absolute inset-0 w-full h-full border border-white/20 skew-x-12 group-hover:border-neon-pink/50 transition-all duration-300" />
                            <span className="relative z-10 font-display font-bold text-xl tracking-widest text-gray-400 group-hover:text-neon-pink transition-colors">
                                DETAILS
                            </span>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Featured Members Section */}
            <section className="w-full py-32 px-4 relative border-t border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent shadow-[0_0_20px_#bc13fe]" />

                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl md:text-6xl font-display font-bold text-white mb-6 uppercase tracking-tighter">
                            Featuring <span className="text-neon-pink">Stars</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {featuredMembers.map((member) => (
                            <MemberCard key={member.id} member={member} />
                        ))}
                    </div>

                    <div className="text-center mt-20">
                        <Link to="/members" className="inline-block relative group">
                            <span className="text-xl text-gray-400 font-mono tracking-widest group-hover:text-white transition-colors">VIEW ALL MEMBERS</span>
                            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-neon-blue group-hover:w-full transition-all duration-500" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};
export default Home;
