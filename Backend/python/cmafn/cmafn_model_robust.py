"""
CMAFN - ROBUST CROSS-MODAL ATTENTION FUSION NETWORK
====================================================
Production version with input validation and error handling
Handles missing modalities (spectral/tabular can be None)
UPDATED: Fixed backward compatibility with old weights
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import logging
from typing import Optional, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CrossModalAttentionModule(nn.Module):
    """Cross-Modal Attention with error handling"""
    def __init__(self, dim, num_heads=8):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        assert dim % num_heads == 0, f"dim={dim} must be divisible by num_heads={num_heads}"
        
        self.q_proj = nn.Linear(dim, dim)
        self.k_proj = nn.Linear(dim, dim)
        self.v_proj = nn.Linear(dim, dim)
        self.out_proj = nn.Linear(dim, dim)
        self.attn_dropout = nn.Dropout(0.1)
        self.norm = nn.LayerNorm(dim)
        
    def forward(self, query_features, key_value_features):
        try:
            batch_size = query_features.size(0)
            Q = self.q_proj(query_features)
            K = self.k_proj(key_value_features)
            V = self.v_proj(key_value_features)
            
            Q = Q.view(batch_size, self.num_heads, self.head_dim)
            K = K.view(batch_size, self.num_heads, self.head_dim)
            V = V.view(batch_size, self.num_heads, self.head_dim)
            
            scores = torch.einsum('bhd,bhd->bh', Q, K) / (self.head_dim ** 0.5)
            attn_weights = F.softmax(scores, dim=-1)
            attn_weights = self.attn_dropout(attn_weights)
            
            attended = (attn_weights.unsqueeze(-1) * V).reshape(batch_size, -1)
            output = self.out_proj(attended)
            return self.norm(query_features + output)
        except Exception as e:
            logger.error(f"Error in CrossModalAttention: {str(e)}")
            raise

class GatedFusion(nn.Module):
    """
    Gated Fusion with Modality Presence Awareness
    FIXED: Backward compatible with old weights (without presence mask)
    """
    def __init__(self, num_modalities, feature_dim):
        super().__init__()
        self.num_modalities = num_modalities
        self.feature_dim = feature_dim
        
        # NEW: Gate with presence mask (1028 = 256*4 + 4)
        self.gate = nn.Sequential(
            nn.Linear(feature_dim * num_modalities + num_modalities, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, num_modalities),
            nn.Softmax(dim=-1)
        )
        
        # OLD: Gate without presence mask (1024 = 256*4) - for backward compatibility
        self.gate_old = nn.Sequential(
            nn.Linear(feature_dim * num_modalities, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, num_modalities),
            nn.Softmax(dim=-1)
        )
        
    def forward(self, modality_features, presence_mask=None):
        """
        Args:
            modality_features: list of 4 tensors (batch, dim)
            presence_mask: tensor (batch, 4) with 1.0 for real, 0.0 for fallback (optional)
        """
        try:
            # Validate inputs
            assert len(modality_features) == self.num_modalities, \
                f"Expected {self.num_modalities} modalities, got {len(modality_features)}"
            
            batch_size = modality_features[0].size(0)
            
            if presence_mask is not None:
                # NEW: Use presence-aware fusion
                assert presence_mask.size() == (batch_size, self.num_modalities), \
                    f"Invalid presence_mask shape: {presence_mask.shape}"
                
                # Concatenate features with presence indicators
                concat_features = torch.cat(modality_features + [presence_mask], dim=1)
                gate_weights = self.gate(concat_features)
                
                # Mask out missing modalities and re-normalize
                gate_weights = gate_weights * presence_mask
                gate_weights = gate_weights / (gate_weights.sum(dim=1, keepdim=True) + 1e-8)
            else:
                # OLD: Fallback for compatibility (all modalities assumed present)
                concat_features = torch.cat(modality_features, dim=1)
                gate_weights = self.gate_old(concat_features)
            
            # Weighted fusion
            fused = torch.zeros_like(modality_features[0])
            for i, features in enumerate(modality_features):
                fused = fused + gate_weights[:, i:i+1] * features
            
            return fused
        except Exception as e:
            logger.error(f"Error in GatedFusion: {str(e)}")
            raise

class CMAFNRobust(nn.Module):
    """
    Robust CMAFN: Accepts None for spectral/tabular
    Loads existing weights and adds modality dropout capability
    """
    def __init__(self, n_tabular_features, spectral_length=256, num_classes=2, 
                 feature_dim=256, num_heads=8, product='cashews'):
        super().__init__()
        
        try:
            self.product = product
            self.feature_dim = feature_dim
            self.spectral_length = spectral_length
            self.num_classes = num_classes
            
            logger.info("="*80)
            logger.info("🛡️  CMAFN ROBUST - HANDLES MISSING MODALITIES")
            logger.info("="*80)
            
            # --- BRANCH 1: EfficientNet (Always Present) ---
            logger.info("📸 Loading EfficientNet backbone...")
            self.efficientnet = timm.create_model('tf_efficientnetv2_b0', pretrained=True, num_classes=0)
            with torch.no_grad():
                dummy = torch.randn(1, 3, 224, 224)
                eff_dim = self.efficientnet(dummy).shape[1]
            self.eff_projection = nn.Sequential(
                nn.Linear(eff_dim, feature_dim), 
                nn.LayerNorm(feature_dim), 
                nn.ReLU()
            )
            logger.info(f"   EfficientNet output: {eff_dim} → {feature_dim}")
            
            # --- BRANCH 2: ViT (Always Present) ---
            logger.info("🔍 Loading Vision Transformer...")
            self.vit = timm.create_model('vit_base_patch16_224', pretrained=True, num_classes=0)
            with torch.no_grad():
                vit_dim = self.vit(dummy).shape[1]
            self.vit_projection = nn.Sequential(
                nn.Linear(vit_dim, feature_dim), 
                nn.LayerNorm(feature_dim), 
                nn.ReLU()
            )
            logger.info(f"   ViT output: {vit_dim} → {feature_dim}")
            
            # --- BRANCH 3: Spectral (Optional) ---
            logger.info("🌈 Initializing spectral branch...")
            self.conv_layers = nn.Sequential(
                nn.Conv1d(1, 64, 7, padding=3), nn.BatchNorm1d(64), nn.ReLU(), nn.MaxPool1d(2),
                nn.Conv1d(64, 128, 5, padding=2), nn.BatchNorm1d(128), nn.ReLU(), nn.MaxPool1d(2),
                nn.Conv1d(128, 256, 3, padding=1), nn.BatchNorm1d(256), nn.ReLU(), nn.AdaptiveAvgPool1d(32)
            )
            enc_layer = nn.TransformerEncoderLayer(
                d_model=256, nhead=8, dim_feedforward=512, 
                dropout=0.1, batch_first=True
            )
            self.conv_transformer = nn.TransformerEncoder(enc_layer, num_layers=2)
            self.conv_projection = nn.Sequential(
                nn.Linear(256*32, feature_dim), 
                nn.LayerNorm(feature_dim), 
                nn.ReLU()
            )
            
            # ⭐ LEARNED FALLBACK FOR SPECTRAL (when missing)
            self.spectral_fallback = nn.Parameter(torch.randn(1, feature_dim) * 0.02)
            logger.info("   ✅ Spectral fallback embedding initialized")
            
            # --- BRANCH 4: Tabular (Optional) ---
            logger.info(f"📊 Initializing tabular branch ({n_tabular_features} features)...")
            d_model = 128
            self.tabular_embedding = nn.Linear(n_tabular_features, d_model)
            tab_enc_layer = nn.TransformerEncoderLayer(
                d_model=d_model, nhead=4, dim_feedforward=d_model*4, 
                dropout=0.1, batch_first=True
            )
            self.tabular_transformer = nn.TransformerEncoder(tab_enc_layer, num_layers=3)
            self.tab_projection = nn.Sequential(
                nn.Linear(d_model, feature_dim), 
                nn.LayerNorm(feature_dim), 
                nn.ReLU()
            )
            
            # ⭐ LEARNED FALLBACK FOR TABULAR (when missing)
            self.tabular_fallback = nn.Parameter(torch.randn(1, feature_dim) * 0.02)
            logger.info("   ✅ Tabular fallback embedding initialized")
            
            # --- CROSS-MODAL ATTENTION MODULES (12 pairs - unchanged from original CMAFN) ---
            logger.info("🔗 Initializing 12 cross-modal attention modules...")
            self.attn_eff_vit = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_eff_conv = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_eff_tab = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_vit_eff = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_vit_conv = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_vit_tab = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_conv_eff = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_conv_vit = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_conv_tab = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_tab_eff = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_tab_vit = CrossModalAttentionModule(feature_dim, num_heads)
            self.attn_tab_conv = CrossModalAttentionModule(feature_dim, num_heads)
            
            # --- GATED FUSION & CLASSIFIER ---
            logger.info("⚡ Initializing gated fusion...")
            self.gated_fusion = GatedFusion(num_modalities=4, feature_dim=feature_dim)
            
            self.classifier = nn.Sequential(
                nn.Linear(feature_dim, 256), 
                nn.LayerNorm(256), 
                nn.ReLU(), 
                nn.Dropout(0.3),
                nn.Linear(256, 128), 
                nn.ReLU(), 
                nn.Dropout(0.2),
                nn.Linear(128, num_classes)
            )
            
            total_params = sum(p.numel() for p in self.parameters())
            trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
            logger.info(f"📊 Total Parameters: {total_params:,}")
            logger.info(f"🎯 Trainable Parameters: {trainable_params:,}")
            logger.info("✅ Model initialization complete!")
            logger.info("="*80)
            
        except Exception as e:
            logger.error(f"❌ Error initializing CMAFNRobust: {str(e)}")
            raise

    def forward(self, image, spectral: Optional[torch.Tensor] = None, 
                tabular: Optional[torch.Tensor] = None) -> torch.Tensor:
        """
        Forward pass with optional modalities
        
        Args:
            image: (B, 3, 224, 224) - REQUIRED
            spectral: (B, 256) or (B, 1, 256) - OPTIONAL
            tabular: (B, n_features) - OPTIONAL
            
        Returns:
            logits: (B, num_classes)
        """
        try:
            # Input validation
            assert image is not None, "Image input cannot be None"
            batch_size = image.size(0)
            device = image.device
            
            # Validate image shape
            if image.dim() != 4 or image.size(1) != 3:
                raise ValueError(f"Expected image shape (B, 3, H, W), got {image.shape}")
            
            # Track which modalities are present (for gated fusion)
            presence_mask = torch.ones(batch_size, 4, device=device)  # [eff, vit, spec, tab]
            
            # ====== 1. IMAGE FEATURES (Always Present) ======
            eff_feat = self.eff_projection(self.efficientnet(image))
            vit_feat = self.vit_projection(self.vit(image))
            
            # ====== 2. SPECTRAL FEATURES (Optional) ======
            if spectral is not None:
                # Handle shape: accept (B, 256) or (B, 1, 256)
                if spectral.dim() == 2: 
                    spectral = spectral.unsqueeze(1)  # (B, 256) → (B, 1, 256)
                
                # Validate spectral length
                if spectral.size(-1) != self.spectral_length:
                    logger.warning(f"⚠️ Spectral length mismatch: {spectral.size(-1)} (expected {self.spectral_length})")
                    if spectral.size(-1) > self.spectral_length:
                        spectral = spectral[..., :self.spectral_length]
                    else:
                        logger.error("Cannot use spectral data - incorrect length")
                        spectral = None
                
                if spectral is not None:
                    conv_feat = self.conv_layers(spectral)  # (B, 256, 32)
                    conv_feat = conv_feat.permute(0, 2, 1)  # (B, 32, 256)
                    conv_feat = self.conv_transformer(conv_feat)
                    conv_feat = conv_feat.reshape(batch_size, -1)  # (B, 256*32)
                    conv_feat = self.conv_projection(conv_feat)  # (B, feature_dim)
                else:
                    conv_feat = self.spectral_fallback.expand(batch_size, -1)
                    presence_mask[:, 2] = 0.0
            else:
                # Use learned fallback embedding
                conv_feat = self.spectral_fallback.expand(batch_size, -1)
                presence_mask[:, 2] = 0.0
            
            # ====== 3. TABULAR FEATURES (Optional) ======
            if tabular is not None:
                # Validate tabular shape
                if tabular.dim() != 2:
                    raise ValueError(f"Expected tabular shape (B, F), got {tabular.shape}")
                
                tab_feat = self.tabular_embedding(tabular).unsqueeze(1)  # (B, 1, d_model)
                tab_feat = self.tabular_transformer(tab_feat).squeeze(1)  # (B, d_model)
                tab_feat = self.tab_projection(tab_feat)  # (B, feature_dim)
            else:
                # Use learned fallback embedding
                tab_feat = self.tabular_fallback.expand(batch_size, -1)
                presence_mask[:, 3] = 0.0
            
            # ====== 4. CROSS-MODAL ATTENTION (12 pairs - CMAFN core) ======
            eff_enhanced = (eff_feat + 
                           self.attn_eff_vit(eff_feat, vit_feat) + 
                           self.attn_eff_conv(eff_feat, conv_feat) + 
                           self.attn_eff_tab(eff_feat, tab_feat))
            
            vit_enhanced = (vit_feat + 
                           self.attn_vit_eff(vit_feat, eff_feat) + 
                           self.attn_vit_conv(vit_feat, conv_feat) + 
                           self.attn_vit_tab(vit_feat, tab_feat))
            
            conv_enhanced = (conv_feat + 
                            self.attn_conv_eff(conv_feat, eff_feat) + 
                            self.attn_conv_vit(conv_feat, vit_feat) + 
                            self.attn_conv_tab(conv_feat, tab_feat))
            
            tab_enhanced = (tab_feat + 
                           self.attn_tab_eff(tab_feat, eff_feat) + 
                           self.attn_tab_vit(tab_feat, vit_feat) + 
                           self.attn_tab_conv(tab_feat, conv_feat))
            
            # ====== 5. GATED FUSION (with presence awareness) ======
            fused = self.gated_fusion(
                [eff_enhanced, vit_enhanced, conv_enhanced, tab_enhanced],
                presence_mask
            )
            
            # ====== 6. CLASSIFICATION ======
            output = self.classifier(fused)
            
            # Safety check
            if torch.isnan(output).any() or torch.isinf(output).any():
                logger.error("❌ NaN or Inf detected in model output!")
                raise ValueError("Invalid model output")
            
            return output
            
        except Exception as e:
            logger.error(f"❌ Error in forward pass: {str(e)}")
            logger.error(f"   Image: {image.shape if image is not None else None}")
            logger.error(f"   Spectral: {spectral.shape if spectral is not None else None}")
            logger.error(f"   Tabular: {tabular.shape if tabular is not None else None}")
            raise