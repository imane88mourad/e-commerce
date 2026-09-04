import React from "react";
import { useLanguage } from "@/context/LanguageContext";

const NewsLetter = () => {
  const { t, isRTL } = useLanguage();

  return (
    <div className={`flex flex-col items-center justify-center text-center space-y-2 pt-8 pb-14 ${isRTL ? 'text-right' : ''}`}>
      <h1 className="md:text-4xl text-2xl font-medium">
        {t('newsletter.title')}
      </h1>
      <p className="md:text-base text-gray-500/80 pb-8">
        {t('newsletter.description')}
      </p>
      <div className={`flex items-center justify-between max-w-2xl w-full md:h-14 h-12 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <input
          className={`border border-gray-500/30 rounded-md h-full outline-none w-full px-3 text-gray-500 ${isRTL ? 'border-l-0 rounded-r-none rounded-l-md' : 'border-r-0 rounded-r-none'}`}
          type="text"
          placeholder={t('newsletter.placeholder')}
        />
        <button className={`md:px-12 px-8 h-full text-white bg-orange-600 rounded-md ${isRTL ? 'rounded-l-none rounded-r-md' : 'rounded-l-none'}`}>
          {t('newsletter.subscribe')}
        </button>
      </div>
    </div>
  );
};

export default NewsLetter;
