using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    EnvironmentName = Environments.Production
});

builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpClient();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NotesApi",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connectionString;

if (string.IsNullOrEmpty(databaseUrl))
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? throw new InvalidOperationException("Connection string not found.");
}
else if (databaseUrl.StartsWith("postgresql://") || databaseUrl.StartsWith("postgres://"))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var builder2 = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        Database = uri.AbsolutePath.TrimStart('/'),
        SslMode = Npgsql.SslMode.Require,
        TrustServerCertificate = true
    };
    connectionString = builder2.ConnectionString;
}
else
{
    connectionString = databaseUrl;
}

builder.Services.AddDbContext<NotesDbContext>(options =>
    options.UseNpgsql(connectionString));

var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
{
    if (builder.Environment.IsDevelopment())
    {
        jwtKey = "DEVELOPMENT_ONLY_SECRET_KEY_MINIMUM_32_CHARACTERS_LONG";
    }
    else
    {
        throw new InvalidOperationException("JWT_SECRET_KEY environment variable must be at least 32 characters");
    }
}
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes)
    };
});

builder.Services.AddAuthorization();

var defaultOrigins = new[]
{
    "https://persistent-ai-ml-internship.vercel.app"
};

var envOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
    ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? Array.Empty<string>();

var allowedOrigins = defaultOrigins.Concat(envOrigins).Distinct().ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfigured", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Apply migrations automatically
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NotesDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("AllowConfigured");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapMethods("/health", new[] { "GET", "HEAD" }, () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        timestamp = DateTime.UtcNow
    });
});

app.MapGet("/notes", async (
    int page,
    int pageSize,
    string? search,
    HttpContext context,
    NotesDbContext db) =>
{
    var userId = AuthHelpers.GetUserId(context);

    page = page <= 0 ? 1 : page;
    pageSize = pageSize <= 0 ? 10 : pageSize;
    pageSize = pageSize > 50 ? 50 : pageSize;

    var query = db.Notes.Where(n => n.UserId == userId);

    if (!string.IsNullOrWhiteSpace(search))
    {
        query = query.Where(n => n.Title.ToLower().Contains(search.ToLower()) 
                              || n.Content.ToLower().Contains(search.ToLower()));
    }

    var totalCount = await query.CountAsync();

    var notes = await query
        .OrderByDescending(n => n.IsPinned)
        .ThenByDescending(n => n.UpdatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return Results.Ok(new
    {
        page,
        pageSize,
        totalCount,
        data = notes
    });
})
.RequireAuthorization();

app.MapGet("/notes/{id}", async (
    Guid id,
    HttpContext context,
    NotesDbContext db) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

    if (note == null) return Results.NotFound();

    return Results.Ok(note);
})
.RequireAuthorization();

app.MapPost("/notes", async (
    CreateNoteRequest request,
    HttpContext context,
    NotesDbContext db,
    IHttpClientFactory httpClientFactory) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(new { error = "Title is required" });

    if (request.Title.Length > 200)
        return Results.BadRequest(new { error = "Title must be under 200 characters" });

    var userId = AuthHelpers.GetUserId(context);

    var note = new Note
    {
        Id = Guid.NewGuid(),
        Title = request.Title.Trim(),
        Content = request.Content?.Trim() ?? string.Empty,
        Category = request.Category ?? "General",
        ImageData = request.ImageData,
        Color = request.Color,
        Tags = request.Tags,
        ReminderAt = request.ReminderAt,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        UserId = userId
    };

    try {
        var aiServiceBase = Environment.GetEnvironmentVariable("AI_SERVICE_URL")
            ?? "http://localhost:8000";
        using var httpClient = httpClientFactory.CreateClient();
        var summarizeUrl = aiServiceBase.TrimEnd('/') + "/summarize";
        var summarizeResponse = await httpClient.PostAsJsonAsync(summarizeUrl,
            new { text = request.Content });
        if (summarizeResponse.IsSuccessStatusCode) {
            var summarizeResult = await summarizeResponse.Content
                .ReadFromJsonAsync<SummarizeResult>();
            note.Summary = summarizeResult?.Summary ?? "";
        }
    } catch {
        note.Summary = "";
    }

    db.Notes.Add(note);
    await db.SaveChangesAsync();

    return Results.Created($"/notes/{note.Id}", note);
})
.RequireAuthorization();

