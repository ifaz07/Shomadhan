"""
Prank Detection Microservice
Runs facebook/bart-large-mnli locally using HuggingFace Transformers.
Exposes a FastAPI endpoint on port 5050.

Start with:
    uvicorn prank_detector:app --host 0.0.0.0 --port 5050 --reload
"""

import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F

# ── Load model once at startup ──────────────────────────────────────────────
MODEL_NAME = "facebook/bart-large-mnli"
print(f"[PrankDetector] Loading {MODEL_NAME}...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

CANDIDATE_LABELS = ["serious civic complaint", "prank or joke", "nonsense"]
print(f"[PrankDetector] Model loaded. Ready.")

app = FastAPI(title="Prank Detection Service")


class PrankRequest(BaseModel):
    title: str
    description: str = ""


class PrankResponse(BaseModel):
    is_prank: bool
    confidence_score: float
    label: str
    all_scores: dict


def zero_shot_classify(premise: str, hypothesis_template: str, label: str) -> float:
    """
    Compute NLI entailment score for a single (premise, hypothesis) pair.
    Returns the entailment probability (0-1).
    """
    hypothesis = hypothesis_template.format(label)
    inputs = tokenizer(
        premise,
        hypothesis,
        return_tensors="pt",
        truncation=True,
        max_length=1024,
        padding=True,
    )
    with torch.no_grad():
        logits = model(**inputs).logits  # [contradiction, neutral, entailment]

    # BART-MNLI: index 0=contradiction, 1=neutral, 2=entailment
    probs = F.softmax(logits, dim=-1)
    entailment_score = probs[0, 2].item()
    return entailment_score


@app.post("/detect-prank", response_model=PrankResponse)
def detect_prank(req: PrankRequest):
    text = f"{req.title.strip()}: {req.description.strip()}".strip(": ")
    hypothesis_template = "This text is a {}."

    scores = {}
    for label in CANDIDATE_LABELS:
        scores[label] = zero_shot_classify(text, hypothesis_template, label)

    # Normalize to sum to 1
    total = sum(scores.values())
    if total > 0:
        scores = {k: v / total for k, v in scores.items()}

    prank_score = scores.get("prank or joke", 0)
    nonsense_score = scores.get("nonsense", 0)
    final_score = max(prank_score, nonsense_score)

    is_prank = final_score > 0.5

    # Pick the winning label
    best_label = max(scores, key=scores.get)

    print(
        f"[PrankDetector] '{req.title[:60]}' → prank={prank_score:.3f} "
        f"nonsense={nonsense_score:.3f} civic={scores.get('serious civic complaint', 0):.3f} "
        f"→ is_prank={is_prank}"
    )

    return PrankResponse(
        is_prank=is_prank,
        confidence_score=round(final_score, 4),
        label=best_label,
        all_scores={k: round(v, 4) for k, v in scores.items()},
    )


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}
