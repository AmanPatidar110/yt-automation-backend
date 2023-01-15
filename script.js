const express = require('express')
const http = require('http')
const cors = require('cors')

const searchRoutes = require('./Routes/search.routes')
const uploadRoutes = require('./Routes/upload.routes')
const channelRoutes = require('./Routes/channel.routes')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log('listening on port *: ', PORT)
})

app.use('/search', searchRoutes)
app.use('/channel', channelRoutes)
app.use('/upload', uploadRoutes)

app.use((error, req, res, next) => {
  if (!error.statusCode) error.statusCode = 500
  if (!error.message) error.message = 'Server side error'
  const status = error.statusCode
  const message = error.message
  const data = error.data

  res.status(status).json({ message: message, data: data })
})

// let html = await axios.get(`https://api.vevioz.com/api/button/mp3/${vidID}`);

// let $ = cheerio.load(html.data);
// let download_url = $("div").children("a")[2].attribs.href;
