# Design Patterns Used - Event Management System

## Overview

This document outlines the design patterns implemented throughout the Event Management System, following the LLD approach of incorporating extensible design patterns for maintainable and scalable code.

---

## **Creational Patterns**

### **Singleton Pattern**
**Used in**: AuthService, DatabaseConnection, ConfigurationManager
**Purpose**: Ensure single instance of critical services
**Implementation**:
```typescript
class AuthService {
    private static instance: AuthService;

    private constructor() {}

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
}
```

### **Factory Pattern**
**Used in**: EventFactory, TicketFactory, NotificationFactory, MaterialFactory
**Purpose**: Create objects without specifying exact classes
**Implementation**:
```typescript
interface EventFactory {
    createEvent(type: string, data: EventData): Event;
}

class EventFactoryImpl implements EventFactory {
    createEvent(type: string, data: EventData): Event {
        switch(type) {
            case 'CONFERENCE': return new ConferenceEvent(data);
            case 'WORKSHOP': return new WorkshopEvent(data);
            default: throw new Error('Invalid event type');
        }
    }
}
```

### **Builder Pattern**
**Used in**: EventBuilder, ScheduleBuilder, TrackBuilder, ReportBuilder
**Purpose**: Construct complex objects step by step
**Implementation**:
```typescript
class EventBuilder {
    private event: Event;

    constructor() {
        this.event = new Event();
    }

    setTitle(title: string): EventBuilder {
        this.event.title = title;
        return this;
    }

    setDates(startDate: Date, endDate: Date): EventBuilder {
        this.event.startDate = startDate;
        this.event.endDate = endDate;
        return this;
    }

    build(): Event {
        return this.event;
    }
}
```

---

## **Structural Patterns**

### **Repository Pattern**
**Used in**: UserRepository, EventRepository, TicketRepository, SpeakerRepository
**Purpose**: Abstract data access layer
**Implementation**:
```typescript
interface UserRepository {
    findById(id: string): Promise<User | null>;
    save(user: User): Promise<User>;
    delete(id: string): Promise<void>;
}

class PostgresUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        // PostgreSQL implementation
    }

    async save(user: User): Promise<User> {
        // PostgreSQL implementation
    }

    async delete(id: string): Promise<void> {
        // PostgreSQL implementation
    }
}
```

### **Adapter Pattern**
**Used in**: EmailAdapter, SMSAdapter, PaymentAdapter, FileStorageAdapter
**Purpose**: Make incompatible interfaces work together
**Implementation**:
```typescript
interface EmailService {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
}

class SendGridEmailAdapter implements EmailService {
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // SendGrid specific implementation
    }
}

class SMTPEmailAdapter implements EmailService {
    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // SMTP specific implementation
    }
}
```

---

## **Behavioral Patterns**

### **Strategy Pattern**
**Used in**: PasswordHashingStrategy, SearchStrategy, ValidationStrategy, NotificationStrategy
**Purpose**: Define family of algorithms and make them interchangeable
**Implementation**:
```typescript
interface PasswordHashingStrategy {
    hash(password: string): Promise<string>;
    verify(password: string, hash: string): Promise<boolean>;
}

class BCryptStrategy implements PasswordHashingStrategy {
    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    async verify(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}

class Argon2Strategy implements PasswordHashingStrategy {
    async hash(password: string): Promise<string> {
        return argon2.hash(password);
    }

    async verify(password: string, hash: string): Promise<boolean> {
        return argon2.verify(hash, password);
    }
}
```

### **Observer Pattern**
**Used in**: EventNotification, WaitlistNotification, AttendanceNotification, MaterialUploadNotification
**Purpose**: Define one-to-many dependency between objects
**Implementation**:
```typescript
interface EventObserver {
    update(event: Event): void;
}

class EmailNotificationObserver implements EventObserver {
    update(event: Event): void {
        // Send email notification
    }
}

class SMSNotificationObserver implements EventObserver {
    update(event: Event): void {
        // Send SMS notification
    }
}

class EventSubject {
    private observers: EventObserver[] = [];

    attach(observer: EventObserver): void {
        this.observers.push(observer);
    }

    notify(event: Event): void {
        this.observers.forEach(observer => observer.update(event));
    }
}
```

### **Command Pattern**
**Used in**: BookingCommand, AssignmentCommand, ScheduleCommand, FeedbackCommand
**Purpose**: Encapsulate requests as objects
**Implementation**:
```typescript
interface Command {
    execute(): Promise<void>;
    undo(): Promise<void>;
}

class RegisterUserCommand implements Command {
    constructor(
        private userService: UserService,
        private userData: UserData
    ) {}

    async execute(): Promise<void> {
        await this.userService.register(this.userData);
    }

    async undo(): Promise<void> {
        await this.userService.deleteUser(this.userData.email);
    }
}

class CommandInvoker {
    private commands: Command[] = [];

    execute(command: Command): Promise<void> {
        this.commands.push(command);
        return command.execute();
    }

    undo(): Promise<void> {
        const command = this.commands.pop();
        if (command) {
            return command.undo();
        }
    }
}
```

