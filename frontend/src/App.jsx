import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage        from "./pages/LandingPage";
import LoginPage          from "./pages/LoginPage";
import RegisterPage       from "./pages/RegisterPage";
import BrowsePage         from "./pages/BrowsePage";
import UploadPage         from "./pages/UploadPage";
import AccountPage        from "./pages/AccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import AdminUsersPage     from "./pages/AdminUsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                 element={<LandingPage />} />
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/register"         element={<RegisterPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />
        <Route path="/browse"           element={<BrowsePage />} />
        <Route path="/upload"           element={<UploadPage />} />
        <Route path="/account"          element={<AccountPage />} />
        <Route path="/admin/users"      element={<AdminUsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}
