import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import DebrieflyHome from './pages/debriefly/Home.jsx';
import DebrieflyPrivacy from './pages/debriefly/Privacy.jsx';
import DebrieflySupport from './pages/debriefly/Support.jsx';
import DebrieflyTerms from './pages/debriefly/Terms.jsx';
import SlumbrHome from './pages/slumbr/Home.jsx';
import SlumbrPrivacy from './pages/slumbr/Privacy.jsx';
import SlumbrSupport from './pages/slumbr/Support.jsx';
import MancaveHome from './pages/mancave-displays/Home.jsx';
import MancavePrivacy from './pages/mancave-displays/Privacy.jsx';
import MancaveSupport from './pages/mancave-displays/Support.jsx';
import ReceiptHome from './pages/receipt-tax-tracker/Home.jsx';
import ReceiptPrivacy from './pages/receipt-tax-tracker/Privacy.jsx';
import ReceiptSupport from './pages/receipt-tax-tracker/Support.jsx';
import LearnHome from './pages/learn-and-play/Home.jsx';
import LearnPrivacy from './pages/learn-and-play/Privacy.jsx';
import LearnSupport from './pages/learn-and-play/Support.jsx';
import LearnTerms from './pages/learn-and-play/Terms.jsx';
import TeslaDashboard from './pages/tesla-dashboard/index.jsx';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/debriefly" element={<DebrieflyHome />} />
          <Route path="/debriefly/privacy" element={<DebrieflyPrivacy />} />
          <Route path="/debriefly/support" element={<DebrieflySupport />} />
          <Route path="/debriefly/terms" element={<DebrieflyTerms />} />
          <Route path="/slumbr" element={<SlumbrHome />} />
          <Route path="/slumbr/privacy" element={<SlumbrPrivacy />} />
          <Route path="/slumbr/support" element={<SlumbrSupport />} />
          <Route path="/mancave-displays" element={<MancaveHome />} />
          <Route path="/mancave-displays/privacy" element={<MancavePrivacy />} />
          <Route path="/mancave-displays/support" element={<MancaveSupport />} />
          <Route path="/receipt-tax-tracker" element={<ReceiptHome />} />
          <Route path="/receipt-tax-tracker/privacy" element={<ReceiptPrivacy />} />
          <Route path="/receipt-tax-tracker/support" element={<ReceiptSupport />} />
          <Route path="/learn-and-play" element={<LearnHome />} />
          <Route path="/learn-and-play/privacy" element={<LearnPrivacy />} />
          <Route path="/learn-and-play/support" element={<LearnSupport />} />
          <Route path="/learn-and-play/terms" element={<LearnTerms />} />
          <Route path="/tesla-dashboard" element={<TeslaDashboard />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
