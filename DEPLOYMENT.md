# SmartPayPlug - Deployment Guide

This guide covers deploying SmartPayPlug to production.

## 🌐 Deployment Architecture

**Recommended Stack:**
- **Frontend:** Vercel (Next.js optimized)
- **Backend:** Render or Railway
- **Database:** Render PostgreSQL or Railway PostgreSQL

**Alternative Options:**
- **All-in-one:** Railway (Frontend + Backend + DB)
- **Self-hosted:** VPS with Docker
- **Device:** Raspberry Pi (for local hardware control)

---

## 🚀 Option 1: Vercel (Frontend) + Render (Backend + DB)

### Part A: Deploy Database (Render)

1. **Go to Render Dashboard**
   - Visit: https://render.com
   - Sign up or log in

2. **Create PostgreSQL Database**
   - Click "New +"
   - Select "PostgreSQL"
   - Name: `smartpayplug-db`
   - Database: `smartpayplug`
   - User: (auto-generated)
   - Region: Choose closest to your users
   - Plan: Free (or paid for production)
   - Click "Create Database"

3. **Save Database Credentials**
   - Copy the "Internal Database URL"
   - Format: `postgresql://user:password@host:5432/smartpayplug`

### Part B: Deploy Backend (Render)

1. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/smartpayplug.git
   git push -u origin main
   ```

2. **Create Web Service on Render**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: `smartpayplug-api`
     - Root Directory: `backend`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: Free (or paid)

3. **Set Environment Variables**
   
   In Render dashboard, add these environment variables:
   
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<paste_internal_database_url_from_step_A3>
   TWILIO_ACCOUNT_SID=<your_twilio_sid>
   TWILIO_AUTH_TOKEN=<your_twilio_token>
   TWILIO_PHONE_NUMBER=<your_twilio_number>
   UPI_ID=yourupi@bank
   GPIO_PIN_1=17
   GPIO_PIN_2=27
   GPIO_PIN_3=22
   FRONTEND_URL=https://smartpayplug.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Note your backend URL: `https://smartpayplug-api.onrender.com`

5. **Run Database Migration**
   - In Render dashboard → Web Service → Shell
   - Run: `npm run db:migrate`

### Part C: Deploy Frontend (Vercel)

1. **Deploy to Vercel**
   ```bash
   cd frontend
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Configuration During Deployment**
   - Set up and deploy: Yes
   - Which scope: (your account)
   - Link to existing project: No
   - Project name: smartpayplug
   - In which directory: ./
   - Override settings: No

3. **Set Environment Variables**
   
   In Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add:
     ```env
     NEXT_PUBLIC_API_URL=https://smartpayplug-api.onrender.com
     NEXT_PUBLIC_UPI_ID=yourupi@bank
     ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

5. **Access Your App**
   - Frontend: `https://smartpayplug.vercel.app`
   - Backend: `https://smartpayplug-api.onrender.com`

---

## 🚂 Option 2: Railway (All-in-One)

### Step 1: Deploy to Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   railway init
   ```

3. **Create PostgreSQL Database**
   ```bash
   railway add postgresql
   ```

4. **Deploy Backend**
   ```bash
   cd backend
   railway up
   ```

5. **Deploy Frontend**
   ```bash
   cd ../frontend
   railway up
   ```

6. **Set Environment Variables**
   ```bash
   # Backend
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=$DATABASE_URL
   railway variables set TWILIO_ACCOUNT_SID=your_sid
   
   # Frontend
   railway variables set NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

---

## 🏠 Option 3: Self-Hosted (VPS or Raspberry Pi)

### Prerequisites
- Ubuntu 20.04+ or Raspberry Pi OS
- Domain name (optional)
- SSH access

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

### Step 2: Set Up Database

```bash
# Create database and user
sudo -u postgres psql
```

In psql:
```sql
CREATE DATABASE smartpayplug;
CREATE USER smartpayuser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE smartpayplug TO smartpayuser;
\q
```

### Step 3: Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/smartpayplug.git
cd smartpayplug

# Set up backend
cd backend
npm install
cp .env.example .env
nano .env  # Edit with your settings
npm run db:migrate

