import React from 'react';
import { motion } from 'framer-motion';

const MemberCard = ({ member }) => {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="relative group w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-dark-surface border border-white/10"
        >
            <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent z-10" />

            {/* Member Photo */}
            <div className="h-96 bg-gray-800 relative w-full overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-display text-4xl opacity-20">
                    {member.name.split(' ')[0]}
                </div>
                <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.backgroundColor = '#1a1a1a';
                    }}
                />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                <h3 className="text-2xl font-display font-bold text-white mb-1">{member.name}</h3>
                <p className="text-neon-blue font-mono text-sm mb-4">Gen {member.generation}</p>

                <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
                    {member.social && (
                        <>
                            <a href={member.social.instagram} className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">Instagram</a>
                            <a href={member.social.twitter} className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">Twitter</a>
                        </>
                    )}
                </div>
            </div>

            {/* Border Glow Effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-neon-purple/50 rounded-xl transition-all duration-300 pointer-events-none" />
        </motion.div>
    );
};

export default MemberCard;
