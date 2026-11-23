#  CloudOps – AWS Infrastructure Health & Incident Automation Platform

**A full-stack infrastructure monitoring and incident management platform built with FastAPI, React, and Python.**

CloudOps provides real-time system resource monitoring, automated incident detection, operational insights, and an interactive dashboard for infrastructure health management.

It is designed to demonstrate practical knowledge of backend development, REST APIs, system monitoring, incident management, cloud infrastructure concepts, and frontend-backend integration.

<p align="center">

  **Live Demo:** https://cloudops-frontend-ahhh.onrender.com

  **Backend API:** https://cloudops-backend-57gn.onrender.com

  **API Documentation:** https://cloudops-backend-57gn.onrender.com/docs

</p>

---


## 1. Project Overview

CloudOps is a full-stack infrastructure health monitoring and incident management platform.

The application collects system-level performance metrics, monitors CPU, memory, and disk utilization, identifies potential infrastructure issues, and presents operational information through a centralized dashboard.

The platform also includes incident history, notifications, resource analysis, and an AWS integration interface designed to demonstrate cloud monitoring workflows.

### Problem Statement

Infrastructure administrators need a centralized way to:

- Monitor system resource utilization.
- Identify abnormal resource consumption.
- Detect potential infrastructure incidents.
- Analyze operational issues.
- Track incident status and history.
- Access infrastructure information through a unified dashboard.

### Solution

CloudOps addresses these requirements through a React-based dashboard connected to a FastAPI backend that performs system monitoring, incident detection, and API-based data management.

---

## 2. Key Features

###  Infrastructure Monitoring

- Real-time CPU utilization monitoring.
- Memory usage monitoring.
- Disk utilization monitoring.
- Infrastructure health indicators.
- Automatic dashboard refresh every 10 seconds.
- Manual refresh functionality.

###  Automated Incident Detection

- Detects high CPU utilization.
- Identifies high memory consumption.
- Monitors disk utilization.
- Assigns incident severity levels.
- Generates recommendations for detected issues.

###  Incident Management

- View active incidents.
- Access incident history.
- Analyze detected incidents.
- Update incident status.
- Track Open, Acknowledged, and Resolved incidents.

###  Notification Center

- Centralized notification management.
- Retrieve notifications through REST APIs.
- Mark individual notifications as read.
- Mark all notifications as read.
- View notification history.

###  Process Analysis

- Retrieve top system processes.
- Analyze resource-intensive processes.
- Identify processes contributing to infrastructure load.

###  AWS Integration

The project includes an AWS integration layer using Boto3.

Implemented integration modules:

- EC2 instance discovery.
- EC2 CPU metrics retrieval through CloudWatch.
- AWS infrastructure API endpoints.
- Read-only IAM policy documentation.

**Important:** AWS integration is currently in demonstration mode. No live AWS account, credentials, or cloud resources are connected. AWS functionality should not be interpreted as verified live AWS monitoring.

---

## 3. Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, JavaScript |
| Build Tool | Vite |
| Styling | CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Python 3.11, FastAPI |
| API Server | Uvicorn |
| System Monitoring | psutil |
| AWS SDK | Boto3 |
| Database | SQLite |
| Validation | Pydantic |
| HTTP Client | Axios |
| Testing | Pytest, HTTPX |
| Version Control | Git, GitHub |
| CI/CD | GitHub Actions |
| Deployment | Render |

---

## 4. System Architecture

CloudOps follows a frontend-backend architecture.

```text
                 USER
                   |
                   v
          REACT DASHBOARD
             (Vite)
                   |
                   v
             AXIOS CLIENT
                   |
                   v
            FASTAPI BACKEND
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
  SYSTEM       INCIDENT     NOTIFICATION
 MONITORING    DETECTION     MANAGEMENT
       |           |           |
       +-----------+-----------+
                   |
                   v
             SQLITE DATABASE
                   |
                   v
             AWS INTEGRATION
              (DEMO MODE)
```

### Frontend Layer

The React frontend provides the user interface for infrastructure monitoring, incident management, notifications, and AWS-related information.

It communicates with the backend through HTTP REST APIs using Axios.

### Backend Layer

The FastAPI backend handles:

- System resource monitoring.
- Incident detection and analysis.
- API request processing.
- Notification management.
- Database operations.
- AWS integration modules.

### Database Layer

SQLite stores application data, including incident and notification information.

### Cloud Integration Layer

Boto3 modules provide the foundation for interacting with AWS EC2 and CloudWatch APIs when valid AWS access is configured.

---

## 5. Project Structure

