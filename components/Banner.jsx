import React from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const Banner = () => {
  const { t, isRTL } = useLanguage();

  return (
    <div className={`flex flex-col md:flex-row items-center justify-between md:pl-20 py-14 md:py-0 bg-[#E6E9F2] my-16 rounded-xl overflow-hidden ${isRTL ? 'md:flex-row-reverse md:pl-0 md:pr-20' : ''}`}>
      <Image
        className="max-w-56"
        src={assets.jbl_soundbox_image}
        alt="jbl_soundbox_image"
      />
      <div className={`flex flex-col items-center justify-center text-center space-y-2 px-4 md:px-0 ${isRTL ? 'text-right' : ''}`}>
        <h2 className="text-2xl md:text-3xl font-semibold max-w-[290px]">
          {t('banner.title')}
        </h2>
        <p className="max-w-[343px] font-medium text-gray-800/60">
          {t('banner.description')}
        </p>
        <button className="group flex items-center justify-center gap-1 px-12 py-2.5 bg-orange-600 rounded text-white">
          {t('banner.buyNow')}
          <Image className={`group-hover:translate-x-1 transition ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} src={assets.arrow_icon_white} alt="arrow_icon_white" />
        </button>
      </div>
      <Image
        className="hidden md:block max-w-80"
        src={assets.md_controller_image}
        alt="md_controller_image"
      />
      <Image
        className="md:hidden"
        src={assets.sm_controller_image}
        alt="sm_controller_image"
      />
    </div>
  );
};

export default Banner;
