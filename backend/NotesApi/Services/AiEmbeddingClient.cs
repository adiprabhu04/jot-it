using System.Net.Http.Json;
using System.Text.Json;

// Calls the FastAPI AI service /embed-note endpoint. Same pattern as the
// existing OCR/summary calls. Returns null on any failure so the worker
// can retry — never throws for transport/model errors.
public class AiEmbeddingClient : IEmbeddingClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiEmbeddingClient> _logger;

    public AiEmbeddingClient(IHttpClientFactory httpClientFactory, ILogger<AiEmbeddingClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<EmbedNoteResult?> EmbedNoteAsync(string title, string content, CancellationToken ct)
    {
        var baseUrl = Environment.GetEnvironmentVariable("AI_SERVICE_URL") ?? "http://localhost:8000";
        var url = baseUrl.TrimEnd('/') + "/embed-note";

        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            var response = await client.PostAsJsonAsync(url, new { title, content }, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Embed-note returned {Status} from AI service", (int)response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var model = root.TryGetProperty("model", out var m) ? m.GetString() ?? "" : "";
            var dim = root.TryGetProperty("dim", out var d) && d.ValueKind == JsonValueKind.Number ? d.GetInt32() : 0;

            var chunks = new List<EmbeddedChunk>();
            if (root.TryGetProperty("chunks", out var chunksEl) && chunksEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var c in chunksEl.EnumerateArray())
                {
                    var index = c.TryGetProperty("index", out var i) ? i.GetInt32() : 0;
                    var chunkContent = c.TryGetProperty("content", out var cc) ? cc.GetString() ?? "" : "";
                    int? tokenCount = c.TryGetProperty("tokenCount", out var tc) && tc.ValueKind == JsonValueKind.Number
                        ? tc.GetInt32() : null;

                    float[] vector = Array.Empty<float>();
                    if (c.TryGetProperty("vector", out var vec) && vec.ValueKind == JsonValueKind.Array)
                    {
                        vector = new float[vec.GetArrayLength()];
                        var vi = 0;
                        foreach (var f in vec.EnumerateArray())
                            vector[vi++] = (float)f.GetDouble();
                    }

                    chunks.Add(new EmbeddedChunk(index, chunkContent, tokenCount, vector));
                }
            }

            return new EmbedNoteResult(model, dim, chunks);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embed-note request to AI service failed");
            return null;
        }
    }
}
