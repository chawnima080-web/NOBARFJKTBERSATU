import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timerComponents = [];

    Object.keys(timeLeft).forEach((interval) => {
        timerComponents.push(
            <div key={interval} className="flex flex-col items-center mx-4">
                <div className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                    {timeLeft[interval] < 10 ? `0${timeLeft[interval]}` : timeLeft[interval]}
                </div>
                <div className="text-xs uppercase tracking-widest text-neon-blue mt-2">
                    {interval}
                </div>
            </div>
        );
    });

    return (
        <div className="flex justify-center flex-wrap my-12 p-8 bg-dark-surface/50 backdrop-blur-sm rounded-2xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            {timerComponents.length ? timerComponents : <span>Event Started!</span>}
        </div>
    );
};

export default CountdownTimer;
