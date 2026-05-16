import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../api/auth";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }
    verifyEmail(token).then(({ ok, data }) => {
      if (ok) {
        setStatus("success");
        setMessage(data.message || "Email verified. You can now log in.");
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed. The link may be expired or already used.");
      }
    });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
        {status === "loading" && (
          <p className="text-gray-500 text-sm">Verifying your email...</p>
        )}
        {status === "success" && (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Email verified</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm">Go to login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-red-500 text-4xl mb-4">✕</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Verification failed</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link to="/register" className="text-blue-600 hover:underline text-sm">Back to registration</Link>
          </>
        )}
      </div>
    </div>
  );
}
