import sys
import json
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms

from cmafn_model_robust import CMAFNRobust


def main():
    if len(sys.argv) != 3:
        print(json.dumps({
            "error": "Usage: inference.py <image_path> <model_path>"
        }))
        sys.exit(1)

    image_path = Path(sys.argv[1])
    model_path = Path(sys.argv[2])

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Image preprocessing
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225]
            )
        ])

        image = Image.open(image_path).convert("RGB")
        image_tensor = transform(image).unsqueeze(0).to(device)

        # Cashews CMAFN model was trained with 16 tabular features
        model = CMAFNRobust(
            n_tabular_features=16,
            spectral_length=256,
            num_classes=2,
            product="cashews"
        ).to(device)

        checkpoint = torch.load(
            model_path,
            map_location=device,
            weights_only=False
        )

        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        # Image-only inference
        with torch.no_grad():
            outputs = model(
                image_tensor,
                None,  # no spectral data
                None   # no tabular data
            )

            probs = torch.softmax(outputs, dim=1)[0]
            pred_idx = torch.argmax(probs).item()

        result = {
            "prediction": "Adulterated" if pred_idx == 1 else "Pure",
            "confidence": round(float(probs[pred_idx]) * 100, 2),
            "probabilities": {
                "Pure": round(float(probs[0]) * 100, 2),
                "Adulterated": round(float(probs[1]) * 100, 2)
            },
            "modalities_used": {
                "image": True,
                "spectral": False,
                "tabular": False
            },
            "reliability": "Low"
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
    