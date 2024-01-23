import micromatch from 'micromatch'

export function isExclude (path:string, excludes?:string[]):undefined | boolean {
  return excludes && excludes.some(item => micromatch.isMatch(path, item, { nocase: true }))
}
