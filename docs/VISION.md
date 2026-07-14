# Jot It Vision

> **Jot It is an AI-powered knowledge workspace that helps people
> capture, organize, understand, and rediscover everything they learn.**

------------------------------------------------------------------------

# Mission

Our mission is to make capturing knowledge effortless and retrieving it
intuitive.

Rather than functioning as another note-taking application, Jot It aims
to become a personal knowledge workspace where information from
different sources comes together in one intelligent system. Every
interaction should reduce friction, encourage curiosity, and help users
make better use of what they already know.

------------------------------------------------------------------------

# Problem Statement

People collect information everywhere---lecture notes, screenshots,
PDFs, handwritten pages, voice recordings, bookmarks, and quick ideas.
Over time this information becomes scattered across multiple
applications and devices.

Traditional note-taking applications focus on storing information. They
expect users to manually organize folders, tags, and pages before the
information becomes useful.

Jot It solves this by bringing knowledge into one workspace where AI
helps organize, connect, and retrieve information naturally.

------------------------------------------------------------------------

# Target Audience

Jot It is designed for people who continuously learn, create, and
organize information.

Primary users include:

-   Students managing lectures, assignments, handwritten notes, and
    study material.
-   Professionals organizing meeting notes, research, and documents.
-   Creators collecting inspiration, articles, screenshots, and ideas.
-   Anyone who wants a smarter way to manage personal knowledge.

------------------------------------------------------------------------

# Why Jot It?

Jot It is not designed to compete by offering more features than
traditional note-taking applications.

Instead, it focuses on reducing the effort required to capture and
rediscover knowledge.

Unlike conventional note apps, Jot It emphasizes:

-   Intelligent organization instead of manual folder management.
-   Natural language retrieval instead of keyword-only search.
-   AI-assisted understanding instead of simple storage.
-   A calm, minimal interface that keeps users focused.

The goal is to make information feel connected rather than isolated.

------------------------------------------------------------------------

# Non Goals

Jot It is defined as much by what it refuses to be as by what it is.
Every "no" below protects the calm, focused experience described above.
If a proposed feature pulls Jot It toward one of these categories, it
should be rejected or redesigned.

## Jot It is NOT a replacement for Google Docs

Jot It is not a long-form document editor built around pagination,
print layout, comments, and heavy collaborative formatting. Notes are
meant to be captured quickly and rediscovered intelligently, not
laid out like publishable documents. Optimizing for document
production would reintroduce exactly the friction the product exists
to remove.

## Jot It is NOT a project management tool

There are no boards, sprints, Gantt charts, assignees, or workflow
states. Lightweight reminders exist to support memory, not to turn the
workspace into a task tracker. Project management tools optimize for
coordinating teams and deadlines; Jot It optimizes for an individual's
thinking and recall.

## Jot It is NOT another Notion clone

Jot It intentionally avoids the "build-your-own-app" model of nested
databases, custom properties, and infinitely configurable blocks. That
flexibility comes at the cost of setup effort and decision fatigue.
Jot It favors intelligent defaults and AI-driven organization so users
spend their energy thinking, not configuring.

## Jot It is NOT a wiki

Jot It is a personal knowledge workspace, not a shared, hierarchically
structured encyclopedia maintained by manual cross-linking. Where a
wiki asks users to author and maintain structure, Jot It infers
structure — connections, related notes, and clusters emerge from AI
rather than from manual page trees.

## Jot It is NOT a generic AI chatbot

The AI in Jot It is always grounded in the user's own knowledge. It is
not a general-purpose assistant for answering arbitrary world
questions, generating unrelated content, or role-play. When the AI
answers, it answers *from the user's notes*. A generic chatbot would
dilute trust and blur the product's single promise: help you remember
and understand what you already captured.

> **Rule of thumb:** if a feature would make Jot It feel like a
> document editor, a task tracker, a configurable database, a shared
> wiki, or an open-domain chatbot, it is out of scope.

------------------------------------------------------------------------

# Core Principles

## 1. Capture Effortlessly

Ideas should never be lost because saving them takes too long.

