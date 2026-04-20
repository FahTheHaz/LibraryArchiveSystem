import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // Session is PHP-side; if the API returns 401 the page handles it.
  // This component is a placeholder for any client-side auth state you add later.
  return children;
}
