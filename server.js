const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const waitingMales = [];
const waitingFemales = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", (user) => {
    socket.gender = user.gender;

    if (socket.gender === "male") {
      // Try to find a waiting female
      if (waitingFemales.length > 0) {
        const femaleSocket = waitingFemales.pop();
        connectPair(socket, femaleSocket);
      } else {
        waitingMales.push(socket);
      }
    } else if (socket.gender === "female") {
      // Try to find a waiting male
      if (waitingMales.length > 0) {
        const maleSocket = waitingMales.pop();
        connectPair(maleSocket, socket);
      } else {
        waitingFemales.push(socket);
      }
    }
  });

  socket.on("offer", (offer, to) => {
    io.to(to).emit("offer", offer, socket.id);
  });

  socket.on("answer", (answer, to) => {
    io.to(to).emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate, to) => {
    io.to(to).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("disconnected");
      socket.partner.partner = null;
    }

    // Clean up from waiting lists
    [waitingMales, waitingFemales].forEach(list => {
      const index = list.indexOf(socket);
      if (index !== -1) list.splice(index, 1);
    });

    console.log("User disconnected:", socket.id);
  });

  function connectPair(male, female) {
    male.partner = female;
    female.partner = male;

    male.emit("matched", female.id);
    female.emit("matched", male.id);
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
