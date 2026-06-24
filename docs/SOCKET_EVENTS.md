# Socket.IO Events

Socket URL: `http://localhost:4000`

Connect with:

```ts
io("http://localhost:4000", {
  auth: { token: "<jwt>" }
});
```

## Client to Server

### `conversation:join`

Join a room after opening a conversation.

```json
"conversation-id"
```

### `message:send`

Send a text message in realtime.

```json
{
  "conversationId": "conversation-id",
  "content": "Hey guys, meeting starts at 3 PM",
  "replyToId": "optional-message-id"
}
```

Acknowledgement:

```json
{
  "ok": true,
  "message": {}
}
```

### `message:typing:start`

```json
{
  "conversationId": "conversation-id"
}
```

### `message:typing:stop`

```json
{
  "conversationId": "conversation-id"
}
```

### `message:read`

```json
{
  "conversationId": "conversation-id"
}
```

### `message:reaction:add`

```json
{
  "messageId": "message-id",
  "emoji": "👍"
}
```

### `message:reaction:remove`

```json
{
  "messageId": "message-id",
  "emoji": "👍"
}
```

## Server to Client

### `message:new`

Emitted to all members in the conversation room.

### `message:update`

Emitted after reaction changes.

### `message:typing`

```json
{
  "conversationId": "conversation-id",
  "userId": "user-id",
  "username": "anjali",
  "isTyping": true
}
```

### `message:read`

```json
{
  "userId": "user-id",
  "messageIds": ["message-id"],
  "readAt": "2026-06-23T10:00:00.000Z"
}
```

### `presence:update`

```json
{
  "userId": "user-id",
  "isOnline": true,
  "lastSeen": null
}
```

### `conversation:update`

```json
{
  "conversationId": "conversation-id"
}
```

### `error:message`

```json
{
  "message": "Realtime action failed"
}
```
