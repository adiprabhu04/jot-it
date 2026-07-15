using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Pgvector;

#nullable disable

namespace NotesApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentHash",
                table: "Notes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmbeddedAt",
                table: "Notes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmbeddingModel",
                table: "Notes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmbeddingStatus",
                table: "Notes",
                type: "text",
                nullable: false,
                // Existing rows are "none" (not queued). New notes created via
                // the API start "pending". A later backfill milestone flips
                // existing notes to "pending".
                defaultValue: "none");

            migrationBuilder.CreateTable(
                name: "Embeddings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChunkIndex = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Vector = table.Column<Vector>(type: "vector(384)", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    TokenCount = table.Column<int>(type: "integer", nullable: true),
                    ContentHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Embeddings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Embeddings_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Embeddings_NoteId",
                table: "Embeddings",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Embeddings_UserId",
                table: "Embeddings",
                column: "UserId");

            // Approximate-nearest-neighbor index for cosine similarity
            // (KNOWLEDGE_ENGINE.md §4). Not expressible via EF fluent API.
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS ix_embeddings_vector_hnsw " +
                "ON \"Embeddings\" USING hnsw (\"Vector\" vector_cosine_ops) " +
                "WITH (m = 16, ef_construction = 64);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Embeddings");

            migrationBuilder.DropColumn(
                name: "ContentHash",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "EmbeddedAt",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "EmbeddingModel",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "EmbeddingStatus",
                table: "Notes");
        }
    }
}