app.MapPut("/notes/{id}", async (
    Guid id,
    UpdateNoteRequest request,
    HttpContext context,
    NotesDbContext db,
    IHttpClientFactory httpClientFactory) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

    if (note == null) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(new { error = "Title is required" });

    if (request.Title.Length > 200)
        return Results.BadRequest(new { error = "Title must be under 200 characters" });

    note.Title = request.Title.Trim();
    note.Content = request.Content?.Trim() ?? string.Empty;
    note.Category = request.Category ?? "General";
    note.Color = request.Color;
    note.Tags = request.Tags;
    note.ReminderAt = request.ReminderAt;
    note.UpdatedAt = DateTime.UtcNow;

    try {
        var aiServiceBase = Environment.GetEnvironmentVariable("AI_SERVICE_URL")
            ?? "http://localhost:8000";
        using var httpClient = httpClientFactory.CreateClient();
        var summarizeUrl = aiServiceBase.TrimEnd('/') + "/summarize";
        var summarizeResponse = await httpClient.PostAsJsonAsync(summarizeUrl,
            new { text = request.Content });
        if (summarizeResponse.IsSuccessStatusCode) {
            var summarizeResult = await summarizeResponse.Content
                .ReadFromJsonAsync<SummarizeResult>();
            note.Summary = summarizeResult?.Summary ?? "";
        }
    } catch {
        note.Summary = "";
    }

    await db.SaveChangesAsync();
    return Results.Ok(note);
})
.RequireAuthorization();

app.MapPut("/notes/{id}/pin", async (
    Guid id,
    HttpContext context,
    NotesDbContext db) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
    if (note == null) return Results.NotFound();
    note.IsPinned = !note.IsPinned;
    await db.SaveChangesAsync();
    return Results.Ok(new { id = note.Id, isPinned = note.IsPinned });
}).RequireAuthorization();

app.MapDelete("/notes/{id}", async (
    Guid id,
    HttpContext context,
    NotesDbContext db) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
    
    if (note == null) return Results.NotFound();

    db.Notes.Remove(note);
    await db.SaveChangesAsync();

    return Results.NoContent();
})
.RequireAuthorization();

app.MapPost("/notes/scan", async (
    IFormFile file,
    IHttpClientFactory clientFactory,
    HttpContext context) =>
{
    var userId = AuthHelpers.GetUserId(context);
    if (userId == Guid.Empty) return Results.Unauthorized();

    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "No file uploaded" });

    const long maxFileSize = 10 * 1024 * 1024;
    if (file.Length > maxFileSize)
        return Results.BadRequest(new { error = "File size must be under 10MB" });

    var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp" };
    if (!allowedTypes.Contains(file.ContentType.ToLower()))
        return Results.BadRequest(new { error = "Only image files are allowed" });

    var source = context.Request.Form.TryGetValue("source", out var sourceVal) ? sourceVal.ToString() : "upload";

    var aiServiceBase = Environment.GetEnvironmentVariable("AI_SERVICE_URL")
        ?? "http://localhost:8000";
    var aiServiceUrl = aiServiceBase.TrimEnd('/') + $"/extract-text?source={Uri.EscapeDataString(source)}";

    using var memoryStream = new MemoryStream();
    await file.OpenReadStream().CopyToAsync(memoryStream);
    var fileBytes = memoryStream.ToArray();

    const int maxRetries = 3;
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            using var client = clientFactory.CreateClient();
            using var formContent = new MultipartFormDataContent();
            var streamContent = new StreamContent(new MemoryStream(fileBytes));
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
            formContent.Add(streamContent, "file", file.FileName);

            var response = await client.PostAsync(aiServiceUrl, formContent);

            if ((int)response.StatusCode == 429)
            {
                if (attempt < maxRetries - 1)
                {
                    await Task.Delay((attempt + 1) * 1000);
                    continue;
                }
                return Results.Json(new { error = "OCR service is busy. Please try again in a moment." }, statusCode: 503);
            }

            if (!response.IsSuccessStatusCode)
                return Results.Json(new { error = "OCR service failed" }, statusCode: 502);

            var jsonString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(jsonString);

            string extractedText = "";
            if (doc.RootElement.TryGetProperty("text", out var textElement))
                extractedText = textElement.GetString() ?? "";

            double? confidence = null;
            if (doc.RootElement.TryGetProperty("confidence", out var confElement) && confElement.ValueKind == JsonValueKind.Number)
                confidence = confElement.GetDouble();

            var words = new List<object>();
            if (doc.RootElement.TryGetProperty("words", out var wordsElement) && wordsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var w in wordsElement.EnumerateArray())
                {
                    var wText = w.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "";
                    var wConf = w.TryGetProperty("confidence", out var c) && c.ValueKind == JsonValueKind.Number ? c.GetDouble() : 0.0;
                    words.Add(new { text = wText, confidence = wConf });
                }
            }

            return Results.Ok(new { text = extractedText, confidence, words });
        }
        catch (Exception)
        {
            if (attempt < maxRetries - 1)
            {
                await Task.Delay((attempt + 1) * 1000);
                continue;
            }
            return Results.Problem("AI service is currently unavailable. Please try again later.");
        }
    }

    return Results.Problem("AI service is currently unavailable. Please try again later.");
})
.RequireAuthorization()
.DisableAntiforgery();

