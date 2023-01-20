import express from 'express'
import http from 'http'
import cors from 'cors'

import uploadRoutes from './Routes/upload.routes.js'

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log('listening on port *: ', PORT)
})
app.use(express.json())

app.use('/upload', uploadRoutes)

app.use((error, req, res, next) => {
  if (!error.statusCode) error.statusCode = 500
  if (!error.message) error.message = 'Server side error'
  const status = error.statusCode
  const message = error.message
  const data = error.data

  res.status(status).json({ message: message, data: data })
})
