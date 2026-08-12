# 🎓 Placement Preparation Portal — Backend API

A production-ready RESTful backend API for a college placement preparation platform. Built with **Node.js**, **Express.js**, and **PostgreSQL** (via Prisma ORM), designed for deployment on **Vercel Serverless Functions**.

## Features

- 🔐 **JWT Authentication** with role-based access (Student, Alumni, Admin)
- 🏢 **Company Directory** with CRUD and search
- 📝 **Interview Experiences** with tagging, filtering, and outcome tracking
- 📚 **Preparation Hub** with categorized aptitude and coding resources
- 📄 **Resume Assets** with ATS templates and action-word dictionaries
- 📢 **Notifications** board for placement alerts
- 🤖 **ATS Resume Analyzer** — smart keyword matching with weighted scoring

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 6.x |
| Auth | JWT + bcryptjs |
| File Upload | Multer (memoryStorage) |
| PDF Parsing | pdf-parse |
| Security | Helmet, CORS, Rate Limiting |
| Deployment | Vercel Serverless Functions |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Project
npm install
```

### 2. Set Up Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Neon PostgreSQL — get these from https://console.neon.tech
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx-pooler.us-east-2.aws.neon.tech/placement_portal?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxxx.us-east-2.aws.neon.tech/placement_portal?sslmode=require"

# JWT Secret — use a strong random string (64+ chars)
JWT_SECRET="generate-a-strong-secret-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"
```

> **How to get Neon URLs:**
> 1. Go to [console.neon.tech](https://console.neon.tech)
> 2. Create a project → Create a database named `placement_portal`
> 3. Go to **Dashboard** → Copy the **Connection string**
> 4. For `DATABASE_URL`: use the string with `-pooler` in the hostname
> 5. For `DIRECT_URL`: use the string WITHOUT `-pooler` in the hostname

### 3. Set Up Database

```bash
# Generate the Prisma client
npx prisma generate

# Push schema to Neon (creates all tables)
npx prisma db push

# Seed the database with prep resources & resume assets
npx prisma db seed

# (Optional) Open Prisma Studio to view your data
npx prisma studio
```

### 4. Run Locally

```bash
npm run dev
```

The API will start at `http://localhost:3000`. Test it:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Placement Preparation Portal API is running.",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

## API Reference

### 🔐 Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "STUDENT",
    "college": "BVCEC",
    "branch": "CSE",
    "graduationYear": 2025
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get Profile (use token from login response)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update Profile
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "John Updated", "college": "BVCEC" }'
```

### 🏢 Companies

```bash
# List (public, paginated, searchable)
curl "http://localhost:3000/api/companies?page=1&limit=10&search=google"

# Get one
curl http://localhost:3000/api/companies/COMPANY_ID

# Create (Admin only)
curl -X POST http://localhost:3000/api/companies \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google",
    "description": "Tech giant",
    "website": "https://google.com",
    "rolesHired": ["SDE", "SDE-2", "Data Analyst"],
    "eligibilityCriteria": "B.Tech CSE/IT with 7+ CGPA",
    "minCGPA": 7.0,
    "allowedBranches": ["CSE", "IT", "ECE"]
  }'

# Update / Delete (Admin only)
curl -X PUT http://localhost:3000/api/companies/COMPANY_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "description": "Updated description" }'

curl -X DELETE http://localhost:3000/api/companies/COMPANY_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 📝 Interview Experiences

```bash
# List (public, filterable)
curl "http://localhost:3000/api/experiences?companyId=XXX&outcome=SELECTED&tag=DSA&page=1"

# Create (Student/Alumni)
curl -X POST http://localhost:3000/api/experiences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Google SDE Interview 2025",
    "content": "Round 1 was an online coding test with 3 DSA problems...",
    "outcome": "SELECTED",
    "role": "SDE-1",
    "yearOfInterview": 2025,
    "companyId": "COMPANY_ID",
    "rounds": ["Online Test", "Technical Round 1", "Technical Round 2", "HR"],
    "tags": ["DSA", "System Design", "HR"]
  }'
```

### 📚 Preparation Resources

```bash
# List by category
curl "http://localhost:3000/api/resources?category=CODING"
curl "http://localhost:3000/api/resources?category=APTITUDE"

# Categories: APTITUDE, CODING, VERBAL, LOGICAL, TECHNICAL
```

### 📄 Resume Assets

```bash
# List templates
curl "http://localhost:3000/api/assets?type=TEMPLATE"

# List action word dictionaries
curl "http://localhost:3000/api/assets?type=ACTION_WORDS"
```

