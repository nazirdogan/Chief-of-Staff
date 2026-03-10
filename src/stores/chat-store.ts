import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  updated_at: string;
  is_favorite: boolean;
}

interface ChatStore {
  // Messages for the currently active conversation (in-memory)
  messages: ChatMessage[];
  isLoading: boolean;       // true while waiting for AI response
  historyLoading: boolean;  // true while fetching conversation history
  memoryPanelOpen: boolean;

  // Conversation state
  currentConversationId: string | null;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;

  // Actions
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  clearMessages: () => void;
  toggleMemoryPanel: () => void;

  // Conversation actions
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  historyLoading: false,
  memoryPanelOpen: false,

  currentConversationId: null,
  conversations: [],
  conversationsLoading: false,

  // ── Conversation list ────────────────────────────────────────────────────

  loadConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
      const data = await res.json();
      set({
        conversations: (data.conversations ?? []) as ConversationSummary[],
        conversationsLoading: false,
      });
    } catch {
      set({ conversationsLoading: false });
    }
  },

  loadConversation: async (id: string) => {
    set({ historyLoading: true, messages: [] });
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      if (!res.ok) throw new Error(`Failed to load conversation: ${res.status}`);
      const data = await res.json();

      const messages: ChatMessage[] = (data.conversation.messages ?? []).map(
        (m: { id: string; role: 'user' | 'assistant'; content: string; created_at: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        })
      );

      set({
        currentConversationId: id,
        messages,
        historyLoading: false,
      });
    } catch {
      set({ historyLoading: false });
    }
  },

  startNewConversation: () => {
    set({ currentConversationId: null, messages: [] });
  },

  // ── Message sending ──────────────────────────────────────────────────────

  sendMessage: async (content: string, files?: File[]) => {
    // Build display content for the optimistic message
    const displayContent = content.trim()
      || (files && files.length > 0 ? `📎 ${files.map((f) => f.name).join(', ')}` : '');

    const optimisticUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: displayContent,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticUserMessage],
      isLoading: true,
    }));

    try {
      let conversationId = get().currentConversationId;

      // If no active conversation, create one first
      if (!conversationId) {
        const createRes = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!createRes.ok) {
          throw new Error(`Failed to create conversation: ${createRes.status}`);
        }

        const createData = await createRes.json();
        conversationId = createData.conversation.id as string;
        set({ currentConversationId: conversationId });
      }

      // Build request — FormData when files are attached, JSON otherwise
      let fetchInit: RequestInit;
      if (files && files.length > 0) {
        const form = new FormData();
        form.append('content', content.trim());
        files.forEach((file) => form.append('files', file, file.name));
        fetchInit = { method: 'POST', body: form };
      } else {
        fetchInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        };
      }

      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        fetchInit,
      );

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Replace the optimistic user message with the persisted one, then add assistant reply
      const persistedUserMessage: ChatMessage = {
        id: data.userMessage.id,
        role: 'user',
        content: data.userMessage.content,
        timestamp: data.userMessage.created_at,
      };

      const assistantMessage: ChatMessage = {
        id: data.assistantMessage.id,
        role: 'assistant',
        content: data.assistantMessage.content,
        timestamp: data.assistantMessage.created_at,
      };

      set((state) => ({
        // Swap out the optimistic message for the real one and append assistant reply
        messages: [
          ...state.messages.filter((m) => m.id !== optimisticUserMessage.id),
          persistedUserMessage,
          assistantMessage,
        ],
        isLoading: false,
      }));

      // Refresh the sidebar conversation list so the updated_at / title change is reflected
      get().loadConversations();
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          error instanceof Error
            ? `Sorry, something went wrong: ${error.message}`
            : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  renameConversation: async (id: string, title: string) => {
    // Optimistic update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
    await fetch(`/api/chat/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  },

  toggleFavorite: async (id: string) => {
    const current = get().conversations.find((c) => c.id === id);
    if (!current) return;
    const newVal = !current.is_favorite;
    // Optimistic update + re-sort
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === id ? { ...c, is_favorite: newVal } : c
      );
      return {
        conversations: updated.sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
      };
    });
    await fetch(`/api/chat/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: newVal }),
    });
  },

  deleteConversation: async (id: string) => {
    // Optimistic remove
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
    await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
  },

  clearMessages: () => set({ messages: [] }),

  toggleMemoryPanel: () =>
    set((state) => ({ memoryPanelOpen: !state.memoryPanelOpen })),
}));
