# hexo-lightning-minify
WIP
[中文版本](./README_cn.MD)
## Introduction
This plugin is a minifier module split from [hexo-renderer-multi-next-markdown-it](https://github.com/theme-shoka-x/hexo-renderer-multi-next-markdown-it).
Based on more modern minifiers (such as `lightningcss` and `minify-html`), it significantly improves speed compared to the older version.

If you need more comprehensive optimization, you can try [hexo-optimize](https://github.com/next-theme/hexo-optimize). This project is more inclined to exist as a supporting package for ShokaX, thus it only provides basic minification and optimization functions.

## Installation
```shell
pnpm add hexo-lightning-minify # Recommended to use pnpm
npm install hexo-lightning-minify
```

## Configuration
```yaml
minify:
  js:
    enable: true # ShokaX comes with esbuild optimization, not recommended to enable; recommended for other themes
    exclude: # Exclude files, accepts string[], must conform to micromatch format
  css:
    enable: true # Enable CSS optimization
    options:
      targets: ">= 0.5%" # browserslist format target
    exclude: # Exclude files, accepts string[], must conform to micromatch format
  html:
    enable: true # Enable HTML optimization
    options:
      comments: false # Whether to preserve comment content
    exclude: # Exclude files, accepts string[], must conform to micromatch format
```
## Features
- [x] Automatically minify js, css, and html
- [x] Automatically handle CSS prefix compatibility based on targets
- [ ] Automatic webp conversion and image preprocessing
- [ ] Automatic pre-connection optimization (long term)

## Comparison
On ShokaX v0.3.9： \
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/35a79034-28e2-461d-ac73-e74745b92f4d" width="480px">
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/6a00aabd-c184-4488-ba12-5ad3bafb2848" width="480px">
<br>
When run `hexo g`，`hexo-lightning-minify` runs ~1.88x faster than HRMNMI(HRMMIR)，~1.3x faster than `hexo-neat`
