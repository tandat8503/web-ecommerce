import React from 'react';
import { SiZalo } from "react-icons/si";

const ZaloButton = () => {

    const ZALO_PHONE = '0339519874';
    const handleZaloClick = () => {
        const zaloUrl = `https://zalo.me/${ZALO_PHONE}`;// Tạo đến link zalo của tôi
        window.open(zaloUrl, '_blank', 'noopener,noreferrer');// Mở link zalo trong tab mới

    };

    return (
        <div className="fixed bottom-24 right-6 z-50">
            <button
                onClick={handleZaloClick}
                className="group relative flex items-center justify-center w-14 h-14 bg-[#0068FF] hover:bg-[#0052CC] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                aria-label="Liên hệ qua Zalo"
                title="Chat với chúng tôi qua Zalo"
            >
                {/* Zalo Brand Icon */}
                <SiZalo className="w-7 h-7" aria-hidden="true" />

                {/* Hover Tooltip */}
                <span
                    className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    role="tooltip"
                >
                    Chat với chúng tôi qua Zalo
                </span>

                {/* hiệu ứng khi hover  */}
                <span
                    className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping"
                    aria-hidden="true"
                />
            </button>
        </div>
    );
};

export default ZaloButton;
