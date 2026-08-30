"use client";

import React, { useState } from "react";
import Link from "next/link";
import useValidator from "./useValidator";
import { HandleRegister } from "../helpers/Register";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { errorEmail, errorName, errorPassword, validate } = useValidator();
  const [errorServer, setErrorServer] = useState("");

  const handleFormSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(email, password, name)) {
      HandleRegister(password, email, name, setErrorServer);
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
            <span className="material-symbols-outlined text-[24px]">person_add</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
            Create your account
          </h2>
          <p className="text-on-surface-variant text-xs font-medium">
            Join writ.ai to experience AI-augmented cognitive writing
          </p>
        </div>

        {(errorServer || errorEmail || errorPassword || errorName) && (
          <div className="mb-6 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorServer || errorEmail || errorPassword || errorName}</span>
          </div>
        )}

        <form onSubmit={handleFormSend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 ml-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Daivik Awasthi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-low/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
              required
            />
          </div>

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
              Password (min 8 chars)
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
            className="w-full bg-gradient-to-r from-inverse-primary to-primary-container text-white py-3.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(160,120,255,0.3)] hover:opacity-90 transition-all border border-white/10 mt-2 pulse-glow"
          >
            Agree & Create Free Account
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;