# Start backend with PM2
pm2 start server.js --name smartpayplug-api
pm2 save
pm2 startup  # Follow instructions

# Build frontend
cd ../frontend
npm install
npm run build

# Start frontend with PM2
pm2 start npm --name smartpayplug-web -- start
pm2 save
```

### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/smartpayplug`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/smartpayplug /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Set Up SSL (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 🔌 Raspberry Pi GPIO Setup (Hardware Control)

If deploying on Raspberry Pi for actual hardware control:

### Step 1: Enable GPIO

```bash
# Install pigpio library
sudo apt install -y pigpio

# Enable GPIO
sudo raspi-config
# Navigate to: Interface Options → GPIO → Enable
```

### Step 2: Update GPIO Pins

Edit `backend/.env`:
```env
GPIO_PIN_1=17  # Physical pin 11
GPIO_PIN_2=27  # Physical pin 13
GPIO_PIN_3=22  # Physical pin 15
```

### Step 3: Run with Sudo (for GPIO access)

```bash
sudo pm2 start server.js --name smartpayplug-api
```

### Step 4: Wire GPIO Connections

**Pin Layout:**
- GPIO 17 (Pin 11) → Relay 1 → Output Port 1
- GPIO 27 (Pin 13) → Relay 2 → Output Port 2
- GPIO 22 (Pin 15) → Relay 3 → Output Port 3
- GND (Pin 6, 9, 14, etc.) → Common Ground

**Safety:**
- Use optocoupler relays
- Ensure proper voltage levels
- Add flyback diodes for inductive loads
- Use fuses on output circuits

---

## 📊 Post-Deployment Checklist

- [ ] Database is accessible and migrations ran successfully
- [ ] Backend API health check returns success: `/api/health`
- [ ] Frontend loads without errors
- [ ] Payment flow works end-to-end
- [ ] Admin dashboard displays data
- [ ] SMS notifications configured (or in simulation mode)
- [ ] GPIO pins configured (if using hardware)
- [ ] Environment variables are secure
- [ ] HTTPS/SSL enabled
- [ ] Monitoring set up (optional: use Render/Vercel logs)
- [ ] Backups configured for database

---

## 🛡️ Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use platform-specific secret management
   - Rotate credentials regularly

2. **Database**
   - Use strong passwords
   - Enable SSL connections in production
   - Regular backups

3. **API**
   - Add rate limiting (express-rate-limit)
   - Implement authentication for admin routes
   - Validate all inputs
   - Use CORS appropriately

4. **Frontend**
   - Set proper CORS origins
   - Use environment variables for API URLs
   - Implement CSP headers

---

## 📈 Monitoring & Maintenance

### Logs

**Render:**
- Dashboard → Web Service → Logs

**Railway:**
- Dashboard → Project → Deployments → Logs

**Self-hosted (PM2):**
```bash
pm2 logs smartpayplug-api
pm2 logs smartpayplug-web
```

### Database Backups

**Render:**
- Automatic daily backups on paid plans
- Manual: Dashboard → Database → Backups

**Self-hosted:**
```bash
# Create backup
pg_dump -U smartpayuser smartpayplug > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U smartpayuser smartpayplug < backup_20260304.sql
```

### Auto-restart (PM2)

```bash
# Restart on crashes (automatic with PM2)
pm2 startup
pm2 save

# Manual restart
pm2 restart all

# Update application
cd /var/www/smartpayplug
git pull
cd backend
npm install
pm2 restart smartpayplug-api

cd ../frontend
npm install
npm run build
pm2 restart smartpayplug-web
```

---

## 🎯 Performance Optimization

1. **Enable caching** (Redis recommended)
2. **Use CDN** for frontend assets
3. **Database indexing** (already configured)
4. **Connection pooling** (already implemented)
5. **Compress responses** (add compression middleware)

---

## 🆘 Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify all environment variables are set
- Check logs for specific errors

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings in backend
- Ensure backend is running and accessible

### Database connection timeout
- Check database is running
- Verify connection string
- Check firewall rules
- Ensure SSL settings match

---

**Deployment Complete!** 🎉

Your SmartPayPlug system is now live and ready for production use.
