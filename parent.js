function sendMsgToParentWindow(type, payload) {
  window.parent.postMessage(
    {
      type,
      payload,
    },
    "*"
  );
}
function logToParent({ msg, level }) {
  sendMsgToParentWindow("log", {
    msg: `[iframe] ${msg}`,
    level,
  });
}

module.exports = {
  sendMsgToParentWindow,
  logToParent,
};
