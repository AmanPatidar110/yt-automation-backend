import fs from 'fs'
import download from 'download'

export const fileDownloadWithoutAudio = async (
  url,
  videoId,
  forEmail,
  isOriginal,
  muteAttachedMusic
) => {
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
    // if (isOriginal || muteAttachedMusic === 'false') {
    //   console.log('Downloading video with music')
    //   ffmpeg(
    //       .on('end', () => {
    //         console.log('Downloaded')
    //         resolve()
    //       })
    //       .on('error', err => {
    //         console.log(err)
    //         reject(err)
    //       })
    //   )
    //     .addOutputOption('-movflags', 'frag_keyframe+empty_moov')
    //     .saveToFile()
    // } else {
    //   console.log('Downloading video without music')
    //   ffmpeg(
    //     download(url)
    //       .on('end', () => {
    //         console.log('Downloaded')
    //         resolve()
    //       })
    //       .on('error', err => {
    //         console.log(err)
    //         reject(err)
    //       })
    //   )
    //     .addOutputOption('-movflags', 'frag_keyframe+empty_moov')
    //     .withNoAudio()
    //     .saveToFile(`./Videos/${videoId}_${forEmail}.mp4`)
    // }
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
