# ClickFlash Architectural Deep Dives & Scalability Plan

## 1. Introduction
This document details the theoretical deep dives conducted to anticipate and solve the architectural bottlenecks that will emerge as the ClickFlash ecosystem scales beyond 10,000+ active studios and hundreds of millions of high-resolution photographs.

## 2. Deep Dive: Offline-Sync Concurrency Crisis
### The Bottleneck
Currently, local SQLite transactions are synced to the Supabase cloud via a background worker loop in the Electron Main process.
- **Scale Problem:** If a studio uploads 10,000 photos offline, and then reconnects to the network, the current loop will attempt to sequentially POST data. If 1,000 studios do this simultaneously after a major regional internet outage, it will create a massive Thundering Herd problem, DDOSing our own Supabase API and exhausting connection pools.

### The Solution: Durable Queues & Backpressure
1. **Local BullMQ Implementation:** Instead of in-memory arrays and simple loops, the Master App must implement a lightweight, persistent local queue (e.g., SQLite-backed queue) that guarantees task survival across app restarts.
2. **Exponential Backoff & Jitter:** The sync worker must implement network backpressure. If Supabase responds with 429 Too Many Requests, the worker must back off exponentially, introducing randomized jitter to prevent synchronized retries.

## 3. Deep Dive: Memory Exhaustion via IPC Bridge
### The Bottleneck
The Master App uses the Electron Inter-Process Communication (IPC) bridge to send commands to the backend, which processes raw RAW/JPEG images using `sharp`.
- **Scale Problem:** Sending massive byte arrays or base64 encoded strings of 50MB RAW files across the IPC bridge forces V8 to serialize and deserialize the data, instantly doubling memory consumption. Processing a batch of 100 photos will result in catastrophic `OutOfMemory` heap crashes.

### The Solution: Stream-Based Processing
1. **File Path Offloading:** The frontend must NEVER send image buffers over IPC. It will exclusively send absolute file paths.
2. **Node.js Streams:** The backend will use `fs.createReadStream` to pipe files directly into `sharp` for watermarking and resizing, piping the output directly to the destination folder or cloud storage buffer. Memory consumption will remain flat regardless of batch size.

## 4. Deep Dive: Global Asset Delivery Latency
### The Bottleneck
When a customer views their gallery from Tokyo, but our Supabase storage bucket is located in `us-east-1`, the TTFB (Time To First Byte) for high-resolution gallery images will exceed 1,500ms, severely impacting user experience and perceived app speed.

### The Solution: Edge Computing & Intelligent Caching
1. **Cloudflare Integration:** We must migrate our static asset delivery behind a heavily optimized Cloudflare proxy.
2. **Dynamic Edge Resizing:** Instead of pre-generating thumbnails for every possible device size, we will store only the original high-resolution (watermarked) image. A Cloudflare Worker at the edge will intercept image requests, resize/crop them on-the-fly using Cloudflare Image Resizing based on the `User-Agent` and query params, and cache the result at the edge node closest to the user.
3. **Result:** Millisecond response times globally, drastic reduction in cloud storage costs, and perfect UI responsiveness.
