'use client';

import { useState, useEffect } from 'react';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Load entries from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedEntries = localStorage.getItem('journalEntries');
        if (savedEntries) {
          setEntries(JSON.parse(savedEntries));
        }
      } catch (error) {
        console.error('Error loading entries from localStorage:', error);
      }
    }
  }, []);

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('journalEntries', JSON.stringify(entries));
      } catch (error) {
        console.error('Error saving entries to localStorage:', error);
      }
    }
  }, [entries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: prevent empty title or content
    if (!title.trim() || !content.trim()) {
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setEntries([newEntry, ...entries]);
    setTitle('');
    setContent('');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-zinc-50 mb-2">
            My Journal
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Capture your thoughts and memories
          </p>
        </header>

        {/* Entry Form */}
        <form onSubmit={handleSubmit} className="mb-12 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Entry
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts here..."
                rows={6}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:border-transparent transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Entry
            </button>
          </div>
        </form>

        {/* Entries Display Area */}
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                No entries yet. Start writing your first journal entry!
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
                    {entry.title}
                  </h2>
                  <time className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatTimestamp(entry.timestamp)}
                  </time>
                </div>
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
