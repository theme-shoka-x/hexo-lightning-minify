# hexo-lightning-minify
## 简介

此插件为[hexo-renderer-multi-next-markdown-it](https://github.com/theme-shoka-x/hexo-renderer-multi-next-markdown-it)拆分出的缩小器模块。
基于更现代的缩小器重构(例如`lightningcss`和`minify-html`)，速度相较于旧版大幅提升。

如果你需要更全面的优化可以试试[hexo-optimize](https://github.com/next-theme/hexo-optimize)。本项目更倾向于作为 ShokaX 的配套支持包存在，因而仅存在基本的缩小与优化功能。

## 安装
```shell
pnpm add hexo-lightning-minify # 建议使用pnpm
npm install hexo-lightning-minify
```

## 配置
```yaml
minify:
  js:
    enable: true # ShokaX 自带 esbuild 优化，不建议开启，其他主题建议开启
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
  css:
    enable: true # 开启 CSS 优化
    options:
      targets: ">= 0.5%" # browserslist 格式的 target
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
  html:
    enable: true # 开启 HTML 优化
    options:
      comments: false # 是否保留注释内容
    exclude: # 排除文件，接受 string[]，需符合 micromatch 格式
  image:
    enable: true # 开启图片预处理和自动 WebP 化
    options:
      avif: false
      webp: true # 预留配置项，现版本无作用
      quality: 80 # 质量，支持1-100的整数、lossless或nearLossless
      effort: 2 # CPU 工作量，0-6之间的整数(越低越快)
      replaceSrc: true # 自动替换生成html中的本地图片链接为webp链接
      # 我们更建议使用 Service Worker 来在用户侧实现 replaceSrc 的功能，这将能够以一种侵入式更小的方式实现链接替换
    exclude:
```

## 功能
- [x] 自动缩小 js、css 和 html
- [x] 基于 targets 自动处理 CSS 前缀兼容
- [x] 自动 webp 化与图片预处理
- [ ] 自动预连接优化(长期)

## 比较
在 ShokaX v0.3.9进行的测试： \
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/35a79034-28e2-461d-ac73-e74745b92f4d" width="480px">
<img src="https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/6a00aabd-c184-4488-ba12-5ad3bafb2848" width="480px">
<br>

基于 [hexo-many-posts](https://github.com/hexojs/hexo-many-posts) 测试：

|                              | base    | hexo-neat | hexo-minify | hexo-all-minifier | hexo-lightning-minify |
|:-----------------------------|---------|-----------|-------------|-------------------|-----------------------|
| landscape                    | 10.529s | 37.918s   | 36.844s     | 38.572s           | 16.304s               |
| next                         | 27.275s | 36.124s   | 42.854s     | 37.063s           | 29.880s               |
| butterfly                    | 13.853s | 26.641s   | 26.736s     | 35.973s           | 16.796s               |
| particlex                    | 24.422s | 200.641s  | 193.981s    | 201.601s          | 40.478s               |
| reimu                        | 17.631s | 52.432s   | 48.524s     | 51.835s           | 23.938s               |
| shokax(hexo-renderer-marked) | 13.189s | 20.618s   | 19.658s     | 22.448s           | 14.619s               |

![chart](https://github.com/theme-shoka-x/hexo-lightning-minify/assets/92242020/e8f5a5c8-5d34-4899-81ae-20bf892e2231)