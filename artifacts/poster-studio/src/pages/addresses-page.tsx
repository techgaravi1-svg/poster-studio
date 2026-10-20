import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  Building2,
  Home,
  MapPin,
  Phone,
  MoreVertical,
  Check,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { useStore, store, type SavedAddress } from '@/lib/store';
import { Toast } from '@/components/storefront';

interface AddEditAddressFormProps {
  initialAddress?: SavedAddress | null;
  onBack: () => void;
  onSaved: (addr: SavedAddress) => void;
}

export function AddEditAddressForm({ initialAddress, onBack, onSaved }: AddEditAddressFormProps) {
  const isEditing = Boolean(initialAddress?.id);

  const [name, setName] = useState(initialAddress?.name || '');
  const [phone, setPhone] = useState(initialAddress?.phone || '');
  const [pincode, setPincode] = useState(initialAddress?.pincode || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [stateVal, setStateVal] = useState(initialAddress?.state || '');
  const [locality, setLocality] = useState(initialAddress?.locality || '');
  const [flat, setFlat] = useState(initialAddress?.flat || '');
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '');
  const [type, setType] = useState<'home' | 'office' | 'other'>(initialAddress?.type || 'home');
  const [isDefault, setIsDefault] = useState(Boolean(initialAddress?.isDefault));
  const [error, setError] = useState('');

  const handleReset = () => {
    setName('');
    setPhone('');
    setPincode('');
    setCity('');
    setStateVal('');
    setLocality('');
    setFlat('');
    setLandmark('');
    setType('home');
    setIsDefault(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }
    if (!city.trim()) {
      setError('Please enter your city');
      return;
    }
    if (!stateVal.trim()) {
      setError('Please enter your state');
      return;
    }
    if (!locality.trim()) {
      setError('Please enter locality / area / street');
      return;
    }
    if (!flat.trim()) {
      setError('Please enter flat no / building name');
      return;
    }

    const payload: Omit<SavedAddress, 'id'> & { id?: string } = {
      ...(initialAddress?.id ? { id: initialAddress.id } : {}),
      name: name.trim(),
      phone: phone.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: stateVal.trim(),
      locality: locality.trim(),
      flat: flat.trim(),
      landmark: landmark.trim() || undefined,
      type,
      isDefault,
    };

    store.saveAddress(payload);
    const updated = { ...payload, id: payload.id || `addr-${Date.now()}` } as SavedAddress;
    onSaved(updated);
  };

  return (
    <div className="add-address-view-container">
      {/* Top Header */}
      <header className="address-view-header">
        <button
          type="button"
          onClick={onBack}
          className="address-back-btn"
          aria-label="Go back"
        >
          <ArrowLeft size={22} className="text-neutral-900" />
        </button>
        <h1 className="address-view-title">{isEditing ? 'Edit Address' : 'Add Address'}</h1>
        <button
          type="button"
          onClick={handleReset}
          className="address-reset-btn"
        >
          Reset
        </button>
      </header>

      {error && (
        <div className="address-form-error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-address-form-body">
        {/* Contact Info */}
        <div className="address-form-section">
          <h2 className="address-form-section-title">Contact Info</h2>
          <div className="address-underline-field">
            <label className="underline-field-label">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kaushik Vansh"
              className="underline-field-input"
            />
          </div>
          <div className="address-underline-field">
            <label className="underline-field-label">Phone Number (+91)</label>
            <input
              type="tel"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="9265964547"
              className="underline-field-input"
            />
          </div>
        </div>

        {/* Section Divider */}
        <div className="address-thick-divider" role="separator" />

        {/* Address Info */}
        <div className="address-form-section">
          <h2 className="address-form-section-title">Address Info</h2>

          <div className="address-two-col-grid">
            <div className="address-underline-field">
              <label className="underline-field-label">Pincode</label>
              <input
                type="text"
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="362560"
                className="underline-field-input"
              />
            </div>
            <div className="address-underline-field">
              <label className="underline-field-label">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Una"
                className="underline-field-input"
              />
            </div>
          </div>

          <div className="address-underline-field">
            <label className="underline-field-label">State</label>
            <input
              type="text"
              required
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              placeholder="Gujarat"
              className="underline-field-input"
            />
          </div>

          <div className="address-underline-field">
            <label className="underline-field-label">Locality / Area / Street</label>
            <input
              type="text"
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Opp bus station"
              className="underline-field-input"
            />
          </div>

          <div className="address-underline-field">
            <label className="underline-field-label">Flat no / Building Name</label>
            <input
              type="text"
              required
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
              placeholder="Natraj hospital"
              className="underline-field-input"
            />
          </div>

          <div className="address-underline-field">
            <label className="underline-field-label">Landmark (optional)</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Near Bus Station"
              className="underline-field-input"
            />
          </div>
        </div>

        {/* Section Divider */}
        <div className="address-thick-divider" role="separator" />

        {/* Type of Address */}
        <div className="address-form-section">
          <h2 className="address-form-section-title">Type of Address</h2>

          <div className="address-type-radio-row">
            <label className="address-custom-radio">
              <input
                type="radio"
                name="addressType"
                checked={type === 'home'}
                onChange={() => setType('home')}
                className="sr-only"
              />
              <span className={`custom-radio-circle ${type === 'home' ? 'radio-checked' : ''}`}>
                {type === 'home' && <span className="radio-inner-dot" />}
              </span>
              <span className="radio-label-text">Home</span>
            </label>

            <label className="address-custom-radio">
              <input
                type="radio"
                name="addressType"
                checked={type === 'office'}
                onChange={() => setType('office')}
                className="sr-only"
              />
              <span className={`custom-radio-circle ${type === 'office' ? 'radio-checked' : ''}`}>
                {type === 'office' && <span className="radio-inner-dot" />}
              </span>
              <span className="radio-label-text">Office</span>
            </label>

            <label className="address-custom-radio">
              <input
                type="radio"
                name="addressType"
                checked={type === 'other'}
                onChange={() => setType('other')}
                className="sr-only"
              />
              <span className={`custom-radio-circle ${type === 'other' ? 'radio-checked' : ''}`}>
                {type === 'other' && <span className="radio-inner-dot" />}
              </span>
              <span className="radio-label-text">Other</span>
            </label>
          </div>

          <label className="address-custom-checkbox-row">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="sr-only"
            />
            <span className={`custom-checkbox-box ${isDefault ? 'checkbox-checked' : ''}`}>
              {isDefault && <Check size={14} strokeWidth={3} className="text-white" />}
            </span>
            <span className="checkbox-label-text">Make as default address</span>
          </label>
        </div>

        {/* Save Address Button */}
        <div className="address-form-action-sticky">
          <button type="submit" className="btn-save-address-black">
            Save Address
          </button>
        </div>
      </form>
    </div>
  );
}

export function SavedAddressesView({
  onSelectAddress,
  selectedId,
  isSelectionMode = false,
}: {
  onSelectAddress?: (addr: SavedAddress) => void;
  selectedId?: string;
  isSelectionMode?: boolean;
}) {
  const [, navigate] = useLocation();
  const { savedAddresses = [], selectedAddressId } = useStore();
  const [activeView, setActiveView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const currentSelectedId = selectedId || selectedAddressId;

  const handleEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setActiveView('edit');
    setOpenMenuId(null);
  };

  const handleDelete = (addr: SavedAddress) => {
    if (window.confirm(`Delete address "${addr.name} - ${addr.flat}"?`)) {
      store.deleteAddress(addr.id);
      setToast('Address deleted');
      setOpenMenuId(null);
    }
  };

  const handleSetDefault = (addr: SavedAddress) => {
    store.setDefaultAddress(addr.id);
    setToast(`Set as default address`);
    setOpenMenuId(null);
  };

  const handleCardClick = (addr: SavedAddress) => {
    store.selectAddress(addr.id);
    if (onSelectAddress) {
      onSelectAddress(addr);
    }
  };

  if (activeView === 'add' || activeView === 'edit') {
    return (
      <AddEditAddressForm
        initialAddress={activeView === 'edit' ? editingAddress : null}
        onBack={() => {
          setActiveView('list');
          setEditingAddress(null);
        }}
        onSaved={(savedAddr) => {
          setToast(activeView === 'edit' ? 'Address updated' : 'Address added');
          setActiveView('list');
          setEditingAddress(null);
          if (onSelectAddress) {
            onSelectAddress(savedAddr);
          }
        }}
      />
    );
  }

  return (
    <div className="saved-addresses-page-wrapper">
      {/* Top Header */}
      <header className="address-view-header">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate('/account');
            }
          }}
          className="address-back-btn"
          aria-label="Go back"
        >
          <ArrowLeft size={22} className="text-neutral-900" />
        </button>
        <h1 className="address-view-title">Saved Addresses</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="saved-addresses-body">
        {/* + Add New Button Banner */}
        <button
          type="button"
          onClick={() => setActiveView('add')}
          className="btn-add-new-address"
        >
          <div className="btn-add-new-left">
            <Plus size={20} strokeWidth={2.6} className="text-blue-600" />
            <span className="btn-add-new-text">Add New</span>
          </div>
          <ChevronRight size={20} strokeWidth={2.4} className="text-blue-600" />
        </button>

        {/* Section Heading */}
        <div className="saved-addresses-heading-row">
          <span className="saved-addresses-label">Saved addresses</span>
        </div>

        {/* Addresses Cards List */}
        <div className="saved-address-cards-list">
          {savedAddresses.map((addr) => {
            const isSelected = currentSelectedId === addr.id;
            const isMenuOpen = openMenuId === addr.id;

            return (
              <div
                key={addr.id}
                className={`saved-address-card ${isSelected ? 'address-card-selected' : ''}`}
                onClick={() => handleCardClick(addr)}
              >
                {/* Left Icon Badge */}
                <div className="address-type-icon-box" aria-hidden="true">
                  {addr.type === 'office' ? (
                    <Building2 size={24} strokeWidth={1.8} className="text-neutral-800" />
                  ) : addr.type === 'home' ? (
                    <Home size={24} strokeWidth={1.8} className="text-neutral-800" />
                  ) : (
                    <MapPin size={24} strokeWidth={1.8} className="text-neutral-800" />
                  )}
                </div>

                {/* Center Content */}
                <div className="address-card-center-col">
                  <div className="address-card-name-row">
                    <span className="address-recipient-name">{addr.name}</span>
                    {addr.isDefault && (
                      <span className="address-default-badge">DEFAULT</span>
                    )}
                  </div>
                  <p className="address-card-full-text">
                    {[addr.flat, addr.locality, addr.landmark, addr.city, addr.state, addr.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <div className="address-card-phone-row">
                    <Phone size={13} className="text-neutral-600 shrink-0" />
                    <span className="address-card-phone-text">{addr.phone}</span>
                  </div>
                </div>

                {/* Right Actions: 3-dots menu */}
                <div
                  className="address-card-right-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="address-dots-menu-btn"
                    aria-label={`Options for ${addr.name}`}
                    onClick={() => setOpenMenuId(isMenuOpen ? null : addr.id)}
                  >
                    <MoreVertical size={19} className="text-neutral-600" />
                  </button>

                  {isMenuOpen && (
                    <div className="address-dropdown-popover" role="menu">
                      <button
                        type="button"
                        className="address-popover-item"
                        onClick={() => handleEdit(addr)}
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          className="address-popover-item"
                          onClick={() => handleSetDefault(addr)}
                        >
                          <Check size={14} />
                          <span>Set as Default</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="address-popover-item text-red-600"
                        onClick={() => handleDelete(addr)}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}

export function AddressesPage() {
  return (
    <main className="postgenz-addresses-page">
      <SavedAddressesView />
    </main>
  );
}
