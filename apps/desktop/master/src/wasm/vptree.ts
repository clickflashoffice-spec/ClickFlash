/* eslint-disable */
/**
 * AssemblyScript VP-Tree Search (WASM)
 * 
 * Target: WebAssembly release (--target release --runtime stub)
 * Traverses a flat binary VP-Tree directly in memory.
 */

@inline
function euclideanDistance(v1Ptr: i32, v2Ptr: i32, dim: i32): f64 {
  let sum: f64 = 0.0;
  for (let i: i32 = 0; i < dim; i++) {
    let diff = <f64>load<f32>(v1Ptr + (i << 2)) - <f64>load<f32>(v2Ptr + (i << 2));
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Searches the VP-Tree natively in WASM memory.
 * @param treePtr Pointer to the start of the nodes array
 * @param nodeCount Number of nodes in the tree
 * @param nodeSize Size of each node in bytes
 * @param dim Dimension of the vector (e.g. 128)
 * @param queryPtr Pointer to the 128-dim Float32 query vector
 * @param threshold Max distance threshold
 * @param limit Max results to return
 * @param resultsPtr Pointer to an output array (size: limit * 8 bytes). 
 *                   Each entry is [nodeIndex: i32, distance: f32]
 * @returns Number of results found
 */
export function searchVPTreeWasm(
  treePtr: i32,
  nodeCount: i32,
  nodeSize: i32,
  dim: i32,
  queryPtr: i32,
  threshold: f64,
  limit: i32,
  resultsPtr: i32
): i32 {
  // Max-Heap logic in WASM would be slightly tedious. 
  // For sub-second matching with typical K=20, a simple insertion sort array is blazingly fast.
  let resultsCount: i32 = 0;
  let currentThreshold: f64 = threshold;

  // We need a stack for tree traversal. Max depth of balanced tree for 1M nodes is ~20-30.
  // We can allocate a small stack locally in memory.
  // Let's use memory after resultsPtr.
  let stackPtr = resultsPtr + (limit * 8);
  let stackSize: i32 = 0;

  // Push root node index (0)
  store<i32>(stackPtr, 0);
  stackSize++;

  while (stackSize > 0) {
    stackSize--;
    let nodeIndex = load<i32>(stackPtr + (stackSize << 2));
    
    if (nodeIndex < 0 || nodeIndex >= nodeCount) continue;

    let nodePtr = treePtr + (nodeIndex * nodeSize);
    
    // Structure:
    // 0: flag (1 byte)
    // 1-24: id (24 bytes)
    // 25-48: title (24 bytes)
    // 49-51: padding (3 bytes)
    // 52-59: radius (8 bytes, f64)
    // 60-571: pivot vector (dim * 4 bytes)
    // 572-575: insideIdx (4 bytes, i32)
    // 576-579: outsideIdx (4 bytes, i32)

    let radius = load<f64>(nodePtr + 52);
    let pivotPtr = nodePtr + 60;
    
    let dist = euclideanDistance(pivotPtr, queryPtr, dim);

    if (dist < currentThreshold) {
      // Insert into sorted results array
      let insertPos: i32 = resultsCount;
      while (insertPos > 0) {
        let prevDist = load<f32>(resultsPtr + ((insertPos - 1) << 3) + 4);
        if (<f64>prevDist <= dist) break;
        
        // Shift right
        if (insertPos < limit) {
          store<i32>(resultsPtr + (insertPos << 3), load<i32>(resultsPtr + ((insertPos - 1) << 3)));
          store<f32>(resultsPtr + (insertPos << 3) + 4, load<f32>(resultsPtr + ((insertPos - 1) << 3) + 4));
        }
        insertPos--;
      }

      if (insertPos < limit) {
        store<i32>(resultsPtr + (insertPos << 3), nodeIndex);
        store<f32>(resultsPtr + (insertPos << 3) + 4, <f32>dist);
        if (resultsCount < limit) resultsCount++;
      }

      if (resultsCount === limit) {
        currentThreshold = Math.min(currentThreshold, <f64>load<f32>(resultsPtr + ((limit - 1) << 3) + 4));
      }
    }

    // VP-Tree pruning logic
    let insideFirst = dist < radius;
    let insideIdx = load<i32>(nodePtr + 60 + (dim << 2));
    let outsideIdx = load<i32>(nodePtr + 64 + (dim << 2));

    if (insideFirst) {
      if (outsideIdx !== -1 && dist + currentThreshold >= radius) {
        store<i32>(stackPtr + (stackSize << 2), outsideIdx);
        stackSize++;
      }
      if (insideIdx !== -1 && dist - currentThreshold <= radius) {
        store<i32>(stackPtr + (stackSize << 2), insideIdx);
        stackSize++;
      }
    } else {
      if (insideIdx !== -1 && dist - currentThreshold <= radius) {
        store<i32>(stackPtr + (stackSize << 2), insideIdx);
        stackSize++;
      }
      if (outsideIdx !== -1 && dist + currentThreshold >= radius) {
        store<i32>(stackPtr + (stackSize << 2), outsideIdx);
        stackSize++;
      }
    }
  }

  return resultsCount;
}
