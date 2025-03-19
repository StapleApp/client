import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigator from "./pages/Navigator";
import Home from "./pages/Home"; 
import Ayarlar from "./pages/Ayarlar";
import ArkadasEkle from "./pages/ArkadasEkle"; 
import Test from "./pages/Test"; 
import { AnimatePresence } from "framer-motion";

function App() {
  return (
    <Router>
      <div className="flex">
        <Navigator />
        <div className="flex-1">
        <AnimatedSwitch />
        </div>
      </div>
    </Router>
  );
}

function AnimatedSwitch() {
  return (
    <AnimatePresence mode="wait"> 
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Ayarlar" element={<Ayarlar />} />
        <Route path="/ArkadasEkle" element={<ArkadasEkle />} />
        <Route path="/Test" element={<Test />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