### **Template Method Pattern**
**Used in**: TicketTemplate, ReportTemplate, NotificationTemplate, ProfileTemplate
**Purpose**: Define skeleton of algorithm with steps implemented by subclasses
**Implementation**:
```typescript
abstract class NotificationTemplate {
    public async sendNotification(user: User, data: any): Promise<void> {
        const message = this.createMessage(user, data);
        const formattedMessage = this.formatMessage(message);
        await this.deliver(formattedMessage);
        await this.logDelivery(user, message);
    }

    protected abstract createMessage(user: User, data: any): string;
    protected abstract formatMessage(message: string): string;
    protected abstract deliver(message: string): Promise<void>;

    private async logDelivery(user: User, message: string): Promise<void> {
        // Common logging logic
    }
}

class EmailNotificationTemplate extends NotificationTemplate {
    protected createMessage(user: User, data: any): string {
        return `Hello ${user.name}, ${data.message}`;
    }

    protected formatMessage(message: string): string {
        return `<html><body>${message}</body></html>`;
    }

    protected async deliver(message: string): Promise<void> {
        // Email delivery logic
    }
}
```

---

## **Architectural Patterns**

### **Microservices Pattern**
**Used in**: Service Architecture
**Purpose**: Decompose application into small, independent services
**Services**:
- Auth Service
- Event Service
- Booking Service
- Notification Service
- Reporting Service

### **Event-Driven Architecture**
**Used in**: Inter-service communication
**Purpose**: Decouple services through events
**Implementation**: RabbitMQ message queues

### **CQRS (Command Query Responsibility Segregation)**
**Used in**: Event Management, Reporting
**Purpose**: Separate read and write operations
**Implementation**:
```typescript
// Command side
class CreateEventCommand {
    constructor(public eventData: EventData) {}
}

class CreateEventHandler {
    async handle(command: CreateEventCommand): Promise<void> {
        // Write to database
        // Publish event
    }
}

// Query side
class GetEventsQuery {
    constructor(public filters: EventFilters) {}
}

class GetEventsHandler {
    async handle(query: GetEventsQuery): Promise<Event[]> {
        // Read from database
    }
}
```

---

## **Pattern Usage by Use Case**

### **Phase 1: Foundation**
- **Authentication**: Singleton (AuthService), Strategy (PasswordHashing), Factory (TokenFactory)
- **Event Management**: Factory (EventCreation), Builder (EventBuilder), Repository (EventRepository)

### **Phase 2: Core Business Logic**
- **Booking**: Strategy (SearchStrategy), Observer (WaitlistNotification), Command (BookingCommand)
- **Ticketing**: Factory (TicketFactory), Template Method (TicketTemplate), Observer (TicketObserver)

### **Phase 3: Advanced Features**
- **Speaker Management**: Strategy (FileUploadStrategy), Observer (MaterialUploadNotification)
- **Assignment**: Strategy (AssignmentStrategy), Observer (AssignmentNotification), Command (AssignmentCommand)
- **Multi-Track**: Builder (TrackBuilder), Strategy (TrackManagementStrategy)
- **Scheduling**: Builder (ScheduleBuilder), Strategy (SchedulingStrategy), Observer (ScheduleChangeObserver)
- **Attendance**: Strategy (ValidationStrategy), Observer (AttendanceNotification), Factory (ReportFactory)

### **Phase 4: Enhancement**
- **Notifications**: Observer (EventNotification), Strategy (NotificationStrategy), Template Method (NotificationTemplate)
- **Feedback**: Strategy (ReportGeneration), Template Method (ReportTemplate), Observer (FeedbackObserver)

---

## **Benefits of Pattern Implementation**

### **Maintainability**
- Consistent code structure across services
- Easy to understand and modify
- Clear separation of concerns

### **Scalability**
- Services can be scaled independently
- Easy to add new features
- Loose coupling between components

### **Testability**
- Each pattern can be unit tested
- Mock implementations for testing
- Clear interfaces for dependency injection

### **Extensibility**
- Easy to add new strategies
- New observers can be added without modifying existing code
- Factory pattern allows new types to be added easily

---

## **Implementation Guidelines**

### **When to Use Patterns**
1. **Singleton**: For services that should have only one instance
2. **Factory**: When creating objects with complex initialization
3. **Builder**: For objects with many optional parameters
4. **Strategy**: When you have multiple algorithms for the same task
5. **Observer**: When you need to notify multiple objects about changes
6. **Repository**: For data access abstraction
7. **Command**: For operations that need to be undoable or queued

### **Best Practices**
- Don't over-engineer - use patterns only when they add value
- Keep implementations simple and focused
- Document pattern usage in code comments
- Use dependency injection for better testability
- Follow SOLID principles when implementing patterns

---

## **Next Steps**

1. **Implement patterns incrementally** during development
2. **Create pattern examples** in codebase
3. **Document pattern usage** in each service
4. **Add pattern tests** for validation
5. **Refactor existing code** to use patterns where beneficial
