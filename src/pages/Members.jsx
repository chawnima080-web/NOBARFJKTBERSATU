import React from 'react';
import { motion } from 'framer-motion';
import MemberCard from '../components/MemberCard';
import { members } from '../data/members';

const Members = () => {
    return (
        <div className="min-h-screen pt-20 px-4 pb-20 bg-dark-bg">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">ALL MEMBERS</h1>
                    <div className="w-24 h-1 bg-neon-purple mx-auto mb-8"></div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {members.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <MemberCard member={member} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Members;
