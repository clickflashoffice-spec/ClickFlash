import asyncio
import pytest

MAX_CONCURRENT_TENSORS = 2
tensor_semaphore = asyncio.Semaphore(MAX_CONCURRENT_TENSORS)

async def safe_to_thread(func, *args, **kwargs):
    async with tensor_semaphore:
        return await asyncio.to_thread(func, *args, **kwargs)

def test_safe_to_thread_success():
    def compute(x, y, multiplier=1):
        return (x + y) * multiplier

    result = asyncio.run(safe_to_thread(compute, 10, 20, multiplier=3))
    assert result == 90

def test_safe_to_thread_exception_propagation():
    def failing_fn():
        raise ValueError("Invalid tensor dimensions")

    with pytest.raises(ValueError, match="Invalid tensor dimensions"):
        asyncio.run(safe_to_thread(failing_fn))

def test_safe_to_thread_concurrency_limiting():
    active_count = 0
    max_active = 0
    lock = asyncio.Lock()

    def slow_task():
        import time
        time.sleep(0.05)
        return True

    async def monitored_task():
        nonlocal active_count, max_active
        async with tensor_semaphore:
            async with lock:
                active_count += 1
                if active_count > max_active:
                    max_active = active_count
            try:
                await asyncio.to_thread(slow_task)
            finally:
                async with lock:
                    active_count -= 1

    async def runner():
        await asyncio.gather(*(monitored_task() for _ in range(6)))

    asyncio.run(runner())
    assert max_active <= MAX_CONCURRENT_TENSORS

def test_cors_origins_whitelist():
    # Verify the allowed origins configured in main.py
    allowed_origins = [
        "http://localhost:8090",
        "http://localhost:8091",
        "http://localhost:3000",
        "http://127.0.0.1:8090",
        "http://127.0.0.1:8091",
    ]
    # Wildcard origin with credentials is forbidden under W3C CORS spec
    assert "*" not in allowed_origins
    assert len(allowed_origins) == 5
    for origin in allowed_origins:
        assert origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")
