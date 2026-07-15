// Backend-side abstraction over embedding generation. Consumers (the
// ingestion worker) depend on this interface, never on a concrete model
// or transport, so the model/provider can be swapped without changing
// them (KNOWLEDGE_ENGINE.md §17). The M1 implementation calls the AI
// service; a future one could call a different provider.

public record EmbeddedChunk(int Index, string Content, int? TokenCount, float[] Vector);

public record EmbedNoteResult(string Model, int Dim, List<EmbeddedChunk> Chunks);

public interface IEmbeddingClient
{
    // Returns the note's chunk embeddings, or null on failure (caller
    // treats null as "retry later"). Never throws for expected failures.
    Task<EmbedNoteResult?> EmbedNoteAsync(string title, string content, CancellationToken ct);
}
