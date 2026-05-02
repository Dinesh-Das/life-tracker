import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, CheckSquare, BarChart3, Shield, Database, Layout } from 'lucide-react';

function Landing() {
    const { user, signIn } = useAuth();

    // If already logged in, redirect to the hub
    if (user) {
        return <Navigate to="/hub" />;
    }

    return (
        <div className="min-h-screen bg-[#1a3828] text-[#f0f7f0] font-manrope selection:bg-emerald-500/30">
            {/* Navigation Header */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="LifeTracker" className="w-10 h-10 rounded-xl shadow-lg" />
                    <span className="font-serif text-2xl font-black tracking-tight">LifeTracker</span>
                </div>
                <div className="flex gap-8 items-center text-sm font-bold uppercase tracking-widest text-[#f0f7f0]/60">
                    <button onClick={signIn} className="hover:text-[#f0f7f0] transition-colors">Login</button>
                    <button 
                        onClick={signIn}
                        className="bg-[#f0f7f0] text-[#1a3828] px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-900/20"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="px-6 pt-20 pb-32 max-w-5xl mx-auto text-center relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="font-serif text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
                        LifeTracker: <br />
                        <span className="text-emerald-400 font-serif">Your Life, Visualized.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-[#f0f7f0]/70 max-w-2xl mx-auto mb-12 leading-relaxed">
                        LifeTracker is a personal habit tracking dashboard and weekly planner. 
                        We help you monitor daily progress and achieve goals, all while storing your data privately in your own Google Sheets.
                    </p>
                    <button 
                        onClick={signIn}
                        className="group relative inline-flex items-center gap-4 bg-white text-[#1a3828] px-10 py-5 rounded-full text-xl font-black hover:bg-emerald-50 transition-all shadow-2xl shadow-black/20"
                    >
                        <span>Start Tracking Now</span>
                        <div className="bg-emerald-500 p-1 rounded-full text-white group-hover:translate-x-1 transition-transform">
                            <CheckSquare size={20} />
                        </div>
                    </button>
                </div>

                {/* Decorative Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[128px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-700 rounded-full blur-[128px]" />
                </div>
            {/* Purpose/About Section for Google Verification */}
            <section className="px-6 py-12 max-w-4xl mx-auto text-center border-t border-white/5">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-emerald-400 mb-4">About LifeTracker</h2>
                <p className="text-[#f0f7f0]/50 text-sm leading-relaxed italic">
                    Our mission is to empower individuals to take control of their personal data through transparent, self-hosted habit tracking. 
                    LifeTracker provides a visual interface for your Google Sheets, turning raw numbers into meaningful progress insights.
                </p>
            </section>

            {/* Purpose & Features Section */}
            <section className="bg-white/5 backdrop-blur-3xl py-32 px-6 border-y border-white/10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-6">
                        <div className="bg-emerald-500/20 p-4 rounded-2xl w-fit text-emerald-400">
                            <Layout size={32} />
                        </div>
                        <h3 className="text-2xl font-serif font-bold">Comprehensive Habits</h3>
                        <p className="text-[#f0f7f0]/60 leading-relaxed">
                            Monitor your physical, mental, and social growth with a beautiful year-at-a-glance habit grid.
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-emerald-500/20 p-4 rounded-2xl w-fit text-emerald-400">
                            <CheckSquare size={32} />
                        </div>
                        <h3 className="text-2xl font-serif font-bold">Weekly Planner</h3>
                        <p className="text-[#f0f7f0]/60 leading-relaxed">
                            Focus on what matters. Set primary weekly goals and track daily wins to stay aligned with your vision.
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-emerald-500/20 p-4 rounded-2xl w-fit text-emerald-400">
                            <BarChart3 size={32} />
                        </div>
                        <h3 className="text-2xl font-serif font-bold">Visual Insights</h3>
                        <p className="text-[#f0f7f0]/60 leading-relaxed">
                            Turn your data into wisdom. Beautiful charts and streaks help you identify patterns in your behavior.
                        </p>
                    </div>
                </div>
            </section>

            {/* Transparency Section */}
            <section className="py-32 px-6 max-w-7xl mx-auto text-center">
                <div className="bg-emerald-900/30 rounded-[48px] p-12 md:p-24 border border-emerald-800/50">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest mb-8">
                        <Shield size={14} />
                        Privacy First
                    </div>
                    <h2 className="font-serif text-4xl md:text-6xl font-black mb-8 leading-tight">
                        Your data stays <span className="italic">yours.</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
                        <div className="bg-[#1a3828] p-8 rounded-3xl border border-white/5">
                            <Database className="text-emerald-400 mb-6" size={32} />
                            <h4 className="text-xl font-bold mb-4">No Database</h4>
                            <p className="text-[#f0f7f0]/50 text-sm leading-relaxed">
                                We don't store your personal logs. Everything lives in a Google Sheet that you own and control completely.
                            </p>
                        </div>
                        <div className="bg-[#1a3828] p-8 rounded-3xl border border-white/5">
                            <Shield className="text-emerald-400 mb-6" size={32} />
                            <h4 className="text-xl font-bold mb-4">OAuth Secure</h4>
                            <p className="text-[#f0f7f0]/50 text-sm leading-relaxed">
                                Using Google's secure authentication, we only request permission to manage the "LifeTracker Data" file we create.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA & Mandatory Legal Footer */}
            <footer className="px-6 py-20 bg-black/20 text-center">
                <div className="max-w-7xl mx-auto">
                    <h3 className="font-serif text-3xl font-black mb-12">Ready to master your life?</h3>
                    <div className="flex flex-col items-center gap-12">
                        <button 
                            onClick={signIn}
                            className="bg-emerald-500 text-white px-12 py-5 rounded-full text-xl font-black hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/20"
                        >
                            Get Started Free
                        </button>

                        <div className="flex flex-col items-center gap-6">
                            <div className="flex gap-12 text-sm font-bold uppercase tracking-[0.2em] text-[#f0f7f0]/40">
                                <Link to="/privacy" className="hover:text-emerald-400 transition-colors border-b-2 border-transparent hover:border-emerald-400">Privacy Policy</Link>
                                <Link to="/terms" className="hover:text-emerald-400 transition-colors border-b-2 border-transparent hover:border-emerald-400">Terms of Service</Link>
                            </div>
                            <p className="text-xs text-[#f0f7f0]/20 max-w-md mx-auto">
                                LifeTracker adheres to the Google API Services User Data Policy, including Limited Use requirements. 
                                We never see, store, or sell your personal habits.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
