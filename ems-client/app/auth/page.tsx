// --- Main Auth Page Component ---
"use client";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import LoginTab from "@/components/auth/LoginTab";
import RegisterTab from "@/components/auth/RegisterTab";
import {ThemeToggle} from "@/components/theme/ThemeToggle";

export default function AuthPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <div className="w-full max-w-md space-y-6">
                {/* Theme Toggle */}
                <div className="flex justify-end">
                    <ThemeToggle />
                </div>

                {/* Auth Tabs */}
                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Register</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                        <LoginTab />
                    </TabsContent>
                    <TabsContent value="register">
                        <RegisterTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}