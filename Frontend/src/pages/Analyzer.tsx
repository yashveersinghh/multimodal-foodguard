import React, { useState } from "react";
import axios from "axios";
import {
  UploadCloud,
  FileType,
  Activity,
  Cpu,
  Database,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { FoodProduct, AnalysisResult } from "../types";

const API_URL = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

const PRODUCTS: FoodProduct[] = [
  "Saffron",
  "Vanilla",
  "Cashews",
  "Pistachios",
  "A2 Desi Cow Milk",
];

const STEPS = [
  "Preprocessing visual payload",
  "Applying SNV transformation to spectra",
  "Normalizing tabular telemetry",
  "Running multi-branch encoders",
  "Fusing modal embeddings",
  "Computing Grad-CAM heatmaps",
  "Synthesizing diagnostic output",
];

interface AnalyzerProps {
  onComplete: (res: AnalysisResult) => void;
  onBack?: () => void;
}

export function Analyzer({ onComplete, onBack }: AnalyzerProps) {
  const [product, setProduct] = useState<FoodProduct>("Saffron");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [spectralFile, setSpectralFile] = useState<File | null>(null);
  const [sensorFile, setSensorFile] = useState<File | null>(null);

  const [sensors, setSensors] = useState<Record<string, number>>({});
  const [sensorParseError, setSensorParseError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState(STEPS[0]);
  const [apiError, setApiError] = useState<string | null>(null);

  const sensorEnabled =
    Boolean(sensorFile) && sensorParseError == null;

  // Current backend requires an image.
  // Spectral and sensor inputs will be wired into CMAFN later.
  const canRun = Boolean(image);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    setApiError(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleSpectralUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSpectralFile(file);
  };

  const handleSensorUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSensorFile(file);
    setSensorParseError(null);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const ext = file.name.split(".").pop()?.toLowerCase();

        const parsed: Record<string, number> = {};

        if (ext === "json") {
          const obj = JSON.parse(text) as unknown;

          if (
            obj &&
            typeof obj === "object" &&
            !Array.isArray(obj)
          ) {
            for (const [key, value] of Object.entries(
              obj as Record<string, unknown>
            )) {
              const num =
                typeof value === "number"
                  ? value
                  : Number(value);

              if (Number.isFinite(num)) {
                parsed[key] = num;
              }
            }
          }
        } else {
          const lines = text
            .split(/\r?\n/g)
            .map((line) => line.trim())
            .filter(Boolean);

          for (const line of lines) {
            if (
              /^(key|name)\s*,\s*(value|val)$/i.test(line)
            ) {
              continue;
            }

            const parts = line.split(",");

            if (parts.length < 2) continue;

            const key = parts[0].trim();
            const value = Number(
              parts.slice(1).join(",").trim()
            );

            if (key && Number.isFinite(value)) {
              parsed[key] = value;
            }
          }
        }

        if (Object.keys(parsed).length === 0) {
          setSensors({});
          setSensorParseError(
            "No valid key-value numeric entries found in file."
          );
          return;
        }

        setSensors(parsed);
        setSensorParseError(null);
      } catch {
        setSensors({});
        setSensorParseError(
          "Failed to parse file. Please upload a valid CSV or JSON format."
        );
      }
    };

    reader.onerror = () => {
      setSensors({});
      setSensorParseError(
        "Error reading sensor data file."
      );
    };

    reader.readAsText(file);
  };

  const startAnalysis = async () => {
    if (!image) {
      setApiError("Please upload an image before starting analysis.");
      return;
    }

    if (!API_URL) {
      setApiError(
        "API URL is not configured. Set VITE_API_URL in Vercel project settings for production, or in Frontend/.env.local for local development."
      );
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setStepLabel(STEPS[0]);
    setApiError(null);

    let currentProgress = 0;

    // Simulated processing progress.
    // It stops at 90% until the real backend responds.
    const timer = setInterval(() => {
      currentProgress += 1;

      if (currentProgress >= 90) {
        currentProgress = 90;
      }

      setProgress(currentProgress);

      const stepIndex = Math.min(
        STEPS.length - 1,
        Math.floor(
          (currentProgress / 100) * STEPS.length
        )
      );

      setStepLabel(STEPS[stepIndex]);

      if (currentProgress >= 90) {
        clearInterval(timer);
      }
    }, 100);

    try {
      const formData = new FormData();

      // Product is sent now so the backend can select
      // the correct CMAFN checkpoint when all 5 models exist.
      formData.append("product", product);

      // Current CMAFN integration.
      formData.append("image", image);

      // Keep these ready for the future multimodal backend.
      if (spectralFile) {
        formData.append("spectral_file", spectralFile);
      }

      if (sensorEnabled) {
        formData.append(
          "sensor_data",
          JSON.stringify(sensors)
        );
      }

      const response = await axios.post<AnalysisResult>(
        `${API_URL}/api/detection`,
        formData
      );

      clearInterval(timer);

      setProgress(100);
      setStepLabel(STEPS[STEPS.length - 1]);

      const result = response.data;

      // Small delay so the completed progress state is visible.
      setTimeout(() => {
        setAnalyzing(false);
        onComplete(result);
      }, 300);
    } catch (error) {
      clearInterval(timer);

      console.error("Analysis Error:", error);

      setAnalyzing(false);

      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.error ||
          (error.code === "ERR_NETWORK"
            ? `Cannot reach the inference backend at ${API_URL || "(no API URL configured)"}. Check VITE_API_URL and confirm the backend deployment is available.`
            : error.message || "Failed to connect to the inference backend.");

        setApiError(message);
      } else {
        setApiError(
          "Failed to complete sample inference. Check backend connectivity."
        );
      }
    }
  };

  if (analyzing) {
    return (
      <div className="w-full min-h-[65vh] flex flex-col items-center justify-center py-16 px-6 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-black/10" />

          <div
            className="absolute inset-0 rounded-full border-2 border-[#E06D53] border-t-transparent animate-spin"
            style={{ animationDuration: "1.2s" }}
          />

          <Cpu className="w-8 h-8 text-[#E06D53] animate-pulse" />
        </div>

        <h2 className="font-serif-heading text-2xl font-normal text-[#111111] mb-2">
          Processing Sample Payload
        </h2>

        <p className="text-sm font-mono text-black/60 mb-8 h-6 text-center">
          {stepLabel}...
        </p>

        <div className="w-full max-w-md space-y-2">
          <Progress
            value={progress}
            className="h-2 bg-black/5"
            data-testid="progress-analysis"
          />

          <div className="flex justify-between text-[11px] text-black/40 font-mono">
            <span>START</span>

            <span className="font-semibold text-[#B55A30]">
              {Math.round(progress)}%
            </span>

            <span>COMPLETE</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back to dashboard"
              className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 text-black/60 hover:text-[#111111] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-6 h-6 text-[#E06D53]" />
            </button>
          )}

          <h1 className="font-serif-heading text-3xl font-normal text-[#111111]">
            Configure Inference Pipeline
          </h1>
        </div>

        <p className="text-sm text-black/60 font-sans">
          Select target commodity category and upload modal datasets for real-time fusion processing.
        </p>
      </div>

      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Step 1: Target Product Selection */}
      <Card className="bg-white/90 border-black/5 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-black/70">
            <span className="bg-[#FAF8F5] border border-black/10 text-[#B55A30] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
              1
            </span>

            Target Product
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRODUCTS.map((p) => {
              const selected = product === p;

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProduct(p);
                    setSensors({});
                    setApiError(null);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                    selected
                      ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                      : "bg-[#FAF8F5] text-black/70 border-black/5 hover:border-black/20"
                  }`}
                  data-testid={`button-product-${p
                    .replace(/\s+/g, "-")
                    .toLowerCase()}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Multi-Modal File Upload Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Visual Modality */}
        <Card className="bg-white/90 border-black/5 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-black/70">
              <span className="bg-[#FAF8F5] border border-black/10 text-[#B55A30] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                2
              </span>

              Visual Stream
            </CardTitle>

            <CardDescription className="text-xs text-black/50">
              Microscopic or imagery input
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-black/10 group aspect-video bg-black/5 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Sample preview"
                  className="max-h-full object-contain"
                />

                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-black/15 rounded-xl cursor-pointer hover:border-[#E06D53] hover:bg-[#FAF8F5] transition-colors p-4 text-center">
                <UploadCloud className="w-6 h-6 mb-2 text-[#E06D53]" />

                <span className="text-xs font-medium text-[#111111]">
                  Upload Image
                </span>

                <span className="text-[10px] text-black/40 mt-0.5">
                  PNG, JPG up to 10MB
                </span>

                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-image"
                />
              </Label>
            )}
          </CardContent>
        </Card>

        {/* Spectral Modality */}
        <Card className="bg-white/90 border-black/5 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-black/70">
              <span className="bg-[#FAF8F5] border border-black/10 text-[#B55A30] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                3
              </span>

              Spectral Stream
            </CardTitle>

            <CardDescription className="text-xs text-black/50">
              NIR / FTIR spectroscopy file
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {spectralFile ? (
              <div className="flex items-center gap-3 p-3 border border-black/10 rounded-xl bg-[#FAF8F5]">
                <FileType className="w-5 h-5 text-[#E06D53] shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111111] truncate">
                    {spectralFile.name}
                  </p>

                  <p className="text-[10px] text-black/40">
                    {(spectralFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSpectralFile(null)}
                  className="text-black/40 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-black/15 rounded-xl cursor-pointer hover:border-[#E06D53] hover:bg-[#FAF8F5] transition-colors p-4 text-center">
                <Activity className="w-6 h-6 mb-2 text-[#E06D53]" />

                <span className="text-xs font-medium text-[#111111]">
                  Upload Spectral Data
                </span>

                <span className="text-[10px] text-black/40 mt-0.5">
                  CSV, TXT, SPC
                </span>

                <Input
                  type="file"
                  accept=".csv,.txt,.xlsx,.spc,.dx"
                  className="hidden"
                  onChange={handleSpectralUpload}
                  data-testid="input-spectral"
                />
              </Label>
            )}
          </CardContent>
        </Card>

        {/* Sensor Modality */}
        <Card className="bg-white/90 border-black/5 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-black/70">
              <span className="bg-[#FAF8F5] border border-black/10 text-[#B55A30] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                4
              </span>

              Sensor Telemetry
            </CardTitle>

            <CardDescription className="text-xs text-black/50">
              Tabular pH, density, moisture data
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {sensorFile ? (
              <div className="flex items-center gap-3 p-3 border border-black/10 rounded-xl bg-[#FAF8F5]">
                <Database className="w-5 h-5 text-[#E06D53] shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111111] truncate">
                    {sensorFile.name}
                  </p>

                  {sensorParseError ? (
                    <p className="text-[10px] text-red-500 truncate">
                      {sensorParseError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#B55A30]">
                      Parsed {Object.keys(sensors).length} keys
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSensorFile(null);
                    setSensors({});
                    setSensorParseError(null);
                  }}
                  className="text-black/40 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-black/15 rounded-xl cursor-pointer hover:border-[#E06D53] hover:bg-[#FAF8F5] transition-colors p-4 text-center">
                <Database className="w-6 h-6 mb-2 text-[#E06D53]" />

                <span className="text-xs font-medium text-[#111111]">
                  Upload Sensor Log
                </span>

                <span className="text-[10px] text-black/40 mt-0.5">
                  CSV, JSON
                </span>

                <Input
                  type="file"
                  accept=".csv,.txt,.json"
                  className="hidden"
                  onChange={handleSensorUpload}
                  data-testid="input-sensors"
                />
              </Label>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Execution Controls */}
      <div className="pt-4 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-black/50">
          {!image &&
            "Upload an image to run the current CMAFN inference pipeline."}
        </p>

        <Button
          size="lg"
          disabled={!canRun || analyzing}
          onClick={startAnalysis}
          className="w-full sm:w-auto bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-medium px-8 py-3 h-auto cursor-pointer shadow-xs disabled:opacity-40 flex items-center justify-center gap-2"
          data-testid="button-run-analysis"
        >
          <span>Scan & Analyze Sample</span>

          <ArrowRight className="w-4 h-4 text-[#E06D53]" />
        </Button>
      </div>
    </div>
  );
}

export default Analyzer;