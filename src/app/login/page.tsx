"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import validator from "validator";
import axios from "axios";

const Login: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorServer, setErrorServer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorServer("");

    if (!validator.isEmail(email)) {
      setErrorServer("Please enter a valid email address.");
      return;
    }

    if (validator.isEmpty(password)) {
      setErrorServer("Password is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/login", {
        email,
        password,
      });

      if (response.data.success) {
        router.push("/account");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        "Authentication failed. Please check your credentials.";
      setErrorServer(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Background Aurora */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      {/* Top Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <span className="font-bold text-xl text-on-surface tracking-wide">writ.ai</span>
        </Link>
      </div>

      {/* Main Glass Card */}
      <div className="w-full max-w-md bg-surface-container-lowest/50 border border-white/10 rounded-3xl p-8 glass-edge shadow-2xl relative z-10 backdrop-blur-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
            Welcome back to writ.ai
          </h2>
          <p className="text-on-surface-variant text-xs font-medium">
            Sign in to access your cognitive workspace and AI insights
          </p>
        </div>

        {errorServer && (
          <div className="mb-6 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorServer}</span>
          </div>
        )}

        <form onSubmit={handleFormSend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-inverse-primary to-primary-container text-white py-3.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(160,120,255,0.3)] hover:opacity-90 transition-all border border-white/10 disabled:opacity-50 mt-2 pulse-glow"
          >
            {isLoading ? "Signing in..." : "Sign In to Workspace"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Create an account free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
