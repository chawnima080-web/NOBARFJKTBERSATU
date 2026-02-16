import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-dark-surface border-t border-white/5 py-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink opacity-50" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="font-display font-bold text-2xl tracking-tighter text-white mb-4 block">
                            NOBAR<span className="text-neon-pink">.</span>JKT48
                        </Link>
                        <p className="text-gray-400 text-sm max-w-sm font-light">
                            Experience the future of live streaming. Join the community and watch alongside thousands of fans worldwide.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider mb-4 text-sm">Links</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/details" className="hover:text-neon-blue transition-colors">Event Details</Link></li>
                            <li><Link to="/members" className="hover:text-neon-blue transition-colors">Member Profiles</Link></li>
                            <li><Link to="/faq" className="hover:text-neon-blue transition-colors">FAQ</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider mb-4 text-sm">Follow Us</h3>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 hover:text-neon-pink transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-neon-blue transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><Youtube size={20} /></a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                    <p>&copy; 2026 Nobar JKT48. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
