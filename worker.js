addEventListener("fetch", event => event.respondWith(handleRequest(event.request, new URL(event.request.url))));

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  })
}

function errorResponse(body, status, useJson = false) {
  return new Response(body, { status });
}

const mongoHeaders = {
  "Content-Type": "application/json",
  "User-Agent": "MongoCloudflare/1.0.0",
  "Access-Control-Request-Headers": "*",
  "API-Key": KEY
};

async function executeMongo(action, obj) {
  let url = `https://data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1/action/${action}`;
  let method = "POST";
  let body = JSON.stringify(obj);

  let res = await fetch(url, {
    method,
    body,
    headers: mongoHeaders
  });

  let data;
  if (res.headers.get("Content-Type").startsWith("application/json")) data = await res.json();
  else {
    data = { text: await res.text() };
  }

  if (!res.ok) return {
    success: false,
    status: res.status,
    data
  }
  else return {
    success: true,
    status: res.status,
    data
  }
}

const mongo = {
  insert: async (collection, database, source, document) => {
    return await executeMongo("insertOne", {
      collection,
      database,
      dataSource: source,
      document
    });
  },
  find: async (collection, database, source, filter) => {
    return await executeMongo("findOne", {
      collection,
      database,
      dataSource: source,
      filter
    });
  }
};

async function handleRequest(req, url) {
  let path = url.pathname;

  if (path == "/") {
    return new Response("👋 Hello from the Report Storage server");
  }
  else if (path == "/insert" && req.method == "POST") {
    let contributor = req.headers.get("X-Identity");
    if (!contributor) return errorResponse("Missing the \"X-Identity\" header.", 400);

    let contentType = req.headers.get("Content-Type");
    if (!contentType) return errorResponse("Missing the \"Content-Type\" header.", 400);
    if (!contentType.startsWith("application/json")) return errorResponse("Body is not JSON.", 400);

    let obj;

    try {
      obj = await req.json();
    }
    catch (err) { return errorResponse("Invalid JSON.", 400); }

    if (
      typeof obj.id != "number" ||
      typeof obj.username != "string" ||
      typeof obj.reason != "string" ||
      (obj.tags && typeof obj.tags != "object")
    )
    return errorResponse("Invalid JSON payload.", 400);

    if (!obj.tags) obj.tags = [ ];

    obj.contributor = contributor;
    obj["_id"] = obj.id;
    delete obj.id;

    let action = await mongo.insert(MONGO_COLLECTION, MONGO_DATABASE, MONGO_SOURCE, obj);
    if (!action.success) return jsonResponse(action.data, 500);

    return jsonResponse({
      documentId: action.data.insertedId,
      contributor
    });
  }
  else if (path == "/find" && req.method == "GET") {
    let search = url.searchParams;
    let filter = Object.fromEntries(search);
    console.log(filter);

    if (Object.keys(filter).length== 0) return errorResponse("Missing a URL search query.", 400);

    let action = await mongo.find(MONGO_COLLECTION, MONGO_DATABASE, MONGO_SOURCE, filter);
    if (!action.success) return jsonResponse(action.data, 500);

    let doc = action.data.document; 
    if (doc != null) {
      doc.id = doc["_id"];
      delete doc["_id"];
    }

    return jsonResponse({
      found: doc != null,
      data: doc
    });
  }

  return new Response("Not Found", { status: 404 });
}
