import time
import uuid
import numpy as np
import random
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, Filter, FieldCondition, Range
from qdrant_client.http.models import PointStruct

def run_prototype():
    print("Initializing Qdrant client (in-memory)...")
    client = QdrantClient(":memory:")
    
    collection_name = "clickflash_vectors_mem"
    vector_size = 384
    
    print(f"Creating collection '{collection_name}'...")
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )
    
    num_points = 10000
    print(f"Generating {num_points} dummy vectors with metadata...")
    vectors = np.random.rand(num_points, vector_size).astype(np.float32)
    
    points = [
        PointStruct(
            id=str(uuid.uuid4()), 
            vector=vector.tolist(), 
            payload={
                "source": "prototype", 
                "idx": i,
                "sharpness": random.uniform(0.0, 1.0)
            }
        )
        for i, vector in enumerate(vectors)
    ]
    
    print(f"Indexing {num_points} vectors...")
    start_time = time.time()
    
    batch_size = 1000
    for i in range(0, num_points, batch_size):
        batch = points[i:i+batch_size]
        client.upsert(
            collection_name=collection_name,
            points=batch
        )
        
    index_time = time.time() - start_time
    print(f"Indexing completed in {index_time:.4f} seconds.")
    
    query_vector = np.random.rand(vector_size).astype(np.float32).tolist()
    
    # 1. Unfiltered search
    print("\nPerforming unfiltered search...")
    search_start = time.time()
    unfiltered_result = client.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=5
    )
    search_time = time.time() - search_start
    print(f"Unfiltered search completed in {search_time:.4f} seconds.")
    
    # 2. Filtered search (sharpness > 0.8)
    print("\nPerforming filtered search (sharpness > 0.8)...")
    filter_condition = Filter(
        must=[
            FieldCondition(
                key="sharpness",
                range=Range(gt=0.8)
            )
        ]
    )
    
    filtered_search_start = time.time()
    filtered_result = client.query_points(
        collection_name=collection_name,
        query=query_vector,
        query_filter=filter_condition,
        limit=5
    )
    filtered_search_time = time.time() - filtered_search_start
    print(f"Filtered search completed in {filtered_search_time:.4f} seconds.")
    
    print("\nTop 5 Filtered Results:")
    try:
        f_points = filtered_result.points
    except AttributeError:
        f_points = filtered_result
        
    for result in f_points:
        print(f"ID: {result.id}, Score: {result.score:.4f}, Sharpness: {result.payload.get('sharpness'):.2f}")

if __name__ == "__main__":
    run_prototype()
