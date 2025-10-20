import { logToParent, sendMsgToParentWindow } from "./parent.js";

function setLocalStorageValues(port, localStorageValues) {
  Object.entries(localStorageValues).forEach(([k, v]) => {
    localStorage.setItem(k, v);
  });

  port.postMessage(localStorage.length);
}

function setIFrameSrc(port, url) {
  const frame = document.getElementById("swpFrame");
  const src = `https://dzmitry-klokau.github.io/swp?url=${url}&noCache=${Date.now()}`;
  frame.src = src;
  frame.style.display = "block";
  frame.onload = function () {
    setTimeout(() => {
      port.postMessage("frame-onload");
    }, 100);
  };

  logToParent({
    msg: `New iframe url is ${src}`,
    level: "debug",
  });
}

function sendNetworkResourceNames(port) {
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

function sendIFrameContent(port) {
  const iframe = document.getElementById("swpFrame");
  try {
    port.postMessage(iframe.contentDocument.documentElement.outerHTML);
  } catch (err) {
    logToParent({
      msg: `Error during sending iframe content. ${err}`,
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
      switch (data.type) {
        case "swp-iframe-src": {
          if (typeof data.payload === "string") {
            setIFrameSrc(port, data.payload);
          }
          break;
        }
        case "swp-reset-iframe": {
          const frame = document.getElementById("swpFrame");
          frame.src = "about:blank";
          break;
        }
        case "swp-network-resource-names": {
          sendNetworkResourceNames(port);
          break;
        }
        case "swp-iframe-content": {
          sendIFrameContent(port);
          break;
        }
        case "swp-ls-set": {
          if (typeof data.payload === "string") {
            const payloadObj = JSON.parse(data.payload);
            setLocalStorageValues(port, payloadObj);
          }
          break;
        }
        case "swp-cookie-intercepted":
        case "swp-playerjs-file-intercepted":
        case "swp-playerjs-subtitle-intercepted":
        case "swp-hls-src-intercepted": {
          if (typeof data.payload === "string") {
            sendMsgToParentWindow(data.type, data.payload);
          }
          break;
        }
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
