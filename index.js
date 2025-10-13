import { logToParent } from "./parent.js";

function setLocalStorageValues(localStorageValues) {
  Object.entries(localStorageValues).forEach(([k, v]) => {
    localStorage.setItem(k, v);
  });

  port.postMessage(localStorage.length);
}

function setFrameSrc(url) {
  const frame = document.getElementById("swpFrame");
  const src = `https://dzmitry-klokau.github.io/swp?url=${url}&noCache=${Date.now()}`;
  frame.src = src;
  frame.style.display = "block";
  frame.onload = function () {
    port.postMessage("frame-onload");
    logToParent({
      msg: "frame onload!",
      level: "debug",
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
    const port = event.ports && event.ports[0];
    const data = event.data;

    try {
      if (data.type === "swp-new-src" && typeof data.payload === "string") {
        setFrameSrc(port, data.payload);
      }
      if (data.type === "swp-network-resource-names") {
        logToParent({
          msg: `swp-network-resource-names`,
          level: "debug",
        });
        sendNetworkResourceNamesToParentWindow(port);
      }
      if (data.type === "swp-ls-set" && typeof data.payload === "string") {
        const payloadObj = JSON.parse(data.payload);
        setLocalStorageValues(port, payloadObj);
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
