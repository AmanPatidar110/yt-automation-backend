const express = require("express");
const http = require("http");
var cors = require("cors");

const searchRoutes = require("./Routes/search.routes");
const uploadRoutes = require("./Routes/upload.routes");
// const cheerio = require('cheerio')

const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log("listening on port *: ", PORT);
});
app.use(express.json());

app.use("/search", searchRoutes);
app.use("/upload", uploadRoutes);

app.use((error, req, res, next) => {
    if (!error.statusCode) error.statusCode = 500;
    if (!error.message) error.message = "Server side error";
    const status = error.statusCode;
    const message = error.message;
    const data = error.data;

    res.status(status).json({ message: message, data: data });
});

// let html = await axios.get(`https://api.vevioz.com/api/button/mp3/${vidID}`);

// let $ = cheerio.load(html.data);
// let download_url = $("div").children("a")[2].attribs.href;
