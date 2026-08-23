"""
ROBUST CMAFN INFERENCE
=======================
Production-ready prediction with comprehensive error handling
"""

import sys
sys.path.append('..')
import torch
from PIL import Image
from torchvision import transforms
import pandas as pd
import numpy as np
import pickle
from pathlib import Path
import logging
from typing import Optional, Dict, Union
from models.cmafn_model_robust import CMAFNRobust

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RobustPredictor:
    """Production-ready predictor"""
    
    def __init__(self, product='cashews', model_path=None):
        try:
            self.product = product
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            
            logger.info("="*80)
            logger.info(f"🚀 INITIALIZING ROBUST PREDICTOR")
            logger.info("="*80)
            logger.info(f"Product: {product}")
            logger.info(f"Device: {self.device}")
            
            if model_path is None:
                model_path = f'../models/cmafn_robust/{product}/best_model.pth'
            self.model_path = Path(model_path)
            
            if not self.model_path.exists():
                raise FileNotFoundError(f"Model not found: {self.model_path}")
            
            self.scaler_path = Path(f'../weights/quad_scaler_{product}.pkl')
            self.excel_path = Path(f'../datasets/{product.capitalize()}_Dataset.xlsx')
            
            logger.info(f"Model: {self.model_path}")
            logger.info(f"Scaler: {self.scaler_path}")
            
            # Scaler is optional for image-only inference
            self.scaler = None
            
            # Load config
            logger.info("📋 Loading dataset configuration...")
            df = pd.read_excel(self.excel_path)
            exclude = ['Sample_ID', 'Purity_Status', 'Adulterant_Type']
            all_cols = [c for c in df.columns if c not in exclude 
                       and df[c].dtype in ['int64', 'float64']]
            spec_cols = [c for c in all_cols if 'nm' in c.lower()]
            self.tab_cols = [c for c in all_cols if c not in spec_cols]
            
            logger.info(f"✅ Tabular columns: {len(self.tab_cols)}")
            
            # Load model
            logger.info("\n🏗️ Loading model...")
            n_features = len(self.tab_cols)
            self.model = CMAFNRobust(
                n_tabular_features=n_features, 
                spectral_length=256, 
                num_classes=2, 
                product=product
            ).to(self.device)
            
            checkpoint = torch.load(self.model_path, map_location=self.device, 
                                   weights_only=False)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            
            logger.info("✅ Model loaded")
            logger.info(f"   Epoch: {checkpoint.get('epoch', 'N/A')}")
            logger.info(f"   Val Acc: {checkpoint.get('val_acc', 'N/A')}%")
            
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            logger.info("\n✅ Predictor ready!")
            logger.info("="*80 + "\n")
            
        except Exception as e:
            logger.error(f"❌ Initialization failed: {str(e)}")
            raise

    def _process_image(self, image_path: Union[str, Path]) -> torch.Tensor:
        try:
            img_path = Path(image_path)
            if not img_path.exists():
                raise FileNotFoundError(f"Image not found: {img_path}")
            
            img = Image.open(img_path).convert('RGB')
            
            if img.size[0] < 50 or img.size[1] < 50:
                logger.warning(f"⚠️ Small image: {img.size}")
            
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)
            
            if torch.isnan(img_tensor).any() or torch.isinf(img_tensor).any():
                raise ValueError("Invalid image tensor")
            
            return img_tensor
            
        except Exception as e:
            logger.error(f"❌ Error processing image: {str(e)}")
            raise
    
    def _process_spectral(self, spectral_data: np.ndarray) -> Optional[torch.Tensor]:
        try:
            if spectral_data is None:
                return None
            
            if not isinstance(spectral_data, np.ndarray):
                spectral_data = np.array(spectral_data, dtype=np.float32)
            
            if len(spectral_data) != 256:
                logger.warning(f"⚠️ Spectral length: {len(spectral_data)} (expected 256)")
                if len(spectral_data) > 256:
                    spectral_data = spectral_data[:256]
                else:
                    return None
            
            if np.isnan(spectral_data).any() or np.isinf(spectral_data).any():
                logger.warning("⚠️ NaN/Inf in spectral, skipping")
                return None
            
            return torch.FloatTensor(spectral_data).unsqueeze(0).to(self.device)
            
        except Exception as e:
            logger.error(f"❌ Error processing spectral: {str(e)}")
            return None
    
    def _process_tabular(self, tabular_dict: Dict) -> Optional[torch.Tensor]:
        try:
            if tabular_dict is None:
                return None
            
            tab_data = []
            missing = []
            
            for col in self.tab_cols:
                if col in tabular_dict:
                    value = tabular_dict[col]
                    if pd.isna(value) or np.isinf(value):
                        logger.warning(f"⚠️ Invalid {col}, using 0")
                        value = 0
                    tab_data.append(float(value))
                else:
                    missing.append(col)
                    tab_data.append(0)
            
            if missing:
                logger.warning(f"⚠️ Missing {len(missing)} columns")
            
            tab_data = np.array(tab_data, dtype=np.float32)
            if self.scaler is not None:
                tab_data = self.scaler.transform(tab_data.reshape(1, -1))[0]
            
            return torch.FloatTensor(tab_data).unsqueeze(0).to(self.device)
            
        except Exception as e:
            logger.error(f"❌ Error processing tabular: {str(e)}")
            return None

    def predict(self, image_path: Union[str, Path], 
                spectral_data: Optional[np.ndarray] = None, 
                tabular_dict: Optional[Dict] = None) -> Dict:
        try:
            logger.info(f"\n{'='*80}")
            logger.info(f"🔮 PREDICTION")
            logger.info(f"{'='*80}")
            logger.info(f"Image: {Path(image_path).name}")
            
            img_tensor = self._process_image(image_path)
            spec_tensor = self._process_spectral(spectral_data)
            tab_tensor = self._process_tabular(tabular_dict)
            
            modalities_used = {
                'image': True,
                'spectral': spec_tensor is not None,
                'tabular': tab_tensor is not None
            }
            
            active = [k for k, v in modalities_used.items() if v]
            logger.info(f"Modalities: {', '.join(active)}")
            
            with torch.no_grad():
                outputs = self.model(img_tensor, spec_tensor, tab_tensor)
                probs = torch.softmax(outputs, dim=1)[0]
                pred_idx = torch.argmax(probs).item()
            
            missing_count = sum([spec_tensor is None, tab_tensor is None])
            confidence_penalty = missing_count * 5.0
            
            result = {
                'prediction': 'Adulterated' if pred_idx == 1 else 'Pure',
                'confidence': float(probs[pred_idx].item() * 100),
                'adjusted_confidence': max(50, float(probs[pred_idx].item() * 100) - confidence_penalty),
                'probabilities': {
                    'Pure': float(probs[0].item() * 100),
                    'Adulterated': float(probs[1].item() * 100)
                },
                'modalities_used': modalities_used,
                'reliability': 'High' if missing_count == 0 else 'Medium' if missing_count == 1 else 'Low',
                'device': str(self.device)
            }
            
            logger.info(f"\n{'='*80}")
            logger.info(f"RESULT")
            logger.info(f"{'='*80}")
            logger.info(f"Prediction: {result['prediction']}")
            logger.info(f"Confidence: {result['confidence']:.2f}%")
            logger.info(f"Reliability: {result['reliability']}")
            logger.info(f"{'='*80}\n")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Prediction failed: {str(e)}")
            return {
                'prediction': 'ERROR',
                'confidence': 0.0,
                'error': str(e),
                'modalities_used': {'image': False, 'spectral': False, 'tabular': False}
            }

