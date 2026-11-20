import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, KeyRound, PauseCircle, PlayCircle, Plus, RefreshCw, Search, Store, X } from 'lucide-react';

// ==============================================================================
// ADMIN: Marketplace sellers (applications, suspension, commission) and
// moderation of seller listings before they go live in the storefront.
// ==============================================================================

type SellerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type ListingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

interface AdminSeller {
  id: string;
  email: string;
  ownerName: string;
  businessName: string;
  storeSlug: string;
  phone: string;
  gstin?: string | null;
  pan?: string | null;
  description?: string | null;
  categories: string[];
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  status: SellerStatus;
  statusReason?: string | null;
  commissionRate: number;
  createdAt: string;
  approvedAt?: string | null;
  productCount: number;
  grossSales: number;
  commissionEarned: number;
  payoutDue: number;
}

interface AdminListing {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: string;
  price: number;
  compareAtPrice?: number | null;
  sizePrices?: Record<string, number> | null;
  stock: number;
  images: string[];
  approvalStatus: ListingStatus;
  rejectionReason?: string | null;
  updatedAt: string;
  seller?: { id: string; businessName: string; storeSlug: string; status: SellerStatus; email: string } | null;
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string) => void;
  onChanged?: () => void;
}

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const prettyCategory = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; style?: React.CSSProperties; label: string }> = {
    PENDING: { cls: 'pending', label: 'Pending' },
    PENDING_REVIEW: { cls: 'pending', label: 'In review' },
    APPROVED: { cls: 'success', label: 'Approved' },
    REJECTED: { cls: '', style: { background: 'rgba(239,68,68,0.15)', color: '#f87171' }, label: 'Rejected' },
    SUSPENDED: { cls: '', style: { background: 'rgba(148,163,184,0.15)', color: '#cbd5e1' }, label: 'Suspended' },
  };
  const m = map[status] || { cls: 'blue', label: status };
  return (
    <span className={`admin-status-pill ${m.cls}`} style={m.style}>
      {m.label}
    </span>
  );
}

