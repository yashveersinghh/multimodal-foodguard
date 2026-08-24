import sys
import json
import re
from pathlib import Path

import torch
import pandas as pd
from PIL import Image
from torchvision import transforms

from cmafn_model_robust import CMAFNRobust


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PRODUCT_CONFIG = {
    "cashews": {
        "n_tabular_features": 16,
        "spectral_length": 256,
    },
    "pistachios": {
        "n_tabular_features": 13,
        "spectral_length": 256,
    },
    "saffron": {
        "n_tabular_features": 17,
        "spectral_length": 256,
    },
    "vanilla": {
        "n_tabular_features": 15,
        "spectral_length": 256,
    },
    "a2milk": {
        "n_tabular_features": 17,
        "spectral_length": 256,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_product_from_model_path(model_path: Path) -> str:
    """
    Expected model path:

        models/cmafn/<product>/best_model.pth
    """

    product = model_path.parent.name.lower()

    if product not in PRODUCT_CONFIG:
        raise ValueError(
            f"Unsupported product '{product}'. "
            f"Expected one of: {', '.join(PRODUCT_CONFIG.keys())}"
        )

    return product


def find_project_root() -> Path:
    """
    inference.py lives at:

        Backend/python/cmafn/inference.py

    Therefore Backend is two levels above this file.
    """
    return Path(__file__).resolve().parents[2]


def find_dataset_file(product: str) -> Path | None:
    """
    Search common locations for the product dataset.

    This intentionally does not assume one exact filename.
    """

    backend_dir = find_project_root()

    candidates = [
        backend_dir / "datasets",
        backend_dir / "dataset",
        backend_dir / "data",
        backend_dir / "models" / "cmafn" / product,
        backend_dir.parent / "datasets",
        backend_dir.parent / "dataset",
        backend_dir.parent / "data",
    ]

    product_terms = {
        "cashews": ["cashew", "cashews"],
        "pistachios": ["pistachio", "pistachios"],
        "saffron": ["saffron"],
        "vanilla": ["vanilla"],
        "a2milk": ["a2", "milk", "a2milk"],
    }

    terms = product_terms[product]

    for directory in candidates:
        if not directory.exists():
            continue

        for file in directory.rglob("*"):
            if not file.is_file():
                continue

            if file.suffix.lower() not in {".xlsx", ".xls", ".csv"}:
                continue

            name = file.stem.lower()

            if any(term in name for term in terms):
                return file

    return None


def extract_sample_id(image_path: Path) -> str:
    """
    Extract a likely Sample_ID from the uploaded filename.

    Examples:

        CASH_P_0001.jpg
        CASH_A_0001.png
        SAMPLE_001.jpg

    The extension is removed and common suffixes are stripped.
    """

    stem = image_path.stem.strip()

    # Remove common augmentation/copy suffixes.
    stem = re.sub(
        r"([_-](?:copy|aug|augmentation|edited|resized))$",
        "",
        stem,
        flags=re.IGNORECASE,
    )

    return stem


def find_sample_row(dataset_path: Path, sample_id: str):
    """
    Find the row whose Sample_ID matches the image filename.
    """

    if dataset_path.suffix.lower() == ".csv":
        df = pd.read_csv(dataset_path)
    else:
        df = pd.read_excel(dataset_path)

    # Locate Sample_ID column robustly.
    sample_column = None

    for column in df.columns:
        normalized = str(column).strip().lower().replace(" ", "_")

        if normalized in {
            "sample_id",
            "sampleid",
            "sample-id",
            "id",
        }:
            sample_column = column
            break

    if sample_column is None:
        return None, df

    target = str(sample_id).strip().lower()

    matches = df[
        df[sample_column]
        .astype(str)
        .str.strip()
        .str.lower()
        == target
    ]

    if matches.empty:
        return None, df

    return matches.iloc[0], df


def extract_modalities(row, df):
    """
    Attempt to separate spectral and tabular columns.

    Spectral columns are detected from wavelength-like numeric column names.
    Remaining numeric feature columns become tabular features.

    This keeps the inference code compatible with datasets whose exact
    column names differ between products.
    """

    if row is None:
        return None, None

    numeric_columns = []

    for column in df.columns:
        if column == getattr(df, "_sample_column", None):
            continue

        value = row[column]

        try:
            numeric_value = float(value)

            if pd.notna(numeric_value):
                numeric_columns.append((column, numeric_value))
        except (ValueError, TypeError):
            continue

    if not numeric_columns:
        return None, None

    spectral = []
    tabular = []

    # Detect wavelength-style columns.
    spectral_pattern = re.compile(
        r"(?:^|[_\-\s])"
        r"(?:wl|wavelength|nm)"
        r"?"
        r"\s*\d+(?:\.\d+)?"
        r"(?:$|[_\-\s])",
        re.IGNORECASE,
    )

    for column, value in numeric_columns:
        name = str(column).strip().lower()

        if (
            "wavelength" in name
            or name.startswith("wl")
            or name.startswith("nm")
            or spectral_pattern.search(name)
        ):
            spectral.append(value)
        else:
            tabular.append(value)

    return spectral, tabular


def prepare_tensor(values, length, device):
    """
    Convert numeric values to a tensor and resize/pad to the model's
    expected dimensionality.
    """

    if values is None:
        return None

    values = [float(v) for v in values]

    tensor = torch.tensor(
        values,
        dtype=torch.float32,
        device=device,
    )

    if tensor.numel() > length:
        tensor = tensor[:length]

    elif tensor.numel() < length:
        padding = torch.zeros(
            length - tensor.numel(),
            dtype=torch.float32,
            device=device,
        )

        tensor = torch.cat([tensor, padding])

    return tensor.unsqueeze(0)


def prepare_tabular(values, length, device):
    """
    Convert tabular features to the model's expected dimensionality.
    """

    if values is None:
        return None

    values = [float(v) for v in values]

    tensor = torch.tensor(
        values,
        dtype=torch.float32,
        device=device,
    )

    if tensor.numel() > length:
        tensor = tensor[:length]

    elif tensor.numel() < length:
        padding = torch.zeros(
            length - tensor.numel(),
            dtype=torch.float32,
            device=device,
        )

        tensor = torch.cat([tensor, padding])

    return tensor.unsqueeze(0)


# ---------------------------------------------------------------------------
# Main inference
# ---------------------------------------------------------------------------

def main():

    if len(sys.argv) != 3:
        print(
            json.dumps(
                {
                    "error": (
                        "Usage: inference.py "
                        "<image_path> <model_path>"
                    )
                }
            )
        )
        sys.exit(1)

    image_path = Path(sys.argv[1])
    model_path = Path(sys.argv[2])

    try:

        # ---------------------------------------------------------------
        # Device
        # ---------------------------------------------------------------

        device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        # ---------------------------------------------------------------
        # Product
        # ---------------------------------------------------------------

        product = get_product_from_model_path(model_path)
        config = PRODUCT_CONFIG[product]

        # ---------------------------------------------------------------
        # Image preprocessing
        # ---------------------------------------------------------------

        transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    [0.485, 0.456, 0.406],
                    [0.229, 0.224, 0.225],
                ),
            ]
        )

        image = Image.open(image_path).convert("RGB")

        image_tensor = (
            transform(image)
            .unsqueeze(0)
            .to(device)
        )

        # ---------------------------------------------------------------
        # Load model
        # ---------------------------------------------------------------

        model = CMAFNRobust(
            n_tabular_features=config["n_tabular_features"],
            spectral_length=config["spectral_length"],
            num_classes=2,
            product=product,
        ).to(device)

        checkpoint = torch.load(
            model_path,
            map_location=device,
            weights_only=False,
        )

        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(
                checkpoint["model_state_dict"]
            )
        else:
            model.load_state_dict(checkpoint)

        model.eval()

        # ---------------------------------------------------------------
        # Attempt multimodal lookup
        # ---------------------------------------------------------------

        sample_id = extract_sample_id(image_path)

        dataset_path = find_dataset_file(product)

        spectral_tensor = None
        tabular_tensor = None

        modalities_used = {
            "image": True,
            "spectral": False,
            "tabular": False,
        }

        if dataset_path is not None:

            row, df = find_sample_row(
                dataset_path,
                sample_id,
            )

            if row is not None:

                spectral_values, tabular_values = extract_modalities(
                    row,
                    df,
                )

                if spectral_values:
                    spectral_tensor = prepare_tensor(
                        spectral_values,
                        config["spectral_length"],
                        device,
                    )

                    modalities_used["spectral"] = True

                if tabular_values:
                    tabular_tensor = prepare_tabular(
                        tabular_values,
                        config["n_tabular_features"],
                        device,
                    )

                    modalities_used["tabular"] = True

        # ---------------------------------------------------------------
        # CMAFN inference
        # ---------------------------------------------------------------

        with torch.no_grad():

            outputs = model(
                image_tensor,
                spectral_tensor,
                tabular_tensor,
            )

            probs = torch.softmax(
                outputs,
                dim=1,
            )[0]

            pred_idx = torch.argmax(probs).item()

        prediction = (
            "Adulterated"
            if pred_idx == 1
            else "Pure"
        )

        confidence = float(
            probs[pred_idx].item() * 100
        )

        pure_probability = float(
            probs[0].item() * 100
        )

        adulterated_probability = float(
            probs[1].item() * 100
        )

        # ---------------------------------------------------------------
        # Reliability
        # ---------------------------------------------------------------

        if confidence >= 85:
            reliability = "High"
        elif confidence >= 65:
            reliability = "Medium"
        else:
            reliability = "Low"

        # ---------------------------------------------------------------
        # Response
        # ---------------------------------------------------------------

        result = {
            "product": product,
            "prediction": prediction,
            "confidence": round(confidence, 2),
            "probabilities": {
                "Pure": round(pure_probability, 2),
                "Adulterated": round(
                    adulterated_probability,
                    2,
                ),
            },
            "modalities_used": modalities_used,
            "reliability": reliability,
            "sample_id": sample_id,
        }

        print(json.dumps(result))

    except Exception as e:

        print(
            json.dumps(
                {
                    "error": str(e),
                }
            )
        )

        sys.exit(1)


if __name__ == "__main__":
    main()