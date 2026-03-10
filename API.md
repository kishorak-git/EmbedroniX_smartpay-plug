# SmartPayPlug - API Documentation

Base URL (Development): `http://localhost:5000/api`

Base URL (Production): `https://your-domain.com/api`

---

## 📌 Authentication

Currently, the API does not require authentication for public endpoints. For production, consider adding:
- JWT authentication for admin routes
- API keys for external integrations
- Rate limiting per IP address

---

## 🔌 Endpoints

### 1. Health Check

**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "message": "SmartPayPlug API is running",
  "timestamp": "2026-03-04T10:30:00.000Z"
}
```

---

### 2. Create Transaction

**POST** `/create-transaction`

Creates a new payment transaction and reserves the corresponding output port.

**Request Body:**
```json
{
  "amount": 10,
  "phoneNumber": "+919876543210"
}
```

**Parameters:**
- `amount` (required): Integer - Must be 10, 20, or 30
- `phoneNumber` (optional): String - Phone number for SMS notification

**Response (Success):**
```json
{
  "success": true,
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 10,
    "outputPort": 1,
    "duration": 10,
    "status": "PENDING",
    "createdAt": "2026-03-04T10:30:00.000Z",
    "upiId": "demo@upi"
  }
}
```

**Response (Port In Use):**
```json
{
  "success": false,
  "error": "Port 1 is currently in use. Please try again in 5 seconds.",
  "remainingTime": 5
}
```

**Response (Invalid Amount):**
```json
{
  "success": false,
  "error": "Invalid amount. Must be 10, 20, or 30"
}
```

---

### 3. Confirm Payment

**POST** `/confirm-payment`

Confirms payment and activates the corresponding output port.

**Request Body:**
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Parameters:**
- `transactionId` (required): String - UUID of the transaction

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment confirmed and power activated",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 10,
    "outputPort": 1,
    "duration": 10,
    "status": "SUCCESS",
    "startTime": "2026-03-04T10:32:00.000Z"
  }
}
```

**Response (Transaction Not Found):**
```json
{
  "success": false,
  "error": "Transaction not found"
}
```

**Response (Already Processed):**
```json
{
  "success": false,
  "error": "Transaction already success"
}
```

**Response (Port In Use):**
```json
{
  "success": false,
  "error": "Port 1 is currently in use",
  "remainingTime": 5
}
```

---

### 4. Cancel Transaction

**POST** `/cancel-transaction`

Cancels a pending transaction.

**Request Body:**
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Transaction cancelled",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "payment_status": "FAILED",
    ...
  }
}
```

**Response (Cannot Cancel):**
```json
{
  "success": false,
  "error": "Only pending transactions can be cancelled"
}
```

---

### 5. Get Transactions

**GET** `/transactions?limit=100&offset=0`

Retrieves transaction history.

**Query Parameters:**
- `limit` (optional): Integer - Number of transactions to return (default: 100)
- `offset` (optional): Integer - Number of transactions to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+919876543210",
      "amount": 10,
      "output_port": 1,
      "duration_seconds": 10,
      "payment_status": "SUCCESS",
      "start_time": "2026-03-04T10:32:00.000Z",
      "end_time": "2026-03-04T10:32:10.000Z",
      "created_at": "2026-03-04T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### 6. Get Port Status

**GET** `/port-status`

Gets real-time status of all output ports.

**Response:**
```json
{
  "success": true,
  "ports": {
    "port1": {
      "active": true,
      "port": 1,
      "remainingTime": 5
    },
    "port2": {
      "active": false,
      "port": 2,
      "remainingTime": 0
    },
    "port3": {
      "active": false,
      "port": 3,
      "remainingTime": 0
    }
  }
}
```

---

### 7. Get Dashboard Stats

**GET** `/dashboard-stats`

Gets comprehensive dashboard statistics including transaction stats, port status, and active transactions.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalTransactions": 150,
    "totalRevenue": 2500,
    "successfulTransactions": 140,
    "pendingTransactions": 2,
    "failedTransactions": 8
  },
  "ports": {
    "port1": {
      "active": true,
      "port": 1,
      "remainingTime": 5
    },
    "port2": {
      "active": false,
      "port": 2,
      "remainingTime": 0
    },
    "port3": {
      "active": false,
      "port": 3,
      "remainingTime": 0
    }
  },
  "activeTransactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 10,
      "output_port": 1,
      "duration_seconds": 10,
      "payment_status": "SUCCESS",
      "start_time": "2026-03-04T10:32:00.000Z",
      "end_time": null,
      "created_at": "2026-03-04T10:30:00.000Z"
    }
  ]
}
```

