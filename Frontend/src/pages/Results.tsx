import React from "react";
import { format } from "date-fns";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  BrainCircuit,
  Image as ImageIcon,
  Clock3,
  Info,
} from "lucide-react";

import { AnalysisResult } from "../types";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Gauge } from "../components/Gauge";

export function Results({
  result,
  onNewAnalysis,
}: {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}) {
  const isPure = result.prediction === "Pure";

  const confidence =
    result.confidence <= 1
      ? result.confidence
      : result.confidence;

  const pureProbability =
    result.probabilities?.Pure ?? 0;

  const adulteratedProbability =
    result.probabilities?.Adulterated ?? 0;

  const modalityEntries = result.modalities_used
    ? Object.entries(result.modalities_used)
    : [];

  const formatModalityName = (name: string) => {
    if (name === "tabular") return "Tabular / Sensor";
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#B55A30]">
              Detection Report
            </span>
          </div>

          <h1 className="font-serif-heading text-4xl font-normal text-[#111111]">
            {result.product} Analysis
          </h1>

          <p className="text-sm text-black/50 font-mono mt-2">
            ID: {result.id ?? "N/A"} ·{" "}
            {result.timestamp
              ? format(new Date(result.timestamp), "PP HH:mm:ss")
              : "Just now"}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={onNewAnalysis}
          className="rounded-xl border-black/10 bg-white hover:bg-[#FAF8F5]"
          data-testid="button-new-analysis"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">

        <TabsList className="w-full justify-start border-b border-black/5 rounded-none bg-transparent h-auto p-0 mb-8 space-x-7">
          {["Overview", "Model Analysis", "Details"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase().replace(" ", "-")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E06D53] data-[state=active]:bg-transparent px-2 py-3 text-sm font-medium text-black/45 data-[state=active]:text-[#111111]"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent
          value="overview"
          className="space-y-7 animate-in fade-in duration-300"
        >

          {/* Verdict */}
          <div
            className={`rounded-2xl border p-7 md:p-8 ${
              isPure
                ? "bg-[#F4F8F3] border-[#D8E8D5]"
                : "bg-[#FBF1EE] border-[#EBCFC7]"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">

              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  isPure
                    ? "bg-[#E4F0E1] text-[#4D7C45]"
                    : "bg-[#F4DDD7] text-[#A94C35]"
                }`}
              >
                {isPure ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : (
                  <ShieldAlert className="w-8 h-8" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2
                    className={`text-2xl font-semibold ${
                      isPure
                        ? "text-[#4D7C45]"
                        : "text-[#A94C35]"
                    }`}
                  >
                    {isPure
                      ? "Sample Authenticated"
                      : "Adulteration Detected"}
                  </h2>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                      isPure
                        ? "bg-white/70 text-[#4D7C45]"
                        : "bg-white/70 text-[#A94C35]"
                    }`}
                  >
                    {result.prediction}
                  </span>
                </div>

                <p className="text-sm text-black/55 max-w-2xl">
                  CMAFN analysis completed for{" "}
                  <span className="font-medium text-[#111111]">
                    {result.product}
                  </span>
                  .
                </p>
              </div>

              <div className="md:text-right shrink-0">
                <p className="text-[11px] uppercase tracking-wider text-black/40 mb-1">
                  Confidence
                </p>
                <p className="text-4xl font-mono font-semibold text-[#111111]">
                  {confidence.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Probability + reliability */}
          <div className="grid lg:grid-cols-3 gap-5">

            <div className="lg:col-span-2 bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <div className="flex items-start justify-between mb-7">
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    Prediction Probabilities
                  </h3>
                  <p className="text-xs text-black/40 mt-1">
                    Class probabilities returned by CMAFN.
                  </p>
                </div>

                <BrainCircuit className="w-5 h-5 text-[#E06D53]" />
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <Gauge
                  value={pureProbability / 100}
                  label="Pure"
                  color="text-[#5C8A54]"
                />

                <Gauge
                  value={adulteratedProbability / 100}
                  label="Adulterated"
                  color="text-[#C15A43]"
                />
              </div>
            </div>

            <div className="bg-[#111111] text-white rounded-2xl p-7">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-sm font-semibold">
                    Analysis Reliability
                  </h3>
                  <p className="text-xs text-white/45 mt-1">
                    Based on available modalities.
                  </p>
                </div>

                <Info className="w-5 h-5 text-[#E06D53]" />
              </div>

              <div className="flex items-end gap-3">
                <span className="text-4xl font-mono font-semibold">
                  {result.reliability ?? "Unknown"}
                </span>
              </div>

              <div className="mt-7 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    result.reliability === "High"
                      ? "w-full bg-[#7BA66E]"
                      : result.reliability === "Medium"
                      ? "w-2/3 bg-[#D99A45]"
                      : "w-1/3 bg-[#C15A43]"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Modalities */}
          <div className="bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[#111111]">
                  Modalities Used
                </h3>
                <p className="text-xs text-black/40 mt-1">
                  Inputs available to CMAFN for this inference.
                </p>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-wider text-[#B55A30]">
                CMAFN
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {modalityEntries.map(([modality, used]) => (
                <div
                  key={modality}
                  className="rounded-xl border border-black/5 bg-[#FAF8F5] p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[#111111]">
                      {formatModalityName(modality)}
                    </p>

                    <p className="text-[11px] text-black/40 mt-1">
                      {used ? "Available for inference" : "Not provided"}
                    </p>
                  </div>

                  {used ? (
                    <CheckCircle2 className="w-5 h-5 text-[#5C8A54]" />
                  ) : (
                    <CircleOff className="w-5 h-5 text-black/20" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current image, when available */}
          {result.imageDataUrl && (
            <div className="bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <div className="flex items-start gap-3 mb-5">
                <ImageIcon className="w-5 h-5 text-[#E06D53]" />

                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    Visual Input
                  </h3>
                  <p className="text-xs text-black/40 mt-1">
                    Image supplied to the visual branches of CMAFN.
                  </p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden bg-[#FAF8F5] border border-black/5 min-h-[280px] flex items-center justify-center">
                <img
                  src={result.imageDataUrl}
                  alt={`${result.product} sample`}
                  className="max-h-[520px] max-w-full object-contain"
                />
              </div>
            </div>
          )}

        </TabsContent>

        {/* MODEL ANALYSIS */}
        <TabsContent
          value="model-analysis"
          className="animate-in fade-in duration-300"
        >
          <div className="grid lg:grid-cols-2 gap-6">

            <div className="bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <div className="flex items-start gap-3 mb-6">
                <BrainCircuit className="w-5 h-5 text-[#E06D53]" />

                <div>
                  <h2 className="text-lg font-semibold text-[#111111]">
                    CMAFN
                  </h2>

                  <p className="text-xs text-black/40 mt-1">
                    Cross-Modal Attention Fusion Network
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Image branch", result.modalities_used?.image],
                  ["Spectral branch", result.modalities_used?.spectral],
                  ["Tabular branch", result.modalities_used?.tabular],
                ].map(([label, enabled]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#FAF8F5]"
                  >
                    <span className="text-sm text-[#111111]">
                      {label}
                    </span>

                    <span
                      className={`text-[11px] font-mono uppercase tracking-wider ${
                        enabled
                          ? "text-[#5C8A54]"
                          : "text-black/35"
                      }`}
                    >
                      {enabled ? "Active" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <div className="flex items-start gap-3 mb-6">
                <Clock3 className="w-5 h-5 text-[#E06D53]" />

                <div>
                  <h2 className="text-lg font-semibold text-[#111111]">
                    Inference Summary
                  </h2>

                  <p className="text-xs text-black/40 mt-1">
                    High-level output returned by the backend.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <span className="text-sm text-black/45">
                    Product
                  </span>
                  <span className="text-sm font-medium">
                    {result.product}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <span className="text-sm text-black/45">
                    Prediction
                  </span>
                  <span className="text-sm font-semibold">
                    {result.prediction}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-black/5">
                  <span className="text-sm text-black/45">
                    Confidence
                  </span>
                  <span className="text-sm font-mono font-semibold">
                    {confidence.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-black/45">
                    Reliability
                  </span>
                  <span className="text-sm font-medium">
                    {result.reliability ?? "Unknown"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </TabsContent>

        {/* DETAILS */}
        <TabsContent
          value="details"
          className="animate-in fade-in duration-300"
        >
          <div className="grid lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <h3 className="text-sm font-semibold text-[#111111] mb-4">
                Raw Inference Output
              </h3>

              <div className="bg-[#111111] rounded-xl p-5 max-h-[440px] overflow-auto">
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>

            <div className="bg-white border border-black/5 rounded-2xl p-7 shadow-[0_8px_30px_rgba(17,17,17,0.03)]">
              <h3 className="text-sm font-semibold text-[#111111] mb-5">
                Detection Summary
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-black/35 mb-1">
                    Model
                  </p>
                  <p className="text-sm font-medium">
                    CMAFN
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-black/35 mb-1">
                    Product
                  </p>
                  <p className="text-sm font-medium">
                    {result.product}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-black/35 mb-1">
                    Prediction
                  </p>
                  <p className="text-sm font-medium">
                    {result.prediction}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-black/35 mb-1">
                    Device
                  </p>
                  <p className="text-sm font-mono">
                    {typeof result.rawJson?.device === "string"
                      ? result.rawJson.device
                      : "Backend"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Results;