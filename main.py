"""FastAPI service for the student mental-health-score regression model.

Run from this directory with:
    uvicorn main:app --reload
"""

from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


MODEL_PATH = Path(__file__).with_name("Mental_Health_Model.pkl")
STATIC_DIR = Path(__file__).with_name("static")

# These are the ten most frequent countries used in the notebook. Every other
# country was deliberately mapped to "Other" before the model was trained.
TOP_COUNTRIES = {
    "Australia", "Canada", "France", "Germany", "India", "Mexico", "Turkey", "UK", "USA",
}

FEATURE_COLUMNS = [
    "Study_Hours", "Age", "Avg_Daily_Usage_Hours", "Daily_Unlocks",
    "Physical_Activity_Hours", "Sleep_Hours_Per_Night", "Stress_Level", "Gender",
    "Academic_Level", "Most_Used_Platform", "Purpose_Of_Use", "Grouped_country",
]

model = joblib.load(MODEL_PATH)

app = FastAPI(
    title="Student Mental Health Score Predictor",
    description="Predicts a student's mental-health score from social-media and lifestyle information.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class StudentData(BaseModel):
    """Raw inputs used by the pipeline trained in ML_Project.ipynb."""

    age: int = Field(..., ge=1, description="Student age in years")
    gender: Literal["Female", "Male"]
    country: str = Field(..., min_length=1, description="Countries outside the training top 10 become Other")
    academic_level: Literal["High School", "Undergraduate", "Graduate"]
    most_used_platform: Literal[
        "Facebook", "Instagram", "KakaoTalk", "LINE", "LinkedIn", "Snapchat",
        "TikTok", "Twitter", "VKontakte", "WeChat", "WhatsApp", "YouTube",
    ]
    purpose_of_use: Literal["Education", "Entertainment", "Networking", "News"]
    avg_daily_usage_hours: float = Field(..., ge=0)
    daily_unlocks: int = Field(..., ge=0)
    study_hours: float = Field(..., ge=0)
    physical_activity_hours: float = Field(..., ge=0)
    sleep_hours_per_night: float = Field(..., ge=0)
    stress_level: Literal["Low", "Medium", "High", "Very High"]


def grouped_country(country: str) -> str:
    """Apply the same country feature engineering used during training."""
    country = country.strip()
    return country if country in TOP_COUNTRIES else "Other"


def build_feature_frame(data: StudentData) -> pd.DataFrame:
    """Create one raw feature row in the exact order and names the pipeline expects."""
    row = {
        "Study_Hours": data.study_hours,
        "Age": data.age,
        "Avg_Daily_Usage_Hours": data.avg_daily_usage_hours,
        "Daily_Unlocks": data.daily_unlocks,
        "Physical_Activity_Hours": data.physical_activity_hours,
        "Sleep_Hours_Per_Night": data.sleep_hours_per_night,
        "Stress_Level": data.stress_level,
        "Gender": data.gender,
        "Academic_Level": data.academic_level,
        "Most_Used_Platform": data.most_used_platform,
        "Purpose_Of_Use": data.purpose_of_use,
        "Grouped_country": grouped_country(data.country),
    }
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    """Serve the interactive prediction interface."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_PATH.name}


@app.post("/predict", tags=["Predictions"])
def predict(data: StudentData) -> dict[str, float | str]:
    """Return the estimated continuous mental-health score for one student."""
    try:
        prediction = float(model.predict(build_feature_frame(data))[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Prediction could not be generated.") from exc

    return {
        "predicted_mental_health_score": round(prediction, 2),
        "grouped_country": grouped_country(data.country),
    }
