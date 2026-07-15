using Microsoft.EntityFrameworkCore;

public class NotesDbContext : DbContext
{
    public NotesDbContext(DbContextOptions<NotesDbContext> options)
        : base(options) { }

    public DbSet<Note> Notes => Set<Note>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OcrFeedback> OcrFeedbacks => Set<OcrFeedback>();
    public DbSet<Embedding> Embeddings => Set<Embedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Embedding>(e =>
        {
            // 384-dim = BAAI/bge-small-en-v1.5 (KNOWLEDGE_ENGINE.md, DECISIONS D-11).
            e.Property(x => x.Vector).HasColumnType("vector(384)");
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.NoteId);
            // Deleting a note removes its embeddings.
            e.HasOne<Note>()
             .WithMany()
             .HasForeignKey(x => x.NoteId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
