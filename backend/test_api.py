import pytest
import json
from api import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_home_endpoint(client):
    rv = client.get('/')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert json_data['status'] == 'online'

def test_health_endpoint(client):
    rv = client.get('/health')
    assert rv.status_code in [200, 503]
    json_data = rv.get_json()
    assert 'status' in json_data
    assert 'models_loaded' in json_data

def test_models_info_endpoint(client):
    rv = client.get('/api/v1/models/info')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert 'models' in json_data

def test_predict_valid_input(client):
    payload = {
        "area": 2500,
        "bedrooms": 3,
        "bathrooms": 2,
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location": "urban"
    }
    rv = client.post('/predict', data=json.dumps(payload), content_type='application/json')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert 'price' in json_data
    assert json_data['price'] > 0

def test_predict_invalid_input(client):
    payload = {
        "area": -100,
        "bedrooms": 3,
        "bathrooms": 2,
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location": "invalid_location"
    }
    rv = client.post('/predict', data=json.dumps(payload), content_type='application/json')
    assert rv.status_code == 422
    json_data = rv.get_json()
    assert 'error' in json_data
