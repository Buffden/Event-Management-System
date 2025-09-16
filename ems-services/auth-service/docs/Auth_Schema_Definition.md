# Authentication Schema Design

This document outlines the design and logic behind the authentication schema, which is built to support multiple authentication methods (email/password and OAuth providers like Google) while ensuring a unified user profile.

---

## Core Concepts: `User` vs. `Account`

The schema is centered around two primary models: `User` and `Account`. It's crucial to understand their distinct roles:

-   **`User` Model**: This represents a person's core identity within our system. Each user is uniquely identified by their email address. There should only be one `User` record per person.

-   **`Account` Model**: This represents a specific *method* of authentication linked to a `User`. A single user can have multiple accounts, such as one for their Google login and another for their GitHub login. This creates a one-to-many relationship where one `User` can have many `Account`s.

This separation allows a user to have a single, unified profile regardless of how they choose to log in.

---

## Account Linking Logic

The system is designed to intelligently handle cases where a user might sign up with different methods using the same email address.

Here’s the implemented flow:

1.  **Initial Sign-up (e.g., with Google)**:
    -   The system receives the user's profile from Google, including their email.
    -   It checks the `User` table for an existing entry with that email.
    -   If no user exists, a new `User` record is created.
    -   An `Account` record is also created with `provider: "google"` and is linked to the new `User`.

2.  **Subsequent Sign-up with a Different Method (e.g., Email/Password)**:
    -   The user attempts to sign up again using the same email.
    -   The system checks the `User` table and finds an **existing user** with that email.
    -   Instead of creating a duplicate `User` profile (which is prevented by the unique email constraint), the system recognizes this as an existing user.
    -   The logic then allows the user to add a password to their existing profile, updating the `password` field on the `User` record.

**The result is a single `User` profile that the user can access via either their Google account or their email and password.**

---

## Data Integrity: The `@@unique` Constraint

To maintain data integrity, the `Account` model includes the following constraint:

```prisma
@@unique([provider, providerAccountId])