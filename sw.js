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

function collectMediaLinks(url) {
  postMessageToAllClients({
    type: "swp-network-request",
    payload: url,
  });
}

self.addEventListener("fetch", (event) => {
  const reqUrl = new URL(event.request.url);
  const url = reqUrl.searchParams.get("url");
  if (url) {
    event.respondWith(handleProxyRequest(url));
  } else {
    collectMediaLinks(
      `${`${event.request.url}`.includes(m3u8)}-${event.request.url}`
    );
  }
});

async function handleProxyRequest(url) {
  try {
    logMessage(`Process ${url}`, "debug");
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
