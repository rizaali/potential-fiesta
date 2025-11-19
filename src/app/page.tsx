'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import EntryModal from '@/components/EntryModal';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { buildKnowledgeGraph } from '@/lib/graphUtils';

// Prevent static generation since we need client-side data fetching
export const dynamic = 'force-dynamic';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  embedding?: number[];
}

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // Test Supabase connection on mount
  useEffect(() => {
    testSupabaseConnection();
    loadEntries();
  }, []);

  const testSupabaseConnection = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Skip test if using placeholder values
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || !supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
      console.warn('⚠️ Supabase connection test skipped: Using placeholder values');
      console.warn('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables');
      return;
    }

    try {
      console.log('🔍 Testing Supabase connection...');
      console.log('URL:', supabaseUrl);
      
      // Test with a simple count query to the journal_entries table
      const testUrl = `${supabaseUrl}/rest/v1/journal_entries?select=count`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Supabase connection test successful!');
        console.log('Response data:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ Supabase connection test failed!');
        console.error('Status:', response.status);
        console.error('Status text:', response.statusText);
        console.error('Error response:', errorText);
      }
    } catch (error: any) {
      console.error('❌ Supabase connection test error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        console.error('💡 This looks like a network/DNS error. Check:');
        console.error('   1. Is the Supabase URL correct?');
        console.error('   2. Are you connected to the internet?');
        console.error('   3. Is there a CORS issue?');
      }
    }
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, title, content, created_at, embedding')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading entries:', error);
        return;
      }

      if (data) {
        // Convert embedding arrays from database format if needed
        const processedData = data.map(entry => ({
          ...entry,
          embedding: entry.embedding || undefined,
        }));
        setEntries(processedData);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (entryData: { title: string; content: string }) => {
    if (modalMode === 'create') {
      // Create new entry via API route (which generates embeddings)
      try {
        console.log('[Frontend] Creating journal entry via API route...');
        
        const response = await fetch('/api/journal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: entryData.title,
            content: entryData.content,
          }),
        });

        // Check response status BEFORE parsing JSON
        if (!response.ok) {
          // Handle specific HTTP status codes
          if (response.status === 405) {
            const errorText = await response.text().catch(() => 'Method Not Allowed');
            console.error('[Frontend] 405 Method Not Allowed:', errorText);
            alert('API route error: Method not allowed. The server may not be recognizing the POST method. Please check the deployment logs.');
            return;
          }

          // Try to parse error response as JSON, but handle non-JSON responses
          let errorData;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = await response.json();
            } catch (parseError) {
              console.error('[Frontend] Failed to parse error response as JSON:', parseError);
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
          } else {
            const errorText = await response.text().catch(() => response.statusText);
            errorData = { error: `HTTP ${response.status}: ${errorText || response.statusText}` };
          }

          console.error('[Frontend] API error:', errorData);
          alert(`Failed to create entry: ${errorData.error || errorData.details || `HTTP ${response.status} error`}. Please check the browser console for details.`);
          return;
        }

        // Response is OK, parse JSON
        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          console.error('[Frontend] Failed to parse success response as JSON:', parseError);
          alert('Server returned an invalid response. Please try again.');
          return;
        }

        if (result.success && result.data) {
          console.log('[Frontend] Entry created successfully with embedding');
          // Reload entries to get the updated data
          await loadEntries();
        } else {
          throw new Error('Unexpected response format from API');
        }
      } catch (error: any) {
        console.error('[Frontend] Error creating entry:', error);
        console.error('[Frontend] Error stack:', error.stack);
        if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
          alert('Network error: Unable to connect to the API. Please check your internet connection.');
        } else if (error.message?.includes('JSON') || error.message?.includes('Unexpected end')) {
          alert('Server response error: The server returned an invalid response. Please check the deployment logs.');
        } else {
          alert(`Failed to create entry: ${error.message || 'Unknown error'}. Please check the browser console for details.`);
        }
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
    
    // Happy - Yellow
    if (textToCheck.includes('happy')) {
      return {
        card: 'bg-yellow-200 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600',
        text: 'text-yellow-900 dark:text-yellow-100',
        textSecondary: 'text-yellow-800 dark:text-yellow-200',
        icon: 'text-yellow-800 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100',
        emoji: '😊',
      };
    }
    
    // Sad - Blue
    if (textToCheck.includes('sad')) {
      return {
        card: 'bg-blue-200 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600',
        text: 'text-blue-900 dark:text-blue-100',
        textSecondary: 'text-blue-800 dark:text-blue-200',
        icon: 'text-blue-800 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100',
        emoji: '😢',
      };
    }
    
    // Angry - Red
    if (textToCheck.includes('angry')) {
      return {
        card: 'bg-red-200 dark:bg-red-900/40 border-red-400 dark:border-red-600',
        text: 'text-red-900 dark:text-red-100',
        textSecondary: 'text-red-800 dark:text-red-200',
        icon: 'text-red-800 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100',
        emoji: '😠',
      };
    }
    
    // Sleepy - White
    if (textToCheck.includes('sleepy')) {
      return {
        card: 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600',
        text: 'text-zinc-900 dark:text-zinc-100',
        textSecondary: 'text-zinc-700 dark:text-zinc-300',
        icon: 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100',
        emoji: '😴',
      };
    }
    
    // Jealous - Green
    if (textToCheck.includes('jealous')) {
      return {
        card: 'bg-green-200 dark:bg-green-900/40 border-green-400 dark:border-green-600',
        text: 'text-green-900 dark:text-green-100',
        textSecondary: 'text-green-800 dark:text-green-200',
        icon: 'text-green-800 hover:text-green-900 dark:text-green-200 dark:hover:text-green-100',
        emoji: '😤',
      };
    }
    
    // Royal - Purple
    if (textToCheck.includes('royal')) {
      return {
        card: 'bg-purple-200 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600',
        text: 'text-purple-900 dark:text-purple-100',
        textSecondary: 'text-purple-800 dark:text-purple-200',
        icon: 'text-purple-800 hover:text-purple-900 dark:text-purple-200 dark:hover:text-purple-100',
        emoji: '👑',
      };
    }
    
    // Default/Neutral
    return {
      card: 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
      text: 'text-black dark:text-zinc-50',
      textSecondary: 'text-zinc-500 dark:text-zinc-400',
      icon: 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
      emoji: null,
    };
  };

  // Build knowledge graph data
  // Uses cosine similarity to compare all entry pairs
  // Connections are deterministic (same entries = same connections)
  const graphData = useMemo<{ nodes: any[]; links: any[] }>(() => {
    if (viewMode === 'graph' && entries.length > 0) {
      // Use minSimilarity of 0.01 (1%) to show all connections from 1% to 100% similarity
      return buildKnowledgeGraph(entries, 0.01) as { nodes: any[]; links: any[] };
    }
    return { nodes: [], links: [] };
  }, [entries, viewMode]);

  // Handle node click in graph
  const handleNodeClick = (node: any) => {
    const entry = entries.find(e => e.id === node.id);
    if (entry) {
      handleEdit(entry);
    }
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
          <div className="flex gap-3">
            {/* View Toggle */}
            <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Graph
              </button>
            </div>
            <button
              onClick={handleNewEntry}
              className="px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-black font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              + New Entry
            </button>
          </div>
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
          ) : viewMode === 'graph' ? (
            <div className="relative">
              <KnowledgeGraph
                nodes={graphData.nodes}
                links={graphData.links}
                onNodeClick={handleNodeClick}
              />
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
                      className={`flex-shrink-0 w-80 rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all relative ${emotionClasses.card}`}
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

                      {emotionClasses.emoji && (
                        <div className="absolute bottom-4 right-4 text-3xl">
                          {emotionClasses.emoji}
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
