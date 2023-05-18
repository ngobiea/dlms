require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
let cookieParser = require("cookie-parser");
const port = 8080;
const tutorRoutes = require("./routes/tutorRoutes");
const studentRoutes = require("./routes/studentRoutes");
const shareRoutes = require("./routes/shareRoutes");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});

app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use("/tutor", tutorRoutes);
app.use("/student", studentRoutes);
app.use(shareRoutes);


app.use((error, req, res, next) => {
  console.log(error.stack);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  const type = error.type;
  res.status(status).json({ message, data, type });
});
io.on("connection", (socket) => {
  console.log("a user connected");
 });

mongoose
  .connect("mongodb://127.0.0.1:27017/dlsms")
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`App is listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
