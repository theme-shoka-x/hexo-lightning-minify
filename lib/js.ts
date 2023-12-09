// @ts-ignore
import terser from 'terser'
import type Hexo from "hexo";
// @ts-ignore
import type {ECMA} from "terser";
import {isExclude} from "./utils";


interface JavascriptMinifyConfig {
  enable: boolean
  options: {
    comments?: boolean
    ecma?: ECMA
    toplevel?: boolean
  }
  exclude?: string[]
}
export function minify_js(this: Hexo, str:string,data:any){
  const {options,exclude} = this.config.minify.js as JavascriptMinifyConfig
  if (isExclude(data.path,exclude)) return str
  return terser.minify(str,{
    format: {
      comments: options.comments
    },
    ecma: options.ecma,
    toplevel: options.toplevel
  }).then((res)=>{
    return res.code
  }).catch((err)=>{
    throw err
  })
}