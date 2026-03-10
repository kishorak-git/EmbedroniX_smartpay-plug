# SmartPayPlug - Payment-Based Power Control System

**Tagline:** Pay. Power. Plug.

## 🎯 Overview

SmartPayPlug is a full-stack IoT power control system that activates physical power outputs based on payment amounts. The system integrates **Razorpay payment gateway**, **ESP32 WiFi-controlled relays**, SMS notifications, and real-time monitoring with a beautiful **glassmorphism UI**.

## ⚡ System Features

- **3 Payment Tiers:** ₹10, ₹20, ₹30
- **3 Power Outputs:** 10s, 20s, 30s activation
- **Razorpay Payment Gateway:** Support for UPI, Cards, Wallets, Net Banking
- **ESP32 WiFi Relay Control:** Remote hardware activation via HTTP API
- **Payment Webhooks:** Real-time payment verification
- **SMS Notifications:** Customer alerts via Twilio
- **Modern Glassmorphism UI:** Beautiful, responsive design
- **Real-time Admin Dashboard:** Transaction monitoring
- **PostgreSQL Transaction Logging:** Complete payment history
- **Secure Payment Verification:** HMAC-SHA256 signature validation

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TailwindCSS** - Utility-first styling with custom glassmorphism theme
- **Razorpay Checkout SDK** - Payment UI integration
- **Axios** - HTTP client

### Backend
- **Node.js & Express.js** - REST API server
- **PostgreSQL (Supabase)** - Cloud-hosted database
- **Razorpay SDK** - Payment gateway integration
- **Axios** - ESP32 HTTP communication
- **crypto** - Payment signature verification

### Hardware
- **ESP32 Microcontroller** - WiFi-enabled relay controller
- **3-Channel Relay Module** - Power switching
- **ArduinoJSON** - ESP32 API responses

### Additional Services
- **Razorpay** - Payment processing
- **Twilio** - SMS notifications
- **Supabase** - PostgreSQL hosting

## 📁 Project Structure

```
SmartPayPlug/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── config/   # Database & environment config
│   │   ├── routes/   # API endpoints
│   │   ├── controllers/ # Business logic
│   │   ├── services/ # GPIO, SMS, Timer services
│   │   └── models/   # Database models
│   └── server.js
├── frontend/         # Next.js application
│   ├── src/
│   │   ├── app/      # Pages & layouts
│   │   ├── components/ # Reusable components
│   │   └── lib/      # Utilities
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/smartpayplug
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
UPI_ID=yourupi@bank
GPIO_PIN_1=17
GPIO_PIN_2=27
GPIO_PIN_3=22
NODE_ENV=development
```

Initialize database:

```bash
npm run db:migrate
```

Start server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_UPI_ID=yourupi@bank
```

Start development server:

```bash
npm run dev
```

Access at: `http://localhost:3000`

## 📊 Database Schema

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15),
    amount INTEGER NOT NULL,
    output_port INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create-transaction` | Create new payment transaction |
| POST | `/api/confirm-payment` | Confirm payment and activate port |
| POST | `/api/activate-output` | Trigger GPIO output |
| GET | `/api/transactions` | Get all transactions |
| GET | `/api/port-status` | Get current port status |
| POST | `/api/cancel-transaction` | Cancel pending transaction |

## 🛡️ Safety Features

- Port availability checking
- Duplicate activation prevention
- Auto-cancellation (2 minutes)
- Graceful timer cleanup
- Transaction logging
- Error handling & validation

## 📱 Payment Flow

1. User selects amount (₹10/₹20/₹30)
2. QR code displayed with UPI details
3. User completes payment
4. Payment confirmed (or simulated)
5. Corresponding output activated
6. SMS sent to user
7. Live countdown displayed
8. Port auto-deactivated after duration
9. Transaction logged

## 🔐 Admin Dashboard

Access: `/admin`

Features:
- Total transactions & revenue
- Active ports status
- Live countdown timers
- Transaction history
- Manual port reset

## 🎨 UI Design

- Modern minimal design
- Blue primary theme (#3B82F6)
- Fully responsive
- Animated countdown
- Real-time status updates
- Loading states

## 🚀 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

### Backend (Render/Railway)

1. Connect GitHub repository
2. Set environment variables
3. Deploy from main branch

### Database (Render/Railway)

1. Create PostgreSQL instance
2. Copy connection string
3. Update backend DATABASE_URL

## 📝 License

MIT License

## 👨‍💻 Author

SmartPayPlug Team

---

**Built for real-world public infrastructure usage** 🚀
