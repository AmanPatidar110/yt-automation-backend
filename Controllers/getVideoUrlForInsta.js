// puppeteer imports ======================
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())

// sample video id = https://www.instagram.com/reels/videos/CmNwJ45v4zw/

export const getVideoUrlForInsta = async videoId => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: puppeteer.executablePath()
    })
    const page = await browser.newPage()
    await page.goto('https://saveinsta.app/en/instagram-reels-video-download', {
      waitUntil: 'networkidle2'
    })
    const input = '#s_input'
    await page.waitForSelector(input)
    await page.type(input, `https://www.instagram.com/reels/videos/${videoId}/`)
    await page.click('button.btn:nth-child(2)')
    await page.waitForXPath('//*[@id="closeModalBtn"]')
    await page.waitForTimeout(3000)
    // await page.click('//*[@id="closeModalBtn"]');
    await page.waitForXPath(
      '/html/body/div[1]/div[1]/div/div/div[3]/ul/li[1]/div/div[2]/a'
    )

    const handle = await page.$('.abutton')
    const videoURL = await page.evaluate(
      anchor => anchor.getAttribute('href'),
      handle
    )
    console.log(videoURL)
    browser.close()
    return videoURL
  } catch (error) {
    console.log(error)
  }
}
