function postMessageToAllClients(msgObj, createChannel = false) {
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

function logMessage(msg, level = "debug") {
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
    event.respondWith(handleProxyRequest(url, event));
  } else {
    logMessage(`${event.request.url}`, "debug");
  }
});

async function handleProxyRequest(url, event) {
  const method = event.request.method;
  const headersObj = Object.fromEntries(event.request.headers.entries());
  const cookieHeader = await getClientCookies(event);

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

    const clientChannels = await postMessageToAllClients(msg, true);

    if (clientChannels.length === 0) {
      throw new Error("Нет клиентов для обработки запроса");
    }

    const promises = clientChannels.map(({ channel }) => {
      return new Promise((resolve) => {
        channel.port1.onmessage = (event) => {
          const { body, status, headers } = event.data;
          resolve(new Response(body, { status, headers }));
        };
      });
    });

    const response = await Promise.any(promises);

    clientChannels.forEach(({ channel }) => {
      channel.port1.close();
      channel.port2.close();
    });

    return response;
  } catch (err) {
    logMessage(`Error: ${err?.message}`, "error");
    return new Response("Internal error", { status: 500 });
  }
}

async function getClientCookies(event) {
  const client = await self.clients.get(event.clientId);
  if (!client) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (msg) => resolve(msg.data.cookies || null);
    client.postMessage({ type: "GET_COOKIES" }, [channel.port2]);
  });
}
