import Ffmpeg from 'fluent-ffmpeg'
import pathToFfmpeg from 'ffmpeg-static'
// import ffmpegPath from '@ffmpeg-installer/ffmpeg'
// import ffprobePath from '@ffprobe-installer/ffprobe'
Ffmpeg.setFfmpegPath(pathToFfmpeg)
// Ffmpeg.setFfprobePath(ffprobePath.path)

export default Ffmpeg
