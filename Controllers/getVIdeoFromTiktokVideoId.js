const { executablePath } = require('puppeteer')

// puppeteer imports ======================
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// sample video id = https://www.instagram.com/reels/videos/CmNwJ45v4zw/

const getVideoFromTiktokVideoId = async (videoId, user) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: executablePath()
    })
    const page = await browser.newPage()
    await page.goto('https://tiktokdownload.online/', {
      waitUntil: 'networkidle2'
    })
    const input = '#main_page_text'
    await page.waitForSelector(input)
    await page.type(input, `https://www.tiktok.com/@${user}/video/${videoId}`)
    await page.click('#submit')
    await page.waitForTimeout(3000)
    await page.waitForSelector('a.pure-button:nth-child(1)')
    const href = await page.$eval('a.pure-button:nth-child(1)', elm => elm.href)

    browser.close()
    return href
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getVideoFromTiktokVideoId
}
