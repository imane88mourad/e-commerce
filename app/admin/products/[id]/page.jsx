'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import ProductForm from '@/components/admin/products/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  return <ProductForm productId={params.id} />;
}
