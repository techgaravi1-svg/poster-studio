import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Pencil, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';

// ==============================================================================
// ADMIN: Homepage hero slider. Add, edit, reorder, hide and delete slides.
// The storefront shows active slides in this order. With no active slides it
// falls back to its built-in default slides.
// ==============================================================================

interface HeroSlide {
  id: string;
  title: string;
  image: string;
  link: string;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string) => void;
}

const okBtn: React.CSSProperties = { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#6ee7b7' };
const dangerBtn: React.CSSProperties = { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' };
const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px' };

const LINK_PRESETS = [
  { label: 'All collections', value: '/collections' },
  { label: 'All posters', value: '/collections/posters' },
  { label: 'All wall art', value: '/collections/wall-art' },
  { label: 'Best sellers', value: '/best-sellers' },
  { label: 'Custom orders', value: '/custom' },
];

const MAX_BYTES = 8 * 1024 * 1024;

const emptyForm = { title: '', image: '', link: '/collections', isActive: true };

function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function AdminHeroSlidesPanel({ authFetch, showToast }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // 'new' for a new slide
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await authFetch('/api/admin/hero-slides');
      const data = await readJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || `Failed to load hero slides (${res.status})`);
      setSlides(data.slides || []);
    } catch (err: any) {
      if (err?.message !== 'Unauthorized') setLoadError(err?.message || 'Failed to load hero slides');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditingId('new');
    setForm(emptyForm);
    setFormError('');
  };

  const openEdit = (s: HeroSlide) => {
    setEditingId(s.id);
    setForm({ title: s.title, image: s.image, link: s.link, isActive: s.isActive });
    setFormError('');
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const onPickFile = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setFormError('Please choose a PNG, JPEG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError('Image must be under 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, image: String(reader.result || '') }));
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.image) {
      setFormError('Add a slide image (upload one or paste an https image link).');
      return;
    }
    const link = form.link.trim() || '/collections';
    if (!(link.startsWith('/') && !link.startsWith('//')) && !/^https:\/\//i.test(link)) {
      setFormError('Link must start with / (a page on this site) or https://');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const isNew = editingId === 'new';
      const original = slides.find((s) => s.id === editingId);
      const body: any = { title: form.title.trim(), link, isActive: form.isActive };
      // Only send the image when it changed, so edits don't re-upload it
      if (isNew || !original || original.image !== form.image) body.image = form.image;
      const res = await authFetch(isNew ? '/api/admin/hero-slides' : `/api/admin/hero-slides/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(body),
      });
      const data = await readJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || `Save failed (${res.status})`);
      showToast(isNew ? 'Hero slide added' : 'Hero slide updated');
      closeForm();
      load();
    } catch (err: any) {
      if (err?.message !== 'Unauthorized') setFormError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: any, okMsg: string) => {
    setBusyId(id);
    try {
      const res = await authFetch(`/api/admin/hero-slides/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      const data = await readJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      showToast(okMsg);
    } catch (err: any) {
      if (err?.message !== 'Unauthorized') showToast(err?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlides(reordered);
    setBusyId(reordered[target].id);
    try {
      // Re-number every slide so the order is unambiguous
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].sortOrder !== i) {
          const res = await authFetch(`/api/admin/hero-slides/${reordered[i].id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i }) });
          if (!res.ok) throw new Error('Reorder failed');
        }
      }
      showToast('Slide order updated');
    } catch (err: any) {
      if (err?.message !== 'Unauthorized') showToast(err?.message || 'Reorder failed');
    } finally {
      setBusyId(null);
      load();
    }
  };

  const toggleActive = async (s: HeroSlide) => {
    await patch(s.id, { isActive: !s.isActive }, s.isActive ? 'Slide hidden from the store' : 'Slide is live on the store');
    load();
  };

  const remove = async (s: HeroSlide) => {
    if (!window.confirm(`Delete this hero slide${s.title ? ` "${s.title}"` : ''}? This cannot be undone.`)) return;
    setBusyId(s.id);
    try {
      const res = await authFetch(`/api/admin/hero-slides/${s.id}`, { method: 'DELETE' });
      const data = await readJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      showToast('Hero slide deleted');
      if (editingId === s.id) closeForm();
      load();
    } catch (err: any) {
      if (err?.message !== 'Unauthorized') showToast(err?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = slides.filter((s) => s.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="admin-panel-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>Homepage Hero Slider</h3>
            <p className="admin-panel-desc">
              {activeCount > 0
                ? `${activeCount} live slide${activeCount === 1 ? '' : 's'} on the homepage, shown in this order.`
                : 'No live slides yet, so the homepage shows the built-in default slides.'}{' '}
              Best image size: 1600 × 900 (16:9).
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn-secondary" style={iconBtn} onClick={load} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" className="admin-btn-secondary" style={{ ...okBtn, ...iconBtn }} onClick={openNew}>
            <Plus size={13} /> Add hero slide
          </button>
        </div>
      </div>

      {loadError && (
        <div className="admin-panel-card" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: '13px' }}>
          {loadError}
        </div>
      )}

      {editingId && (
        <div className="admin-panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>{editingId === 'new' ? 'Add hero slide' : 'Edit hero slide'}</h3>
            <button type="button" className="admin-btn-secondary" onClick={closeForm} aria-label="Close form" style={iconBtn}>
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            <div>
              <label className="admin-input-label">Slide image</label>
              <div
                style={{ aspectRatio: '16 / 9', width: '100%', borderRadius: '12px', border: '1px dashed rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.5)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
              >
                {form.image ? (
                  <img src={form.image} alt="Slide preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={16} /> Click to upload (PNG, JPEG, WEBP, under 8MB)
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="admin-btn-secondary" style={iconBtn} onClick={() => fileRef.current?.click()}>
                  <Upload size={13} /> {form.image ? 'Change image' : 'Upload image'}
                </button>
              </div>
              <label className="admin-input-label" style={{ marginTop: '12px' }}>Or paste image link (https)</label>
              <input
                type="url"
                className="admin-input-field"
                placeholder="https://res.cloudinary.com/..."
                value={form.image.startsWith('data:') ? '' : form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value.trim() })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="admin-input-label">Title (for your reference and screen readers)</label>
              <input
                type="text"
                className="admin-input-field"
                maxLength={120}
                placeholder="e.g. New Wall Art Drop"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <label className="admin-input-label" style={{ marginTop: '12px' }}>Opens when clicked</label>
              <select
                className="admin-input-field"
                style={{ height: '40px' }}
                value={LINK_PRESETS.some((p) => p.value === form.link) ? form.link : '__custom__'}
                onChange={(e) => { if (e.target.value !== '__custom__') setForm({ ...form, link: e.target.value }); else setForm({ ...form, link: '/' }); }}
              >
                {LINK_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="__custom__">Custom link…</option>
              </select>
              <input
                type="text"
                className="admin-input-field"
                style={{ marginTop: '8px' }}
                maxLength={500}
                placeholder="/collections/wall-art?cat=aesthetic"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>A page on this site (starts with /) or a full https:// link.</span>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Show on the homepage
              </label>

              {formError && <div style={{ color: '#fca5a5', fontSize: '13px', marginTop: '10px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px', flexWrap: 'wrap' }}>
                <button type="button" className="admin-btn-secondary" style={okBtn} onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : editingId === 'new' ? 'Add slide' : 'Save changes'}
                </button>
                <button type="button" className="admin-btn-secondary" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-panel-card">
        {loading && slides.length === 0 ? (
          <p className="admin-panel-desc">Loading hero slides…</p>
        ) : slides.length === 0 ? (
          <p className="admin-panel-desc">No hero slides yet. Click “Add hero slide” to create your first one.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {slides.map((s, i) => (
              <div
                key={s.id}
                style={{ borderRadius: '14px', border: '1px solid rgba(148,163,184,0.2)', overflow: 'hidden', background: 'rgba(15,23,42,0.45)', opacity: s.isActive ? 1 : 0.6, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ aspectRatio: '16 / 9', background: '#0f172a', position: 'relative' }}>
                  <img src={s.image} alt={s.title || `Slide ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                    #{i + 1}
                  </span>
                  <span className={`admin-status-pill ${s.isActive ? 'success' : ''}`} style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    {s.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || 'Untitled slide'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.link}>
                    Opens: {s.link}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
                    <button type="button" className="admin-btn-secondary" style={iconBtn} disabled={i === 0 || busyId !== null} onClick={() => move(i, -1)} aria-label="Move up" title="Move earlier">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" className="admin-btn-secondary" style={iconBtn} disabled={i === slides.length - 1 || busyId !== null} onClick={() => move(i, 1)} aria-label="Move down" title="Move later">
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" className="admin-btn-secondary" style={iconBtn} disabled={busyId !== null} onClick={() => toggleActive(s)} title={s.isActive ? 'Hide from store' : 'Show on store'}>
                      {s.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" className="admin-btn-secondary" style={iconBtn} disabled={busyId !== null} onClick={() => openEdit(s)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button type="button" className="admin-btn-secondary" style={{ ...dangerBtn, ...iconBtn }} disabled={busyId !== null} onClick={() => remove(s)} aria-label="Delete slide">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
