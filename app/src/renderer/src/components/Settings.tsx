import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useStore, type Prefs } from '@/store'

function Toggle(props: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="opt-row">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.on} onChange={(e) => props.onChange(e.target.checked)} />
    </label>
  )
}

export function OptionsDialog() {
  const { prefs, setPref } = useStore()
  const close = (): void => useStore.setState({ showOptions: false })
  return (
    <div className="scrim" onMouseDown={close}>
      <div className="dlg" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bd">
          <h2>Options</h2>
          <label className="opt-row">
            <span>Language</span>
            <select value={prefs.lang ?? 'en'} onChange={(e) => setPref('lang', e.target.value as Prefs['lang'])}>
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </label>
          <label className="opt-row">
            <span>App theme</span>
            <select value={prefs.theme} onChange={(e) => setPref('theme', e.target.value as Prefs['theme'])}>
              <option value="system">Use system setting</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          {api.platform === 'darwin' && (
            <Toggle label="Use macOS window buttons" on={prefs.macButtons} onChange={(v) => setPref('macButtons', v)} />
          )}
          <Toggle label="Show hidden items" on={prefs.hidden} onChange={(v) => setPref('hidden', v)} />
          <Toggle label="Show file name extensions" on={prefs.extensions} onChange={(v) => setPref('extensions', v)} />
          <Toggle label="Compact view (reduces spacing)" on={!!prefs.compact} onChange={(v) => setPref('compact', v)} />
          <Toggle label="Show Preview pane (Alt+P)" on={prefs.previewPane} onChange={(v) => setPref('previewPane', v)} />
        </div>
        <div className="ft">
          <button className="btn primary" onClick={close}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

// First launch on a Mac: explain the privacy prompts before macOS shows them.
export function Onboarding() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (api.platform !== 'darwin') return
    void api.settings.get<boolean>('onboarded').then((done) => setOpen(!done))
  }, [])
  if (!open) return null

  const finish = (): void => {
    setOpen(false)
    void api.settings.set('onboarded', true)
  }
  return (
    <div className="scrim">
      <div className="dlg" role="dialog">
        <div className="bd">
          <h2>Welcome to Khoj</h2>
          <p>Khoj works with the files already on your Mac. Nothing is uploaded anywhere.</p>
          <p>
            When you open Desktop, Documents, Downloads or a USB drive for the first time, macOS asks whether Khoj may
            access it. Choose <b>Allow</b> to see your files there.
          </p>
          <p className="muted">
            To browse every folder (including Trash), you can also give Khoj Full Disk Access in System Settings.
          </p>
        </div>
        <div className="ft">
          <button className="btn" onClick={() => api.app.openPrivacySettings('fulldisk')}>
            Open Privacy Settings
          </button>
          <button className="btn primary" autoFocus onClick={finish}>
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}
