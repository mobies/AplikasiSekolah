# Aplikasi Sekolah SaaS - Modern Multi-School System

Selamat datang di proyek **Aplikasi Sekolah SaaS**. Proyek ini dibangun dengan standar enterprise menggunakan arsitektur Serverless Multi-tenant.

## 🚀 Panduan Pengembang & AI
Untuk menjaga kontinuitas pengembangan dan memahami arsitektur sistem, seluruh dokumentasi, aturan, dan roadmap telah dipusatkan di satu lokasi:

### 📁 [AI Project Memory (Pusat Konteks)](file:///e:/Projects/AntiGravity/Aplikasi%20Sekolah/ai_project_memory/README.md)

Di dalam folder tersebut, Anda akan menemukan:
- **`AI_CONTEXT.md`**: Visi dan teknologi.
- **`PROJECT_ARCHITECTURE.md`**: Alur data dan sistem.
- **`DB_MAP.md`**: Skema database Firestore & RTDB.
- **`ROADMAP.md`**: Rencana pengembangan fase 1-5.
- **`TODO.md`**: Tugas aktif yang sedang dikerjakan.

---

## Cara Menjalankan Project
### Frontend
```bash
cd web
npm install
npm run dev
```

### Backend (Functions)
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---
*Dikelola dengan bangga oleh Antigravity AI Assistant.*
