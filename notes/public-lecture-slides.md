# Public Lecture Slides and Course Materials for *Programming Massively Parallel Processors*

Scope: public, official, or course-hosted materials that map well to the book's CUDA/GPU programming content. Chapter mapping is approximate and can vary by edition.

| Source | URL | Maps to PMPP topics / chapters | Access / licensing notes | Caveats |
|---|---|---|---|---|
| NVIDIA GPU Teaching Kit, Lecture 6.2: "Performance Considerations: Memory Coalescing in CUDA" | https://engineering.purdue.edu/~smidkiff/ece563/NVidiaGPUTeachingToolkit/Mod6/Lecture-6-2-memory-coalescing.pdf | CUDA memory coalescing, DRAM burst behavior, warp access patterns, matrix multiply access patterns, loading tiles, corner turning; roughly PMPP chapters on CUDA programming, memory hierarchy, and optimization | PDF footer states the GPU Teaching Kit is licensed by NVIDIA and the University of Illinois under CC BY-NC 4.0 | Older hardware examples (Tesla C870/C2050 era). Conceptually aligned, but not a current architecture guide |
| NVIDIA Technical Blog: "How to Access Global Memory Efficiently in CUDA C/C++ Kernels" | https://developer.nvidia.com/blog/how-access-global-memory-efficiently-cuda-c-kernels/ | Global memory coalescing, alignment, strided access, warp-level memory transactions; roughly PMPP chapters on CUDA memory behavior and performance tuning | Public NVIDIA blog article; no explicit open-content license visible on page | 2013-era guidance; still useful for fundamentals, but some hardware-specific details are dated |
| NVIDIA Technical Blog: "Using Shared Memory in CUDA C/C++" | https://developer.nvidia.com/blog/using-shared-memory-cuda-cc/ | Shared memory usage, `__syncthreads()`, bank conflicts, coalescing via tiling; roughly PMPP chapters on shared memory and optimization | Public NVIDIA blog article; no explicit open-content license visible on page | Includes older compute-capability examples; core ideas remain valid |
| NVIDIA Technical Blog: "An Efficient Matrix Transpose in CUDA C/C++" | https://developer.nvidia.com/blog/efficient-matrix-transpose-cuda-cc/ | Tiled matrix transpose, coalesced reads, shared-memory padding to avoid bank conflicts; roughly PMPP chapters on tiling, transpose, and memory optimization | Public NVIDIA blog article; no explicit open-content license visible on page | Again, older Tesla-era benchmarks; best used for the algorithmic pattern, not current performance numbers |
| CUDA C++ Best Practices Guide 13.3 documentation | https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/ | Coalesced access, shared memory and memory banks, occupancy, avoiding redundant global-memory transfers; roughly PMPP chapters on performance analysis and optimization | Public NVIDIA docs; versioned at CUDA 13.3 on the page | Current documentation, so behavior and recommendations can drift across CUDA releases |
| CUDA C++ Programming Guide (Legacy) | https://docs.nvidia.com/cuda/cuda-c-programming-guide/ | Thread hierarchy, kernels, memory hierarchy, shared memory, asynchronous SIMT model; roughly PMPP chapters on CUDA basics and GPU execution model | Public NVIDIA docs; page explicitly labels the guide as legacy | Strong for fundamentals, but the guide now includes newer CUDA features that may postdate older PMPP editions |

## Notes

- I intentionally excluded reposts, mirrors, and unofficial slide dumps.
- The strongest slide-style match I found is the NVIDIA GPU Teaching Kit PDF above.
- The NVIDIA blog posts are not lecture slides, but they are official companion material that tracks the same CUDA concepts closely.
- If you want a tighter chapter-by-chapter mapping for a specific PMPP edition, compare the note against that edition's table of contents.
