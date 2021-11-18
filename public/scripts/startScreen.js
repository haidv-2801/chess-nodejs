function handleChangeGameMode(me) {
  let mode = $(me).val();
  if (mode == constant.GAME_MODE.PVF) {
    $('.play-online').html(`<label for="fname">Tên người chơi:</label>
    <input
      type="text"
      id="fname"
      name="firstname"
      placeholder="Tên của bạn.."
      required
    />

    <label for="roomid">Mã phòng:</label>
    <input
      type="text"
      id="roomid"
      name="roomid"
      placeholder="Mã phòng.."
      required
    />`);
  } else {
    $('.play-online').html('');
  }
}