Whether users type, draw, speak, upload a document, or scan handwritten
notes, capturing information should feel immediate.

------------------------------------------------------------------------

## 2. Organize Intelligently

Users should spend their time learning, not managing folders.

Jot It should automatically understand context, group related
information, suggest organization, and surface relevant content when
needed.

------------------------------------------------------------------------

## 3. Help Users Remember

Knowledge is valuable only when it can be retrieved.

Jot It should help users rediscover information naturally through
AI-powered search, contextual recommendations, summaries, flashcards,
and intelligent connections.

------------------------------------------------------------------------

# First-Time User Experience

Within the first thirty seconds, a new user should feel:

-   Calm.
-   Curious.
-   Confident.
-   Productive.

The interface should never overwhelm users with unnecessary controls or
complicated workflows.

Instead, users should immediately understand where to begin and feel
confident that the application will adapt to their workflow rather than
forcing them to adapt to it.

The desired reaction is:

> "This feels clean. I know exactly what to do."

------------------------------------------------------------------------

# Design Philosophy

Every interface decision should follow these principles:

-   Minimal before decorative.
-   Motion should communicate purpose.
-   Simplicity should never reduce capability.
-   White space is a feature.
-   Performance is part of the design.
-   AI should assist without interrupting.

The interface should feel modern, calm, and intentional while remaining
highly responsive and enjoyable to use.

------------------------------------------------------------------------

# Product Principles

Every new feature should satisfy at least one of these goals:

-   Reduce friction.
-   Save users time.
-   Improve knowledge discovery.
-   Help users remember.
-   Keep interactions intuitive.
-   Respect user privacy.
-   Make AI feel invisible rather than intrusive.

If a feature does not improve the user's workflow, it should not be
added.

------------------------------------------------------------------------

# Long-Term Vision

Jot It should evolve from a notes application into an **AI-first
knowledge workspace** — a system where capture, organization,
understanding, and retrieval are all mediated by intelligence rather
than by manual effort.

The distinction matters. A notes application stores what you write. An
AI-first knowledge workspace *understands* what you write and actively
helps you use it: it connects related ideas, answers questions grounded
in your own material, resurfaces what you forgot, and turns passive
notes into active knowledge.

## The V2 thesis

Version 2 reorients the product around a single technical foundation:
**an embedding pipeline that turns every note into a searchable,
connectable unit of knowledge.** This foundation is designed once and
reused everywhere. It is the shared substrate for:

-   **Semantic search** — meaning-based retrieval, not keyword matching.
-   **Chat with notes (RAG)** — conversational answers grounded strictly
    in the user's own content.
-   **Related notes** — automatic surfacing of connected ideas.
-   **Flashcards & quizzes** — study material generated from what the
    user already captured.
-   **Knowledge graph** — a navigable map of how the user's ideas relate.

Because these features all consume the same retrieval layer, Jot It can
grow its intelligence without repeatedly re-architecting its core. See
[AI.md](./AI.md) for the technical design and
[ARCHITECTURE.md](./Architecture.md) for how the pipeline fits the
system.

## Future capabilities

The following capabilities extend the workspace over time. All are
**planned (V2 and beyond)** and are not yet implemented:

-   Semantic search
-   Chat with notes (RAG)
-   Related notes and automatic note linking
-   AI-generated flashcards and quizzes
-   Knowledge graph visualization
-   Intelligent collections and folders
-   Voice notes and transcription
-   Web clipping
-   Cross-device synchronization
-   Offline support
-   Real-time collaboration (long-term)

The sequencing of these capabilities is defined in
[ROADMAP.md](./Roadmap.md). The guiding constraint never changes:
**every capability must reduce friction, aid recall, or deepen
understanding** — and none may compromise the calm, focused experience.

------------------------------------------------------------------------

# Success Metrics

Jot It succeeds when users:

-   Capture ideas without hesitation.
-   Find information within seconds.
-   Rely on the application daily.
-   Spend less time organizing and more time thinking.

The ultimate goal is simple:

> **Capture less. Remember more.**
