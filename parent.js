export function sendMsgToParentWindow(type, payload) {
  window.parent.postMessage(
    {
      type,
      payload,
    },
    "*"
  );
}

export function logToParent({ msg, level }) {
  sendMsgToParentWindow("log", {
    msg: `[iframe] ${msg}`,
    level,
  });
}
