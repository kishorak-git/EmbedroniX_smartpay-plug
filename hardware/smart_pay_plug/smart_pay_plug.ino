/*
 * SmartPayPlug - ESP32 Firmware
 * MAC Address: FC:E8:C0:E1:76:8C (Ensure this matches your device)
 * Relay: GPIO 25
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend Configuration
const char* serverUrl = "http://192.168.1.6:5001/api/register-device"; // UPDATE WITH YOUR BACKEND IP (e.g., 192.168.1.6)

// Hardware Configuration
const int relayPin = 25;

WebServer server(80);

unsigned long relayOffTime = 0;
bool relayActive = false;

void setup() {
  Serial.begin(115200);
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);

  connectToWiFi();
  
  // Register with backend
  registerWithBackend();

  // Setup Routes
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/command", handleCommand);
  server.begin();
  
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();

  // Handle Relay Timer
  if (relayActive && millis() >= relayOffTime) {
    digitalWrite(relayPin, LOW);
    relayActive = false;
    Serial.println("Relay deactivated (Timer expired)");
  }

  // Periodic registration (every 5 minutes)
  static unsigned long lastReg = 0;
  if (millis() - lastReg > 300000) {
    registerWithBackend();
    lastReg = millis();
  }
}

void connectToWiFi() {
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("MAC address: ");
  Serial.println(WiFi.macAddress());
}

void registerWithBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"ip\":\"" + WiFi.localIP().toString() + "\", \"mac\":\"" + WiFi.macAddress() + "\"}";
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      Serial.print("Registration response: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Registration error: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

void handleRoot() {
  server.send(200, "text/plain", "SmartPayPlug ESP32 Controller Online");
}

void handleStatus() {
  String json = "{";
  json += "\"mac\":\"" + WiFi.macAddress() + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"relayActive\":" + String(relayActive ? "true" : "false") + ",";
  json += "\"uptime\":" + String(millis() / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void handleCommand() {
  if (server.hasArg("cmd")) {
    String cmd = server.arg("cmd");
    Serial.print("Received command: ");
    Serial.println(cmd);

    int duration = 0;
    if (cmd == "SIGNAL_10" || cmd == "PAY10") duration = 10;
    else if (cmd == "SIGNAL_20" || cmd == "PAY20") duration = 20;
    else if (cmd == "SIGNAL_30" || cmd == "PAY30") duration = 30;

    if (duration > 0) {
      digitalWrite(relayPin, HIGH);
      relayActive = true;
      relayOffTime = millis() + (duration * 1000);
      server.send(200, "application/json", "{\"success\":true, \"message\":\"Relay ON for " + String(duration) + "s\"}");
    } else {
      server.send(400, "application/json", "{\"success\":false, \"error\":\"Invalid command\"}");
    }
  } else {
    server.send(400, "application/json", "{\"success\":false, \"error\":\"No command provided\"}");
  }
}