---

### 8. Reset Port (Admin)

**POST** `/reset-port`

Manually resets (deactivates) a specific port. This is an admin function.

**Request Body:**
```json
{
  "port": 1
}
```

**Parameters:**
- `port` (required): Integer - Port number (1, 2, or 3)

**Response (Success):**
```json
{
  "success": true,
  "message": "Port 1 reset successfully"
}
```

**Response (Invalid Port):**
```json
{
  "success": false,
  "error": "Invalid port number. Must be 1, 2, or 3"
}
```

---

## 📊 Data Models

### Transaction Model

```typescript
{
  id: string;                    // UUID
  phone_number: string | null;   // E.164 format
  amount: number;                // 10, 20, or 30
  output_port: number;           // 1, 2, or 3
  duration_seconds: number;      // 10, 20, or 30
  payment_status: string;        // "PENDING" | "SUCCESS" | "FAILED"
  start_time: string | null;     // ISO 8601
  end_time: string | null;       // ISO 8601
  created_at: string;            // ISO 8601
}
```

---

## 🔄 Payment Flow Sequence

```
1. Client: POST /create-transaction
   ↓
2. Server: Creates transaction with PENDING status
   ↓
3. Server: Checks port availability
   ↓
4. Server: Returns transaction details with QR code info
   ↓
5. Client: Displays QR code
   ↓
6. User: Makes payment (or simulates)
   ↓
7. Client: POST /confirm-payment
   ↓
8. Server: Updates status to SUCCESS
   ↓
9. Server: Activates GPIO port
   ↓
10. Server: Sends SMS notification
    ↓
11. Server: Starts countdown timer
    ↓
12. Client: Polls GET /port-status for countdown
    ↓
13. Server: Auto-deactivates port after duration
    ↓
14. Server: Updates end_time
    ↓
15. Client: Shows completion message
```

---

## ⚠️ Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found |
| 409 | Conflict (port in use) |
| 500 | Internal server error |

---

## 🔒 Rate Limiting (Recommended for Production)

Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🧪 Testing with cURL

### Create Transaction
```bash
curl -X POST http://localhost:5000/api/create-transaction \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "phoneNumber": "+919876543210"}'
```

### Confirm Payment
```bash
curl -X POST http://localhost:5000/api/confirm-payment \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "YOUR-TRANSACTION-ID"}'
```

### Get Port Status
```bash
curl http://localhost:5000/api/port-status
```

### Get Dashboard Stats
```bash
curl http://localhost:5000/api/dashboard-stats
```

---

## 🔧 Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "SmartPayPlug API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Transaction",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/create-transaction",
        "body": {
          "mode": "raw",
          "raw": "{\"amount\": 10, \"phoneNumber\": \"+919876543210\"}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    }
  ]
}
```

---

## 📱 Webhook Integration (Future Enhancement)

For production payment gateway integration, add webhook endpoint:

**POST** `/webhook/payment`

Receives payment confirmation from payment gateway.

```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "paymentId": "pay_xyz123",
  "signature": "abc123def456"
}
```

Verify signature and call confirm-payment internally.

---

**API Version:** 1.0.0  
**Last Updated:** March 4, 2026
