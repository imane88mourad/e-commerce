'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Textarea, Select, Badge, Modal } from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminProductsApi, formatPrice, resolveMediaUrl } from '@/lib/api/admin-products';

const TABS = [
  { id: 'info', label: 'Informations', icon: 'products' },
  { id: 'price', label: 'Prix & Stock', icon: 'promotions' },
  { id: 'chars', label: 'Caractéristiques', icon: 'settings' },
  { id: 'images', label: 'Images', icon: 'box' },
  { id: 'docs', label: 'Documents', icon: 'quotes' },
  { id: 'seo', label: 'SEO', icon: 'analytics' },
];

const emptyForm = {
  name: '', slug: '', sku: '', manufacturer_reference: '',
  short_description: '', description: '',
  price: '', old_price: '', promotional_price: '', vat: '0',
  stock: 0, low_stock_threshold: 5,
  warranty: '', weight: '', dimensions: '',
  is_active: true, is_featured: false, is_new: false, is_best_seller: false,
  attributes: {},
  category_id: '', brand_id: '',
};

function Field({ label, required, children, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-[color:var(--admin-text)]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[color:var(--admin-muted)]">{hint}</span>}
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--admin-muted)]">{children}</h4>
  );
}

export default function ProductForm({ productId }) {
  const router = useRouter();
  const isEdit = !!productId;

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [dirtyAttrs, setDirtyAttrs] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [altText, setAltText] = useState('');
  const [uploadPreview, setUploadPreview] = useState(null);

  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);

  // delete image + document confirmations
  const [deleteImageTarget, setDeleteImageTarget] = useState(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const slugify = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const onNameBlur = () => {
    if (!form.slug) set('slug', slugify(form.name));
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/products/categories/?page_size=100`);
        const brandRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/products/brands/?page_size=100`);
        const [cat, brand] = await Promise.all([catRes.json(), brandRes.json()]);
        if (active) {
          setCategories(cat.results || []);
          setBrands(brand.results || []);
        }
      } catch { /* non fatal */ }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    setLoading(true);
    adminProductsApi.get(productId)
      .then((p) => {
        if (!active) return;
        setForm({
          name: p.name || '', slug: p.slug || '', sku: p.sku || '',
          manufacturer_reference: p.manufacturer_reference || '',
          short_description: p.short_description || '', description: p.description || '',
          price: p.price != null ? String(p.price) : '', old_price: p.old_price != null ? String(p.old_price) : '',
          promotional_price: p.promotional_price != null ? String(p.promotional_price) : '',
          vat: p.vat != null ? String(p.vat) : '0',
          stock: p.stock ?? 0, low_stock_threshold: p.low_stock_threshold ?? 5,
          warranty: p.warranty || '', weight: p.weight != null ? String(p.weight) : '', dimensions: p.dimensions || '',
          is_active: !!p.is_active, is_featured: !!p.is_featured, is_new: !!p.is_new, is_best_seller: !!p.is_best_seller,
          attributes: p.attributes && typeof p.attributes === 'object' ? { ...p.attributes } : {},
          category_id: p.category_id != null ? String(p.category_id) : '',
          brand_id: p.brand_id != null ? String(p.brand_id) : '',
        });
        setImages(p.images || []);
        setDocuments(p.documents || []);
      })
      .catch((err) => toast.error(err.message || 'Erreur chargement produit'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, isEdit]);

  const buildPayload = () => ({
    name: form.name,
    slug: slugify(form.slug || form.name),
    sku: form.sku,
    manufacturer_reference: form.manufacturer_reference || null,
    short_description: form.short_description || null,
    description: form.description,
    price: form.price === '' || form.price == null ? null : form.price,
    old_price: form.old_price === '' || form.old_price == null ? null : form.old_price,
    promotional_price: form.promotional_price === '' || form.promotional_price == null ? null : form.promotional_price,
    vat: form.vat === '' ? '0' : form.vat,
    stock: form.stock,
    low_stock_threshold: form.low_stock_threshold,
    warranty: form.warranty || null,
    weight: form.weight === '' ? null : form.weight,
    dimensions: form.dimensions || null,
    is_active: form.is_active,
    is_featured: form.is_featured,
    is_new: form.is_new,
    is_best_seller: form.is_best_seller,
    attributes: form.attributes && Object.keys(form.attributes).length ? form.attributes : {},
    category_id: form.category_id === '' ? null : form.category_id,
    brand_id: form.brand_id === '' ? null : form.brand_id,
  });

  const validate = () => {
    const errs = [];
    if (!form.name.trim()) errs.push('Le nom est requis');
    if (!form.sku.trim()) errs.push('Le SKU est requis');
    if (form.price === '' || form.price == null) errs.push('Le prix est requis');
    if (!form.category_id) errs.push('La catégorie est requise');
    if (errs.length) {
      errs.forEach((e) => toast.error(e));
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      let saved;
      if (isEdit) {
        saved = await adminProductsApi.update(productId, payload);
        toast.success('Produit mis à jour');
      } else {
        saved = await adminProductsApi.create(payload);
        toast.success('Produit créé');
      }
      router.push(`/admin/products/${saved.id}`);
    } catch (err) {
      const msg = err.message || 'Erreur d’enregistrement';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPreview(URL.createObjectURL(file));
    setAltText('');
  };

  const uploadImage = async () => {
    const input = document.getElementById('product-image-file');
    const file = input?.files?.[0];
    if (!file) { toast.error('Sélectionnez un fichier image'); return; }
    if (!isEdit) { toast.error('Enregistrez d’abord le produit avant d’ajouter des images'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('alt_text', altText || '');
      const saved = await adminProductsApi.uploadImage(productId, fd);
      setImages((prev) => [...prev, saved]);
      toast.success('Image ajoutée');
      setUploadPreview(null);
      input.value = '';
      setFileInputKey((k) => k + 1);
      setAltText('');
    } catch (err) {
      toast.error(err.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!deleteImageTarget) return;
    try {
      await adminProductsApi.deleteImage(deleteImageTarget.id);
      setImages((prev) => prev.filter((i) => i.id !== deleteImageTarget.id));
      toast.success('Image supprimée');
      setDeleteImageTarget(null);
    } catch (err) {
      toast.error(err.message || 'Erreur suppression');
    }
  };

  const addDocument = async () => {
    if (!docName.trim()) { toast.error('Le nom du document est requis'); return; }
    if (!docUrl.trim()) { toast.error('L’URL du document est requise'); return; }
    if (!isEdit) { toast.error('Enregistrez d’abord le produit avant d’ajouter des documents'); return; }
    setAddingDoc(true);
    try {
      const saved = await adminProductsApi.createDocument(productId, { name: docName.trim(), file: docUrl.trim() });
      setDocuments((prev) => [...prev, saved]);
      setDocName('');
      setDocUrl('');
      toast.success('Document ajouté');
    } catch (err) {
      toast.error(err.message || 'Erreur ajout document');
    } finally {
      setAddingDoc(false);
    }
  };

  const removeDocument = async () => {
    if (!deleteDocTarget) return;
    try {
      await adminProductsApi.deleteDocument(deleteDocTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDocTarget.id));
      toast.success('Document supprimé');
      setDeleteDocTarget(null);
    } catch (err) {
      toast.error(err.message || 'Erreur suppression');
    }
  };

  const setAttr = (key, val) => {
    setDirtyAttrs(true);
    setForm((f) => {
      const attrs = { ...f.attributes };
      if (val === '') delete attrs[key];
      else attrs[key] = val;
      return { ...f, attributes: attrs };
    });
  };

  // Ensure attributes object on first mount for edit
  useEffect(() => {
    if (!dirtyAttrs && isEdit) {
      setForm((f) => ({ ...f, attributes: f.attributes && typeof f.attributes === 'object' ? { ...f.attributes } : {} }));
    }
  }, [isEdit, dirtyAttrs]);

  if (loading) {
    return (
      <Card className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-[color:var(--admin-muted)]">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement du produit…
        </div>
      </Card>
    );
  }

  const attrsEntries = Object.entries(form.attributes || {});

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[color:var(--admin-text)]">
          {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/admin/products')}>Annuler</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isEdit ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-[color:var(--admin-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? 'border-[color:var(--admin-accent)] text-[color:var(--admin-accent)]'
                : 'border-transparent text-[color:var(--admin-muted)] hover:text-[color:var(--admin-text)]'
            }`}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5 md:col-span-2">
            <SectionTitle>Identité du produit</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" required className="md:col-span-2">
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={onNameBlur} placeholder="Ex. Baie de serveur 19 pouces 42U" />
              </Field>
              <Field label="SKU (référence interne)" required hint="Doit être unique">
                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Ex. RACK-42U" />
              </Field>
              <Field label="Référence fabricant">
                <Input value={form.manufacturer_reference} onChange={(e) => set('manufacturer_reference', e.target.value)} placeholder="Ex. APC-APC-8841" />
              </Field>
              <Field label="Catégorie" required>
                <Select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">Sélectionner une catégorie…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Marque">
                <Select value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}>
                  <option value="">Aucune marque</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Description" required className="md:col-span-2">
                <Textarea rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description complète du produit…" />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {tab === 'price' && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5">
            <SectionTitle>Prix</SectionTitle>
            <div className="space-y-4">
              <Field label="Prix (DH)" required>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Ancien prix" hint="Affiche le prix barré">
                <Input type="number" step="0.01" value={form.old_price} onChange={(e) => set('old_price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Prix promotionnel" hint="Doit être ≤ prix">
                <Input type="number" step="0.01" value={form.promotional_price} onChange={(e) => set('promotional_price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="TVA (%)">
                <Input type="number" step="0.01" value={form.vat} onChange={(e) => set('vat', e.target.value)} />
              </Field>
              {form.price && (
                <p className="text-sm text-[color:var(--admin-muted)]">
                  Prix affiché : <span className="font-semibold text-[color:var(--admin-text)]">{formatPrice(form.promotional_price || form.price)}</span>
                </p>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle>Stock</SectionTitle>
            <div className="space-y-4">
              <Field label="Quantité en stock">
                <Input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </Field>
              <Field label="Seuil d'alerte bas stock">
                <Input type="number" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
              </Field>
              <div className="rounded-lg bg-[color:var(--admin-accent-soft)] p-3 text-sm text-[color:var(--admin-muted)]">
                {form.stock > form.low_stock_threshold
                  ? <><Badge tone="green" dot>En stock</Badge> Stock suffisant.</>
                  : <><Badge tone={form.stock > 0 ? 'amber' : 'red'} dot>{form.stock > 0 ? 'Stock faible' : 'Rupture'}</Badge> Considérez un réapprovisionnement.</>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'chars' && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-5">
            <SectionTitle>Caractéristiques techniques</SectionTitle>
            <div className="space-y-3">
              {attrsEntries.map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <Input value={key} onChange={(e) => {
                    const nk = e.target.value;
                    const attrs = { ...form.attributes };
                    delete attrs[key];
                    if (nk.trim()) attrs[nk] = val || '';
                    setDirtyAttrs(true);
                    setForm({ ...form, attributes: attrs });
                  }} placeholder="Propriété" className="flex-1" />
                  <Input value={val || ''} onChange={(e) => setAttr(key, e.target.value)} placeholder="Valeur" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setAttr(key, '')} title="Supprimer">
                    <Icon name="x" size={16} />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary" size="sm"
                onClick={() => {
                  setDirtyAttrs(true);
                  setForm({ ...form, attributes: { ...form.attributes, '': '' } });
                }}
              >
                <Icon name="plus" size={14} /> Ajouter une caractéristique
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle>Logistique</SectionTitle>
            <div className="space-y-4">
              <Field label="Poids (kg)">
                <Input type="number" step="0.01" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
              </Field>
              <Field label="Dimensions" hint="Ex. 600 x 800 x 2000 mm">
                <Input value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} />
              </Field>
              <Field label="Garantie" hint="Ex. 3 ans">
                <Input value={form.warranty} onChange={(e) => set('warranty', e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card className="p-5 md:col-span-2">
            <SectionTitle>Mise en avant</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { k: 'is_featured', label: 'Mis en avant', desc: 'Afficher sur la page d’accueil' },
                { k: 'is_new', label: 'Nouveauté', desc: 'Badge « Nouveau » sur la fiche' },
                { k: 'is_best_seller', label: 'Best-seller', desc: 'Badge « Best-seller »' },
                { k: 'is_active', label: 'Actif / visible', desc: 'Affiché dans la boutique publique' },
              ].map((opt) => (
                <label key={opt.k} className={`flex items-start gap-3 rounded-lg border p-3 transition ${form[opt.k] ? 'border-[color:var(--admin-accent)] bg-[color:var(--admin-accent-soft)]' : 'border-[color:var(--admin-border)]'}`}>
                  <input
                    type="checkbox"
                    checked={!!form[opt.k]}
                    onChange={(e) => set(opt.k, e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[color:var(--admin-accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[color:var(--admin-text)]">{opt.label}</span>
                    <span className="block text-xs text-[color:var(--admin-muted)]">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'images' && (
        <Card className="p-5">
          <SectionTitle>Galerie d'images</SectionTitle>
          {!isEdit && (
            <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Enregistrez d’abord le produit (tab Informations → « Créer le produit ») pour pouvoir ajouter des images.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {images.length === 0 && !uploadPreview && (
              <div className="col-span-full rounded-lg border border-dashed border-[color:var(--admin-border)] p-8 text-center text-sm text-[color:var(--admin-muted)]">
                Aucune image. Ajoutez une image ci-dessous.
              </div>
            )}
            {images.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-[color:var(--admin-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(img.image)} alt={img.alt_text || ''} className="h-28 w-full object-cover" />
                <button
                  onClick={() => setDeleteImageTarget(img)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                  title="Supprimer l'image"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            {uploadPreview && (
              <div className="relative overflow-hidden rounded-xl border border-[color:var(--admin-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadPreview} alt="Aperçu" className="h-28 w-full object-cover" />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-[color:var(--admin-border)] pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input
                id="product-image-file"
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={!isEdit || uploading}
                className="block w-full text-sm text-[color:var(--admin-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--admin-accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--admin-accent)]"
              />
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Texte alternatif (optionnel)"
                className="sm:w-56"
              />
              <Button onClick={uploadImage} disabled={!isEdit || uploading || !uploadPreview}>
                {uploading ? 'Upload…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'docs' && (
        <Card className="p-5">
          <SectionTitle>Documents (fiches, garanties, notices…)</SectionTitle>
          {!isEdit && (
            <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Enregistrez d’abord le produit pour pouvoir ajouter des documents.
            </div>
          )}
          <ul className="divide-y divide-[color:var(--admin-border)]">
            {documents.length === 0 && (
              <li className="rounded-lg border border-dashed border-[color:var(--admin-border)] p-6 text-center text-sm text-[color:var(--admin-muted)]">
                Aucun document. Ajoutez-en un ci-dessous.
              </li>
            )}
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--admin-accent-soft)] text-[color:var(--admin-accent)]">
                    <Icon name="quotes" size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[color:var(--admin-text)]">{d.name}</div>
                    <a
                      href={resolveMediaUrl(d.file)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-xs text-[color:var(--admin-accent)] hover:underline"
                    >
                      {d.file}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteDocTarget(d)}
                  className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600"
                  title="Supprimer le document"
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-[color:var(--admin-border)] pt-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Nom du document" className="sm:w-56" />
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="URL du fichier (https://…)" className="flex-1" />
              <Button onClick={addDocument} disabled={!isEdit || addingDoc}>
                <Icon name="plus" size={16} /> Ajouter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'seo' && (
        <Card className="p-5">
          <SectionTitle>Référencement (SEO)</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Slug (URL)" hint="Identifiant unique dans l'URL. Généré automatiquement depuis le nom.">
              <Input value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="ex. baie-serveur-42u" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description courte (meta / sous-titre)" hint="Résumé de 500 caractères max utilisé en aperçu recherche.">
                <Textarea rows={3} maxLength={500} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} />
              </Field>
            </div>
            <Field label="Référence fabricant" className="md:col-span-2" hint="Renseignée pour compléter l'indexation.">
              <Input value={form.manufacturer_reference} onChange={(e) => set('manufacturer_reference', e.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push('/admin/products')}>Annuler</Button>
        <Button onClick={onSave} disabled={saving}>
          {saving && <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
        </Button>
      </div>

      <Modal open={!!deleteImageTarget} onClose={() => setDeleteImageTarget(null)} title="Supprimer l'image" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteImageTarget(null)}>Annuler</Button>
            <Button variant="danger" onClick={removeImage}>Supprimer</Button>
          </div>
        }>
        <p className="text-sm text-[color:var(--admin-muted)]">Voulez-vous vraiment supprimer cette image ?</p>
      </Modal>

      <Modal open={!!deleteDocTarget} onClose={() => setDeleteDocTarget(null)} title="Supprimer le document" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteDocTarget(null)}>Annuler</Button>
            <Button variant="danger" onClick={removeDocument}>Supprimer</Button>
          </div>
        }>
        <p className="text-sm text-[color:var(--admin-muted)]">Voulez-vous vraiment supprimer « {deleteDocTarget?.name} » ?</p>
      </Modal>
    </div>
  );
}
