function postMessage(msgObj, createChannel = false) {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const results = [];

      for (const client of clients) {
        if (createChannel) {
          const channel = new MessageChannel();
          results.push({ client, channel });
          client.postMessage(msgObj, [channel.port2]);
        } else {
          client.postMessage(msgObj);
        }
      }

      return results;
    });
}

async function postMessageToAllClients(msgObj, onMessageHandler) {
  const clientChannels = await postMessage(msgObj, true);
  if (clientChannels.length === 0) {
    throw new Error("No clients");
  }

  const promises = clientChannels.map(({ channel }) => {
    return new Promise((resolve) => {
      channel.port1.onmessage = onMessageHandler(resolve);
    });
  });

  const response = await Promise.any(promises);

  clientChannels.forEach(({ channel }) => {
    channel.port1.close();
    channel.port2.close();
  });

  return response;
}

function logMessage(msg, level = "debug") {
  postMessage({
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
    event.respondWith(handleProxyRequest(url, event));
  } else {
    logMessage(`${event.request.url}`, "debug");
  }
});

async function handleProxyRequest(url, event) {
  const method = event.request.method;
  const headersObj = Object.fromEntries(event.request.headers.entries());
  const cookieHeader = await postMessageToAllClients(
    { type: "swp-get-cookie" },
    (resolve) => (event) => {
      resolve(event.data.cookies);
    }
  );

  try {
    logMessage(`Process ${method} ${url}`, "debug");

    const msg = {
      type: "swp-request",
      payload: {
        url,
        method,
        headers: JSON.stringify({
          ...headersObj,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        }),
      },
    };

    return postMessageToAllClients(msg, (resolve) => (event) => {
      const { body, status, headers } = event.data;
      resolve(new Response(body, { status, headers }));
    });
  } catch (err) {
    logMessage(`Error: ${err?.message}`, "error");
    return new Response("Internal error", { status: 500 });
  }
}
