function initCalls(deps) {
  const { apiFetch, getCurrentUser, getActiveFriend, showChatStatus } = deps;

  const callScreen = document.getElementById('callScreen');
  const incomingCallModal = document.getElementById('incomingCallModal');
  const callFriendBtn = document.getElementById('callFriendBtn');
  const callStatusText = document.getElementById('callStatusText');
  const callLocalVideo = document.getElementById('callLocalVideo');
  const callRemoteVideo = document.getElementById('callRemoteVideo');
  const callRemoteAudio = document.getElementById('callRemoteAudio');
  const callLocalAvatar = document.getElementById('callLocalAvatar');
  const callRemoteAvatar = document.getElementById('callRemoteAvatar');
  const callRemoteName = document.getElementById('callRemoteName');
  const incomingCallerName = document.getElementById('incomingCallerName');
  const incomingCallerAvatar = document.getElementById('incomingCallerAvatar');
  const acceptCallBtn = document.getElementById('acceptCallBtn');
  const declineCallBtn = document.getElementById('declineCallBtn');
  const endCallBtn = document.getElementById('endCallBtn');
  const toggleMicBtn = document.getElementById('toggleMicBtn');
  const toggleCameraBtn = document.getElementById('toggleCameraBtn');
  const ringtonePlayer = document.getElementById('ringtonePlayer');

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
  const IDLE_POLL_MS = 1200;
  const RING_POLL_MS = 800;
  const ACTIVE_POLL_MS = 500;
  const LOGGED_OUT_POLL_MS = 2000;

  let activeCall = null;
  let peerConnection = null;
  let localStream = null;
  let remoteStream = null;
  let pollTimer = null;
  let pollInFlight = false;
  let isCaller = false;
  let micEnabled = true;
  let cameraEnabled = false;
  let handledIncomingId = '';
  let isConnecting = false;
  let isConnected = false;
  let isCleaningUp = false;
  let hasLocalOffer = false;
  let hasRemoteAnswer = false;
  const processedSignalIds = new Set();
  let lastProcessedSignalId = '';
  const pendingIceCandidates = [];
  let ringtoneCtx = null;
  let ringtoneTimer = null;
  let audioUnlocked = false;

  function usersMatch(a, b) {
    return Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());
  }

  function initials(name) {
    return String(name || '--').slice(0, 2).toUpperCase();
  }

  function setCallButtonState(state) {
    if (!callFriendBtn) return;
    callFriendBtn.classList.remove('calling', 'sending');
    callFriendBtn.disabled = false;
    if (state === 'calling') {
      callFriendBtn.hidden = false;
      callFriendBtn.classList.add('calling', 'sending');
      callFriendBtn.disabled = true;
      callFriendBtn.textContent = 'Calling...';
      return;
    }
    if (state === 'connected') {
      callFriendBtn.hidden = false;
      callFriendBtn.classList.add('calling');
      callFriendBtn.disabled = true;
      callFriendBtn.textContent = 'On call';
      return;
    }
    callFriendBtn.textContent = '📞 Call';
    callFriendBtn.hidden = !Boolean(getCurrentUser() && getActiveFriend());
  }

  function updateCallButton() {
    if (activeCall?.status === 'active' || isConnected) {
      setCallButtonState('connected');
      return;
    }
    if (activeCall?.status === 'ringing' && isCaller) {
      setCallButtonState('calling');
      return;
    }
    setCallButtonState('idle');
  }

  function unlockAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext && !ringtoneCtx) {
      ringtoneCtx = new AudioContext();
    }
    if (ringtoneCtx?.state === 'suspended') {
      ringtoneCtx.resume().catch(() => {});
    }
    if (ringtonePlayer && !audioUnlocked) {
      const previousVolume = ringtonePlayer.volume;
      ringtonePlayer.volume = 0.001;
      ringtonePlayer.play()
        .then(() => {
          ringtonePlayer.pause();
          ringtonePlayer.currentTime = 0;
          ringtonePlayer.volume = previousVolume || 1;
          audioUnlocked = true;
        })
        .catch(() => {
          ringtonePlayer.volume = previousVolume || 1;
        });
    }
  }

  function playRingBurst() {
    if (!ringtoneCtx) return;
    const now = ringtoneCtx.currentTime;
    [523.25, 659.25].forEach((freq, index) => {
      const osc = ringtoneCtx.createOscillator();
      const gain = ringtoneCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ringtoneCtx.destination);
      const start = now + index * 0.42;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  function startWebAudioRingtone() {
    unlockAudio();
    if (!ringtoneCtx) return;
    playRingBurst();
    ringtoneTimer = setInterval(playRingBurst, 2200);
  }

  function startRingtone() {
    stopRingtone();
    unlockAudio();
    if (navigator.vibrate) {
      navigator.vibrate([500, 180, 500, 180, 500]);
    }
    if (ringtonePlayer) {
      ringtonePlayer.currentTime = 0;
      ringtonePlayer.volume = 1;
      ringtonePlayer.play().catch(() => startWebAudioRingtone());
      return;
    }
    startWebAudioRingtone();
  }

  function stopRingtone() {
    if (ringtoneTimer) {
      clearInterval(ringtoneTimer);
      ringtoneTimer = null;
    }
    if (ringtonePlayer) {
      ringtonePlayer.pause();
      ringtonePlayer.currentTime = 0;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  function micErrorMessage(error) {
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return 'Microphone blocked. Allow mic access in your browser settings, then try again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No microphone found on this device.';
    }
    return 'Could not access microphone. Check your device settings.';
  }

  function showCallScreen() {
    if (callScreen) callScreen.hidden = false;
  }

  function hideCallScreen() {
    if (callScreen) callScreen.hidden = true;
  }

  function showIncomingModal(call) {
    if (!incomingCallModal) return;
    if (incomingCallerName) incomingCallerName.textContent = call.caller;
    if (incomingCallerAvatar) incomingCallerAvatar.textContent = initials(call.caller);
    incomingCallModal.hidden = false;
    startRingtone();
  }

  function hideIncomingModal() {
    if (incomingCallModal) incomingCallModal.hidden = true;
    stopRingtone();
  }

  function setCallStatus(text) {
    if (callStatusText) callStatusText.textContent = text;
  }

  function updateParticipantUi() {
    const user = getCurrentUser();
    const remoteName = activeCall
      ? isCaller
        ? activeCall.callee
        : activeCall.caller
      : getActiveFriend()?.name || 'Friend';
    if (callRemoteName) callRemoteName.textContent = remoteName;
    if (callLocalAvatar && user) callLocalAvatar.textContent = initials(user.username);
    if (callRemoteAvatar) callRemoteAvatar.textContent = initials(remoteName);
  }

  function updateMediaUi() {
    if (toggleMicBtn) {
      toggleMicBtn.classList.toggle('off', !micEnabled);
      toggleMicBtn.setAttribute('aria-label', micEnabled ? 'Mute microphone' : 'Unmute microphone');
    }
    if (toggleCameraBtn) {
      toggleCameraBtn.classList.toggle('off', !cameraEnabled);
      toggleCameraBtn.setAttribute('aria-label', cameraEnabled ? 'Turn camera off' : 'Turn camera on');
    }
    if (callLocalVideo) {
      callLocalVideo.hidden = !cameraEnabled;
      if (callLocalAvatar) callLocalAvatar.hidden = cameraEnabled;
    }
    const hasRemoteVideo = remoteStream?.getVideoTracks().some((track) => track.enabled);
    if (callRemoteVideo && callRemoteAvatar) {
      callRemoteVideo.hidden = !hasRemoteVideo;
      callRemoteAvatar.hidden = hasRemoteVideo;
    }
  }

  function attachRemoteStream(stream) {
    remoteStream = stream;
    if (callRemoteAudio) {
      callRemoteAudio.srcObject = stream;
      callRemoteAudio.play().catch(() => {});
    }
    if (callRemoteVideo) {
      callRemoteVideo.srcObject = stream;
      callRemoteVideo.play().catch(() => {});
    }
    updateMediaUi();
  }

  async function getLocalStream(enableVideo = false) {
    if (localStream) return localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: enableVideo,
      });
    } catch (error) {
      throw new Error(micErrorMessage(error));
    }
    if (callLocalVideo) callLocalVideo.srcObject = localStream;
    return localStream;
  }

  async function cancelCallOnServer(callId) {
    if (!callId) return;
    try {
      await apiFetch(`/calls/${callId}/end`, { method: 'POST' });
    } catch {
      try {
        await apiFetch(`/calls/${callId}/decline`, { method: 'POST' });
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  function stopLocalStream() {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
    remoteStream = null;
    if (callLocalVideo) callLocalVideo.srcObject = null;
    if (callRemoteVideo) callRemoteVideo.srcObject = null;
    if (callRemoteAudio) callRemoteAudio.srcObject = null;
  }

  function closePeerConnection() {
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnection = null;
    }
  }

  async function sendSignal(type, data) {
    if (!activeCall) return;
    await apiFetch(`/calls/${activeCall.id}/signals`, {
      method: 'POST',
      body: { type, data },
    });
  }

  async function flushIceQueue() {
    if (!peerConnection?.remoteDescription) return;
    while (pendingIceCandidates.length) {
      const candidate = pendingIceCandidates.shift();
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore late or duplicate ICE candidates.
      }
    }
  }

  async function handleIceCandidate(data) {
    if (!peerConnection || !data) return;
    if (!peerConnection.remoteDescription) {
      pendingIceCandidates.push(data);
      return;
    }
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data));
    } catch {
      // Ignore duplicate or late ICE candidates.
    }
  }

  async function createPeerConnection() {
    if (peerConnection) return peerConnection;
    peerConnection = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      attachRemoteStream(stream);
      if (!isConnected) {
        isConnected = true;
        setCallStatus('Connected');
        updateCallButton();
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice', event.candidate.toJSON ? event.candidate.toJSON() : event.candidate).catch(
          () => {}
        );
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection?.connectionState;
      if (state === 'connected') {
        isConnected = true;
        setCallStatus('Connected');
        updateCallButton();
      } else if (state === 'failed' || state === 'disconnected') {
        setCallStatus('Connection lost...');
        if (state === 'failed') {
          setTimeout(() => endActiveCall(), 1200);
        }
      }
    };

    const stream = await getLocalStream(cameraEnabled);
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
    return peerConnection;
  }

  async function startCallerNegotiation() {
    if (!peerConnection || hasLocalOffer) return;
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: cameraEnabled,
    });
    await peerConnection.setLocalDescription(offer);
    hasLocalOffer = true;
    await sendSignal('offer', offer);
  }

  async function handleOffer(data) {
    if (!peerConnection || isCaller || !data) return;
    if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
      return;
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    await flushIceQueue();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await sendSignal('answer', answer);
  }

  async function handleAnswer(data) {
    if (!peerConnection || !isCaller || !data || hasRemoteAnswer) return;
    if (peerConnection.signalingState !== 'have-local-offer') return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    hasRemoteAnswer = true;
    await flushIceQueue();
  }

  async function processSignals(signals) {
    if (!peerConnection || !signals.length) return;

    const ordered = [...signals].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const signal of ordered) {
      if (!signal?.id || processedSignalIds.has(signal.id)) continue;
      processedSignalIds.add(signal.id);

      if (signal.type === 'offer') {
        await handleOffer(signal.data);
      } else if (signal.type === 'answer') {
        await handleAnswer(signal.data);
      } else if (signal.type === 'ice') {
        await handleIceCandidate(signal.data);
      }
      lastProcessedSignalId = signal.id;
    }
  }

  function getSyncQuery() {
    const params = new URLSearchParams();
    if (activeCall?.id) params.set('callId', activeCall.id);
    if (lastProcessedSignalId) params.set('afterId', lastProcessedSignalId);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function ensureActiveConnection() {
    if (!activeCall || activeCall.status !== 'active' || isConnecting || peerConnection) return;
    isConnecting = true;
    try {
      hideIncomingModal();
      showCallScreen();
      setCallStatus('Connecting...');
      updateParticipantUi();
      await createPeerConnection();
      if (isCaller) {
        await startCallerNegotiation();
      }
    } finally {
      isConnecting = false;
    }
  }

  function schedulePoll(delay) {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(runPollLoop, delay);
  }

  function getNextPollDelay(user, call) {
    if (!user) return LOGGED_OUT_POLL_MS;
    if (!call) return IDLE_POLL_MS;
    if (call.status === 'active') return ACTIVE_POLL_MS;
    return RING_POLL_MS;
  }

  async function runPollLoop() {
    if (pollInFlight) {
      schedulePoll(120);
      return;
    }
    pollInFlight = true;

    const user = getCurrentUser();
    let nextDelay = getNextPollDelay(user, activeCall);

    try {
      if (!user) {
        return;
      }

      const data = await apiFetch(`/calls/sync${getSyncQuery()}`);
      const calls = data.calls || [];

      if (!activeCall) {
        const incoming = calls.find(
          (call) =>
            call.status === 'ringing' &&
            usersMatch(call.callee, user.username) &&
            call.id !== handledIncomingId
        );
        if (incoming) {
          activeCall = incoming;
          isCaller = false;
          showIncomingModal(incoming);
        }
        return;
      }

      const current = calls.find((call) => call.id === activeCall.id);
      if (!current) {
        if (!isCleaningUp) {
          setCallStatus(isCaller && activeCall.status === 'ringing' ? 'No answer.' : 'Call ended.');
          setTimeout(() => cleanupCall(), 1000);
        }
        return;
      }

      activeCall = current;
      nextDelay = getNextPollDelay(user, current);

      if (current.status === 'declined' && isCaller) {
        setCallStatus('Call declined.');
        setTimeout(() => cleanupCall(), 1000);
        return;
      }

      if (current.status === 'ended') {
        setCallStatus('Call ended.');
        setTimeout(() => cleanupCall(), 800);
        return;
      }

      if (current.status === 'active') {
        await ensureActiveConnection();
      }

      if (peerConnection && data.signals?.length) {
        await processSignals(data.signals);
      }
    } catch {
      // Ignore call polling errors.
    } finally {
      pollInFlight = false;
      if (!isCleaningUp) schedulePoll(nextDelay);
    }
  }

  function startCallPolling() {
    stopCallPolling();
    schedulePoll(0);
  }

  function stopCallPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function cleanupCall() {
    if (isCleaningUp) return;
    isCleaningUp = true;
    stopRingtone();
    closePeerConnection();
    stopLocalStream();
    hideCallScreen();
    hideIncomingModal();
    activeCall = null;
    isCaller = false;
    micEnabled = true;
    cameraEnabled = false;
    isConnecting = false;
    isConnected = false;
    hasLocalOffer = false;
    hasRemoteAnswer = false;
    processedSignalIds.clear();
    lastProcessedSignalId = '';
    pendingIceCandidates.length = 0;
    updateMediaUi();
    setCallStatus('');
    updateCallButton();
    isCleaningUp = false;
    schedulePoll(getCurrentUser() ? IDLE_POLL_MS : LOGGED_OUT_POLL_MS);
  }

  async function startOutgoingCall() {
    const friend = getActiveFriend();
    const user = getCurrentUser();
    if (!friend || !user) {
      showChatStatus('Select a friend to call.', true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      showChatStatus('Calls are not supported on this device.', true);
      return;
    }
    if (activeCall) {
      showChatStatus('You are already in a call.', true);
      return;
    }
    if (callFriendBtn?.classList.contains('sending')) return;

    unlockAudio();
    setCallButtonState('calling');

    try {
      await getLocalStream(false);
    } catch (error) {
      setCallButtonState('idle');
      showChatStatus(error.message, true);
      return;
    }

    let createdCallId = null;
    try {
      const data = await apiFetch('/calls', { method: 'POST', body: { to: friend.name } });
      activeCall = data.call;
      createdCallId = data.call.id;
      isCaller = true;
      processedSignalIds.clear();
      lastProcessedSignalId = '';
      pendingIceCandidates.length = 0;
      updateParticipantUi();
      setCallStatus(`Calling ${friend.name}...`);
      showCallScreen();
      hideIncomingModal();
      updateMediaUi();
      startCallPolling();
    } catch (error) {
      stopLocalStream();
      if (createdCallId) await cancelCallOnServer(createdCallId);
      cleanupCall();
      showChatStatus(error.message, true);
    }
  }

  async function acceptIncomingCall() {
    if (!activeCall) return;
    const callId = activeCall.id;
    unlockAudio();
    stopRingtone();

    try {
      await getLocalStream(false);
    } catch (error) {
      showChatStatus(error.message, true);
      handledIncomingId = callId;
      await cancelCallOnServer(callId);
      cleanupCall();
      return;
    }

    try {
      handledIncomingId = callId;
      const data = await apiFetch(`/calls/${callId}/accept`, { method: 'POST' });
      activeCall = data.call;
      isCaller = false;
      processedSignalIds.clear();
      lastProcessedSignalId = '';
      pendingIceCandidates.length = 0;
      hideIncomingModal();
      showCallScreen();
      setCallStatus('Connecting...');
      updateParticipantUi();
      updateMediaUi();
      await ensureActiveConnection();
      startCallPolling();
    } catch (error) {
      showChatStatus(error.message, true);
      await cancelCallOnServer(callId);
      cleanupCall();
    }
  }

  async function declineIncomingCall() {
    if (!activeCall) return;
    try {
      handledIncomingId = activeCall.id;
      await apiFetch(`/calls/${activeCall.id}/decline`, { method: 'POST' });
    } catch {
      // Ignore decline errors.
    }
    cleanupCall();
  }

  async function endActiveCall() {
    const callId = activeCall?.id;
    cleanupCall();
    if (callId) {
      try {
        await apiFetch(`/calls/${callId}/end`, { method: 'POST' });
      } catch {
        // Ignore end errors.
      }
    }
  }

  function toggleMic() {
    if (!localStream) return;
    micEnabled = !micEnabled;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
    updateMediaUi();
  }

  async function toggleCamera() {
    if (!localStream || !peerConnection) return;
    cameraEnabled = !cameraEnabled;

    if (!cameraEnabled) {
      localStream.getVideoTracks().forEach((track) => {
        track.stop();
        localStream.removeTrack(track);
      });
      const sender = peerConnection.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) await sender.replaceTrack(null);
      updateMediaUi();
      return;
    }

    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const videoTrack = videoStream.getVideoTracks()[0];
    localStream.addTrack(videoTrack);
    const sender = peerConnection.getSenders().find((item) => item.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(videoTrack);
    } else {
      peerConnection.addTrack(videoTrack, localStream);
    }
    if (callLocalVideo) callLocalVideo.srcObject = localStream;
    updateMediaUi();
  }

  ['click', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, unlockAudio, { passive: true });
  });

  if (callFriendBtn) callFriendBtn.addEventListener('click', startOutgoingCall);
  if (acceptCallBtn) acceptCallBtn.addEventListener('click', acceptIncomingCall);
  if (declineCallBtn) declineCallBtn.addEventListener('click', declineIncomingCall);
  if (endCallBtn) endCallBtn.addEventListener('click', endActiveCall);
  if (toggleMicBtn) toggleMicBtn.addEventListener('click', toggleMic);
  if (toggleCameraBtn) toggleCameraBtn.addEventListener('click', toggleCamera);
  if (incomingCallModal) {
    incomingCallModal.addEventListener('click', (event) => {
      if (event.target === incomingCallModal) declineIncomingCall();
    });
  }

  startCallPolling();

  return {
    updateCallButton,
    cleanupCall,
    startCallPolling,
    stopCallPolling,
  };
}
