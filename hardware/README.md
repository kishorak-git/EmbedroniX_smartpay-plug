# ESP32 Hardware Setup Guide

## Overview
This guide will help you set up the ESP32 microcontroller as a WiFi-controlled relay module for SmartPayPlug.

## Hardware Requirements

### Essential Components
1. **ESP32 Development Board** (ESP32-DevKitC, NodeMCU-32S, or similar)
2. **3-Channel Relay Module** (5V or 12V, active-low or active-high)
3. **Power Supply**:
   - 5V USB power for ESP32
   - 5V/12V power supply for relay module (depending on relay specs)
4. **Jumper Wires** (male-to-female for connections)
5. **USB Cable** (for programming ESP32)

### Optional Components
- Breadboard for prototyping
- Enclosure/case for final installation
- Fuse/circuit breaker for safety
- LED indicators for visual feedback

## Wiring Diagram

```
ESP32               Relay Module
=====               ============
GPIO 25  -------→   IN1 (Relay 1)
GPIO 26  -------→   IN2 (Relay 2)
GPIO 27  -------→   IN3 (Relay 3)
GND      -------→   GND
                    VCC → External 5V/12V supply

Relay Module        AC Load (e.g., Power Strip)
============        ========================
COM (Relay 1)  →    Phase (Live) wire
NO (Relay 1)   →    To Load 1

COM (Relay 2)  →    Phase (Live) wire
NO (Relay 2)   →    To Load 2

COM (Relay 3)  →    Phase (Live) wire
NO (Relay 3)   →    To Load 3
```

### Pin Configuration
| ESP32 GPIO | Function | Relay Connection |
|------------|----------|------------------|
| GPIO 25    | Relay 1  | IN1              |
| GPIO 26    | Relay 2  | IN2              |
| GPIO 27    | Relay 3  | IN3              |
| GND        | Ground   | GND              |

**Important Safety Notes:**
⚠️ **HIGH VOLTAGE WARNING**: Never work on AC wiring while power is connected!
⚠️ Only qualified electricians should handle AC power connections.
⚠️ Use proper insulation and enclosures for all AC connections.
⚠️ Test with low-voltage DC loads (12V LED strips) before attempting AC loads.

## Software Setup

### Prerequisites
1. **Arduino IDE** (version 1.8.19 or later)
   - Download from: https://www.arduino.cc/en/software

2. **ESP32 Board Support**
   - Open Arduino IDE
   - Go to: `File → Preferences`
   - Add to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to: `Tools → Board → Boards Manager`
   - Search for "esp32" and install "ESP32 by Espressif Systems"

3. **Required Libraries**
   - **ArduinoJson** (version 6.x)
     - Go to: `Sketch → Include Library → Manage Libraries`
     - Search for "ArduinoJson" by Benoit Blanchon
     - Install version 6.21.0 or later

### Uploading Firmware

#### Step 1: Configure WiFi Credentials
Open `ESP32_SmartPayPlug.ino` and modify:

```cpp
const char* ssid = "YOUR_WIFI_SSID";          // Change to your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Change to your WiFi password
```

#### Step 2: Select Board
- Go to: `Tools → Board → ESP32 Arduino`
- Select your ESP32 board model (e.g., "ESP32 Dev Module")

#### Step 3: Configure Upload Settings
- **Upload Speed**: 921600
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 4MB (or match your board specs)
- **Partition Scheme**: Default
- **Port**: Select the COM port where your ESP32 is connected

#### Step 4: Upload Code
1. Connect ESP32 to computer via USB
2. Click "Upload" button (→) in Arduino IDE
3. Wait for "Done uploading" message

#### Step 5: Monitor Serial Output
1. Open Serial Monitor: `Tools → Serial Monitor`
2. Set baud rate to: **115200**
3. You should see:
   ```
   ========================================
      SmartPayPlug ESP32 Relay Controller
   ========================================
   
   Initializing relays...
   ✓ Relay 1 (GPIO 25) initialized
   ✓ Relay 2 (GPIO 26) initialized
   ✓ Relay 3 (GPIO 27) initialized
   Connecting to WiFi: YourWiFiName
   ..
   ✓ WiFi Connected!
   IP Address: 192.168.1.XXX
   MAC Address: XX:XX:XX:XX:XX:XX
   ✓ HTTP Server started
   
   Ready to receive commands!
   ========================================
   ```

4. **Note down the IP Address** - you'll need it for backend configuration!

## API Endpoints

The ESP32 exposes a REST API for relay control:

### 1. Control Relay (POST /relay)
Activate or deactivate a relay.

**Request:**
```json
{
  "relay": 1,
  "action": "on",
  "duration": 10
}
```

**Parameters:**
- `relay`: Relay number (1-3)
- `action`: "on" or "off"
- `duration`: Duration in seconds (required for "on")

