function postMessageToAllClients(msgObj, options) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage(msgObj, options);
      }
    });
}

function logMessage(msg, level) {
  postMessageToAllClients({
    type: "log",
    payload: {
      msg: `[sw] ${msg}`,
      level,
    },
  });
}

self.addEventListener("install", (evt) => {
  evt.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(self.clients.claim());
  logMessage("SW activated", "debug");
});

self.addEventListener("fetch", (event) => {
  const reqUrl = new URL(event.request.url);
  const url = reqUrl.searchParams.get("url");
  if (url) {
    event.respondWith(handleProxyRequest(url));
  } else {
    logMessage(`${event.request.url}`, "debug");
  }
});

async function handleProxyRequest(url) {
  try {
    logMessage(`Process ${url}`, "debug");
    const messageChannel = new MessageChannel();

    const responsePromise = new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        const { body, status, headers } = event.data;

        let rBody = body;

        const contentType = headers["content-type"] || "";
        if (contentType.includes("text/html")) {
          rBody = addDelayFunction(rBody);
          rBody = addHumanClickFunction(rBody);
        }

        resolve(new Response(rBody, { status, headers }));
      };
    });

    postMessageToAllClients(
      {
        type: "swp-request",
        url,
      },
      [messageChannel.port2]
    );

    return await responsePromise;
  } catch (err) {
    logMessage(`Error: ${err?.message}`, "error");
    return new Response("Internal error", { status: 500 });
  }
}

// html replacements

function addDelayFunction(body) {
  return body.replace(
    "<head>",
    `<head>
      <script>
      function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
      }
      </script>
      `
  );
}

function addHumanClickFunction(body) {
  return body.replace(
    "<head>",
    `<head>
      <script>
      function createMouseEvent(type, x, y) {
          return new MouseEvent(type, {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              button: 0
          });
      }
      
      async function humanLikeClick(element) {
          const rect = element.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
      
          const randomOffset = () => (Math.random() - 0.5) * 10;
      
          const path = [
              [centerX - 100, centerY - 50],
              [centerX - 50, centerY - 20],
              [centerX + randomOffset(), centerY + randomOffset()],
              [centerX, centerY],
          ];
      
          for (let [x, y] of path) {
              element.dispatchEvent(createMouseEvent('mousemove', x, y));
              await delay(100 + Math.random() * 100);
          }
      
          element.dispatchEvent(createMouseEvent('mouseover', centerX, centerY));
          await delay(100 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mousemove', centerX, centerY));
          await delay(100 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mousedown', centerX, centerY));
          await delay(120 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mouseup', centerX, centerY));
          await delay(80 + Math.random() * 80);
      
          element.dispatchEvent(createMouseEvent('click', centerX, centerY));
      }

      window.addEventListener(
        "message",
        (event) => {
          const port = event.ports && event.ports[0];
          const data = event.data;

          if(data.type === "swp-human-like-xpath-click") {
            let result = document.evaluate(
              data.payload,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            let element = result.singleNodeValue;
            console.log('element', element);
            humanLikeClick(element);
          }
        },
        false
      );
      
      </script>
      `
  );
}