app.MapGet("/auth/me", async (HttpContext context, NotesDbContext db) =>
{
    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();

    var user = await db.Users.FindAsync(Guid.Parse(userId));
    if (user == null) return Results.NotFound();

    return Results.Ok(new
    {
        id = user.Id,
        email = user.Email,
        name = user.Name
    });
}).RequireAuthorization();

app.MapPost("/auth/register", async (RegisterRequest request, NotesDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        return Results.BadRequest(new { error = "Email and password are required" });

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { error = "Name is required" });

    var email = request.Email.Trim().ToLower();

    if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
        return Results.BadRequest(new { error = "Please enter a valid email address" });

    if (await db.Users.AnyAsync(u => u.Email == email))
        return Results.Conflict(new { error = "User already exists" });

    var user = new User
    {
        Id = Guid.NewGuid(),
        Name = request.Name.Trim(),
        Email = email,
        PasswordHash = PasswordHasher.Hash(request.Password),
        CreatedAt = DateTime.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created("/auth/register", new { user.Id, user.Email, user.Name });
});

app.MapPost("/auth/login", async (LoginRequest request, NotesDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        return Results.BadRequest(new { error = "Email and password are required" });

    var email = request.Email.Trim().ToLower();

    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user == null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        return Results.Unauthorized();

    var tokenHandler = new JwtSecurityTokenHandler();
    var key = keyBytes;
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()) }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    var tokenString = tokenHandler.WriteToken(token);

    return Results.Ok(new
    {
        token = tokenString,
        name = user.Name,
        user = new { user.Id, user.Email }
    });
});

app.MapPost("/ocr/feedback", async (
    HttpContext context,
    NotesDbContext db,
    OcrFeedbackRequest request) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var feedback = new OcrFeedback
    {
        UserId = userId,
        ExtractedText = request.ExtractedText,
        Engine = request.Engine ?? "azure_vision",
        Confidence = request.Confidence,
        IsAccurate = request.IsAccurate,
        CorrectedText = request.CorrectedText
    };
    db.OcrFeedbacks.Add(feedback);
    await db.SaveChangesAsync();
    return Results.Ok(new { success = true });
}).RequireAuthorization();

app.MapGet("/ocr/stats", async (
    HttpContext context,
    NotesDbContext db) =>
{
    var userId = AuthHelpers.GetUserId(context);
    var feedbacks = await db.OcrFeedbacks
        .Where(f => f.UserId == userId)
        .ToListAsync();

    var total = feedbacks.Count;
    var accurate = feedbacks.Count(f => f.IsAccurate);
    var avgConfidence = feedbacks.Any(f => f.Confidence.HasValue)
        ? feedbacks.Where(f => f.Confidence.HasValue).Average(f => f.Confidence!.Value)
        : 0;

    return Results.Ok(new {
        total,
        accurate,
        inaccurate = total - accurate,
        accuracyRate = total > 0 ? Math.Round((double)accurate / total * 100, 1) : 0,
        avgConfidence = Math.Round(avgConfidence, 1)
    });
}).RequireAuthorization();

// Background keepalive for OCR service
var httpClientFactory = app.Services.GetRequiredService<IHttpClientFactory>();
_ = Task.Run(async () => {
    var aiServiceUrl = Environment.GetEnvironmentVariable("AI_SERVICE_URL")
        ?? "http://localhost:8000";
    while (true) {
        await Task.Delay(TimeSpan.FromMinutes(10));
        try {
            using var client = httpClientFactory.CreateClient();
            await client.GetAsync(aiServiceUrl.TrimEnd('/') + "/health");
        } catch { }
    }
});

app.Run();

record SummarizeResult(string Summary);