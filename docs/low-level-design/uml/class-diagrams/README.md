# Class Diagrams - Event Management System

## Overview

This directory contains class diagrams for each use case, following the LLD approach of focusing on individual use cases rather than creating a monolithic system diagram.

## LLD Class Diagram Approach

### **Key Principles:**
1. **One use case = One class diagram**
2. **Focus on core entities and their relationships**
3. **Show only essential methods and properties**
4. **Keep diagrams simple and focused**
5. **Build incrementally**

### **What to Include:**
- Core domain entities
- Service classes
- Repository interfaces
- Key relationships
- Essential methods only

### **What NOT to Include:**
- All possible methods
- Complex inheritance hierarchies
- Implementation details
- Cross-use-case relationships

## Class Diagrams by Use Case

### **Phase 1: Foundation**
- [Authentication Use Case](./01-authentication-use-case.puml) - User registration, login, profile management
- [Event Management Use Case](./02-event-management-use-case.puml) - Event creation, updates, publishing

### **Phase 2: Core Business Logic**
- [Event Discovery & Registration Use Case](./03-event-discovery-registration-use-case.puml) - Browse events, register, waitlist
- [Digital Ticketing Use Case](./04-digital-ticketing-use-case.puml) - Generate tickets, QR codes, email delivery

### **Phase 3: Advanced Features**
- [Speaker Profile Management Use Case](./05-speaker-profile-management-use-case.puml) - Speaker profiles, materials
- [Speaker-Event Assignment Use Case](./06-speaker-event-assignment-use-case.puml) - Assign speakers to events and sessions
- [Multi-Track Session Management Use Case](./07-multi-track-session-management-use-case.puml) - Create and manage multiple tracks
- [Schedule Management Use Case](./08-schedule-management-use-case.puml) - Session creation and timing
- [Ticket Validation & Attendance Use Case](./09-ticket-validation-attendance-use-case.puml) - QR scanning, attendance tracking

### **Phase 4: Enhancement**
- [Automated Notifications Use Case](./10-automated-notifications-use-case.puml) - Email notifications, reminders
- [Feedback Collection & Reporting Use Case](./11-feedback-collection-reporting-use-case.puml) - Feedback forms, analytics

## How to View Diagrams

1. **Open any `.puml` file** in VS Code
2. **Press Alt+D** → "Preview Current Diagram"
3. **Or right-click** → "Preview PlantUML Diagram"

## Design Patterns Used

Each diagram will show the design patterns applied:
- **Singleton**: For service classes
- **Repository**: For data access
- **Factory**: For object creation
- **Strategy**: For different algorithms
- **Observer**: For event notifications

## Implementation Notes

- Diagrams are created **per use case** for focused implementation
- Each diagram shows **only essential classes** for that use case
- **Relationships** are shown between classes within the use case
- **Cross-use-case relationships** are handled in sequence diagrams
