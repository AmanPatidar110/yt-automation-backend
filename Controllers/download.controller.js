const https = require('https')
const fs = require('fs')

exports.fileDownload = (url, dest) => {
  const file = fs.createWriteStream(dest)
  return new Promise((resolve, reject) => {
    let responseSent = false // flag to make sure that response is sent only once.
    https
      .get(url, response => {
        response.pipe(file)
        file.on('finish', () => {
          file.close(() => {
            if (responseSent) return
            responseSent = true
            resolve()
          })
        })
      })
      .on('error', err => {
        if (responseSent) return
        responseSent = true
        reject(err)
      })
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
