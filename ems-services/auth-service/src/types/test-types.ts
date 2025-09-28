// src/types/test-types.ts
export interface MockUser {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: string;
    isActive: boolean;
    emailVerified: Date | null;
}

export interface TestAuthResponse {
    token: string;
    user: MockUser;
}
