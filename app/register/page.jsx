'use client'
import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAppContext();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
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
            <h1 className="text-2xl font-medium text-gray-800">Register</h1>
            <p className="text-gray-600 mt-2">Create your account to get started.</p>
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
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your email"
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
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-orange-600 hover:underline"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
