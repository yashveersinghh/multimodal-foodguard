export type FoodProduct =
  | "Saffron"
  | "Vanilla"
  | "Cashews"
  | "Pistachios"
  | "A2 Desi Cow Milk";

export interface ModalitiesUsed {
  image: boolean;
  spectral: boolean;
  tabular: boolean;
}

export interface AnalysisResult {
  id: string;
  product: FoodProduct;

  prediction: "Pure" | "Adulterated";
  confidence: number; // 0..100 from backend

  probabilities: {
    Pure: number; // 0..100
    Adulterated: number; // 0..100
  };

  modalities_used: ModalitiesUsed;
  reliability: "Low" | "Medium" | "High";

  timestamp: number;
  imageDataUrl?: string;

  // Keep the raw backend response for the Details tab
  rawJson?: Record<string, unknown>;
}