const smallInput: React.CSSProperties = { height: '38px', fontSize: '13px', borderRadius: '10px' };
const dangerBtn: React.CSSProperties = { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' };
const okBtn: React.CSSProperties = { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#6ee7b7' };

export function AdminSellersPanel({ authFetch, showToast, onChanged }: Props) {
  const [view, setView] = useState<'sellers' | 'listings'>('sellers');
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [sellerFilter, setSellerFilter] = useState<'ALL' | SellerStatus>('ALL');
  const [listingFilter, setListingFilter] = useState<ListingStatus>('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<AdminSeller | null>(null);
  const [reason, setReason] = useState('');
  const [commission, setCommission] = useState('15');
  const [rejectingListing, setRejectingListing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const readJson = async (res: Response) => {
    const type = res.headers.get('content-type') || '';
    return type.includes('application/json') ? res.json() : {};
  };

  const loadSellers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const qs = new URLSearchParams();
      if (sellerFilter !== 'ALL') qs.set('status', sellerFilter);
      if (search.trim()) qs.set('search', search.trim());
      const res = await authFetch(`/api/admin/sellers?${qs.toString()}`);
      const data: any = await readJson(res);
      if (res.ok && data.success && Array.isArray(data.sellers)) setSellers(data.sellers);
      else setLoadError(data.error || 'Could not load sellers. Is the backend API and database online?');
    } catch {
      /* authFetch signs out on 401 */
    } finally {
      setLoading(false);
    }
  }, [authFetch, sellerFilter, search]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await authFetch(`/api/admin/listings?status=${listingFilter}`);
      const data: any = await readJson(res);
      if (res.ok && data.success && Array.isArray(data.products)) setListings(data.products);
      else setLoadError(data.error || 'Could not load listings.');
    } catch {
      /* handled by authFetch */
    } finally {
      setLoading(false);
    }
  }, [authFetch, listingFilter]);

  useEffect(() => {
    if (view === 'sellers') loadSellers();
    else loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sellerFilter, listingFilter]);

  const openSeller = (s: AdminSeller) => {
    setSelectedSeller(s);
    setNewPassword('');
    setReason(s.statusReason || '');
    setCommission(String(s.commissionRate ?? 15));
  };

  const resetSellerPassword = async () => {
    if (!selectedSeller) return;
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/sellers/${selectedSeller.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      const data: any = await readJson(res);
      if (res.ok && data.success) {
        showToast(`New password set for ${selectedSeller.businessName}. Share it with the seller.`);
      } else {
        showToast(data.error || 'Could not update the password.');
      }
    } finally {
      setBusy(false);
    }
  };

  const updateSellerStatus = async (status: SellerStatus) => {
    if (!selectedSeller) return;
    if ((status === 'REJECTED' || status === 'SUSPENDED') && !reason.trim()) {
      showToast('Please write a reason for the seller first.');
      return;
    }
    const rate = Number(commission);
    if (!Number.isFinite(rate) || rate < 0 || rate > 60) {
      showToast('Commission must be between 0 and 60%.');
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/sellers/${selectedSeller.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason: reason.trim() || null, commissionRate: rate }),
      });
      const data: any = await readJson(res);
      if (res.ok && data.success) {
        showToast(`${selectedSeller.businessName} is now ${status.toLowerCase()}.`);
        setSelectedSeller(null);
        await loadSellers();
        onChanged?.();
      } else {
        showToast(data.error || 'Could not update the seller.');
      }
    } finally {
      setBusy(false);
    }
  };

  const reviewListing = async (id: string, approvalStatus: ListingStatus, why?: string) => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/products/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ approvalStatus, reason: why || null }),
      });
      const data: any = await readJson(res);
      if (res.ok && data.success) {
        showToast(approvalStatus === 'APPROVED' ? 'Listing approved and live in the store.' : 'Listing rejected. The seller can see your reason.');
        setRejectingListing(null);
        setReason('');
        await loadListings();
        onChanged?.();
      } else {
        showToast(data.error || 'Could not review the listing.');
      }
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const c = { payout: 0, gross: 0 };
    for (const s of sellers) {
      c.payout += s.payoutDue;
      c.gross += s.grossSales;
    }
    return c;
  }, [sellers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="admin-panel-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={22} />
          </div>
          <div>
            <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>Marketplace</h3>
            <p className="admin-panel-desc">Create seller logins after reviewing their "Partner With Us" email, set commission, and review every listing before it goes live.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn-secondary" style={okBtn} onClick={() => { setCreating(true); setView('sellers'); }}>
            <Plus size={13} style={{ verticalAlign: '-2px' }} /> Create seller account
          </button>
          <a href="/seller" target="_blank" rel="noreferrer" className="admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            Seller login page <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {creating && (
        <CreateSellerForm
          authFetch={authFetch}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setSellerFilter('ALL');
            loadSellers();
            onChanged?.();
          }}
        />
      )}

      <div className="admin-tabs-nav" style={{ marginBottom: 0 }}>
        <button type="button" className={`admin-tab-btn ${view === 'sellers' ? 'active' : ''}`} onClick={() => setView('sellers')}>
          Seller accounts
        </button>
        <button type="button" className={`admin-tab-btn ${view === 'listings' ? 'active' : ''}`} onClick={() => setView('listings')}>
          Listing review
        </button>
      </div>

      {loadError && (
        <div className="admin-panel-card" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: '13px' }}>
          {loadError}
        </div>
      )}

      {view === 'sellers' && (
        <div className="admin-panel-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            {(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'ALL'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSellerFilter(st)}
                style={sellerFilter === st ? { borderColor: '#38bdf8', color: '#e0f2fe' } : undefined}
              >
                {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadSellers();
              }}
              style={{ display: 'flex', gap: '8px', marginLeft: 'auto', minWidth: '220px', flex: '1 1 220px', maxWidth: '360px' }}
            >
              <input className="admin-input-field" style={smallInput} placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button type="submit" className="admin-btn-secondary" aria-label="Search sellers">
                <Search size={14} />
              </button>
              <button type="button" className="admin-btn-secondary" aria-label="Refresh" onClick={() => loadSellers()}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </form>
          </div>

          {sellers.length > 0 && (
            <p className="admin-panel-desc" style={{ marginBottom: '12px' }}>
              Paid sales in this view: <b style={{ color: '#fff' }}>{inr(counts.gross)}</b> · owed to sellers: <b style={{ color: '#fff' }}>{inr(counts.payout)}</b>
            </p>
          )}

          <div className="admin-table-scroll">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Categories</th>
                  <th>Listings</th>
                  <th>Sales / Payout</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{s.businessName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {[s.city, s.state].filter(Boolean).join(', ') || s.email} · joined {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {s.ownerName}
                      <div style={{ color: '#64748b' }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '200px' }}>{s.categories.map(prettyCategory).join(', ')}</td>
                    <td style={{ color: '#fff', fontWeight: 700 }}>{s.productCount}</td>
                    <td style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {inr(s.grossSales)}
                      <div style={{ color: '#64748b' }}>due {inr(s.payoutDue)}</div>
                    </td>
                    <td>
                      <StatusPill status={s.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="admin-btn-secondary" onClick={() => openSeller(s)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && sellers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '28px' }}>
                      No sellers in this view yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'listings' && (
        <div className="admin-panel-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {(['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className="admin-btn-secondary"
                onClick={() => setListingFilter(st)}
                style={listingFilter === st ? { borderColor: '#38bdf8', color: '#e0f2fe' } : undefined}
              >
                {st === 'PENDING_REVIEW' ? 'Awaiting review' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
            <button type="button" className="admin-btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => loadListings()} aria-label="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {listings.map((p) => (
              <div key={p.id} style={{ border: '1px solid #1e2638', borderRadius: '14px', overflow: 'hidden', background: '#0a1020', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '4px', height: '160px', background: '#060912' }}>
                  {p.images.slice(0, 3).map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0 }}>
                      <img src={img} alt={`${p.title} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </a>
                  ))}
                </div>
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>{p.title}</div>
                    <StatusPill status={p.approvalStatus} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    by <b style={{ color: '#cbd5e1' }}>{p.seller?.businessName || 'Unknown seller'}</b> · {prettyCategory(p.category)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {p.sizePrices && Object.keys(p.sizePrices).length > 0
                      ? Object.entries(p.sizePrices).sort(([a], [b]) => ['A5', 'A4', 'A3'].indexOf(a) - ['A5', 'A4', 'A3'].indexOf(b)).map(([k, v]) => `${k} ${inr(v)}`).join(' · ')
                      : inr(p.price)}
                    {p.compareAtPrice ? <span style={{ color: '#64748b', textDecoration: 'line-through', marginLeft: '6px' }}>{inr(p.compareAtPrice)}</span> : null}
                    <span style={{ color: '#64748b' }}> · stock {p.stock}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, maxHeight: '72px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>{p.description}</p>
                  {p.rejectionReason && <p style={{ fontSize: '11px', color: '#fca5a5', margin: 0 }}>Reason: {p.rejectionReason}</p>}

                  {rejectingListing === p.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                      <textarea
                        className="admin-input-field"
                        style={{ height: '70px', padding: '10px', fontSize: '12px' }}
                        placeholder="Tell the seller what to fix (e.g. blurry photos, copyrighted artwork, wrong category)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="admin-btn-secondary" style={dangerBtn} disabled={busy || !reason.trim()} onClick={() => reviewListing(p.id, 'REJECTED', reason.trim())}>
                          Confirm reject
                        </button>
                        <button type="button" className="admin-btn-secondary" onClick={() => { setRejectingListing(null); setReason(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                      {p.approvalStatus !== 'APPROVED' && (
                        <button type="button" className="admin-btn-secondary" style={okBtn} disabled={busy} onClick={() => reviewListing(p.id, 'APPROVED')}>
                          <Check size={13} style={{ verticalAlign: '-2px' }} /> Approve
                        </button>
                      )}
                      {p.approvalStatus !== 'REJECTED' && (
                        <button type="button" className="admin-btn-secondary" style={dangerBtn} disabled={busy} onClick={() => { setRejectingListing(p.id); setReason(''); }}>
                          <X size={13} style={{ verticalAlign: '-2px' }} /> {p.approvalStatus === 'APPROVED' ? 'Take down' : 'Reject'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!loading && listings.length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '28px', fontSize: '13px' }}>Nothing here. New seller listings show up in "Awaiting review".</p>
          )}
        </div>
      )}

      {selectedSeller && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Review ${selectedSeller.businessName}`}
          onClick={(e) => e.target === e.currentTarget && setSelectedSeller(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.75)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div className="admin-panel-card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 className="admin-panel-title" style={{ fontSize: '17px' }}>{selectedSeller.businessName}</h3>
                <p className="admin-panel-desc">
                  /store/{selectedSeller.storeSlug} · <StatusPill status={selectedSeller.status} />
                </p>
              </div>
              <button type="button" className="admin-btn-secondary" onClick={() => setSelectedSeller(null)} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
              <Detail label="Owner" value={selectedSeller.ownerName} />
              <Detail label="Email" value={selectedSeller.email} />
              <Detail label="Phone" value={selectedSeller.phone} />
              <Detail label="GSTIN" value={selectedSeller.gstin || 'Not provided'} />
              <Detail label="PAN" value={selectedSeller.pan || 'Not provided'} />
              <Detail label="Pickup address" value={[selectedSeller.addressLine, selectedSeller.city, selectedSeller.state, selectedSeller.pincode].filter(Boolean).join(', ')} />
              <Detail
                label="Payout"
                value={
                  selectedSeller.bankAccountNumber
                    ? `${selectedSeller.bankAccountName || ''} ${selectedSeller.bankAccountNumber} ${selectedSeller.bankIfsc || ''}`.trim()
                    : selectedSeller.upiId || 'Not added yet'
                }
              />
              <Detail label="Categories" value={selectedSeller.categories.map(prettyCategory).join(', ')} />
            </div>
            {selectedSeller.description && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', whiteSpace: 'pre-wrap' }}>{selectedSeller.description}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', marginTop: '18px', alignItems: 'start' }}>
              <label className="admin-input-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                Commission %
                <input className="admin-input-field" style={smallInput} type="number" min={0} max={60} step={0.5} value={commission} onChange={(e) => setCommission(e.target.value)} />
              </label>
              <label className="admin-input-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                Note to seller (required to reject or suspend)
                <textarea className="admin-input-field" style={{ height: '64px', padding: '10px', fontSize: '12px' }} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              {selectedSeller.status !== 'APPROVED' && (
                <button type="button" className="admin-btn-secondary" style={okBtn} disabled={busy} onClick={() => updateSellerStatus('APPROVED')}>
                  <PlayCircle size={13} style={{ verticalAlign: '-2px' }} /> {selectedSeller.status === 'SUSPENDED' ? 'Reinstate' : 'Approve seller'}
                </button>
              )}
              {selectedSeller.status === 'APPROVED' && (
                <>
                  <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => updateSellerStatus('APPROVED')}>
                    Save commission
                  </button>
                  <button type="button" className="admin-btn-secondary" style={dangerBtn} disabled={busy} onClick={() => updateSellerStatus('SUSPENDED')}>
                    <PauseCircle size={13} style={{ verticalAlign: '-2px' }} /> Suspend
                  </button>
                </>
              )}
              {selectedSeller.status === 'PENDING' && (
                <button type="button" className="admin-btn-secondary" style={dangerBtn} disabled={busy} onClick={() => updateSellerStatus('REJECTED')}>
                  Reject application
                </button>
              )}
            </div>
            <p className="admin-panel-desc" style={{ marginTop: '10px' }}>
              Suspending a seller hides all of their listings from the store immediately.
            </p>

            <div style={{ borderTop: '1px solid #1e2638', marginTop: '16px', paddingTop: '14px' }}>
              <div className="admin-input-label" style={{ marginBottom: '6px' }}>Set a new login password for this seller</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  className="admin-input-field"
                  style={{ ...smallInput, flex: '1 1 200px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="off"
                />
                <button type="button" className="admin-btn-secondary" onClick={() => setNewPassword(generatePassword())}>
                  Generate
                </button>
                <button type="button" className="admin-btn-secondary" disabled={busy || newPassword.length < 8} onClick={resetSellerPassword}>
                  <KeyRound size={13} style={{ verticalAlign: '-2px' }} /> Set password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------
// Create seller account (admin issues the login; sellers cannot self-register)
// ------------------------------------------------------------------------------

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function CreateSellerForm({
  authFetch,
  onClose,
  onCreated,
}: {
  authFetch: Props['authFetch'];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      const res = await authFetch('/api/admin/sellers', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const type = res.headers.get('content-type') || '';
      const data: any = type.includes('application/json') ? await res.json() : {};
      if (res.ok && data.success) {
        setCreated({ email: email.trim().toLowerCase(), password });
        onCreated();
      } else if (res.status === 404) {
        setError('The API server is running an old build without seller routes. Restart it (pnpm run dev:api) and try again.');
      } else {
        setError(data.error || `Could not create the seller (Error ${res.status}).`);
      }
    } catch {
      /* authFetch signs out on 401 */
    } finally {
      setBusy(false);
    }
  };

  const loginUrl = `${window.location.origin}/seller`;
  const credentialsText = created
    ? `Welcome to DUNGEONS!\n\nSeller login: ${loginUrl}\nEmail: ${created.email}\nPassword: ${created.password}\n\nAfter signing in, add your store name, phone and pickup address under "Profile & payouts", and change your password.`
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: admin can select the text manually */
    }
  };

  if (created) {
    return (
      <div className="admin-panel-card" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
        <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>Seller account created</h3>
        <p className="admin-panel-desc" style={{ marginBottom: '12px' }}>
          Send these login details to the seller. The password is shown only now; you can set a new one later from the seller's Review dialog.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#080c16', border: '1px solid #1e2638', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#e2e8f0', userSelect: 'all' }}>{credentialsText}</pre>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn-secondary" style={okBtn} onClick={copy}>
            <Copy size={13} style={{ verticalAlign: '-2px' }} /> {copied ? 'Copied' : 'Copy login details'}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={() => { setCreated(null); setEmail(''); setPassword(generatePassword()); }}>
            Create another
          </button>
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };

  return (
    <form onSubmit={submit} className="admin-panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <h3 className="admin-panel-title" style={{ fontSize: '15px' }}>Create seller account</h3>
          <p className="admin-panel-desc">Just an email and a password. The seller adds their store name and other details after signing in. Every listing still needs your approval.</p>
        </div>
        <button type="button" className="admin-btn-secondary" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      {error && <div style={{ color: '#fca5a5', fontSize: '13px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        <label className="admin-input-label" style={label}>
          Seller login email
          <input className="admin-input-field" style={smallInput} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </label>
        <label className="admin-input-label" style={label}>
          Login password
          <span style={{ display: 'flex', gap: '6px' }}>
            <input className="admin-input-field" style={{ ...smallInput, flex: 1 }} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <button type="button" className="admin-btn-secondary" onClick={() => setPassword(generatePassword())}>New</button>
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="admin-btn-secondary" style={okBtn} disabled={busy}>
          {busy ? 'Creating…' : 'Create seller account'}
        </button>
        <button type="button" className="admin-btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  value = value && value.replace(/[\s,]+/g, '') ? value : 'Not provided';
  return (
    <div style={{ background: '#080c16', border: '1px solid #1e2638', borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '2px', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
