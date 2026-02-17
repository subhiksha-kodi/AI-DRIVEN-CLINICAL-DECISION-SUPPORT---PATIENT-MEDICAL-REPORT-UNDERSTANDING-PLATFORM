# Admin Dashboard - Healthcare Management System

A full-stack admin dashboard for managing doctors, patients, and lab reports built with React, FastAPI, and PostgreSQL.

## Features

### Dashboard
- **Statistics Cards**: Display total doctors, patients, reports, and recent uploads (7 days)
- **Report Upload**: Upload lab reports with patient details and doctor assignment
- **Search**: Search reports by patient name, registration number, doctor name, or file name
- **Reports Table**: View all uploaded reports with pagination

### Manage Doctors
- View all registered doctors
- Approve or reject doctor registrations
- Status badges (Pending/Approved/Rejected)
- Pagination support

### Manage Patients
- View all patients with their report counts
- Search functionality
- Auto-updates when new reports are uploaded
- Pagination support

### Authentication
- JWT-based authentication
- Admin login protection
- Doctor signup with approval workflow

## Tech Stack

- **Frontend**: React 18, React Router, Axios, Lucide Icons, React Toastify
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT (OAuth 2.0 compatible)

## Project Structure

```
code/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── utils/           # Utilities (auth, security)
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database connection
│   │   └── main.py          # FastAPI app
│   ├── uploads/             # Uploaded files
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env
└── docker-compose.yml
```

## Quick Start with Docker

1. **Clone the repository**

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Default Admin Credentials**
   - Email: `admin@admin.com`
   - Password: `admin123`

## Manual Setup (Development)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update DATABASE_URL for local PostgreSQL

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `.env` with backend URL if needed

4. **Run development server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /doctor/signup` - Doctor registration
- `POST /doctor/login` - Doctor login (approved only)
- `POST /doctor/admin/login` - Admin login

### Admin Dashboard
- `GET /admin/stats` - Get dashboard statistics
- `POST /admin/upload-report` - Upload lab report
- `GET /admin/reports` - Get all reports (paginated)
- `GET /admin/reports/count` - Get total reports count
- `GET /admin/search` - Search reports

### Manage Doctors
- `GET /admin/doctors` - Get all doctors (paginated)
- `GET /admin/doctors/count` - Get total doctors count
- `GET /admin/doctors/approved` - Get approved doctors
- `PATCH /admin/doctors/:id/approve` - Approve doctor
- `PATCH /admin/doctors/:id/reject` - Reject doctor

### Manage Patients
- `GET /admin/patients` - Get all patients (paginated)
- `GET /admin/patients/count` - Get total patients count

## Database Models

### Doctor
- id, name, email, password (hashed), specialization, phone, registration_id, status, created_at

### Patient
- id, name, registration_number (unique), assigned_doctor_id, total_reports, created_at

### Report
- id, patient_id, doctor_id, file_url, file_name, uploaded_at

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected routes (admin middleware)
- Input validation with Pydantic
- CORS configuration

## Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build

# Remove volumes (reset database)
docker-compose down -v
```

## License

MIT License
