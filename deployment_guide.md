# Deployment & Setup Guide: SAJ Payment Collection System

This guide outlines instructions to set up, run, and deploy the SAJ SaaS-based Payment Collection and Follow-up Management System.

---

## 1. Prerequisites

Ensure you have the following installed on your development machine:
- **Node.js** (v18.x or v20.x recommended)
- **npm** (v9.x or later)
- **PostgreSQL Database** (v14 or later, running locally or in the cloud)
- **Expo Go App** (installed on an iOS or Android device for mobile testing)

---

## 2. Directory Layout & Setup

Clone/navigate to your workspace folder:
```
SAJ-Payment-followup/
├── backend/                  # NestJS API application
├── admin-portal/             # Next.js web application
└── mobile-app/               # React Native Expo app
```

---

## 3. Step-by-Step Module Configuration

### Phase A: PostgreSQL Database & NestJS Backend

1. **Configure Environment Variables**:
   Open [backend/.env](file:///a:/SAJ%20Technologies%20Pvt%20Ltd/SAJ-Payment%20fowlloup%20APK/backend/.env) and update parameters:
   - `DATABASE_URL`: Set your PostgreSQL username, password, host, and database name.
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay Dashboard API credentials.
   - `WATI_API_ENDPOINT` & `WATI_API_TOKEN`: WATI dashboard API integration keys.
   - `MOCK_INTEGRATIONS`: Set to `true` to skip active calls to WATI/Razorpay and simulate successful runs locally. Set to `false` in production.

2. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Run Prisma Migrations**:
   Run the following commands to create database schemas in PostgreSQL and generate the TypeScript client:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Start the NestJS Development Server**:
   ```bash
   npm run start:dev
   ```
   The backend will bootstrap on `http://localhost:3001`.
   - **REST API Specs**: Check Swagger docs at `http://localhost:3001/docs`

---

### Phase B: Next.js Admin Web Portal

1. **Install Web Dependencies**:
   ```bash
   cd ../admin-portal
   npm install
   ```

2. **Configure App Target Port & API Routes**:
   Ensure Next.js targets the NestJS backend endpoint (`http://localhost:3001/api`). The dashboard page is set to connect to this API by default, falling back gracefully to simulated memory stores if the server is off.

3. **Start the Next.js Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.
   - **Access levels**: You can click the quick-login shortcuts on the home page to bypass Firebase authentication and instantly browse the portal as an **Admin** or **Staff Member**.

---

### Phase C: React Native Expo Mobile App

1. **Install Native Dependencies**:
   ```bash
   cd ../mobile-app
   npm install
   ```

2. **Start the Expo Packager**:
   ```bash
   npx expo start
   ```
   - **Run on physical device**: Scan the QR code displayed in the terminal using the Expo Go app.
   - **Run on simulator**: Press `a` for Android emulator or `i` for iOS simulator.

---

## 4. Payment Gateway & Webhook Setup (Razorpay)

1. Navigate to the **Razorpay Dashboard** -> **Settings** -> **Webhooks**.
2. Create a new webhook:
   - **Webhook URL**: `https://<your-public-backend-url>/api/webhooks/razorpay` (For local testing, run `ngrok http 3001` and use the generated https URL).
   - **Active Events**: Check `payment_link.paid`.
   - **Secret**: Set a webhook secret and copy it into the backend `.env` file as `RAZORPAY_WEBHOOK_SECRET`.

---

## 5. WhatsApp API Setup (WATI)

1. Register your business phone number on the **WATI Portal** and configure templates.
2. Register the following templates:
   - **saj_payment_request**:
     `Hello {{1}}, here is the payment request for Invoice {{2}} of amount {{3}}, due on {{4}}. Pay securely: {{5}}`
   - **saj_gentle_reminder**:
     `Hi {{1}}, this is a gentle reminder that Invoice {{2}} is due soon. Amount: {{3}}. Pay link: {{4}}`
   - **saj_pending_payment**:
     `Hi {{1}}, Invoice {{2}} remains outstanding. Please process payment: {{3}} Link: {{4}}`
   - **saj_overdue_payment**:
     `URGENT: Invoice {{2}} is now overdue. Please clear amount {{3}} immediately: {{4}}`
   - **saj_payment_thankyou**:
     `Thank you {{1}}. We received your payment of {{2}} for Invoice {{3}}. Ref: {{4}}`
3. Input your API access token in `WATI_API_TOKEN` under the backend `.env` configurations.

---

## 6. Production Cloud Deployment (GCP)

### 1. Database (GCP Cloud SQL)
- Create a PostgreSQL instance in **Google Cloud SQL**.
- Configure IAM credentials and VPC peering.
- Supply the production connection string to the NestJS runtime configuration.

### 2. Backend (Cloud Run)
- Build the Docker container:
  ```bash
  docker build -t gcr.io/saj-surveys/backend:latest ./backend
  docker push gcr.io/saj-surveys/backend:latest
  ```
- Deploy to **GCP Cloud Run** mapping environment variables from **Secret Manager**.

### 3. Admin Portal (Firebase Hosting or Vercel)
- Compile production assets:
  ```bash
  cd admin-portal
  npm run build
  ```
- Deploy to **Firebase Hosting**:
  ```bash
  firebase deploy
  ```

### 4. Mobile App (Expo EAS Build)
- Install EAS CLI: `npm install -g eas-cli`.
- Log in and compile release packages for app stores:
  ```bash
  eas build --platform all
  ```
