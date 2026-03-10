/*
 * SmartPayPlug - ESP32 Relay Controller
 * 
 * This firmware turns your ESP32 into a WiFi-controlled relay module
 * for the SmartPayPlug payment-based power control system.
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - 1 Relay Module (connected to GPIO 25)
 * 
 * Wiring:
 * - Relay IN  -> GPIO 25 (PRIMARY RELAY)
 * - Relay GND -> ESP32 GND
 * - Relay VCC -> 5V (from external supply or ESP32 VIN pin)
 * 
 * Payment → Duration mapping:
 * - ₹10 → Relay ON for 10 seconds
 * - ₹20 → Relay ON for 20 seconds
 * - ₹30 → Relay ON for 30 seconds
 * 
 * All payments use the same relay on GPIO 25.
 * 
 * API Endpoints:
 *   POST /relay  { "relay": 1, "state": "ON", "duration": 10 }
 *   GET  /status
 *   GET  /info
 * 
 * Author: SmartPayPlug Team
 * License: MIT
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* ssid     = "YOUR_WIFI_SSID";      // ← Change this
const char* password = "YOUR_WIFI_PASSWORD";   // ← Change this

// ===== Relay Configuration =====
// All payments control this single relay on GPIO 25
const int RELAY_PIN = 25;
const int RELAY_GPIO_MAP[3] = {25, 26, 27};   // kept for multi-relay compatibility
const int NUM_RELAYS = 3;                      // backend sends relay 1, 2, or 3

// Relay states and timers
struct RelayState {
  bool active;
  unsigned long startTime;
  unsigned long duration;   // in seconds
  int relayNumber;
};

RelayState relays[NUM_RELAYS];

// ===== Web Server =====
WebServer server(80);

// ===== Function Prototypes =====
void setupWiFi();
void setupRelays();
void handleRelayControl();
void handleStatus();
void handleInfo();
void handleNotFound();
void updateRelayTimers();
void activateRelay(int relayNum, unsigned long durationSeconds);
void deactivateRelay(int relayNum);
void sendJSONResponse(int code, bool success, const char* message, JsonDocument* data = nullptr);

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("   SmartPayPlug ESP32 Relay Controller");
  Serial.println("   GPIO 25 → Main Relay");
  Serial.println("========================================\n");
  
  setupRelays();
  setupWiFi();
  
  // HTTP routes
  server.on("/relay",  HTTP_POST, handleRelayControl);
  server.on("/status", HTTP_GET,  handleStatus);
  server.on("/info",   HTTP_GET,  handleInfo);
  server.onNotFound(handleNotFound);
  
  // Add CORS headers for dashboard access
  server.enableCORS(true);
  
  server.begin();
  Serial.println("✓ HTTP Server started on port 80");
  Serial.print("✓ IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("\nReady for commands!\n");
  Serial.println("========================================\n");
}

// ===== Main Loop =====
void loop() {
  server.handleClient();
  updateRelayTimers();
  delay(10);
}

// ===== WiFi Setup =====
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("  IP Address : ");
    Serial.println(WiFi.localIP());
    Serial.print("  MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("  Signal     : ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("  Check credentials and restart.");
  }
}

// ===== Relay Setup =====
void setupRelays() {
  Serial.println("Initializing relay on GPIO 25...");
  
  // Initialize primary relay (GPIO 25)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // OFF by default
  
  // Also initialize secondary pins (GPIO 26, 27) if present
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (RELAY_GPIO_MAP[i] != RELAY_PIN) {
      pinMode(RELAY_GPIO_MAP[i], OUTPUT);
      digitalWrite(RELAY_GPIO_MAP[i], LOW);
    }
    relays[i].active      = false;
    relays[i].startTime   = 0;
    relays[i].duration    = 0;
    relays[i].relayNumber = i + 1;
  }
  Serial.println("✓ Relay GPIO 25 initialized (OFF)");
}

// ===== Relay Control Handler =====
void handleRelayControl() {
  // Parse JSON  { "relay": 1, "state": "ON", "duration": 10 }
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  
  if (error) {
    sendJSONResponse(400, false, "Invalid JSON");
    return;
  }
  
  int relayNum    = doc["relay"] | 1;              // default relay 1
  String stateStr = doc["state"] | "ON";
  unsigned long duration = doc["duration"] | 0;
  
  // Normalize relay number
  if (relayNum < 1 || relayNum > NUM_RELAYS) relayNum = 1;
  
  if (stateStr == "ON" || stateStr == "on") {
    if (duration > 0) {
      activateRelay(relayNum, duration);
      
      StaticJsonDocument<256> responseDoc;
      responseDoc["relayNumber"] = relayNum;
      responseDoc["gpioPin"]     = RELAY_GPIO_MAP[relayNum - 1];
      responseDoc["duration"]    = duration;
      
      sendJSONResponse(200, true, "Relay activated", &responseDoc);
    } else {
      sendJSONResponse(400, false, "Duration must be > 0");
    }
  } else if (stateStr == "OFF" || stateStr == "off") {
    deactivateRelay(relayNum);
    StaticJsonDocument<128> responseDoc;
    responseDoc["relayNumber"] = relayNum;
    sendJSONResponse(200, true, "Relay deactivated", &responseDoc);
  } else {
    sendJSONResponse(400, false, "state must be ON or OFF");
  }
}

// ===== Status Handler =====
void handleStatus() {
  StaticJsonDocument<512> doc;
  JsonArray relayArray = doc.createNestedArray("relays");
  
  unsigned long currentTime = millis();
  
  for (int i = 0; i < NUM_RELAYS; i++) {
    JsonObject relay = relayArray.createNestedObject();
    relay["relayNumber"] = i + 1;
    relay["active"]      = relays[i].active;
    relay["gpioPin"]     = RELAY_GPIO_MAP[i];
    
    if (relays[i].active) {
      unsigned long elapsed   = (currentTime - relays[i].startTime) / 1000;
      unsigned long remaining = relays[i].duration > elapsed
                                  ? relays[i].duration - elapsed
                                  : 0;
      relay["duration"]  = relays[i].duration;
      relay["elapsed"]   = elapsed;
      relay["remaining"] = remaining;
    }
  }
  
  doc["primaryRelayGPIO"] = RELAY_PIN;
  sendJSONResponse(200, true, "Status retrieved", &doc);
}

// ===== Info Handler =====
void handleInfo() {
  StaticJsonDocument<512> doc;
  
  doc["deviceName"]      = "SmartPayPlug ESP32";
  doc["version"]         = "2.0.0";
  doc["ipAddress"]       = WiFi.localIP().toString();
  doc["macAddress"]      = WiFi.macAddress();
  doc["ssid"]            = WiFi.SSID();
  doc["rssi"]            = WiFi.RSSI();
  doc["uptime"]          = millis() / 1000;
  doc["primaryRelay"]    = RELAY_PIN;
  doc["numRelays"]       = NUM_RELAYS;
  
  JsonArray pinsArray = doc.createNestedArray("relayPins");
  for (int i = 0; i < NUM_RELAYS; i++) {
    pinsArray.add(RELAY_GPIO_MAP[i]);
  }
  
  // Payment mapping
  JsonObject paymentMap = doc.createNestedObject("paymentMapping");
  paymentMap["10"] = "10 seconds";
  paymentMap["20"] = "20 seconds";
  paymentMap["30"] = "30 seconds";
  
  sendJSONResponse(200, true, "Device info retrieved", &doc);
}

// ===== Not Found Handler =====
void handleNotFound() {
  StaticJsonDocument<128> doc;
  doc["endpoints"] = "POST /relay | GET /status | GET /info";
  sendJSONResponse(404, false, "Endpoint not found", &doc);
}

// ===== Activate Relay =====
void activateRelay(int relayNum, unsigned long durationSeconds) {
  int index = relayNum - 1;
  
  // For this setup, ALL relay commands control GPIO 25
  // Secondary GPIOs (26/27) also fire if wired
  int gpioPin = RELAY_GPIO_MAP[index];
  
  // Always also activate the primary relay (GPIO 25)
  digitalWrite(RELAY_PIN, HIGH);
  if (gpioPin != RELAY_PIN) {
    digitalWrite(gpioPin, HIGH);
  }
  
  // Update state
  relays[index].active    = true;
  relays[index].startTime = millis();
  relays[index].duration  = durationSeconds;
  
  Serial.print("\n⚡ RELAY ACTIVATED");
  Serial.print("  GPIO: ");
  Serial.println(gpioPin);
  Serial.print("  Duration: ");
  Serial.print(durationSeconds);
  Serial.println(" seconds");
}

// ===== Deactivate Relay =====
void deactivateRelay(int relayNum) {
  int index   = relayNum - 1;
  int gpioPin = RELAY_GPIO_MAP[index];
  
  // Turn OFF the GPIO
  digitalWrite(RELAY_PIN, LOW);
  if (gpioPin != RELAY_PIN) {
    digitalWrite(gpioPin, LOW);
  }
  
  // Update state
  relays[index].active    = false;
  relays[index].startTime = 0;
  relays[index].duration  = 0;
  
  Serial.print("\n✓ Relay ");
  Serial.print(relayNum);
  Serial.println(" deactivated (GPIO 25 OFF)");
}

// ===== Update Relay Timers (auto-off) =====
void updateRelayTimers() {
  unsigned long currentTime = millis();
  
  for (int i = 0; i < NUM_RELAYS; i++) {
    if (relays[i].active) {
      unsigned long elapsed = (currentTime - relays[i].startTime) / 1000;
      
      if (elapsed >= relays[i].duration) {
        Serial.print("⏰ Timer expired for relay ");
        Serial.println(relays[i].relayNumber);
        deactivateRelay(relays[i].relayNumber);
      }
    }
  }
}

// ===== Send JSON Response =====
void sendJSONResponse(int code, bool success, const char* message, JsonDocument* data) {
  StaticJsonDocument<1024> doc;
  
  doc["success"]   = success;
  doc["message"]   = message;
  doc["timestamp"] = millis() / 1000;
  
  if (data != nullptr) {
    doc["data"] = *data;
  }
  
  String response;
  serializeJson(doc, response);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(code, "application/json", response);
}
