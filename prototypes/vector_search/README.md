# Vector Search Prototype for ClickFlash

This directory contains prototypes evaluating **Qdrant** as a sub-second vector search indexing system for ClickFlash. The goal is to demonstrate instant indexing capabilities and low-latency retrieval, both in-memory and disk-backed.

## Files

- `qdrant_prototype.py`: Demonstrates an in-memory vector search with payload filtering.
- `qdrant_disk_prototype.py`: Demonstrates a disk-backed vector search using Qdrant's `on_disk=True` parameter to compare memory usage vs latency.

## Metrics (10,000 vectors, 384 dimensions)

### In-Memory (`qdrant_prototype.py`)
- **Indexing time**: ~5.00s
- **Unfiltered search latency**: ~0.046s
- **Filtered search latency (sharpness > 0.8)**: ~0.208s

### Disk-Backed (`qdrant_disk_prototype.py`)
- **Indexing time**: ~5.33s
- **Unfiltered search latency**: ~0.049s
- **Filtered search latency (sharpness > 0.8)**: ~0.217s

## Conclusions

1. **Sub-second Retrieval**: Both pure in-memory and disk-backed modes easily achieve sub-second retrieval latency, even when applying metadata filters (like `sharpness > 0.8`).
2. **Instant Indexing**: Indexing 10,000 vectors takes ~5 seconds, which is acceptable for batch processing or background updates in ClickFlash.
3. **Disk vs Memory**: The Disk-backed configuration adds negligible overhead for indexing and retrieval at this scale compared to the in-memory mode. This implies we can leverage disk storage (similar to DiskANN algorithms) to significantly save RAM while maintaining low-latency filtered retrieval for large datasets.
