import {ThemeDemo} from '@/components/theme/ThemeDemo';
import {ThemeToggle} from '@/components/theme/ThemeToggle';

import Image from "next/image";
import { redirect } from 'next/navigation';

export default function Home() {
    // Redirect to our beautiful landing page
    // redirect('/landing');
  return (
    <div>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-900">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
                <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-[5rem]">
                    EventManager
                    <span className="text-blue-600 dark:text-blue-400">.</span>
                </h1>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                        The all-in-one platform for creating, managing, and tracking events.
                    </p>
                    <div className="flex gap-4">
                    </div>
                </div>
                <ThemeDemo />
                <ThemeToggle />
            </div>
        </div>
    </div>
  );
}