### 📢 Notifications

```bash
# Public feed
curl "http://localhost:3000/api/notifications?page=1&limit=10"

# Create alert (Admin only)
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TCS Placement Drive",
    "message": "TCS is visiting campus on 15th August for B.Tech 2025 batch.",
    "type": "PLACEMENT_DRIVE",
    "companyName": "TCS",
    "eventDate": "2025-08-15T09:00:00Z"
  }'
```

### 🤖 ATS Resume Analyzer

```bash
# Analyze resume (upload PDF + provide JD)
curl -X POST http://localhost:3000/api/ats/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "resume=@/path/to/resume.pdf" \
  -F "jobDescription=We are looking for a Software Engineer with experience in React, Node.js, PostgreSQL, Docker, and AWS. Must have strong problem-solving skills and experience with agile methodologies."

# Get scan history
curl http://localhost:3000/api/ats/history \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific scan
curl http://localhost:3000/api/ats/history/SCAN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example ATS Response:**
```json
{
  "success": true,
  "message": "Resume analysis complete.",
  "data": {
    "scanId": "clxxx...",
    "fileName": "resume.pdf",
    "matchScore": 72,
    "totalKeywords": 15,
    "foundCount": 11,
    "missingCount": 4,
    "foundKeywords": ["react", "node.js", "postgresql", "docker", "aws", "problem solving", "agile"],
    "missingKeywords": ["kubernetes", "ci/cd", "terraform", "graphql"],
    "categoryBreakdown": {
      "technical": { "found": ["react", "node.js", "postgresql", "docker", "aws"], "missing": ["kubernetes", "ci/cd", "terraform", "graphql"], "score": 56, "total": 9 },
      "soft": { "found": ["problem solving"], "missing": [], "score": 100, "total": 1 },
      "experience": { "found": ["agile"], "missing": [], "score": 100, "total": 1 }
    },
    "resumeWordCount": 450,
    "pdfPages": 1
  }
}
```

---

## Deploying to Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Set Environment Variables

```bash
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
vercel env add NODE_ENV
```

Or set them in the Vercel Dashboard → Project → Settings → Environment Variables.

### 3. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

The `vercel.json` file automatically:
- Builds the Prisma client via the `vercel-build` script
- Routes all `/api/*` traffic to the Express serverless function

### 4. Post-Deploy: Push Schema

After the first deploy, push your database schema:

```bash
npx prisma db push
npx prisma db seed
```

---

## Project Structure

```
Project/
├── api/
│   └── index.js              ← Vercel serverless entry point
├── prisma/
│   ├── schema.prisma          ← Database schema (8 models, 4 enums)
│   └── seed.js                ← Seed data (14 resources, 5 assets)
├── src/
│   ├── app.js                 ← Express app (CORS, routes, error handling)
│   ├── server.js              ← Local dev server (not used on Vercel)
│   ├── config/
│   │   └── database.js        ← Prisma singleton (serverless-safe)
│   ├── middleware/
│   │   ├── auth.js            ← JWT verification
│   │   ├── authorize.js       ← Role-based access control
│   │   ├── upload.js          ← Multer memoryStorage (PDF only, 5MB)
│   │   ├── validate.js        ← Request validation
│   │   └── errorHandler.js    ← Global error handler
│   ├── routes/                ← 7 route modules
│   ├── controllers/           ← 7 controller modules
│   └── utils/
│       ├── atsAnalyzer.js     ← ATS matching engine
│       ├── stopWords.js       ← 175 stop words
│       ├── skillDictionaries.js ← Categorized skill terms
│       └── helpers.js         ← Pagination, response utilities
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## Roles & Permissions

| Action | Student | Alumni | Admin |
|--------|---------|--------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| View Profile | ✅ | ✅ | ✅ |
| View Companies | ✅ | ✅ | ✅ |
| Manage Companies | ❌ | ❌ | ✅ |
| View Experiences | ✅ | ✅ | ✅ |
| Write Experiences | ✅ | ✅ | ✅ |
| Edit/Delete Own Experiences | ✅ | ✅ | ✅ |
| Edit/Delete Any Experience | ❌ | ❌ | ✅ |
| View Resources & Assets | ✅ | ✅ | ✅ |
| Manage Resources & Assets | ❌ | ❌ | ✅ |
| View Notifications | ✅ | ✅ | ✅ |
| Create/Delete Notifications | ❌ | ❌ | ✅ |
| Use ATS Analyzer | ✅ | ✅ | ✅ |

---

## License

ISC
