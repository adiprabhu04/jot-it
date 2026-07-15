using Microsoft.EntityFrameworkCore;
using Pgvector;

// Background ingestion worker (KNOWLEDGE_ENGINE.md §12). Polls notes
// marked "pending", generates embeddings via IEmbeddingClient, and
// persists them. Runs off the request path so note writes are never
// blocked on the AI service. Retrieval/search are NOT part of M1.
public class EmbeddingWorker : BackgroundService
{
    private const int ExpectedDim = 384; // bge-small-en-v1.5
    private const int BatchSize = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    private readonly IServiceProvider _services;
    private readonly ILogger<EmbeddingWorker> _logger;

    public EmbeddingWorker(IServiceProvider services, ILogger<EmbeddingWorker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EmbeddingWorker started (poll {Seconds}s, batch {Batch})",
            PollInterval.TotalSeconds, BatchSize);

        await ResetStuckProcessingAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "EmbeddingWorker batch failed");
            }

            try { await Task.Delay(PollInterval, stoppingToken); }
            catch (TaskCanceledException) { break; }
        }
    }

    // A crash mid-embed can leave a note stuck in "processing"; requeue on start.
    private async Task ResetStuckProcessingAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NotesDbContext>();
            var stuck = await db.Notes.Where(n => n.EmbeddingStatus == "processing").ToListAsync(ct);
            foreach (var n in stuck) n.EmbeddingStatus = "pending";
            if (stuck.Count > 0) await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to reset stuck 'processing' notes");
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NotesDbContext>();
        var client = scope.ServiceProvider.GetRequiredService<IEmbeddingClient>();

        var pending = await db.Notes
            .Where(n => n.EmbeddingStatus == "pending")
            .OrderBy(n => n.UpdatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        foreach (var note in pending)
        {
            note.EmbeddingStatus = "processing";
            await db.SaveChangesAsync(ct);

            try
            {
                var result = await client.EmbedNoteAsync(note.Title, note.Content, ct);

                if (result == null)
                {
                    note.EmbeddingStatus = "failed";
                    await db.SaveChangesAsync(ct);
                    _logger.LogWarning("Embedding failed (AI unavailable) for note {NoteId}", note.Id);
                    continue;
                }

                if (result.Chunks.Any(c => c.Vector.Length != ExpectedDim))
                {
                    note.EmbeddingStatus = "failed";
                    await db.SaveChangesAsync(ct);
                    _logger.LogWarning("Embedding dim mismatch for note {NoteId} (expected {Dim})", note.Id, ExpectedDim);
                    continue;
                }

                // Replace this note's embeddings atomically.
                var existing = db.Embeddings.Where(e => e.NoteId == note.Id);
                db.Embeddings.RemoveRange(existing);

                foreach (var chunk in result.Chunks)
                {
                    db.Embeddings.Add(new Embedding
                    {
                        UserId = note.UserId,
                        NoteId = note.Id,
                        ChunkIndex = chunk.Index,
                        Content = chunk.Content,
                        Vector = new Vector(chunk.Vector),
                        Model = result.Model,
                        TokenCount = chunk.TokenCount,
                        ContentHash = note.ContentHash ?? string.Empty,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                note.EmbeddingStatus = "ready";
                note.EmbeddedAt = DateTime.UtcNow;
                note.EmbeddingModel = result.Model;
                await db.SaveChangesAsync(ct);

                _logger.LogInformation("Embedded note {NoteId}: {Count} chunk(s) [{Model}]",
                    note.Id, result.Chunks.Count, result.Model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Embedding note {NoteId} failed", note.Id);
                try
                {
                    note.EmbeddingStatus = "failed";
                    await db.SaveChangesAsync(ct);
                }
                catch { /* best effort */ }
            }
        }
    }
}
