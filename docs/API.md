# REST API

Base URL: `http://localhost:4000/api`

Authenticated endpoints require:

```http
Authorization: Bearer <jwt>
```

## Auth

### Register

`POST /auth/register`

```json
{
  "username": "megha",
  "email": "megha@example.com",
  "password": "Password123!",
  "preferredLanguage": "en"
}
```

Returns:

```json
{
  "user": {},
  "token": "jwt"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "megha@example.com",
  "password": "Password123!"
}
```

### Current User

`GET /auth/me`

### Update Preferences

`PATCH /auth/me/preferences`

```json
{
  "preferredLanguage": "ml",
  "autoTranslateEnabled": true,
  "regionalSlangMode": true
}
```

### Upload Avatar

`POST /auth/me/avatar`

Multipart field: `avatar`

### Search Users

`GET /auth/users/search?q=anj`

## Metadata

### Supported Languages

`GET /meta/languages`

Returns English, Malayalam, Hindi, Tamil, Telugu, and Kannada.

## Contacts

### List Contacts

`GET /contacts`

Returns accepted contacts plus incoming and outgoing pending requests.

### Send Contact Request

`POST /contacts`

```json
{
  "userId": "user-id"
}
```

### Accept Contact Request

`PATCH /contacts/:contactId/accept`

### Remove Contact or Request

`DELETE /contacts/:contactId`

## Conversations

### List Conversations

`GET /conversations`

### Create Private Conversation

`POST /conversations/private`

```json
{
  "recipientId": "user-id"
}
```

### Create Group

`POST /conversations/groups`

```json
{
  "name": "Product Standup",
  "memberIds": ["user-id-1", "user-id-2"]
}
```

### Get Conversation

`GET /conversations/:conversationId`

### Update Group

`PATCH /conversations/:conversationId`

```json
{
  "name": "Engineering Standup"
}
```

### Upload Group Avatar

`POST /conversations/:conversationId/avatar`

Multipart field: `avatar`

### Add Group Members

`POST /conversations/:conversationId/members`

```json
{
  "memberIds": ["user-id"]
}
```

### Remove Group Member

`DELETE /conversations/:conversationId/members/:memberId`

### List Messages

`GET /conversations/:conversationId/messages?limit=40&cursor=message-id`

### Send Message with Files or Voice Notes

`POST /conversations/:conversationId/messages`

Multipart fields:

- `content`
- `replyToId`
- `files` - images, PDFs, documents, or audio voice notes

### Mark Conversation Read

`POST /conversations/:conversationId/read`

## Messages

### Add Reaction

`POST /messages/:messageId/reactions`

```json
{
  "emoji": "ðŸ‘"
}
```

### Remove Reaction

`DELETE /messages/:messageId/reactions`

```json
{
  "emoji": "ðŸ‘"
}
```

### Translate Message

`POST /messages/:messageId/translate`

```json
{
  "targetLanguage": "ml",
  "slangMode": true
}
```

Returns:

```json
{
  "translation": {
    "messageId": "message-id",
    "languageCode": "ml",
    "sourceLanguage": "en",
    "translatedText": "à´¹à´¾à´¯àµ à´Žà´²àµà´²à´¾à´µà´°àµà´‚, à´®àµ€à´±àµà´±à´¿à´‚à´—àµ 3 à´®à´£à´¿à´•àµà´•àµ à´†à´°à´‚à´­à´¿à´•àµà´•àµà´‚.",
    "translatedByAI": true,
    "slangMode": true
  }
}
```

## Notifications

### List Notifications

`GET /notifications`

### Mark One Read

`PATCH /notifications/:notificationId/read`

### Mark All Read

`PATCH /notifications/read-all`
