import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    {
        ...js.configs.recommended,
    },
    {
        // Frontend source — browser environment
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
                ecmaFeatures: { jsx: true },
            },
            globals: {
                // Standard browser globals
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                console: "readonly",
                fetch: "readonly",
                sessionStorage: "readonly",
                localStorage: "readonly",
                location: "readonly",
                history: "readonly",
                screen: "readonly",
                visualViewport: "readonly",

                // Web workers
                Worker: "readonly",
                self: "readonly",

                // Timers
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                requestIdleCallback: "readonly",
                cancelIdleCallback: "readonly",

                // Promises and async
                Promise: "readonly",
                queueMicrotask: "readonly",

                // Built-in types
                Date: "readonly",
                JSON: "readonly",
                Math: "readonly",
                Error: "readonly",
                Map: "readonly",
                Set: "readonly",
                WeakMap: "readonly",
                WeakSet: "readonly",
                Symbol: "readonly",
                ArrayBuffer: "readonly",
                Uint8Array: "readonly",
                Int32Array: "readonly",
                Float32Array: "readonly",
                Float64Array: "readonly",

                // DOM types
                Element: "readonly",
                HTMLElement: "readonly",
                HTMLDivElement: "readonly",
                HTMLSpanElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLSelectElement: "readonly",
                HTMLCanvasElement: "readonly",
                HTMLImageElement: "readonly",
                HTMLVideoElement: "readonly",
                HTMLAudioElement: "readonly",
                HTMLTextAreaElement: "readonly",
                HTMLAnchorElement: "readonly",
                HTMLButtonElement: "readonly",
                Node: "readonly",
                NodeList: "readonly",

                // File API
                FileList: "readonly",
                BlobPart: "readonly",
                EventTarget: "readonly",

                // Canvas and images
                CanvasRenderingContext2D: "readonly",
                ImageData: "readonly",
                Image: "readonly",

                // File APIs
                Blob: "readonly",
                File: "readonly",
                FileReader: "readonly",
                FormData: "readonly",

                // Fetch API
                Headers: "readonly",
                Request: "readonly",
                Response: "readonly",

                // React
                React: "readonly",
                ReactDOM: "readonly",

                // Web APIs
                AbortController: "readonly",
                AbortSignal: "readonly",
                WebSocket: "readonly",
                MessageChannel: "readonly",
                MessageEvent: "readonly",

                // Observers
                MutationObserver: "readonly",
                ResizeObserver: "readonly",
                IntersectionObserver: "readonly",

                // Animation
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",

                // Performance APIs
                performance: "readonly",

                // Crypto
                crypto: "readonly",

                // Base64
                atob: "readonly",
                btoa: "readonly",

                // Event types
                Event: "readonly",
                CustomEvent: "readonly",
                KeyboardEvent: "readonly",
                MouseEvent: "readonly",
                FocusEvent: "readonly",
                InputEvent: "readonly",
                UIEvent: "readonly",
                WheelEvent: "readonly",
                TouchEvent: "readonly",
                PointerEvent: "readonly",

                // Notifications & Error APIs
                Notification: "readonly",
                DOMException: "readonly",

                // Electron/Browser dialogs
                alert: "readonly",
                confirm: "readonly",
                prompt: "readonly",

                // Node.js types used in Electron frontend code
                NodeJS: "readonly",
                process: "readonly",
                global: "readonly",
                globalThis: "readonly",

                // URL
                URL: "readonly",
                URLSearchParams: "readonly",

                // Storage
                Storage: "readonly",
                StorageEstimate: "readonly",

                // IndexedDB
                IDBVersionChangeEvent: "readonly",

                // Network Information API
                ConnectionType: "readonly",

                // DOM Events
                EventListener: "readonly",
                CloseEvent: "readonly",
                DragEvent: "readonly",
                Touch: "readonly",
                TouchInit: "readonly",
                IntersectionObserverCallback: "readonly",
                IntersectionObserverEntry: "readonly",

                // Performance
                Performance: "readonly",
                PerformanceEntry: "readonly",
                PerformanceEventTiming: "readonly",
                PerformanceNavigationTiming: "readonly",
                PerformanceObserver: "readonly",

                // Media
                MediaStream: "readonly",

                // WebGL
                WebGLRenderingContext: "readonly",

                // Web Encoding
                TextDecoder: "readonly",
                TextEncoder: "readonly",

                // Web APIs
                EventSource: "readonly",
                FrameRequestCallback: "readonly",
                GlobalEventHandlers: "readonly",
                Document: "readonly",
                HeadersInit: "readonly",
                SerialPort: "readonly",

                // Jest globals (test files)
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            // TypeScript
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            // React
            "react/jsx-key": "error",
            "react/no-array-index-key": "warn",
            "react/no-direct-mutation-state": "error",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // General
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-unused-vars": "off", // Handled by @typescript-eslint/no-unused-vars
            "prefer-const": "warn",
            "no-var": "error",
            // These are intentional patterns in this codebase — warn rather than error
            "no-empty": ["warn", { allowEmptyCatch: true }],
            "no-case-declarations": "warn",
        },
        settings: {
            react: { version: "detect" },
        },
    },
    {
        // Backend — Node.js environment
        files: ["backend/**/*.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: {
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                Buffer: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setImmediate: "readonly",
                clearImmediate: "readonly",
                Promise: "readonly",
                Date: "readonly",
                JSON: "readonly",
                Math: "readonly",
                Error: "readonly",
                Map: "readonly",
                Set: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                crypto: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "no-console": "off", // Backend uses structured logging
            "no-unused-vars": "off",
            "prefer-const": "warn",
            "no-var": "error",
        },
    },
    {
        // Electron main process TypeScript files
        files: ["main.ts", "preload.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
            },
            globals: {
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                Buffer: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                URL: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "no-console": "off",
            "no-unused-vars": "off",
            "prefer-const": "warn",
            "no-var": "error",
        },
    },
    {
        // Logger utility — intentionally wraps console, so allow it
        files: ["src/utils/logger.ts"],
        rules: {
            "no-console": "off",
        },
    },
    {
        // Ignore patterns
        ignores: [
            "dist/**",
            "node_modules/**",
            "coverage/**",
            "*.config.cjs",
            "*.config.js",
            "eslint.config.js",
            "autoUpdater.js",
            "main.js",
            "preload.js",
            "**/__mocks__/**",
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
        ],
    },
];
