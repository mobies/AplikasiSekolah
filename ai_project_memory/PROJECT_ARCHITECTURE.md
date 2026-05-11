# Project Architecture - Struktur & Flow

## 1. Diagram Arsitektur (High Level)
```text
[ USER BROWSER (SPA Mode) ] <------> [ FIREBASE HOSTING (Static CDN) ]
       |
       | (httpsCallable v2)
       v
[ CLOUD FUNCTIONS (asia-southeast1) ] <---> [ ADMIN SDK ]
       |                                     |
       +-------------------------------------+------> [ RTDB (Main Data, Config & Cache) ]
```

## 2. Struktur Project
```text
/
├── functions/             # Backend (Firebase Cloud Functions v2 - Region: asia-southeast1)
│   ├── src/index.ts       # Central logic & API exports
│   └── package.json
├── web/                   # Frontend (Next.js 16 - SPA Mode)
│   ├── src/app/           # Next.js App Router (Client-side Pages)
│   ├── src/lib/           # Firebase config & utilities
│   ├── out/               # Hasil Build Statis (Deploy Target)
│   └── next.config.ts     # Config: output: 'export'
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
   c. check UID/NPSN in RTDB schools/lists/ (School Admin role)
5. Backend returns { role, data }
6. Frontend redirects to /owner/dashboard or /admin/dashboard
```

## 4. Security Layer
- **Dynamic CORS**: Allowed domains disimpan di RTDB `system/config/allowedOrigins`.
- **Identity Enforcement**: Email admin sekolah didapat langsung dari Google Auth (Verified), bukan input manual.
- **Admin SDK Isolation**: Database utama ditutup via Rules (`.read: false`), akses hanya melalui Cloud Functions yang terverifikasi.
