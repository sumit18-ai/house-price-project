import pandas as pd
import numpy as np

np.random.seed(42)

# Configuration
num_samples = 10000

# Base realistic values
loc_types = ['urban', 'suburban', 'rural']
# Urban is close to center, rural is far
city_center_lat, city_center_lon = 19.0760, 72.8777

data = {
    'area': np.random.randint(500, 10000, num_samples),
    'bedrooms': np.random.randint(1, 6, num_samples),
    'bathrooms': np.random.randint(1, 5, num_samples),
    'location': np.random.choice(loc_types, num_samples, p=[0.4, 0.4, 0.2])
}

df = pd.DataFrame(data)

# Generate coordinates based on location type
# Urban: within 0.05 degrees, Suburban: 0.05 to 0.15, Rural: 0.15 to 0.3
def apply_coords(row):
    if row['location'] == 'urban':
        offset = np.random.uniform(-0.05, 0.05, 2)
    elif row['location'] == 'suburban':
        offset = np.random.uniform(0.05, 0.15, 2) * np.random.choice([-1, 1], 2)
    else:
        offset = np.random.uniform(0.15, 0.3, 2) * np.random.choice([-1, 1], 2)
    return city_center_lat + offset[0], city_center_lon + offset[1]

coords = df.apply(apply_coords, axis=1, result_type='expand')
df['latitude'] = coords[0]
df['longitude'] = coords[1]

# Feature logic for price:
# Base price per sqft
base_sqft_price = 5000 

# Multipliers
loc_multiplier = {'urban': 1.5, 'suburban': 1.0, 'rural': 0.6}

# Calculate distance
distances = ((df['latitude'] - city_center_lat)**2 + (df['longitude'] - city_center_lon)**2)**0.5

prices = (
    df['area'] * base_sqft_price * df['location'].map(loc_multiplier) +
    df['bedrooms'] * 500000 + 
    df['bathrooms'] * 200000 - 
    (distances * 10000000) # Penalty for distance
)

# Add random noise (gaussian)
noise = np.random.normal(0, int(base_sqft_price * 1000), num_samples)
df['price'] = np.maximum(prices + noise, 1000000) # Floor at 1 million

# Format to integer
df['price'] = df['price'].astype(int)

# Reorder columns
df = df[['area', 'bedrooms', 'bathrooms', 'latitude', 'longitude', 'location', 'price']]

# Save to CSV
df.to_csv('data.csv', index=False)
print(f"✅ Generated {num_samples} rows in data.csv")
