import { sendMsgToParentWindow, logToParent } from "./parent.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", {
      scope: "./",
    })
    .then((_reg) => {
      logToParent({
        msg: "SW is registered!",
        level: "debug",
      });
      sendMsgToParentWindow("swp-status", {
        status: "active",
      });
    })
    .catch((_err) => {
      logToParent({
        msg: `SW registration is not supported!`,
        level: "error",
      });
      sendMsgToParentWindow("swp-status", {
        status: "error",
      });
    });
} else {
  logToParent({
    msg: `SW is not registered. Error: ${err}.`,
    level: "error",
  });
}

navigator.serviceWorker.addEventListener("message", async (event) => {
  const port = event.ports[0];
  const data = event.data;

  if (data.type === "swp-request") {
    const url = data.url;

    sendMsgToParentWindow("swp-request", url);

    window.addEventListener("message", function handler(e) {
      if (e.data.type === "swp-response" && e.data.url === url) {
        port.postMessage(e.data.response);
        window.removeEventListener("message", handler);
      }
    });
  }

  if (data.type === "log") {
    sendMsgToParentWindow("log", data.payload);
  }

  if (data.type === "swp-network-request") {
    sendMsgToParentWindow("swp-network-request", data.payload);
  }
});
