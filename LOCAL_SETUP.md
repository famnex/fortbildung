# Local Setup Guide

This project consists of a Python FastAPI backend and a React frontend.

## Prerequisites
- Node.js (v18+) and npm/yarn
- Python 3.8+
- MongoDB instance (local or remote)

## Backend Setup (FastAPI)
1.  **Navigate to the backend directory**:
    ```powershell
    cd backend
    ```

2.  **Create and activate a virtual environment** (optional but recommended):
    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate
    ```

3.  **Install dependencies**:
    ```powershell
    pip install -r requirements.txt
    ```

4.  **Create a `.env` file** in the `backend/` folder:
    ```env
    MONGO_URL=mongodb://localhost:27017
    DB_NAME=fortbildung
    JWT_SECRET=your-secure-secret-key-change-in-production
    # SMTP Settings (optional for local development)
    # SMTP_SERVER=...
    # SMTP_PORT=...
    # SMTP_USER=...
    # SMTP_PASS=...
    ```

5.  **Start the server**:
    ```powershell
    uvicorn server:app --reload
    ```
    The backend should now be running at `http://localhost:8000`.

## Frontend Setup (React)
1.  **Navigate to the frontend directory**:
    ```powershell
    cd frontend
    ```

2.  **Install dependencies**:
    ```powershell
    npm install
    # or
    yarn install
    ```

3.  **Create a `.env` file** in the `frontend/` folder:
    ```env
    REACT_APP_BACKEND_URL=http://localhost:8000
    ```

4.  **Start the development server**:
    ```powershell
    npm start
    # or
    yarn start
    ```
    The application will be available at `http://localhost:3000`.

## Default Login
On first startup, the backend creates a default admin user if it doesn't exist:
- **Email**: `admin@fortbildung.mso`
- **Password**: `admin123`
