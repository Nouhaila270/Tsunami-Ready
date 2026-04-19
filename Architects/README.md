# Agadir Tsunami Ready

A web-based crisis management and evacuation system designed to help coastal cities like Agadir respond effectively to tsunami risks.

---

## 🚨 Overview

Agadir is exposed to potential tsunami threats caused by offshore earthquakes. This project provides a **real-time evacuation guidance system** that helps citizens quickly find safe routes to high-ground shelters while allowing authorities to monitor the situation.

The platform is accessible directly via a web browser (no installation required), making it fast and reliable during emergencies.

---

## 🎯 Key Features

- 🚨 **Automatic Alert System**  
  Triggers alerts when a simulated or real earthquake exceeds a defined threshold (e.g., magnitude > 6.5).

- 📍 **Smart Evacuation Routing**  
  Calculates the fastest evacuation path based on the user’s GPS position using Google Maps APIs.

- 🗺️ **Interactive Map Interface**  
  Displays routes, safe zones (refuges), and risk areas in real time.

- 📊 **Admin Dashboard**  
  Allows authorities to monitor population movement and evacuation flows.

- 📁 **GPX Export**  
  Users can download evacuation routes for offline use.

- 🧪 **Simulation Mode**  
  Enables testing of earthquake scenarios and system behavior without real events.

---

## 🛠️ Tech Stack

- **Backend:** Django (Python)
- **Frontend:** HTML, CSS (Bootstrap), JavaScript
- **Database:** SQLite (dev) / PostgreSQL (production)
- **APIs:** Google Maps (Directions, Maps JS, Geolocation)
- **Tools:** Git, Anaconda

---

## 🧠 Project Goals

- Improve emergency response time  
- Provide real-time evacuation guidance  
- Ensure accessibility without requiring app installation  
- Support authorities with data visualization tools  

---

## 🔐 Security & Constraints

- User location data is anonymized  
- Secure admin authentication  
- API keys protected via environment variables  
- Designed to handle high traffic during crisis situations  

---

## 🚀 Future Improvements

- WhatsApp/SMS alert integration (e.g., CallMeBot)  
- Real-time seismic data integration  
- Offline map caching  
- AI-based evacuation optimization  

---
