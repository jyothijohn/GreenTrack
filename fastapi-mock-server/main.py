from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import os
from dotenv import load_dotenv

# ---------------- LOAD ENV ----------------

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
APP_NAME = os.getenv("APP_NAME", "GreenTrack Mock API")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Mock API for GreenTrack Mobile Application"
)

# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MOCK USER ----------------

mock_user = {
    "id": "EMP001",
    "employeeCode": "GC-2026-0001",
    "employeeName": "Thomas John",
    "designation": "Field Worker",
    "department": "Operations",
    "organization": "Green Care",
    "email": "thomasjohn@greencare.com",
    "phoneNumber": "+91-9847112233",
    "profilePicture": "https://example.com/profile/thomasjohn.jpg"
}

# ---------------- AUTH ----------------

def verify_token(authorization: str = Header(None)):
    if authorization != "Bearer mock-jwt-token-12345":
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "message": "Unauthorized access. Please login."
            }
        )

# ---------------- HOME ----------------

@app.get("/")
def home():
    return {
        "status": True,
        "message": "GreenTrack Mock API is running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

# ---------------- LOGIN ----------------

@app.post("/login")
def login(payload: dict):

    username = payload.get("username")
    password = payload.get("password")

    if (
        username == "thomasjohn@greencare.com"
        and password == "password123"
    ):
        return {
            "success": True,
            "message": "Login successful.",
            "token": "mock-jwt-token-12345",
            "user": mock_user
        }

    raise HTTPException(
        status_code=401,
        detail={
            "success": False,
            "message": "Invalid username or password."
        }
    )

# ---------------- USER ----------------

@app.get("/user")
def get_user(_=Depends(verify_token)):
    return mock_user

# ---------------- ATTENDANCE CONFIG ----------------

@app.get("/attendance/config")
def get_attendance_config(_=Depends(verify_token)):
    return {
        "shiftTime": "09:00 AM - 06:00 PM",
        "allowedGeofence": {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "radiusMeters": 200
        },
        "gpsAccuracyThresholdMeters": 50
    }

# ---------------- TODAY ----------------

@app.get("/attendance/today")
def get_today_attendance(_=Depends(verify_token)):
    return {
        "date": "2026-06-17",
        "shiftTime": "09:00 AM - 06:00 PM",
        "checkInTime": "09:05 AM",
        "checkOutTime": "06:02 PM",
        "status": "Present (Late Check-in)",
        "checkInSelfie": "data:image/jpeg;base64,...",
        "checkOutSelfie": None,
        "checkInLocation": {
            "latitude": 37.77495,
            "longitude": -122.41942,
            "accuracy": 12
        },
        "checkOutLocation": None,
        "checkInGpsStatus": "success",
        "checkOutGpsStatus": None
    }

# ---------------- MARK ATTENDANCE ----------------

@app.post("/attendance/mark")
def mark_attendance(payload: dict, _=Depends(verify_token)):

    attendance_type = payload.get("type")

    if attendance_type not in ["check_in", "check_out"]:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Invalid attendance type."
            }
        )

    record = {
        "date": "2026-06-17",
        "shiftTime": "09:00 AM - 06:00 PM",
        "checkInTime": "09:05 AM",
        "checkOutTime": "06:02 PM" if attendance_type == "check_out" else None,
        "status": "Present (Late Check-in)",
        "checkInSelfie": payload.get("selfie"),
        "checkOutSelfie": payload.get("selfie") if attendance_type == "check_out" else None,
        "checkInLocation": payload.get("location"),
        "checkOutLocation": payload.get("location") if attendance_type == "check_out" else None,
        "checkInGpsStatus": payload.get("gpsStatus"),
        "checkOutGpsStatus": payload.get("gpsStatus") if attendance_type == "check_out" else None
    }

    return {
        "success": True,
        "message": (
            "Check-in recorded successfully at 09:05 AM."
            if attendance_type == "check_in"
            else "Check-out recorded successfully at 06:02 PM."
        ),
        "record": record
    }

# ---------------- HISTORY ----------------

@app.get("/attendance/history")
def get_attendance_history(
    month: Optional[str] = None,
    _=Depends(verify_token)
):
    return {
        "presentCount": 14,
        "lateCount": 3,
        "absentCount": 1,
        "records": [
            {
                "date": "2026-06-17",
                "shiftTime": "09:00 AM - 06:00 PM",
                "checkInTime": "09:05 AM",
                "checkOutTime": "06:02 PM",
                "status": "Present",
                "checkInSelfie": "data:image/jpeg;base64,...",
                "checkOutSelfie": "data:image/jpeg;base64,...",
                "checkInLocation": {
                    "latitude": 37.77495,
                    "longitude": -122.41942,
                    "accuracy": 12
                },
                "checkOutLocation": {
                    "latitude": 37.77495,
                    "longitude": -122.41942,
                    "accuracy": 12
                },
                "checkInGpsStatus": "success",
                "checkOutGpsStatus": "success"
            }
        ]
    }

# ---------------- BULK SYNC ----------------

@app.post("/attendance/bulk-sync")
def bulk_sync_attendance(records: list, _=Depends(verify_token)):

    if not isinstance(records, list):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Invalid format."
            }
        )

    return {
        "success": True,
        "syncedCount": len(records)
    }

# ---------------- RUN ----------------

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)