import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.preprocessing import StandardScaler, OneHotEncoder, PolynomialFeatures
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, RidgeCV, LassoCV, ElasticNetCV
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Base path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.csv")

if not os.path.exists(DATA_PATH):
    print("Generating training dataset...")
    import generate_data

print("Loading dataset...")
df = pd.read_csv(DATA_PATH)

# Feature engineering
df["distance"] = ((df["latitude"] - 19.0760)**2 + (df["longitude"] - 72.8777)**2)**0.5

X = df.drop("price", axis=1)
y = df["price"]

num_cols = X.select_dtypes(include=["int64", "float64"]).columns
cat_cols = X.select_dtypes(include=["object"]).columns

preprocessor = ColumnTransformer([
    ("num", Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("poly", PolynomialFeatures(degree=2, include_bias=False)),
        ("scaler", StandardScaler())
    ]), num_cols),
    
    ("cat", Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ]), cat_cols)
])

def create_model(regressor):
    return Pipeline([
        ("prep", preprocessor),
        ("model", TransformedTargetRegressor(
            regressor=regressor,
            func=np.log1p,
            inverse_func=np.expm1
        ))
    ])

models = {
    "linear": create_model(LinearRegression()),
    "ridge": create_model(RidgeCV(alphas=np.logspace(-3, 3, 10))),
    "lasso": create_model(LassoCV(alphas=np.logspace(-3, 1, 10), cv=5, max_iter=5000)),
    "elastic": create_model(ElasticNetCV(alphas=np.logspace(-3, 1, 10), cv=5, max_iter=5000)),
    "tree": create_model(DecisionTreeRegressor(max_depth=10, random_state=42)),
    "forest": create_model(RandomForestRegressor(n_estimators=50, max_depth=15, random_state=42))
}

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

metrics_report = {}

for name, pipeline in models.items():
    print(f"Training {name} model...")
    pipeline.fit(X_train, y_train)
    
    # Save model with joblib compression (compress level 3)
    model_path = os.path.join(BASE_DIR, f"{name}_model.pkl")
    joblib.dump(pipeline, model_path, compress=3)
    
    # Evaluate performance
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    metrics_report[name] = {
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "r2": round(float(r2), 4),
        "size_kb": round(os.path.getsize(model_path) / 1024, 2)
    }

# Save metrics report
metrics_path = os.path.join(BASE_DIR, "metrics.json")
with open(metrics_path, "w") as f:
    json.dump(metrics_report, f, indent=2)

print("\nModel Training Summary:")
for name, m in metrics_report.items():
    print(f" - {name.capitalize():<8}: MAE={m['mae']:<10} R2={m['r2']:<6} Size={m['size_kb']} KB")

print("\nAll models trained, compressed, and saved successfully!")