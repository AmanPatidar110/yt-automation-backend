const fs = require('fs')
const download = require('download')
const Ffmpeg = require('fluent-ffmpeg')

exports.fileDownloadWithoutAudio = async (url, videoId) => {
  return new Promise((resolve, reject) => {
    console.log('Downloading...')
    Ffmpeg(
      download(url)
        .on('end', () => {
          console.log('Downloaded')
          resolve()
        })
        .on('error', err => {
          console.log(err)
          reject(err)
        })
    )
      .withNoAudio()
      .saveToFile(`./Videos/${videoId}.mp4`)
  })
}

exports.removeFile = dest => {
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
