import { useEffect, useMemo, useState } from 'react'
import type { DiskAnalysisResult, DiskUsageItem } from '@shared/types'
import { api } from '@/api/client'
import { kbSize } from '@/lib/format'
import { useStore } from '@/store'
import { Icon } from './Icon'

// Squarified treemap layout generator for WinDirStat visualizer
interface TreemapRect {
  item: DiskUsageItem
  x: number
  y: number
  w: number
  h: number
  color: string
}

function layoutTreemap(items: DiskUsageItem[], width: number, height: number): TreemapRect[] {
  if (!items.length || width <= 0 || height <= 0) return []
  const total = items.reduce((sum, it) => sum + Math.max(1, it.size), 0)
  if (total <= 0) return []

  const rects: TreemapRect[] = []
  let currentX = 0
  let currentY = 0
  let remW = width
  let remH = height

  // Take top items (up to 40) to keep visualization crisp and legible
  const topItems = items.slice(0, 40)

  for (let i = 0; i < topItems.length; i++) {
    const it = topItems[i]
    const ratio = Math.max(1, it.size) / total
    const isHorizontal = remW >= remH

    let w = 0
    let h = 0

    if (isHorizontal) {
      w = Math.max(4, Math.round(remW * Math.min(1, ratio * 1.8)))
      h = remH
      if (i === topItems.length - 1) w = remW

      rects.push({
        item: it,
        x: currentX,
        y: currentY,
        w: Math.max(1, w - 2),
        h: Math.max(1, h - 2),
        color: getColorForExtension(it.extension, it.kind)
      })

      currentX += w
      remW -= w
      if (remW <= 0) break
    } else {
      w = remW
      h = Math.max(4, Math.round(remH * Math.min(1, ratio * 1.8)))
      if (i === topItems.length - 1) h = remH

      rects.push({
        item: it,
        x: currentX,
        y: currentY,
        w: Math.max(1, w - 2),
        h: Math.max(1, h - 2),
        color: getColorForExtension(it.extension, it.kind)
      })

      currentY += h
      remH -= h
      if (remH <= 0) break
    }
  }

  return rects
}

function getColorForExtension(ext: string, kind: string): string {
  if (kind === 'dir') return '#3b82f6'
  const e = ext.toLowerCase()
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(e)) return '#a855f7' // purple
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(e)) return '#22c55e' // green
  if (['zip', 'tar', 'gz', 'dmg', 'pkg', 'iso', '7z'].includes(e)) return '#f97316' // orange
  if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'md'].includes(e)) return '#eab308' // yellow
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(e)) return '#06b6d4' // cyan
  if (['ts', 'tsx', 'js', 'py', 'json', 'html', 'css', 'rs', 'go'].includes(e)) return '#6366f1' // indigo
  return '#94a3b8' // gray
}

