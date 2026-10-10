const alertAudio = new Audio(chrome.runtime.getURL("flutie8211-high-pitch-alarm-buzzer-464349.mp3"));
alertAudio.preload = "auto";

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "trustlens.play-risk-alert") return;
  alertAudio.currentTime = 0;
  void alertAudio.play().catch((error: unknown) => {
    console.error("TrustLens could not play the risk alert sound.", error);
  });
});
