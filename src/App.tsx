import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SetupWizard } from "./pages/SetupWizard";
import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/log" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
