import React from "react";

const GoogleIcon = (props: any) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M15.545 6.545a9 9 0 1 1-11.09 11.09A9 9 0 0 1 15.545 6.545z" />
        <path d="M12 2v10" />
        <path d="M12 22v-10" />
        <path d="M22 12h-10" />
        <path d="M2 12h10" />
        <circle cx="12" cy="12" r="10" />
    </svg>
);

export { GoogleIcon };