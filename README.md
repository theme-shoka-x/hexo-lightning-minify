# hexo-lightning-minify
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
    options:
      comments: false # Whether to preserve comments in js files
      ecma: 2020 # Maximum ECMA version allowed during optimization
      toplevel: true # Whether to allow optimization of top-level variables and functions
    exclude: # Exclude files, accepts string[], must conform to micromatch format
  css:
    enable: true # Enable CSS optimization
    options: {
      targets: ">= 0.5%" # browserslist format target
    }
    exclude: # Exclude files, accepts string[], must conform to micromatch format
  html:
    enable: true # Enable HTML optimization
    options: {
      comments: false # Whether to preserve comment content
    }
    exclude: # Exclude files, accepts string[], must conform to micromatch format
```
## Features
- [x] Automatically minify js, css, and html
- [x] Automatically handle CSS prefix compatibility based on targets
- [ ] Automatic webp conversion and image preprocessing
- [ ] Automatic pre-connection optimization (long term)

## Comparison
WIP