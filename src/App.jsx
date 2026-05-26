import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home.jsx";
import DebrieflyHome from "./pages/debriefly/Home.jsx";
import DebrieflyPrivacy from "./pages/debriefly/Privacy.jsx";
import DebrieflySupport from "./pages/debriefly/Support.jsx";
import DebrieflyTerms from "./pages/debriefly/Terms.jsx";
import SlumbrHome from "./pages/slumbr/Home.jsx";
import SlumbrPrivacy from "./pages/slumbr/Privacy.jsx";
import SlumbrSupport from "./pages/slumbr/Support.jsx";
import MancaveHome from "./pages/mancave-displays/Home.jsx";
import MancavePrivacy from "./pages/mancave-displays/Privacy.jsx";
import MancaveSupport from "./pages/mancave-displays/Support.jsx";
import ReceiptHome from "./pages/receipt-tax-tracker/Home.jsx";
import ReceiptPrivacy from "./pages/receipt-tax-tracker/Privacy.jsx";
import ReceiptSupport from "./pages/receipt-tax-tracker/Support.jsx";
import LearnHome from "./pages/learn-and-play/Home.jsx";
import LearnPrivacy from "./pages/learn-and-play/Privacy.jsx";
import LearnSupport from "./pages/learn-and-play/Support.jsx";
import LearnTerms from "./pages/learn-and-play/Terms.jsx";
import TeslaDashboard from "./pages/tesla-dashboard/index.jsx";
import MothersDayGiftCard from "./pages/mothers-day-2026/index.jsx";
import FarkleTracker from "./pages/farkle/index.jsx";
import ZargleHome from "./pages/zargle/Home.jsx";
import ZarglePrivacy from "./pages/zargle/Privacy.jsx";
import ZargleSupport from "./pages/zargle/Support.jsx";
import ZargleTerms from "./pages/zargle/Terms.jsx";
import EliteEdgeAdmin from "./pages/elite-edge/AdminScreen.jsx";
import EliteEdgeBets from "./pages/elite-edge/AccountScreen.jsx";
import Palladium2026Home from "./pages/palladium-2026/Home.jsx";
import Palladium2026Privacy from "./pages/palladium-2026/Privacy.jsx";
import Palladium2026Support from "./pages/palladium-2026/Support.jsx";

export default function App() {
  const location = useLocation();
  const isTeslaDashboard = location.pathname.startsWith("/tesla-dashboard");
  const isMothersDay = location.pathname.startsWith("/mothers-day-2026");
  const isFarkle = location.pathname.startsWith("/farkle");
  const isZargle = location.pathname.startsWith("/zargle");
  const isEliteEdge = location.pathname.startsWith("/elite-edge");
  const hideChrome = isTeslaDashboard || isMothersDay || isFarkle || isZargle || isEliteEdge;
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <ScrollToTop />
      {!hideChrome && <Navbar />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
          <Route path="/mothers-day-2026" element={<MothersDayGiftCard />} />
          <Route path="/farkle" element={<FarkleTracker />} />
          <Route path="/zargle" element={<ZargleHome />} />
          <Route path="/zargle/privacy" element={<ZarglePrivacy />} />
          <Route path="/zargle/support" element={<ZargleSupport />} />
          <Route path="/zargle/terms" element={<ZargleTerms />} />
          <Route path="/elite-edge/admin" element={<EliteEdgeAdmin />} />
          <Route path="/elite-edge/bets" element={<EliteEdgeBets />} />
          <Route path="/palladium-2026" element={<Palladium2026Home />} />
          <Route path="/palladium-2026/privacy" element={<Palladium2026Privacy />} />
          <Route path="/palladium-2026/support" element={<Palladium2026Support />} />
        </Routes>
      </div>
      {!hideChrome && <Footer />}
    </div>
  );
}
