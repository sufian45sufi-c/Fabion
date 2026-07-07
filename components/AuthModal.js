import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebaseClient";

export default function AuthModal({ isOpen, onClose, startInSignUp = false }) {
  const [isSignUp, setIsSignUp] = useState(startInSignUp);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsSignUp(startInSignUp);
      setError("");
    }
  }, [isOpen, startInSignUp]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        if (form.username) {
          await updateProfile(cred.user, { displayName: form.username });
        }
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      }
      onClose();
      window.location.href = "/chat";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] text-white flex overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-xs uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors"
      >
        ← Back
      </button>

      <aside className="hidden lg:flex w-[45%] shrink-0 items-center justify-center px-16">
        <div className="w-full max-w-[480px] flex flex-col gap-8">
          <div>
            <h1
              className="text-5xl italic"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Fabion
            </h1>
            <p className="text-2xl font-medium mt-3 leading-snug">
              The AI Operating System
              <br />
              for builders.
            </p>
            <p className="text-[#9A9A9A] mt-3 text-sm">
              Think deeper. Build faster. Work endlessly.
            </p>
          </div>

          <div className="bg-[#171717] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="text-[10px] text-[#9A9A9A] uppercase tracking-widest">
                Fabion Workspace
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[#1f1f1f] border border-[#333] rounded-lg p-3 text-[13px] font-medium text-center">
                Thread
              </div>
              <div className="bg-[#1f1f1f] border border-[#333] rounded-lg p-3 text-[13px] font-medium text-center">
                Pixel
              </div>
              <div className="bg-[#1f1f1f] border border-[#333] rounded-lg p-3 text-[13px] font-medium text-center">
                Cell
              </div>
            </div>

            <div className="mb-6">
              <div className="text-[11px] text-[#9A9A9A] uppercase mb-2">Prompt</div>
              <div className="bg-black p-4 rounded-lg border border-[#1f1f1f] text-sm">
                Build a luxury landing page for a fintech startup
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#333] border-t-white rounded-full animate-spin" />
                Thread is reasoning...
              </div>
              <div>✓ Generated <strong>24 components</strong></div>
              <div>✓ Created <strong>responsive layout</strong></div>
              <div>✓ Exported <strong>React + Tailwind code</strong></div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <span className="text-[11px] border border-[#1f1f1f] rounded-full px-3 py-1.5 text-[#9A9A9A]">
                Thread • Reasoning
              </span>
              <span className="text-[11px] border border-[#1f1f1f] rounded-full px-3 py-1.5 text-[#9A9A9A]">
                Pixel • Vision
              </span>
              <span className="text-[11px] border border-[#1f1f1f] rounded-full px-3 py-1.5 text-[#9A9A9A]">
                Cell • Memory
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="w-full lg:w-[55%] shrink-0 flex items-center justify-center px-6">
        <div className="w-full max-w-[400px] p-10 rounded-3xl border border-[#1f1f1f] bg-white/[0.02] backdrop-blur-2xl">
          <h2
            className="text-2xl italic mb-2"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            {isSignUp ? "Create account" : "Welcome back"}
          </h2>
          <p className="text-[#9A9A9A] text-sm mb-8">Continue to Fabion</p>

          {error && (
            <div className="mb-4 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {isSignUp && (
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Username"
                className="w-full bg-[#0c0c0c] border border-[#1f1f1f] px-4 py-4 rounded-xl text-white mb-4 focus:outline-none focus:border-white/40 transition-colors"
              />
            )}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full bg-[#0c0c0c] border border-[#1f1f1f] px-4 py-4 rounded-xl text-white mb-4 focus:outline-none focus:border-white/40 transition-colors"
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full bg-[#0c0c0c] border border-[#1f1f1f] px-4 py-4 rounded-xl text-white mb-4 focus:outline-none focus:border-white/40 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black rounded-xl font-semibold hover:opacity-90 hover:scale-[1.01] transition-all disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Continue →"}
            </button>
          </form>

          <div className="text-center my-5 text-[#9A9A9A] text-xs">OR</div>

          <button
            disabled
            title="GitHub sign-in not set up yet"
            className="w-full py-4 bg-transparent border border-[#1f1f1f] text-white rounded-xl font-medium opacity-50 cursor-not-allowed"
          >
            Continue with GitHub
          </button>

          <div className="mt-8 pt-6 border-t border-[#1f1f1f] text-center">
            <p className="text-xs text-[#9A9A9A]">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white underline underline-offset-4 font-medium"
              >
                {isSignUp ? "Log in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
