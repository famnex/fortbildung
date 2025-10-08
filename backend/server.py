from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
import base64
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ldap3
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    # LDAP Settings
    ldap_enabled: bool = False
    ldap_server: str = ""
    ldap_port: int = 389
    ldap_use_ssl: bool = False
    ldap_base_dn: str = ""
    ldap_bind_dn: str = ""
    ldap_bind_password: str = ""
    ldap_group_filter: str = ""
    ldap_user_attr: str = "sAMAccountName"
    ldap_mail_attr: str = "mail"
    ldap_display_attr: str = "displayName"
    ldap_upn_suffix: str = ""
    
    # SMTP Settings
    smtp_enabled: bool = False
    smtp_server: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "MSO Fortbildungssystem"
    smtp_use_tls: bool = True
    
    # School Info
    school_name: str = "MSO - Fortbildungssystem"
    school_logo_base64: str = ""

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: Optional[str] = None
    role: str = "user"  # admin or user
    auth_source: str = "local"  # local or ldap
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "user"

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]

class TrainingDate(BaseModel):
    date_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_datetime: str
    end_datetime: str

class FormField(BaseModel):
    field_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field_type: str  # text, multiselect, date, dropdown
    label: str
    required: bool = False
    options: List[str] = []  # For multiselect and dropdown

