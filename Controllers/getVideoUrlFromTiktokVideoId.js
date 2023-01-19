const getVideoUrlFromTiktokVideoId = async (page, videoId, user) => {
  try {
    await page.goto('https://tiktokdownload.online/', {
      waitUntil: 'networkidle2'
    })
    const input = '#main_page_text'
    await page.waitForSelector(input)
    await page.type(input, `https://www.tiktok.com/@${user}/video/${videoId}`, {
      delay: 60
    })
    await page.waitForTimeout(2000)

    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)
    await page.waitForXPath('//*[@id="mainpicture"]/div/div/a[1]')
    await page.waitForTimeout(1000)
    const href = await page.$eval(
      '#mainpicture > div > div > a.pure-button:nth-child(1)',
      elm => elm.href
    )

    return href
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getVideoUrlFromTiktokVideoId
}
