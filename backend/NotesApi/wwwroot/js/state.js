// Shared mutable app state (extracted from index.html, verbatim).
    export let state = {
        token: localStorage.getItem('token'),
        name: localStorage.getItem('name'),
        email: localStorage.getItem('email') || '',
        notes: [],
        editingId: null,
        category: 'all',
        recentOnly: false
    };
    export let drawingState = {
        isDrawing: false,
        tool: 'pen',
        penColor: '#000000',
        penSize: 4,
        canvas: null,
        ctx: null,
        listenersReady: false,
        strokeHistory: [],
        currentStroke: null
    };
