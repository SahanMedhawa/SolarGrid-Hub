# Smart Solar Microgrid Trading System – API Specification & Testing Guide

## Base URLs
- **Local Kestrel:** `http://localhost:5000/api` or `https://localhost:5001/api`
- **IIS Deployment:** `http://localhost/SmartSolarAPI/api`
- **Swagger Documentation:** `http://localhost:5000/swagger`

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Web User / Prosumer Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body (Web User):**
  ```json
  {
    "username": "admin",
    "password": "Admin@123",
    "loginType": "User"
  }
  ```
- **Request Body (Prosumer):**
  ```json
  {
    "username": "199012345678",
    "password": "Kamal@123",
    "loginType": "Prosumer"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "role": "Backoffice",
    "userId": "66f01234abcd...",
    "displayName": "admin"
  }
  ```

---

## 2. Prosumer Management Endpoints (`/api/prosumer`)

### 2.1 Self-Registration (Mobile Client)
- **Endpoint:** `POST /api/prosumer/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "nic": "200011223344",
    "firstName": "Saman",
    "lastName": "Kumara",
    "email": "saman@gmail.com",
    "phone": "0779988776",
    "address": "12 Temple Road, Colombo",
    "password": "Password@123"
  }
  ```
- **Response (201 Created):** Returns new prosumer object with status `"Pending"`.

### 2.2 Get Pending Prosumers (Web Client - Backoffice)
- **Endpoint:** `GET /api/prosumer/status/Pending`
- **Access:** Authorized (Roles: `Backoffice`)

### 2.3 Activate Prosumer Account (Backoffice Only)
- **Endpoint:** `PUT /api/prosumer/{nic}/activate`
- **Access:** Authorized (Roles: `Backoffice`)

### 2.4 Request Deactivation (Prosumer Self-Service)
- **Endpoint:** `PUT /api/prosumer/{nic}/deactivate`
- **Access:** Authorized (Prosumer)

---

## 3. Microgrid Node Hub Endpoints (`/api/microgridnode`)

### 3.1 Get All Active Nodes
- **Endpoint:** `GET /api/microgridnode/active`
- **Access:** Authorized
- **Response (200 OK):**
  ```json
  [
    {
      "id": "66f0...",
      "nodeName": "Colombo Central Hub",
      "location": "Colombo 03",
      "latitude": 6.9034,
      "longitude": 79.8546,
      "capacityKWh": 500.0,
      "batterySlots": 20,
      "availableBatterySlots": 18,
      "schedule": "06:00-18:00",
      "isActive": true
    }
  ]
  ```

### 3.2 Create Grid Hub Node
- **Endpoint:** `POST /api/microgridnode`
- **Access:** Authorized (Roles: `Backoffice`)

### 3.3 Deactivate Node (Active Reservation Protection Rule)
- **Endpoint:** `DELETE /api/microgridnode/{id}`
- **Access:** Authorized (Roles: `Backoffice`)
- **Rule Enforcement:** If any reservation has status `"Pending"` or `"Approved"` referencing this node, the request returns:
  ```json
  {
    "message": "Cannot deactivate: 1 active reservation(s) exist on this node."
  }
  ```

---

## 4. Energy Reservation Endpoints (`/api/reservation`)

### 4.1 Create Booking Request (7-Day Rule)
- **Endpoint:** `POST /api/reservation`
- **Access:** Authorized
- **Request Body:**
  ```json
  {
    "prosumerNic": "199012345678",
    "slotId": "SLOT-001",
    "nodeId": "66f0...",
    "reservationDate": "2026-09-25T10:00:00Z",
    "energyKWh": 20.5
  }
  ```
- **Rule Check:** If `reservationDate > UtcNow + 7 Days`, rejected with:
  ```json
  {
    "message": "Reservation must be scheduled within the next 7 days."
  }
  ```

### 4.2 Update Booking (12-Hour Notice Rule)
- **Endpoint:** `PUT /api/reservation/{id}`
- **Rule Check:** If `reservationDate <= UtcNow + 12 Hours`, rejected with:
  ```json
  {
    "message": "Updates require at least 12 hours' notice before the reservation date."
  }
  ```

### 4.3 Cancel Booking (12-Hour Notice Rule)
- **Endpoint:** `PUT /api/reservation/{id}/cancel`
- **Rule Check:** If `reservationDate <= UtcNow + 12 Hours`, rejected with:
  ```json
  {
    "message": "Cancellations require at least 12 hours' notice before the reservation date."
  }
  ```

### 4.4 Approve Booking & Generate Secure QR Code
- **Endpoint:** `PUT /api/reservation/{id}/approve`
- **Access:** Authorized (Roles: `Backoffice, GridOperator`)
- **Outcome:** Updates status to `"Approved"` and generates unique cryptographic token `SMTS-{id}-{nic}-{guid}`.

### 4.5 Complete Energy Transfer via QR Code (Operator Mode)
- **Endpoint:** `PUT /api/reservation/{id}/complete`
- **Access:** Authorized (Roles: `GridOperator`)
- **Request Body:**
  ```json
  {
    "qrData": "SMTS-66f0...-199012345678-abcd1234..."
  }
  ```
- **Outcome:** Matches scanned QR string against stored token; transitions status to `"Completed"`.