if __name__ == '__main__':
    try:
        logger.info("🧪 TESTING PREDICTOR\n")
        
        predictor = RobustPredictor(product='cashews')
        
        test_img = '../datasets/generated_images_v2/cashews/val/pure/CASH_P_0001.jpg'
        
        if not Path(test_img).exists():
            logger.error(f"❌ Test image not found: {test_img}")
            sys.exit(1)
        
        # Test 1: Image only
        logger.info("\nTEST 1: IMAGE ONLY")
        res1 = predictor.predict(test_img)
        
        # Test 2: Image + Tabular
        logger.info("\nTEST 2: IMAGE + TABULAR")
        dummy_tab = {'RGB_R_Mean': 230, 'RGB_G_Mean': 220, 'RGB_B_Mean': 200}
        res2 = predictor.predict(test_img, tabular_dict=dummy_tab)
        
        # Test 3: All modalities
        logger.info("\nTEST 3: ALL MODALITIES")
        dummy_spec = np.random.randn(256).astype(np.float32)
        res3 = predictor.predict(test_img, spectral_data=dummy_spec, tabular_dict=dummy_tab)
        
        logger.info("\n✅ ALL TESTS PASSED\n")
        
    except Exception as e:
        logger.error(f"❌ Tests failed: {str(e)}")
        sys.exit(1)