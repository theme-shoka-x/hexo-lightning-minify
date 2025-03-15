# hexo-lightning-minify

## Introduction

This plugin is a modular minifier extracted from [hexo-renderer-multi-next-markdown-it](https://github.com/theme-shoka-x/hexo-renderer-multi-next-markdown-it). Refactored with modern minification tools (e.g., lightningcss), it achieves significant performance improvements compared to legacy implementations.

For comprehensive optimization solutions, consider using [hexo-optimize](https://github.com/next-theme/hexo-optimize). This project primarily serves as a companion package for ShokaX, focusing on essential minification and optimization functionalities.

## Installation

```shell
pnpm add hexo-lightning-minify # Recommended with pnpm
npm install hexo-lightning-minify
```

## Configuration

```yaml
minify:
  js:
    enable: true # Not recommended for ShokaX (built-in esbuild optimization). Enable for other themes.
    exclude: # Excluded files (string[] compatible with micromatch patterns)
  css:
    enable: true # Enable CSS optimization
    options:
      targets: ">= 0.5%" # Browser targets in browserslist format
    exclude: # Excluded files (string[] compatible with micromatch patterns)
  image:
    enable: true # Enable image preprocessing and automatic WebP conversion
    options:
      # Format selection
      avif: true
      webp: false
      quality: 60 # Image quality (1-100 integer, lossless, or nearLossless)
      effort: 2 # CPU workload (0-6 integer, lower values prioritize speed)
      replaceSrc: true # Automatically replace local image URLs in HTML with optimized versions
      # Note: Service Worker implementation is recommended for less intrusive URL replacement
      enableSubSampling: true # Enable advanced chroma subsampling
      # For AVIF: Enables 4:2:0 subsampling (4:4:4 when disabled), optimizing size with minimal quality loss
      # For WebP: Allows extended CPU processing time for enhanced quality
      destroyOldRoute: false # Generate only processed images (preserve original assets)
      persistCache: true # Enable persistent caching of processed images
      # Stores optimized images on disk to accelerate subsequent builds
    exclude: # Excluded files (string[] compatible with micromatch patterns)
```

## Features

- [x] Automatic minification for JS, CSS, and HTML
- [x] Automatic CSS prefix compatibility handling based on browser targets
- [x] Automatic AVIF conversion and image preprocessing
- [ ] Preconnect optimization (long-term roadmap)

## Benchmark
> Note: Initial benchmark tests included HTML compression which has since been deprecated. Current results may vary.

Performance metrics from ShokaX v0.3.9: \
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/35a79034-28e2-461d-ac73-e74745b92f4d" width="480px">
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/6a00aabd-c184-4488-ba12-5ad3bafb2848" width="480px">
<br>

Testing framework using [hexo-many-posts](https://github.com/hexojs/hexo-many-posts):

Environment: Hexo 6.3.0, minification limited to HTML/CSS/JS

|                              | base    | hexo-neat | hexo-minify | hexo-all-minifier | hexo-lightning-minify |
| :--------------------------- | ------- | --------- | ----------- | ----------------- | --------------------- |
| landscape                    | 10.529s | 37.918s   | 36.844s     | 38.572s           | 16.304s               |
| next                         | 27.275s | 36.124s   | 42.854s     | 37.063s           | 29.880s               |
| butterfly                    | 13.853s | 26.641s   | 26.736s     | 35.973s           | 16.796s               |
| particlex                    | 24.422s | 200.641s  | 193.981s    | 201.601s          | 40.478s               |
| reimu                        | 17.631s | 52.432s   | 48.524s     | 51.835s           | 23.938s               |
| shokax(hexo-renderer-marked) | 13.189s | 20.618s   | 19.658s     | 22.448s           | 14.619s               |

![chart](https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/e8f5a5c8-5d34-4899-81ae-20bf892e2231)

|                              | base         | hexo-neat    | hexo-minify  | hexo-all-minifier | hexo-lightning-minify |
| :--------------------------- | ------------ | ------------ | ------------ | ----------------- | --------------------- |
| landscape                    | 99,617,529B  | 97,186,156B  | 92,010,232B  | 97,184,707B       | 88,175,339B           |
| next                         | 32,469,157B  | 30,087,003B  | 28,744,583B  | 30,059,443B       | 28,020,740B           |
| butterfly                    | 37,593,633B  | 37,237,074B  | 33,485,597B  | 34,897,171B       | 35,504,670B           |
| particlex                    | 540,876,348B | 226,997,833B | 214,050,994B | 226,990,791B      | 221,896,130B          |
| reimu                        | 110,252,086B | 95,756,049B  | 91,074,639B  | 95,715,486B       | 88,088,009B           |
| shokax(hexo-renderer-marked) | 142,585,026B | 142,404,138B | 140,988,094B | 142,011,849B      | 140,457,331B          |

*hexo-theme-particlex excluded from visualization for clearer comparison*

![chart2](https://github.com/theme-shoka-x/hexo-lightning-minify/assets/49871906/4eea08d2-c51e-474b-ac16-d9e8ecb52d00)