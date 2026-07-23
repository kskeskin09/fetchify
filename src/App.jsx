import React, { useState, useEffect, useRef } from 'react';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

function MarqueeTitle({ text, className = 'card-title-container', scrollClass = 'card-title-scroll' }) {
  const containerRef = React.useRef(null);
  const textRef = React.useRef(null);
  const [overflows, setOverflows] = React.useState(false);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const check = () => {
      setOverflows(textEl.scrollWidth > container.clientWidth);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`${className}${overflows ? ' is-overflowing' : ''}`}>
      <div className={scrollClass}>
        <span ref={textRef} className="card-title-text">{text}</span>
        {overflows && (
          <>
            <span className="card-title-spacer secondary-text">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            <span className="card-title-text secondary-text">{text}</span>
            <span className="card-title-spacer secondary-text">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [musicOnly, setMusicOnly] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [trackOptions, setTrackOptions] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [createSubfolder, setCreateSubfolder] = useState(true);
  const [defaultAudioQuality, setDefaultAudioQuality] = useState('best');
  const [defaultVideoQuality, setDefaultVideoQuality] = useState('best');
  const [downloadPath, setDownloadPath] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const triggeredDownloads = useRef(new Set());

  useEffect(() => {
    fetch('/api/announcement')
      .then((res) => res.json())
      .then((data) => setAnnouncement(data.message))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/progress');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const triggerBrowserDownload = (item) => {
          if (item.status === 'completed' && !triggeredDownloads.current.has(item.id)) {
            triggeredDownloads.current.add(item.id);
            const link = document.createElement('a');
            link.href = `/api/download-file?id=${item.id}`;
            link.setAttribute('download', '');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        };

        if (Array.isArray(data)) {
          setQueue((prev) => {
            const updated = [...prev];
            data.forEach((backendItem) => {
              const idx = updated.findIndex((q) => q.id === backendItem.id);
              if (idx > -1) {
                updated[idx] = { ...updated[idx], ...backendItem };
              } else {
                updated.push(backendItem);
              }
              triggerBrowserDownload(backendItem);
            });
            return updated;
          });
        } else {
          setQueue((prev) => {
            const idx = prev.findIndex((q) => q.id === data.id);
            if (idx > -1) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...data };
              return updated;
            } else {
              return [...prev, data];
            }
          });
          triggerBrowserDownload(data);
        }
      } catch (err) {
        console.error('Error parsing SSE progress data:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&musicOnly=${musicOnly}`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, musicOnly]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.options-dropdown-container') && !e.target.closest('.download-split-btn')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getQualityLabel = (format, quality) => {
    if (format === 'mp3') {
      if (quality === 'best') return '320K';
      if (quality === 'high') return '256K';
      if (quality === 'medium') return '192K';
      return '128K';
    } else {
      if (quality === 'best') return '1080P+';
      if (quality === 'high') return '1080P';
      if (quality === 'medium') return '720P';
      return '480P';
    }
  };

  const handleDownload = async (track, options = { format: 'mp3', quality: 'best' }) => {
    setQueue((prev) => {
      const exists = prev.some((item) => item.id === track.id);
      if (exists) {
        return prev.map((item) =>
          item.id === track.id
            ? { ...item, status: 'downloading', progress: 0, format: options.format, quality: options.quality }
            : item
        );
      }
      return [
        ...prev,
        {
          id: track.id,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          format: options.format,
          quality: options.quality,
          progress: 0,
          status: 'downloading',
          error: null,
        },
      ];
    });

    try {
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: track.id,
          title: track.title,
          format: options.format,
          quality: options.quality,
          downloadPath,
          createSubfolder,
        }),
      });
    } catch (error) {
      console.error('Download initiation error:', error);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === track.id
            ? { ...item, status: 'failed', error: 'Could not connect to server' }
            : item
        )
      );
    }
  };

  const addToQueue = (track, options = { format: 'mp3', quality: 'best' }) => {
    setQueue((prev) => {
      const exists = prev.some((item) => item.id === track.id);
      if (exists) return prev;
      return [
        ...prev,
        {
          id: track.id,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          format: options.format,
          quality: options.quality,
          progress: 0,
          status: 'queued',
          error: null,
        },
      ];
    });
  };

  const startQueuedDownload = async (item) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'downloading', progress: 0 } : q))
    );

    try {
      await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          format: item.format || 'mp3',
          quality: item.quality || 'best',
          downloadPath,
          createSubfolder,
        }),
      });
    } catch (error) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'failed', error: 'Could not connect to server' }
            : q
        )
      );
    }
  };

  const updateQueueItemOptions = (id, newOptions) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...newOptions } : item))
    );
  };

  const downloadAllQueued = () => {
    const queuedItems = queue.filter((item) => item.status === 'queued');
    queuedItems.forEach((item) => {
      startQueuedDownload(item);
    });
  };

  const removeFromQueue = (id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed' && item.status !== 'failed'));
  };

  const clearAllQueue = () => {
    setQueue([]);
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      {announcement && (
        <div className="announcement-badge">
          <span className="announcement-pulse"></span>
          <span className="announcement-text">{announcement}</span>
        </div>
      )}

      <header className="app-header">
        <div className="app-title-container">
          <svg className="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
          <h1>Fetchify</h1>
        </div>
        <p>Search and download YouTube tracks directly to your device as MP3 or MP4</p>
      </header>

      <aside className="presets-container">
        <div className="presets-panel glass-panel">
          <div className="presets-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Presets</h2>
          </div>

          <div className="preset-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Audio (MP3)</label>
            <select
              className="select-input"
              value={defaultAudioQuality}
              onChange={(e) => setDefaultAudioQuality(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="best">Best (320K)</option>
              <option value="high">High (256K)</option>
              <option value="medium">Medium (192K)</option>
              <option value="low">Low (128K)</option>
            </select>
          </div>

          <div className="preset-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Video (MP4)</label>
            <select
              className="select-input"
              value={defaultVideoQuality}
              onChange={(e) => setDefaultVideoQuality(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="best">Best (1080P+)</option>
              <option value="high">High (1080P)</option>
              <option value="medium">Medium (720P)</option>
              <option value="low">Low (480P)</option>
              <option value="360p">360P</option>
              <option value="240p">240P</option>
              <option value="144p">144P</option>
            </select>
          </div>
        </div>
      </aside>

      <section className="search-section glass-panel">
        <div className="search-wrapper">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search artist, song, or video..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} title="Clear Search">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>

          <div className="search-filters">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={musicOnly}
                onChange={(e) => setMusicOnly(e.target.checked)}
              />
              <div className="checkbox-custom"></div>
              <span>Music Only</span>
            </label>

            <div className="layout-toggle-container">
              <button
                className={`btn btn-secondary btn-icon-only ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              <button
                className={`btn btn-secondary btn-icon-only ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="settings-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', alignItems: 'center' }}>
            <label className="checkbox-label" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={createSubfolder}
                onChange={(e) => setCreateSubfolder(e.target.checked)}
              />
              <div className="checkbox-custom"></div>
              <span style={{ fontSize: '0.8rem' }}>Save to 'Fetchify' subfolder in Downloads</span>
            </label>
          </div>
        </div>
      </section>

      <main className="results-container">
        {isLoading ? (
          <div className="loading-container glass-panel">
            <div className="spinner"></div>
            <p>Searching YouTube...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className={`results-grid ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {searchResults.map((track) => {
              const isInQueue = queue.some((item) => item.id === track.id);
              const queueItem = queue.find((item) => item.id === track.id);
              const isDownloading = queueItem && (queueItem.status === 'downloading' || queueItem.status === 'transcoding');

              const trackOptionsRecord = trackOptions[track.id];
              const trackFormat = trackOptionsRecord?.format || 'mp3';
              const options = trackOptionsRecord || {
                format: trackFormat,
                quality: trackFormat === 'mp3' ? defaultAudioQuality : defaultVideoQuality,
              };
              const isDropdownOpen = activeDropdown === track.id;

              const handleOptionChange = (key, value) => {
                setTrackOptions((prev) => {
                  const prevOpt = prev[track.id] || {
                    format: 'mp3',
                    quality: defaultAudioQuality,
                  };
                  const newOpt = { ...prevOpt, [key]: value };
                  if (key === 'format') {
                    newOpt.quality = value === 'mp3' ? defaultAudioQuality : defaultVideoQuality;
                  }
                  return { ...prev, [track.id]: newOpt };
                });
              };

              return (
                <div key={track.id} className={`music-card ${activeDropdown === track.id ? 'active-card' : ''}`}>
                  <div className="card-thumbnail-container">
                    <img className="card-thumbnail" src={track.thumbnail} alt={track.title} loading="lazy" />
                    <span className="duration-tag">{formatDuration(track.duration)}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-text-container">
                      <MarqueeTitle text={track.title} />
                      <div className="card-artist" title={track.artist}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        {track.artist}
                      </div>
                    </div>

                    <div className="card-actions">
                      {isInQueue ? (
                        <button
                          className="btn btn-secondary remove-queue-btn"
                          onClick={() => removeFromQueue(track.id)}
                          disabled={isDownloading}
                          style={{ borderColor: 'rgba(231, 76, 60, 0.4)', color: '#e74c3c', width: '100%' }}
                          title="Remove from Queue"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.35rem' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                          <span>Remove</span>
                        </button>
                      ) : (
                        <div className="download-split-btn" style={{ width: '100%' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => addToQueue(track, options)}
                            style={{
                              borderTopRightRadius: 0,
                              borderBottomRightRadius: 0,
                              paddingRight: '0.75rem',
                              flexGrow: 1,
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.35rem' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Add {options.format.toUpperCase()}</span>
                          </button>

                          <div className="options-dropdown-container">
                            <button
                              className="btn btn-primary"
                              onClick={() => setActiveDropdown(isDropdownOpen ? null : track.id)}
                              style={{
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                paddingLeft: '0.4rem',
                                paddingRight: '0.4rem',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                                boxShadow: 'none',
                              }}
                              title="Format & Quality"
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                              </svg>
                            </button>

                            {isDropdownOpen && (
                              <div className="dropdown-menu">
                                <div className="dropdown-group">
                                  <label>Format</label>
                                  <select
                                    className="select-input"
                                    value={options.format}
                                    onChange={(e) => handleOptionChange('format', e.target.value)}
                                  >
                                    <option value="mp3">MP3 (Audio)</option>
                                    <option value="mp4">MP4 (Video)</option>
                                  </select>
                                </div>

                                <div className="dropdown-group">
                                  <label>Quality</label>
                                  <select
                                    className="select-input"
                                    value={options.quality}
                                    onChange={(e) => handleOptionChange('quality', e.target.value)}
                                  >
                                    {options.format === 'mp3' ? (
                                      <>
                                        <option value="best">Best (320kbps)</option>
                                        <option value="high">High (256kbps)</option>
                                        <option value="medium">Medium (192kbps)</option>
                                        <option value="low">Low (128kbps)</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value="best">Best (1080P+)</option>
                                        <option value="high">High (1080P)</option>
                                        <option value="medium">Medium (720P)</option>
                                        <option value="low">Low (480P)</option>
                                        <option value="360p">360P</option>
                                        <option value="240p">240P</option>
                                        <option value="144p">144P</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <button
                                  className="btn btn-secondary btn-icon-only"
                                  style={{ width: '100%', height: '28px', marginTop: '0.25rem', fontSize: '0.75rem', padding: 0 }}
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  Close
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <svg style={{ width: '48px', height: '48px', opacity: 0.3, marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <h3>Start Searching</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Type in the search bar above to find songs on YouTube.</p>
          </div>
        )}
      </main>

      <aside className="queue-container">
        <div className="queue-panel glass-panel">
          <div className="queue-header">
            <h2>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              <span>Download Queue</span>
            </h2>
            {queue.length > 0 && <span className="queue-badge">{queue.length}</span>}
          </div>

          <div className="queue-list">
            {queue.length === 0 ? (
              <div className="queue-empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No downloads queued.<br />Add songs to start downloading.</p>
              </div>
            ) : (
              queue.map((item) => {
                const isDownloading = item.status === 'downloading';
                const isTranscoding = item.status === 'transcoding';
                const isQueued = item.status === 'queued';
                const isCompleted = item.status === 'completed';
                const isFailed = item.status === 'failed';

                return (
                  <div key={item.id} className="queue-item">
                    <img className="queue-item-thumbnail" src={item.thumbnail} alt={item.title} />
                    <div className="queue-item-details">
                      <div className="queue-item-title card-title-container">
                        <div className="card-title-scroll">
                          <span className="card-title-text">{item.title}</span>
                          <span className="card-title-spacer secondary-text">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                          <span className="card-title-text secondary-text">{item.title}</span>
                          <span className="card-title-spacer secondary-text">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        </div>
                      </div>
                      <div className="queue-item-artist">{item.artist}</div>

                      {isQueued ? (
                        <div className="queue-item-options">
                          <select
                            className="select-input"
                            value={item.format || 'mp3'}
                            onChange={(e) => updateQueueItemOptions(item.id, { format: e.target.value, quality: 'best' })}
                          >
                            <option value="mp3">MP3</option>
                            <option value="mp4">MP4</option>
                          </select>
                          <select
                            className="select-input"
                            value={item.quality || 'best'}
                            onChange={(e) => updateQueueItemOptions(item.id, { quality: e.target.value })}
                          >
                            {(item.format || 'mp3') === 'mp3' ? (
                              <>
                                <option value="best">320K</option>
                                <option value="high">256K</option>
                                <option value="medium">192K</option>
                                <option value="low">128K</option>
                              </>
                            ) : (
                              <>
                                <option value="best">1080P+</option>
                                <option value="high">1080P</option>
                                <option value="medium">720P</option>
                                <option value="low">480P</option>
                              </>
                            )}
                          </select>
                        </div>
                      ) : (
                        <div className="queue-item-meta-badges">
                          <span className="meta-badge">{item.format ? item.format.toUpperCase() : 'MP3'}</span>
                          <span className="meta-badge">{getQualityLabel(item.format || 'mp3', item.quality || 'best')}</span>
                        </div>
                      )}

                      {isFailed && <div style={{ fontSize: '0.75rem', color: '#e74c3c', marginTop: '0.2rem' }}>Error: {item.error}</div>}
                    </div>

                    <div className="queue-item-actions">
                      {isQueued && (
                        <button className="btn btn-secondary btn-icon-only" style={{ width: '28px', height: '28px' }} onClick={() => removeFromQueue(item.id)} title="Remove">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      )}

                      {!isQueued && (
                        <span className={`status-badge ${item.status}`}>
                          {item.status === 'downloading' ? `${Math.round(item.progress)}%` : item.status}
                        </span>
                      )}

                      {(isCompleted || isFailed) && (
                        <button className="btn btn-secondary btn-icon-only" style={{ width: '28px', height: '28px' }} onClick={() => removeFromQueue(item.id)} title="Dismiss">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      )}
                    </div>

                    {(isDownloading || isTranscoding) && (
                      <div
                        className="queue-item-status-bar"
                        style={{
                          width: `${isTranscoding ? 100 : item.progress}%`,
                          opacity: isTranscoding ? 0.6 : 1,
                        }}
                      ></div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {queue.length > 0 && (
            <div className="queue-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                {queue.some((item) => item.status === 'queued') && (
                  <button className="btn btn-primary" onClick={downloadAllQueued} style={{ flexGrow: 1 }}>
                    Download All
                  </button>
                )}
                <button className="btn btn-secondary" onClick={clearCompleted} style={{ flexGrow: 1 }}>
                  Clear Completed
                </button>
              </div>
              <button className="btn btn-secondary" onClick={clearAllQueue} style={{ width: '100%', borderColor: 'rgba(231, 76, 60, 0.25)', color: '#e74c3c' }}>
                Clear All
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
