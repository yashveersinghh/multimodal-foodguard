import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">

        {/* Brand / marker */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#E06D53]/10 flex items-center justify-center">
            <Compass className="w-7 h-7 text-[#E06D53]" />
          </div>
        </div>

        {/* 404 */}
        <p className="font-mono text-sm tracking-[0.25em] text-[#E06D53] uppercase mb-4">
          Error 404
        </p>

        <h1 className="font-serif-heading text-5xl md:text-6xl font-normal text-[#111111] mb-5">
          Page not found
        </h1>

        <p className="text-base md:text-lg text-black/50 leading-relaxed max-w-md mx-auto mb-9">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Action */}
        <Button
          onClick={() => window.history.back()}
          className="rounded-xl bg-[#111111] text-white hover:bg-[#222222] px-6 h-11"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>

        {/* Small footer detail */}
        <div className="mt-12 pt-6 border-t border-black/5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-black/30">
            FoodGuard · Food Adulteration Detection
          </p>
        </div>
      </div>
    </div>
  );
}