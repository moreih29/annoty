import { Routes, Route } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/Home";
import About from "@/pages/About";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
