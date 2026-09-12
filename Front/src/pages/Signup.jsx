import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Leaf, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      console.error("Supabase Signup Error:", error);
      toast.error(error.message || "Failed to create account. Check your Supabase credentials in .env");
    } else {
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Decorative background orbs */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div
        className="w-full max-w-md relative z-10 my-auto"
        style={{ marginLeft: "auto", marginRight: "auto" }}
      >
        {/* Logo Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link to="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-[Outfit] font-bold text-2xl text-white">
              Agro<span className="text-green-400">Intel</span>
            </span>
          </Link>
          <h1 className="font-[Outfit] text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm">Join AgroIntel to protect your crops with AI</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="input-field"
                  style={{ paddingLeft: "44px", paddingRight: "16px" }}
                  id="signup-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  required
                  className="input-field"
                  style={{ paddingLeft: "44px", paddingRight: "16px" }}
                  id="signup-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="input-field"
                  style={{ paddingLeft: "44px", paddingRight: "44px" }}
                  id="signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 text-gray-500 hover:text-gray-300 flex items-center justify-center p-1 rounded-md transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="input-field"
                  style={{ paddingLeft: "44px", paddingRight: "16px" }}
                  id="signup-confirm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 disabled:opacity-50 mt-3 shadow-lg shadow-green-500/20"
              id="signup-submit"
            >
              {loading ? (
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center border-t border-[#2a3a34]/60 pt-4">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
