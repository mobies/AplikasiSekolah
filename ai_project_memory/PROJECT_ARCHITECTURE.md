# Project Architecture - Struktur & Flow

## 1. Diagram Arsitektur (High Level)
```text
[ USER BROWSER ] <------> [ FIREBASE HOSTING ]
       |
       | (httpsCallable v2)
       v
[ CLOUD FUNCTIONS ] <---> [ ADMIN SDK ]
       |                      |
       +----------------------+------> [ FIRESTORE (Main Data) ]
       |                      |
       +----------------------+------> [ RTDB (Config & Cache) ]
```

## 2. Struktur Project
```text
/
├── functions/             # Backend (Firebase Cloud Functions v2)
│   ├── src/index.ts       # Central logic & API exports
│   └── package.json
├── web/                   # Frontend (Next.js 14)
│   ├── src/app/           # Next.js App Router (Pages)
│   ├── src/lib/           # Firebase config & utilities
│   └── tailwind.config.ts
├── DB_MAP.md              # Skema database detail
└── ai_project_memory/     # Project memory for AI continuity
```

## 3. Flow Login & Verifikasi Role
```text
1. User clicks "Login Google"
2. Firebase Auth returns User Object
3. Frontend calls Cloud Function: checkUserRole()
4. checkUserRole performs:
   a. validateOrigin (CORS check via RTDB)
   b. check UID in RTDB owner/lists/ (Owner role)
   c. if not found, check Email in Firestore schools/ (School Admin role)
5. Backend returns { role, data }
6. Frontend redirects to /owner/dashboard or /admin/dashboard
```

## 4. Security Layer
- **Dynamic CORS**: Allowed domains disimpan di RTDB `system/config/allowedOrigins`.
- **Identity Enforcement**: Email admin sekolah didapat langsung dari Google Auth (Verified), bukan input manual.
- **Admin SDK Isolation**: Database utama ditutup via Rules (`.read: false`), akses hanya melalui Cloud Functions yang terverifikasi.
