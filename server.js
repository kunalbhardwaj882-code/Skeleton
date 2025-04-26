const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend if needed
app.use(express.static(path.join(__dirname, "public")));

const waitingMales = [];
const waitingFemales = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("login", (user) => {
    socket.gender = user.gender;
    if (socket.gender === "male") {
      if (waitingFemales.length > 0) {
        const female = waitingFemales.pop();
        connectUsers(socket, female);
      } else {
        waitingMales.push(socket);
      }
    } else {
      if (waitingMales.length > 0) {
        const male = waitingMales.pop();
        connectUsers(male, socket);
      } else {
        waitingFemales.push(socket);
      }
    }
  });

  socket.on("offer", (offer, to) => io.to(to).emit("offer", offer, socket.id));
  socket.on("answer", (answer, to) => io.to(to).emit("answer", answer));
  socket.on("ice-candidate", (candidate, to) => io.to(to).emit("ice-candidate", candidate));

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    if (socket.partner) {
      socket.partner.emit("disconnected");
      socket.partner.partner = null;
    }
    [waitingMales, waitingFemales].forEach((list) => {
      const index = list.indexOf(socket);
      if (index !== -1) list.splice(index, 1);
    });
  });

  function connectUsers(s1, s2) {
    s1.partner = s2;
    s2.partner = s1;
    s1.emit("matched", s2.id);
    s2.emit("matched", s1.id);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
