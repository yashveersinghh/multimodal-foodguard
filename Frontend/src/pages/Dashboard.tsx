import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { SaffronCard } from '../components/SaffronCard';
import { VanillaCard } from '../components/VanillaCard';
import { CashewCard } from '../components/CashewCard';
import { PistachioCard } from '../components/PistachioCard';
import { MilkCard } from '../components/MilkCard';
import { FeatureBento } from '../components/FeatureBento';
import { Footer } from '../components/Footer';

export function Dashboard({ onStart }: { onStart?: () => void }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] relative overflow-hidden font-sans pb-24">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-orange-100/70 via-rose-50/40 to-transparent blur-3xl pointer-events-none rounded-full" />

      <main className="max-w-7xl mx-auto px-6 pt-16 relative z-10">
        
        {/* Editorial Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-black/5 shadow-xs mb-8 text-xs font-semibold uppercase tracking-widest text-[#B55A30]"
          >
            <span>AI Multimodal Food Guard</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif-heading text-6xl sm:text-7xl lg:text-8xl font-normal leading-[1.08] text-[#111111] tracking-tight"
          >
            Detect food adulteration with <span className="italic text-[#E06D53]">multimodal precision.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg text-black/60 font-normal leading-relaxed max-w-xl mx-auto"
          >
            Multi-modal neural fusion for instant food purity testing and quality verification.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex items-center justify-center"
          >
            <button
              onClick={onStart}
              className="px-9 mb-7 py-4 bg-[#E06D53] hover:bg-[#C95B42] text-white rounded-full font-medium text-base shadow-lg shadow-[#E06D53]/25 hover:shadow-xl hover:shadow-[#E06D53]/35 transition-all duration-300 flex items-center gap-2.5 group cursor-pointer active:scale-98"
            >
              <span>Start Analyzer</span>
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>
        </section>

        {/* 5 Product Showcase Section */}
        <section className="mt-8 mb-16">
          <div className="flex items-end justify-between mb-8 px-2">
            <div>
              <p className="text-xs font-semibold text-[#B55A30] uppercase tracking-widest">Supported Products</p>
              <h2 className="font-serif-heading text-4xl font-normal text-[#111111] mt-1">
                5 Target Food Items
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 justify-items-center">
            <SaffronCard onSelect={onStart} />
            <VanillaCard onSelect={onStart} />
            <CashewCard onSelect={onStart} />
            <PistachioCard onSelect={onStart} />
            <MilkCard onSelect={onStart} />
          </div>
        </section>

        {/* System Technical Capabilities Bento */}
        <section className="mt-20">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-[#B55A30] uppercase tracking-widest">Core Capabilities</p>
            <h2 className="font-serif-heading text-4xl font-normal text-[#111111] mt-1">
              Multi-Layered Adulteration Detection
            </h2>
          </div>

          <FeatureBento />
        </section>

      <Footer />
      </main>
    </div>
  );
}

export default Dashboard;