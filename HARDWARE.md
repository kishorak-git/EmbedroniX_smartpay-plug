# SmartPayPlug - Hardware Integration Guide

This guide explains how to connect SmartPayPlug to physical hardware for real-world power control.

---

## 🔌 Hardware Overview

SmartPayPlug controls 3 independent AC power outputs using GPIO pins from a Raspberry Pi.

**Warning:** Working with AC power is dangerous. Follow all safety precautions and local electrical codes.

---

## 🛠️ Required Components

### Essential Components:

1. **Raspberry Pi** (any model with GPIO)
   - Recommended: Raspberry Pi 4 Model B (4GB+)
   - Alternative: Raspberry Pi 3B+, Zero W

2. **Relay Module (3-Channel or 3x Single)**
   - 5V DC coil voltage
   - Optocoupler isolated
   - 10A+ contacts for AC loads
   - Example: SainSmart 3-Channel Relay Module

3. **Power Supply**
   - For Raspberry Pi: 5V 3A USB-C (Pi 4) or Micro-USB (Pi 3)
   - For Relays: Usually powered from Pi's 5V pin

4. **Jumper Wires**
   - Female-to-Female (Pi to Relay)
   - Minimum 10 wires

5. **Enclosure**
   - Weatherproof if outdoor use
   - Ventilated
   - Non-conductive material

### Safety Components (REQUIRED):

6. **Circuit Breakers/Fuses**
   - One per output channel
   - Rated for your load

7. **AC Power Outlets**
   - 3x standard outlets
   - With mounting brackets

8. **Grounding Equipment**
   - Ground wires
   - Ground terminals
   - GFCI/RCD recommended

### Optional Components:

9. **Status LEDs**
   - 3x LEDs with resistors
   - Visual indication of active ports

10. **Emergency Stop Button**
    - Hardware cutoff switch

11. **Voltage/Current Sensors**
    - Monitor power usage
    - Optional: integrate with API

12. **Cooling Fan**
    - If enclosure gets hot
    - Temperature sensor

---

## 📐 Wiring Diagram

### GPIO Pin Configuration

**Raspberry Pi GPIO (BCM numbering):**

```
Pin Layout (GPIO.BCM):
┌─────────────────────────────────┐
│                                 │
│  3V3  (1) (2)  5V               │
│  GP2  (3) (4)  5V               │
│  GP3  (5) (6)  GND              │
│  GP4  (7) (8)  GP14             │
│  GND  (9) (10) GP15             │
│  GP17 (11) (12) GP18 ◄── Port 1 Output
│  GP27 (13) (14) GND             │
│  GP22 (15) (16) GP23 ◄── Port 2 Output
│  3V3  (17) (18) GP24 ◄── Port 3 Output
│  ...                            │
└─────────────────────────────────┘
```

**Default Pin Assignment:**
- **GPIO 17** (Physical Pin 11) → Port 1 (₹10 - 10s)
- **GPIO 27** (Physical Pin 13) → Port 2 (₹20 - 20s)
- **GPIO 22** (Physical Pin 15) → Port 3 (₹30 - 30s)

### Relay Module Connections

**Raspberry Pi → Relay Module:**

```
Raspberry Pi          Relay Module
─────────────         ────────────
5V (Pin 2)      →     VCC
GND (Pin 6)     →     GND
GPIO 17 (Pin 11)→     IN1 (Channel 1)
GPIO 27 (Pin 13)→     IN2 (Channel 2)
GPIO 22 (Pin 15)→     IN3 (Channel 3)
```

**Relay Module → AC Outlets:**

Each relay has 3 terminals:
- **COM** (Common)
- **NO** (Normally Open)
- **NC** (Normally Closed)

We use **NO** (Normally Open) configuration:

```
For Each Output Port:

AC Input (Hot) → Relay COM
Relay NO → Outlet Hot Terminal
AC Input (Neutral) → Outlet Neutral (direct)
AC Input (Ground) → Outlet Ground (direct)
```

**Complete Wiring:**

