FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/NotesApi/NotesApi.csproj .
RUN dotnet restore
COPY backend/NotesApi/ .
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
CMD ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet NotesApi.dll
