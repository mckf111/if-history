import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const canonical = 'https://mckf111.github.io/if-history/'
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const rights = readFileSync(new URL('../public/rights.txt', import.meta.url), 'utf8')
const business = readFileSync(new URL('../BUSINESS.md', import.meta.url), 'utf8')
const trademarks = readFileSync(new URL('../TRADEMARKS.md', import.meta.url), 'utf8')
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const cover = readFileSync(new URL('../public/og-cover.png', import.meta.url))

assert.match(index, /<html lang="zh-CN">/)
assert.match(index, /<title>城破前夜：刻下无名｜免费中文历史推演游戏<\/title>/)
assert.match(index, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
assert.match(index, /<meta[\s\S]*?name="description"[\s\S]*?content="《城破前夜：刻下无名》/)
assert.match(index, /<h1>城破前夜：刻下无名<\/h1>/)
assert.match(index, /href="mailto:mckf11111@gmail\.com"/)

const jsonLdMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
assert.ok(jsonLdMatch, '缺少 JSON-LD 结构化数据')
const jsonLd = JSON.parse(jsonLdMatch[1])
assert.deepEqual(jsonLd['@type'], ['VideoGame', 'WebApplication'])
assert.equal(jsonLd.url, canonical)
assert.equal(jsonLd.offers.price, '0')
assert.equal(jsonLd.aggregateRating, undefined, '没有真实评分时不得伪造 aggregateRating')

assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//)
assert.match(robots, /User-agent: GPTBot\s+Disallow: \//)
assert.match(robots, new RegExp(`Sitemap: ${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}sitemap\\.xml`))
assert.match(sitemap, new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/loc>`))
assert.match(rights, /Copyright © 2026 mckf111（文虎）/)
assert.match(rights, /商务合作与商业授权：mckf11111@gmail\.com/)
assert.match(business, /mailto:mckf11111@gmail\.com/)
assert.match(trademarks, /不随本仓库的 AGPL-3\.0-only 或 CC BY-NC-SA 4\.0 许可授出/)
assert.equal(packageJson.license, 'AGPL-3.0-only')
assert.equal(packageJson.contentLicense, 'CC-BY-NC-SA-4.0')

assert.equal(cover.subarray(1, 4).toString(), 'PNG')
assert.equal(cover.readUInt32BE(16), 1200)
assert.equal(cover.readUInt32BE(20), 630)

console.log('公开发布面检查通过：元数据、静态正文、抓取边界、站点地图、商务入口、代码/内容/商标边界与 1200×630 分享图一致。')
