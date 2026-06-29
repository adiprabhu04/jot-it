# Database — Jot It

Jot It uses **PostgreSQL** (hosted on Neon) accessed by the backend through **EF Core / Npgsql**. The schema below reflects the entities in `backend/NotesApi/Models`.

## Entity Overview

```text
User 1───∞ Note
User 1───∞ OcrFeedback
```

Every `Note` and `OcrFeedback` is scoped to a `User` via `UserId`.

## Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `Name` | `string` | Display name |
| `Email` | `string` | Unique login identifier |
| `PasswordHash` | `string` | bcrypt hash — never plain text |
| `CreatedAt` | `DateTime` | Account creation timestamp |

### notes

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `Title` | `string` | Note title |
| `Content` | `string` | Note body |
| `Category` | `string` | Defaults to `"General"` |
| `IsPinned` | `bool` | Pin state, default `false` |
| `ImageData` | `string?` | Optional source/scanned image data |
| `Summary` | `string?` | AI-generated summary |
| `Color` | `string?` | Color label |
| `Tags` | `string?` | Hashtags / tags |
| `ReminderAt` | `DateTime?` | Optional reminder time |
| `CreatedAt` | `DateTime` | Defaults to UTC now |
| `UpdatedAt` | `DateTime` | Defaults to UTC now |
| `UserId` | `Guid` | Foreign key → `users.Id` |

### ocr_feedbacks

| Column | Type | Notes |
|--------|------|-------|
| `Id` | `Guid` | Primary key |
| `UserId` | `Guid` | Foreign key → `users.Id` |
| `ExtractedText` | `string` | Text returned by OCR |
| `Engine` | `string` | OCR engine identifier |
| `Confidence` | `float?` | OCR confidence score |
| `IsAccurate` | `bool` | Whether the user marked it accurate |
| `CorrectedText` | `string?` | User-supplied correction |
| `CreatedAt` | `DateTime` | Defaults to UTC now |

## Access & Integrity
- The backend is the only service that connects to the database.
- All read/write queries filter by the authenticated `UserId`, enforcing per-user isolation.
- Connection details are supplied via the `DATABASE_URL` environment variable.

## Migrations
Schema changes are managed through EF Core. Generate and apply migrations from `backend/NotesApi`:

```bash
dotnet ef migrations add <Name>
dotnet ef database update
```
