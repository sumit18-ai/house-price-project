import os
import sys
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np

# Configure Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("house_price_api")

app = Flask(__name__)

# Configure CORS dynamically
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS, "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_NAMES = ["linear", "ridge", "lasso", "elastic", "tree", "forest", "gb", "hist_gb"]
models = {}
metrics_data = {}

def load_resources():
    global models, metrics_data
    for name in MODEL_NAMES:
        model_path = os.path.join(BASE_DIR, f"{name}_model.pkl")
        if os.path.exists(model_path):
            models[name] = joblib.load(model_path)
            logger.info(f"Loaded high-accuracy model: {name}")
        else:
            logger.warning(f"Model file not found: {model_path}")
            
    metrics_path = os.path.join(BASE_DIR, "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            metrics_data = json.load(f)
            logger.info("Loaded model metrics report")

load_resources()

def add_features(data):
    df_feat = data.copy()
    df_feat["distance"] = ((df_feat["latitude"] - 19.0760)**2 + (df_feat["longitude"] - 72.8777)**2)**0.5
    df_feat["log_distance"] = np.log1p(df_feat["distance"])
    df_feat["total_rooms"] = df_feat["bedrooms"] + df_feat["bathrooms"]
    df_feat["area_per_room"] = df_feat["area"] / (df_feat["total_rooms"] + 1e-5)
    df_feat["bed_bath_ratio"] = df_feat["bedrooms"] / (df_feat["bathrooms"] + 1e-5)
    df_feat["sqft_per_bed"] = df_feat["area"] / (df_feat["bedrooms"] + 1e-5)
    return df_feat

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "online",
        "service": "House Price Prediction High-Accuracy API",
        "version": "1.1.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "models": "/api/v1/models/info"
        }
    })

@app.route("/health", methods=["GET"])
def health():
    loaded_count = len(models)
    is_ready = loaded_count > 0
    status_code = 200 if is_ready else 503
    return jsonify({
        "status": "UP" if is_ready else "DOWN",
        "models_loaded": loaded_count,
        "total_models": len(MODEL_NAMES),
        "available_models": list(models.keys())
    }), status_code

@app.route("/api/v1/models/info", methods=["GET"])
def get_models_info():
    return jsonify({
        "models": list(models.keys()),
        "metrics": metrics_data,
        "default_model": "hist_gb"
    })

def validate_input(data):
    if not isinstance(data, dict):
        return False, "Request body must be a JSON object"
    
    required_fields = ["area", "bedrooms", "bathrooms", "latitude", "longitude", "location"]
    missing = [field for field in required_fields if field not in data]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"
    
    try:
        area = float(data["area"])
        bedrooms = int(data["bedrooms"])
        bathrooms = int(data["bathrooms"])
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])
        location = str(data["location"]).lower()
    except (ValueError, TypeError) as e:
        return False, f"Invalid data types: {str(e)}"
    
    if area <= 0 or area > 100000:
        return False, "Area must be between 1 and 100,000 sq ft"
    if bedrooms < 1 or bedrooms > 50:
        return False, "Bedrooms must be between 1 and 50"
    if bathrooms < 1 or bathrooms > 50:
        return False, "Bathrooms must be between 1 and 50"
    if not (-90 <= latitude <= 90):
        return False, "Latitude must be between -90 and 90"
    if not (-180 <= longitude <= 180):
        return False, "Longitude must be between -180 and 180"
    if location not in ["urban", "suburban", "rural"]:
        return False, "Location must be 'urban', 'suburban', or 'rural'"
        
    return True, {
        "area": area,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "latitude": latitude,
        "longitude": longitude,
        "location": location
    }

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 200

    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    raw_data = request.get_json(silent=True)
    if raw_data is None:
        return jsonify({"error": "Invalid JSON format"}), 400

    valid, result = validate_input(raw_data)
    if not valid:
        return jsonify({"error": result}), 422

    validated_data = result
    logger.info(f"Processing prediction for area={validated_data['area']}, location={validated_data['location']}")

    df = pd.DataFrame([validated_data])
    df = add_features(df)

    results = {}
    for name, model in models.items():
        try:
            results[name] = float(model.predict(df)[0])
        except Exception as e:
            logger.error(f"Error predicting with model {name}: {str(e)}")
            results[name] = 0.0

    # High accuracy ensemble weighting
    hist_gb_val = results.get("hist_gb", 0.0)
    gb_val = results.get("gb", 0.0)
    forest_val = results.get("forest", 0.0)
    
    if hist_gb_val > 0 and gb_val > 0 and forest_val > 0:
        primary_price = 0.50 * hist_gb_val + 0.30 * gb_val + 0.20 * forest_val
    elif hist_gb_val > 0:
        primary_price = hist_gb_val
    else:
        primary_price = results.get("forest", results.get("linear", 0.0))

    response = {
        "price": primary_price,
        "linear": results.get("linear", 0.0),
        "ridge": results.get("ridge", 0.0),
        "lasso": results.get("lasso", 0.0),
        "elastic": results.get("elastic", 0.0),
        "tree": results.get("tree", 0.0),
        "forest": results.get("forest", 0.0),
        "gb": results.get("gb", 0.0),
        "hist_gb": results.get("hist_gb", 0.0),
        "metrics": metrics_data
    }

    return jsonify(response)

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)