```
                     ┌─────────────────┐
AC Mains ────────────┤ Circuit Breaker ├─────┐
(Live/Hot)           └─────────────────┘     │
                                             │
                     ┌─────────────┐         │
                ┌────┤ Relay 1 COM ├─────────┘
                │    └─────────────┘
                │    ┌─────────────┐
         Port 1 │────┤ Relay 1 NO  ├──────► Outlet 1 (Hot)
         ₹10    │    └─────────────┘
                │
                │    ┌─────────────┐
                ├────┤ Relay 2 COM ├─────────┐
                │    └─────────────┘         │
                │    ┌─────────────┐         │
         Port 2 │────┤ Relay 2 NO  ├──────► Outlet 2 (Hot)
         ₹20    │    └─────────────┘
                │
                │    ┌─────────────┐
                └────┤ Relay 3 COM ├─────────┐
                     └─────────────┘         │
                     ┌─────────────┐         │
              Port 3 ├┤ Relay 3 NO  ├──────► Outlet 3 (Hot)
              ₹30    │└─────────────┘
                     │
                     │
AC Neutral ──────────┴────────────────────► All Outlets (Neutral)
                     
AC Ground ───────────────────────────────► All Outlets (Ground)
```

---

## 🔧 Assembly Steps

### Step 1: Prepare Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install pigpio
sudo apt install -y pigpio python3-pigpio

# Enable GPIO
sudo raspi-config
# Navigate: Interface Options → GPIO → Enable
```

### Step 2: Test GPIO (Before Wiring)

```bash
# Install gpio tools
sudo apt install -y wiringpi

# Test pin output
gpio mode 0 out  # GPIO 17
gpio write 0 1   # Set HIGH
gpio write 0 0   # Set LOW
```

### Step 3: Connect Relay Module

**POWER OFF EVERYTHING FIRST**

1. Connect Pi to Relay (Low Voltage):
   - 5V → VCC
   - GND → GND
   - GPIO 17 → IN1
   - GPIO 27 → IN2
   - GPIO 22 → IN3

2. Power on Pi
3. Test relays (you should hear clicks):
   ```bash
   gpio -g mode 17 out
   gpio -g write 17 1  # Should hear click
   gpio -g write 17 0  # Click back
   ```

### Step 4: Wire AC Power

**⚠️ DANGER: AC POWER CAN KILL**

**Safety First:**
- Disconnect AC mains power
- Use a multimeter to verify no voltage
- Wear insulated gloves
- Work in dry conditions
- Have someone nearby for emergencies

1. Install circuit breakers on AC input
2. Connect AC hot wire to circuit breaker
3. From breaker to each relay COM terminal
4. From each relay NO to corresponding outlet hot terminal
5. Connect all neutral wires together
6. Connect all ground wires together
7. Secure all connections with wire nuts or terminal blocks
8. Double-check every connection
9. Use cable ties to prevent wire movement

### Step 5: Test (Low Load First)

1. Connect a low-power device (LED lamp, phone charger)
2. Power on AC mains
3. Test each port with software:
   ```bash
   # Test Port 1
   gpio -g write 17 1  # ON
   sleep 5
   gpio -g write 17 0  # OFF
   ```
4. If working, test with actual load

### Step 6: Install SmartPayPlug Software

Follow the deployment guide for Raspberry Pi setup.

Ensure the backend runs with sudo for GPIO access:
```bash
sudo pm2 start server.js --name smartpayplug-api
```

---

## ⚡ Load Calculations

**Relay Ratings:**
- Most 5V relays: 10A @ 250VAC or 10A @ 125VAC
- Check your relay datasheet

**Power Calculation:**
```
Power (W) = Voltage (V) × Current (A)

Example (USA 120V):
- 10A relay @ 120V = 1200W max
- Safe load: 80% = 960W

