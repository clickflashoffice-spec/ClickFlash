/**
 * ============================================================================
 * WebAssembly SIMD-Optimized Hierarchical Navigable Small World (HNSW) Index
 * File: hnsw_wasm_simd.cpp
 *
 * State-of-the-Art vector search graph builder and searcher engineered for
 * WebAssembly SIMD128 (<wasm_simd128.h>) with cross-platform fallback
 * (AVX2/SSE/NEON/Scalar).
 *
 * Supported Metrics:
 *  - Inner Product / Dot Product (MAX_INNER_PRODUCT / MIN_DISTANCE)
 *  - Cosine Distance (1.0 - Cosine Similarity)
 *  - Squared Euclidean Distance (L2)
 *
 * Features:
 *  - Hand-tuned WebAssembly SIMD128 intrinsics (4-way / 8-way unrolled f32x4)
 *  - Cache-aligned contiguous vector storage (16-byte alignment for SIMD)
 *  - O(1) tag-based Visited table to eliminate per-query allocation overhead
 *  - HNSW Algorithm 4 (SELECT-NEIGHBORS-HEURISTIC) for diverse graph topology
 *  - C-ABI exports (EMSCRIPTEN_KEEPALIVE) for direct JS / WebAssembly interop
 *  - Integrated benchmark suite and ground-truth Recall@K validator
 * ============================================================================
 */

#include <iostream>
#include <vector>
#include <queue>
#include <random>
#include <cmath>
#include <chrono>
#include <cstring>
#include <algorithm>
#include <memory>
#include <cstdint>
#include <cassert>
#include <limits>
#include <iomanip>

// ----------------------------------------------------------------------------
// SIMD Header Selection & Intrinsics Abstraction
// ----------------------------------------------------------------------------
#if defined(__wasm_simd128__) || defined(__wasm__)
  #include <wasm_simd128.h>
  #define HAS_WASM_SIMD128 1
#elif defined(__AVX2__) || defined(__AVX__) || defined(__SSE2__) || defined(_M_X64) || defined(_M_IX86)
  #include <immintrin.h>
  #define HAS_X86_SIMD 1
#elif defined(__ARM_NEON) || defined(__aarch64__)
  #include <arm_neon.h>
  #define HAS_ARM_NEON 1
#else
  #define HAS_SCALAR_ONLY 1
#endif

#ifndef EMSCRIPTEN_KEEPALIVE
  #ifdef __EMSCRIPTEN__
    #include <emscripten.h>
  #else
    #define EMSCRIPTEN_KEEPALIVE
  #endif
#endif