```text
CloudOps/
│
├── backend/
│   ├── app/
│   │   ├── aws/
│   │   │   ├── cloudwatch.py
│   │   │   └── ec2.py
│   │   │
│   │   ├── services/
│   │   │   ├── system_monitor.py
│   │   │   ├── incident_detector.py
│   │   │   ├── incident_analyzer.py
│   │   │   ├── process_analyzer.py
│   │   │   ├── disk_analyzer.py
│   │   │   ├── database.py
│   │   │   └── logger.py
│   │   │
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── cloudops.db
│
├── frontend/
│   ├── public/
│   │   └── _redirects
│   │
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── ...
│   │
│   ├── package.json
│   └── index.html
│
├── docs/
│   └── aws/
│       └── cloudops-read-only-policy.json
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 6. Infrastructure Monitoring

The backend uses Python's `psutil` library to collect system-level performance information.

### Monitored Resources

**CPU Monitoring**
- CPU utilization percentage.
- Resource health classification.

**Memory Monitoring**
- Total memory.
- Used memory.
- Memory utilization percentage.

**Disk Monitoring**
- Total disk capacity.
- Used disk capacity.
- Disk utilization percentage.
- Disk health classification.

The collected metrics are exposed through the `/metrics` API endpoint and displayed on the frontend dashboard.

### Example Monitoring Response

```json
{
  "system": "Linux",
  "cpu": {
    "usage_percent": 12.4,
    "status": "Healthy"
  },
  "memory": {
    "total_gb": 30.65,
    "used_gb": 15.17,
    "usage_percent": 49.5,
    "status": "Healthy"
  },
  "disk": {
    "usage_percent": 83.2,
    "status": "Warning"
  }
}
```

*Example response structure from the deployed monitoring service.*

---

## 7. Incident Management

CloudOps includes an incident detection and management workflow.

### Incident Detection

The system monitors resource utilization and identifies potential infrastructure problems.

For example:

- High CPU utilization.
- Excessive memory usage.
- High disk utilization.

### Incident Analysis

The application analyzes detected resource-related incidents and provides recommendations for investigation and resolution.

### Incident Lifecycle

```text
       INCIDENT DETECTED
               |
               v
           OPEN
               |
               v
        ACKNOWLEDGED
               |
               v
           RESOLVED
```

The backend provides endpoints to retrieve incidents, access historical records, analyze incidents, and update their status.

---

## 8. AWS Integration

CloudOps includes an AWS integration module developed using Boto3.

### Implemented Components

- EC2 instance discovery.
- EC2 CPU utilization retrieval.
- CloudWatch metric integration.
- AWS-related REST API endpoints.
- Read-only IAM policy documentation.

### AWS Security

A read-only IAM policy template is included at:

`docs/aws/cloudops-read-only-policy.json`

The application is designed around read-only infrastructure visibility rather than destructive cloud operations.

**Current integration status:** Demo mode. No AWS account or credentials are configured, and live EC2/CloudWatch functionality has not been verified against an actual AWS environment.

---

## 9. REST API Endpoints

The FastAPI backend exposes the following endpoints.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome information |
| GET | `/health` | Backend health check |
| GET | `/metrics` | System resource metrics |
| GET | `/incidents` | Retrieve current incidents |
| GET | `/incidents/history` | Retrieve incident history |
| PATCH | `/incidents/{id}/status` | Update incident status |
| POST | `/incidents/analyze` | Analyze current incidents |
| GET | `/processes/top` | Retrieve top processes |
| GET | `/notifications` | Retrieve notifications |
| PATCH | `/notifications/{id}/read` | Mark notification as read |
| PATCH | `/notifications/read-all` | Mark all notifications as read |
| GET | `/aws/ec2/instances` | Retrieve EC2 instances |
| GET | `/aws/ec2/cpu` | Retrieve EC2 CPU metrics |
| GET | `/debug/database` | Database diagnostic information |

### API Documentation

FastAPI automatically generates interactive API documentation.

- Swagger UI: https://cloudops-backend-57gn.onrender.com/docs
- ReDoc: https://cloudops-backend-57gn.onrender.com/redoc

---

## 10. Database and Storage

CloudOps uses SQLite for lightweight application data storage.

The database supports:

- Incident records.
- Incident history.
- Notification records.
- Incident status updates.

The database is managed through the backend database service.

**Deployment note:** The current Render backend uses an ephemeral filesystem. SQLite data may reset when the service restarts or is redeployed. Persistent production storage has not been configured.

---

## 11. Testing and CI/CD

Testing is performed using Pytest and HTTPX.

### Backend Testing

The backend test suite has previously achieved:

**55 passing tests.**

The tests cover backend application functionality and API behavior.

Run the tests locally:

```powershell
cd backend

.\.venv\Scripts\Activate.ps1

$env:PYTHONPATH = "."

python -m pytest -v
```

### Continuous Integration

A GitHub Actions workflow is configured under:

`.github/workflows/ci.yml`

The workflow supports automated backend validation when changes are pushed to GitHub.

---

## 12. Local Installation

Follow these steps to run CloudOps locally.

### Prerequisites

- Python 3.11 or later.
- Node.js and npm.
- Git.
- Visual Studio Code (recommended).

### Step 1: Clone the Repository

```bash
git clone https://github.com/Shivaniyadav628/CloudOps.git

