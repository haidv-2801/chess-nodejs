const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require('./public/scripts/user');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 8000;
const publicDirectoryPath = path.join(__dirname, './public');

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
  socket.on('join', ({ firstname, roomid, userid }, callback) => {
    //create room
    socket.join(roomid);

    const { user, error } = addUser({
      id: socket.id,
      username: firstname,
      room: roomid,
    });

    if (error) {
      return callback({ error });
    }

    // socket.to(roomid).broadcast.emit('user-connected', userid);

    // socket.to(roomid).on('video-id', (id) => {
    //   console.log('test');
    //   videoId = id;
    // });

    const users = getUsersInRoom(roomid);

    io.in(roomid).emit('init', {
      isWaiting: users.length < 2,
      users: {
        w: users[0]?.username ?? 'Người chơi',
        b: users[1]?.username ?? 'Người chơi',
      },
    });

    socket.broadcast.to(roomid).emit('turn', 'b');

    socket.broadcast
      .to(roomid)
      .emit('message', `${firstname} đã tham gia phòng.`, 'reconnect');

    socket.to(roomid).on('messageReceived', ({ type, message }) => {
      if (type == 'all') io.in(roomid).emit('message', message, 'reconnect');
      else {
        socket.broadcast.to(roomid).emit('message', message);
      }
    });

    socket.to(roomid).on('opponentDraw', (data) => {
      socket.broadcast.emit('opponentDrawReq', data);
    });

    socket.to(roomid).on('disconnect', () => {
      io.in(roomid).emit('message', `${firstname} đã rời phòng.`, 'disconnect');
      removeUser(socket.id);
      io.in(roomid).emit('init', {
        isWaiting: getUsersInRoom(roomid).length < 2,
      });

      // socket.to(roomid).broadcast.emit('user-disconnected', userid);
    });

    socket.to(roomid).on('moving', (board) => {
      socket.broadcast.emit('movingData', board);
    });
  });
});

server.listen(port, () => {
  console.log(`Server is supported on port ${port}!`);
});
