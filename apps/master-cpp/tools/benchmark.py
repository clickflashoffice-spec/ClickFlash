#!/usr/bin/env python3
"""
ClickFlash Master Service - Load Testing Script
Tests API endpoints under concurrent load
"""

import asyncio
import aiohttp
import time
import json
import statistics
from dataclasses import dataclass
from typing import List, Dict
import argparse

@dataclass
class BenchmarkResult:
    endpoint: str
    method: str
    requests: int
    successful: int
    failed: int
    total_time: float
    min_time: float
    max_time: float
    avg_time: float
    median_time: float
    p95_time: float
    p99_time: float
    rps: float

class LoadTester:
    def __init__(self, base_url: str, concurrency: int = 10):
        self.base_url = base_url.rstrip('/')
        self.concurrency = concurrency
        self.results: List[BenchmarkResult] = []
        
    async def run_benchmark(self, endpoint: str, method: str = 'GET', 
                           data: Dict = None, requests: int = 100) -> BenchmarkResult:
        """Run benchmark for a single endpoint"""
        url = f"{self.base_url}{endpoint}"
        times = []
        successful = 0
        failed = 0
        
        semaphore = asyncio.Semaphore(self.concurrency)
        
        async def make_request():
            nonlocal successful, failed
            async with semaphore:
                start = time.time()
                try:
                    async with aiohttp.ClientSession() as session:
                        if method == 'GET':
                            async with session.get(url, timeout=10) as resp:
                                await resp.text()
                                status = resp.status
                        elif method == 'POST':
                            async with session.post(url, json=data, timeout=10) as resp:
                                await resp.text()
                                status = resp.status
                        
                        elapsed = time.time() - start
                        times.append(elapsed)
                        
                        if status == 200:
                            successful += 1
                        else:
                            failed += 1
                            
                except Exception as e:
                    failed += 1
                    print(f"  Request failed: {e}")
        
        # Run all requests
        start_time = time.time()
        await asyncio.gather(*[make_request() for _ in range(requests)])
        total_time = time.time() - start_time
        
        # Calculate statistics
        if times:
            times.sort()
            avg_time = statistics.mean(times)
            median_time = statistics.median(times)
            p95_idx = int(len(times) * 0.95)
            p99_idx = int(len(times) * 0.99)
            p95_time = times[p95_idx] if p95_idx < len(times) else times[-1]
            p99_time = times[p99_idx] if p99_idx < len(times) else times[-1]
            rps = len(times) / total_time
        else:
            avg_time = median_time = p95_time = p99_time = 0
            rps = 0
        
        result = BenchmarkResult(
            endpoint=endpoint,
            method=method,
            requests=requests,
            successful=successful,
            failed=failed,
            total_time=total_time,
            min_time=min(times) if times else 0,
            max_time=max(times) if times else 0,
            avg_time=avg_time,
            median_time=median_time,
            p95_time=p95_time,
            p99_time=p99_time,
            rps=rps
        )
        
        self.results.append(result)
        return result
    
    def print_results(self):
        """Print benchmark results in table format"""
        print("\n" + "="*100)
        print(f"{'Endpoint':<30} {'Method':<6} {'Reqs':<6} {'OK':<6} {'Fail':<6} {'RPS':<8} {'Avg(ms)':<10} {'P95(ms)':<10} {'P99(ms)':<10}")
        print("="*100)
        
        for r in self.results:
            print(f"{r.endpoint:<30} {r.method:<6} {r.requests:<6} {r.successful:<6} {r.failed:<6} "
                  f"{r.rps:<8.1f} {r.avg_time*1000:<10.2f} {r.p95_time*1000:<10.2f} {r.p99_time*1000:<10.2f}")
        
        print("="*100)
        
        # Summary
        total_requests = sum(r.requests for r in self.results)
        total_successful = sum(r.successful for r in self.results)
        total_failed = sum(r.failed for r in self.results)
        avg_rps = statistics.mean(r.rps for r in self.results) if self.results else 0
        
        print(f"\nTotal Requests: {total_requests}")
        print(f"Successful: {total_successful} ({total_successful/total_requests*100:.1f}%)")
        print(f"Failed: {total_failed} ({total_failed/total_requests*100:.1f}%)")
        print(f"Average RPS: {avg_rps:.1f}")

async def main():
    parser = argparse.ArgumentParser(description='ClickFlash Load Tester')
    parser.add_argument('--url', default='http://localhost:8090', help='Base URL')
    parser.add_argument('--concurrency', type=int, default=10, help='Concurrent requests')
    parser.add_argument('--requests', type=int, default=100, help='Total requests per endpoint')
    args = parser.parse_args()
    
    tester = LoadTester(args.url, args.concurrency)
    
    print(f"ClickFlash Load Tester")
    print(f"URL: {args.url}")
    print(f"Concurrency: {args.concurrency}")
    print(f"Requests per endpoint: {args.requests}")
    print("-" * 60)
    
    # Test health endpoint
    print("\n[1/5] Testing Health Endpoint...")
    await tester.run_benchmark('/api/health', 'GET', requests=args.requests)
    
    # Test auth endpoints (if available)
    print("\n[2/5] Testing Auth Login...")
    await tester.run_benchmark('/api/auth/login', 'POST', 
                              data={'email': 'test@test.com', 'password': 'test'},
                              requests=args.requests//2)
    
    # Test collections list
    print("\n[3/5] Testing Collections List...")
    await tester.run_benchmark('/api/collections/destinations', 'GET', requests=args.requests)
    
    # Test orders list
    print("\n[4/5] Testing Orders List...")
    await tester.run_benchmark('/api/orders', 'GET', requests=args.requests)
    
    # Test sync status
    print("\n[5/5] Testing Sync Status...")
    await tester.run_benchmark('/api/sync/status', 'GET', requests=args.requests)
    
    # Print results
    tester.print_results()

if __name__ == '__main__':
    asyncio.run(main())
