using Pgvector;

// A single embedded chunk of a note (Knowledge Engine M1).
// One note produces one or more Embedding rows. Retrieval is NOT part of
// M1 — these rows are written only; nothing reads them yet.
public class Embedding
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid NoteId { get; set; }
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public Vector Vector { get; set; } = null!;
    public string Model { get; set; } = string.Empty;
    public int? TokenCount { get; set; }
    public string ContentHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