Example (India 230V):
- 10A relay @ 230V = 2300W max
- Safe load: 80% = 1840W
```

**Common Loads:**
- Phone charger: 10-20W
- LED light: 10-20W
- Laptop charger: 65-90W
- Fan: 50-100W
- Heater: 1000-1500W (near limit!)

---

## 🛡️ Safety Features

### Software Safety (Already Implemented):

- ✅ Prevent duplicate activation
- ✅ Auto-shutoff timer
- ✅ Graceful cleanup on crash
- ✅ Port state tracking
- ✅ Manual reset capability

### Hardware Safety (YOU Must Implement):

1. **Fuses/Circuit Breakers**
   - One per output
   - Rated slightly above expected load
   - Fast-acting type

2. **Ground Fault Protection**
   - GFCI/RCD on main input
   - Required for outdoor/wet locations

3. **Enclosure**
   - IP65 rated if outdoor
   - Prevents accidental contact
   - Keeps out moisture/dust

4. **Indicator LEDs**
   - Shows which ports are active
   - External mounting

5. **Emergency Stop**
   - Hardware switch to cut all power
   - Bypass software control

6. **Temperature Monitoring**
   - Auto-shutdown if overheating
   - Add to backend code:
     ```javascript
     // Read temperature
     const temp = cpuTemperature.temperature();
     if (temp > 80) {
       // Shutdown all ports
       await gpioService.cleanup();
     }
     ```

7. **Current Sensing**
   - Detect overload
   - Trigger shutdown

---

## 🧪 Testing Checklist

Before deploying:

- [ ] All GPIO pins respond correctly
- [ ] Relays click when activated
- [ ] Each output port controls correct outlet
- [ ] Timer accurately deactivates port
- [ ] Manual reset works
- [ ] Circuit breakers trip on overload
- [ ] Ground wire connected properly
- [ ] No exposed AC conductors
- [ ] Enclosure properly sealed
- [ ] Emergency stop works
- [ ] Status indicators visible
- [ ] Load testing with actual devices
- [ ] Continuous operation test (24 hours)
- [ ] Restart recovery test
- [ ] Network failure handling

---

## 📸 Documentation Photos

Take photos of:
1. Complete wiring before closing enclosure
2. Relay connections
3. AC terminal connections
4. Final assembled unit
5. Labels on each port

Keep these for troubleshooting and maintenance.

---

## 🔍 Troubleshooting

### Relay doesn't click
- Check GPIO pin assignment in `.env`
- Verify 5V power to relay module
- Test GPIO output with multimeter
- Try different GPIO pin

### Port stays on after timer
- Check software logs
- Verify GPIO cleanup on shutdown
- Manually reset: `gpio -g write 17 0`
- Restart backend service

### Outlet has no power when active
- Check relay COM and NO connections
- Verify AC input voltage
- Check circuit breaker not tripped
- Test relay with multimeter in continuity mode

### Raspberry Pi crashes when activating relay
- Insufficient power supply
- Use dedicated Pi power adapter (3A+)
- Don't power relays from Pi 5V if high current

### Intermittent operation
- Loose connections
- Underpowered Pi
- SD card corruption (use quality card)
- Network issues

---

## 📋 Maintenance Schedule

### Daily (if in production):
- Visual inspection of indicators
- Check for unusual sounds/smells
- Monitor transaction logs

### Weekly:
- Test manual reset
- Check temperature
- Verify all ports work

### Monthly:
- Tighten all connections
- Clean dust from enclosure
- Test emergency stop
- Backup database

### Yearly:
- Replace relay module (preventive)
- Inspect all wiring
- Re-test circuit breakers
- Update software

---

## 🌐 Remote Monitoring

Add monitoring endpoints:

```javascript
// In backend
app.get('/api/system-health', async (req, res) => {
  const cpuTemp = cpuTemperature.temperature();
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.json({
    temperature: cpuTemp,
    uptime: uptime,
    memory: memory,
    gpio: gpioService.getAllPortStatus()
  });
});
```

Access remotely to monitor system health.

---

## 📝 Compliance & Legal

**Before Public Deployment:**

1. **Electrical Code Compliance**
   - Hire licensed electrician for final installation
   - Get electrical inspection (required in most places)
   - Follow NEC (USA) or IEC (International) standards

2. **Insurance**
   - Liability insurance
   - Property insurance
   - Product liability if selling

3. **Certifications**
   - CE marking (Europe)
   - UL/ETL listing (USA)
   - ISI marking (India)

4. **Safety Signage**
   - "Electric Shock Hazard"
   - Operating instructions
   - Emergency contact info

5. **User Agreement**
   - Terms of service
   - Liability disclaimer
   - Safe usage guidelines

---

## 🆘 Emergency Procedures

**If something goes wrong:**

1. **Power off immediately** (emergency stop or main breaker)
2. **Disconnect load** from affected outlet
3. **SSH into Pi** and check logs
4. **Manual GPIO reset:** `sudo gpio -g write [pin] 0`
5. **Restart backend:** `sudo pm2 restart smartpayplug-api`
6. **If fire/smoke:** Use Class C fire extinguisher, call fire department

**Emergency Contacts:**
- Electrician: _____________
- Fire Department: _____________
- Property Manager: _____________

---

## ✅ Final Checklist Before Going Live

- [ ] All safety features implemented
- [ ] Electrical inspection passed
- [ ] Insurance coverage active
- [ ] Emergency procedures documented
- [ ] Staff trained on operation
- [ ] Monitoring system active
- [ ] Backup power considered
- [ ] Compliance documentation filed
- [ ] Maintenance schedule created
- [ ] Support contact available 24/7

---

**Hardware integration is the most dangerous part of this project. When in doubt, consult a professional electrician.**

**Safety First. Always.**
