import type { Request, Response } from "express";
import { execFile } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";

export const detectFood = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No image uploaded",
    });
  }

  const tempImage = path.join(
    os.tmpdir(),
    `foodguard-${Date.now()}-${req.file.originalname}`
  );

  try {
    await fs.writeFile(tempImage, req.file.buffer);

    const pythonScript = path.resolve(
      process.cwd(),
      "python/cmafn/inference.py"
    );

    const modelPath = path.resolve(
      process.cwd(),
      "models/cmafn/cashews/best_model.pth"
    );

    execFile(
      "python",
      [pythonScript, tempImage, modelPath],
      async (error, stdout, stderr) => {
        await fs.unlink(tempImage).catch(() => {});

        if (error) {
          console.error("Python error:", stderr);
          return res.status(500).json({
            error: "Model inference failed",
          });
        }

        try {
          const result = JSON.parse(stdout);

          return res.json({
            prediction: result.prediction,
            confidence: Number(result.confidence.toFixed(2)),
            probabilities: {
              Pure: Number(result.probabilities.Pure.toFixed(2)),
              Adulterated: Number(
                result.probabilities.Adulterated.toFixed(2)
              ),
            },
            modalities_used: result.modalities_used,
            reliability: result.reliability,
          });
        } catch {
          console.error("Invalid Python output:", stdout);

          return res.status(500).json({
            error: "Invalid response from model",
          });
        }
      }
    );
  } catch (error) {
    await fs.unlink(tempImage).catch(() => {});

    return res.status(500).json({
      error: "Failed to process image",
    });
  }
};