'use client'
import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAppContext();
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      const isAdmin = result.user && (result.user.role === 'admin' || result.user.is_staff);
      router.push(isAdmin ? '/admin' : '/');
    } else {
      setError(result.error || t('login.loginFailed'));
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
            <h1 className="text-2xl font-medium text-gray-800">{t('login.title')}</h1>
            <p className="text-gray-600 mt-2">{t('login.welcomeBack')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.usernameOrEmail')}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder={t('login.usernamePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder={t('login.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.loggingIn') : t('login.login')}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            {t('login.noAccount')}{' '}
            <button
              onClick={() => router.push('/register')}
              className="text-orange-600 hover:underline"
            >
              {t('login.register')}
            </button>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
