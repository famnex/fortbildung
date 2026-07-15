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

from fastapi import HTTPException
from server import trigger_update

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
@patch("server.asyncio.create_subprocess_shell")
async def test_trigger_update_admin_success(mock_subprocess):
    # Mock subprocess behavior
    mock_process = MagicMock()
    mock_process.wait = AsyncMock(return_value=0)
    mock_process.returncode = 0
    mock_process.stdout.readline = AsyncMock(side_effect=[b"line 1\n", b"line 2\n", b""])
    mock_process.stderr.readline = AsyncMock(return_value=b"")
    mock_subprocess.return_value = mock_process
    
    # Define admin user mock
    admin_user = {
        "user_id": "admin-123",
        "email": "admin@fortbildung.mso",
        "role": "admin"
    }
    
    # Call route function directly
    response = await trigger_update(current_user=admin_user)
    
    # Gather output from StreamingResponse generator
    outputs = []
    async for chunk in response.body_iterator:
        outputs.append(chunk)
        
    full_output = "".join(outputs)
    assert "System Update gestartet" in full_output
    assert "line 1" in full_output
    assert "line 2" in full_output
    assert "UPDATE ERFOLGREICH BEENDET" in full_output
    
    mock_subprocess.assert_called_once()
