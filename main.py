import os
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

# Vertex AI provides the model directory path via this environment variable.
# Default to a local path for testing.
model_path = os.environ.get("AIP_STORAGE_URI", "./trained_model")

# Load the model and tokenizer from the path provided by Vertex AI
emotion_pipeline = pipeline("text-classification", model=model_path, tokenizer=model_path, top_k=None)

class PredictionRequest(BaseModel):
    text: str

# Vertex AI requires health and prediction routes.
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/predict")
async def predict_emotion(request: PredictionRequest):
    try:
        predictions = emotion_pipeline(request.text)
        # The expected response format is a dictionary with a "predictions" key
        return {"predictions": predictions}
    except Exception as e:
        return {"error": str(e)}