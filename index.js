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
    .then((_reg) => {
      logToParent({
        msg: "SW is registered!",
        level: "debug",
      });
      sendToParentWindow("swp-status", {
        status: "active",
      });
    })
    .catch((_err) => {
      logToParent({
        msg: `SW registration is not supported!`,
        level: "error",
      });
      sendToParentWindow("swp-status", {
        status: "error",
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

    if (typeof data !== "object") {
      return;
    }
    if (data.type !== "setSrc") {
      return;
    }
    if (typeof data.url !== "string") {
      return;
    }
    const frame = document.getElementById("swpFrame");
    const src = `https://dzmitry-klokau.github.io/swp?url=${
      data.url
    }&noCache=${Date.now()}`;
    frame.src = src;
    frame.style.display = "block";
    frame.onload = function () {
      logToParent({
        msg: "frame onload!",
        level: "debug",
      });
      sendToParentWindow("swp-status", {
        status: "frame-onload",
      });
    };

    logToParent({
      msg: `New iframe url is ${src}`,
      level: "debug",
    });
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

if ("PerformanceObserver" in window) {
  logToParent({
    msg: "Add PerformanceObserver",
    level: "debug",
  });
  try {
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        logToParent({
          msg: `perf resource: ${entry.name}`,
          level: "debug",
        });
      });
    });
    po.observe({ entryTypes: ["resource"] });
  } catch (e) {
    console.warn("PerformanceObserver failed", e);
  }
}
