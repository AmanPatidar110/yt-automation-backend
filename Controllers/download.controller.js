const fs = require('fs')
const download = require('download')

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const Ffmpeg = require('fluent-ffmpeg')
Ffmpeg.setFfmpegPath(ffmpegPath)

exports.fileDownloadWithoutAudio = async (
  url,
  videoId,
  forEmail,
  isOriginal,
  muteAttachedMusic
) => {
  return new Promise((resolve, reject) => {
    console.log('Downloading...')
    if (isOriginal || muteAttachedMusic === 'false') {
      console.log('Downloading video with music')
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
      ).saveToFile(`./Videos/${videoId}_${forEmail}.mp4`)
    } else {
      console.log('Downloading video without music')
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
        .saveToFile(`./Videos/${videoId}_${forEmail}.mp4`)
    }
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
