import sys
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_dir))

# Mock motor on import before importing server
sys.modules['motor'] = MagicMock()
sys.modules['motor.motor_asyncio'] = MagicMock()

# Setup environment variables for import
import os
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "test_db"
os.environ["JWT_SECRET"] = "test_jwt_secret"

import jwt
from fastapi import HTTPException
from server import login_jwt, LoginJWTRequest, ALGORITHM

# SSO configuration for tests
TEST_SSO_SECRET = "my_jwt_sso_test_secret"
MOCK_SETTINGS = {
    "jwt_sso_enabled": True,
    "jwt_sso_secret": TEST_SSO_SECRET
}

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
@patch("server.db")
async def test_login_jwt_success_existing_user(mock_db):
    # Prepare mock settings and user
    mock_db.settings.find_one = AsyncMock(return_value=MOCK_SETTINGS)
    
    mock_user = {
        "user_id": "test-uuid-123",
        "email": "k.backhaus@mso-hef.de",
        "name": "Old Name",
        "role": "user",
        "auth_source": "ldap"  # Testing merging with existing LDAP user
    }
    mock_db.users.find_one = AsyncMock(return_value=mock_user)
    mock_db.users.update_one = AsyncMock(return_value=None)
    
    # Create valid external JWT token (using payload format requested)
    token_payload = {
        "username": "k.backhaus",
        "email": "k.backhaus@mso-hef.de",
        "display_name": "OStD Karsten Backhaus"
    }
    external_token = jwt.encode(token_payload, TEST_SSO_SECRET, algorithm=ALGORITHM)
    
    # Call the endpoint handler function directly
    request_data = LoginJWTRequest(token=external_token)
    response = await login_jwt(request_data)
    
    assert response.token is not None
    assert response.user["email"] == "k.backhaus@mso-hef.de"
    assert response.user["name"] == "OStD Karsten Backhaus"
    
    # Verify DB interactions: finding user and updating/merging details
    mock_db.users.find_one.assert_called_once_with({"email": "k.backhaus@mso-hef.de"}, {"_id": 0})
    mock_db.users.update_one.assert_called_once()
    # Confirm name update in db call
    args, kwargs = mock_db.users.update_one.call_args
    assert args[0] == {"user_id": "test-uuid-123"}
    assert "$set" in args[1]
    assert args[1]["$set"]["name"] == "OStD Karsten Backhaus"

@pytest.mark.anyio
@patch("server.db")
async def test_login_jwt_success_new_user(mock_db):
    # Prepare mock settings and users
    mock_db.settings.find_one = AsyncMock(return_value=MOCK_SETTINGS)
    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=None)
    mock_db.users.update_one = AsyncMock(return_value=None)
    
    token_payload = {
        "username": "k.backhaus",
        "email": "k.backhaus@mso-hef.de",
        "display_name": "OStD Karsten Backhaus"
    }
    external_token = jwt.encode(token_payload, TEST_SSO_SECRET, algorithm=ALGORITHM)
    
    request_data = LoginJWTRequest(token=external_token)
    response = await login_jwt(request_data)
    
    assert response.token is not None
    assert response.user["email"] == "k.backhaus@mso-hef.de"
    assert response.user["name"] == "OStD Karsten Backhaus"
    assert response.user["auth_source"] == "jwt"
    
    # Verify user was inserted
    mock_db.users.insert_one.assert_called_once()

@pytest.mark.anyio
@patch("server.db")
async def test_login_jwt_disabled(mock_db):
    # SSO disabled in settings
    disabled_settings = {
        "jwt_sso_enabled": False,
        "jwt_sso_secret": TEST_SSO_SECRET
    }
    mock_db.settings.find_one = AsyncMock(return_value=disabled_settings)
    
    request_data = LoginJWTRequest(token="some-token")
    with pytest.raises(HTTPException) as exc_info:
        await login_jwt(request_data)
        
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "JWT SSO ist nicht aktiviert"

@pytest.mark.anyio
@patch("server.db")
async def test_login_jwt_invalid_token(mock_db):
    mock_db.settings.find_one = AsyncMock(return_value=MOCK_SETTINGS)
    request_data = LoginJWTRequest(token="invalid.token.here")
    with pytest.raises(HTTPException) as exc_info:
        await login_jwt(request_data)
    
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Ungültiges Token"
