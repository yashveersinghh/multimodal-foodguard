import React from "react";
import { format, isValid } from "date-fns";
import {
  Database,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { AnalysisResult } from "../types";

interface HistoryProps {
  history: AnalysisResult[];
  onOpenResult: (res: AnalysisResult) => void;
  onClear: () => void;
}

export function History({
  history,
  onOpenResult,
  onClear,
}: HistoryProps) {
  const safeFormatDate = (ts: number | string | Date) => {
    const d = new Date(ts);

    return isValid(d)
      ? format(d, "MMM d, yyyy · HH:mm")
      : "Recent Run";
  };

  if (!history || history.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-6rem)] bg-[#FAF8F5] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center flex flex-col items-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-[#E06D53]/10 border border-[#E06D53]/20 flex items-center justify-center mb-6 shadow-xs">
            <Database className="w-7 h-7 text-[#E06D53]" />
          </div>

          <span className="text-xs font-semibold text-[#B55A30] uppercase tracking-widest mb-2">
            Audit Ledger Empty
          </span>

          <h2 className="font-serif-heading text-3xl font-normal text-[#111111]">
            No Analysis History
          </h2>

          <p className="text-sm text-black/60 mt-2 leading-relaxed">
            Your past inference runs and multimodal purity reports will
            appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-6rem)] bg-[#FAF8F5] text-[#1A1A1A] pb-24 pt-8">
      <div className="max-w-4xl mx-auto px-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-black/5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-black/5 shadow-xs mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#B55A30]">
              <Sparkles className="w-3 h-3 text-[#E06D53]" />
              <span>Inference Ledger</span>
            </div>

            <h1 className="font-serif-heading text-4xl font-normal text-[#111111] tracking-tight">
              Analysis Log
            </h1>

            <p className="text-xs text-black/60 mt-1">
              Previous food authenticity inference records.
            </p>
          </div>

          <button
            onClick={onClear}
            data-testid="button-clear-history"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/80 text-xs font-medium transition-all duration-200 cursor-pointer self-start sm:self-auto shadow-xs active:scale-98"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Ledger</span>
          </button>
        </div>

        {/* History List */}
        <div className="space-y-3.5">
          {history
            .slice()
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )
            .map((run) => {
              const isAdulterated = run.prediction === "Adulterated";

              return (
                <div
                  key={run.id}
                  onClick={() => onOpenResult(run)}
                  data-testid={`history-item-${run.id}`}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/90 border border-black/5 shadow-xs hover:shadow-md hover:border-[#E06D53]/30 cursor-pointer transition-all duration-200"
                >
                  {/* Left */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail */}
                    {run.imageDataUrl ? (
                      <div className="w-14 h-14 rounded-xl bg-black/5 overflow-hidden shrink-0 border border-black/5">
                        <img
                          src={run.imageDataUrl}
                          alt={run.product || "Food Sample"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-orange-100/60 text-[#B55A30] shrink-0 border border-orange-200/50 flex items-center justify-center font-mono font-bold text-xs uppercase">
                        {(run.product || "SMP").substring(0, 3)}
                      </div>
                    )}

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base text-[#111111] truncate">
                          {run.product || "Unknown Sample"}
                        </span>

                        <span className="text-[10px] font-mono text-black/40 bg-black/5 px-2 py-0.5 rounded-md">
                          #{run.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/60">
                        <span className="font-mono text-[11px]">
                          {safeFormatDate(run.timestamp)}
                        </span>

                        {isAdulterated ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 font-medium inline-flex items-center gap-1 text-[11px]">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            Adulterated
                          </span>
                        ) : (
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium inline-flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Pure Sample
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score + Arrow */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-black/5">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">
                        Model Confidence
                      </div>

                      <div className="font-mono font-bold text-sm text-[#111111]">
                        {(run.confidence ?? 0).toFixed(2)}%
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-black/5 group-hover:bg-[#E06D53] group-hover:text-white transition-colors duration-200 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default History;