import { transform } from 'esbuild'
import type Hexo from 'hexo'
import { isExclude } from './utils'

interface JavascriptMinifyConfig {
  enable: boolean
  options: unknown
  exclude?: string[]
}
export async function minifyJs (this: Hexo, str:string, data:any) {
  const { exclude } = this.config.minify.js as JavascriptMinifyConfig
  if (isExclude(data.path, exclude)) return str
  return (await transform(str, {
    minify: true
  })).code
}
