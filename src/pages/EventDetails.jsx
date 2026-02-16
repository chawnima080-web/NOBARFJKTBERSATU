import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Monitor, Clock, Users } from 'lucide-react';
import { members } from '../data/members';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

const EventDetails = () => {
    const [lineupIds, setLineupIds] = useState([1, 2, 3, 4, 5, 20]);

    useEffect(() => {
        const lineupRef = ref(db, 'lineup');
        const unsubscribe = onValue(lineupRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setLineupIds(data);
        });
        return () => unsubscribe();
    }, []);

    const featuredMembers = members.filter(m => lineupIds.includes(m.id));

    return (
        <div className="min-h-screen pt-20 px-4 pb-20 bg-dark-bg">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">SHOW DETAIL</h1>
                    <div className="w-24 h-1 bg-neon-blue mx-auto mb-8"></div>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                        Prepare for an unforgettable night with JKT48. High-quality streaming, exclusive content, and real-time interaction awaiting you.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-8 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-panel p-8"
                    >
                        <h2 className="text-3xl font-display font-bold text-neon-pink mb-8 text-center flex items-center justify-center gap-3">
                            <Users className="text-white" /> MEMBER LINEUP
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {featuredMembers.map((member) => (
                                <div key={member.id} className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-neon-blue/50 transition-all duration-300">
                                    <div className="aspect-[3/4] overflow-hidden">
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100" />
                                    <div className="absolute bottom-0 left-0 w-full p-4">
                                        <p className="text-neon-blue text-xs font-mono tracking-widest mb-1">{member.generation} Gen</p>
                                        <h3 className="text-white font-bold text-lg leading-tight group-hover:text-neon-pink transition-colors">{member.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-panel p-8"
                    >
                        <h2 className="text-2xl font-display font-bold text-neon-green mb-6 flex items-center gap-3">
                            <Monitor className="text-white" /> STREAMING INFO
                        </h2>
                        <ul className="space-y-6 text-gray-300">
                            <li className="flex items-start gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <MapPin size={20} className="text-neon-purple" />
                                </div>
                                <div>
                                    <strong className="block text-white mb-1">Online Only Event</strong>
                                    <p className="text-sm text-gray-400">Join from anywhere. No physical venue.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <Monitor size={20} className="text-neon-blue" />
                                </div>
                                <div>
                                    <strong className="block text-white mb-1">1080p 60fps Quality</strong>
                                    <p className="text-sm text-gray-400">Experience crystal clear visuals with high bitrate streaming.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <Clock size={20} className="text-neon-pink" />
                                </div>
                                <div>
                                    <strong className="block text-white mb-1">Zero Latency Interactive</strong>
                                    <p className="text-sm text-gray-400">Real-time interaction with members during the show.</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default EventDetails;
