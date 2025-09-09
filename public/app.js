// ==================== Translations ====================
const translations = {
  ar: {
    app_title: "متتبع الفسيولوجيا العصبية - زيدان",
    dashboard: "لوحة التحكم",
    cases: "الحالات",
    settings: "الإعدادات",
  },
  en: {
    app_title: "Zidan's Neurophysiology Tracker",
    dashboard: "Dashboard",
    cases: "Cases",
    settings: "Settings",
  }
};

let currentLanguage = localStorage.getItem('language') || 'en';

// ==================== API Config ====================
const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:3000/api'
  : '/api';

// ==================== Init App ====================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  switchLanguage(currentLanguage);
  loadAllData();
  setupLanguageSwitcher();
}

// ==================== Language Switch ====================
function switchLanguage(lang) {
  if (!translations[lang]) return; // fallback if unknown lang
  currentLanguage = lang;
  localStorage.setItem('language', lang);

  document.title = translations[lang].app_title;
  const appTitleElem = document.getElementById('appTitle');
  if (appTitleElem) appTitleElem.textContent = translations[lang].app_title;
}

// Optional: if you have UI elements for switching language
function setupLanguageSwitcher() {
  const langButtons = document.querySelectorAll('[data-lang]');
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
  });
}

// ==================== API Request Helper ====================
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    if (!res.ok) {
      // لو في مشكلة في الاستجابة
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
    }

    return await res.json();

  } catch (err) {
    console.error("API error:", err);

    // هنا ممكن تضيف Alert أو Toast يظهر للمستخدم
    alert("⚠️ حصلت مشكلة في الاتصال بالسيرفر. حاول تاني.");

    return null; // عشان تقدر تميز إن في Error
  }
}

// ==================== Load Data ====================
async function loadAllData() {
  const doctors = await apiRequest('/doctors');
  if (doctors) {
    console.log("Doctors:", doctors);
    // ممكن تضيف هنا render على الواجهة أو أي عمليات تانية
  }
}
