
# متتبع الفسيولوجيا العصبية - زيدان
## دليل التثبيت والتشغيل الشامل

### 📋 نظرة عامة
تطبيق شامل لتتبع وإدارة حالات الفسيولوجيا العصبية مع قاعدة بيانات متقدمة وإمكانية التثبيت على الهواتف المحمولة كتطبيق PWA.

### ✨ المميزات الرئيسية
- 📱 **تطبيق PWA قابل للتثبيت** على جميع الأجهزة
- 🗄️ **قاعدة بيانات SQLite** مع REST API
- 🔄 **مزامنة تلقائية** عبر الأجهزة
- 📊 **تقارير تفصيلية** مع تصدير PDF/Excel
- 🌐 **يعمل بدون إنترنت** (Offline Support)
- 🎨 **واجهة عربية** مُحسّنة للموبايل
- 📈 **لوحة تحكم تفاعلية** مع الرسوم البيانية

---

## 🚀 التثبيت والإعداد

### المتطلبات الأساسية
```bash
- Node.js (الإصدار 16 أو أحدث)
- npm (الإصدار 8 أو أحدث)
- متصفح حديث يدعم PWA
```

### 1️⃣ إعداد الخادم (Backend)

#### تحميل المتطلبات
```bash
# إنشاء مجلد المشروع
mkdir neurophysiology-tracker
cd neurophysiology-tracker

# إنشاء ملف package.json
npm init -y

# تثبيت المكتبات المطلوبة
npm install express sqlite3 cors helmet morgan compression express-rate-limit dotenv bcryptjs jsonwebtoken express-validator multer moment

# تثبيت أدوات التطوير
npm install --save-dev nodemon jest supertest eslint
```

#### إنشاء ملفات الخادم
1. **إنشاء ملف `server.js`** (استخدم الكود المرفق)
2. **إنشاء ملف `package.json`** (استخدم الكود المرفق)

#### تشغيل الخادم
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

الخادم سيعمل على: `http://localhost:3000`

### 2️⃣ إعداد التطبيق (Frontend PWA)

#### إنشاء مجلد التطبيق
```bash
# إنشاء مجلد public
mkdir public
cd public

# نسخ ملف التطبيق
# ضع ملف neurophysiology_pwa.html في مجلد public
```

#### إعداد Service Worker
```bash
# إنشاء ملف sw.js في مجلد public
touch sw.js
```

محتوى ملف `sw.js`:
```javascript
const CACHE_NAME = 'neurophysiology-tracker-v1';
const urlsToCache = [
  '/',
  '/neurophysiology_pwa.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

---

## 📱 تثبيت التطبيق على الهاتف

### للأندرويد (Chrome/Edge)
1. افتح التطبيق في المتصفح
2. اضغط على أيقونة القائمة (⋮)
3. اختر **"إضافة إلى الشاشة الرئيسية"**
4. اضغط **"إضافة"** للتأكيد

### للآيفون (Safari)
1. افتح التطبيق في Safari
2. اضغط على أيقونة المشاركة (□↗)
3. اختر **"إضافة إلى الشاشة الرئيسية"**
4. اضغط **"إضافة"** للتأكيد

### للكمبيوتر (Chrome/Edge)
1. افتح التطبيق في المتصفح
2. ابحث عن أيقونة التثبيت في شريط العنوان
3. اضغط **"تثبيت"**

---

## 🗄️ إدارة قاعدة البيانات

### هيكل قاعدة البيانات
```sql
-- جدول الحالات
CREATE TABLE cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    exam_date DATE NOT NULL,
    doctor_name TEXT NOT NULL,
    location TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الأطباء
CREATE TABLE doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الفروع
CREATE TABLE branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول أنواع الفحوصات
CREATE TABLE exam_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### نسخ احتياطي لقاعدة البيانات
```bash
# إنشاء نسخة احتياطية
npm run db:backup

# إعادة تعيين قاعدة البيانات
npm run db:reset
```

---

## 🔧 API المتاحة

### نقاط النهاية الرئيسية

#### الحالات
```http
GET    /api/cases              # جلب جميع الحالات
GET    /api/cases/:id          # جلب حالة محددة
POST   /api/cases              # إضافة حالة جديدة
PUT    /api/cases/:id          # تحديث حالة
DELETE /api/cases/:id          # حذف حالة
```

#### الأطباء
```http
GET    /api/doctors            # جلب جميع الأطباء
POST   /api/doctors            # إضافة طبيب جديد
DELETE /api/doctors/:id        # حذف طبيب
```

#### الفروع
```http
GET    /api/branches           # جلب جميع الفروع
POST   /api/branches           # إضافة فرع جديد
DELETE /api/branches/:id       # حذف فرع
```

