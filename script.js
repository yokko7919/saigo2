const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');//悩む
  //const roomId = '趣味' ;
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const sdkSrc = document.querySelector('script[src*=skyway]');

//サーバにどう繋げるかの選択肢のやつ　表示上消しただけ
  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');
  //roomMode.textContent = getRoomModeByHash(); 消しただけ
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

// ローカルのストリームをレンダリングする
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // Skywayのキー
  const peer = (window.peer = new Peer({
    key: '64c8c685-e350-4359-a965-e908822b42e5',
    debug: 3,
  }));


  // Joinボタン　
  joinTrigger.addEventListener('click', () => {
    // ピアがシグナリングサーバーに接続していることを確認する必要があることに注意してください
    // ピアインスタンスのメソッドを使用する前。
    if (!peer.open) {
      return;
    }

    const room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),//サーバにどう繋げるか
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== あなたが参加しました ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} さんが参加しました ===\n`;
    });

    // ルームで新しいピア参加のためにリモートストリームをレンダリングします
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // peerIdをマークして、後でpeerLeaveイベントで見つけます
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
    });

//チャット))))))))))))
    room.on('data', ({ data, src }) => {
      // 部屋に送信されたメッセージと送信者を表示します
      messages.textContent += `${src}: ${data}\n`;
    });

    // 部屋のメンバーを閉じるため
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // 自分を閉じるため
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // WebSocketを介して部屋のすべてのピアにメッセージを送信します
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', console.error);
})();