'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EntryModal from '@/components/EntryModal';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  summary?: string | null;
  emotion?: string | null;
}

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Load entries from Supabase on mount
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading entries:', error);
        return;
      }

      if (data) {
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEntry = async (content: string): Promise<{ summary: string; emotion: string }> => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to analyze entry');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error analyzing entry:', error);
      // Return default values instead of throwing, so entry still gets saved
      return {
        summary: 'Analysis unavailable',
        emotion: 'neutral',
      };
    }
  };

  const handleSave = async (entryData: { title: string; content: string }) => {
    if (modalMode === 'create') {
      // Create new entry
      try {
        const { data: newEntry, error } = await supabase
          .from('journal_entries')
          .insert([
            {
              title: entryData.title,
              content: entryData.content,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Error creating entry:', error);
          alert('Failed to create entry. Please try again.');
          return;
        }

        if (newEntry) {
          // Optional: Analyze the entry for summary only (emotion is detected from keywords)
          try {
            const analysis = await analyzeEntry(entryData.content);

            // Update entry with summary only (emotion detected from keywords in content)
            await supabase
              .from('journal_entries')
              .update({
                summary: analysis.summary,
              })
              .eq('id', newEntry.id);
          } catch (error) {
            // If analysis fails, entry is still saved - emotion will be detected from keywords
            console.error('Analysis failed, but entry saved:', error);
          }

          // Reload entries to get the updated data
          await loadEntries();
        }
      } catch (error) {
        console.error('Error creating entry:', error);
        alert('Failed to create entry. Please try again.');
      }
    } else {
      // Edit existing entry
      if (!editingEntry) return;

      try {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            title: entryData.title,
            content: entryData.content,
          })
          .eq('id', editingEntry.id);

        if (error) {
          console.error('Error updating entry:', error);
          alert('Failed to update entry. Please try again.');
          return;
        }

        // Re-analyze the entry for summary if content changed (emotion detected from keywords)
        if (entryData.content !== editingEntry.content) {
          try {
            const analysis = await analyzeEntry(entryData.content);

            await supabase
              .from('journal_entries')
              .update({
                summary: analysis.summary,
              })
              .eq('id', editingEntry.id);
          } catch (error) {
            // If analysis fails, entry is still updated - emotion will be detected from keywords
            console.error('Analysis failed, but entry updated:', error);
          }
        }

        await loadEntries();
        setEditingEntry(null);
      } catch (error) {
        console.error('Error updating entry:', error);
        alert('Failed to update entry. Please try again.');
      }
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry. Please try again.');
        return;
      }

      await loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setModalMode('create');
    setIsModalOpen(true);
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

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getEmotionCardClasses = (title: string, content: string) => {
    // Combine title and content to check for keywords
    const textToCheck = `${title} ${content}`.toLowerCase();
    
    // Happy - Yellow (check if content contains "happy")
    if (textToCheck.includes('happy')) {
      return {
        card: 'bg-yellow-200 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600',
        text: 'text-yellow-900 dark:text-yellow-100',
        textSecondary: 'text-yellow-800 dark:text-yellow-200',
        icon: 'text-yellow-800 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100',
      };
    }
    
    // Sad - Blue (check if content contains "sad")
    if (textToCheck.includes('sad')) {
      return {
        card: 'bg-blue-200 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600',
        text: 'text-blue-900 dark:text-blue-100',
        textSecondary: 'text-blue-800 dark:text-blue-200',
        icon: 'text-blue-800 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100',
      };
    }
    
    // Default/Neutral
    return {
      card: 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
      text: 'text-black dark:text-zinc-50',
      textSecondary: 'text-zinc-500 dark:text-zinc-400',
      icon: 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
    };
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-zinc-50 mb-2">
              My Journal
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Capture your thoughts and memories
            </p>
          </div>
          <button
            onClick={handleNewEntry}
            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            + New Entry
          </button>
        </header>

        {/* Horizontal Scrollable Wheel */}
        <div className="mb-8">
          {loading ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                Loading entries...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                No entries yet. Start writing your first journal entry!
              </p>
            </div>
          ) : (
            <div 
              className="overflow-x-auto pb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
              onWheel={(e) => {
                const element = e.currentTarget;
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  element.scrollLeft += e.deltaY;
                  e.preventDefault();
                }
              }}
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="flex gap-6 min-w-max">
                {entries.map((entry) => {
                  const emotionClasses = getEmotionCardClasses(entry.title, entry.content);
                  return (
                    <article
                      key={entry.id}
                      className={`flex-shrink-0 w-80 rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all ${emotionClasses.card}`}
                    >
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h2 className={`text-xl font-semibold pr-2 flex-1 ${emotionClasses.text}`}>
                            {entry.title}
                          </h2>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(entry)}
                              className={`transition-colors ${emotionClasses.icon}`}
                              aria-label="Edit entry"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              aria-label="Delete entry"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <time className={`text-xs block mb-3 ${emotionClasses.textSecondary}`}>
                          {formatTimestamp(entry.created_at)}
                        </time>
                      </div>

                      <div className="mb-4">
                        <p className={`text-sm leading-relaxed mb-3 ${emotionClasses.text}`}>
                          {truncateContent(entry.content)}
                        </p>
                      </div>

                      {entry.summary && (
                        <div className={`mb-3 p-3 rounded-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                          <p className={`text-xs font-medium mb-1 ${emotionClasses.textSecondary}`}>
                            Summary
                          </p>
                          <p className={`text-sm ${emotionClasses.text}`}>
                            {entry.summary}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      <EntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        entry={editingEntry}
        mode={modalMode}
      />
    </div>
  );
}
