# Report Storage

A Cloudflare Worker script for MongoDB Atlas to store Replit accounts that have been reported by automated anti-abuse tools.

## Purpose of this database
Now that both of us have automation tools for abuse reporting, it's possible that we submit duplicates.<br>
This database works as a centralized place to inform other tools which users have already been reported.

## Environment variables
- `APP_ID` - the application ID of your Data API database
- `KEY` - the API key for your Data API database
- `MONGO_COLLECTION`, `MONGO_DATABASE`, `MONGO_SOURCE` - where to save inserted documents

## API Usage
### GET `/`
Route can be fetched to check the health of the service.

### POST `/insert`
Insert a new reported account into the database. Requires a `X-Identity` header with your username.
Takes the Replit account's ID, username and report reason as mandatory arguments. An array of string tags is optional.

> Request:
```json
{
    "id": 4150864,
    "username": "IroncladDev",
    "reason": "Detected 1 blacklisted URL",
    "tags": [ "auto-moderator", "published" ]
}
```

> Response:
- ✅ Success

```json
{
    "documentId": 4150864,
    "contributor": "akac"
}
```

- ❌ Error

Returns a 400-500 status code.
Exceptions are directly serialized into the response. If they are not JSON, they are serialized as the `text` property.

### GET `/find`
Search for a reported user by `id`, `username` or `reason`. This query is provided through URL search parameters.

> Request:
`/find?username=IroncladDev`

> Response:
```json
{
    "found": true,
    "data": {
        "username": "IroncladDev",
        "reason": "Detected 1 blacklisted URL",
        "tags": [
            "auto-moderator",
            "published"
        ],
        "contributor": "akac",
        "id": 4150864
    }
}
```

- ❌ Not Found

In the case of the query not finding a match, `found` will be false and `data` null.

- ❌ Error

Returns a 400-500 status code.
Exceptions are directly serialized into the response. If they are not JSON, they are serialized as the `text` property.
