import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Code2,
  Globe,
  KeyRound,
  Layers,
  Mail,
  MousePointerClick,
  Rss,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
  Network,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/[0.06] bg-black/60 backdrop-blur-2xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image src="/logo.svg" alt="DakSend" width={130} height={32} priority />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-5 h-9 font-semibold text-sm">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-8 px-6 overflow-hidden">
        {/* Aurora Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black" />
          <div
            className="absolute top-0 left-0 right-0 h-[800px] animate-aurora opacity-60"
            style={{
              background:
                "linear-gradient(45deg, rgba(79,70,229,0.3) 0%, rgba(139,92,246,0.2) 25%, rgba(6,182,212,0.15) 50%, rgba(79,70,229,0.2) 75%, rgba(168,85,247,0.25) 100%)",
            }}
          />
          <div
            className="absolute top-20 left-1/4 w-[600px] h-[600px] rounded-full animate-pulse-glow"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full animate-pulse-glow animation-delay-1000"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm text-indigo-300 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>New: AI Assistant &amp; 6 email providers</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold tracking-tight leading-[1.05]">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
              Send emails that
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              actually get opened.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A powerful, self-hosted email platform with an AI Assistant that drafts your emails,
            connects to any provider, and gives you full control over your deliverability and data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-12 text-base font-medium shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] transition-all flex items-center gap-2 group">
                Start sending free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="https://github.com/chetan552/dak-send" target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-full px-8 h-12 text-base font-medium border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white transition-all backdrop-blur-sm">
                <Code2 className="w-4 h-4 mr-2" /> View on GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="max-w-6xl mx-auto mt-20 relative animate-slide-up animation-delay-300">
          {/* Glow effect behind dashboard */}
          <div className="absolute -inset-4 bg-gradient-to-t from-indigo-500/20 via-purple-500/15 to-cyan-500/10 blur-3xl opacity-60 rounded-[3rem] animate-pulse-glow" />

          <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-950/90 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(99,102,241,0.3)] overflow-hidden z-10 animate-float">
            {/* Browser Chrome */}
            <div className="h-11 border-b border-white/[0.06] flex items-center px-4 gap-2 bg-zinc-900/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto bg-black/40 px-4 py-1 rounded-lg text-xs text-zinc-500 font-mono flex items-center gap-2 border border-white/[0.05]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> app.daksend.com/dashboard
              </div>
              <div className="w-16" />
            </div>

            {/* Dashboard Content */}
            <div className="flex h-[420px] md:h-[520px]">
              {/* Sidebar */}
              <div className="w-56 border-r border-white/[0.06] bg-zinc-950/50 p-4 hidden md:flex flex-col">
                <div className="flex items-center mb-6 px-2">
                  <Image src="/logo.svg" alt="DakSend" width={100} height={24} />
                </div>
                <div className="space-y-0.5 text-sm">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 font-medium">
                    <BarChart3 className="w-4 h-4" /> Dashboard
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Mail className="w-4 h-4" /> Campaigns
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Users className="w-4 h-4" /> Subscribers
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Workflow className="w-4 h-4" /> Automations
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Layers className="w-4 h-4" /> Templates
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Globe className="w-4 h-4" /> Landing Pages
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-black">J</div>
                    <div>
                      <p className="text-xs font-medium text-zinc-300">Jane Smith</p>
                      <p className="text-[10px] text-zinc-600">Pro Plan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Area */}
              <div className="flex-1 p-6 md:p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Dashboard</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Last 30 days performance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 px-3 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-zinc-400 flex items-center">Last 30 days</div>
                    <div className="h-8 px-3 bg-indigo-600 rounded-lg text-xs text-white font-medium flex items-center gap-1.5">
                      <Send className="w-3 h-3" /> New Campaign
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Emails Sent", val: "248,902", trend: "+12.5%", color: "text-emerald-400", icon: Send },
                    { label: "Open Rate", val: "46.2%", trend: "+5.2%", color: "text-emerald-400", icon: Mail },
                    { label: "Click Rate", val: "8.4%", trend: "+1.1%", color: "text-emerald-400", icon: MousePointerClick },
                    { label: "Subscribers", val: "32,847", trend: "+892", color: "text-emerald-400", icon: Users },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-500 text-xs font-medium">{stat.label}</p>
                        <stat.icon className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-white">{stat.val}</h3>
                        <span className={`${stat.color} text-[10px] font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full`}>{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart Area */}
                <div className="flex gap-3 h-[220px]">
                  {/* Line Chart */}
                  <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-zinc-400">Send Volume</p>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Opens</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Clicks</span>
                      </div>
                    </div>
                    <svg className="w-full h-[140px]" preserveAspectRatio="none" viewBox="0 0 200 80">
                      <defs>
                        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="chart-fill-2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[20, 40, 60].map((y) => (
                        <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                      ))}
                      {/* Opens area */}
                      <path d="M0 80 L0 55 Q20 48 40 42 T80 35 T120 28 T160 22 T200 18 L200 80 Z" fill="url(#chart-fill)" />
                      <polyline points="0,55 20,48 40,42 60,38 80,35 100,30 120,28 140,24 160,22 180,19 200,18" fill="none" stroke="rgb(99 102 241)" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Clicks area */}
                      <path d="M0 80 L0 68 Q20 64 40 60 T80 55 T120 50 T160 46 T200 42 L200 80 Z" fill="url(#chart-fill-2)" />
                      <polyline points="0,68 20,64 40,60 60,57 80,55 100,52 120,50 140,48 160,46 180,43 200,42" fill="none" stroke="rgb(34 211 238)" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Hover dot */}
                      <circle cx="160" cy="22" r="3" fill="rgb(99 102 241)" className="animate-pulse" />
                      <circle cx="160" cy="22" r="6" fill="rgb(99 102 241)" opacity="0.2" className="animate-ping" />
                    </svg>
                  </div>

                  {/* Mini donut chart */}
                  <div className="w-44 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hidden sm:flex flex-col items-center justify-center">
                    <p className="text-xs font-medium text-zinc-400 mb-3">Engagement</p>
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                        <circle cx="21" cy="21" r="16" fill="none" stroke="rgb(99 102 241)" strokeWidth="5"
                          strokeDasharray="46.2 100" strokeLinecap="round" />
                        <circle cx="21" cy="21" r="16" fill="none" stroke="rgb(34 211 238)" strokeWidth="5"
                          strokeDasharray="8.4 100" strokeDashoffset="-46.2" strokeLinecap="round" />
                        <circle cx="21" cy="21" r="16" fill="none" stroke="rgb(168 85 247)" strokeWidth="5"
                          strokeDasharray="5 100" strokeDashoffset="-54.6" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">59.6%</span>
                        <span className="text-[9px] text-zinc-500">Total</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-[10px] w-full">
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Opens</span><span className="text-zinc-400">46.2%</span></div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Clicks</span><span className="text-zinc-400">8.4%</span></div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Replies</span><span className="text-zinc-400">5.0%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-16 px-6 border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-zinc-500 mb-8 uppercase tracking-wider font-medium">Trusted by forward-thinking teams everywhere</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Emails Sent", value: "10M+", icon: Send },
              { label: "Active Brands", value: "2,500+", icon: Globe },
              { label: "Avg Open Rate", value: "46%", icon: Mail },
              { label: "Uptime", value: "99.9%", icon: ShieldCheck },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group">
                <item.icon className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                <span className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{item.value}</span>
                <span className="text-xs text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium mb-4">
              <Zap className="w-3.5 h-3.5" /> Powerful features
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Everything you need to scale
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Professional-grade email tools wrapped in an intuitive, lightning-fast interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]">
            {/* Feature 1: Visual Automations — Large (animated demo) */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Workflow Illustration with sequential glow */}
              <div className="absolute top-6 right-6 w-[55%] h-full opacity-60 group-hover:opacity-90 transition-all duration-700 pointer-events-none">
                <div className="flex flex-col items-center gap-3 transform -rotate-3 scale-[0.85]">
                  {/* Trigger node */}
                  <div
                    className="bg-zinc-900/90 backdrop-blur border border-indigo-500/40 rounded-xl px-5 py-3 w-56 flex items-center gap-3 animate-node-glow"
                    style={{ ["--node-glow-color" as string]: "rgba(99,102,241,0.55)" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Mail className="w-4 h-4 text-indigo-400" /></div>
                    <div><p className="text-[11px] font-medium text-white">New Subscriber</p><p className="text-[9px] text-zinc-500">Trigger → Welcome Flow</p></div>
                  </div>
                  {/* Connector with flowing dot */}
                  <div className="relative h-6 w-0.5 bg-gradient-to-b from-indigo-500/60 to-emerald-500/60">
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-connector-flow animation-delay-300"
                      style={{ boxShadow: "0 0 8px rgba(99,102,241,0.8)" }}
                    />
                  </div>
                  {/* Wait node */}
                  <div
                    className="bg-zinc-900/90 backdrop-blur border border-amber-500/40 rounded-xl px-5 py-3 w-56 flex items-center gap-3 animate-node-glow animation-delay-700"
                    style={{ ["--node-glow-color" as string]: "rgba(245,158,11,0.55)" }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-amber-400" /></div>
                    <div><p className="text-[11px] font-medium text-white">Wait 2 Days</p><p className="text-[9px] text-zinc-500">Delay → Then continue</p></div>
                  </div>
                  {/* Branch connector */}
                  <div className="flex items-start gap-12 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-emerald-500/60 to-emerald-500/60" />
                    <div className="h-5 w-0.5 bg-emerald-500/60 relative">
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-connector-flow animation-delay-1500"
                        style={{ boxShadow: "0 0 8px rgba(16,185,129,0.8)" }}
                      />
                    </div>
                    <div className="h-5 w-0.5 bg-purple-500/60 relative">
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 animate-connector-flow animation-delay-1500"
                        style={{ boxShadow: "0 0 8px rgba(168,85,247,0.8)" }}
                      />
                    </div>
                  </div>
                  {/* Branch nodes */}
                  <div className="flex gap-4">
                    <div
                      className="bg-zinc-900/90 backdrop-blur border border-emerald-500/40 rounded-lg px-3 py-2 w-28 flex items-center gap-2 animate-node-glow animation-delay-2000"
                      style={{ ["--node-glow-color" as string]: "rgba(16,185,129,0.55)" }}
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-white font-medium">Send Email</span>
                    </div>
                    <div
                      className="bg-zinc-900/90 backdrop-blur border border-purple-500/40 rounded-lg px-3 py-2 w-28 flex items-center gap-2 animate-node-glow animation-delay-2500"
                      style={{ ["--node-glow-color" as string]: "rgba(168,85,247,0.55)" }}
                    >
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[10px] text-white font-medium">Add Tag</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end max-w-[42%]">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <Workflow className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Visual Automations</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Build sophisticated drip campaigns with delays, conditional splits, and triggers. Put your subscriber engagement on autopilot.</p>
              </div>
            </div>

            {/* Feature 2: Landing Pages */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Form Illustration */}
              <div className="absolute top-4 right-2 w-40 opacity-25 group-hover:opacity-60 transition-all duration-700 pointer-events-none transform rotate-3">
                <div className="bg-zinc-900/90 border border-amber-500/30 rounded-xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <div className="w-14 h-2.5 bg-amber-500/30 rounded mx-auto mb-2" />
                  <div className="w-20 h-1.5 bg-white/10 rounded mx-auto mb-3" />
                  <div className="h-6 bg-white/[0.05] border border-white/10 rounded mb-2 px-2 flex items-center"><div className="w-12 h-1 bg-white/15 rounded" /></div>
                  <div className="h-6 bg-white/[0.05] border border-white/10 rounded mb-3 px-2 flex items-center"><div className="w-16 h-1 bg-white/15 rounded" /></div>
                  <div className="h-6 bg-amber-500/80 rounded flex items-center justify-center"><span className="text-[8px] font-bold text-black">Subscribe</span></div>
                </div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Globe className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Landing Pages</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Deploy high-converting pages and embeddable forms in seconds.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 3: Audience Segments */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Segment circles */}
              <div className="absolute top-6 right-4 w-32 h-32 opacity-25 group-hover:opacity-60 transition-all duration-700 pointer-events-none">
                <div className="relative w-full h-full">
                  <div className="absolute inset-2 rounded-full border-2 border-cyan-500/40 border-dashed" />
                  <div className="absolute top-3 left-3 w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="absolute bottom-5 right-3 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="absolute top-1 right-6 w-7 h-7 rounded-full bg-purple-500/20" />
                </div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Audience Segments</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Dynamic segments that update in real-time based on subscriber behavior and custom fields.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 4: Real-time Analytics */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Mini line chart */}
              <div className="absolute top-6 right-4 w-36 h-20 opacity-25 group-hover:opacity-60 transition-all duration-700 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="emerald-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 50 L0 35 Q15 28 30 25 T60 18 T100 8 L100 50 Z" fill="url(#emerald-fill)" />
                  <polyline points="0,35 15,28 30,25 45,20 60,18 75,14 100,8" fill="none" stroke="rgb(16 185 129)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="100" cy="8" r="2.5" fill="rgb(16 185 129)" />
                </svg>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Real-time Analytics</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Track opens, clicks, bounces, and conversions as they happen with your live dashboard.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 5: A/B Testing */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* A vs B split visual */}
              <div className="absolute top-5 right-5 w-28 h-28 opacity-20 group-hover:opacity-50 transition-all duration-700 pointer-events-none flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[9px] font-bold text-violet-400 text-center">A</div>
                  <div className="flex-1 rounded-lg bg-violet-500/30 border border-violet-500/40 flex flex-col justify-end p-1">
                    <div className="w-full bg-violet-400/60 rounded-sm" style={{ height: "55%" }} />
                  </div>
                  <div className="text-[8px] text-zinc-500 text-center">42%</div>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="text-[9px] font-bold text-fuchsia-400 text-center">B</div>
                  <div className="flex-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 flex flex-col justify-end p-1">
                    <div className="w-full bg-fuchsia-400/40 rounded-sm" style={{ height: "38%" }} />
                  </div>
                  <div className="text-[8px] text-zinc-500 text-center">31%</div>
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded-full w-4 h-4 flex items-center justify-center">✓</div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">A/B Testing</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Split-test subject lines or email bodies across your list. DakSend auto-picks the winner from live open and click data.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 6: Send Time Optimization — Large */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Bar chart animation */}
              <div className="absolute top-6 right-8 w-[45%] h-[180px] opacity-25 group-hover:opacity-60 transition-all duration-700 pointer-events-none flex items-end gap-2 px-2">
                {[
                  { h: 25, label: "6AM" },
                  { h: 35, label: "8AM" },
                  { h: 55, label: "10AM" },
                  { h: 45, label: "12PM" },
                  { h: 65, label: "2PM" },
                  { h: 90, label: "4PM", active: true },
                  { h: 70, label: "6PM" },
                  { h: 40, label: "8PM" },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md animate-bar-grow ${bar.active
                        ? "bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                        : "bg-purple-500/30"
                        }`}
                      style={{
                        height: `${bar.h}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                    <span className="text-[8px] text-zinc-600">{bar.label}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4">
                  <MousePointerClick className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Send Time Optimization</h3>
                <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">AI-powered delivery that learns when each subscriber is most engaged, then sends at the perfect moment.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 6: Email Deliverability */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Decorative check badges */}
              <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-20 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none">
                {["SPF", "DKIM", "DMARC"].map((label) => (
                  <div key={label} className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full px-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="text-[9px] font-mono text-rose-300">{label} ✓</span>
                  </div>
                ))}
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Inbox Deliverability</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Automatic SPF, DKIM, and DMARC checks. Outlook-safe HTML pipeline, plain-text alternatives, and RFC-compliant unsubscribe headers built in.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 7: RSS-to-Email — Large */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-orange-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Decorative feed items */}
              <div className="absolute top-6 right-8 w-[40%] space-y-2 opacity-20 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none">
                {["New post: Getting started with...", "New post: 10 tips for better...", "New post: Why self-hosted email..."].map((text, i) => (
                  <div key={i} className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2" style={{ opacity: 1 - i * 0.25 }}>
                    <Rss className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="text-[9px] text-orange-300 truncate">{text}</span>
                  </div>
                ))}
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-4">
                  <Rss className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">RSS-to-Email</h3>
                <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">Connect any RSS or Atom feed and DakSend automatically drafts and sends a campaign whenever new content is published. Set it once and forget it.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 8: Security & 2FA */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Decorative OTP dots */}
              <div className="absolute top-6 right-6 flex gap-1.5 opacity-20 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none">
                {[1, 1, 1, 0, 0, 0].map((filled, i) => (
                  <div key={i} className={`w-6 h-8 rounded-md border flex items-center justify-center text-xs font-mono font-bold ${filled ? "bg-sky-500/30 border-sky-400/40 text-sky-300" : "bg-zinc-800/50 border-zinc-700/50 text-zinc-600"}`}>
                    {filled ? "•" : ""}
                  </div>
                ))}
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Security & 2FA</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">TOTP two-factor auth, brute-force protection, and admin-enforced 2FA policies keep your instance locked down.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 9: AI Assistant — Large (animated demo) */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-fuchsia-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/[0.04] via-violet-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Animated AI demo */}
              <div className="absolute top-6 right-6 w-[48%] pointer-events-none">
                {/* Prompt box with typewriter effect */}
                <div className="bg-zinc-900/90 backdrop-blur border border-fuchsia-500/30 rounded-lg px-3 py-2 shadow-[0_0_20px_rgba(217,70,239,0.1)] mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <WandSparkles className="w-3 h-3 text-fuchsia-400" />
                    <span className="text-[9px] font-medium uppercase tracking-wider text-fuchsia-300/80">Prompt</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 leading-tight relative">
                    <span className="animate-ai-prompt inline-block whitespace-nowrap overflow-hidden">
                      Welcome email for new subscribers
                    </span>
                    <span className="inline-block w-[2px] h-3 align-middle bg-fuchsia-400 ml-0.5 animate-ai-caret" />
                  </div>
                </div>

                {/* Result chips that pop in sequentially each loop */}
                <div className="space-y-1.5">
                  {[
                    { label: "Draft generated · 6 blocks", icon: WandSparkles, ring: "border-fuchsia-500/30", iconClass: "text-fuchsia-400", delay: "animation-delay-1500" },
                    { label: "5 subject ideas ready", icon: Sparkles, ring: "border-violet-500/30", iconClass: "text-violet-400", delay: "animation-delay-2500" },
                    { label: "Pre-send review · 87/100", icon: ShieldCheck, ring: "border-emerald-500/30", iconClass: "text-emerald-400", delay: "animation-delay-3500" },
                    { label: "Insights ready", icon: BarChart3, ring: "border-cyan-500/30", iconClass: "text-cyan-400", delay: "animation-delay-4500" },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className={`animate-ai-chip ${row.delay} flex items-center gap-2 bg-zinc-900/90 backdrop-blur border ${row.ring} rounded-lg px-2.5 py-1.5`}
                    >
                      <row.icon className={`w-3 h-3 ${row.iconClass} flex-shrink-0`} />
                      <span className="text-[10px] text-zinc-300 truncate">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end max-w-[52%]">
                <div className="w-11 h-11 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center mb-4">
                  <WandSparkles className="w-5 h-5 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI Assistant</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Generate full emails from a prompt, get subject line suggestions, run a pre-send review,
                  and turn post-send stats into plain English. Powered by DeepSeek; off by default per brand.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-fuchsia-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>

            {/* Feature 10: Multi-Provider Email (animated demo) */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group hover:border-teal-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Animated provider switching demo */}
              <div className="absolute top-5 right-4 w-[58%] pointer-events-none">
                {/* Sent indicator that pops near the active provider each cycle */}
                <div className="relative h-3 mb-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`absolute top-0 text-[8px] font-bold text-emerald-400 animate-provider-sent`}
                      style={{
                        left: `${(i % 2) * 50 + 25}%`,
                        top: `${Math.floor(i / 2) * 0}px`,
                        animationDelay: `${i * 1.4}s`,
                      }}
                    >
                      ✓ Sent
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {["SES", "Resend", "Postmark", "SendGrid", "Mailjet", "Elastic"].map((name, i) => (
                    <div
                      key={name}
                      className="text-[9px] font-mono font-semibold px-2 py-1 rounded-md border animate-provider-light"
                      style={{ animationDelay: `${i * 1.4}s` }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center mb-4">
                  <Network className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Bring Your Own Provider</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Send through SES, Resend, Postmark, SendGrid, Mailjet, or Elastic Email — paste an API key and switch any time.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 w-28 h-28 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 relative border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/[0.08] to-transparent -z-10" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Simple setup
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Up and running in minutes
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Three simple steps to launch your first email campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-500 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-indigo-400/40 to-transparent">01</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-3">Pick Your Provider</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Choose SES, Resend, Postmark, SendGrid, Mailjet, or Elastic Email. Paste an API key and you&apos;re sending — bounce and complaint webhooks included.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px">
                <div className="w-full h-full bg-gradient-to-r from-indigo-500/40 to-transparent" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 hover:border-purple-500/30 transition-all duration-500 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-400/40 to-transparent">02</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-3">Import Subscribers</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Upload your lists via CSV, embed beautiful signup forms, or use our public API to sync from anywhere.</p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px">
                <div className="w-full h-full bg-gradient-to-r from-purple-500/40 to-transparent" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-500 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400/40 to-transparent">03</span>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-3">Send Campaigns</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Design with our visual editor, set your audience, and hit send. Watch real-time analytics roll in.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Open Source */}
      <section id="pricing" className="py-24 px-6 relative border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% open source
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
            Free forever. No catch.
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-12">
            DakSend is fully open source and self-hosted. Pay only for your email provider&apos;s usage — as low as $0.10 per 1,000 emails on SES.
          </p>

          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/[0.06] rounded-2xl p-10 max-w-lg mx-auto hover:border-indigo-500/20 transition-all duration-500">
            <div className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">$0</div>
            <p className="text-zinc-400 text-sm mb-8">per month, self-hosted</p>

            <div className="space-y-3 text-left mb-8">
              {[
                "Unlimited subscribers & campaigns",
                "6 email providers: SES, Resend, Postmark, SendGrid, Mailjet, Elastic",
                "AI Assistant: draft, subject lines, pre/post-send review",
                "Visual automation builder",
                "Custom landing pages & forms",
                "Audience segmentation",
                "Real-time analytics with CTOR",
                "GDPR compliance tools",
                "API & webhook integrations",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            <Link href="/login" className="block">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 text-base font-semibold shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-2 group">
                Deploy Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 animate-aurora opacity-30"
            style={{
              background:
                "linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(139,92,246,0.2) 25%, rgba(6,182,212,0.15) 50%, rgba(168,85,247,0.2) 75%, rgba(79,70,229,0.25) 100%)",
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-to-b from-indigo-900/30 to-zinc-950/50 border border-indigo-500/15 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/3 bg-purple-500/15 blur-[80px] rounded-full pointer-events-none" />

          <h2 className="text-4xl md:text-6xl font-bold mb-6 relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            Ready to own your<br />email stack?
          </h2>
          <p className="text-xl text-indigo-200/70 mb-10 relative z-10 max-w-xl mx-auto leading-relaxed">
            Stop paying per subscriber. Self-host DakSend and take
            full control of your deliverability, data, and design.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-10 h-14 text-lg font-bold shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)] transition-all group flex items-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="https://github.com/chetan552/dak-send" target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-full px-8 h-14 text-base font-medium border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white transition-all">
                View Source Code
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="mb-4">
                <Image src="/logo.svg" alt="DakSend" width={120} height={29} />
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                The open-source, self-hosted email marketing platform for modern brands.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Product</h4>
              <div className="space-y-3 text-sm text-zinc-500">
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="block hover:text-white transition-colors">How It Works</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
                <Link href="/login" className="block hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Resources</h4>
              <div className="space-y-3 text-sm text-zinc-500">
                <a href="#" className="block hover:text-white transition-colors">Documentation</a>
                <a href="https://github.com/chetan552/dak-send" className="block hover:text-white transition-colors">GitHub</a>
                <a href="#" className="block hover:text-white transition-colors">API Reference</a>
                <a href="#" className="block hover:text-white transition-colors">Changelog</a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Legal</h4>
              <div className="space-y-3 text-sm text-zinc-500">
                <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="block hover:text-white transition-colors">GDPR</a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">
              © {new Date().getFullYear()} DakSend. Open source under MIT License.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/chetan552/dak-send" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