cd CloudOps
```

### Step 2: Set Up the Backend

```powershell
cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### Step 3: Start the Backend

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### Step 4: Set Up the Frontend

Open another terminal:

```powershell
cd frontend

npm install
```

### Step 5: Configure the Frontend API URL

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Step 6: Start the Frontend

```powershell
npm run dev
```

Frontend:

`http://localhost:5173`

The frontend and backend should now communicate through the local API.

---

## 13. Environment Configuration

The frontend uses the following environment variable:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |

Local development:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Production:

```env
VITE_API_BASE_URL=https://cloudops-backend-57gn.onrender.com
```

The production environment variable is configured through the Render frontend service.

Environment files containing secrets are excluded through `.gitignore`.

The `.env.example` file provides a safe configuration template.

---

## 14. Deployment on Render

CloudOps is deployed using Render with separate frontend and backend services.

### Backend Deployment

**Service:** `cloudops-backend`

**Platform:** Render Web Service

| Configuration | Value |
|---|---|
| Repository | Shivaniyadav628/CloudOps |
| Branch | main |
| Root Directory | backend |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/health` |
| Plan | Free |

Backend URL:

https://cloudops-backend-57gn.onrender.com

### Frontend Deployment

**Service:** `cloudops-frontend`

**Platform:** Render Static Site

| Configuration | Value |
|---|---|
| Repository | Shivaniyadav628/CloudOps |
| Branch | main |
| Root Directory | frontend |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Frontend environment variable:

```env
VITE_API_BASE_URL=https://cloudops-backend-57gn.onrender.com
```

Frontend URL:

https://cloudops-frontend-ahhh.onrender.com

### SPA Routing

The frontend includes a `_redirects` file inside `frontend/public/`:

```text
/* /index.html 200
```

This supports client-side React routing on Render.

### CORS Configuration

The FastAPI backend is configured to allow requests from the deployed frontend:

```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://cloudops-frontend-ahhh.onrender.com",
]
```

This allows the deployed frontend to communicate with the backend while supporting local development.

---

## 15. Deployment Architecture

```text
                 INTERNET
                    |
          +---------+---------+
          |                   |
          v                   v
    RENDER STATIC SITE   RENDER WEB SERVICE
          |                   |
          v                   v
    REACT FRONTEND       FASTAPI BACKEND
          |                   |
          |    HTTPS / API    |
          +-------------------+
                              |
                   +----------+----------+
                   |          |          |
                   v          v          v
                METRICS   INCIDENTS  NOTIFICATIONS
                   |          |          |
                   +----------+----------+
                              |
                              v
                         SQLITE DB
                              |
                              v
                      AWS MODULES
                       (DEMO MODE)
```

### Production URLs

| Component | URL |
|---|---|
| Frontend | https://cloudops-frontend-ahhh.onrender.com |
| Backend | https://cloudops-backend-57gn.onrender.com |
| Health Check | https://cloudops-backend-57gn.onrender.com/health |
| API Documentation | https://cloudops-backend-57gn.onrender.com/docs |

### Deployment Verification

The deployed backend health endpoint returns:

```json
{
  "status": "Healthy",
  "service": "CloudOps Monitoring API"
}
```

The production frontend has been verified to communicate successfully with the backend after configuring the correct CORS origin and redeploying the backend.

---

## 16. Limitations and Future Improvements

### Current Limitations

- The deployed monitoring service measures the Render container, not the user's personal computer.
- Render free services may sleep after periods of inactivity.
- SQLite persistence is not guaranteed on the current ephemeral Render filesystem.
- AWS integration is not connected to a live AWS account.
- The current deployment is intended as a demonstration and portfolio project, not a production-grade monitoring service.

### Future Improvements

- Integrate live AWS EC2 and CloudWatch monitoring.
- Add persistent PostgreSQL storage.
- Introduce authentication and role-based access control.
- Add advanced incident analytics.
- Implement configurable alert thresholds.
- Integrate email and messaging notifications.
- Add infrastructure monitoring across multiple servers.
- Introduce containerization using Docker.
- Improve automated deployment and monitoring workflows.

---

## 17. Learning Outcomes

Building CloudOps provided practical experience in:

- Designing and developing REST APIs using FastAPI.
- Building full-stack applications using React and Python.
- Monitoring system resources using psutil.
- Implementing automated incident detection.
- Managing application data using SQLite.
- Integrating frontend and backend services.
- Configuring CORS for cross-origin communication.
- Working with AWS SDK concepts using Boto3.
- Writing automated tests using Pytest.
- Managing source code using Git and GitHub.
- Deploying full-stack applications using Render.
- Debugging production deployment and networking issues.

---

## 18. Author

**Shivani Yadav**

B.Tech – Computer Science and Engineering

SRM University Delhi NCR

GitHub: https://github.com/Shivaniyadav628

---

##  Project

If you find this project interesting, consider giving the repository a star!

**Repository:** https://github.com/Shivaniyadav628/CloudOps

