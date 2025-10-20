import { Routes, Route, Navigate } from "react-router-dom";
import ExcelInsertPage from "./pages/ExelInsertPage";
import NewCompaniesPage from "./pages/NewCompaniesPage";
//123
export default function App() {

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/excel" replace />} />
      <Route path="/excel" element={<ExcelInsertPage />} />
      <Route path="/new-companies" element={<NewCompaniesPage />} />
    </Routes>
  );
}
