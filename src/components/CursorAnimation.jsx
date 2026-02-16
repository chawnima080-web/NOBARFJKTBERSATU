import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CursorAnimation = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const updateMousePosition = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', updateMousePosition);

        return () => {
            window.removeEventListener('mousemove', updateMousePosition);
        };
    }, []);

    return (
        <div className="pointer-events-none fixed top-0 left-0 w-full h-full z-50">
            <motion.div
                className="fixed top-0 left-0 w-8 h-8 rounded-full border border-neon-blue bg-neon-blue/20 blur-sm"
                animate={{
                    x: mousePosition.x - 16,
                    y: mousePosition.y - 16,
                }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                    mass: 0.5
                }}
            />
            <motion.div
                className="fixed top-0 left-0 w-2 h-2 rounded-full bg-neon-white shadow-[0_0_10px_#fff]"
                animate={{
                    x: mousePosition.x - 4,
                    y: mousePosition.y - 4,
                }}
                transition={{
                    type: "spring",
                    stiffness: 1500,
                    damping: 15,
                    mass: 0.1
                }}
            />
            <motion.div
                className="fixed top-0 left-0 w-32 h-32 rounded-full bg-neon-purple/5 blur-xl"
                animate={{
                    x: mousePosition.x - 64,
                    y: mousePosition.y - 64,
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    mass: 1
                }}
            />
        </div>
    );
};

export default CursorAnimation;