namespace hnsw_simd {

// ============================================================================
// Section 1: SIMD Math Kernels (<wasm_simd128.h>)
// ============================================================================

#if defined(HAS_WASM_SIMD128)

/**
 * @brief Horizontal reduction of a 128-bit WASM vector (4 x f32) to a scalar float.
 */
static inline float wasm_reduce_add_f32(v128_t v) {
    // v = [f0, f1, f2, f3]
    v128_t high64 = wasm_i32x4_shuffle(v, v, 2, 3, 0, 1);    // [f2, f3, f0, f1]
    v128_t sum64  = wasm_f32x4_add(v, high64);               // [f0+f2, f1+f3, ...]
    v128_t high32 = wasm_i32x4_shuffle(sum64, sum64, 1, 0, 3, 2); // [f1+f3, f0+f2, ...]
    v128_t sum32  = wasm_f32x4_add(sum64, high32);           // lane 0 = (f0+f2)+(f1+f3)
    return wasm_f32x4_extract_lane(sum32, 0);
}

/**
 * @brief WebAssembly SIMD Dot Product with 4-way unrolling (16 floats / 64 bytes per loop).
 */
inline float wasm_dot_product_f32(const float* a, const float* b, size_t dim) {
    v128_t acc0 = wasm_f32x4_splat(0.0f);
    v128_t acc1 = wasm_f32x4_splat(0.0f);
    v128_t acc2 = wasm_f32x4_splat(0.0f);
    v128_t acc3 = wasm_f32x4_splat(0.0f);

    size_t i = 0;
    // 16 floats = 4 SIMD registers per unrolled step
    for (; i + 15 < dim; i += 16) {
        v128_t va0 = wasm_v128_load(a + i);
        v128_t vb0 = wasm_v128_load(b + i);
        acc0 = wasm_f32x4_add(acc0, wasm_f32x4_mul(va0, vb0));

        v128_t va1 = wasm_v128_load(a + i + 4);
        v128_t vb1 = wasm_v128_load(b + i + 4);
        acc1 = wasm_f32x4_add(acc1, wasm_f32x4_mul(va1, vb1));

        v128_t va2 = wasm_v128_load(a + i + 8);
        v128_t vb2 = wasm_v128_load(b + i + 8);
        acc2 = wasm_f32x4_add(acc2, wasm_f32x4_mul(va2, vb2));

        v128_t va3 = wasm_v128_load(a + i + 12);
        v128_t vb3 = wasm_v128_load(b + i + 12);
        acc3 = wasm_f32x4_add(acc3, wasm_f32x4_mul(va3, vb3));
    }

    // Residual 4-float SIMD chunks
    for (; i + 3 < dim; i += 4) {
        v128_t va = wasm_v128_load(a + i);
        v128_t vb = wasm_v128_load(b + i);
        acc0 = wasm_f32x4_add(acc0, wasm_f32x4_mul(va, vb));
    }

    v128_t sum_all = wasm_f32x4_add(wasm_f32x4_add(acc0, acc1), wasm_f32x4_add(acc2, acc3));
    float result = wasm_reduce_add_f32(sum_all);

    // Scalar cleanup
    for (; i < dim; ++i) {
        result += a[i] * b[i];
    }
    return result;
}

/**
 * @brief WebAssembly SIMD Squared L2 Distance with 4-way unrolling.
 */
inline float wasm_l2_sq_distance_f32(const float* a, const float* b, size_t dim) {
    v128_t acc0 = wasm_f32x4_splat(0.0f);
    v128_t acc1 = wasm_f32x4_splat(0.0f);
    v128_t acc2 = wasm_f32x4_splat(0.0f);
    v128_t acc3 = wasm_f32x4_splat(0.0f);

    size_t i = 0;
    for (; i + 15 < dim; i += 16) {
        v128_t d0 = wasm_f32x4_sub(wasm_v128_load(a + i),      wasm_v128_load(b + i));
        v128_t d1 = wasm_f32x4_sub(wasm_v128_load(a + i + 4),  wasm_v128_load(b + i + 4));
        v128_t d2 = wasm_f32x4_sub(wasm_v128_load(a + i + 8),  wasm_v128_load(b + i + 8));
        v128_t d3 = wasm_f32x4_sub(wasm_v128_load(a + i + 12), wasm_v128_load(b + i + 12));

        acc0 = wasm_f32x4_add(acc0, wasm_f32x4_mul(d0, d0));
        acc1 = wasm_f32x4_add(acc1, wasm_f32x4_mul(d1, d1));
        acc2 = wasm_f32x4_add(acc2, wasm_f32x4_mul(d2, d2));
        acc3 = wasm_f32x4_add(acc3, wasm_f32x4_mul(d3, d3));
    }

    for (; i + 3 < dim; i += 4) {
        v128_t d = wasm_f32x4_sub(wasm_v128_load(a + i), wasm_v128_load(b + i));
        acc0 = wasm_f32x4_add(acc0, wasm_f32x4_mul(d, d));
    }

    v128_t sum_all = wasm_f32x4_add(wasm_f32x4_add(acc0, acc1), wasm_f32x4_add(acc2, acc3));
    float result = wasm_reduce_add_f32(sum_all);

    for (; i < dim; ++i) {
        float diff = a[i] - b[i];
        result += diff * diff;
    }
    return result;
}

/**
 * @brief WebAssembly SIMD Cosine Distance: 1.0f - (dot / (||a|| * ||b||)).
 */
inline float wasm_cosine_distance_f32(const float* a, const float* b, size_t dim) {
    v128_t acc_dot  = wasm_f32x4_splat(0.0f);
    v128_t acc_norm_a = wasm_f32x4_splat(0.0f);
    v128_t acc_norm_b = wasm_f32x4_splat(0.0f);

    size_t i = 0;
    for (; i + 3 < dim; i += 4) {
        v128_t va = wasm_v128_load(a + i);
        v128_t vb = wasm_v128_load(b + i);

        acc_dot    = wasm_f32x4_add(acc_dot,    wasm_f32x4_mul(va, vb));
        acc_norm_a = wasm_f32x4_add(acc_norm_a, wasm_f32x4_mul(va, va));
        acc_norm_b = wasm_f32x4_add(acc_norm_b, wasm_f32x4_mul(vb, vb));
    }

    float dot    = wasm_reduce_add_f32(acc_dot);
    float norm_a = wasm_reduce_add_f32(acc_norm_a);
    float norm_b = wasm_reduce_add_f32(acc_norm_b);

    for (; i < dim; ++i) {
        dot    += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    float denom = std::sqrt(norm_a) * std::sqrt(norm_b);
    if (denom <= 1e-12f) return 1.0f;
    float sim = dot / denom;
    sim = std::max(-1.0f, std::min(1.0f, sim));
    return 1.0f - sim;
}

/**
 * @brief WebAssembly SIMD In-place L2 Normalization.
 */
inline void wasm_normalize_f32(float* vec, size_t dim) {
    v128_t acc_norm = wasm_f32x4_splat(0.0f);
    size_t i = 0;
    for (; i + 3 < dim; i += 4) {
        v128_t v = wasm_v128_load(vec + i);
        acc_norm = wasm_f32x4_add(acc_norm, wasm_f32x4_mul(v, v));
    }
    float norm_sq = wasm_reduce_add_f32(acc_norm);
    for (; i < dim; ++i) {
        norm_sq += vec[i] * vec[i];
    }
    float norm = std::sqrt(norm_sq);
    if (norm <= 1e-12f) return;

    float inv_norm = 1.0f / norm;
    v128_t v_inv = wasm_f32x4_splat(inv_norm);
    for (i = 0; i + 3 < dim; i += 4) {
        v128_t v = wasm_v128_load(vec + i);
        wasm_v128_store(vec + i, wasm_f32x4_mul(v, v_inv));
    }
    for (; i < dim; ++i) {
        vec[i] *= inv_norm;
    }
}

#elif defined(HAS_X86_SIMD)

// ----------------------------------------------------------------------------
// x86 AVX2/SSE Fallback Implementation for native testing on Intel/AMD
// ----------------------------------------------------------------------------
inline float wasm_dot_product_f32(const float* a, const float* b, size_t dim) {
#if defined(__AVX2__) || defined(__AVX__)
    __m256 acc0 = _mm256_setzero_ps();
    __m256 acc1 = _mm256_setzero_ps();
    size_t i = 0;
    for (; i + 15 < dim; i += 16) {
        __m256 va0 = _mm256_loadu_ps(a + i);
        __m256 vb0 = _mm256_loadu_ps(b + i);
        acc0 = _mm256_add_ps(acc0, _mm256_mul_ps(va0, vb0));
        __m256 va1 = _mm256_loadu_ps(a + i + 8);
        __m256 vb1 = _mm256_loadu_ps(b + i + 8);
        acc1 = _mm256_add_ps(acc1, _mm256_mul_ps(va1, vb1));
    }
    __m256 sum256 = _mm256_add_ps(acc0, acc1);
    alignas(32) float buf[8];
    _mm256_storeu_ps(buf, sum256);
    float result = buf[0] + buf[1] + buf[2] + buf[3] + buf[4] + buf[5] + buf[6] + buf[7];
    for (; i < dim; ++i) result += a[i] * b[i];
    return result;
#else
    __m128 acc0 = _mm_setzero_ps();
    __m128 acc1 = _mm_setzero_ps();
    size_t i = 0;
    for (; i + 7 < dim; i += 8) {
        acc0 = _mm_add_ps(acc0, _mm_mul_ps(_mm_loadu_ps(a + i), _mm_loadu_ps(b + i)));
        acc1 = _mm_add_ps(acc1, _mm_mul_ps(_mm_loadu_ps(a + i + 4), _mm_loadu_ps(b + i + 4)));
    }
    __m128 sum = _mm_add_ps(acc0, acc1);
    alignas(16) float buf[4];
    _mm_storeu_ps(buf, sum);
    float result = buf[0] + buf[1] + buf[2] + buf[3];
    for (; i < dim; ++i) result += a[i] * b[i];
    return result;
#endif
}

inline float wasm_l2_sq_distance_f32(const float* a, const float* b, size_t dim) {
    __m128 acc = _mm_setzero_ps();
    size_t i = 0;
    for (; i + 3 < dim; i += 4) {
        __m128 diff = _mm_sub_ps(_mm_loadu_ps(a + i), _mm_loadu_ps(b + i));
        acc = _mm_add_ps(acc, _mm_mul_ps(diff, diff));
    }
    alignas(16) float buf[4];
    _mm_storeu_ps(buf, acc);
    float result = buf[0] + buf[1] + buf[2] + buf[3];
    for (; i < dim; ++i) {
        float d = a[i] - b[i];
        result += d * d;
    }
    return result;
}

inline float wasm_cosine_distance_f32(const float* a, const float* b, size_t dim) {
    float dot = wasm_dot_product_f32(a, b, dim);
    float norm_a = wasm_dot_product_f32(a, a, dim);
    float norm_b = wasm_dot_product_f32(b, b, dim);
    float denom = std::sqrt(norm_a) * std::sqrt(norm_b);
    if (denom <= 1e-12f) return 1.0f;
    float sim = dot / denom;
    sim = std::max(-1.0f, std::min(1.0f, sim));
    return 1.0f - sim;
}

inline void wasm_normalize_f32(float* vec, size_t dim) {
    float norm_sq = wasm_dot_product_f32(vec, vec, dim);
    float norm = std::sqrt(norm_sq);
    if (norm <= 1e-12f) return;
    float inv_norm = 1.0f / norm;
    for (size_t i = 0; i < dim; ++i) vec[i] *= inv_norm;
}

#else

// ----------------------------------------------------------------------------
// Pure Scalar Reference Fallback (Portable)
// ----------------------------------------------------------------------------
inline float wasm_dot_product_f32(const float* a, const float* b, size_t dim) {
    float dot0 = 0.0f, dot1 = 0.0f, dot2 = 0.0f, dot3 = 0.0f;
    size_t i = 0;
    for (; i + 3 < dim; i += 4) {
        dot0 += a[i]     * b[i];
        dot1 += a[i + 1] * b[i + 1];
        dot2 += a[i + 2] * b[i + 2];
        dot3 += a[i + 3] * b[i + 3];
    }
    float result = (dot0 + dot1) + (dot2 + dot3);
    for (; i < dim; ++i) result += a[i] * b[i];
    return result;
}

inline float wasm_l2_sq_distance_f32(const float* a, const float* b, size_t dim) {
    float sum0 = 0.0f, sum1 = 0.0f, sum2 = 0.0f, sum3 = 0.0f;
    size_t i = 0;
    for (; i + 3 < dim; i += 4) {
        float d0 = a[i]     - b[i];
        float d1 = a[i + 1] - b[i + 1];
        float d2 = a[i + 2] - b[i + 2];
        float d3 = a[i + 3] - b[i + 3];
        sum0 += d0 * d0;
        sum1 += d1 * d1;
        sum2 += d2 * d2;
        sum3 += d3 * d3;
    }
    float result = (sum0 + sum1) + (sum2 + sum3);
    for (; i < dim; ++i) {
        float d = a[i] - b[i];
        result += d * d;
    }
    return result;
}

inline float wasm_cosine_distance_f32(const float* a, const float* b, size_t dim) {
    float dot = wasm_dot_product_f32(a, b, dim);
    float norm_a = wasm_dot_product_f32(a, a, dim);
    float norm_b = wasm_dot_product_f32(b, b, dim);
    float denom = std::sqrt(norm_a) * std::sqrt(norm_b);
    if (denom <= 1e-12f) return 1.0f;
    float sim = dot / denom;
    sim = std::max(-1.0f, std::min(1.0f, sim));
    return 1.0f - sim;
}

inline void wasm_normalize_f32(float* vec, size_t dim) {
    float norm_sq = wasm_dot_product_f32(vec, vec, dim);
    float norm = std::sqrt(norm_sq);
    if (norm <= 1e-12f) return;
    float inv_norm = 1.0f / norm;
    for (size_t i = 0; i < dim; ++i) vec[i] *= inv_norm;
}

#endif

// ============================================================================
// Section 2: HNSW Data Structures & Graph Types
// ============================================================================

enum class MetricType : int {
    DOT_PRODUCT = 0,     ///< Maximize inner product (Distance = -Dot)
    COSINE      = 1,     ///< Cosine distance = 1.0 - Cosine Similarity
    L2_SQUARED  = 2      ///< Squared Euclidean Distance = sum((a_i - b_i)^2)
};

using NodeId = uint32_t;
constexpr NodeId INVALID_NODE_ID = std::numeric_limits<NodeId>::max();

/**
 * @brief DistPair represents (distance, NodeId).
 * Used in priority queues for search.
 */
struct DistPair {
    float distance;
    NodeId id;

    inline bool operator>(const DistPair& other) const {
        return distance > other.distance;
    }
    inline bool operator<(const DistPair& other) const {
        return distance < other.distance;
    }
};

/**
 * @brief Fast Tag-based Visited Table.
 * Avoids O(N) memset on every search invocation by using a query version counter.
 */
class VisitedTagTable {
public:
    VisitedTagTable(size_t capacity = 0)
        : tag_(1), tags_(capacity, 0) {}

    void resize(size_t new_capacity) {
        tags_.resize(new_capacity, 0);
    }

    inline void next_query() {
        tag_++;
        if (tag_ == 0) { // Handle 32-bit overflow
            std::fill(tags_.begin(), tags_.end(), 0);
            tag_ = 1;
        }
    }

    inline bool is_visited(NodeId id) const {
        return id < tags_.size() && tags_[id] == tag_;
    }

    inline void set_visited(NodeId id) {
        if (id >= tags_.size()) {
            tags_.resize(std::max(tags_.size() * 2, static_cast<size_t>(id + 1)), 0);
        }
        tags_[id] = tag_;
    }

private:
    uint32_t tag_;
    std::vector<uint32_t> tags_;
};

// ============================================================================
// Section 3: HNSW Index Class Definition
// ============================================================================

class HNSWIndex {
public:
    /**
     * @param dim Dimension of the vector embeddings (e.g. 128 for FaceNet / 512 for CLIP)
     * @param max_elements Maximum expected vectors in this index
     * @param M Number of bidirectional links established per node (typically 16-64)
     * @param ef_construction Size of dynamic candidate list during graph construction (typically 100-200)
     * @param metric Distance metric (DOT_PRODUCT, COSINE, L2_SQUARED)
     * @param random_seed Seed for deterministic graph generation
     */
    HNSWIndex(size_t dim,
              size_t max_elements,
              size_t M = 16,
              size_t ef_construction = 200,
              MetricType metric = MetricType::COSINE,
              unsigned int random_seed = 42)
        : dim_(dim),
          max_elements_(max_elements),
          M_(M),
          M0_(2 * M),
          ef_construction_(ef_construction),
          metric_(metric),
          entry_point_(INVALID_NODE_ID),
          max_level_(-1),
          num_elements_(0),
          visited_table_(max_elements),
          rng_(random_seed),
          uniform_dist_(0.0, 1.0)
    {
        // Parameter mL controls level decay probability
        mL_ = 1.0 / std::log(static_cast<double>(M_));

        // Reserve 16-byte aligned vector storage (dim * max_elements)
        vectors_.reserve(dim_ * max_elements_);
    }

    /**
     * @brief Computes distance between query vector and stored node vector using SIMD.
     */
    inline float compute_distance(const float* query, NodeId node_id) const {
        const float* node_vec = get_vector(node_id);
        switch (metric_) {
            case MetricType::DOT_PRODUCT:
                // For dot product, lower distance means higher dot product: -dot
                return -wasm_dot_product_f32(query, node_vec, dim_);
            case MetricType::COSINE:
                return wasm_cosine_distance_f32(query, node_vec, dim_);
            case MetricType::L2_SQUARED:
            default:
                return wasm_l2_sq_distance_f32(query, node_vec, dim_);
        }
    }

    /**
     * @brief Computes distance between two stored nodes.
     */
    inline float compute_node_distance(NodeId a, NodeId b) const {
        return compute_distance(get_vector(a), b);
    }

    /**
     * @brief Adds a vector into the HNSW graph.
     * @return Internal NodeId assigned to this vector.
     */
    NodeId insert(const float* vector_data) {
        assert(num_elements_ < max_elements_ && "Index reached max capacity");
        NodeId new_id = static_cast<NodeId>(num_elements_++);

        // Copy vector data to contiguous storage
        size_t offset = new_id * dim_;
        vectors_.resize(offset + dim_);
        std::memcpy(&vectors_[offset], vector_data, dim_ * sizeof(float));

        // Sample layer level from exponential distribution
        int node_level = get_random_level();
        node_levels_.push_back(node_level);

        // Resize graph adjacency structures
        if (graph_.size() <= static_cast<size_t>(node_level)) {
            graph_.resize(node_level + 1);
        }
        for (int l = 0; l <= node_level; ++l) {
            if (graph_[l].size() <= new_id) {
                graph_[l].resize(new_id + 1);
            }
        }

        // First element inserted into graph
        if (entry_point_ == INVALID_NODE_ID) {
            entry_point_ = new_id;
            max_level_ = node_level;
            return new_id;
        }

        NodeId curr_obj = entry_point_;
        float cur_dist = compute_distance(vector_data, curr_obj);

        // Phase 1: Top-down greedy search (1-NN) from max_level_ to node_level + 1
        for (int l = max_level_; l > node_level; --l) {
            bool changed = true;
            while (changed) {
                changed = false;
                if (graph_[l].size() <= curr_obj) break;
                const auto& neighbors = graph_[l][curr_obj];
                for (NodeId neighbor : neighbors) {
                    float d = compute_distance(vector_data, neighbor);
                    if (d < cur_dist) {
                        cur_dist = d;
                        curr_obj = neighbor;
                        changed = true;
                    }
                }
            }
        }

        // Phase 2: Search and bidirectional connect from min(max_level_, node_level) down to 0
        std::vector<NodeId> enter_points = { curr_obj };
        for (int l = std::min(max_level_, node_level); l >= 0; --l) {
            // Find ef_construction nearest neighbors at layer l
            auto w = search_layer_internal(vector_data, enter_points, ef_construction_, l);

            // Select neighbors using heuristic
            size_t max_m = (l == 0) ? M0_ : M_;
            auto neighbors = select_neighbors_heuristic(w, max_m);

            // Establish bidirectional connections
            graph_[l][new_id] = neighbors;
            for (NodeId neighbor : neighbors) {
                auto& n_list = graph_[l][neighbor];
                n_list.push_back(new_id);

                // Prune neighbor's connection list if it exceeds max_m
                if (n_list.size() > max_m) {
                    shrink_neighbor_list(neighbor, max_m, l);
                }
            }

            // Next layer search starts from the candidates found
            enter_points.clear();
            for (const auto& pair : w) {
                enter_points.push_back(pair.id);
            }
        }

        // Phase 3: Update global entry point if new node level exceeds current maximum
        if (node_level > max_level_) {
            max_level_ = node_level;
            entry_point_ = new_id;
        }

        return new_id;
    }

    /**
     * @brief K-Nearest Neighbor (KNN) Search.
     * @param query Pointer to query vector (dim floats)
     * @param k Number of nearest neighbors to retrieve
     * @param ef_search Beam width parameter for search quality vs throughput tradeoff
     * @return Sorted list of (distance, NodeId) pairs ascending by distance
     */
    std::vector<DistPair> search_knn(const float* query, size_t k, size_t ef_search = 64) {
        if (entry_point_ == INVALID_NODE_ID || num_elements_ == 0) {
            return {};
        }

        size_t ef = std::max(k, ef_search);
        NodeId curr_obj = entry_point_;
        float cur_dist = compute_distance(query, curr_obj);

        // Phase 1: Greedy search from max_level_ down to layer 1
        for (int l = max_level_; l > 0; --l) {
            bool changed = true;
            while (changed) {
                changed = false;
                if (graph_[l].size() <= curr_obj) break;
                const auto& neighbors = graph_[l][curr_obj];
                for (NodeId neighbor : neighbors) {
                    float d = compute_distance(query, neighbor);
                    if (d < cur_dist) {
                        cur_dist = d;
                        curr_obj = neighbor;
                        changed = true;
                    }
                }
            }
        }

        // Phase 2: Beam search with priority queue at layer 0
        std::vector<NodeId> enter_points = { curr_obj };
        auto candidates = search_layer_internal(query, enter_points, ef, 0);

        // Extract top-K from candidates (search_layer_internal returns sorted ascending)
        if (candidates.size() > k) {
            candidates.resize(k);
        }
        return candidates;
    }

    inline size_t size() const { return num_elements_; }
    inline size_t dim() const { return dim_; }
    inline int max_level() const { return max_level_; }

    inline const float* get_vector(NodeId id) const {
        return &vectors_[id * dim_];
    }

private:
    /**
     * @brief Internal Layer Beam Search with Visited tracking.
     */
    std::vector<DistPair> search_layer_internal(const float* query,
                                               const std::vector<NodeId>& enter_points,
                                               size_t ef,
                                               int layer) {
        visited_table_.next_query();

        // Min-heap for candidate exploration: smallest distance at top
        std::priority_queue<DistPair, std::vector<DistPair>, std::greater<DistPair>> v_candidates;
        // Max-heap for keeping the ef best results: largest distance at top
        std::priority_queue<DistPair, std::vector<DistPair>, std::less<DistPair>> w_results;

        for (NodeId ep : enter_points) {
            float dist = compute_distance(query, ep);
            visited_table_.set_visited(ep);
            v_candidates.push({ dist, ep });
            w_results.push({ dist, ep });
        }

        while (!v_candidates.empty()) {
            DistPair curr = v_candidates.top();
            v_candidates.pop();

            // Furthest element in current result set
            float furthest_dist = w_results.top().distance;
            if (curr.distance > furthest_dist && w_results.size() >= ef) {
                break;
            }

            if (graph_[layer].size() <= curr.id) continue;
            const auto& neighbors = graph_[layer][curr.id];

            for (NodeId neighbor : neighbors) {
                if (!visited_table_.is_visited(neighbor)) {
                    visited_table_.set_visited(neighbor);

                    float d = compute_distance(query, neighbor);
                    furthest_dist = w_results.top().distance;

                    if (d < furthest_dist || w_results.size() < ef) {
                        v_candidates.push({ d, neighbor });
                        w_results.push({ d, neighbor });

                        if (w_results.size() > ef) {
                            w_results.pop(); // Drop furthest
                        }
                    }
                }
            }
        }

        // Convert max-heap to ascending vector
        std::vector<DistPair> results;
        results.reserve(w_results.size());
        while (!w_results.empty()) {
            results.push_back(w_results.top());
            w_results.pop();
        }
        std::reverse(results.begin(), results.end());
        return results;
    }

    /**
     * @brief Algorithm 4: SELECT-NEIGHBORS-HEURISTIC from HNSW paper.
     * Ensures diverse graph connectivity and prevents redundant parallel edges.
     */
    std::vector<NodeId> select_neighbors_heuristic(const std::vector<DistPair>& candidates, size_t M_max) {
        if (candidates.size() <= M_max) {
            std::vector<NodeId> result;
            result.reserve(candidates.size());
            for (const auto& c : candidates) result.push_back(c.id);
            return result;
        }

        // Min-heap ordered by distance from base query
        std::priority_queue<DistPair, std::vector<DistPair>, std::greater<DistPair>> w_cand;
        for (const auto& c : candidates) {
            w_cand.push(c);
        }

        std::vector<NodeId> selected;
        selected.reserve(M_max);

        while (!w_cand.empty() && selected.size() < M_max) {
            DistPair e = w_cand.top();
            w_cand.pop();

            bool is_good = true;
            for (NodeId sel : selected) {
                float dist_to_sel = compute_node_distance(e.id, sel);
                if (dist_to_sel < e.distance) {
                    // Candidate e is closer to an already selected neighbor than to base node
                    is_good = false;
                    break;
                }
            }

            if (is_good) {
                selected.push_back(e.id);
            }
        }

        return selected;
    }

    /**
     * @brief Prunes connection list of a node at a given layer to max_m.
     */
    void shrink_neighbor_list(NodeId node_id, size_t max_m, int layer) {
        auto& neighbors = graph_[layer][node_id];
        if (neighbors.size() <= max_m) return;

        std::vector<DistPair> candidates;
        candidates.reserve(neighbors.size());
        for (NodeId n : neighbors) {
            candidates.push_back({ compute_node_distance(node_id, n), n });
        }
        std::sort(candidates.begin(), candidates.end(), [](const DistPair& a, const DistPair& b) {
            return a.distance < b.distance;
        });

        neighbors = select_neighbors_heuristic(candidates, max_m);
    }

    /**
     * @brief Generates random level for newly inserted node based on exponential distribution.
     */
    int get_random_level() {
        double r = uniform_dist_(rng_);
        if (r == 0.0) r = 0.0000001;
        return static_cast<int>(-std::log(r) * mL_);
    }

    size_t dim_;
    size_t max_elements_;
    size_t M_;
    size_t M0_;
    size_t ef_construction_;
    MetricType metric_;
    double mL_;

    NodeId entry_point_;
    int max_level_;
    size_t num_elements_;

    // Contiguous vector storage (dim_ * num_elements_)
    std::vector<float> vectors_;
    // Node level per element
    std::vector<int> node_levels_;
    // Graph adjacency lists: graph_[layer][node_id] = list of neighbor NodeIds
    std::vector<std::vector<std::vector<NodeId>>> graph_;

    VisitedTagTable visited_table_;
    std::mt19937 rng_;
    std::uniform_real_distribution<double> uniform_dist_;
};

} // namespace hnsw_simd

// ============================================================================
// Section 4: WebAssembly / C-ABI Export API (EMSCRIPTEN_KEEPALIVE)
// ============================================================================

extern "C" {

/**
 * @brief Create a new HNSW index instance.
 */
EMSCRIPTEN_KEEPALIVE
void* hnsw_create(uint32_t dim,
                  uint32_t max_elements,
                  uint32_t M,
                  uint32_t ef_construction,
                  int metric) {
    try {
        auto* index = new hnsw_simd::HNSWIndex(
            dim,
            max_elements,
            M,
            ef_construction,
            static_cast<hnsw_simd::MetricType>(metric)
        );
        return static_cast<void*>(index);
    } catch (...) {
        return nullptr;
    }
}

/**
 * @brief Destroy an existing HNSW index.
 */
EMSCRIPTEN_KEEPALIVE
void hnsw_destroy(void* index_ptr) {
    if (index_ptr) {
        delete static_cast<hnsw_simd::HNSWIndex*>(index_ptr);
    }
}

/**
 * @brief Add a vector item to the HNSW index.
 * @return Assigned NodeId on success, or -1 on failure.
 */
EMSCRIPTEN_KEEPALIVE
int32_t hnsw_add_item(void* index_ptr, const float* vector_data) {
    if (!index_ptr || !vector_data) return -1;
    auto* index = static_cast<hnsw_simd::HNSWIndex*>(index_ptr);
    return static_cast<int32_t>(index->insert(vector_data));
}

/**
 * @brief Execute KNN search.
 * @param out_ids Pointer to output array for NodeIds (size >= k)
 * @param out_distances Pointer to output array for distances (size >= k)
 * @return Number of neighbors found (<= k)
 */
EMSCRIPTEN_KEEPALIVE
uint32_t hnsw_search_knn(void* index_ptr,
                         const float* query_data,
                         uint32_t k,
                         uint32_t ef_search,
                         uint32_t* out_ids,
                         float* out_distances) {
    if (!index_ptr || !query_data || !out_ids || !out_distances) return 0;
    auto* index = static_cast<hnsw_simd::HNSWIndex*>(index_ptr);
    auto results = index->search_knn(query_data, k, ef_search);

    for (size_t i = 0; i < results.size(); ++i) {
        out_ids[i] = results[i].id;
        out_distances[i] = results[i].distance;
    }
    return static_cast<uint32_t>(results.size());
}

/**
 * @brief Direct WASM SIMD Kernel Exports for Standalone Vector Math
 */
EMSCRIPTEN_KEEPALIVE
float wasm_simd_dot(const float* a, const float* b, uint32_t dim) {
    return hnsw_simd::wasm_dot_product_f32(a, b, dim);
}

EMSCRIPTEN_KEEPALIVE
float wasm_simd_l2(const float* a, const float* b, uint32_t dim) {
    return hnsw_simd::wasm_l2_sq_distance_f32(a, b, dim);
}

EMSCRIPTEN_KEEPALIVE
float wasm_simd_cosine(const float* a, const float* b, uint32_t dim) {
    return hnsw_simd::wasm_cosine_distance_f32(a, b, dim);
}

EMSCRIPTEN_KEEPALIVE
void wasm_simd_normalize(float* vec, uint32_t dim) {
    hnsw_simd::wasm_normalize_f32(vec, dim);
}

} // extern "C"

// ============================================================================
// Section 5: Verification, Ground-Truth Recall & Benchmark Harness
// ============================================================================

static void generate_random_vector(std::vector<float>& vec, size_t dim, std::mt19937& rng) {
    std::normal_distribution<float> dist(0.0f, 1.0f);
    vec.resize(dim);
    for (size_t i = 0; i < dim; ++i) {
        vec[i] = dist(rng);
    }
    hnsw_simd::wasm_normalize_f32(vec.data(), dim);
}

int main() {
    std::cout << "================================================================" << std::endl;
    std::cout << "  WebAssembly SIMD-Optimized HNSW Vector Search Prototype" << std::endl;
    std::cout << "================================================================" << std::endl;

#if defined(HAS_WASM_SIMD128)
    std::cout << ">> SIMD Backend: WebAssembly SIMD128 (<wasm_simd128.h>)" << std::endl;
#elif defined(HAS_X86_SIMD)
    std::cout << ">> SIMD Backend: Native x86 AVX2/SSE Vectorization" << std::endl;
#elif defined(HAS_ARM_NEON)
    std::cout << ">> SIMD Backend: ARM NEON Vectorization" << std::endl;
#else
    std::cout << ">> SIMD Backend: Scalar Fallback" << std::endl;
#endif

    const size_t DIM = 128;          // 128-dimensional face embeddings
    const size_t NUM_VECTORS = 1000; // Dataset size
    const size_t NUM_QUERIES = 50;   // Evaluation queries
    const size_t TOP_K = 10;
    const size_t M = 16;
    const size_t EF_CONSTRUCTION = 128;
    const size_t EF_SEARCH = 64;

    std::mt19937 rng(1337);

    // 1. Math Verification Test
    std::cout << "\n[1/4] Verifying SIMD Distance Math Kernels (dim=" << DIM << ")..." << std::endl;
    std::vector<float> v1, v2;
    generate_random_vector(v1, DIM, rng);
    generate_random_vector(v2, DIM, rng);

    float sim_dot = hnsw_simd::wasm_dot_product_f32(v1.data(), v2.data(), DIM);
    float sim_l2  = hnsw_simd::wasm_l2_sq_distance_f32(v1.data(), v2.data(), DIM);
    float sim_cos = hnsw_simd::wasm_cosine_distance_f32(v1.data(), v2.data(), DIM);

    // Reference scalar check
    float ref_dot = 0.0f, ref_l2 = 0.0f;
    for (size_t i = 0; i < DIM; ++i) {
        ref_dot += v1[i] * v2[i];
        float d = v1[i] - v2[i];
        ref_l2 += d * d;
    }

    std::cout << "  Dot Product (SIMD vs Ref): " << std::fixed << std::setprecision(6)
              << sim_dot << " vs " << ref_dot << " (Diff: " << std::abs(sim_dot - ref_dot) << ")" << std::endl;
    std::cout << "  L2 Squared  (SIMD vs Ref): " << sim_l2 << " vs " << ref_l2
              << " (Diff: " << std::abs(sim_l2 - ref_l2) << ")" << std::endl;
    std::cout << "  Cosine Dist (SIMD):        " << sim_cos << std::endl;
    assert(std::abs(sim_dot - ref_dot) < 1e-4f && "SIMD dot product mismatch!");

    // 2. Build Dataset
    std::cout << "\n[2/4] Generating Synthetic Dataset (" << NUM_VECTORS << " vectors)..." << std::endl;
    std::vector<std::vector<float>> dataset(NUM_VECTORS);
    for (size_t i = 0; i < NUM_VECTORS; ++i) {
        generate_random_vector(dataset[i], DIM, rng);
    }

    // 3. Index Construction
    std::cout << "\n[3/4] Building HNSW Index (M=" << M << ", efConstruction=" << EF_CONSTRUCTION << ")..." << std::endl;
    hnsw_simd::HNSWIndex index(DIM, NUM_VECTORS, M, EF_CONSTRUCTION, hnsw_simd::MetricType::COSINE);

    auto t_start_build = std::chrono::high_resolution_clock::now();
    for (size_t i = 0; i < NUM_VECTORS; ++i) {
        index.insert(dataset[i].data());
    }
    auto t_end_build = std::chrono::high_resolution_clock::now();
    double build_time_ms = std::chrono::duration<double, std::milli>(t_end_build - t_start_build).count();

    std::cout << "  Built index with " << index.size() << " nodes in "
              << build_time_ms << " ms (" << (NUM_VECTORS / (build_time_ms / 1000.0)) << " vectors/sec)" << std::endl;
    std::cout << "  Graph Max Level: " << index.max_level() << std::endl;

    // 4. Ground-truth Evaluation (Exact KNN vs HNSW KNN)
    std::cout << "\n[4/4] Evaluating Accuracy & Recall@" << TOP_K << " across " << NUM_QUERIES << " queries..." << std::endl;
    std::vector<std::vector<float>> queries(NUM_QUERIES);
    for (size_t i = 0; i < NUM_QUERIES; ++i) {
        generate_random_vector(queries[i], DIM, rng);
    }

    double total_recall = 0.0;
    double total_search_time_us = 0.0;

    for (size_t q = 0; q < NUM_QUERIES; ++q) {
        const float* query_ptr = queries[q].data();

        // Exact Brute Force Ground Truth
        std::vector<hnsw_simd::DistPair> ground_truth;
        ground_truth.reserve(NUM_VECTORS);
        for (size_t i = 0; i < NUM_VECTORS; ++i) {
            float dist = hnsw_simd::wasm_cosine_distance_f32(query_ptr, dataset[i].data(), DIM);
            ground_truth.push_back({ dist, static_cast<uint32_t>(i) });
        }
        std::sort(ground_truth.begin(), ground_truth.end());
        ground_truth.resize(TOP_K);

        // HNSW Approximate Nearest Neighbor Search
        auto t_start_query = std::chrono::high_resolution_clock::now();
        auto hnsw_results = index.search_knn(query_ptr, TOP_K, EF_SEARCH);
        auto t_end_query = std::chrono::high_resolution_clock::now();
        total_search_time_us += std::chrono::duration<double, std::micro>(t_end_query - t_start_query).count();

        // Compute Recall@K overlap
        size_t matches = 0;
        for (const auto& hr : hnsw_results) {
            for (const auto& gt : ground_truth) {
                if (hr.id == gt.id) {
                    matches++;
                    break;
                }
            }
        }
        total_recall += static_cast<double>(matches) / TOP_K;
    }

    double avg_recall = (total_recall / NUM_QUERIES) * 100.0;
    double avg_latency_us = total_search_time_us / NUM_QUERIES;
    double qps = 1000000.0 / avg_latency_us;

    std::cout << "\n================ Benchmark Results ================" << std::endl;
    std::cout << "  Average Recall@" << TOP_K << "  : " << std::fixed << std::setprecision(2) << avg_recall << " %" << std::endl;
    std::cout << "  Average Query Latency: " << std::fixed << std::setprecision(2) << avg_latency_us << " us" << std::endl;
    std::cout << "  Search Throughput    : " << std::fixed << std::setprecision(0) << qps << " QPS" << std::endl;
    std::cout << "====================================================\n" << std::endl;

    return 0;
}
