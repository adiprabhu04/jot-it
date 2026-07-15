public class Note
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public bool IsPinned { get; set; } = false;
    public string? ImageData { get; set; }
    public string? Summary { get; set; }
    public string? Color { get; set; }
    public string? Tags { get; set; }
    public DateTime? ReminderAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // ── Knowledge Engine (M1): embedding-ingestion control ──────────
    // ContentHash of the last-embedded (title+content); lets us skip
    // re-embedding when a note is updated without content changing.
    public string? ContentHash { get; set; }
    // pending | processing | ready | failed. New notes created via the API
    // start "pending"; pre-existing rows are "none" (not queued) until a
    // future backfill milestone.
    public string EmbeddingStatus { get; set; } = "pending";
    public DateTime? EmbeddedAt { get; set; }
    public string? EmbeddingModel { get; set; }
}