**Response:**
```json
{
  "success": true,
  "message": "Relay activated successfully",
  "timestamp": 12345,
  "data": {
    "relayNumber": 1,
    "duration": 10,
    "startTime": 12345000
  }
}
```

### 2. Get Status (GET /status)
Get current status of all relays.

**Response:**
```json
{
  "success": true,
  "message": "Status retrieved successfully",
  "timestamp": 12345,
  "data": {
    "relays": [
      {
        "relayNumber": 1,
        "active": true,
        "gpioPin": 25,
        "duration": 10,
        "elapsed": 5,
        "remaining": 5
      },
      {
        "relayNumber": 2,
        "active": false,
        "gpioPin": 26
      },
      {
        "relayNumber": 3,
        "active": false,
        "gpioPin": 27
      }
    ]
  }
}
```

### 3. Get Device Info (GET /info)
Get ESP32 device information.

**Response:**
```json
{
  "success": true,
  "message": "Device info retrieved successfully",
  "timestamp": 12345,
  "data": {
    "deviceName": "SmartPayPlug ESP32",
    "version": "1.0.0",
    "ipAddress": "192.168.1.100",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "ssid": "MyWiFi",
    "rssi": -45,
    "uptime": 12345,
    "numRelays": 3,
    "relayPins": [25, 26, 27]
  }
}
```

## Testing

### Test with cURL (from computer on same network)

Replace `192.168.1.100` with your ESP32's IP address:

```bash
# Activate Relay 1 for 10 seconds
curl -X POST http://192.168.1.100/relay \
  -H "Content-Type: application/json" \
  -d '{"relay":1,"action":"on","duration":10}'

# Get status
curl http://192.168.1.100/status

# Get device info
curl http://192.168.1.100/info

# Deactivate Relay 1
curl -X POST http://192.168.1.100/relay \
  -H "Content-Type: application/json" \
  -d '{"relay":1,"action":"off"}'
```

### Test with Browser
Open browser and navigate to:
- Status: `http://192.168.1.100/status`
- Info: `http://192.168.1.100/info`

## Backend Integration

Update your backend `.env` file with ESP32 details:

```env
ESP32_ENABLED=true
ESP32_IP=192.168.1.100
ESP32_PORT=80
```

The backend will automatically use ESP32 for relay control when `ESP32_ENABLED=true`.

## Troubleshooting

### ESP32 not connecting to WiFi
1. **Check credentials**: Ensure SSID and password are correct (case-sensitive)
2. **2.4GHz network**: ESP32 only supports 2.4GHz WiFi, not 5GHz
3. **Signal strength**: Move ESP32 closer to router
4. **Reset**: Press EN/RESET button on ESP32 and check serial monitor

### Relays not switching
1. **Check wiring**: Verify GPIO connections match code (GPIOs 25, 26, 27)
2. **Power supply**: Ensure relay module has sufficient power (5V/12V)
3. **Relay type**: Some relays are active-low (invert logic by changing `HIGH` to `LOW`)
4. **Serial monitor**: Check for activation messages

### Cannot access ESP32 from backend server
1. **Network**: Ensure ESP32 and backend server are on same network
2. **Firewall**: Check if router/firewall blocks communication
3. **IP address**: Verify ESP32 IP hasn't changed (use router's DHCP reservation)
4. **Test manually**: Use cURL/browser to test ESP32 directly

### Upload fails
1. **Driver**: Install CH340/CP2102 USB driver for your ESP32 board
2. **Port**: Select correct COM/USB port in Arduino IDE
3. **Press BOOT**: Hold BOOT button while uploading (some boards require this)
4. **Cable**: Use data-capable USB cable (not charge-only cable)

## Advanced Configuration

### Custom GPIO Pins
Edit in `ESP32_SmartPayPlug.ino`:
```cpp
const int RELAY_PINS[3] = {25, 26, 27};  // Change to your preferred GPIOs
```

### More Relays
```cpp
const int NUM_RELAYS = 5;  // Change from 3 to desired number
const int RELAY_PINS[5] = {25, 26, 27, 32, 33};  // Add more pins
```

### Static IP Address
Add after `WiFi.begin()`:
```cpp
IPAddress local_IP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
WiFi.config(local_IP, gateway, subnet);
```

## Safety Checklist

Before deploying with AC power:
- [ ] All connections are properly insulated
- [ ] Relay module is rated for your voltage/current
- [ ] Fuse/circuit breaker installed on AC side
- [ ] Proper enclosure used (no exposed wiring)
- [ ] Tested with low-voltage loads first
- [ ] Emergency shutdown accessible
- [ ] Complies with local electrical codes

## Support

For issues or questions:
1. Check serial monitor output for error messages
2. Review wiring connections
3. Test with known-working example code
4. Check ESP32 documentation: https://docs.espressif.com/

---

**License:** MIT  
**Version:** 1.0.0  
**Last Updated:** 2024
