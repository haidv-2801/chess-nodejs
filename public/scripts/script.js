var board,
  game = new Chess(),
  turn = 'w',
  _depth = 3,
  socket = io(),
  peers = {};

const { firstname, roomid, gamemode } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

const myPeer = new Peer(undefined, {
  secure: true,
  host: 'https://chess-nodejs.herokuapp.com',
});

const callBack = ({ error }) => {
  if (error) {
    setTimeout(() => {
      // location.href = '/';
    }, 0);
    console.log(error);
  }
};

// socket.emit('join', { firstname, roomid }, callBack);

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');

  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });

  videoGrid.prepend(video);
}

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      setTimeout(() => {
        connectToNewUser(userId, stream);
      }, 200);
    });
  });

myPeer.on('open', (id) => {
  socket.emit('join', { firstname, roomid, userid: id }, callBack);
  // socket.emit('video-id', id);
});

// myPeer.on('open', (id) => {
//   console.log(id);
//   socket.emit('video-id', id);
// });

function alert({ message, type }) {
  let me = $('.alert');

  me.text(message);
  me.addClass(`alert-${type}`);
  me.fadeTo(2000, 500).slideUp(500, function () {
    me.slideUp(500);
    me.removeClass(`alert-${type}`);
  });
}

function waitingScreen(status) {
  if (status) {
    $('.backdrop').remove('.backdrop');
    $('body').prepend(
      `<div class="backdrop"><h1>Đang chờ đối thủ...</h1></div>`
    );
  } else {
    $('.backdrop').remove('.backdrop');
  }
}

socket.on('user-disconnected', (userId) => {
  if (peers[userId]) peers[userId].close();
});

socket.on('init', ({ isWaiting, users }) => {
  waitingScreen(isWaiting);
  $('.badge-black-player').text(users?.w || 'Unknown');
  $('.badge-white-player').text(users?.b || 'Unknown');
});

socket.on('turn', (data) => {
  turn = data;
  console.log(turn);
});

socket.on('message', (message, disconnect) => {
  alert({ message, type: 'primary' });
  if (disconnect) {
    game = new Chess();
    board.position(game.fen());
  }
});

socket.on('movingData', (fen) => {
  game = new Chess(fen);
  board.position(fen);
});

if (gamemode == constant.GAME_MODE.PVE) {
  $('.bi.bi-gear').show();
  $('.badge-white-player').text('Bạn');
  $('.badge-black-player').text('Máy');
}

if (gamemode == constant.GAME_MODE.PVP) {
  $('.badge-white-player').text('Người chơi 1');
  $('.badge-black-player').text('Người chơi 2');
}

if (gamemode == constant.GAME_MODE.PVF) {
  $('#video-grid').css('display', 'grid');
  $('#btn-draw').show();
}

var PLAY_MODE = {
  PVSP: 0,
  PVSE: 1,
};

/*The "AI" part starts here */

var minimaxRoot = function (depth, game, isMaximisingPlayer) {
  var newGameMoves = game.ugly_moves();
  var bestMove = -9999;
  var bestMoveFound;

  for (var i = 0; i < newGameMoves.length; i++) {
    var newGameMove = newGameMoves[i];
    game.ugly_move(newGameMove);
    var value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer);
    game.undo();
    if (value >= bestMove) {
      bestMove = value;
      bestMoveFound = newGameMove;
    }
  }
  return bestMoveFound;
};

var minimax = function (depth, game, alpha, beta, isMaximisingPlayer) {
  positionCount++;
  if (depth === 0) {
    return -evaluateBoard(game.board());
  }

  var newGameMoves = game.ugly_moves();

  if (isMaximisingPlayer) {
    var bestMove = -9999;
    for (var i = 0; i < newGameMoves.length; i++) {
      game.ugly_move(newGameMoves[i]);
      bestMove = Math.max(
        bestMove,
        minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer)
      );
      game.undo();
      alpha = Math.max(alpha, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  } else {
    var bestMove = 9999;
    for (var i = 0; i < newGameMoves.length; i++) {
      game.ugly_move(newGameMoves[i]);
      bestMove = Math.min(
        bestMove,
        minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer)
      );
      game.undo();
      beta = Math.min(beta, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
    }
    return bestMove;
  }
};

var evaluateBoard = function (board) {
  var totalEvaluation = 0;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i, j);
    }
  }
  return totalEvaluation;
};

