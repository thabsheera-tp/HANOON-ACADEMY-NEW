# Hanoon Academy — Mobile App Shell & EdTech Platform

> **Modern Islamic EdTech, Academic Home Tuition & Professional Skill Mastery**  
> Built with Next.js (App Router), TypeScript, and Tailwind CSS. Designed as a mobile-first shell ready for Android APK compilation.

---

## 🎨 Design System & Theme

| Element | Specification & Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary Accent** | Rich Emerald Green (`#047857`) | Header, buttons, icons, active borders |
| **Background** | Soft Cream Tint (`#F0FDF4`) | Full app background, soft cards |
| **Highlight Badges** | Subtle Gold / Amber (`#D97706` / `#92400E`) | Program status, rating stars, flagship tags |
| **Headings & Titles** | Deep Midnight Blue (`#0F172A`) | High-contrast readable typography |
| **Body & Labels** | Rich Dark Slate (`#1E293B`) | Crisp legible descriptions |
| **Card Style** | Clean white rounded cards (`rounded-3xl`) | Elevation shadows & touch feedback |

---

## 📱 Step-by-Step App Flow Architecture

1. **Screen 1: Clean Minimalist Home / Course Showcase (NO Form Fields)**
   - Header with Hanoon Academy emblem & *വിജ്ഞാന വെളിച്ചം* motto.
   - Clean mobile cards for the 3 core courses:
     1. **'Athaviy' (അഥവിയ)** — Islamic Sharia & Moral Tarbiyah (`₹1,500/mo`)
     2. **'Home Tuition' (ഹോം ട്യൂഷൻ)** — 1-on-1 Academic Tutoring (`₹2,000/mo`)
     3. **'Fashion Designing' (ഫാഷൻ ഡിസൈനിങ്)** — Professional Modest Apparel (`₹2,500/mo`)
   - Primary CTA: **"Get Started / Enroll Now"** button.

2. **Screen 2: Student Onboarding Form**
   - Triggered only when tapping "Get Started / Enroll Now".
   - Collects: **Full Name**, **WhatsApp Phone Number**, and **Place / District**.
   - Includes "Quick Demo Fill" shortcut.
   - Action: **"Proceed to Payment"**.

3. **Screen 3: Manual UPI Payment View**
   - Clean vector UPI QR Code compatible with Google Pay, PhonePe, and Paytm.
   - Displayed UPI ID (`hanoonacademy@upi`) with 1-tap **Copy UPI** button.
   - Form field for entering the 12-digit **UPI Transaction ID (TxID) / UTR**.
   - Action: **"Submit for Verification"** showing the prominent **"Pending Admin Verification"** banner.
   - "Simulate Approval" shortcut for instant testing.

4. **Screen 4: Student Dashboard**
   - Active unlocked course app card with progress tracking.
   - **Quick Action Buttons:**
     - **🔴 Join Live Class:** Launches in-app interactive video classroom with live student Q&A chat.
     - **📥 Download Recorded Classes:** Opens offline video archive modal with animated progress bars.
     - **View Fee Receipt:** Prints/downloads official admission pass and fee receipt.

---

## 🚀 Running Locally

```bash
# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev

# Open in browser
http://localhost:3000
```

---

## 📦 Converting to an Android APK

### Option 1: Native APK via Capacitor
```bash
# Install Capacitor Android dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# Build static output
npm run build

# Add Android native project
npx cap add android

# Open Android Studio and build the release/debug APK
npx cap open android
```

### Option 2: PWABuilder (No Android Studio required)
1. Deploy this app to Vercel or any host.
2. Go to [pwabuilder.com](https://www.pwabuilder.com) and enter your URL.
3. Download the signed `.apk` ready for installation on Android devices.
