import React from "react";
import { Github } from "lucide-react";

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="w-full bg-[#FAF8F5] mt-auto text-[#111111]">
      <div className="max-w-6xl mx-auto px-6 py-1">
        
        {/* Top Row: Brand & Navigation on Left | Icons on Right */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-3">
          
          <div className="space-y-3">
            {/* Logo */}
            <div className="font-serif-heading text-xl font-bold tracking-tight">
              FoodGuard<span className="text-[#E06D53]">.AI</span>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4 text-black/70">
            {/* Custom X / Twitter SVG */}
            {/* <a 
              href="https://twitter.com/Yashveer_tw" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-black transition-colors"
              aria-label="X (Twitter)"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a> */}

            {/* GitHub */}
            <a 
              href="https://github.com/yashveersinghh/multimodal-foodguard" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-black transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4.5 h-4.5" />
            </a>
          </div>

        </div>

        {/* Divider Line */}
        <div className="w-full h-[1px] bg-black/10 my-2" />

        {/* Bottom Row: Copyright & Credits */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-black/50">
          <p>© {new Date().getFullYear()} FoodGuard.AI. All rights reserved.</p>
          <p className="flex items-center gap-1">
            {/* Built with <span className="text-[#E06D53]">❤️</span> by <span className="font-medium text-black/80">Yashveer singh</span> */}
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;