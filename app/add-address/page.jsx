'use client'
import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const AddAddress = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { token } = useAppContext();
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/addresses/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/cart');
      } else {
        const data = await res.json();
        setError(data.detail || data.message || 'Failed to add address');
      }
    } catch (err) {
      console.error('Error adding address:', err);
      setError('Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src={assets.logo}
              alt="QuickCart"
              className="mx-auto mb-4"
              width={150}
              height={50}
            />
            <h1 className="text-2xl font-medium text-gray-800">Add Address</h1>
            <p className="text-gray-600 mt-2">Enter your shipping address details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area / Street
              </label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your area or street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="State"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter pincode"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_default"
                id="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-600"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">
                Set as default address
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Address...' : 'Add Address'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddAddress;