#### أنواع الفحوصات
```http
GET    /api/exam-types         # جلب جميع الأنواع
POST   /api/exam-types         # إضافة نوع جديد
DELETE /api/exam-types/:id     # حذف نوع
```

#### الإحصائيات
```http
GET    /api/dashboard/stats    # إحصائيات لوحة التحكم
```

### مثال على استخدام API
```javascript
// إضافة حالة جديدة
const newCase = {
    patient_id: "P001",
    patient_name: "أحمد محمد",
    exam_date: "2024-01-15",
    doctor_name: "د. سارة أحمد",
    location: "الفرع الرئيسي",
    exam_type: "NCS + EMG",
    notes: "فحص روتيني"
};

fetch('/api/cases', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(newCase)
});
```

---

## 🌐 النشر والاستضافة

### النشر المحلي
```bash
# تشغيل الخادم
npm start

# الوصول للتطبيق
http://localhost:3000
```

### النشر على Heroku
```bash
# تسجيل الدخول لـ Heroku
heroku login

# إنشاء تطبيق جديد
heroku create neurophysiology-tracker

# رفع الكود
git add .
git commit -m "Initial deployment"
git push heroku main

# فتح التطبيق
heroku open
```

### النشر على Vercel
```bash
# تثبيت Vercel CLI
npm i -g vercel

# النشر
vercel

# اتباع التعليمات التفاعلية
```

### إعداد HTTPS
للحصول على جميع مميزات PWA، يجب استخدام HTTPS:

```javascript
// إضافة SSL في Express
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('path/to/private-key.pem'),
    cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

## 🔒 الأمان والحماية

### إعدادات الأمان
```javascript
// في server.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// حماية الرؤوس
app.use(helmet());

// تحديد معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100 // حد أقصى 100 طلب لكل IP
});
app.use(limiter);
```

### نسخ احتياطية منتظمة
```bash
# إنشاء script للنسخ الاحتياطي التلقائي
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp neurophysiology.db "backups/neurophysiology_backup_$DATE.db"
```

---

## 🛠️ استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. التطبيق لا يعمل بدون إنترنت
```javascript
// تأكد من تسجيل Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
```

#### 2. قاعدة البيانات لا تحفظ البيانات
```bash
# تحقق من صلاحيات الملف
chmod 664 neurophysiology.db
```

#### 3. التطبيق لا يظهر للتثبيت
- تأكد من وجود ملف manifest.json
- تأكد من استخدام HTTPS
- تأكد من تسجيل Service Worker

#### 4. مشاكل في المزامنة
```javascript
// تحقق من حالة الاتصال
window.addEventListener('online', () => {
    console.log('متصل بالإنترنت');
    syncData();
});

window.addEventListener('offline', () => {
    console.log('غير متصل بالإنترنت');
});
```

---

## 📊 المراقبة والتحليل

### مراقبة الأداء
```javascript
// إضافة مراقبة الأداء
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${duration}ms`);
    });
    next();
});
```

### تسجيل الأخطاء
```javascript
// تسجيل الأخطاء
app.use((err, req, res, next) => {
    console.error('خطأ:', err.stack);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
});
```

---

## 🔄 التحديثات والصيانة

### تحديث التطبيق
```bash
# سحب آخر التحديثات
git pull origin main

# تحديث المكتبات
npm update

# إعادة تشغيل الخادم
npm restart
```

### إضافة مميزات جديدة
1. إضافة نقاط API جديدة في `server.js`
2. تحديث واجهة المستخدم في `neurophysiology_pwa.html`
3. تحديث Service Worker إذا لزم الأمر
4. اختبار التطبيق
5. نشر التحديثات

---

## 📞 الدعم والمساعدة

### الحصول على المساعدة
- 📧 البريد الإلكتروني: support@zidan-medical.com
- 📱 الهاتف: +966-XX-XXX-XXXX
- 💬 الدردشة المباشرة: متاحة في التطبيق

### المساهمة في التطوير
```bash
# استنساخ المشروع
git clone https://github.com/zidan-medical/neurophysiology-tracker.git

# إنشاء فرع جديد
git checkout -b feature/new-feature

# إضافة التغييرات
git add .
git commit -m "إضافة ميزة جديدة"

# رفع التغييرات
git push origin feature/new-feature
```

---

## 📝 الترخيص
هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

## 🎯 خارطة الطريق المستقبلية
- [ ] إضافة نظام المصادقة المتقدم
- [ ] دعم قواعد بيانات متعددة (PostgreSQL, MySQL)
- [ ] تطبيق موبايل أصلي (React Native)
- [ ] تكامل مع أنظمة المستشفيات
- [ ] ذكاء اصطناعي لتحليل البيانات
- [ ] دعم اللغات المتعددة

---

**تم إنشاء هذا التطبيق بواسطة فريق زيدان الطبي** 🏥✨
