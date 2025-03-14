import type Hexo from 'hexo'
import { isExclude } from './utils'
import browserslist from 'browserslist'
import { transform, browserslistToTargets } from 'lightningcss'
interface CSSMinifyConfig {
  enable: boolean
  options: {
    targets?: string
  }
  exclude: string[]
}
export function minifyCss (this: Hexo, str:string, data:any) {
  const { options, exclude } = this.config.minify.css as CSSMinifyConfig
  const targets = browserslistToTargets(browserslist(options.targets || '>= 0.5%'))
  if (isExclude(data.path, exclude)) return str
  return transform({
    filename: data.path,
    code: Uint8Array.from(Buffer.from(str)),
    minify: true,
    targets
  }).code.toString()
}
