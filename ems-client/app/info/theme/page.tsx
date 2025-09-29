import {ThemeToggle} from "@/components/theme/ThemeToggle";
import {ThemeDemo} from "@/components/theme/ThemeDemo";

export default function ThemeInfoPage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Welcome to the EMS Client</h1>
                    <ThemeToggle/>
                </div>
                <ThemeDemo/>
            </div>
        </main>
    );
}