export function DiskAnalyzer() {
  const { diskAnalyzerTarget, closeDiskAnalyzer, go, select } = useStore()
  const [data, setData] = useState<DiskAnalysisResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'treemap' | 'folders' | 'topfiles'>('treemap')
  const [currentFolder, setCurrentFolder] = useState<DiskUsageItem | null>(null)
  const [hoveredItem, setHoveredItem] = useState<DiskUsageItem | null>(null)

  const loadData = async (targetPath: string): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.fs.analyzeDisk(targetPath)
      setData(res)
      setCurrentFolder(res.tree)
    } catch (e) {
      console.error('Disk analysis failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!diskAnalyzerTarget) return
    void loadData(diskAnalyzerTarget)
  }, [diskAnalyzerTarget])

  const treemapItems = useMemo(() => {
    if (!currentFolder || !currentFolder.children) return []
    return currentFolder.children
  }, [currentFolder])

  const rects = useMemo(() => {
    return layoutTreemap(treemapItems, 900, 360)
  }, [treemapItems])

  if (!diskAnalyzerTarget) return null

  const revealInKhoj = (path: string): void => {
    const parent = path.slice(0, path.lastIndexOf('/')) || '/'
    closeDiskAnalyzer()
    go(parent)
    select([path], path)
  }

  const trashFile = async (path: string): Promise<void> => {
    try {
      await api.ops.trash([path])
      if (diskAnalyzerTarget) void loadData(diskAnalyzerTarget)
    } catch (e) {
      console.error('Failed to trash file:', e)
    }
  }

  return (
    <div className="modal-backdrop" onClick={closeDiskAnalyzer}>
      <div className="disk-analyzer-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="analyzer-header">
          <div className="analyzer-title-group">
            <span className="analyzer-icon">
              <Icon name="u-pie-chart" size={18} />
            </span>
            <div>
              <div className="analyzer-title">Disk Space Analyzer (WinDirStat / TreeSize)</div>
              <div className="analyzer-subtitle" title={diskAnalyzerTarget}>
                {diskAnalyzerTarget}
              </div>
            </div>
          </div>

          <div className="analyzer-actions">
            <button className="a-btn" onClick={() => diskAnalyzerTarget && void loadData(diskAnalyzerTarget)} disabled={loading}>
              <Icon name="u-refresh" size={12} />
              <span>Rescan</span>
            </button>
            <button className="a-btn" onClick={() => revealInKhoj(diskAnalyzerTarget)}>
              <Icon name="u-folder" size={12} />
              <span>Open in Khoj</span>
            </button>
            <button className="a-btn a-close" onClick={closeDiskAnalyzer}>
              <Icon name="u-close" size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="analyzer-loading">
            <div className="analyzer-pulse" />
            <div className="loading-text">Scanning storage and cataloging file sizes...</div>
            <div className="loading-sub">Analyzing folder hierarchies and calculating disk usage</div>
          </div>
        ) : !data ? (
          <div className="analyzer-error">Unable to analyze target directory. Check permissions.</div>
        ) : (
          <div className="analyzer-body">
            {/* Top Stat Cards */}
            <div className="analyzer-metrics">
              <div className="metric-card">
                <span className="metric-label">Total Size</span>
                <span className="metric-val">{kbSize(data.totalSize)}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Files Scanned</span>
                <span className="metric-val">{data.totalFiles.toLocaleString()}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Folders</span>
                <span className="metric-val">{data.totalFolders.toLocaleString()}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Largest Item</span>
                <span className="metric-val">{data.topFiles[0] ? kbSize(data.topFiles[0].size) : '0 B'}</span>
              </div>
            </div>

            {/* Category Breakdown Bar */}
            <div className="category-bar-wrap">
              <div className="category-bar">
                {Object.entries(data.categories).map(([k, cat]) => {
                  const pct = data.totalSize > 0 ? (cat.size / data.totalSize) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={k}
                      className="category-slice"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      title={`${cat.label}: ${kbSize(cat.size)} (${pct.toFixed(1)}%)`}
                    />
                  )
                })}
              </div>
              <div className="category-legend">
                {Object.entries(data.categories).map(([k, cat]) => {
                  const pct = data.totalSize > 0 ? (cat.size / data.totalSize) * 100 : 0
                  if (cat.size === 0) return null
                  return (
                    <div key={k} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: cat.color }} />
                      <span className="legend-label">{cat.label}</span>
                      <span className="legend-size">{kbSize(cat.size)}</span>
                      <span className="legend-pct">({pct.toFixed(1)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="analyzer-tabs">
              <button className={`tab-btn${activeTab === 'treemap' ? ' active' : ''}`} onClick={() => setActiveTab('treemap')}>
                <Icon name="u-grid" size={13} />
                <span>WinDirStat Treemap</span>
              </button>
              <button className={`tab-btn${activeTab === 'folders' ? ' active' : ''}`} onClick={() => setActiveTab('folders')}>
                <Icon name="u-list" size={13} />
                <span>TreeSize Breakdown</span>
              </button>
              <button className={`tab-btn${activeTab === 'topfiles' ? ' active' : ''}`} onClick={() => setActiveTab('topfiles')}>
                <Icon name="u-details-view" size={13} />
                <span>Top 15 Largest Files</span>
              </button>

              {currentFolder && currentFolder !== data.tree && (
                <button
                  className="tab-up-btn"
                  onClick={() => {
                    // Navigate up to parent
                    const parentPath = currentFolder.path.slice(0, currentFolder.path.lastIndexOf('/'))
                    if (parentPath === data.tree.path || !parentPath.includes('/')) {
                      setCurrentFolder(data.tree)
                    } else {
                      // fallback to root tree
                      setCurrentFolder(data.tree)
                    }
                  }}
                >
                  <Icon name="u-up" size={12} />
                  <span>Up to {data.tree.name}</span>
                </button>
              )}
            </div>

            {/* Tab 1: Treemap View */}
            {activeTab === 'treemap' && (
              <div className="treemap-container">
                <div className="treemap-canvas" style={{ width: 900, height: 360 }}>
                  {rects.map((r, i) => (
                    <div
                      key={i}
                      className="treemap-rect"
                      style={{
                        left: r.x,
                        top: r.y,
                        width: r.w,
                        height: r.h,
                        backgroundColor: r.color
                      }}
                      onMouseEnter={() => setHoveredItem(r.item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onDoubleClick={() => {
                        if (r.item.kind === 'dir' && r.item.children?.length) {
                          setCurrentFolder(r.item)
                        } else {
                          revealInKhoj(r.item.path)
                        }
                      }}
                      title={`${r.item.name} · ${kbSize(r.item.size)}`}
                    >
                      {r.w > 45 && r.h > 24 && (
                        <div className="rect-content">
                          <span className="rect-name">{r.item.name}</span>
                          <span className="rect-size">{kbSize(r.item.size)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="treemap-footer">
                  <div className="hovered-details">
                    {hoveredItem ? (
                      <>
                        <span className="h-name">{hoveredItem.name}</span>
                        <span className="h-size">{kbSize(hoveredItem.size)}</span>
                        <span className="h-pct">
                          ({data.totalSize > 0 ? ((hoveredItem.size / data.totalSize) * 100).toFixed(1) : 0}%)
                        </span>
                        <span className="h-path">{hoveredItem.path}</span>
                      </>
                    ) : (
                      <span className="h-hint">Hover over blocks to see details · Double-click folder to drill down</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: TreeSize Folder Breakdown */}
            {activeTab === 'folders' && (
              <div className="analyzer-table-wrap">
                <table className="analyzer-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Name</th>
                      <th style={{ width: '15%' }}>Size</th>
                      <th style={{ width: '25%' }}>% of Total</th>
                      <th style={{ width: '15%' }}>Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFolder?.children?.map((child) => {
                      const pct = data.totalSize > 0 ? (child.size / data.totalSize) * 100 : 0
                      return (
                        <tr
                          key={child.path}
                          className="table-row"
                          onDoubleClick={() => {
                            if (child.kind === 'dir' && child.children?.length) {
                              setCurrentFolder(child)
                            } else {
                              revealInKhoj(child.path)
                            }
                          }}
                        >
                          <td className="cell-name">
                            <Icon name={child.kind === 'dir' ? 'd-folder' : 'f-generic'} size={16} />
                            <span className="name-text">{child.name}</span>
                          </td>
                          <td className="cell-size">{kbSize(child.size)}</td>
                          <td className="cell-bar">
                            <div className="mini-bar-bg">
                              <div
                                className="mini-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(2, pct))}%`,
                                  backgroundColor: getColorForExtension(child.extension, child.kind)
                                }}
                              />
                            </div>
                            <span className="bar-pct">{pct.toFixed(1)}%</span>
                          </td>
                          <td className="cell-items">{child.itemCount ? `${child.itemCount} items` : '1 file'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Top 15 Largest Files */}
            {activeTab === 'topfiles' && (
              <div className="analyzer-table-wrap">
                <table className="analyzer-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>File Name</th>
                      <th style={{ width: '15%' }}>Size</th>
                      <th style={{ width: '35%' }}>Path</th>
                      <th style={{ width: '15%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topFiles.map((f) => (
                      <tr key={f.path} className="table-row">
                        <td className="cell-name">
                          <Icon name="f-generic" size={16} />
                          <span className="name-text" title={f.name}>
                            {f.name}
                          </span>
                        </td>
                        <td className="cell-size-strong">{kbSize(f.size)}</td>
                        <td className="cell-path" title={f.path}>
                          {f.path}
                        </td>
                        <td className="cell-actions">
                          <button className="row-action-btn" title="Open in Khoj" onClick={() => revealInKhoj(f.path)}>
                            <Icon name="u-folder" size={12} />
                          </button>
                          <button className="row-action-btn" title="Quick Look" onClick={() => api.window.quickLook(f.path)}>
                            <Icon name="u-preview-pane" size={12} />
                          </button>
                          <button className="row-action-btn del" title="Move to Trash" onClick={() => void trashFile(f.path)}>
                            <Icon name="u-delete" size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
