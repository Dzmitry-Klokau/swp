function postMessageToAllClients(msgObj, options) {
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      if (clients.length > 1) {
        for (let i = 0; i < clients.length; i += 1) {
          clients[i].postMessage({
            type: "log",
            payload: {
              msg: `many clients ${i} ${client.url} ${client.frameType} ${client.id}`,
              level: "debug",
            },
          });
        }
      }
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
  const method = event.request.method;
  const url = reqUrl.searchParams.get("url");
  if (url) {
    event.respondWith(handleProxyRequest(url, method));
  } else {
    logMessage(`${event.request.url}`, "debug");
  }
});

async function handleProxyRequest(url, method) {
  try {
    logMessage(`Process ${method} ${url}`, "debug");
    const messageChannel = new MessageChannel();

    const responsePromise = new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        const { body, status, headers } = event.data;

        resolve(new Response(body, { status, headers }));
      };
    });

    postMessageToAllClients(
      {
        type: "swp-request",
        payload: {
          url,
          method,
        },
      },
      [messageChannel.port2]
    );

    return await responsePromise;
  } catch (err) {
    logMessage(`Error: ${err?.message}`, "error");
    return new Response("Internal error", { status: 500 });
  }
}
