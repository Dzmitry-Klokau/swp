function sendToParentWindow(type, payload) {
  window.parent.postMessage(
    {
      type,
      payload,
    },
    "*"
  );
}
function logToParent({ msg, level }) {
  sendToParentWindow("log", {
    msg: `[iframe] ${msg}`,
    level,
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", {
      scope: "./",
    })
    .then((reg) => {
      logToParent({
        msg: "SW is registered!",
        level: "debug",
      });
    })
    .catch((_err) => {
      logToParent({
        msg: `SW registration is not supported!`,
        level: "error",
      });
    });
} else {
  logToParent({
    msg: `SW is not registered. Error: ${err}.`,
    level: "error",
  });
}

window.addEventListener(
  "message",
  (event) => {
    const data = event.data;

    if (data.type === "setSrc" && typeof data.url === "string") {
      const frame = document.getElementById("swpFrame");
      const src = `https://dzmitry-klokau.github.io/swp?url=${
        data.url
      }&randomValue=${Math.floor(Math.random() * 1001)}`;
      frame.src = src;
      frame.style.display = "block";

      logToParent({
        msg: `New iframe url is ${src}`,
        level: "debug",
      });
    }

    if (
      data.type === "swp-content-cookie" &&
      typeof data.payload === "string"
    ) {
      logToParent({
        msg: `swp-content-cookie ${data.payload}`,
        level: "debug",
      });
    }
  },
  false
);

navigator.serviceWorker.addEventListener("message", async (event) => {
  const port = event.ports[0];
  const data = event.data;

  if (data.type === "swp-request") {
    const url = data.url;

    sendToParentWindow("swp-request", url);

    window.addEventListener("message", function handler(e) {
      if (e.data.type === "swp-response" && e.data.url === url) {
        port.postMessage(e.data.response);
        window.removeEventListener("message", handler);
      }
    });
  }
  if (data.type === "log") {
    sendToParentWindow("log", data.payload);
  }
});
