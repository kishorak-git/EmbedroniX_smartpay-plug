# SmartPayPlug - Quick Start Guide

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Code Editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

## 🚀 Quick Setup (5 Minutes)

### Step 1: Clone or Navigate to Project

```bash
cd d:\SmartPayPlug
```

### Step 2: Set Up PostgreSQL Database

#### Windows (PowerShell):

```powershell
# Start PostgreSQL service (if not running)
# Adjust path based on your PostgreSQL installation
& "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\15\data" start

# Create database
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE smartpayplug;"
```

#### Or use pgAdmin:

1. Open pgAdmin
2. Right-click on "Databases" → Create → Database
3. Name: `smartpayplug`
4. Click "Save"

### Step 3: Set Up Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
Copy-Item .env.example .env

# Edit .env file with your database credentials
# Use notepad or any text editor
notepad .env
```

**Update these values in `.env`:**

```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smartpayplug
TWILIO_ACCOUNT_SID=your_sid_here (optional for demo)
TWILIO_AUTH_TOKEN=your_token_here (optional for demo)
TWILIO_PHONE_NUMBER=+1234567890 (optional for demo)
UPI_ID=yourupi@bank
GPIO_PIN_1=17
GPIO_PIN_2=27
GPIO_PIN_3=22
```

**Run database migration:**

```bash
npm run db:migrate
```

You should see: ✅ Database migration completed successfully

**Start backend server:**

```bash
npm run dev
```

Server should start at: `http://localhost:5000`

### Step 4: Set Up Frontend (New Terminal)

Open a **new terminal** and run:

```bash
# Navigate to frontend folder
cd d:\SmartPayPlug\frontend

# Install dependencies
npm install

# Create .env.local file
Copy-Item .env.local.example .env.local

# Edit .env.local (optional - defaults work for local dev)
notepad .env.local
```

**Start frontend:**

```bash
npm run dev
```

Frontend should start at: `http://localhost:3000`

### Step 5: Access the Application

Open your browser and navigate to:

- **Main App:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **Backend API:** http://localhost:5000

## ✨ Testing the Application

### Test Payment Flow:

1. Go to http://localhost:3000
2. Click "Pay Now" on any pricing card
3. On the payment page, click "Simulate Payment Success (Demo)"
4. Watch the countdown timer and see the port activate
5. Go to http://localhost:3000/admin to see the transaction

### Test Admin Dashboard:

1. Go to http://localhost:3000/admin
2. View real-time port status
3. See transaction history
4. Monitor active sessions
5. Use "Reset Port" to manually deactivate a port

## 🔧 Common Issues & Solutions

### Issue 1: Port 5000 Already in Use

**Solution:**
```bash
# Change PORT in backend/.env to different port (e.g., 5001)
PORT=5001

# Update NEXT_PUBLIC_API_URL in frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Issue 2: Database Connection Failed

**Solution:**
1. Ensure PostgreSQL is running
2. Check database credentials in backend/.env
3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```
4. If needed, recreate database:
   ```bash
   psql -U postgres -c "DROP DATABASE IF EXISTS smartpayplug;"
   psql -U postgres -c "CREATE DATABASE smartpayplug;"
   ```

### Issue 3: npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstall
npm install
```

### Issue 4: GPIO Module Error (Expected on Windows)

**Don't worry!** GPIO modules only work on Raspberry Pi. On Windows/Mac, the system runs in **simulation mode** - everything works the same, just without actual hardware control.

You'll see: `⚠️ GPIO not available (running in simulation mode)`

This is normal and expected for development.

## 📱 SMS Configuration (Optional)

To enable real SMS notifications:

1. Sign up for Twilio: https://www.twilio.com/try-twilio
2. Get your Account SID and Auth Token
3. Get a Twilio phone number
4. Update backend/.env with your credentials:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

Without Twilio, SMS will work in simulation mode (logged to console).

## 🎯 Next Steps

- **Customize:** Modify pricing in `frontend/src/app/page.js`
- **Style:** Update colors in `frontend/tailwind.config.js`
- **Deploy:** See DEPLOYMENT.md for production deployment
- **Hardware:** Connect Raspberry Pi GPIO pins for real hardware control

## 🆘 Need Help?

Check the main README.md for detailed documentation.

**System Status Checks:**

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check database connection
# In backend folder
node -e "require('./src/config/database').query('SELECT NOW()', (e,r) => console.log(r?.rows || e))"
```

## 📊 Project Structure Quick Reference

```
SmartPayPlug/
├── backend/              # API Server
│   ├── server.js        # Main entry point
│   ├── src/
│   │   ├── config/      # Database setup
│   │   ├── models/      # Transaction model
│   │   ├── controllers/ # Business logic
│   │   ├── services/    # GPIO, SMS services
│   │   └── routes/      # API endpoints
│   └── package.json
│
└── frontend/            # Next.js App
    ├── src/
    │   ├── app/         # Pages
    │   │   ├── page.js          # Home
    │   │   ├── payment/page.js  # Payment
    │   │   └── admin/page.js    # Dashboard
    │   └── lib/         # API utilities
    └── package.json
```

---

**Ready to build!** 🚀 If you encounter any issues, check the logs in both terminal windows.