var reverseArray = function (array) {
  return array.slice().reverse();
};

var pawnEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
  [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
  [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
  [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
  [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
  [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
];

var pawnEvalBlack = reverseArray(pawnEvalWhite);

var knightEval = [
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
  [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
  [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
  [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
  [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
  [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
  [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
  [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
];

var bishopEvalWhite = [
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
  [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
  [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
  [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
  [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
  [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
];

var bishopEvalBlack = reverseArray(bishopEvalWhite);

var rookEvalWhite = [
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
  [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0],
];

var rookEvalBlack = reverseArray(rookEvalWhite);

var evalQueen = [
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
  [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
  [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
  [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
  [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
];

var kingEvalWhite = [
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
  [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
  [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
  [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
  [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0],
];

var kingEvalBlack = reverseArray(kingEvalWhite);

var getPieceValue = function (piece, x, y) {
  if (piece === null) {
    return 0;
  }
  var getAbsoluteValue = function (piece, isWhite, x, y) {
    if (piece.type === 'p') {
      return 10 + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
    } else if (piece.type === 'r') {
      return 50 + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
    } else if (piece.type === 'n') {
      return 30 + knightEval[y][x];
    } else if (piece.type === 'b') {
      return 30 + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
    } else if (piece.type === 'q') {
      return 90 + evalQueen[y][x];
    } else if (piece.type === 'k') {
      return 900 + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
    }
    throw 'Unknown piece type: ' + piece.type;
  };

  var absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);
  return piece.color === 'w' ? absoluteValue : -absoluteValue;
};

/* board visualization and games state handling */

var onDragStart = function (source, piece, position, orientation) {
  if (gamemode == constant.GAME_MODE.PVF && turn !== game.turn()) return false;

  if (
    game.in_checkmate() === true ||
    game.in_draw() === true ||
    (gamemode == constant.GAME_MODE.PVE && piece.search(/^b/) !== -1)
  ) {
    return false;
  }
};

var makeBestMove = function () {
  if (gamemode == constant.GAME_MODE.PVE) {
    var bestMove = getBestMove(game);
    game.ugly_move(bestMove);
  }

  board.position(game.fen());

  if (gamemode == constant.GAME_MODE.PVF) {
    socket.emit('moving', game.fen());
  }

  renderMoveHistory(game.history());
  if (game.game_over()) {
    alert({ message: 'Game over' });
  }
};

var positionCount;
var getBestMove = function (game) {
  if (game.game_over()) {
    alert({ message: 'Game over' });
  }

  positionCount = 0;
  var depth = _depth;

  var d = new Date().getTime();
  var d2 = new Date().getTime();
  var bestMove = minimaxRoot(depth, game, true);
  var moveTime = d2 - d;
  var positionsPerS = (positionCount * 1000) / moveTime;

  $('#position-count').text(positionCount);
  $('#time').text(moveTime / 1000 + 's');
  $('#positions-per-s').text(positionsPerS);
  return bestMove;
};

/**
 * Render ra HTML lịch sử di chuyển
 * @param {*} moves
 */
var renderMoveHistory = function (moves) {
  var historyElement = $('.move-history').empty();
  historyElement.empty();
  for (var i = 0; i < moves.length; i = i + 2) {
    historyElement.append(
      '<span class="move-his-item"> Trắng: ' +
        moves[i] +
        ' ' +
        (moves[i + 1] ? ' - Đen: ' + moves[i + 1] : ' ') +
        '</span><hr>'
    );
  }
  var el = document.getElementById('.move-history');
  if (el) historyElement.scrollTop(historyElement[0].scrollHeight);
};

/**
 * Sự kiện xảy ra sau khi người chơi thả quân cờ xuống
 * @param {*} source from
 * @param {*} target to
 */
var onDrop = function (source, target) {
  //Thực hiện di chuyển from -> to nếu không đi được thì null
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q',
  });

  removeGreySquares();
  if (move === null) {
    return 'snapback';
  }

  renderMoveHistory(game.history());
  window.setTimeout(makeBestMove, 250);
};

/**
 * game.fen() string trạng thái của bàn cờ (xem lại chessboardjs)
 */
var onSnapEnd = function () {
  board.position(game.fen());
};

/**
 * Xử lý khi hover vào ô bàn cờ
 * Thì highlight những nước có thể đi  tiếp theo
 * @param {*} square
 * @param {*} piece
 */
var onMouseoverSquare = function (square, piece) {
  if (gamemode == constant.GAME_MODE.PVF && turn !== game.turn()) return;

  //Danh sách các nước có thể đi tiếp theo VD: ['e4', 'e5']
  var moves = game.moves({
    square: square,
    verbose: true,
  });

  if (moves.length === 0) return;

  greySquare(square);

  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
};

/**
 * Sự kiện khi chuột rời khỏi ô bàn cờ thí xóa các highlight color
 * @param {*} square
 * @param {*} piece
 */
var onMouseoutSquare = function (square, piece) {
  removeGreySquares();
};

/**
 * Xóa các highlight color
 */
var removeGreySquares = function () {
  $('#board .square-55d63').css('background', '');
};

/**
 * Highlight các đường đi gợi ý
 * @param {string} square địa chỉ ô cần highlight VD: e4
 */
var greySquare = function (square) {
  var squareEl = $('#board .square-' + square);

  var background = '#a9a9a9';
  if (squareEl.hasClass('black-3c85d') === true) {
    background = '#696969';
  }

  squareEl.css('background', background);
};

var dropdownSelect = (root, child) => {
  let me = $(root);
  me.find('.dropdown-item').removeClass('selected');
  $(child).addClass('selected');
};

dropdownSelect('.m-dropdown', '[selected]');

$('.m-dropdown .dropdown-item').on('click', function () {
  let me = $(this),
    value = me.attr('value');
  _depth = value;
  dropdownSelect('.m-dropdown', me);
  $('.m-dropdown').hide();
});

$('.bi.bi-gear').hover(
  function () {
    $('.m-dropdown').show();
  },
  function () {
    $('.m-dropdown').mouseleave(function () {
      $('.m-dropdown').hide();
    });
  }
);

$('#btn-draw').on('click', function () {
  socket.emit('opponentDraw', { type: turn, name: firstname });
});

socket.on('opponentDrawReq', ({ type, name }) => {
  if (type == 'w') {
    makeDraw('.b-draw-area', { name });
  } else {
    makeDraw('.w-draw-area', { name });
  }
});

const makeDraw = (root, { name = '', show = true }) => {
  let me = $(root),
    _html = ` <div class="player-turn position-relative">
  <span class="badge bg-dark p-2 position-absolute bg-draw">
    Người chơi ${name} muốn xin hòa
    <button data-yes="true"  class="m-button ml-2">Có</button>
    <button data-yes="false"  class="m-button ml-2">Hủy</button>
  </span>
</div>`;

  me.html('');
  if (show) {
    me.html(_html);
  }
};

$(document).on('click', '.bg-draw button', function () {
  let me = $(this),
    type = me.data('yes');

  if (type == true) {
    socket.emit('messageReceived', { message: 'HÒA', type: 'all' });
  } else {
    socket.emit('messageReceived', {
      message: 'Đối  thủ không đồng ý hòa',
      type: 'notall',
    });
  }
  makeDraw('.b-draw-area', { show: false });
  makeDraw('.w-draw-area', { show: false });
});

var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);

var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
};
board = ChessBoard('board', cfg);
