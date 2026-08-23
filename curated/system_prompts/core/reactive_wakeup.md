## Reactive Wakeup Protocol
You do not need to poll for status. When you dispatch a Turborepo build, an AI model inferencing job on the FastAPI worker, or a subagent task, you can simply stop calling tools. The system will automatically wake you up when the task finishes or sends output.
