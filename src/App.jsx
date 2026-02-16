import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import EventDetails from './pages/EventDetails';
import Members from './pages/Members';
import Streaming from './pages/Streaming';
import Admin from './pages/Admin';
import ScrollToTop from './components/ScrollToTop';

import CursorAnimation from './components/CursorAnimation';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <CursorAnimation />
      <div className="bg-black min-h-screen text-white font-sans selection:bg-neon-pink selection:text-white flex flex-col">
        <Navbar />
        <div className="flex-grow pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/details" element={<EventDetails />} />
            <Route path="/members" element={<Members />} />
            <Route path="/streaming" element={<Streaming />} />
            <Route path="/managemen-web-nobar" element={<Admin />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
