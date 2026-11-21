const CACHE_NAME =
  "border-initial";

const STATIC_FILES = [

  "./",

  "./index.html",

  "./style.css",

  "./app.js",

  "./manifest.json",

  "./offline.html",

  "./version.json"
];

self.addEventListener(
  "install",
  event => {

    self.skipWaiting();

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(cache =>

          cache.addAll(
            STATIC_FILES
          )
        )
    );
  }
);

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()

      .then(keys =>

        Promise.all(

          keys.map(key => {

            if (
              key !== CACHE_NAME
            ) {

              return caches.delete(
                key
              );
            }

          })
        )
      )
    );

    self.clients.claim();
  }
);

async function networkFirst(
  request
) {

  const cache =
    await caches.open(
      CACHE_NAME
    );

  try {

    const response =
      await fetch(
        request
      );

    cache.put(
      request,
      response.clone()
    );

    return response;

  } catch {

    const cached =
      await cache.match(
        request
      );

    if (cached) {
      return cached;
    }

    return caches.match(
      "./offline.html"
    );
  }
}

async function staleWhileRevalidate(
  request
) {

  const cache =
    await caches.open(
      CACHE_NAME
    );

  const cached =
    await cache.match(
      request
    );

  const networkPromise =

    fetch(request)

      .then(response => {

        cache.put(
          request,
          response.clone()
        );

        return response;
      })

      .catch(() => null);

  return (
    cached ||
    networkPromise ||
    caches.match(
      "./offline.html"
    )
  );
}

self.addEventListener(
  "fetch",
  event => {

    const url =
      new URL(
        event.request.url
      );

    if (
      url.pathname.endsWith(
        "machines.json"
      )
    ) {

      event.respondWith(

        networkFirst(
          event.request
        )
      );

      return;
    }

    event.respondWith(

      staleWhileRevalidate(
        event.request
      )
    );
  }
);