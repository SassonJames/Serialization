const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the client html file into memory
// __dirname in node is the current directory
// (in this case, it's the location of the server.js file)
const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(index);
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

// object to hold all of our connected users
const users = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    users[data.name] = data;
    const joinMsg = {
      name: convertStringToByteArray('server'),
      msg: convertStringToByteArray(`There are ${Object.keys(users).length} users online including you`),
    };

    socket.name = data.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    // announcement to everyone in the room
    const response = {
      name: convertStringToByteArray('server'),
      msg: convertStringToByteArray(`${data.name} has joined the room.`),
    };
    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} joined`);
    // success message back to ne user
    socket.emit('msg', { name: convertStringToByteArray('server'), msg: convertStringToByteArray('You joined the room')});
  });
};

const onMsg = (sock) => {
  const socket = sock;
  socket.on('msgToServer', (data) => {
    io.sockets.in('room1').emit('msg', { name: convertStringToByteArray(socket.name), msg: convertStringToByteArray(data.msg) });
  });
};

const onAction = (sock) => {
  const socket = sock;
  socket.on('actionToServer', (data) => {
    io.sockets.in('room1').emit('msg', { msg: convertStringToByteArray(data.msg)});
  });
};

const getUsers = (sock) => {
  const socket = sock;
  socket.on('getUsers', () => {
    socket.emit('msg', { name: 'server', msg: convertStringToByteArray(`There are ${Object.keys(users).length} users online including you.`) });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('msg', { name: socket.name, msg: convertStringToByteArray(`${socket.name} has disconnected`)});
    delete users[socket.name];
    socket.leave('room1');
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onAction(socket);
  getUsers(socket);
  onDisconnect(socket);
});

const decodeMessage = (message) => {
    let msgArray = [];
    let stringArray = [];
    let msgString;
    console.log(message);
    const myData = new DataView(message);
    for(var i = 0; i < message.byteLength; i++){
        msgArray.push(myData.getUint8(i));
    }
    for(var j = 0; j < msgArray.length; j++){
        stringArray.push(String.fromCharCode(msgArray[j]));
    }
    msgString = stringArray.join("");
    return msgString;
};

const writeCharToBuffer = (buffer, charCode, offset) =>{
    buffer.writeUInt8(charCode, offset);
    return buffer;
};

const convertStringToByteArray = (string) =>{
    let totalLength = 0;
    let stringBitLength = string.length;
    totalLength += stringBitLength;
    let offset = 0;
    let message = Buffer.alloc(totalLength);
    for(var i = 0; i < string.length; i++){
        message = writeCharToBuffer(message, string.charCodeAt(i), offset);
        offset++;
    }
    return message;
};

console.log('Websocket server started');
