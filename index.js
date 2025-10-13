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

function setFrameSrc(url) {
  const frame = document.getElementById("swpFrame");
  const src = `https://dzmitry-klokau.github.io/swp?url=${url}&noCache=${Date.now()}`;
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
}

function sendNetworkResourceNamesToParentWindow(port) {
  const iframe = document.getElementById("swpFrame");
  try {
    const resourceNames = iframe.contentWindow.performance
      .getEntriesByType("resource")
      .map((e) => e.name);

    port.postMessage(JSON.stringify(resourceNames));

    // sendToParentWindow(
    //   "swp-network-resource-names-response",
    //   JSON.stringify(resourceNames)
    // );
  } catch (err) {
    logToParent({
      msg: `Error during sending network resource names. ${err}`,
      level: "error",
    });
  } finally {
    port.close();
  }
}

window.addEventListener(
  "message",
  (event) => {
    const data = event.data;

    try {
      if (data.type === "swp-new-src" && typeof data.url === "string") {
        setFrameSrc(data.url);
      }
      if (data.type === "swp-network-resource-names") {
        const port = event.ports && event.ports[0];
        logToParent({
          msg: `swp-network-resource-names`,
          level: "debug",
        });
        sendNetworkResourceNamesToParentWindow(port);
      }
    } catch (err) {
      logToParent({
        msg: `Message failed: ${err}`,
        level: "error",
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
