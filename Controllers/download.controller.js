import fs from 'fs'
import download from 'download'

export const fileDownloadWithoutAudio = async (url, videoId, forEmail) => {
  const videoWriteStream = fs.createWriteStream(
    `./Videos/${videoId}_${forEmail}.mp4`
  )
  return new Promise((resolve, reject) => {
    console.log('Downloading...')
    download(url)
      .on('progress', progress => {
        console.log('progress: ', progress)
      })
      .on('end', () => {
        console.log('Downloaded')
        resolve()
      })
      .pipe(videoWriteStream)
  })
}

export const removeFile = dest => {
  return new Promise(resolve => {
    fs.unlink(dest, function (err) {
      if (err && err.code === 'ENOENT') {
        // file doens't exist
        console.info("File doesn't exist, won't remove it.")
      } else if (err) {
        // other errors, e.g. maybe we don't have enough permission
        console.error('Error occurred while trying to remove file')
      } else {
        console.info('removed')
        resolve()
      }
    })
  })
}
