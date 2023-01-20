import fs from 'fs'
import download from 'download'

import Ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
Ffmpeg.setFfmpegPath(ffmpegPath.path)
Ffmpeg.setFfprobePath(ffprobePath.path)

export const fileDownloadWithoutAudio = async (
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
      )
        .addOutputOption('-movflags', 'frag_keyframe+empty_moov')
        .saveToFile(`./Videos/${videoId}_${forEmail}.mp4`)
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
        .addOutputOption('-movflags', 'frag_keyframe+empty_moov')
        .withNoAudio()
        .saveToFile(`./Videos/${videoId}_${forEmail}.mp4`)
    }
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
