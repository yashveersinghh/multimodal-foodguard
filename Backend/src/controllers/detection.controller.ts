import type { Request, Response } from "express";
import { execFile } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";

const PRODUCTS = [
  "a2milk",
  "cashews",
  "pistachios",
  "saffron",
  "vanilla",
] as const;

type Product = (typeof PRODUCTS)[number];

export const detectFood = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No image uploaded",
    });
  }

  const product = String(req.body.product || "").trim().toLowerCase();
  
  if (!product) {
    return res.status(400).json({
      error: "Product is required",
      supportedProducts: PRODUCTS,
    });
  }

  if (!PRODUCTS.includes(product as Product)) {
    return res.status(400).json({
      error: `Unsupported product: ${product}`,
      supportedProducts: PRODUCTS,
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
      `models/cmafn/${product}/best_model.pth`
    );

    await fs.access(modelPath);

    execFile(
      process.env.PYTHON_COMMAND || "python",
      [pythonScript, tempImage, modelPath],
      {
        timeout: 120000,
      },
      async (error, stdout, stderr) => {
        await fs.unlink(tempImage).catch(() => {});

        if (error) {
          console.error("Python error:", stderr || error.message);

          return res.status(500).json({
            error: "Model inference failed",
          });
        }

        try {
          const result = JSON.parse(stdout);

          return res.json({
            product,
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
        } catch (parseError) {
          console.error("Invalid Python response:", stdout);

          return res.status(500).json({
            error: "Invalid response from model",
          });
        }
      }
    );
  } catch (error) {
    await fs.unlink(tempImage).catch(() => {});

    console.error("Detection error:", error);

    return res.status(500).json({
      error: "Failed to process image",
    });
  }
};