using System.Security.Cryptography;
using System.Text;

// Content-hash for the embedding dirty-check (KNOWLEDGE_ENGINE.md §2/§3).
// If a note is updated but this hash is unchanged, we skip re-embedding.
// The title is included because it is prepended to each chunk before
// embedding, so a title change must invalidate the embeddings too.
public static class EmbeddingHelpers
{
    // Unit-separator delimiter avoids title/content boundary collisions
    // (e.g. title "ab"+content "c" must not hash the same as "a"+"bc").
    private const string Delimiter = "";

    public static string ComputeContentHash(string? title, string? content)
    {
        var normalized = (title ?? string.Empty).Trim()
                         + Delimiter
                         + (content ?? string.Empty).Trim();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
