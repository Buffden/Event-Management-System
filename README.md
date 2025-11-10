# 🎉 Event Management System (CSE 5325 – Team 2)

### 👥 Team Members
- **Ashwin Athappan Karuppan Chetty** (1002248214)
- **Harshwardhan Patil** (1002224144)
- **Anirudh Ramesh Kashyap** (1002216351)

---

## 📌 Executive Summary
The **Event Management System (EMS)** is a comprehensive web-based platform developed as part of **CSE 5325 – Software Engineering II: Management, Maintenance, and Quality Assurance (Fall 2025, Team 2)**.

Our solution is designed to streamline the **end-to-end event lifecycle** — from planning and promotion to registration, ticketing, real-time attendee tracking, and post-event analysis. The system aims to deliver a **robust Minimum Viable Product (MVP) in a short timeframe (see Project Phases below)**, enabling administrators, speakers, and attendees to collaborate seamlessly through a centralized platform.

---

## 🎯 Project Objectives
- **Streamline Event Management:** Provide a unified dashboard for administrators to create, update, and manage events.
- **Enhance User Experience:** Deliver an intuitive interface for event discovery, registration, and ticket management.
- **Empower Speakers:** Allow speakers to manage profiles, accept invitations, upload presentation materials, and track session attendance.
- **Enable Data-Driven Insights:** Offer reporting and analytics tools for measuring event success and gathering attendee feedback.

---

## 🚀 Core Features (MVP)
- **Event Creation & Management** – Admin dashboard to manage event details (title, description, dates, venues, categories).
- **Online Registration System** – User-friendly interface for attendees to browse and register.
- **Speaker Portal** – Manage speaker profiles, sessions, presentation slides, and communication with organizers.
- **Digital Ticketing & Validation** – Auto-generated QR-code tickets and web-based scanning for check-ins.
- **Schedule Management** – Tools for creating and managing multi-track sessions and speaker assignments.
- **Attendee Tracking** – Real-time monitoring of attendance via QR code scanning.
- **Automated Notifications** – Email or push notifications for reminders, updates, and changes.
- **Feedback Collection** – Post-event surveys and rating forms for attendees.
- **Reporting & Analytics** – Data-driven insights into attendance, registration numbers, and feedback trends.

---

## 🏗️ System Architecture
The EMS follows a **3-tier architecture** for scalability and maintainability:

- **Frontend:** [Next.js](https://nextjs.org/) with TypeScript (server-side rendering, SEO-friendly, modular components).
- **Backend:** [Node.js](https://nodejs.org/) with TypeScript (REST API, business logic, authentication & authorization).
- **Database:** [PostgreSQL](https://www.postgresql.org/) (relational, ACID-compliant, scalable).
- **Deployment:** Docker Compose / Kubernetes for containerized deployments.

---

## 📅 Project Phases
1. **Discovery & Design** – Finalize requirements, wireframes, and system architecture.
2. **Development & Implementation** – Build frontend, backend, and database schema.
3. **Testing & QA** – Conduct unit, integration, and system testing (with automation).
4. **Deployment & Launch** – Deploy locally using Docker/Kubernetes.
5. **Maintenance & Support** – Continuous improvements, bug fixes, documentation updates.

---

## 🛡️ Non-Functional Requirements
- **Security:** JWT authentication, encryption, protection against XSS & CSRF.
- **Scalability:** Microservice-ready architecture for handling concurrent users.
- **Performance:** Fast page loads and minimal latency.
- **Reliability:** Stable operations with data backup & recovery mechanisms.
- **Usability:** Intuitive and responsive UI for all user roles.

---

## 📚 References
- *Software Engineering: Principles and Practice* – Hans van Vliet (2008)
- *Practical Software Maintenance: Best Practices for Managing Your Software Investment* – Thomas M. Pigoski (1996)
- *Effective Project Management: Traditional, Agile, Extreme* – Robert K. Wysocki (2013)

---

## 🏗️ Services Created

- **auth-service**: Node.js microservice with health endpoints
- **event-service**: Node.js microservice with health endpoints
- **booking-service**: Node.js microservice with health endpoints
- **speaker-service**: Node.js microservice with health endpoints
- **feedback-service**: Node.js microservice with health endpoints
- **notification-service**: Node.js microservice with health endpoints

## 🚀 Running Services

To run the entire system locally, follow these steps:

```bash
cd <Event-Management-System-Directory>
docker-compose up -d
```

2. Update configuration as needed

## 📁 Project Structure

```
├── ems-client/           # Next.js frontend with health endpoint
├── ems-gateway/          # NGINX configuration
└── ems-services/         # Node.js microservices
    ├── auth-service/
    ├── event-service/
    ├── booking-service/
    ├── speaker-service/
    ├── feedback-service/
    └── notification-service/
```