class Training(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    training_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    requirements: str = ""
    materials: str = ""
    location: str
    dates: List[TrainingDate] = []
    max_participants: int
    registration_deadline: str
    created_by: str  # user_id
    created_by_name: str = ""
    status: str = "draft"  # draft or published
    form_fields: List[FormField] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    current_participants: int = 0

class TrainingCreate(BaseModel):
    title: str
    description: str
    requirements: str = ""
    materials: str = ""
    location: str
    dates: List[TrainingDate]
    max_participants: int
    registration_deadline: str
    form_fields: List[FormField] = []
    status: str = "draft"

class Registration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    registration_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    training_id: str
    user_id: str
    user_name: str = ""
    user_email: str = ""
    status: str = "registered"  # registered, waitlist, cancelled
    form_responses: Dict[str, Any] = {}
    registered_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    cancelled_at: Optional[str] = None

class RegistrationCreate(BaseModel):
    training_id: str
    form_responses: Dict[str, Any] = {}

class Participation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    participation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    training_id: str
    user_id: str
    user_name: str = ""
    confirmed: bool = False
    certificate_generated: bool = False
    confirmed_at: Optional[str] = None

class ChangeLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    log_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    training_id: str
    user_id: str
    user_name: str = ""
    action: str
    changes: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ===================== HELPER FUNCTIONS =====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Ungültiges Token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Ungültiges Token")

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    return current_user

async def send_email(to_email: str, subject: str, body_html: str):
    try:
        settings = await db.settings.find_one({}, {"_id": 0})
        if not settings or not settings.get("smtp_enabled"):
            logger.info(f"Email would be sent to {to_email}: {subject}")
            return
        
        msg = MIMEMultipart('alternative')
        from_name = settings.get('smtp_from_name', 'MSO Fortbildungssystem')
        msg['From'] = f"{from_name} <{settings['smtp_from_email']}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        html_part = MIMEText(body_html, 'html', 'utf-8')
        msg.attach(html_part)
        
        server = smtplib.SMTP(settings['smtp_server'], settings['smtp_port'])
        if settings.get('smtp_use_tls', True):
            server.starttls()
        server.login(settings['smtp_username'], settings['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

async def authenticate_ldap(username: str, password: str) -> Optional[Dict[str, Any]]:
    try:
        settings = await db.settings.find_one({}, {"_id": 0})
        if not settings or not settings.get("ldap_enabled"):
            return None
        
        server_uri = f"{'ldaps' if settings.get('ldap_use_ssl') else 'ldap'}://{settings['ldap_server']}:{settings['ldap_port']}"
        server = ldap3.Server(server_uri, get_info=ldap3.ALL)
        
        # First bind with service account
        conn = ldap3.Connection(server, user=settings['ldap_bind_dn'], password=settings['ldap_bind_password'], auto_bind=True)
        
        # Get attribute names from settings
        user_attr = settings.get('ldap_user_attr', 'sAMAccountName')
        mail_attr = settings.get('ldap_mail_attr', 'mail')
        display_attr = settings.get('ldap_display_attr', 'displayName')
        
        # Search for user using user attribute
        search_filter = f"({user_attr}={username})"
        conn.search(settings['ldap_base_dn'], search_filter, attributes=[mail_attr, display_attr, 'cn'])
        
        if not conn.entries:
            return None
        
        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn
        
        # Try to bind as the user
        user_conn = ldap3.Connection(server, user=user_dn, password=password)
        if not user_conn.bind():
            return None
        
        # Extract user info using configured attributes
        email = str(getattr(user_entry, mail_attr)) if hasattr(user_entry, mail_attr) else username
        name = str(getattr(user_entry, display_attr)) if hasattr(user_entry, display_attr) else \
               str(user_entry.cn) if hasattr(user_entry, 'cn') else username
        
        user_conn.unbind()
        conn.unbind()
        
        return {
            "email": email,
            "name": name
        }
    except Exception as e:
        logger.error(f"LDAP authentication error: {e}")
        return None

async def log_change(training_id: str, user_id: str, user_name: str, action: str, changes: Dict[str, Any] = {}):
    log = ChangeLog(
        training_id=training_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        changes=changes
    )
    await db.change_logs.insert_one(log.model_dump())

# ===================== STARTUP =====================

@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    admin = await db.users.find_one({"email": "admin@fortbildung.mso"})
    if not admin:
        admin_user = User(
            email="admin@fortbildung.mso",
            name="Administrator",
            password_hash=hash_password("admin123"),
            role="admin",
            auth_source="local"
        )
        await db.users.insert_one(admin_user.model_dump())
        logger.info("Default admin user created: admin@fortbildung.mso / admin123")
    
    # Initialize settings if not exists
    settings = await db.settings.find_one({})
    if not settings:
        default_settings = Settings()
        await db.settings.insert_one(default_settings.model_dump())
        logger.info("Default settings initialized")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    # Try local auth first
    user = await db.users.find_one({"email": login_data.email, "auth_source": "local"}, {"_id": 0})
    
    if user and verify_password(login_data.password, user["password_hash"]):
        # Update last login
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = create_access_token({"sub": user["user_id"]})
        user.pop("password_hash", None)
        return LoginResponse(token=token, user=user)
    
    # Try LDAP auth
    ldap_user_data = await authenticate_ldap(login_data.email, login_data.password)
    if ldap_user_data:
        # Check if LDAP user exists in DB
        existing_user = await db.users.find_one({"email": ldap_user_data["email"], "auth_source": "ldap"}, {"_id": 0})
        
        if not existing_user:
            # Create new LDAP user
            new_user = User(
                email=ldap_user_data["email"],
                name=ldap_user_data["name"],
                role="user",
                auth_source="ldap"
            )
            await db.users.insert_one(new_user.model_dump())
            existing_user = new_user.model_dump()
        
        # Update last login
        await db.users.update_one(
            {"user_id": existing_user["user_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        token = create_access_token({"sub": existing_user["user_id"]})
        return LoginResponse(token=token, user=existing_user)
    
    raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")

@api_router.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    current_user.pop("password_hash", None)
    return current_user

# ===================== SETTINGS ROUTES =====================

@api_router.get("/settings", response_model=Settings)
async def get_settings(current_user: Dict[str, Any] = Depends(get_admin_user)):
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
    return settings

@api_router.put("/settings")
async def update_settings(settings: Settings, current_user: Dict[str, Any] = Depends(get_admin_user)):
    await db.settings.delete_many({})
    await db.settings.insert_one(settings.model_dump())
    return {"message": "Einstellungen erfolgreich aktualisiert"}

@api_router.post("/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...), current_user: Dict[str, Any] = Depends(get_admin_user)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Update settings with logo
        settings = await db.settings.find_one({}, {"_id": 0})
        if not settings:
            settings = Settings().model_dump()
        
        settings['school_logo_base64'] = f"data:{file.content_type};base64,{base64_image}"
        
        await db.settings.delete_many({})
        await db.settings.insert_one(settings)
        
        return {"message": "Logo erfolgreich hochgeladen", "logo": settings['school_logo_base64']}
    except Exception as e:
        logger.error(f"Logo upload error: {e}")
        raise HTTPException(status_code=500, detail="Fehler beim Hochladen des Logos")

@api_router.post("/settings/test-ldap")
async def test_ldap(test_data: Dict[str, str], current_user: Dict[str, Any] = Depends(get_admin_user)):
    try:
        settings = await db.settings.find_one({}, {"_id": 0})
        if not settings or not settings.get("ldap_enabled"):
            raise HTTPException(status_code=400, detail="LDAP ist nicht aktiviert")
        
        test_username = test_data.get("username", "")
        test_password = test_data.get("password", "")
        
        if not test_username or not test_password:
            raise HTTPException(status_code=400, detail="Benutzername und Passwort erforderlich")
        
        # Try LDAP connection
        server_uri = f"{'ldaps' if settings.get('ldap_use_ssl') else 'ldap'}://{settings['ldap_server']}:{settings['ldap_port']}"
        server = ldap3.Server(server_uri, get_info=ldap3.ALL, connect_timeout=5)
        
        # Test bind with service account
        conn = ldap3.Connection(
            server, 
            user=settings['ldap_bind_dn'], 
            password=settings['ldap_bind_password'],
            auto_bind=True
        )
        
        # Search for test user using user attribute
        user_attr = settings.get('ldap_user_attr', 'sAMAccountName')
        user_filter = f"({user_attr}={test_username})"
        conn.search(
            settings['ldap_base_dn'], 
            user_filter, 
            attributes=[settings['ldap_mail_attr'], settings['ldap_display_attr']]
        )
        
        if not conn.entries:
            return {"success": False, "message": f"Benutzer '{test_username}' nicht gefunden"}
        
        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn
        
        # Try to authenticate as user
        user_conn = ldap3.Connection(server, user=user_dn, password=test_password)
        if not user_conn.bind():
            return {"success": False, "message": "Authentifizierung fehlgeschlagen - falsches Passwort"}
        
        # Success
        mail_attr = settings.get('ldap_mail_attr', 'mail')
        display_attr = settings.get('ldap_display_attr', 'displayName')
        
        email = str(getattr(user_entry, mail_attr)) if hasattr(user_entry, mail_attr) else "N/A"
        name = str(getattr(user_entry, display_attr)) if hasattr(user_entry, display_attr) else "N/A"
        
        user_conn.unbind()
        conn.unbind()
        
        return {
            "success": True, 
            "message": "LDAP-Verbindung erfolgreich",
            "user_data": {
                "dn": user_dn,
                "email": email,
                "name": name
            }
        }
        
    except ldap3.core.exceptions.LDAPException as e:
        error_msg = str(e) if str(e) else "Unbekannter LDAP-Fehler"
        logger.error(f"LDAP test error: {error_msg}")
        return {"success": False, "message": f"LDAP-Fehler: {error_msg}"}
    except Exception as e:
        error_msg = str(e) if str(e) else "Unbekannter Fehler"
        logger.error(f"LDAP test error: {error_msg}")
        return {"success": False, "message": f"Fehler: {error_msg}"}

@api_router.post("/settings/test-smtp")
async def test_smtp(test_data: Dict[str, str], current_user: Dict[str, Any] = Depends(get_admin_user)):
    try:
        settings = await db.settings.find_one({}, {"_id": 0})
        if not settings or not settings.get("smtp_enabled"):
            raise HTTPException(status_code=400, detail="SMTP ist nicht aktiviert")
        
        test_email = test_data.get("email", current_user.get("email"))
        
        if not test_email:
            raise HTTPException(status_code=400, detail="Test-E-Mail-Adresse erforderlich")
        
        # Try SMTP connection
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{settings.get('smtp_from_name', 'MSO')} <{settings['smtp_from_email']}>"
        msg['To'] = test_email
        msg['Subject'] = "Test-E-Mail vom Fortbildungssystem"
        
        html = """<html><body>
        <h2>Test-E-Mail erfolgreich!</h2>
        <p>Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist.</p>
        <p>Mit freundlichen Grüßen,<br>Ihr Fortbildungssystem</p>
        </body></html>"""
        
        html_part = MIMEText(html, 'html', 'utf-8')
        msg.attach(html_part)
        
        server = smtplib.SMTP(settings['smtp_server'], settings['smtp_port'], timeout=10)
        if settings.get('smtp_use_tls', True):
            server.starttls()
        server.login(settings['smtp_username'], settings['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        return {
            "success": True,
            "message": f"Test-E-Mail erfolgreich an {test_email} gesendet"
        }
        
    except smtplib.SMTPException as e:
        return {"success": False, "message": f"SMTP-Fehler: {str(e)}"}
    except Exception as e:
        logger.error(f"SMTP test error: {e}")
        return {"success": False, "message": f"Fehler: {str(e)}"}

# ===================== USER ROUTES =====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: Dict[str, Any] = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: Dict[str, Any] = Depends(get_admin_user)):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail-Adresse bereits vergeben")
    
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        auth_source="local"
    )
    
    await db.users.insert_one(new_user.model_dump())
    
    # Remove password_hash from response
    user_dict = new_user.model_dump()
    user_dict.pop("password_hash", None)
    
    return user_dict

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: Dict[str, Any] = Depends(get_admin_user)):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    if user.get("auth_source") == "ldap":
        raise HTTPException(status_code=400, detail="LDAP-Benutzer können nicht bearbeitet werden")
    
    update_data = {}
    if user_data.email:
        # Check if new email is taken
        existing = await db.users.find_one({"email": user_data.email, "user_id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="E-Mail-Adresse bereits vergeben")
        update_data["email"] = user_data.email
    
    if user_data.name:
        update_data["name"] = user_data.name
    
    if user_data.role:
        if user_data.role not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Ungültige Rolle")
        update_data["role"] = user_data.role
    
    if user_data.password:
        update_data["password_hash"] = hash_password(user_data.password)
    
    if update_data:
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    return {"message": "Benutzer erfolgreich aktualisiert"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict[str, Any] = Depends(get_admin_user)):
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    if user.get("auth_source") == "ldap":
        raise HTTPException(status_code=400, detail="LDAP-Benutzer können nicht gelöscht werden")
    
    await db.users.delete_one({"user_id": user_id})
    return {"message": "Benutzer erfolgreich gelöscht"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: Dict[str, Any] = Depends(get_admin_user)):
    if role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    return {"message": "Benutzerrolle erfolgreich aktualisiert"}

# ===================== TRAINING ROUTES =====================

@api_router.get("/trainings", response_model=List[Training])
async def get_trainings(current_user: Dict[str, Any] = Depends(get_current_user)):
    # Get all published trainings
    trainings = await db.trainings.find({"status": "published"}, {"_id": 0}).to_list(1000)
    
    # Filter out past trainings (where last date has ended)
    now = datetime.now(timezone.utc)
    future_trainings = []
    
    for training in trainings:
        if training.get("dates") and len(training["dates"]) > 0:
            # Get last date
            last_date = max(training["dates"], key=lambda d: d["end_datetime"])
            # Handle different datetime formats
            end_dt_str = last_date["end_datetime"]
            if "T" in end_dt_str and not end_dt_str.endswith("Z") and "+" not in end_dt_str:
                # Add timezone if missing
                last_end = datetime.fromisoformat(end_dt_str).replace(tzinfo=timezone.utc)
            else:
                last_end = datetime.fromisoformat(end_dt_str.replace("Z", "+00:00"))
            
            # Only include if last date hasn't ended yet
            if last_end > now:
                count = await db.registrations.count_documents({
                    "training_id": training["training_id"],
                    "status": "registered"
                })
                training["current_participants"] = count
                future_trainings.append(training)
        else:
            # If no dates, include it
            count = await db.registrations.count_documents({
                "training_id": training["training_id"],
                "status": "registered"
            })
            training["current_participants"] = count
            future_trainings.append(training)
    
    return future_trainings

@api_router.get("/trainings/my", response_model=List[Training])
async def get_my_trainings(current_user: Dict[str, Any] = Depends(get_current_user)):
    trainings = await db.trainings.find({"created_by": current_user["user_id"]}, {"_id": 0}).to_list(1000)
    
    for training in trainings:
        count = await db.registrations.count_documents({
            "training_id": training["training_id"],
            "status": "registered"
        })
        training["current_participants"] = count
    
    return trainings

@api_router.get("/trainings/all", response_model=List[Training])
async def get_all_trainings(current_user: Dict[str, Any] = Depends(get_admin_user)):
    trainings = await db.trainings.find({}, {"_id": 0}).to_list(1000)
    
    for training in trainings:
        count = await db.registrations.count_documents({
            "training_id": training["training_id"],
            "status": "registered"
        })
        training["current_participants"] = count
    
    return trainings

@api_router.post("/trainings", response_model=Training)
async def create_training(training_data: TrainingCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = Training(
        **training_data.model_dump(),
        created_by=current_user["user_id"],
        created_by_name=current_user["name"]
    )
    await db.trainings.insert_one(training.model_dump())
    
    await log_change(
        training.training_id,
        current_user["user_id"],
        current_user["name"],
        "Fortbildung erstellt",
        {"title": training.title}
    )
    
    return training

@api_router.get("/trainings/{training_id}", response_model=Training)
async def get_training(training_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    count = await db.registrations.count_documents({
        "training_id": training_id,
        "status": "registered"
    })
    training["current_participants"] = count
    
    return training

@api_router.put("/trainings/{training_id}", response_model=Training)
async def update_training(training_id: str, training_data: TrainingCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    existing = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if existing["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    update_data = training_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.trainings.update_one(
        {"training_id": training_id},
        {"$set": update_data}
    )
    
    await log_change(
        training_id,
        current_user["user_id"],
        current_user["name"],
        "Fortbildung aktualisiert",
        update_data
    )
    
    # Notify participants if published
    if existing["status"] == "published":
        registrations = await db.registrations.find(
            {"training_id": training_id, "status": "registered"},
            {"_id": 0}
        ).to_list(1000)
        
        for reg in registrations:
            await send_email(
                reg["user_email"],
                f"Änderung: {existing['title']}",
                f"""<html><body>
                <h2>Fortbildung wurde geändert</h2>
                <p>Die Fortbildung "{existing['title']}" wurde aktualisiert.</p>
                <p>Bitte überprüfen Sie die Details in Ihrem Dashboard.</p>
                </body></html>"""
            )
    
    updated = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    return updated

@api_router.delete("/trainings/{training_id}")
async def delete_training(training_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.trainings.delete_one({"training_id": training_id})
    await db.registrations.delete_many({"training_id": training_id})
    await db.participations.delete_many({"training_id": training_id})
    
    await log_change(
        training_id,
        current_user["user_id"],
        current_user["name"],
        "Fortbildung gelöscht",
        {"title": training["title"]}
    )
    
    return {"message": "Fortbildung erfolgreich gelöscht"}

@api_router.put("/trainings/{training_id}/publish")
async def publish_training(training_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    new_status = "published" if training["status"] == "draft" else "draft"
    
    await db.trainings.update_one(
        {"training_id": training_id},
        {"$set": {"status": new_status}}
    )
    
    await log_change(
        training_id,
        current_user["user_id"],
        current_user["name"],
        f"Status geändert: {new_status}"
    )
    
    return {"message": f"Status erfolgreich geändert zu: {new_status}"}

@api_router.get("/trainings/{training_id}/participants")
async def get_participants(training_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    registrations = await db.registrations.find(
        {"training_id": training_id, "status": "registered"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get participation status
    participations = await db.participations.find(
        {"training_id": training_id},
        {"_id": 0}
    ).to_list(1000)
    
    participation_map = {p["user_id"]: p for p in participations}
    
    result = []
    for reg in registrations:
        participant_info = {
            "registration_id": reg["registration_id"],
            "user_id": reg["user_id"],
            "user_name": reg["user_name"],
            "user_email": reg["user_email"],
            "registered_at": reg["registered_at"],
            "form_responses": reg.get("form_responses", {}),
            "confirmed": False,
            "participation_id": None
        }
        
        if reg["user_id"] in participation_map:
            part = participation_map[reg["user_id"]]
            participant_info["confirmed"] = part["confirmed"]
            participant_info["participation_id"] = part["participation_id"]
        
        result.append(participant_info)
    
    return result

@api_router.post("/trainings/{training_id}/participants/confirm")
async def confirm_participants(training_id: str, user_ids: List[str], current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Check if last date has passed
    if training.get("dates"):
        last_date = max(training["dates"], key=lambda d: d["end_datetime"])
        # Handle different datetime formats
        end_dt_str = last_date["end_datetime"]
        if "T" in end_dt_str and not end_dt_str.endswith("Z") and "+" not in end_dt_str:
            last_end = datetime.fromisoformat(end_dt_str).replace(tzinfo=timezone.utc)
        else:
            last_end = datetime.fromisoformat(end_dt_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        
        if last_end > now:
            raise HTTPException(
                status_code=400, 
                detail=f"Teilnahmebestätigung erst nach Ende des letzten Termins ({last_end.strftime('%d.%m.%Y %H:%M')}) möglich"
            )
    
    for user_id in user_ids:
        # Check if participation exists
        existing = await db.participations.find_one({
            "training_id": training_id,
            "user_id": user_id
        })
        
        if existing:
            await db.participations.update_one(
                {"participation_id": existing["participation_id"]},
                {"$set": {
                    "confirmed": True,
                    "confirmed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Get user info
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                participation = Participation(
                    training_id=training_id,
                    user_id=user_id,
                    user_name=user["name"],
                    confirmed=True,
                    confirmed_at=datetime.now(timezone.utc).isoformat()
                )
                await db.participations.insert_one(participation.model_dump())
                
                # Send confirmation email
                await send_email(
                    user["email"],
                    f"Teilnahmebestätigung: {training['title']}",
                    f"""<html><body>
                    <h2>Teilnahmebestätigung</h2>
                    <p>Ihre Teilnahme an der Fortbildung "{training['title']}" wurde bestätigt.</p>
                    <p>Ihre Teilnahmeurkunde steht zum Download bereit.</p>
                    </body></html>"""
                )
    
    return {"message": "Teilnahmen erfolgreich bestätigt"}

@api_router.delete("/trainings/{training_id}/participants/{registration_id}")
async def remove_participant(training_id: str, registration_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    
    # Delete registration
    await db.registrations.delete_one({"registration_id": registration_id})
    
    # Delete participation if exists
    await db.participations.delete_many({"training_id": training_id, "user_id": registration["user_id"]})
    
    # Notify user
    await send_email(
        registration["user_email"],
        f"Abmeldung: {training['title']}",
        f"""<html><body>
        <h2>Abmeldung von Fortbildung</h2>
        <p>Sie wurden von der Fortbildung "{training['title']}" abgemeldet.</p>
        <p>Bei Fragen wenden Sie sich bitte an den Anbieter.</p>
        </body></html>"""
    )
    
    return {"message": "Teilnehmer erfolgreich entfernt"}

# ===================== REGISTRATION ROUTES =====================

@api_router.get("/registrations/my")
async def get_my_registrations(current_user: Dict[str, Any] = Depends(get_current_user)):
    registrations = await db.registrations.find(
        {"user_id": current_user["user_id"], "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).to_list(1000)
    
    # Get training details
    result = []
    for reg in registrations:
        training = await db.trainings.find_one({"training_id": reg["training_id"]}, {"_id": 0})
        if training:
            # Check participation status
            participation = await db.participations.find_one({
                "training_id": reg["training_id"],
                "user_id": current_user["user_id"]
            }, {"_id": 0})
            
            result.append({
                "registration": reg,
                "training": training,
                "participation": participation
            })
    
    return result

@api_router.post("/registrations", response_model=Registration)
async def register_for_training(reg_data: RegistrationCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    training = await db.trainings.find_one({"training_id": reg_data.training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["status"] != "published":
        raise HTTPException(status_code=400, detail="Fortbildung ist nicht veröffentlicht")
    
    # Check if already registered
    existing = await db.registrations.find_one({
        "training_id": reg_data.training_id,
        "user_id": current_user["user_id"],
        "status": {"$ne": "cancelled"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Bereits angemeldet")
    
    # Check capacity
    current_count = await db.registrations.count_documents({
        "training_id": reg_data.training_id,
        "status": "registered"
    })
    
    status = "registered" if current_count < training["max_participants"] else "waitlist"
    
    registration = Registration(
        training_id=reg_data.training_id,
        user_id=current_user["user_id"],
        user_name=current_user["name"],
        user_email=current_user["email"],
        status=status,
        form_responses=reg_data.form_responses
    )
    
    await db.registrations.insert_one(registration.model_dump())
    
    # Send confirmation email
    await send_email(
        current_user["email"],
        f"Anmeldebestätigung: {training['title']}",
        f"""<html><body>
        <h2>Anmeldebestätigung</h2>
        <p>Ihre Anmeldung für die Fortbildung "{training['title']}" war erfolgreich.</p>
        <p>Status: {"Angemeldet" if status == "registered" else "Warteliste"}</p>
        </body></html>"""
    )
    
    # Notify trainer
    trainer = await db.users.find_one({"user_id": training["created_by"]}, {"_id": 0})
    if trainer:
        await send_email(
            trainer["email"],
            f"Neue Anmeldung: {training['title']}",
            f"""<html><body>
            <h2>Neue Anmeldung</h2>
            <p>{current_user['name']} hat sich für Ihre Fortbildung "{training['title']}" angemeldet.</p>
            </body></html>"""
        )
    
    return registration

@api_router.delete("/registrations/{registration_id}")
async def cancel_registration(registration_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    
    if registration["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move waitlist user to registered if available
    if registration["status"] == "registered":
        waitlist_user = await db.registrations.find_one(
            {"training_id": registration["training_id"], "status": "waitlist"},
            {"_id": 0}
        )
        
        if waitlist_user:
            await db.registrations.update_one(
                {"registration_id": waitlist_user["registration_id"]},
                {"$set": {"status": "registered"}}
            )
            
            training = await db.trainings.find_one({"training_id": registration["training_id"]}, {"_id": 0})
            await send_email(
                waitlist_user["user_email"],
                f"Platz verfügbar: {training['title']}",
                f"""<html><body>
                <h2>Platz verfügbar!</h2>
                <p>Ein Platz für die Fortbildung "{training['title']}" ist nun verfügbar.</p>
                <p>Sie wurden von der Warteliste in die Teilnehmerliste verschoben.</p>
                </body></html>"""
            )
    
    return {"message": "Anmeldung erfolgreich storniert"}

# ===================== PDF ROUTES =====================

@api_router.get("/pdfs/certificate/{participation_id}")
async def get_certificate(participation_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    participation = await db.participations.find_one({"participation_id": participation_id}, {"_id": 0})
    if not participation:
        raise HTTPException(status_code=404, detail="Teilnahme nicht gefunden")
    
    if participation["user_id"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    if not participation["confirmed"]:
        raise HTTPException(status_code=400, detail="Teilnahme noch nicht bestätigt")
    
    training = await db.trainings.find_one({"training_id": participation["training_id"]}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    settings = await db.settings.find_one({}, {"_id": 0})
    school_name = settings.get("school_name", "MSO - Fortbildungssystem") if settings else "MSO - Fortbildungssystem"
    logo_base64 = settings.get("school_logo_base64", "") if settings else ""
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Logo (if available)
    if logo_base64:
        try:
            from reportlab.platypus import Image
            from reportlab.lib.utils import ImageReader
            import base64
            import io
            
            # Extract base64 data
            if "base64," in logo_base64:
                logo_data = logo_base64.split("base64,")[1]
            else:
                logo_data = logo_base64
            
            logo_bytes = base64.b64decode(logo_data)
            logo_buffer = io.BytesIO(logo_bytes)
            
            # Add logo
            img = Image(logo_buffer, width=4*cm, height=4*cm, kind='proportional')
            img.hAlign = 'CENTER'
            story.append(img)
            story.append(Spacer(1, 0.5*cm))
        except Exception as e:
            logger.error(f"Error adding logo to PDF: {e}")
    
    # School name
    school_style = ParagraphStyle(
        'SchoolName',
        parent=styles['Normal'],
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d'),
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph(school_name, school_style))
    story.append(Spacer(1, 1*cm))
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    story.append(Paragraph("Teilnahmeurkunde", title_style))
    story.append(Spacer(1, 1*cm))
    
    # Content
    content_style = ParagraphStyle(
        'Content',
        parent=styles['Normal'],
        fontSize=12,
        leading=18,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("Wir bescheinigen hiermit, dass", content_style))
    story.append(Spacer(1, 0.5*cm))
    
    name_style = ParagraphStyle(
        'Name',
        parent=styles['Normal'],
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d')
    )
    story.append(Paragraph(f"<b>{participation['user_name']}</b>", name_style))
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("an folgender Fortbildung teilgenommen hat:", content_style))
    story.append(Spacer(1, 0.5*cm))
    
    training_style = ParagraphStyle(
        'Training',
        parent=styles['Normal'],
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2d3748')
    )
    story.append(Paragraph(f"<b>{training['title']}</b>", training_style))
    story.append(Spacer(1, 1*cm))
    
    # Dates
    if training.get('dates'):
        dates_text = "Termine: "
        for i, date in enumerate(training['dates']):
            start = datetime.fromisoformat(date['start_datetime'])
            dates_text += start.strftime("%d.%m.%Y")
            if i < len(training['dates']) - 1:
                dates_text += ", "
        story.append(Paragraph(dates_text, content_style))
        story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph(f"Ort: {training['location']}", content_style))
    story.append(Spacer(1, 1.5*cm))
    
    # Date and signature
    confirmed_date = datetime.fromisoformat(participation['confirmed_at'])
    story.append(Paragraph(f"Ausgestellt am: {confirmed_date.strftime('%d.%m.%Y')}", content_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=teilnahmeurkunde_{participation_id}.pdf"}
    )

@api_router.get("/pdfs/participant-list/{training_id}")
async def get_participant_list(
    training_id: str, 
    selected_fields: str = "",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    training = await db.trainings.find_one({"training_id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Fortbildung nicht gefunden")
    
    if training["created_by"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    registrations = await db.registrations.find(
        {"training_id": training_id, "status": "registered"},
        {"_id": 0}
    ).to_list(1000)
    
    settings = await db.settings.find_one({}, {"_id": 0})
    school_name = settings.get("school_name", "MSO - Fortbildungssystem") if settings else "MSO - Fortbildungssystem"
    logo_base64 = settings.get("school_logo_base64", "") if settings else ""
    
    # Parse selected fields
    selected_field_ids = selected_fields.split(",") if selected_fields else []
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    story.append(Paragraph("Teilnehmerliste", title_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Training info
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        alignment=TA_LEFT
    )
    story.append(Paragraph(f"<b>Fortbildung:</b> {training['title']}", info_style))
    story.append(Paragraph(f"<b>Ort:</b> {training['location']}", info_style))
    story.append(Paragraph(f"<b>Anbieter:</b> {training['created_by_name']}", info_style))
    story.append(Spacer(1, 1*cm))
    
    # Participant table
    table_data = [['Nr.', 'Name', 'E-Mail', 'Anmeldedatum']]
    for i, reg in enumerate(registrations, 1):
        registered_date = datetime.fromisoformat(reg['registered_at'])
        table_data.append([
            str(i),
            reg['user_name'],
            reg['user_email'],
            registered_date.strftime('%d.%m.%Y')
        ])
    
    table = Table(table_data, colWidths=[1.5*cm, 5*cm, 6*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')])
    ]))
    
    story.append(table)
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"Gesamt: {len(registrations)} Teilnehmer", info_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=teilnehmerliste_{training_id}.pdf"}
    )

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/logs")
async def get_logs(current_user: Dict[str, Any] = Depends(get_admin_user)):
    logs = await db.change_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return logs

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
