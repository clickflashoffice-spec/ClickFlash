import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ...js.configs.recommended,
    // Exclude electron-main.js from global recommended (it has its own Node.js config block below)
    ignores: ["electron-main.js"],
  },
  {
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
        DedicatedWorkerGlobalScope: "readonly",
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
        Proxy: "readonly",
        Reflect: "readonly",
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
        HTMLUListElement: "readonly",
        Node: "readonly",
        NodeList: "readonly",

        // File API
        FileList: "readonly",
        EventTarget: "readonly",
        EventListener: "readonly",

        // Canvas and images
        CanvasRenderingContext2D: "readonly",
        ImageData: "readonly",
        OffscreenCanvas: "readonly",
        OffscreenCanvasRenderingContext2D: "readonly",
        createImageBitmap: "readonly",
        Image: "readonly",

        // File APIs
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",

        // Fetch API
        Headers: "readonly",
        HeadersInit: "readonly",
        Request: "readonly",
        RequestInit: "readonly",
        Response: "readonly",
        ResponseInit: "readonly",
        fetch: "readonly",

        // React
        React: "readonly",
        ReactDOM: "readonly",
        PropTypes: "readonly",

        // Web APIs
        AbortController: "readonly",
        AbortSignal: "readonly",
        WebSocket: "readonly",
        EventSource: "readonly",
        MessageChannel: "readonly",
        MessageEvent: "readonly",

        // Observers
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        PerformanceObserver: "readonly",

        // Animation
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",

        // Performance APIs
        performance: "readonly",
        PerformanceEntry: "readonly",
        PerformanceNavigationTiming: "readonly",

        // Crypto
        crypto: "readonly",

        // Base64
        atob: "readonly",
        btoa: "readonly",

        // Service Workers
        caches: "readonly",
        ServiceWorker: "readonly",
        ServiceWorkerRegistration: "readonly",

        // Drag and Drop
        DataTransfer: "readonly",
        DataTransferItemList: "readonly",
        DataTransferItem: "readonly",
        DragEvent: "readonly",

        // Media APIs
        MediaSource: "readonly",
        MediaStream: "readonly",
        SourceBuffer: "readonly",

        // Network Information API
        ConnectionType: "readonly",

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

        // Electron/Browser dialogs
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",

        // IdleDeadline for requestIdleCallback
        IdleDeadline: "readonly",

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

        // jest globals (for test files)
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
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    // Backend files — Node.js environment
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
      "no-console": "off", // Backend uses console for structured logging
      "no-unused-vars": "off",
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  {
    // Electron Main Process — Node.js CJS environment
    // electron-main.js uses require/process/__dirname/__filename which are Node.js globals
    files: ["electron-main.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "off", // Node globals handled above
    },
  },
  {
    // Ignore patterns
    ignores: [
      "electron-main.js", // Node.js/Electron CJS — not subject to browser ESLint rules
      "electron-main-new.js", // Node.js/Electron CJS — not subject to browser ESLint rules
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.config.cjs",
      "*.config.js",
      "eslint.config.js",
      "**/__mocks__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
    ],
  },
];
